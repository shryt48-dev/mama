/* =========================================================
   المزامنة السحابية — نسخة من بياناتك (ورد، ختمة، أذكار، إحصائيات)
   مربوطة بإيميلك، فلو مسحت التطبيق أو غيّرت الجهاز وسجّلت
   بنفس الإيميل هترجعلك كل حاجة زي ما سبتها بالظبط.

   بيشتغل بـ Firebase (مجاني). لازم تعمل مشروع Firebase وتحط
   بياناته في FIREBASE_CONFIG تحت — الخطوات في ملف CLOUD-SETUP.md
   ========================================================= */
(function (global) {
  'use strict';

  // 🔧 غيّر القيم دي ببيانات مشروعك على Firebase (Project settings → General → Your apps)
  var FIREBASE_CONFIG = {
    apiKey: 'AIzaSyDslXF_94nBPtJaljL2kUAqTEKvqWB5b6M',
    authDomain: 'tasnem-89cbf.firebaseapp.com',
    projectId: 'tasnem-89cbf',
    storageBucket: 'tasnem-89cbf.firebasestorage.app',
    messagingSenderId: '492585577129',
    appId: '1:492585577129:web:07bb8d5e29431c7a6fd7b8'
  };

  var auth = null, db = null, ready = false, initTried = false;
  var pushTimer = null;
  var lastStatus = 'signed-out'; // signed-out | syncing | synced | error

  function configLooksReal() {
    return FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.apiKey.indexOf('PASTE_') !== 0;
  }

  function init() {
    if (ready || initTried) return;
    initTried = true;
    if (!global.firebase || !configLooksReal()) return; // لسه ملحقتش تحط بيانات المشروع
    try {
      firebase.initializeApp(FIREBASE_CONFIG);
      auth = firebase.auth();
      db = firebase.firestore();
      ready = true;
      auth.onAuthStateChanged(onAuthChanged);
    } catch (e) {
      console.warn('Firebase init failed', e);
    }
  }

  function onAuthChanged(user) {
    setStatus(user ? 'syncing' : 'signed-out');
    fire('cloud-auth-changed', { user: user ? { email: user.email } : null });
    if (user) pullFromCloud(user.uid);
  }

  function setStatus(s) { lastStatus = s; fire('cloud-status', { status: s }); }
  function fire(name, detail) { global.dispatchEvent(new CustomEvent(name, { detail: detail || {} })); }

  function currentUser() { return ready && auth ? auth.currentUser : null; }

  function friendlyError(e) {
    var code = e && e.code || '';
    var map = {
      'auth/email-already-in-use': 'الإيميل ده متسجل قبل كده — جرّب تسجيل الدخول بدل الإنشاء.',
      'auth/invalid-email': 'صيغة الإيميل مش صح.',
      'auth/weak-password': 'كلمة السر لازم تكون 6 حروف/أرقام على الأقل.',
      'auth/wrong-password': 'كلمة السر غلط.',
      'auth/user-not-found': 'مفيش حساب بالإيميل ده.',
      'auth/network-request-failed': 'مفيش اتصال بالإنترنت دلوقتي.',
      'auth/too-many-requests': 'محاولات كتير — جرّب تاني بعد شوية.'
    };
    return map[code] || (e && e.message) || 'حصل خطأ، جرّب تاني.';
  }

  function ensureReady() {
    init();
    if (!ready) return Promise.reject({ message: !global.firebase ?
      'مكتبة المزامنة لسه بتتحمّل، جرّب تاني بعد ثانية.' :
      'المزامنة السحابية لسه مش مفعّلة — راجع ملف CLOUD-SETUP.md.' });
    return Promise.resolve();
  }

  function signUp(email, password) {
    return ensureReady().then(function () {
      return auth.createUserWithEmailAndPassword(email.trim(), password);
    }).then(function (cred) {
      return pushToCloud(cred.user.uid).then(function () { return cred; });
    }).catch(function (e) { return Promise.reject({ message: friendlyError(e) }); });
  }

  function signIn(email, password) {
    return ensureReady().then(function () {
      return auth.signInWithEmailAndPassword(email.trim(), password);
    }).catch(function (e) { return Promise.reject({ message: friendlyError(e) }); });
  }

  function signOutUser() {
    if (!ready || !auth) return Promise.resolve();
    return auth.signOut();
  }

  function resetPassword(email) {
    return ensureReady().then(function () {
      return auth.sendPasswordResetEmail(email.trim());
    }).catch(function (e) { return Promise.reject({ message: friendlyError(e) }); });
  }

  /* بيرفع نسخة من بيانات الجهاز الحالي على السحابة */
  function pushToCloud(uid) {
    if (!ready || !db) return Promise.resolve();
    setStatus('syncing');
    var data = global.Store.exportAll();
    return db.collection('backups').doc(uid).set({
      state: data,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      device: (navigator.userAgent || '').slice(0, 90)
    }, { merge: true }).then(function () {
      setStatus('synced');
      fire('cloud-synced', {});
    }).catch(function (e) {
      setStatus('error');
      console.warn('cloud push failed', e);
    });
  }

  /* بيجيب آخر نسخة محفوظة على السحابة ويسترجعها على الجهاز */
  function pullFromCloud(uid) {
    if (!ready || !db) return Promise.resolve();
    setStatus('syncing');
    return db.collection('backups').doc(uid).get().then(function (doc) {
      if (doc.exists && doc.data() && doc.data().state) {
        global.Store.importAll(doc.data().state);
        setStatus('synced');
        fire('cloud-restored', {});
      } else {
        // أول مرة تسجّل من الجهاز ده: مفيش نسخة سحابية قديمة، ابعت اللي عندك دلوقتي
        return pushToCloud(uid);
      }
    }).catch(function (e) {
      setStatus('error');
      console.warn('cloud pull failed', e);
    });
  }

  /* كل ما حاجة تتغيّر وتتحفظ محليًا (Store.save)، نبعتها للسحابة بعد شوية (مش كل ضغطة) */
  function queuePush() {
    var user = currentUser();
    if (!user) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(function () { pushToCloud(user.uid); }, 4000);
  }

  /* Store.save() بينادي على TasneemBridge.onStateSaved لو موجودة — نستخدم الخطّاف ده
     من غير ما نلمس store.js خالص */
  var prevBridge = global.TasneemBridge;
  global.TasneemBridge = {
    onStateSaved: function (state) {
      if (prevBridge && prevBridge.onStateSaved) { try { prevBridge.onStateSaved(state); } catch (e) {} }
      queuePush();
    }
  };

  global.CloudSync = {
    init: init,
    signUp: signUp, signIn: signIn, signOut: signOutUser, resetPassword: resetPassword,
    currentUser: currentUser,
    status: function () { return lastStatus; },
    enabled: function () { return configLooksReal(); },
    pushNow: function () { var u = currentUser(); return u ? pushToCloud(u.uid) : Promise.resolve(); }
  };

  if (global.firebase) init(); else global.addEventListener('load', init);
})(window);
