# VIALI Home Desktop

This folder preserves the complete multi-user desktop and iPad inventory application. It is separate from the offline scanner in `../offline-scanner-web`, so updates to either application do not replace the other.

## Install and build

Requirements: Node.js 22.5 or later.

```text
npm install
npm install --prefix client
npm run build
npm start
```

The application opens on port 4000 by default.

## Inventory data

The live database is intentionally not stored on GitHub. It remains in the portable installation at `app/data/viali.db`. Back up that file separately and copy it to `desktop-app/data/viali.db` when restoring the application on another computer.

Do not commit `data/viali.db`, `.session-secret`, or other operational database files.

## iPad access

Start the desktop server on the company computer, then open its network address from Safari on the iPad. Normal mode provides dispatch only. Entering the administrator password unlocks the complete desktop feature set, including receiving, barcode assignment, reports, hazards, suppliers, and administration.
