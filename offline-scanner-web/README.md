# VIALI Offline Scanner — GitHub Pages

The app scans locally in the iPhone browser. It has no backend, login, database, analytics, or network API. GitHub Pages only delivers the app files. After the first successful visit, the app shell is cached for offline use and scan history stays in the phone's local storage.

## Publish

1. Upload the complete repository to GitHub (do not upload only the built `dist` folder).
2. Open the repository's **Settings → Pages**.
3. Under **Build and deployment**, choose **GitHub Actions**.
4. Open the **Actions** tab and wait for **Deploy VIALI Offline Scanner** to finish.
5. Open the Pages URL on the iPhone using Safari.
6. Tap **Share → Add to Home Screen**, then open **VIALI Scan** from the new icon.
7. Tap **Open camera scanner** and allow camera access.

An internet connection is needed for the first visit. Later launches work offline. The camera must be started by tapping the button, as required by iPhone privacy controls.
