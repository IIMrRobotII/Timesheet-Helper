# Timesheet Helper

Chrome extension that copies your work hours from Hilan to Malam and estimates the month's pay, all on your own machine.

![Timesheet Helper icon](public/icon/128.png)

Install from the Chrome Web Store: [Timesheet Helper](https://chromewebstore.google.com/detail/timesheet-helper/paoakhnbjhhefbnpkopaciggopfncnif).

## What it does

Filling in Malam by hand means re-typing every entry and exit time you already reported in Hilan. The extension does that copy for you, then estimates what the month pays.

- Reads entry and exit times from your Hilan timesheet, after auto-clicking the day's time boxes.
- Pastes those hours into the matching Malam rows, and marks vacation days as vacation.
- Estimates the month's pay locally from your hours: regular, night, and weekend time, overtime, plus travel, meal, and vacation amounts.
- Runs from the popup, from keyboard shortcuts, or as one **Sync Everything** pass across both tabs.
- Speaks English and Hebrew, with a right-to-left layout for Hebrew, and follows a light, dark, or system theme.

## How to use

1. Open your Hilan timesheet at `/Hilannetv2/Attendance/`, click **Auto-Click Time Boxes**, then **Copy Hours**.
2. Open Malam payroll at `/Salprd5Root/faces/` and click **Paste Hours**.

Paste fills the rows. Nothing gets submitted for you; you review and submit.

### Keyboard shortcuts

The three single actions also have shortcuts, each working only on its own page:

- `Alt+C` copies on Hilan.
- `Alt+X` auto-clicks the time boxes on Hilan.
- `Alt+V` pastes on Malam.

Each button shows its current key, and Settings has a "Customize in Chrome" button. Chrome owns the bindings, so you rebind them at `chrome://extensions/shortcuts`; the macOS defaults differ, which is why the buttons show your live keys. On a supported page the toolbar icon flashes the result for a couple of seconds, a green count on success or a red `!` on failure.

### Sync everything

**Sync Everything** (`Alt+S`) runs the whole flow across your open tabs. It brings Hilan forward to auto-click and copy, then brings Malam forward to paste, and leaves you on Malam to review and submit. If Malam is not open, it still copies from Hilan and flashes an amber count so you know to open Malam. If Hilan and Malam show different months, or Malam is not on the attendance view with readable dates, it stops before clicking anything.

## Supported pages

- Hilan: `https://*.hilan.co.il/Hilannetv2/Attendance/` and `.../attendance/`
- Malam: `https://payroll.malam.com/Salprd5Root/faces/`

Chrome injects the content script only on these paths, at `document_end`. Everywhere else the extension does nothing.

## Privacy and security

Everything runs on your machine. No servers, no analytics, no network requests. Your data lives in `chrome.storage.local` and never leaves the browser.

- The extension asks for `storage` and host access to the Hilan and Malam paths above. Nothing else.
- The content security policy keeps scripts to `'self'`, holds connections to `'self'` so nothing can phone out, drops plugins with `object-src 'none'`, and requires Trusted Types for any script sink. No remote code can run.
- ESLint blocks the HTML-injection sinks in production code: `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, and `createContextualFragment`, along with `eval` and `new Function`.

Read the full [Privacy Policy](https://iimrrobotii.github.io/Timesheet-Helper/privacy/).

## Develop

Built with [WXT](https://wxt.dev), [React 19](https://react.dev), [shadcn/ui](https://ui.shadcn.com) on Radix, [Tailwind CSS 4](https://tailwindcss.com), TypeScript, [Vitest](https://vitest.dev), and [Bun](https://bun.sh).

```bash
bun install
bun run dev      # launch Chrome with the extension and HMR
bun run build    # production build in .output/chrome-mv3
```

To load the build by hand, open `chrome://extensions/`, turn on Developer mode, choose Load unpacked, and pick `.output/chrome-mv3`.

```bash
bun run compile  # wxt prepare, then tsc --noEmit
bun run test     # Vitest in watch mode
bun run test:run # Vitest once, for CI
bun run lint     # ESLint
bun run format   # Prettier
```

## Credits

The salary estimate started from [Roei Sarid](https://github.com/roeisarid1)'s [salary-calculator](https://github.com/roeisarid1/salary-calculator).

## License

GPL-3.0. See [`LICENSE`](LICENSE).

Found a bug? [Open an issue](https://github.com/IIMrRobotII/Timesheet-Helper/issues/new).
