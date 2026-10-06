/* تسنيم PLUS — حزمة المزايا العشر */
(function(){
'use strict';
var LS='tasneem.plus.v1';
function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function norm(s){return String(s||'').replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g,'').replace(/\u0671/g,'ا').replace(/أ|إ|آ/g,'ا').replace(/ة/g,'ه');}
function state(){try{return JSON.parse(localStorage.getItem(LS)||'{}')}catch(e){return {}}}
function save(x){localStorage.setItem(LS,JSON.stringify(x));}
function toast(t){var x=document.getElementById('toast');if(x){x.textContent=t;x.classList.add('show');setTimeout(function(){x.classList.remove('show')},2400)}}
function openFeature(){
 var st=state(), theme=Store.settings().theme, fav=Store.favorites(), notes=Store.raw().notes||{};
 var info=Quran.reciters()[Store.settings().reciter||'yasser'];
 var html='<div class="plus-head"><div><b>تسنيم PLUS</b><small>كل أدوات القراءة والحفظ في مكان واحد</small></div><button id="plus-close">✕</button></div>';
 html+='<div class="plus-grid">';
 html+='<button class="plus-card" data-p="search">🔎<b>البحث في القرآن</b><small>ابحث عن كلمة أو آية</small></button>';
 html+='<button class="plus-card" data-p="memorize">🧠<b>وضع الحفظ</b><small>اختبر نفسك في الآيات</small></button>';
 html+='<button class="plus-card" data-p="repeat">🔁<b>التكرار الذكي</b><small>من آية إلى آية</small></button>';
 html+='<button class="plus-card" data-p="audio">🎧<b>صوت القارئ</b><small>مزامنة + تنزيل أوفلاين</small></button>';
 html+='<button class="plus-card" data-p="fav">❤️<b>المفضلة</b><small>'+fav.length+' آية محفوظة</small></button>';
 html+='<button class="plus-card" data-p="notes">📝<b>ملاحظاتي</b><small>'+Object.keys(notes).filter(function(k){return notes[k]}).length+' ملاحظة</small></button>';
 html+='<button class="plus-card" data-p="positions">📌<b>آخر موضع لكل سورة</b><small>استئناف سريع</small></button>';
 html+='<button class="plus-card" data-p="offline">🚫<b>وضع أوفلاين</b><small>'+ (Store.settings().offlineMode?'مفعّل':'غير مفعّل') +'</small></button>';
 html+='<button class="plus-card" data-p="wird">⏰<b>ورد ذكي</b><small>خطة ختمة تلقائية</small></button>';
 html+='<button class="plus-card" data-p="stats">📊<b>الإحصائيات</b><small>قراءة وحفظ وإنجاز</small></button>';
 html+='<button class="plus-card" data-p="adaptive">🤖<b>خطة ذكية</b><small>تتغير حسب مستواك</small></button>';
 html+='<button class="plus-card" data-p="teacher">👨‍🏫<b>الشيخ الافتراضي</b><small>جديد + مراجعة + اختبار</small></button>';
 html+='<button class="plus-card" data-p="quiz">🧩<b>اختبارات الحفظ</b><small>أكمل الآية والآية التالية</small></button>';
 html+='<button class="plus-card" data-p="speech">🎤<b>تدريب صوتي</b><small>تحويل كلام ومقارنة نصية</small></button>';
 html+='<button class="plus-card" data-p="audio-pro">🔊<b>تحكم بالصوت</b><small>سرعة + تكرار + فواصل</small></button>';
 html+='<button class="plus-card" data-p="downloads">📥<b>تنزيلات متقدمة</b><small>سورة أو جزء</small></button>';
 html+='<button class="plus-card" data-p="storage">💾<b>إدارة التخزين</b><small>الصوت والمحتوى المحلي</small></button>';
 html+='<button class="plus-card" data-p="reader-style">📖<b>شكل المصحف</b><small>رأسي + أفقي + حجم الخط</small></button>';
 html+='<button class="plus-card" data-p="tafsir">📚<b>التفسير</b><small>الميسر والجلالين عند توفرهما</small></button>';
 html+='<button class="plus-card" data-p="ramadan">🌙<b>وضع رمضان</b><small>خطة 30 يوم</small></button>';
 html+='<button class="plus-card" data-p="makkah">🕋<b>وضع مكة/المدينة</b><small>مظهر هادئ</small></button>';
 html+='<button class="plus-card" data-p="challenge">👥<b>التحديات</b><small>تحديات محلية مع العائلة</small></button>';
 html+='<button class="plus-card" data-p="backup">🔐<b>نسخ احتياطي</b><small>تصدير واستيراد بياناتك</small></button>';
 html+='<button class="plus-card" data-p="widget">📱<b>ويدجت</b><small>إعداد اختصار الورد</small></button>';
 html+='<button class="plus-card" data-p="wearable">⌚<b>الساعة الذكية</b><small>إعدادات الاستخدام السريع</small></button>';
 html+='<button class="plus-card" data-p="reminders">🔔<b>التذكيرات الذكية</b><small>حسب تقدمك</small></button>';
 html+='<button class="plus-card" data-p="report">📈<b>التقرير الشهري</b><small>ملخص القراءة والحفظ</small></button>';
 html+='<button class="plus-card" data-p="privacy">🛡️<b>الخصوصية</b><small>قفل الملاحظات والتسجيلات</small></button>';
 html+='<button class="plus-card" data-p="orientation">🔄<b>وضع الشاشة</b><small>تدوير تلقائي للمصحف</small></button>';
 html+='</div><div id="plus-body"></div>';
 var m=document.getElementById('plus-modal');m.innerHTML=html;m.classList.add('open');
 document.getElementById('plus-close').onclick=function(){m.classList.remove('open')};
 m.querySelectorAll('[data-p]').forEach(function(b){b.onclick=function(){renderPanel(b.dataset.p)}});
}
function panel(title,body){document.getElementById('plus-body').innerHTML='<div class="plus-panel"><h3>'+title+'</h3>'+body+'</div>'}
function renderPanel(p){
 if(p==='search'){
   panel('🔎 البحث في القرآن','<input id="plus-search" class="plus-input" placeholder="اكتب كلمة أو جزءًا من آية"><div id="search-results" class="plus-results"></div>');
   var inp=document.getElementById('plus-search'); inp.focus();
   var run=function(){var q=norm(inp.value).trim(),box=document.getElementById('search-results');if(!q){box.innerHTML='<div class="plus-muted">اكتب كلمة للبحث</div>';return}
    var out=[],total=Quran.TOTAL_AYAHS;
    for(var i=0;i<total&&out.length<50;i++){var a=Quran.ayahAt(i);if(a&&norm(a.t).indexOf(q)>-1)out.push(a)}
    box.innerHTML=out.length?out.map(function(a){return '<button class="plus-result" data-page="'+a.p+'"><b>سورة '+esc(Quran.surahName(a.s))+' — آية '+a.a+'</b><span>'+esc(a.t)+'</span></button>'}).join(''):'<div class="plus-muted">لا توجد نتائج</div>';
    box.querySelectorAll('[data-page]').forEach(function(x){x.onclick=function(){document.getElementById('plus-modal').classList.remove('open');var b=document.createElement('button');b.dataset.action='open-page';b.dataset.page=x.dataset.page;document.body.appendChild(b);b.click();b.remove()}})
   };
   inp.oninput=run;
 } else if(p==='memorize'){
   var a=Quran.ayahAt(0)||{s:1,a:1,t:''}; panel('🧠 وضع الحفظ','<p class="plus-muted">اختار آية من المفضلة لتختبر نفسك، أو ابدأ من أول آية.</p><div id="mem-card" class="mem-card"></div><button id="mem-next" class="plus-btn">اختبار آية جديدة</button>');
   var idx=0, pool=Store.favorites().map(function(x){for(var i=0;i<Quran.TOTAL_AYAHS;i++){var z=Quran.ayahAt(i);if(z&&z.s===x.s&&z.a===x.a)return z}return null}).filter(Boolean);
   if(!pool.length)pool=[a];
   function show(){var z=pool[idx%pool.length];document.getElementById('mem-card').innerHTML='<b>سورة '+esc(Quran.surahName(z.s))+' — آية '+z.a+'</b><div id="mem-hidden">اضغط لإظهار الآية</div>';document.getElementById('mem-hidden').onclick=function(){this.innerHTML=esc(z.t);this.classList.add('revealed')}} show();
   document.getElementById('mem-next').onclick=function(){idx++;show()};
 } else if(p==='repeat'){
   panel('🔁 التكرار الذكي','<div class="two"><label>السورة <input id="rep-s" type="number" min="1" max="114" value="1"></label><label>من آية <input id="rep-a1" type="number" min="1" value="1"></label></div><div class="two"><label>إلى آية <input id="rep-a2" type="number" min="1" value="7"></label><label>التكرار <select id="rep-n"><option>1</option><option>2</option><option>3</option><option selected>5</option><option>10</option><option>20</option></select></label></div><button id="rep-start" class="plus-btn">▶ ابدأ التكرار</button><div id="rep-status" class="plus-muted"></div>');
   var audio=null,stop=false;
   document.getElementById('rep-start').onclick=function(){
    var s=+document.getElementById('rep-s').value,a1=+document.getElementById('rep-a1').value,a2=+document.getElementById('rep-a2').value,n=+document.getElementById('rep-n').value, arr=[];
    for(var i=0;i<Quran.TOTAL_AYAHS;i++){var a=Quran.ayahAt(i);if(a&&a.s===s&&a.a>=a1&&a.a<=a2)arr.push(a)}
    if(!arr.length){toast('الآيات غير موجودة');return} stop=false; var round=0,ii=0;
    function play(){if(stop||round>=n){document.getElementById('rep-status').textContent='انتهى التكرار ✓';return}if(ii>=arr.length){ii=0;round++;document.getElementById('rep-status').textContent='التكرار '+round+' / '+n; if(round>=n)return}
      var a=arr[ii++]; Quran.getPlayableAudioUrl(a.s,a.a,Store.settings().reciter||'yasser').then(function(u){audio=audio||new Audio();audio.src=u;audio.onended=play;return audio.play()}).catch(function(){stop=true;toast('نزّل صوت القارئ أولًا للعمل بدون نت')})
    } play();
   };
 } else if(p==='audio'){
   var r=Quran.reciters(),cur=Store.settings().reciter||'yasser';
   panel('🎧 صوت القارئ','<label>القارئ <select id="plus-reciter">'+Object.keys(r).map(function(k){return '<option value="'+k+'" '+(k===cur?'selected':'')+'>'+esc(r[k].name)+'</option>'}).join('')+'</select></label><div id="audio-info" class="plus-muted">جارٍ الفحص...</div><button id="audio-download" class="plus-btn">⬇ تنزيل الصوت كاملًا بدون إنترنت</button><button id="audio-clear" class="plus-btn secondary">حذف الصوت المحفوظ</button><p class="plus-muted">المزامنة بين الآية والصوت مفعّلة أثناء تشغيل الصفحة.</p>');
   function info(){var k=document.getElementById('plus-reciter').value;Quran.audioCacheInfo(k).then(function(x){document.getElementById('audio-info').textContent='محفوظ محليًا: '+x.count+' آية من '+Quran.TOTAL_AYAHS})}
   info();document.getElementById('plus-reciter').onchange=function(){Store.setSetting('reciter',this.value);info()};
   document.getElementById('audio-download').onclick=function(){var k=document.getElementById('plus-reciter').value,b=this;b.disabled=true;Quran.downloadReciter(k,function(p,msg){b.textContent=msg+' ('+p+'%)'}).then(function(){b.disabled=false;b.textContent='✓ تم تنزيل الصوت كاملًا';info()}).catch(function(e){b.disabled=false;b.textContent='⬇ تنزيل الصوت كاملًا بدون إنترنت';toast(e.message||'تعذّر التنزيل')})};
   document.getElementById('audio-clear').onclick=function(){Quran.clearAudio(document.getElementById('plus-reciter').value).then(info)};
 } else if(p==='fav'){
   var f=Store.favorites();panel('❤️ الآيات المفضلة',f.length?f.map(function(x){return '<button class="plus-result" data-open-fav="'+x.s+':'+x.a+'"><b>'+esc(x.label)+'</b><span>اضغط للفتح</span></button>'}).join(''):'<div class="plus-muted">لا توجد آيات مفضلة. اضغط ❤️ بجانب أي آية.</div>');
   document.querySelectorAll('[data-open-fav]').forEach(function(x){x.onclick=function(){var q=x.dataset.openFav.split(':'),a=null;for(var i=0;i<Quran.TOTAL_AYAHS;i++){a=Quran.ayahAt(i);if(a&&a.s==q[0]&&a.a==q[1])break}if(a){document.getElementById('plus-modal').classList.remove('open');var b=document.createElement('button');b.dataset.action='open-page';b.dataset.page=a.p;document.body.appendChild(b);b.click();b.remove()}}});
 } else if(p==='notes'){
   var n=Store.raw().notes||{},keys=Object.keys(n).filter(function(k){return n[k]});if(Store.settings().hideNotes){panel('📝 ملاحظاتي','<div class="plus-muted">الملاحظات مخفية من إعدادات الخصوصية.</div>');return;}panel('📝 ملاحظاتي',keys.length?keys.map(function(k){return '<div class="plus-note"><b>'+esc(k)+'</b><p>'+esc(n[k])+'</p></div>'}).join(''):'<div class="plus-muted">لا توجد ملاحظات. اضغط 📝 بجانب أي آية.</div>');
 } else if(p==='positions'){
   var pos=Store.raw().surahPositions||{}, rows=[];
   for(var s=1;s<=114;s++)if(pos[s]){var pg=typeof pos[s]==='object'?pos[s].page:pos[s];rows.push('<button class="plus-result" data-page="'+pg+'"><b>سورة '+esc(Quran.surahName(s))+'</b><span>آخر صفحة: '+pg+'</span></button>');}
   panel('📌 آخر موضع لكل سورة',rows.length?rows.join(''):'<div class="plus-muted">اقرأ أي سورة وسيتم حفظ آخر صفحة تلقائيًا.</div>');
   document.querySelectorAll('#plus-body [data-page]').forEach(function(x){x.onclick=function(){document.getElementById('plus-modal').classList.remove('open');var b=document.createElement('button');b.dataset.action='open-page';b.dataset.page=x.dataset.page;document.body.appendChild(b);b.click();b.remove()}});
 } else if(p==='offline'){
   var on=!!Store.settings().offlineMode;panel('🚫 وضع أوفلاين','<div class="offline-toggle"><b>منع الاتصال للتلاوة</b><label><input id="offline-switch" type="checkbox" '+(on?'checked':'')+'> تفعيل</label></div><p class="plus-muted">عند التفعيل، التلاوة تستخدم الملفات المحفوظة فقط. نزّل صوت القارئ أولًا.</p><button id="go-audio" class="plus-btn">إدارة وتنزيل صوت القارئ</button>');
   document.getElementById('offline-switch').onchange=function(){Store.setSetting('offlineMode',this.checked);toast(this.checked?'تم تفعيل وضع الأوفلاين':'تم إلغاء وضع الأوفلاين')};
   document.getElementById('go-audio').onclick=function(){renderPanel('audio')};
 } else if(p==='wird'){
   var k=Store.khatma(),stats=Store.khatmaStats();panel('⏰ ورد ذكي','<p>صفحة الختمة الحالية: <b>'+k.currentPage+'</b> — '+stats.progress+'%</p><label>أريد ختم القرآن خلال <input id="plan-days" type="number" min="1" max="365" value="30" style="width:80px"> يوم</label><button id="plan-start" class="plus-btn">ابدأ الخطة</button><p class="plus-muted">604 صفحة ÷ عدد الأيام = الورد اليومي، ويُعاد ضبطه تلقائيًا عند إكمال الختمة.</p>');
   document.getElementById('plan-start').onclick=function(){var d=Math.max(1,+document.getElementById('plan-days').value||30),pp=Math.ceil(604/d),k=Store.khatma();if(k.startedAt&&!window.confirm('لديك ختمة حالية. هل تريد استبدالها والبدء من الصفحة 1؟'))return;Store.setSetting('wirdPagesPerDay',pp);Store.startKhatma(pp,1);toast('تم إنشاء ورد '+pp+' صفحة يوميًا');renderPanel('wird')};
 } else if(p==='stats'){
   var ks=Store.khatmaStats(),qs=Store.quranCharStats(),f=Store.favorites().length,n=Object.keys(Store.raw().notes||{}).filter(function(k){return Store.raw().notes[k]}).length;
   panel('📊 الإحصائيات','<div class="stat-grid"><div><b>'+ks.progress+'%</b><small>الختمة الحالية</small></div><div><b>'+ks.completed+'</b><small>ختمات مكتملة</small></div><div><b>'+f+'</b><small>آيات مفضلة</small></div><div><b>'+n+'</b><small>ملاحظات</small></div><div><b>'+qs.total.toLocaleString('ar-EG')+'</b><small>حروف مقروءة</small></div><div><b>'+ks.behindBy+'</b><small>أيام تأخر</small></div></div>');
 } else if(p==='adaptive'){
   var kx=Store.khatma(), stx=Store.khatmaStats(), weak=(Store.raw().review||{}); var pp=Math.max(5,Math.min(40,Math.round((kx.pagesPerDay||20)*(stx.behindBy>0?.8:1))));
   panel('🤖 خطة ذكية','<p>الخطة تقترح <b>'+pp+' صفحة</b> يوميًا بناءً على تقدمك الحالي.</p><div class="bar"><i style="width:'+stx.progress+'%"></i></div><p class="plus-muted">سيزيد التطبيق المراجعة إذا تكررت الأخطاء، ويخفف الجديد عند التأخر.</p><button id="adaptive-apply" class="plus-btn">تطبيق الخطة</button>');
   document.getElementById('adaptive-apply').onclick=function(){Store.setSetting('wirdPagesPerDay',pp);Store.startKhatma(pp,kx.currentPage||1);toast('تم تطبيق الخطة الذكية من موضعك الحالي')};
 } else if(p==='teacher'){
   var ts=Store.raw().teacher||{newPages:5,reviewPages:5,test:1}; panel('👨‍🏫 الشيخ الافتراضي','<p>جلسة اليوم:</p><div class="stat-grid"><div><b>'+ts.newPages+'</b><small>صفحات جديدة</small></div><div><b>'+ts.reviewPages+'</b><small>صفحات مراجعة</small></div><div><b>'+ts.test+'</b><small>اختبار</small></div></div><button id="teacher-done" class="plus-btn">تمت جلسة اليوم ✓</button>');
   document.getElementById('teacher-done').onclick=function(){Store.bump('quranChars',1);toast('أحسنت، سجّلنا جلسة اليوم')};
 } else if(p==='quiz'){
   var qa=Quran.ayahAt(Math.floor(Math.random()*Math.max(1,Quran.TOTAL_AYAHS)))||Quran.ayahAt(0), typ=Math.floor(Math.random()*3), qtxt=typ===0?'أكمل الآية التالية من ذاكرتك':typ===1?'ما اسم السورة؟':'ما الآية التالية؟';
   panel('🧩 اختبار الحفظ','<b>'+qtxt+'</b><div class="mem-card"><small>سورة '+esc(Quran.surahName(qa.s))+' — آية '+qa.a+'</small><p style="font-family:Amiri;font-size:24px">'+esc(qa.t.split(' ').slice(0,Math.max(2,Math.floor(qa.t.split(' ').length/2))).join(' '))+' …</p><button id="quiz-answer" class="plus-btn">إظهار الإجابة</button><div id="quiz-a" class="plus-muted"></div></div>');
   document.getElementById('quiz-answer').onclick=function(){document.getElementById('quiz-a').textContent=qa.t;toast('راجع الإجابة بهدوء')};
 } else if(p==='speech'){
   var sa=Quran.ayahAt(0), sn=1, an=1;
   panel('🎤 فحص التلاوة بالذكاء الاصطناعي','<p class="plus-muted">يعمل محليًا على الجهاز: يسجل 16kHz mono ثم يشغّل FastConformer ويقارن تسلسل CTC مع آيات القرآن. هذا فحص تطابق تلاوة، وليس حكمًا شرعيًا أو بديلًا عن معلّم تجويد.</p><div class="mem-card"><label>السورة <select id="ai-surah">'+Array.from({length:114},function(_,i){return '<option value="'+(i+1)+'">'+(i+1)+' — '+esc(Quran.surahName(i+1))+'</option>'}).join('')+'</select></label><label>الآية <select id="ai-ayah"></select></label><div id="ai-target" style="font-family:Amiri;font-size:23px;margin:14px 0"></div><button id="speech-start" class="plus-btn">🎙️ ابدأ القراءة</button><p id="speech-out" class="plus-muted"></p></div>');
   var selS=document.getElementById('ai-surah'),selA=document.getElementById('ai-ayah'),target=document.getElementById('ai-target'),out=document.getElementById('speech-out'),btn=document.getElementById('speech-start');
   function refreshAyahs(){sn=+selS.value;var arr=Quran.surah(sn)||[];selA.innerHTML=arr.map(function(a){return '<option value="'+a.a+'">آية '+a.a+'</option>'}).join('');an=+(selA.value||1);sa=Quran.ayahAt((function(){var i=0;while(i<Quran.TOTAL_AYAHS){var x=Quran.ayahAt(i);if(x&&x.s===sn&&x.a===an)return i;i++;}return 0;})())||Quran.surah(sn)[0];target.textContent=sa?sa.t:'';}
   refreshAyahs(); selS.onchange=refreshAyahs; selA.onchange=refreshAyahs;
   btn.onclick=async function(){btn.disabled=true;btn.textContent='🎙️ جارٍ التسجيل…';out.textContent='';try{if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia)throw new Error('الميكروفون غير متاح');var r=await TasneemRecitationAI.recordAndInfer(12000,sn+':'+an,function(pct){out.textContent='التسجيل: '+pct+'%'});var same=(r.surah===sn&&r.ayah===an);out.innerHTML='<b>'+ (same?'✓ تم التعرف على الآية المطلوبة':'⚠️ تم التعرف على آية مختلفة') +'</b><br>التعرف: سورة '+esc(Quran.surahName(r.surah))+' — آية '+r.ayah+'<br>مطابقة التسلسل: <b>'+r.score+'%</b> — ثقة الإطارات: '+r.confidence+'%<br>اختلاف CTC: '+r.distance+' — عدد الرموز: '+r.tokenCount+(same&&r.score<85?'<br>ملاحظة: توجد فروق في التسلسل؛ راجع التلاوة مع معلّم تجويد.':'');}catch(e){out.textContent='تعذر فحص التلاوة: '+(e&&e.message?e.message:'خطأ غير معروف');}finally{btn.disabled=false;btn.textContent='🎙️ ابدأ القراءة مرة أخرى';}};
   // لا نحمل نموذج FastConformer (حوالي 88MB) عند فتح الصفحة؛ يتم تحميله عند بدء الفحص فقط.
 } else if(p==='audio-pro'){
   panel('🔊 تحكم بالصوت','<label>السرعة <input id="spd" type="range" min="0.5" max="2" step="0.1" value="1"></label><label>التكرار <select id="rep-global"><option>1</option><option>2</option><option>3</option><option>5</option><option>10</option></select></label><label>فاصل بين الآيات <input id="gap" type="number" min="0" max="10" value="1"></label><button id="save-audio-pro" class="plus-btn">حفظ الإعدادات</button>');
   document.getElementById('save-audio-pro').onclick=function(){var x=Store.raw();x.audioPro={speed:+document.getElementById('spd').value,repeats:+document.getElementById('rep-global').value,gap:+document.getElementById('gap').value};Store.save();toast('تم حفظ إعدادات الصوت')};
 } else if(p==='downloads'){
   panel('📥 تنزيلات متقدمة','<p>اختر سورة لتنزيل صوتها للقارئ الحالي. التنزيل يتم للآيات الموجودة في السورة.</p><select id="dl-surah">'+Array.from({length:114},function(_,i){return '<option value="'+(i+1)+'">'+(i+1)+' — '+esc(Quran.surahName(i+1))+'</option>'}).join('')+'</select><button id="dl-go" class="plus-btn">⬇ تنزيل السورة</button><div id="dl-status" class="plus-muted"></div>');
   document.getElementById('dl-go').onclick=function(){var sn=+document.getElementById('dl-surah').value,arr=Quran.surah(sn),key=Store.settings().reciter||'yasser';var c='caches' in window?caches.open('tasneem-audio-v2-'+(Store.settings().reciter||'yasser')):Promise.reject();c.then(function(cache){var i=0;function one(){if(i>=arr.length){document.getElementById('dl-status').textContent='اكتمل تنزيل السورة ✓';return}var a=arr[i++],u=Quran.ayahAudioUrl(a.s,a.a,key);fetch(u).then(function(r){return cache.put(u,r)}).then(function(){document.getElementById('dl-status').textContent='تم '+i+' / '+arr.length;one()}).catch(one)}one()}).catch(function(){toast('التخزين المحلي غير متاح')})};
 } else if(p==='storage'){
   panel('💾 إدارة التخزين','<div id="storage-info">جارٍ الحساب…</div><button id="storage-clear" class="plus-btn secondary">حذف بيانات التدريب المحلية</button>');
   var raw=JSON.stringify(Store.raw()), cacheN=0; caches&&caches.open('tasneem-audio-v2-'+(Store.settings().reciter||'yasser')).then(function(c){return c.keys()}).then(function(k){cacheN=k.length;document.getElementById('storage-info').textContent='بيانات التطبيق: '+Math.round(raw.length/1024)+' KB — ملفات صوت محفوظة: '+cacheN});
   document.getElementById('storage-clear').onclick=function(){localStorage.removeItem('tasneem.plus.v1');toast('تم حذف إعدادات PLUS المحلية')};
 } else if(p==='reader-style'){
   var fs=Store.settings().quranFontSize||26; panel('📖 شكل المصحف','<label>حجم خط النص <input id="font-range" type="range" min="18" max="42" value="'+fs+'"></label><label><input id="wide-reader" type="checkbox"> عرض واسع</label><button id="style-save" class="plus-btn">حفظ</button>');
   document.getElementById('style-save').onclick=function(){Store.setSetting('quranFontSize',+document.getElementById('font-range').value);document.body.classList.toggle('wide-reader',document.getElementById('wide-reader').checked);toast('تم حفظ شكل المصحف')};
 } else if(p==='tafsir'){
   panel('📚 التفسير','<p>المصادر المتاحة داخل التطبيق: الميسر والجلالين عند توفرهما عبر المصدر المتصل. عند تنزيل التفسير يمكن الاحتفاظ به محليًا.</p><button class="plus-btn" id="tafsir-open">فتح التفسير من المصحف</button>');
   document.getElementById('tafsir-open').onclick=function(){document.getElementById('plus-modal').classList.remove('open');toast('افتح أي آية ثم اختر التفسير')};
 } else if(p==='ramadan'){
   panel('🌙 وضع رمضان','<p>خطة ختمة 30 يومًا: <b>21 صفحة تقريبًا يوميًا</b>.</p><button id="ram-start" class="plus-btn">بدء خطة رمضان</button><p class="plus-muted">يمكنك استخدامها في أي وقت كخطة شهرية.</p>');document.getElementById('ram-start').onclick=function(){var k=Store.khatma();if(k.startedAt&&!window.confirm('لديك ختمة حالية. هل تريد استبدالها بخطة 30 يومًا؟'))return;Store.setSetting('wirdPagesPerDay',21);Store.startKhatma(21,1);toast('تم تشغيل خطة 30 يومًا')};
 } else if(p==='makkah'){
   panel('🕋 وضع مكة / المدينة','<p>مظهر هادئ للقراءة بدون عناصر مشتتة.</p><button id="holy-theme" class="plus-btn">تفعيل المظهر الهادئ</button>');document.getElementById('holy-theme').onclick=function(){document.body.classList.toggle('holy-mode');toast('تم تفعيل المظهر الهادئ')};
 } else if(p==='challenge'){
   panel('👥 التحديات','<label>هدف الأسبوع (صفحات) <input id="ch-goal" type="number" min="1" value="70"></label><button id="ch-save" class="plus-btn">إنشاء التحدي</button><p id="ch-out" class="plus-muted"></p>');document.getElementById('ch-save').onclick=function(){var x=Store.raw();x.challenge={goal:+document.getElementById('ch-goal').value||70,start:new Date().toISOString()};Store.save();document.getElementById('ch-out').textContent='تم إنشاء تحدي محلي. شارك النتيجة يدويًا مع العائلة.'};
 } else if(p==='backup'){
   panel('🔐 النسخ الاحتياطي','<button id="export-data" class="plus-btn">⬇ تصدير بياناتي</button><input id="import-data" type="file" accept="application/json" style="margin-top:12px;width:100%"><p class="plus-muted">التصدير يشمل المفضلة والملاحظات والتقدم والإعدادات، وليس ملفات الصوت الكبيرة.</p>');
   document.getElementById('export-data').onclick=function(){var b=new Blob([JSON.stringify(Store.raw(),null,2)],{type:'application/json'}),u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download='tasneem-backup.json';a.click();setTimeout(function(){URL.revokeObjectURL(u)},500)};document.getElementById('import-data').onchange=function(e){var f=e.target.files[0];if(!f)return;var rd=new FileReader();rd.onload=function(){try{var x=JSON.parse(rd.result);if(Store.importAll(JSON.stringify(x)))toast('تم استيراد النسخة الاحتياطية') }catch(err){toast('ملف غير صالح')}};rd.readAsText(f)};
 } else if(p==='widget'){
   panel('📱 ويدجت','<p>نسخة الويب داخل التطبيق لا تستطيع إنشاء ويدجت Android حقيقي من JavaScript وحده.</p><button id="widget-copy" class="plus-btn">نسخ نص الورد اليومي</button><p class="plus-muted">يمكنك وضع اختصار التطبيق على الشاشة الرئيسية من إعدادات Android.</p>');document.getElementById('widget-copy').onclick=function(){navigator.clipboard&&navigator.clipboard.writeText('ورد تسنيم اليومي — افتح التطبيق لبدء القراءة');toast('تم النسخ')};
 } else if(p==='wearable'){
   panel('⌚ الساعة الذكية','<p>التطبيق يحتفظ بإعدادات القراءة محليًا، لكن دعم Wear OS الحقيقي يحتاج مكوّن Android مستقل.</p><button id="wear-save" class="plus-btn">حفظ وضع القراءة السريع</button>');document.getElementById('wear-save').onclick=function(){Store.setSetting('wearableQuick',true);toast('تم حفظ إعداد الاستخدام السريع')};
 } else if(p==='reminders'){
   panel('🔔 التذكيرات الذكية','<label>تذكير الورد <input id="rem-time" type="time" value="18:00"></label><button id="rem-save" class="plus-btn">حفظ الوقت</button><p class="plus-muted">سيستخدم التطبيق نظام الإشعارات المتاح على جهازك. قد تحتاج منح الإذن من Android.</p>');document.getElementById('rem-save').onclick=function(){Store.setSetting('smartReminder',document.getElementById('rem-time').value);toast('تم حفظ وقت التذكير')};
 } else if(p==='report'){
   var rs=Store.raw(), hist=(rs.counters&&rs.counters.quranChars&&rs.counters.quranChars.history)||{},month=new Date().toISOString().slice(0,7),sum=0,days=0;Object.keys(hist).forEach(function(d){if(d.slice(0,7)===month){sum+=hist[d];days++}});panel('📈 التقرير الشهري','<div class="stat-grid"><div><b>'+days+'</b><small>أيام نشاط</small></div><div><b>'+sum.toLocaleString('ar-EG')+'</b><small>حروف مسجلة</small></div><div><b>'+Store.favorites().length+'</b><small>مفضلة</small></div><div><b>'+Object.keys(rs.notes||{}).length+'</b><small>ملاحظات</small></div></div><p class="plus-muted">التقرير مبني على البيانات المحلية الموجودة على جهازك.</p>');
 } else if(p==='privacy'){
   panel('🛡️ الخصوصية','<p>بيانات المفضلة والملاحظات والتقدم محفوظة محليًا في الجهاز. لا تضع معلومات حساسة في الملاحظات.</p><label><input id="privacy-hide" type="checkbox"> إخفاء الملاحظات في شاشة PLUS</label><button id="privacy-save" class="plus-btn">حفظ</button>');document.getElementById('privacy-save').onclick=function(){Store.setSetting('hideNotes',document.getElementById('privacy-hide').checked);toast('تم حفظ إعداد الخصوصية')};
 } else if(p==='orientation'){
   panel('🔄 وضع الشاشة','<button id="orient" class="plus-btn">السماح بالتدوير التلقائي</button><p class="plus-muted">إذا كان Android يسمح بتدوير الشاشة، سيتبع التطبيق اتجاه الجهاز. قفل الاتجاه الكامل يحتاج صلاحية native.</p>');document.getElementById('orient').onclick=function(){document.body.classList.toggle('landscape-reader');toast('تم تبديل وضع العرض')};
 }
}
function inject(){
 if(document.getElementById('plus-fab'))return;
 var fab=document.createElement('button');fab.id='plus-fab';fab.textContent='✨';fab.title='تسنيم PLUS';fab.onclick=openFeature;document.body.appendChild(fab);
 var modal=document.createElement('div');modal.id='plus-modal';modal.innerHTML='';document.body.appendChild(modal);
 var saved=state(); if(saved.dark===undefined)saved.dark=(Store.settings().theme==='dark'); document.documentElement.classList.toggle('tasneem-dark',!!saved.dark);save(saved);
 // حفظ آخر موضع لكل سورة بشكل مستمر
 setInterval(function(){var rd=document.getElementById('reader');if(!rd||!rd.classList.contains('open'))return;var title=document.getElementById('r-title'),sub=document.getElementById('r-sub');if(!title||!sub)return;var name=(title.textContent||'').replace(/^سورة\s*/,'').trim(),m=sub.textContent.match(/صفحة\s+(\d+)/);if(!m)return;var s=0;for(var i=0;i<SURAH_META.length;i++)if(SURAH_META[i][1]===name){s=i+1;break}if(s)Store.setSurahPosition(s,+m[1])},1200);
 // إضافة زر الوضع الليلي داخل نافذة المزايا
}
document.addEventListener('DOMContentLoaded',function(){setTimeout(inject,300)});
if(document.readyState!=='loading')setTimeout(inject,300);
window.TasneemPlus={open:openFeature,toggleDark:function(){var x=state();x.dark=!x.dark;save(x);document.documentElement.classList.toggle('tasneem-dark',x.dark)}};
})();