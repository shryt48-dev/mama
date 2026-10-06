# CAP.Tasneem native plugin

The Android build creates and registers a real Capacitor plugin named `Tasneem`.

Implemented bridge methods used by `js/app.js`:
- `start`
- `setConfig`
- `scheduleAdhan`
- `refreshWidget`
- `requestPinWidget`
- `pullCounts`
- `shareApk`

Native features included in the build:
- Android prayer-time alarms with an `adhan.wav` notification sound.
- Alarm persistence across reboot/app replacement.
- Home-screen widget and Android pin-widget request.
- Current ayah notification that can appear on the lock screen according to Android notification settings.
- Pending background counters for salawat / gate reads.
- Sharing the installed APK through Android's Sharesheet.

The plugin is registered from `MainActivity` and is not silently optional in the Android build.

> Note: the previously supplied project archives did not contain the old native `CAP.Tasneem` source. This build therefore implements the same JavaScript bridge contract as a native Capacitor plugin; it is not claimed to be a byte-for-byte recovery of the old proprietary plugin.
