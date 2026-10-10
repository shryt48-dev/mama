/* جيهان PLUS — حزمة المزايا (نسخة مصحّحة: كل بطاقة مربوطة بوظيفة فعلية) */
(function(){
'use strict';
var LS='tasneem.plus.v1';
function $(id){return document.getElementById(id);}
function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function norm(s){return String(s||'').replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g,'').replace(/\u0671/g,'ا').replace(/أ|إ|آ/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي');}
function state(){try{return JSON.parse(localStorage.getItem(LS)||'{}');}catch(e){return {};}}
function save(x){try{localStorage.setItem(LS,JSON.stringify(x));}catch(e){}}
function toast(t){var x=$('toast');if(x){x.textContent=t;x.classList.add('show');setTimeout(function(){x.classList.remove('show');},2400);}}
function findAyah(s,a){var l=Quran.surah(s)||[];for(var i=0;i<l.length;i++)if(l[i].a===a)return l[i];return null;}
function sName(s){try{return Quran.surahName(s);}catch(e){return String(s);}}
function surahOptions(){return Array.from({length:114},function(_,i){return '<option value="'+(i+1)+'">'+(i+1)+' — '+esc(sName(i+1))+'</option>';}).join('');}
function ayahLabel(s,a){return 'سورة '+sName(s)+' — آية '+a;}
function needQuran(){if(Quran.ready())return false;toast('نزّل المصحف أولًا من المزيد');return true;}

var normCache=null;
function normAyahs(){
  if(!normCache||normCache.length!==Quran.TOTAL_AYAHS){normCache=[];for(var i=0;i<Quran.TOTAL_AYAHS;i++){var a=Quran.ayahAt(i);normCache.push(a?norm(a.t):'');}}
  return normCache;
}

var repStop=null;
function stopRepeat(){if(repStop)repStop();}
function closeModal(){var m=$('plus-modal');if(m)m.classList.remove('open');document.body.classList.remove('plus-open');stopRepeat();}
function openPage(p){closeModal();if(window.TasneemApp)window.TasneemApp.openPage(p);}
function bindPages(root){(root||document).querySelectorAll('[data-page]').forEach(function(x){x.onclick=function(){openPage(+x.dataset.page);};});}

function applyDisplay(){
  var st=Store.settings();
  document.body.classList.toggle('holy-mode',!!st.holyMode);
}

/* ---------------- الشاشة الرئيسية للمزايا ---------------- */
function openFeature(){
  var st=state(), fav=Store.favorites(), notes=Store.raw().notes||{}, dark=!!st.dark;
  var nNotes=Object.keys(notes).filter(function(k){return notes[k];}).length;
  var cards=[
    ['search','🔎','البحث في القرآن','ابحث عن كلمة أو آية'],
    ['memorize','🧠','وضع الحفظ','اختبر نفسك في الآيات'],
    ['repeat','🔁','التكرار الذكي','من آية إلى آية'],
    ['audio','🎧','صوت القارئ','اختيار القارئ + تنزيل أوفلاين'],
    ['fav','❤️','المفضلة',fav.length+' آية محفوظة'],
    ['notes','📝','ملاحظاتي',nNotes+' ملاحظة'],
    ['positions','📌','آخر موضع لكل سورة','استئناف سريع'],
    ['offline','🚫','وضع أوفلاين',Store.settings().offlineMode?'مفعّل':'غير مفعّل'],
    ['wird','⏰','ورد ذكي','خطة ختمة تلقائية'],
    ['stats','📊','الإحصائيات','قراءة وحفظ وإنجاز'],
    ['adaptive','🤖','خطة ذكية','تتغير حسب مستواك'],
    ['teacher','👨‍🏫','الشيخ الافتراضي','جديد + مراجعة + اختبار'],
    ['quiz','🧩','اختبارات الحفظ','أكمل الآية والآية التالية'],
    ['speech','🎤','فحص التلاوة بالذكاء الاصطناعي','يعمل على الجهاز'],
    ['audio-pro','🔊','تحكم بالصوت','سرعة + تكرار + فواصل'],
    ['downloads','📥','تنزيلات متقدمة','صوت سورة كاملة'],
    ['storage','💾','إدارة التخزين','الصوت والمحتوى المحلي'],
    ['reader-style','📖','شكل المصحف','تكبير افتراضي + عرض واسع'],
    ['tafsir','📚','التفسير','الميسر أو الجلالين'],
    ['ramadan','🌙','وضع رمضان','خطة 30 يوم'],
    ['makkah','🕋','وضع مكة/المدينة','مظهر هادئ'],
    ['dark','🌗','الوضع الليلي',dark?'مفعّل':'غير مفعّل'],
    ['challenge','👥','التحديات','تحدي صفحات أسبوعي'],
    ['backup','🔐','نسخ احتياطي','تصدير واستيراد بياناتك'],
    ['widget','📱','مشاركة الورد','انسخ ورد اليوم'],
    ['reminders','🔔','تذكير الورد','اختر وقت التذكير'],
    ['report','📈','التقرير الشهري','ملخص القراءة'],
    ['privacy','🛡️','الخصوصية','إخفاء الملاحظات']
  ];
  var html='<div class="plus-head"><div><b>جيهان PLUS</b><small>كل أدوات القراءة والحفظ في مكان واحد</small></div><button id="plus-close">✕</button></div><div class="plus-grid">';
  cards.forEach(function(c){html+='<button class="plus-card" data-p="'+c[0]+'">'+c[1]+'<b>'+c[2]+'</b><small>'+c[3]+'</small></button>';});
  html+='</div><div id="plus-body"></div>';
  var m=$('plus-modal');m.innerHTML=html;m.classList.add('open');document.body.classList.add('plus-open');
  $('plus-close').onclick=closeModal;
  m.querySelectorAll('[data-p]').forEach(function(b){b.onclick=function(){renderPanel(b.dataset.p);};});
}
function panel(title,body){$('plus-body').innerHTML='<div class="plus-panel"><h3>'+title+'</h3>'+body+'</div>';}
function renderPanel(p){
  stopRepeat();
  var f=PANELS[p];
  if(p==='dark'){window.TasneemPlus.toggleDark();openFeature();return;}
  if(f){try{f();}catch(e){panel('تعذّر فتح هذه الميزة','<div class="plus-muted">'+esc(e&&e.message||e)+'</div>');}}
  var b=$('plus-body');if(b&&b.scrollIntoView)b.scrollIntoView({behavior:'smooth',block:'start'});
}

var PANELS={

search:function(){
  panel('🔎 البحث في القرآن','<input id="plus-search" class="plus-input" placeholder="اكتب كلمة أو جزءًا من آية"><div id="search-results" class="plus-results"></div>');
  var inp=$('plus-search'),box=$('search-results');inp.focus();
  inp.oninput=function(){
    var q=norm(inp.value).trim();
    if(!q){box.innerHTML='<div class="plus-muted">اكتب كلمة للبحث</div>';return;}
    if(!Quran.ready()){box.innerHTML='<div class="plus-muted">نزّل المصحف أولًا من المزيد</div>';return;}
    var nc=normAyahs(),out=[];
    for(var i=0;i<nc.length&&out.length<50;i++)if(nc[i].indexOf(q)>-1)out.push(Quran.ayahAt(i));
    box.innerHTML=out.length?out.map(function(a){return '<button class="plus-result" data-page="'+a.p+'"><b>'+esc(ayahLabel(a.s,a.a))+'</b><span>'+esc(a.t)+'</span></button>';}).join(''):'<div class="plus-muted">لا توجد نتائج</div>';
    bindPages(box);
  };
},

memorize:function(){
  var favs=Store.favorites().map(function(f){return findAyah(f.s,f.a);}).filter(Boolean);
  panel('🧠 وضع الحفظ','<p class="plus-muted">'+(favs.length?'تختبر نفسك في آياتك المفضلة.':'لا توجد مفضلة بعد — سنبدأ من أول المصحف. أضف آيات للمفضلة من 📜 داخل المصحف.')+'</p><div id="mem-card" class="mem-card"></div><button id="mem-next" class="plus-btn">الآية التالية</button>');
  var idx=0;
  function cur(){return favs.length?favs[idx%favs.length]:Quran.ayahAt(idx);}
  function show(){
    var z=cur();
    if(!z){$('mem-card').textContent='نزّل المصحف أولًا';return;}
    $('mem-card').innerHTML='<b>'+esc(ayahLabel(z.s,z.a))+'</b><div id="mem-hidden">اضغط لإظهار الآية</div>';
    $('mem-hidden').onclick=function(){this.innerHTML=esc(z.t);this.classList.add('revealed');};
  }
  show();$('mem-next').onclick=function(){idx++;show();};
},

repeat:function(){
  panel('🔁 التكرار الذكي','<div class="two"><label>السورة <input id="rep-s" type="number" min="1" max="114" value="1"></label><label>من آية <input id="rep-a1" type="number" min="1" value="1"></label></div><div class="two"><label>إلى آية <input id="rep-a2" type="number" min="1" value="7"></label><label>التكرار <select id="rep-n"><option>1</option><option>2</option><option>3</option><option selected>5</option><option>10</option><option>20</option></select></label></div><button id="rep-start" class="plus-btn">▶ ابدأ التكرار</button><button id="rep-stop" class="plus-btn secondary">⏹ إيقاف</button><div id="rep-status" class="plus-muted"></div>');
  var stopped=false,audio=null,gapT=null;
  repStop=function(){stopped=true;clearTimeout(gapT);if(audio){try{audio.pause();}catch(e){}}repStop=null;};
  $('rep-start').onclick=function(){
    if(needQuran())return;
    var s=+$('rep-s').value,a1=+$('rep-a1').value,a2=+$('rep-a2').value,n=+$('rep-n').value;
    var arr=(Quran.surah(s)||[]).filter(function(a){return a.a>=a1&&a.a<=a2;});
    if(!arr.length){toast('الآيات غير موجودة');return;}
    stopped=false;clearTimeout(gapT);
    var round=1,ii=0,ap=Store.raw().audioPro||{},speed=+ap.speed||1,gap=Math.max(0,+ap.gap||0),st=$('rep-status');
    audio=audio||new Audio();
    function next(){
      if(stopped)return;
      if(ii>=arr.length){ii=0;round++;}
      if(round>n){st.textContent='انتهى التكرار ✓';return;}
      var a=arr[ii++];
      st.textContent='التكرار '+round+' / '+n+' — آية '+a.a;
      Quran.getPlayableAudioUrl(a.s,a.a,Store.settings().reciter||'yasser').then(function(u){
        if(stopped)return;
        audio.src=u;audio.defaultPlaybackRate=speed;audio.playbackRate=speed;
        audio.onended=function(){if(gap>0)gapT=setTimeout(next,gap*1000);else next();};
        audio.onerror=function(){stopped=true;st.textContent='تعذّر تشغيل الصوت';};
        return audio.play();
      }).catch(function(e){stopped=true;st.textContent='';toast(e&&e.message==='offline'?'وضع الأوفلاين مفعّل — نزّل صوت القارئ أولًا':'تعذّر تشغيل الصوت — تأكد من الإنترنت');});
    }
    next();
  };
  $('rep-stop').onclick=function(){stopped=true;clearTimeout(gapT);if(audio)audio.pause();$('rep-status').textContent='تم الإيقاف';};
},

audio:function(){
  var r=Quran.reciters(),cur=Store.settings().reciter||'yasser';
  panel('🎧 صوت القارئ','<label>القارئ <select id="plus-reciter">'+Object.keys(r).map(function(k){return '<option value="'+k+'" '+(k===cur?'selected':'')+'>'+esc(r[k].name)+'</option>';}).join('')+'</select></label><div id="audio-info" class="plus-muted">جارٍ الفحص…</div><button id="audio-download" class="plus-btn">⬇ تنزيل صوت المصحف كاملًا</button><button id="audio-clear" class="plus-btn secondary">حذف الصوت المحفوظ لهذا القارئ</button><p class="plus-muted">التنزيل الكامل كبير الحجم (مئات الميجابايت) — يُفضَّل على واي فاي. بعده تعمل التلاوة بدون إنترنت.</p>');
  function info(){Quran.audioCacheInfo($('plus-reciter').value).then(function(x){var e=$('audio-info');if(e)e.textContent='محفوظ محليًا: '+x.count+' آية من '+Quran.TOTAL_AYAHS;});}
  $('plus-reciter').onchange=function(){Store.setSetting('reciter',this.value);info();};
  $('audio-download').onclick=function(){
    if(needQuran())return;
    var b=this;b.disabled=true;
    Quran.downloadReciter($('plus-reciter').value,function(p,m){b.textContent=m+' ('+p+'%)';}).then(function(res){
      b.disabled=false;b.textContent=res.failed?('اكتمل مع '+res.failed+' آية فاشلة — أعد المحاولة'):'✓ تم تنزيل الصوت كاملًا';info();
    }).catch(function(e){b.disabled=false;b.textContent='⬇ تنزيل صوت المصحف كاملًا';toast(e.message||'تعذّر التنزيل');info();});
  };
  $('audio-clear').onclick=function(){Quran.clearAudio($('plus-reciter').value).then(function(){toast('تم حذف الصوت المحفوظ');info();});};
  info();
},

fav:function(){
  var f=Store.favorites();
  panel('❤️ الآيات المفضلة',f.length?f.map(function(x){return '<div class="plus-result" style="display:flex;gap:8px;align-items:center"><button style="flex:1;text-align:right" data-open-fav="'+x.s+':'+x.a+'"><b>'+esc(x.label||ayahLabel(x.s,x.a))+'</b><span class="plus-muted" style="display:block">اضغط للفتح</span></button><button data-rm-fav="'+x.s+':'+x.a+'" aria-label="حذف">🗑</button></div>';}).join(''):'<div class="plus-muted">لا توجد آيات مفضلة. افتح أي صفحة في المصحف واضغط 📜 ثم 🤍 بجانب الآية.</div>');
  document.querySelectorAll('[data-open-fav]').forEach(function(x){x.onclick=function(){var q=x.dataset.openFav.split(':'),a=findAyah(+q[0],+q[1]);if(a)openPage(a.p);else toast('نزّل المصحف أولًا');};});
  document.querySelectorAll('[data-rm-fav]').forEach(function(x){x.onclick=function(){var q=x.dataset.rmFav.split(':');Store.toggleFavorite(+q[0],+q[1]);PANELS.fav();};});
},

notes:function(){
  if(Store.settings().hideNotes){panel('📝 ملاحظاتي','<div class="plus-muted">الملاحظات مخفية حسب إعداد الخصوصية — يمكنك إظهارها من بطاقة 🛡️ الخصوصية.</div>');return;}
  var n=Store.raw().notes||{},keys=Object.keys(n).filter(function(k){return n[k];});
  panel('📝 ملاحظاتي',keys.length?keys.map(function(k){var q=k.split(':');return '<div class="plus-note"><b>'+esc(ayahLabel(+q[0],+q[1]))+'</b><p>'+esc(n[k])+'</p><button class="plus-btn secondary" data-open-note="'+k+'">فتح الصفحة</button><button class="plus-btn secondary" data-rm-note="'+k+'">حذف الملاحظة</button></div>';}).join(''):'<div class="plus-muted">لا توجد ملاحظات. افتح أي صفحة في المصحف واضغط 📜 ثم 📝 بجانب الآية.</div>');
  document.querySelectorAll('[data-open-note]').forEach(function(x){x.onclick=function(){var q=x.dataset.openNote.split(':'),a=findAyah(+q[0],+q[1]);if(a)openPage(a.p);};});
  document.querySelectorAll('[data-rm-note]').forEach(function(x){x.onclick=function(){var q=x.dataset.rmNote.split(':');Store.setNote(+q[0],+q[1],'');PANELS.notes();};});
},

positions:function(){
  var pos=Store.raw().surahPositions||{},rows=[];
  for(var s=1;s<=114;s++)if(pos[s])rows.push('<button class="plus-result" data-page="'+pos[s]+'"><b>سورة '+esc(sName(s))+'</b><span>آخر صفحة: '+pos[s]+'</span></button>');
  panel('📌 آخر موضع لكل سورة',rows.length?rows.join(''):'<div class="plus-muted">اقرأ أي سورة في المصحف وسيتم حفظ آخر صفحة تلقائيًا.</div>');
  bindPages($('plus-body'));
},

offline:function(){
  var on=!!Store.settings().offlineMode;
  panel('🚫 وضع أوفلاين','<div class="offline-toggle"><b>منع الاتصال بالإنترنت للتلاوة</b><label><input id="offline-switch" type="checkbox" '+(on?'checked':'')+'> تفعيل</label></div><p class="plus-muted">عند التفعيل تعمل التلاوة من الملفات المحفوظة فقط. نزّل صوت القارئ أولًا.</p><button id="go-audio" class="plus-btn">إدارة وتنزيل صوت القارئ</button>');
  $('offline-switch').onchange=function(){Store.setSetting('offlineMode',this.checked);toast(this.checked?'تم تفعيل وضع الأوفلاين':'تم إلغاء وضع الأوفلاين');};
  $('go-audio').onclick=function(){renderPanel('audio');};
},

wird:function(){
  var k=Store.khatma(),stats=Store.khatmaStats();
  panel('⏰ ورد ذكي','<p>صفحة الختمة الحالية: <b>'+k.currentPage+'</b> — '+stats.progress+'%</p><label>أريد ختم القرآن خلال <input id="plan-days" type="number" min="1" max="365" value="30" style="width:80px"> يوم</label><button id="plan-start" class="plus-btn">ابدأ الخطة</button><p class="plus-muted">604 صفحة ÷ عدد الأيام = الورد اليومي.</p>');
  $('plan-start').onclick=function(){var d=Math.max(1,+$('plan-days').value||30),pp=Math.ceil(604/d);Store.setSetting('wirdPagesPerDay',pp);Store.startKhatma(pp,1);toast('تم إنشاء ورد '+pp+' صفحة يوميًا');renderPanel('wird');};
},

stats:function(){
  var ks=Store.khatmaStats(),qs=Store.quranCharStats(),f=Store.favorites().length,n=Object.keys(Store.raw().notes||{}).length;
  panel('📊 الإحصائيات','<div class="stat-grid"><div><b>'+ks.progress+'%</b><small>الختمة الحالية</small></div><div><b>'+ks.completed+'</b><small>ختمات مكتملة</small></div><div><b>'+f+'</b><small>آيات مفضلة</small></div><div><b>'+n+'</b><small>ملاحظات</small></div><div><b>'+qs.total.toLocaleString('ar-EG')+'</b><small>حروف مقروءة</small></div><div><b>'+ks.behindBy+'</b><small>أيام تأخر</small></div></div>');
},

adaptive:function(){
  var kx=Store.khatma(),stx=Store.khatmaStats();
  var pp=Math.max(5,Math.min(40,Math.round((kx.pagesPerDay||20)*(stx.behindBy>0?.8:1))));
  panel('🤖 خطة ذكية','<p>الخطة تقترح <b>'+pp+' صفحة</b> يوميًا بناءً على تقدمك الحالي'+(stx.behindBy>0?' (خُفّف الورد لأنك متأخر '+stx.behindBy+' يوم)':'')+'.</p><div class="bar"><i style="width:'+stx.progress+'%"></i></div><button id="adaptive-apply" class="plus-btn">تطبيق الخطة</button>');
  $('adaptive-apply').onclick=function(){Store.setSetting('wirdPagesPerDay',pp);Store.startKhatma(pp,kx.currentPage||1);toast('تم تطبيق الخطة الذكية');};
},

teacher:function(){
  var k=Store.khatma(),nFrom=k.currentPage,nTo=Math.min(604,k.currentPage+k.pagesPerDay-1);
  var rN=Math.min(5,Math.max(0,k.currentPage-1)),rFrom=k.currentPage-rN,rTo=k.currentPage-1;
  var done=((Store.raw().teacher||{}).doneDate===Store.today());
  panel('👨‍🏫 الشيخ الافتراضي','<p>جلسة اليوم'+(done?' — <b>تمت ✓</b>':'')+':</p>'+
    '<div class="mem-card"><b>جديد</b><p>صفحات '+nFrom+' – '+nTo+'</p><button id="t-new" class="plus-btn">ابدأ الورد الجديد</button></div>'+
    '<div class="mem-card"><b>مراجعة</b><p>'+(rN?'صفحات '+rFrom+' – '+rTo:'لا مراجعة اليوم — ابدأ ختمتك أولًا')+'</p>'+(rN?'<button id="t-rev" class="plus-btn">ابدأ المراجعة</button>':'')+'</div>'+
    '<div class="mem-card"><b>اختبار</b><p>سؤال سريع من المصحف</p><button id="t-quiz" class="plus-btn">ابدأ الاختبار</button></div>'+
    '<button id="teacher-done" class="plus-btn secondary">'+(done?'سجّلنا جلسة اليوم ✓':'تمت جلسة اليوم ✓')+'</button>');
  $('t-new').onclick=function(){closeModal();if(window.TasneemApp)window.TasneemApp.openWird();};
  if($('t-rev'))$('t-rev').onclick=function(){openPage(rFrom);};
  $('t-quiz').onclick=function(){renderPanel('quiz');};
  $('teacher-done').onclick=function(){Store.setField('teacher',{doneDate:Store.today()});toast('أحسنت، سجّلنا جلسة اليوم');PANELS.teacher();};
},

quiz:function(){
  if(!Quran.ready()){panel('🧩 اختبار الحفظ','<div class="plus-muted">نزّل المصحف أولًا من المزيد</div>');return;}
  var idx=Math.floor(Math.random()*Quran.TOTAL_AYAHS),qa=Quran.ayahAt(idx),typ=Math.floor(Math.random()*3),words=qa.t.split(' ');
  var q,shown,ans,hint='';
  if(typ===0){q='أكمل الآية من ذاكرتك';shown=words.slice(0,Math.max(2,Math.floor(words.length/2))).join(' ')+' …';ans=qa.t;hint=ayahLabel(qa.s,qa.a);}
  else if(typ===1){q='ما اسم السورة ورقم الآية؟';shown=qa.t;ans=ayahLabel(qa.s,qa.a);}
  else{var nx=Quran.ayahAt(idx+1);q='ما الآية التالية؟';shown=qa.t;ans=nx?nx.t:'—';hint=ayahLabel(qa.s,qa.a);}
  panel('🧩 اختبار الحفظ','<b>'+q+'</b><div class="mem-card">'+(hint?'<small>'+esc(hint)+'</small>':'')+'<p style="font-family:Amiri;font-size:24px">'+esc(shown)+'</p><button id="quiz-answer" class="plus-btn">إظهار الإجابة</button><div id="quiz-a" class="plus-muted" style="font-family:Amiri;font-size:20px;margin-top:10px"></div></div><button id="quiz-new" class="plus-btn secondary">سؤال جديد</button>');
  $('quiz-answer').onclick=function(){$('quiz-a').textContent=ans;};
  $('quiz-new').onclick=function(){PANELS.quiz();};
},

speech:function(){
  panel('🎤 فحص التلاوة بالذكاء الاصطناعي','<p class="plus-muted">يعمل محليًا على الجهاز: يسجّل 12 ثانية بصيغة 16kHz ثم يشغّل FastConformer ويقارن تسلسل CTC مع آيات القرآن. هذا فحص تطابق تلاوة، وليس حكمًا شرعيًا ولا بديلًا عن معلّم تجويد.</p><div class="mem-card"><label>السورة <select id="ai-surah">'+surahOptions()+'</select></label><label>الآية <select id="ai-ayah"></select></label><div id="ai-target" style="font-family:Amiri;font-size:23px;margin:14px 0"></div><button id="speech-start" class="plus-btn" disabled>⏳ جارٍ تحميل النموذج…</button><p id="speech-out" class="plus-muted"></p></div>');
  var selS=$('ai-surah'),selA=$('ai-ayah'),target=$('ai-target'),out=$('speech-out'),btn=$('speech-start');
  function cur(){return {s:+selS.value,a:+(selA.value||1)};}
  function showTarget(){var c=cur(),a=findAyah(c.s,c.a);target.textContent=a?a.t:'';}
  function fillAyahs(){var arr=Quran.surah(+selS.value)||[];selA.innerHTML=arr.map(function(a){return '<option value="'+a.a+'">آية '+a.a+'</option>';}).join('');showTarget();}
  selS.onchange=fillAyahs;selA.onchange=showTarget;fillAyahs();
  if(!window.TasneemRecitationAI){out.textContent='محرك التلاوة غير محمّل';btn.textContent='غير متاح';return;}
  out.textContent='أول مرة: جارٍ تجهيز محرك التسميع على الجهاز (حوالي 100 ميجا). بعد اكتماله يعمل بدون إنترنت.';
  window.TasneemRecitationAI.ready().then(function(){if(!$('speech-start'))return;btn.disabled=false;btn.textContent='🎙️ ابدأ القراءة';}).catch(function(e){if(!$('speech-out'))return;out.textContent='محرك التلاوة غير جاهز: '+(e&&e.message?e.message:e);btn.textContent='غير متاح';});
  btn.onclick=async function(){
    var c=cur();btn.disabled=true;btn.textContent='🎙️ جارٍ التسجيل…';out.textContent='';
    try{
      if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia)throw new Error('الميكروفون غير متاح');
      var r=await window.TasneemRecitationAI.recordAndInfer(12000,c.s+':'+c.a,function(pct){out.textContent='التسجيل: '+pct+'%';});
      out.textContent='جارٍ التحليل…';
      var same=(r.surah===c.s&&r.ayah===c.a);
      out.innerHTML='<b>'+(same?'✓ تم التعرف على الآية المطلوبة':'⚠️ تم التعرف على آية مختلفة')+'</b><br>التعرف: '+esc(ayahLabel(r.surah,r.ayah))+'<br>مطابقة التسلسل: <b>'+r.score+'%</b> — ثقة الإطارات: '+r.confidence+'%<br>اختلاف CTC: '+r.distance+' — عدد الرموز: '+r.tokenCount+(same&&r.score<85?'<br>ملاحظة: توجد فروق في التسلسل؛ راجع التلاوة مع معلّم تجويد.':'');
    }catch(e){out.textContent='تعذّر فحص التلاوة: '+(e&&e.message?e.message:'خطأ غير معروف');}
    finally{btn.disabled=false;btn.textContent='🎙️ ابدأ القراءة مرة أخرى';}
  };
},

'audio-pro':function(){
  var ap=Store.raw().audioPro||{speed:1,repeats:1,gap:0};
  panel('🔊 تحكم بالصوت','<label>السرعة: <b id="spd-v">'+ap.speed+'×</b><input id="spd" type="range" min="0.5" max="2" step="0.1" value="'+ap.speed+'"></label><label>تكرار كل آية <select id="rep-global">'+[1,2,3,5,10].map(function(n){return '<option'+(n===ap.repeats?' selected':'')+'>'+n+'</option>';}).join('')+'</select></label><label>فاصل بين الآيات (ثواني) <input id="gap" type="number" min="0" max="10" value="'+ap.gap+'"></label><button id="save-audio-pro" class="plus-btn">حفظ الإعدادات</button><p class="plus-muted">السرعة تُطبَّق على كل تلاوة في التطبيق. التكرار والفاصل يُطبَّقان على تشغيل صفحة المصحف، والفاصل على التكرار الذكي.</p>');
  $('spd').oninput=function(){$('spd-v').textContent=(+this.value).toFixed(1)+'×';};
  $('save-audio-pro').onclick=function(){Store.setField('audioPro',{speed:+$('spd').value,repeats:+$('rep-global').value,gap:Math.max(0,Math.min(10,+$('gap').value||0))});toast('تم حفظ إعدادات الصوت');};
},

downloads:function(){
  panel('📥 تنزيلات متقدمة','<p>اختر سورة لتنزيل صوتها للقارئ الحالي.</p><select id="dl-surah">'+surahOptions()+'</select><button id="dl-go" class="plus-btn">⬇ تنزيل السورة</button><div id="dl-status" class="plus-muted"></div>');
  $('dl-go').onclick=function(){
    if(needQuran())return;
    var b=this;b.disabled=true;
    Quran.downloadSurah(+$('dl-surah').value,Store.settings().reciter||'yasser',function(p,m){var e=$('dl-status');if(e)e.textContent=m+' ('+p+'%)';}).then(function(r){
      b.disabled=false;$('dl-status').textContent=r.failed?('اكتمل مع '+r.failed+' آية فاشلة — أعد المحاولة'):'اكتمل تنزيل السورة ✓';
    }).catch(function(e){b.disabled=false;var s=$('dl-status');if(s)s.textContent=e.message||'تعذّر التنزيل';});
  };
},

storage:function(){
  panel('💾 إدارة التخزين','<div id="storage-info">جارٍ الحساب…</div><button id="storage-clear-audio" class="plus-btn secondary">حذف كل الصوت المحفوظ</button><button id="storage-clear" class="plus-btn secondary">إعادة ضبط إعدادات PLUS</button>');
  var raw=JSON.stringify(Store.raw()).length,rs=Quran.reciters(),keys=Object.keys(rs);
  function refresh(){
    Promise.all(keys.map(function(k){return Quran.audioCacheInfo(k).then(function(x){return esc(rs[k].name)+': '+x.count+' آية';});})).then(function(rows){
      var est=(navigator.storage&&navigator.storage.estimate)?navigator.storage.estimate():Promise.resolve(null);
      return est.then(function(e){var el=$('storage-info');if(el)el.innerHTML='بيانات التطبيق: '+Math.round(raw/1024)+' KB'+(e&&e.usage?'<br>المساحة المستخدمة: '+Math.round(e.usage/1048576)+' MB':'')+'<br>'+rows.join('<br>');});
    });
  }
  refresh();
  $('storage-clear-audio').onclick=function(){Promise.all(keys.map(function(k){return Quran.clearAudio(k);})).then(function(){toast('تم حذف الصوت المحفوظ');refresh();});};
  $('storage-clear').onclick=function(){try{localStorage.removeItem(LS);}catch(e){}toast('تمت إعادة ضبط إعدادات PLUS');};
},

'reader-style':function(){
  var st=Store.settings(),z=st.readerZoom||1,fs=st.readerFullscreen!==false;
  panel('📖 شكل المصحف','<label><input id="rs-full" type="checkbox" '+(fs?'checked':'')+'> صفحة بملء الشاشة (الأزرار مخفية — اضغط على الصفحة لإظهارها)</label><label>التكبير الافتراضي عند فتح الصفحة <select id="rs-zoom">'+[1,1.15,1.3,1.5,1.75].map(function(v){return '<option value="'+v+'"'+(v===z?' selected':'')+'>'+Math.round(v*100)+'%</option>';}).join('')+'</select></label><button id="style-save" class="plus-btn">حفظ</button><p class="plus-muted">اسحب بإصبعك لليمين للصفحة التالية ولليسار للسابقة. حجم خط الآيات (ورد اليوم ونافذة آيات الصفحة) يُضبط من المزيد ← حجم خط الآيات.</p>');
  $('style-save').onclick=function(){Store.setSetting('readerFullscreen',$('rs-full').checked);Store.setSetting('readerZoom',+$('rs-zoom').value);toast('تم حفظ شكل المصحف');};
},

tafsir:function(){
  panel('📚 التفسير','<div class="two"><label>السورة <select id="tf-s">'+surahOptions()+'</select></label><label>الآية <select id="tf-a"></select></label></div><button id="tf-go" class="plus-btn">عرض التفسير</button><div id="tf-out" class="plus-note"></div><p class="plus-muted">يُجلب التفسير الميسّر مرة واحدة ثم يُحفظ على الجهاز.</p>');
  var selS=$('tf-s'),selA=$('tf-a');
  function fill(){var arr=Quran.surah(+selS.value)||[];selA.innerHTML=arr.map(function(a){return '<option value="'+a.a+'">'+a.a+'</option>';}).join('');}
  selS.onchange=fill;fill();
  $('tf-go').onclick=function(){
    if(needQuran())return;
    var s=+selS.value,a=+selA.value,o=$('tf-out'),ay=findAyah(s,a);
    o.textContent='جارٍ التحميل…';
    Quran.fetchTafsir(s,a).then(function(t){o.innerHTML='<b>'+esc(ayahLabel(s,a))+'</b><p style="font-family:Amiri;font-size:20px">'+esc(ay?ay.t:'')+'</p><p>'+(t?esc(t):'تعذّر إحضار التفسير الآن — تأكد من الإنترنت.')+'</p>';});
  };
},

ramadan:function(){
  panel('🌙 وضع رمضان','<p>خطة ختمة 30 يومًا: <b>21 صفحة تقريبًا يوميًا</b>.</p><button id="ram-start" class="plus-btn">بدء خطة رمضان</button><p class="plus-muted">يمكنك استخدامها في أي وقت كخطة شهرية.</p>');
  $('ram-start').onclick=function(){Store.setSetting('wirdPagesPerDay',21);Store.startKhatma(21,1);toast('تم تشغيل خطة 30 يومًا');};
},

makkah:function(){
  var on=!!Store.settings().holyMode;
  panel('🕋 وضع مكة / المدينة','<p>مظهر هادئ بدرجات الرمل الدافئة للقراءة.</p><label><input id="holy-switch" type="checkbox" '+(on?'checked':'')+'> تفعيل</label>');
  $('holy-switch').onchange=function(){Store.setSetting('holyMode',this.checked);applyDisplay();toast(this.checked?'تم تفعيل المظهر الهادئ':'تم إلغاء المظهر الهادئ');};
},

challenge:function(){
  var ch=Store.raw().challenge,html='';
  if(ch&&ch.goal){
    var done=(ch.pages||[]).length,pct=Math.min(100,Math.round(done/ch.goal*100)),days=Math.max(0,Math.floor((Date.now()-new Date(ch.start).getTime())/86400000));
    html+='<p>قرأت <b>'+done+'</b> من <b>'+ch.goal+'</b> صفحة ('+pct+'%) — منذ '+days+' يوم</p><div class="bar"><i style="width:'+pct+'%"></i></div><button id="ch-share" class="plus-btn">📤 مشاركة تقدمي</button>';
  }else html+='<p class="plus-muted">لا يوجد تحدٍّ نشط. الصفحات التي تفتحها في المصحف تُحتسب تلقائيًا.</p>';
  html+='<label>هدف التحدي (صفحات) <input id="ch-goal" type="number" min="1" value="70"></label><button id="ch-save" class="plus-btn secondary">'+(ch&&ch.goal?'بدء تحدٍّ جديد':'إنشاء التحدي')+'</button>';
  panel('👥 التحديات',html);
  $('ch-save').onclick=function(){Store.setField('challenge',{goal:Math.max(1,+$('ch-goal').value||70),start:new Date().toISOString(),pages:[]});toast('تم إنشاء التحدي');PANELS.challenge();};
  if($('ch-share'))$('ch-share').onclick=function(){
    var d=(ch.pages||[]).length,t='تحدي جيهان: قرأت '+d+' صفحة من '+ch.goal+' 🌙';
    if(navigator.share)navigator.share({text:t}).catch(function(){});
    else if(navigator.clipboard){navigator.clipboard.writeText(t);toast('تم نسخ النص');}
  };
},

backup:function(){
  panel('🔐 النسخ الاحتياطي','<button id="export-data" class="plus-btn">⬇ تصدير بياناتي (ملف)</button><button id="copy-data" class="plus-btn secondary">📋 نسخ البيانات كنص</button><label style="display:block;margin-top:14px">استيراد من ملف <input id="import-data" type="file" accept="application/json" style="margin-top:8px;width:100%"></label><label style="display:block;margin-top:10px">أو الصق البيانات هنا <textarea id="import-text" style="width:100%;min-height:80px;margin-top:6px"></textarea></label><button id="import-go" class="plus-btn secondary">استيراد من النص</button><p class="plus-muted">يشمل المفضلة والملاحظات والتقدم والإعدادات، وليس ملفات الصوت.</p>');
  function doImport(text){if(Store.importAll(text)){toast('تم الاستيراد — جارٍ إعادة التشغيل');setTimeout(function(){location.reload();},900);}else toast('ملف غير صالح');}
  $('export-data').onclick=function(){var b=new Blob([Store.exportAll()],{type:'application/json'}),u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download='tasneem-backup.json';document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(u);},800);};
  $('copy-data').onclick=function(){if(navigator.clipboard){navigator.clipboard.writeText(Store.exportAll()).then(function(){toast('تم نسخ البيانات');});}else toast('النسخ غير متاح');};
  $('import-data').onchange=function(e){var f=e.target.files[0];if(!f)return;var rd=new FileReader();rd.onload=function(){doImport(rd.result);};rd.readAsText(f);};
  $('import-go').onclick=function(){var t=$('import-text').value.trim();if(t)doImport(t);else toast('الصق البيانات أولًا');};
},

widget:function(){
  var k=Store.khatma(),end=Math.min(604,k.currentPage+k.pagesPerDay-1),txt='ورد جيهان اليوم: من صفحة '+k.currentPage+' إلى صفحة '+end+' (من 604)';
  panel('📱 مشاركة الورد','<p>'+esc(txt)+'</p><button id="widget-copy" class="plus-btn">نسخ / مشاركة ورد اليوم</button><p class="plus-muted">ويدجت الشاشة الرئيسية الحقيقي متاح في نسخة الأندرويد من التطبيق.</p>');
  $('widget-copy').onclick=function(){if(navigator.share)navigator.share({text:txt}).catch(function(){});else if(navigator.clipboard){navigator.clipboard.writeText(txt);toast('تم النسخ');}};
},

reminders:function(){
  var st=Store.settings(),t=st.smartReminder||'09:00';
  panel('🔔 تذكير الورد','<label>وقت تذكير الورد اليومي <input id="rem-time" type="time" value="'+esc(t)+'"></label><button id="rem-save" class="plus-btn">حفظ الوقت</button><p class="plus-muted">يعمل عبر إشعارات الجهاز في تطبيق الأندرويد، وقد تحتاج منح إذن الإشعارات من النظام.</p>');
  $('rem-save').onclick=function(){Store.setSetting('smartReminder',$('rem-time').value||'09:00');Store.setSetting('wirdReminder',true);if(window.TasneemApp)window.TasneemApp.rescheduleReminders();toast('تم حفظ وقت التذكير');};
},

report:function(){
  var rs=Store.raw(),hist=(rs.counters&&rs.counters.quranChars&&rs.counters.quranChars.history)||{},d=new Date(),month=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'),sum=0,days=0;
  Object.keys(hist).forEach(function(k){if(k.slice(0,7)===month){sum+=hist[k];days++;}});
  panel('📈 التقرير الشهري','<div class="stat-grid"><div><b>'+days+'</b><small>أيام نشاط</small></div><div><b>'+sum.toLocaleString('ar-EG')+'</b><small>حروف مسجلة</small></div><div><b>'+Store.favorites().length+'</b><small>مفضلة</small></div><div><b>'+Object.keys(rs.notes||{}).length+'</b><small>ملاحظات</small></div></div><p class="plus-muted">التقرير مبني على البيانات المحلية الموجودة على جهازك.</p>');
},

privacy:function(){
  var hide=!!Store.settings().hideNotes;
  panel('🛡️ الخصوصية','<p>المفضلة والملاحظات والتقدم محفوظة محليًا على جهازك. لا تضع معلومات حساسة في الملاحظات.</p><label><input id="privacy-hide" type="checkbox" '+(hide?'checked':'')+'> إخفاء الملاحظات في شاشة PLUS</label><button id="privacy-save" class="plus-btn">حفظ</button>');
  $('privacy-save').onclick=function(){Store.setSetting('hideNotes',$('privacy-hide').checked);toast('تم حفظ إعداد الخصوصية');};
}

};

function inject(){
  if($('plus-fab'))return;
  var fab=document.createElement('button');fab.id='plus-fab';fab.textContent='✨';fab.title='جيهان PLUS';fab.onclick=openFeature;document.body.appendChild(fab);
  var modal=document.createElement('div');modal.id='plus-modal';document.body.appendChild(modal);
  var saved=state();if(saved.dark===undefined)saved.dark=(Store.settings().theme==='dark');
  document.documentElement.classList.toggle('tasneem-dark',!!saved.dark);save(saved);
  applyDisplay();
  // حفظ آخر موضع لكل سورة أثناء القراءة
  setInterval(function(){
    var rd=$('reader');if(!rd||!rd.classList.contains('open'))return;
    var title=$('r-title'),sub=$('r-sub');if(!title||!sub)return;
    var name=(title.textContent||'').replace(/^سورة\s*/,'').trim(),m=sub.textContent.match(/صفحة\s+(\d+)/);if(!m)return;
    var s=0;for(var i=0;i<SURAH_META.length;i++)if(SURAH_META[i][1]===name){s=i+1;break;}
    if(s)Store.setSurahPosition(s,+m[1]);
  },1200);
}
document.addEventListener('DOMContentLoaded',function(){setTimeout(inject,300);});
if(document.readyState!=='loading')setTimeout(inject,300);
window.TasneemPlus={open:openFeature,toggleDark:function(){var x=state();x.dark=!x.dark;save(x);document.documentElement.classList.toggle('tasneem-dark',x.dark);}};
})();
