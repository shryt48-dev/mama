# بناء APK على GitHub

1. ارفع محتويات المجلد ده كلها (بما فيها `.github` و`.gitignore`) على مستودع GitHub، فرع `main`، بـ `git push`.
   (لو رفعت من المتصفح: فولدر `.github` المخفي لازم يتضاف.)
2. افتح تبويب **Actions** ← **Build Android APK** ← **Run workflow** (أو هيشتغل لوحده مع أي push).
3. بعد ما ينجح، نزّل `tasneem-debug-apk` من قسم **Artifacts** في آخر الصفحة، وفيه `app-debug.apk`.

الـ workflow بيعمل: npm install ← فحص JS ← التأكد من 604 صفحة مصحف ← تجهيز `www` ونسخ ONNX Runtime ← `cap add android` ← `patch_android_project.py` ← التحقق من الـ Manifest ← `gradlew assembleDebug`.

ملاحظة: نموذج التسميع (`fastconformer_full_mixed.onnx`) مش في الحزمة، والتطبيق بينزّله من Hugging Face عند أول استخدام للتسميع (محتاج إنترنت مرة واحدة).
