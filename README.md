# Timesheet Helper

Chrome extension that copies your work hours from Hilan to Malam and estimates the month's pay locally.

![Timesheet Helper icon](public/icon/128.png)

Install [Timesheet Helper](https://chromewebstore.google.com/detail/timesheet-helper/paoakhnbjhhefbnpkopaciggopfncnif) from the Chrome Web Store.

## What it does

Filling in Malam by hand means typing the same entry and exit times you already reported in Hilan. The extension copies them for you, then estimates what the month pays.

- Reads entry and exit times from your Hilan timesheet after auto-clicking the day's time boxes.
- Pastes those hours into the matching Malam rows and marks vacation days as vacation.
- Estimates the month's pay locally from regular, night, weekend, and overtime hours, plus travel, meal, and vacation amounts.
- Runs from the popup, from keyboard shortcuts, or as one **Sync Everything** pass across both tabs.
- Supports English and Hebrew, including right-to-left layout, and follows a light, dark, or system theme.

## How to use

1. Open your Hilan timesheet at `/Hilannetv2/Attendance/`, click **Auto-Click Time Boxes**, then **Copy Hours**.
2. Open Malam payroll at `/Salprd5Root/faces/` and click **Paste Hours**.

Paste fills the rows. Nothing gets submitted for you. Review it, then submit.

### Keyboard shortcuts

The three single actions also have shortcuts, each working only on its own page:

- `Alt+C` copies on Hilan.
- `Alt+X` auto-clicks the time boxes on Hilan.
- `Alt+V` pastes on Malam.

Each button shows its current key. Settings has a "Customize in Chrome" button too. Rebind shortcuts at `chrome://extensions/shortcuts`. Chrome owns them. macOS defaults differ, so the buttons show your live keys. On a supported page, the toolbar icon shows a blue `…` while it works, then flashes a green count on success or a red `!` on failure.

### Sync everything

With both tabs open, **Sync Everything** (`Alt+S`) activates Hilan, auto-clicks and copies, switches to Malam, pastes, and leaves Malam open for review. If Malam is closed, it still copies from Hilan and flashes an amber count. If Hilan and Malam show different months, or Malam is not on an attendance view with dates it can read, it stops before clicking anything.

## Supported pages

- Hilan: `https://*.hilan.co.il/Hilannetv2/Attendance/` and `.../attendance/`
- Malam: `https://payroll.malam.com/Salprd5Root/faces/`

Chrome injects the content script only on these paths, at `document_end`. Everywhere else the extension does nothing.

## Privacy and security

Everything runs on your machine. No servers, no analytics, no network requests. Your data stays in `chrome.storage.local`.

- The extension asks for `storage` and host access to the Hilan and Malam paths above. Nothing else.
- The content security policy allows scripts and connections only from `'self'`, blocks plugins with `object-src 'none'`, and requires Trusted Types for script sinks.
- ESLint blocks production code from using HTML-injection sinks such as `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, and `createContextualFragment`, along with `eval` and `new Function`.

Read the full [Privacy Policy](https://iimrrobotii.github.io/Timesheet-Helper/privacy/).

## Develop

The stack is [WXT](https://wxt.dev), [React 19](https://react.dev), [shadcn/ui](https://ui.shadcn.com) on Radix, [Tailwind CSS 4](https://tailwindcss.com), TypeScript, [Vitest](https://vitest.dev), and [Bun](https://bun.sh).

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
