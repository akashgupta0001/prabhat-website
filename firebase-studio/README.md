# Photo Studio on Firebase (pbtps.web.app)

A stand-alone copy of the control panel's Photo Studio, built automatically from
`public/admin/photostudio.*` so both copies stay in sync.

- Stores nothing: no database, no uploads, no saved settings. Photos stay in the
  browser until the page is closed; results are downloaded to the device.
- AI models load from jsDelivr (folder `models/` of this repository), not from Firebase,
  so the Firebase site is about 100 KB.
- Deploys on every push to `main` that changes Photo Studio, via
  `.github/workflows/firebase-photostudio.yml`.

Publishing (live since 20 Nov 2026 at https://pbtps.web.app, project prabhat-b9cb8):
- Open Google Cloud Shell in project prabhat-b9cb8 and run
  `bash <(curl -fsSL https://raw.githubusercontent.com/akashgupta0001/prabhat-website/main/scripts/deploy-firebase-studio.sh)`
  after any Photo Studio change, so the Firebase copy matches the website copy.
- Optional automatic route: add a `FIREBASE_SERVICE_ACCOUNT` secret to this repository and
  `.github/workflows/firebase-photostudio.yml` will publish on every Photo Studio change.
