# Photo Studio on Firebase (pbtps.web.app)

A stand-alone copy of the control panel's Photo Studio, built automatically from
`public/admin/photostudio.*` so both copies stay in sync.

- Stores nothing: no database, no uploads, no saved settings. Photos stay in the
  browser until the page is closed; results are downloaded to the device.
- AI models load from jsDelivr (folder `models/` of this repository), not from Firebase,
  so the Firebase site is about 100 KB.
- Deploys on every push to `main` that changes Photo Studio, via
  `.github/workflows/firebase-photostudio.yml`.

One-time setup (already needed only once):
1. Firebase console → project prabhat-b9cb8 → Hosting → Add another site → `pbtps`.
2. Firebase console → Project settings → Service accounts → Generate new private key.
3. GitHub → this repository → Settings → Secrets and variables → Actions → New secret
   named `FIREBASE_SERVICE_ACCOUNT`, paste the whole key file.
4. GitHub → Actions → "Photo Studio to Firebase" → Run workflow.
