# تسنيم — نسخة فحص التلاوة بالذكاء الاصطناعي

## ما الذي تفعله هذه النسخة؟
- FastConformer يعمل محليًا داخل التطبيق عبر ONNX Runtime Web.
- النموذج الحالي يستقبل **16 kHz mono Float32** مباشرة، لأن استخراج الخصائص الصوتية مضمّن داخل رسم ONNX.
- CTC greedy decoding ينتج token IDs، ثم تتم مطابقة التسلسل مع `quran_ctc_tokens.json` لتحديد السورة والآية.
- التطبيق يعرض الآية المتعرّف عليها، درجة تطابق التسلسل، وثقة الإطارات، والمسافة التحريرية.

## حدود مهمة
هذا **ليس فاحص أحكام تجويد كاملًا**. FastConformer هنا للتعرّف على التلاوة ومطابقة الآية. الحكم على المد والغنة والإخفاء والإدغام ومخارج الحروف يحتاج طبقة صوتية/فونيمية متخصصة إضافية.

## GitHub Actions
الـworkflow في `.github/workflows/android.yml`:
1. يثبت npm dependencies.
2. ينسخ ملفات الويب إلى `www`.
3. ينسخ `onnxruntime-web` وملفات WASM محليًا إلى `www/vendor/ort`.
4. يضيف Android بواسطة Capacitor.
5. ينسخ المشروع إلى Android ويضع صلاحيات الموقع.
6. يبني `app-debug.apk` ويرفعه كـartifact.

## ملفات النموذج
النموذج `fastconformer_full_mixed.onnx` حجمه كبير (~85 MB)، وهو أقل من حد GitHub الفردي 100 MB، لكن يجب عدم ضغطه داخل Git LFS إلا إذا اخترت ذلك.


## البناء على GitHub

Workflow البناء يستخدم JDK 21 وNode 20، وينسخ ملفات ONNX Runtime Web (WASM وMJS) كاملة إلى `www/vendor/ort`. لا يحتاج إلى `package-lock.json` لأن GitHub Actions يستخدم `npm install` بدون npm cache.
