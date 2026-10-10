/* مزامنة سحابية بالإيميل (Firebase Auth + Firestore). الإعدادات في js/firebase-config.js */
(function (global) {
  'use strict';
  var app = null, auth = null, db = null, user = null, status = 'idle';
  var lastPushed = null, timer = null, started = false;

  function cfg() { return global.TASNEEM_FIREBASE || {}; }
  function ready() {
    var c = cfg();
    return !!(c.apiKey && c.projectId && global.firebase && global.firebase.auth && global.firebase.firestore);
  }
  function init() {
    if (app) return true;
    if (!ready()) return false;
    try {
      app = global.firebase.apps && global.firebase.apps.length ? global.firebase.app() : global.firebase.initializeApp(cfg());
      auth = global.firebase.auth();
      db = global.firebase.firestore();
      user = auth.currentUser;
      auth.onAuthStateChanged(function (u) { user = u; if (u) startAuto(); });
      return true;
    } catch (e) { app = null; return false; }
  }
  function need() { if (!init()) return Promise.reject(new Error('المزامنة غير مفعّلة — أضف إعدادات Firebase')); return Promise.resolve(); }
  function ref() { return db.collection('users').doc(user.uid); }
  function local() { return global.Store.exportAll(); }
  function msg(e) {
    var m = { 'auth/invalid-email': 'الإيميل غير صحيح', 'auth/user-not-found': 'الحساب غير موجود',
      'auth/wrong-password': 'كلمة السر غير صحيحة', 'auth/invalid-credential': 'الإيميل أو كلمة السر غير صحيحة',
      'auth/email-already-in-use': 'الإيميل مستخدم بالفعل', 'auth/weak-password': 'كلمة السر ضعيفة',
      'auth/network-request-failed': 'مفيش اتصال بالإنترنت', 'auth/too-many-requests': 'محاولات كتير، جرّب بعد شوية' };
    return new Error(m[e && e.code] || (e && e.message) || 'حصل خطأ');
  }

  function push() {
    if (!user) return Promise.resolve();
    var data = local();
    if (data === lastPushed) { status = 'synced'; return Promise.resolve(); }
    status = 'syncing';
    return ref().set({ data: data, updatedAt: Date.now() }).then(function () { lastPushed = data; status = 'synced'; })
      .catch(function (e) { status = 'error'; throw msg(e); });
  }
  /* عند الدخول: لو فيه نسخة سحابية نستوردها، وإلا نرفع المحلي */
  function pullOrPush() {
    status = 'syncing';
    return ref().get().then(function (snap) {
      if (snap.exists && snap.data() && snap.data().data) {
        var remote = snap.data().data;
        if (remote !== local() && global.Store.importAll(remote)) { lastPushed = remote; status = 'synced'; setTimeout(function () { location.reload(); }, 600); return; }
        lastPushed = remote; status = 'synced'; return;
      }
      return push();
    }).catch(function (e) { status = 'error'; throw msg(e); });
  }
  function startAuto() {
    if (started) return; started = true;
    timer = setInterval(function () { push().catch(function () {}); }, 20000);
    document.addEventListener('visibilitychange', function () { if (document.hidden) push().catch(function () {}); });
  }

  global.CloudSync = {
    enabled: function () { return init(); },
    currentUser: function () { init(); return user || (auth && auth.currentUser) || null; },
    status: function () { return status; },
    signIn: function (email, pass) {
      return need().then(function () { return auth.signInWithEmailAndPassword(email, pass); })
        .then(function (r) { user = r.user; startAuto(); return pullOrPush(); })
        .catch(function (e) { throw e instanceof Error && !e.code ? e : msg(e); });
    },
    signUp: function (email, pass) {
      return need().then(function () { return auth.createUserWithEmailAndPassword(email, pass); })
        .then(function (r) { user = r.user; startAuto(); lastPushed = null; return push(); })
        .catch(function (e) { throw e instanceof Error && !e.code ? e : msg(e); });
    },
    resetPassword: function (email) {
      return need().then(function () { return auth.sendPasswordResetEmail(email); }).catch(function (e) { throw e instanceof Error && !e.code ? e : msg(e); });
    },
    signOut: function () {
      return need().then(function () { return auth.signOut(); }).then(function () { user = null; status = 'idle'; lastPushed = null; });
    },
    pushNow: function () { return need().then(function () { lastPushed = null; return push(); }); }
  };
})(window);
