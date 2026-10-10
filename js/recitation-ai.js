/* Tasneem AI Recitation - offline FastConformer CTC runner
 * Model contract: 16 kHz mono Float32 PCM -> audio_signal [1,N], length [1] -> CTC log-probs.
 * The current full-mixed export performs feature extraction inside the ONNX graph.
 */
(function (global) {
  'use strict';
  var MODEL = 'models/fastconformer_full_mixed.onnx';
  var TOKENS = 'models/quran_ctc_tokens.json';
  var REMOTE_MODEL = 'https://huggingface.co/acibZ/tilawa-quran-onnx/resolve/main/fastconformer_full_mixed.onnx';
  var REMOTE_TOKENS = 'https://huggingface.co/acibZ/tilawa-quran-onnx/resolve/main/quran_ctc_tokens.json';
  var ASSET_CACHE = 'tasneem-ai-assets-v2';
  var SAMPLE_RATE = 16000;
  var BLANK = 1024;
  var sessionPromise = null;
  var tokenMapPromise = null;

  function cachedFetch(url, asJson) {
    var open = (typeof caches !== 'undefined' && caches.open) ? caches.open(ASSET_CACHE) : Promise.resolve(null);
    return open.then(function(c){ return c ? c.match(url) : null; }).then(function(hit){
      if(hit) return asJson ? hit.json() : hit.arrayBuffer();
      return fetch(url).then(function(r){
        if(!r.ok) throw new Error('HTTP '+r.status+' '+url);
        var copy=r.clone();
        return (typeof caches !== 'undefined' && caches.open ? caches.open(ASSET_CACHE).then(function(cc){return cc.put(url,copy).catch(function(){}).then(function(){return r;});}) : Promise.resolve(r));
      }).then(function(r){ return asJson ? r.json() : r.arrayBuffer(); });
    });
  }
  function loadJson(url, remote) {
    return fetch(url).then(function(r){if(!r.ok)throw new Error('HTTP '+r.status+' '+url);return r.json();}).catch(function(){return cachedFetch(remote,true);});
  }
  function getTokens(){ return tokenMapPromise || (tokenMapPromise=loadJson(TOKENS,REMOTE_TOKENS)); }
  function loadSession(){
    if(sessionPromise) return sessionPromise;
    if(!global.ort) return Promise.reject(new Error('محرك ONNX غير محمّل'));
    global.ort.env.wasm.wasmPaths = 'vendor/ort/';
    global.ort.env.wasm.numThreads = 1;
    global.ort.env.wasm.proxy = false;
    sessionPromise = cachedFetch(MODEL,false).catch(function(){
      throw new Error('نموذج التلاوة غير موجود داخل النسخة. أعد بناء APK من workflow الرسمي لإضافته.');
    }).then(function(buf){
      return global.ort.InferenceSession.create(buf, {executionProviders:['wasm'], graphOptimizationLevel:'all'});
    });
    return sessionPromise;
  }
  function concatFloat32(parts){
    var n=0,i,o,p=0; for(i=0;i<parts.length;i++) n+=parts[i].length;
    o=new Float32Array(n); for(i=0;i<parts.length;i++){o.set(parts[i],p);p+=parts[i].length;} return o;
  }
  function resample16k(input, inputRate){
    if(inputRate===SAMPLE_RATE) return input;
    var ratio=inputRate/SAMPLE_RATE, outLen=Math.max(1,Math.round(input.length/ratio)), out=new Float32Array(outLen);
    for(var i=0;i<outLen;i++){
      var pos=i*ratio, idx=Math.floor(pos), frac=pos-idx;
      var a=input[Math.min(idx,input.length-1)], b=input[Math.min(idx+1,input.length-1)];
      out[i]=a+(b-a)*frac;
    }
    return out;
  }
  function rmsTrim(x){
    if(!x.length) return x;
    var max=0; for(var i=0;i<x.length;i++){var a=Math.abs(x[i]);if(a>max)max=a;}
    if(max<0.005) return x;
    var threshold=Math.max(0.008,max*0.035), first=0,last=x.length-1, win=160;
    function active(pos){var s=0,n=Math.min(win,x.length-pos);for(var j=0;j<n;j++)s+=x[pos+j]*x[pos+j];return Math.sqrt(s/Math.max(1,n))>threshold;}
    while(first<x.length-win && !active(first)) first+=win;
    while(last>win && !active(Math.max(0,last-win))) last-=win;
    return x.slice(Math.max(0,first-win),Math.min(x.length,last+win));
  }
  function ctcDecode(tensor){
    var d=tensor.dims, data=tensor.data, three=d.length===3;
    var A=three?d[1]:d[0], B=three?d[2]:d[1];
    // الشكل المعتاد [1,T,V] حيث T (الإطارات) أصغر بكثير من V (المفردات)؛ لو العكس نقرأه بالتبديل
    var transposed=A>B, T=transposed?B:A, V=transposed?A:B;
    var blank=V-1;   // في CTC الخاص بـ NeMo رمز الفراغ هو آخر مؤشر
    function at(t,v){return Number(transposed?data[v*T+t]:data[t*V+v]);}
    var ids=[], conf=0, confN=0, prev=blank;
    for(var t=0;t<T;t++){
      var best=0, bestVal=-Infinity, v, z;
      for(v=0;v<V;v++){z=at(t,v);if(z>bestVal){bestVal=z;best=v;}}
      if(best!==blank && isFinite(bestVal)){
        // احتمال أفضل رمز بـ softmax (يعمل سواء كانت المخرجات logits أو log-probs)
        var sum=0; for(v=0;v<V;v++) sum+=Math.exp(at(t,v)-bestVal);
        conf+=1/sum; confN++;
      }
      if(best!==prev && best!==blank) ids.push(best);
      prev=best;
    }
    return {ids:ids, confidence:confN?conf/confN:0};
  }
  function editDistance(a,b){
    var prev=new Array(b.length+1),cur=new Array(b.length+1),i,j;
    for(j=0;j<=b.length;j++)prev[j]=j;
    for(i=1;i<=a.length;i++){
      cur[0]=i;
      for(j=1;j<=b.length;j++)cur[j]=a[i-1]===b[j-1]?prev[j-1]:Math.min(prev[j-1]+1,prev[j]+1,cur[j-1]+1);
      var tmp=prev;prev=cur;cur=tmp;
    }
    return prev[b.length];
  }
  function compare(ids, expected){
    var dist=editDistance(ids,expected), denom=Math.max(1,expected.length,ids.length);
    return Math.max(0,Math.round((1-dist/denom)*100));
  }
  function bestVerse(ids, tokenMap, preferredKey){
    var keys=Object.keys(tokenMap), best=null, bestScore=-1;
    if(preferredKey){
      var pk=null;
      if(tokenMap[preferredKey]) pk=preferredKey;
      else { var pref=preferredKey+':'; for(var pi=0;pi<keys.length;pi++){ if(keys[pi].indexOf(pref)===0){ pk=keys[pi]; break; } } }
      if(pk) best={key:pk,score:compare(ids,tokenMap[pk]),expected:tokenMap[pk]};
    }
    // Candidate search over 6,236 verses; length bucketing avoids needless DP work.
    for(var k=0;k<keys.length;k++){
      var key=keys[k], kp=key.split(':');
      // quran_ctc_tokens also contains cumulative ranges such as 1:1:6.
      // For the one-ayah practice screen, compare against exact ayah entries only.
      if(kp.length===3 && kp[1]!==kp[2]) continue;
      var exp=tokenMap[key];
      if(best && Math.abs(ids.length-exp.length)>Math.max(12,Math.floor(exp.length*.8))) continue;
      var s=compare(ids,exp);
      if(s>bestScore){bestScore=s; if(!best || s>best.score) best={key:key,score:s,expected:exp};}
    }
    return best || {key:preferredKey||'1:1:1',score:0,expected:[]};
  }
  function diff(expected, actual){
    var m=expected.length,n=actual.length,dp=new Array(m+1),i,j;
    for(i=0;i<=m;i++){dp[i]=new Array(n+1);dp[i][0]=i;}
    for(j=0;j<=n;j++)dp[0][j]=j;
    for(i=1;i<=m;i++)for(j=1;j<=n;j++)dp[i][j]=expected[i-1]===actual[j-1]?dp[i-1][j-1]:Math.min(dp[i-1][j-1]+1,dp[i-1][j]+1,dp[i][j-1]+1);
    return {distance:dp[m][n]};
  }
  async function infer(audio16k, preferredKey){
    var session=await loadSession(), tokenMap=await getTokens();
    var audio=new Float32Array(audio16k), input=new global.ort.Tensor('float32',audio,[1,audio.length]);
    var len=new global.ort.Tensor('int64',new BigInt64Array([BigInt(audio.length)]),[1]);
    var feeds={audio_signal:input,length:len}, out=await session.run(feeds), first=out[Object.keys(out)[0]];
    var decoded=ctcDecode(first), match=bestVerse(decoded.ids,tokenMap,preferredKey), parts=match.key.split(':'), d=diff(match.expected,decoded.ids);
    return {surah:Number(parts[0]),ayah:Number(parts[1]),key:match.key,score:match.score,confidence:Math.round(decoded.confidence*100),tokenCount:decoded.ids.length,distance:d.distance,tokenIds:Array.from(decoded.ids)};
  }
  async function record(durationMs,onProgress){
    var stream=await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:false,noiseSuppression:false,autoGainControl:false}});
    var ctx=new (global.AudioContext||global.webkitAudioContext)(), source=ctx.createMediaStreamSource(stream), proc=ctx.createScriptProcessor(4096,1,1), parts=[], rate=ctx.sampleRate, stopped=false;
    var start=Date.now();
    return new Promise(function(resolve,reject){
      function finish(){if(stopped)return;stopped=true;try{proc.disconnect();source.disconnect();stream.getTracks().forEach(function(t){t.stop()});ctx.close();}catch(e){} var raw=concatFloat32(parts);resolve(rmsTrim(resample16k(raw,rate)));}
      proc.onaudioprocess=function(e){var c=e.inputBuffer.getChannelData(0);parts.push(new Float32Array(c));if(onProgress)onProgress(Math.min(100,Math.round((Date.now()-start)/durationMs*100)));if(Date.now()-start>=durationMs)finish();};
      source.connect(proc);proc.connect(ctx.destination);setTimeout(finish,durationMs+250);
      proc.onerror=function(e){finish();reject(e)};
    });
  }
  global.TasneemRecitationAI={
    ready:function(){return loadSession().then(function(){return getTokens()}).then(function(){return true;})},
    recordAndInfer:async function(durationMs,preferredKey,onProgress){var audio=await record(durationMs,onProgress);if(audio.length<SAMPLE_RATE*.4)throw new Error('التسجيل قصير جدًا');return infer(audio,preferredKey);},
    infer:infer
  };
})(window);
