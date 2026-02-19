# Palm Karofler Labels

Internal barcode label generation desktop application for Palm Karofler farm.

## Features

- **Code128 barcode generation** — process types: R, S1, S2, P, L
- **Auto-increment sequences** — each process type has its own independent counter
- **Consecutive or Identical** label modes
- **PDF export** and **direct print** support
- **Label history** with reprint capability
- **Adjustable label size** (presets: 50×30, 60×40, 70×40, 100×50 mm)
- **Dark / Light mode**
- **Fully offline** — local SQLite database, no internet required

## Code format

| Type | Format | Description |
|------|--------|-------------|
| R | `PALM-R-000001` | Reception |
| S1 | `PALM-S1-000001` | Sorting 1 |
| S2 | `PALM-S2-000001` | Sorting 2 |
| P | `PALM-P-000001` | Packing |
| L | `PALM-L-000001` | Lot / Batch |

---

## Building the installer

### Option A — GitHub Actions (recommended, no setup needed)

1. Push this repository to GitHub
2. GitHub Actions automatically builds the Windows `.exe` installer
3. Download from **Actions → latest run → Artifacts**
4. For a versioned release, push a tag:
   ```
   git tag v1.0.0
   git push origin v1.0.0
   ```
   The installer will be attached to a GitHub Release automatically.

### Option B — Build locally on Windows

Requirements: **Node.js 18+**, **Git**

```bash
git clone <your-repo-url>
cd printing-labels

npm install
npm run build
```

Output: `release/Palm Karofler Labels Setup 1.0.0.exe`

---

## Installing on the target Windows PC

1. Copy `Palm Karofler Labels Setup 1.0.0.exe` to the target machine
2. Double-click to run the installer
3. Follow the wizard (choose install directory, create shortcuts)
4. Launch **Palm Karofler Labels** from the desktop

> **Note:** Windows SmartScreen may warn about an unknown publisher (app is unsigned).
> Click **More info → Run anyway** to proceed — this is normal for internal apps.

---

## Data storage

- Database: `%APPDATA%\palm-karofler-labels\palm-karofler.db` (SQLite)
- Backup: Settings page → **Backup Database** button
- All data is stored locally — no cloud, no authentication required.

## Admin PIN

Sequence reset requires PIN: **`1234`**
(Change in `src/pages/SettingsPage.jsx` → `ADMIN_PIN` constant before building)
