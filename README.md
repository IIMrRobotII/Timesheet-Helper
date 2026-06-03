# Timesheet Helper

Chrome extension that copies work hours from Hilan to Malam and estimates monthly pay on your device.

![Timesheet Helper icon](public/icon/128.png)

Install from the Chrome Web Store: [Timesheet Helper](https://chromewebstore.google.com/detail/timesheet-helper/paoakhnbjhhefbnpkopaciggopfncnif).

## Features

- Auto-click Hilan time boxes.
- Copy entry and exit times from Hilan.
- Paste copied hours into Malam.
- Trigger copy, paste, and auto-click with keyboard shortcuts: `Alt+C` and `Alt+X` on Hilan, `Alt+V` on Malam. The active keys show on the buttons and can be changed in Chrome.
- Or do the whole flow in one go: **Sync Everything** (`Alt+S`) copies from Hilan and pastes into Malam when supported tabs are open.
- Estimate monthly pay locally, including regular hours, night and weekend hours, overtime, travel, meals, and vacation.
- Carry vacation days across to Malam.
- Switch between English and Hebrew, with RTL layout for Hebrew.
- Use light, dark, or system theme.

## Tech stack

[WXT](https://wxt.dev), [React 19](https://react.dev), [shadcn/ui](https://ui.shadcn.com) (Radix), [Tailwind CSS 4](https://tailwindcss.com), TypeScript, [Vitest](https://vitest.dev), and [Bun](https://bun.sh).

## Develop

```bash
bun install
bun run dev      # launches Chrome with the extension (HMR)
bun run build    # production build in .output/chrome-mv3
```

Load unpacked: open `chrome://extensions/`, enable Developer mode, choose Load unpacked, and select `.output/chrome-mv3`.

```bash
bun run compile  # wxt prepare + tsc --noEmit
bun run test     # Vitest watch mode
bun run test:run # Vitest once for CI
bun run lint     # ESLint
bun run format   # Prettier
```

## How to use

1. Open your Hilan timesheet (`/Hilannetv2/Attendance/`), click Auto-Click Time Boxes, then Copy Hours.
2. Open Malam payroll (`/Salprd5Root/faces/`) and click Paste Hours.

Instead of opening the popup, you can press `Alt+C` to copy or `Alt+X` to auto-click on Hilan, and `Alt+V` to paste on Malam. The shortcuts act only on the Hilan and Malam pages and do nothing elsewhere. On those pages a short badge on the toolbar icon shows the result: the affected count in green on success, a red `!` on failure. Each button also shows its current key, and Settings has a "Customize in Chrome" button. Chrome owns the bindings, so rebind them at `chrome://extensions/shortcuts`.

**One-button full sync.** Click **Sync Everything** (or press `Alt+S`) and the extension runs the whole flow across your open tabs: it brings Hilan forward to auto-click and copy, then brings Malam forward to paste, and leaves you on Malam to review and submit. If Malam is not open, it still copies from Hilan and tells you to open Malam to paste. It never submits the form for you. If Hilan and Malam show different months, or if Malam is not on the attendance view with readable dates, it stops before auto-clicking anything.

## Supported sites

- Hilan: `https://*.hilan.co.il/Hilannetv2/Attendance/` and `https://*.hilan.co.il/Hilannetv2/attendance/`
- Malam: `https://payroll.malam.com/Salprd5Root/faces/`

## Security and privacy

- Local only. No servers, analytics, or network requests. Data stays in `chrome.storage.local`.
- Minimal permissions. The extension requests `storage` and host access only for the Hilan and Malam paths listed above.
- Scoped content scripts. Chrome injects the content script only on supported paths, at `document_end`.
- Strict CSP. Extension pages use `default-src 'self'`, `script-src 'self'`, and `object-src 'none'`. There is no remote code.
- Safer DOM rules. Production TypeScript lint forbids HTML injection sinks (`innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, `createContextualFragment`), `eval`, and `new Function`.

Read the full [Privacy Policy](https://iimrrobotii.github.io/Timesheet-Helper/privacy/).

## Report issues

[Open an issue on GitHub](https://github.com/IIMrRobotII/Timesheet-Helper/issues/new).

## Special thanks

- [Roei Sarid](https://github.com/roeisarid1) for the salary calculator inspiration: [original repository](https://github.com/roeisarid1/salary-calculator).

## License

GPL-3.0. See [`LICENSE`](LICENSE).
