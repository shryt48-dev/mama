#!/usr/bin/env python3
"""
يربط طبقة Android Native بمشروع Capacitor بعد `npx cap add android` (آمن للتكرار).
الاستخدام من جذر المشروع:   python3 android-native/patch_android_project.py [android]

بيعمل:
  1) ينسخ ملفات Java إلى app/src/main/java/com/tasneem/app
  2) ينسخ native-res (الأذان + صوت الصلاة على النبي + الأيقونة) إلى app/src/main/res
  3) يضيف الصلاحيات والخدمات والمستقبِلات في AndroidManifest.xml لو ناقصة
  4) يسجّل TasneemPlugin في MainActivity (من غيره الواجهة مش بتشوف CAP.Tasneem)
"""
import os, re, shutil, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AND = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "android")
MAIN = os.path.join(AND, "app", "src", "main")
PKG_DIR = os.path.join(MAIN, "java", "com", "tasneem", "app")

PERMS = [
    "android.permission.POST_NOTIFICATIONS", "android.permission.VIBRATE", "android.permission.WAKE_LOCK",
    "android.permission.RECEIVE_BOOT_COMPLETED", "android.permission.SCHEDULE_EXACT_ALARM",
    "android.permission.USE_EXACT_ALARM", "android.permission.FOREGROUND_SERVICE",
    "android.permission.FOREGROUND_SERVICE_SPECIAL_USE", "android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK",
    "android.permission.RECORD_AUDIO", "android.permission.MODIFY_AUDIO_SETTINGS",
    "android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS",
]
COMPONENTS = {
    ".UnlockService": '''<service android:name=".UnlockService" android:exported="false" android:foregroundServiceType="specialUse">
            <property android:name="android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE" android:value="salawat_on_unlock_reminder"/>
        </service>''',
    ".AdhanService": '<service android:name=".AdhanService" android:exported="false" android:foregroundServiceType="mediaPlayback"/>',
    ".PlaybackService": '<service android:name=".PlaybackService" android:exported="false" android:foregroundServiceType="mediaPlayback"/>',
    ".AdhanAlarmReceiver": '<receiver android:name=".AdhanAlarmReceiver" android:exported="false"/>',
    ".AyahAlarmReceiver": '<receiver android:name=".AyahAlarmReceiver" android:exported="false"/>',
    ".NotificationActionReceiver": '<receiver android:name=".NotificationActionReceiver" android:exported="false"/>',
    ".BootReceiver": '''<receiver android:name=".BootReceiver" android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.BOOT_COMPLETED"/>
                <action android:name="android.intent.action.MY_PACKAGE_REPLACED"/>
            </intent-filter>
        </receiver>''',
}

def copy_tree(src, dst):
    for base, _, files in os.walk(src):
        for f in files:
            if f.endswith((".py", ".md")): continue
            rel = os.path.relpath(os.path.join(base, f), src)
            out = os.path.join(dst, rel); os.makedirs(os.path.dirname(out), exist_ok=True)
            shutil.copy2(os.path.join(base, f), out)

def patch_manifest():
    p = os.path.join(MAIN, "AndroidManifest.xml")
    s = open(p, encoding="utf8").read(); added = []
    perm_xml = "".join(f'\n    <uses-permission android:name="{x}" />' for x in PERMS if x not in s)
    if perm_xml:
        s = s.replace("</manifest>", perm_xml + "\n</manifest>"); added.append("permissions")
    comp_xml = "".join(f"\n        {v}" for k, v in COMPONENTS.items() if f'android:name="{k}"' not in s)
    if comp_xml:
        s = s.replace("</application>", comp_xml + "\n    </application>"); added.append("components")
    open(p, "w", encoding="utf8").write(s)
    print("manifest:", ", ".join(added) if added else "already complete")

def patch_main_activity():
    p = os.path.join(PKG_DIR, "MainActivity.java")
    if not os.path.exists(p):
        print("MainActivity.java not found — skipped"); return
    s = open(p, encoding="utf8").read()
    if "registerPlugin(TasneemPlugin.class)" in s:
        print("MainActivity: already registers TasneemPlugin"); return
    body = ("{\n    @Override\n    public void onCreate(android.os.Bundle savedInstanceState) {\n"
            "        registerPlugin(TasneemPlugin.class);\n        super.onCreate(savedInstanceState);\n    }\n}")
    s2 = re.sub(r"(public\s+class\s+MainActivity\s+extends\s+BridgeActivity\s*)\{\s*\}", lambda m: m.group(1) + body, s)
    if s2 == s:
        print("MainActivity: custom body — add registerPlugin(TasneemPlugin.class) before super.onCreate by hand"); return
    open(p, "w", encoding="utf8").write(s2); print("MainActivity: TasneemPlugin registered")

if __name__ == "__main__":
    if not os.path.isdir(MAIN):
        sys.exit(f"لم أجد {MAIN} — شغّل `npx cap add android` الأول")
    copy_tree(os.path.join(ROOT, "android-native", "com", "tasneem", "app"), PKG_DIR); print("java: copied")
    copy_tree(os.path.join(ROOT, "native-res"), os.path.join(MAIN, "res")); print("res: copied")
    patch_manifest(); patch_main_activity()
