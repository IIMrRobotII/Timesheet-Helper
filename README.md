## 🕒 Hilan to Malam Timesheet Sync

Chrome extension to copy work hours from Hilan to Malam.

![Extension Icon](src/icons/icon128.png)

Install via Chrome Web Store: [Timesheet Helper](https://chromewebstore.google.com/detail/timesheet-helper/paoakhnbjhhefbnpkopaciggopfncnif).

### Features

- **🔄 Auto-Click**: Reveal time boxes in Hilan
- **📋 Copy from Hilan**: Read actual in/out times
- **📝 Paste to Malam**: Fill payroll timesheet automatically
- **📊 Local Stats**: Optional, on-device analytics (can be disabled in the popup)
- **🏖️ Vacation Support**: Copies vacation days to Malam
- **🌐 i18n**: English and Hebrew support

### Install (Developer mode)

1. `npm install`
2. `npm run build`
3. Open `chrome://extensions/` → enable Developer mode → Load unpacked → select `dist`

### How to Use

1. Open Hilan timesheet (`/Hilannetv2/Attendance/`) → click "🔄 Auto-Click Time Boxes"
2. Click "📋 Copy Hours"
3. Open Malam payroll (`/Salprd5Root/faces/`) → click "📝 Paste Hours"

### Supported Sites

- Hilan: `https://*.hilan.co.il/Hilannetv2/Attendance/`
- Malam: `https://payroll.malam.com/Salprd5Root/faces/`

### Security & Privacy

- **No external network**: All logic runs locally; no data is sent out
- **Minimal permissions**: Only `storage`; HTTPS host permissions scoped to the paths above
- **Scoped content scripts**: Injected only on supported paths, at `document_end`
- **Strict CSP**: `default-src 'self'`; no objects; base/frame ancestors disabled; Trusted Types required
- **Safe DOM updates**: No `innerHTML`; only `textContent`/DOM APIs; ESLint forbids dangerous sinks
- **Local-only analytics**: Optional and can be disabled; one-click clear of all data

### Development

- Dev: `npm run dev`
- Build: `npm run build`
- Lint: `npm run lint`
- Type-check: `npm run type-check`

### Report Issues

[![Report Issue](https://img.shields.io/badge/Report%20Issue-GitHub-red?style=for-the-badge&logo=github)](../../issues/new)

### License

GPL-3.0 — see `LICENSE`.
