# Timesheet Helper

Chrome extension that copies work hours from Hilan to Malam and estimates monthly pay on your device.

![Timesheet Helper icon](public/icon/128.png)

Install from the Chrome Web Store: [Timesheet Helper](https://chromewebstore.google.com/detail/timesheet-helper/paoakhnbjhhefbnpkopaciggopfncnif).

## Features

- Auto-click Hilan time boxes.
- Copy entry and exit times from Hilan.
- Paste copied hours into Malam.
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

## Supported sites

- Hilan: `https://*.hilan.co.il/Hilannetv2/Attendance/` and `https://*.hilan.co.il/Hilannetv2/attendance/`
- Malam: `https://payroll.malam.com/Salprd5Root/faces/`

## Security and privacy

- Local only. No servers, analytics, or network requests. Data stays in `chrome.storage.local`.
- Minimal permissions. The extension requests `storage` and host access only for the Hilan and Malam paths listed above.
- Scoped content scripts. Chrome injects the content script only on supported paths, at `document_end`.
- Strict CSP. Extension pages use `default-src 'self'`, `script-src 'self'`, and `object-src 'none'`. There is no remote code.
- Safer DOM rules. Production TypeScript lint forbids HTML injection sinks (`innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, `createContextualFragment`), `eval`, and `new Function`.

Full policy: [privacy/index.html](privacy/index.html).

## Report issues

[Open an issue on GitHub](https://github.com/IIMrRobotII/Timesheet-Helper/issues/new).

## Special thanks

- [Roei Sarid](https://github.com/roeisarid1) for the salary calculator inspiration: [original repository](https://github.com/roeisarid1/salary-calculator).

## License

GPL-3.0. See [`LICENSE`](LICENSE).
