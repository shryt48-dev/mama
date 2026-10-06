# Firebase Cloud Sync setup

The web Firebase configuration in `js/cloud-sync.js` is a client configuration; it is not a server secret. Protect the project with Firebase Authentication, Firestore Security Rules, and API-key restrictions in Google Cloud Console.

Recommended Firestore rule shape:

```text
match /backups/{uid} {
  allow read, write: if request.auth != null && request.auth.uid == uid;
}
```

Do not store private credentials in the repository. The current app config may remain client-side, but restrict the API key by the app's authorized origins/APIs.
