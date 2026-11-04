# Macro Scan

Scan a food barcode with your phone's camera and log calories, protein, carbs and fat against daily goals. Product data comes from Open Food Facts, a free public food database.

## What's in the folder

| File | What it does |
|---|---|
| `index.html` | The app's page and styling |
| `app.js` | Scanning, lookups, the daily log |
| `manifest.webmanifest`, `icon-*.png`, `icon.svg` | Lets you add it to your home screen like an app |
| `sw.js` | Makes it open fast and work offline (lookups still need internet) |

## Put it online with GitHub Pages (free, about 5 minutes)

The camera only works on a secure `https://` address, which GitHub Pages gives you.

1. Unzip `macro-scan-app.zip` on your computer.
2. Sign in to [github.com](https://github.com) (or create a free account).
3. Click **+** (top right) → **New repository**. Name it `macro-scan`, set it to **Public**, and click **Create repository**.
4. On the new repo page, click **uploading an existing file**. Drag in **all the files from inside the unzipped folder** (not the folder itself). Click **Commit changes**.
5. Go to **Settings** → **Pages**. Under *Build and deployment*, set **Source** to *Deploy from a branch*, **Branch** to `main` and `/ (root)`, then **Save**.
6. Wait a minute or two and refresh. Your link appears at the top of that page:
   `https://YOUR-USERNAME.github.io/macro-scan/`

## Add it to your phone's home screen

- **iPhone (Safari):** open the link → Share button → **Add to Home Screen**.
- **Android (Chrome):** open the link → ⋮ menu → **Add to Home screen** or **Install app**.

The first time you tap **Scan barcode**, allow camera access.

## Using it

- **Scan barcode** opens the camera. Hold the barcode inside the box until it buzzes.
- If a product isn't in the database, search by name or type the numbers off the label. Anything you've logged before shows under **Log again** for one-tap repeats.
- Use the arrows at the top to look at past days.
- **Goals & backup** (bottom of the page) holds your daily targets and backup buttons.

## Your data

Your log is stored only on your phone, in that browser. Nothing is sent anywhere except barcode and search lookups to Open Food Facts.

- Clearing your browser's site data erases the log, so tap **Export backup** now and then.
- **Restore backup** brings a backup file back, including onto a new phone.
- **Export CSV** gives you a spreadsheet of everything you've logged.

## Updating later

Edit or replace files in the GitHub repo. After an update, close and reopen the app once or twice so your phone picks up the new version. If you change `app.js` or `index.html`, also bump `macro-scan-v1` to `macro-scan-v2` in `sw.js` so the old cached copy is replaced.
