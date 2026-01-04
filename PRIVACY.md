## Privacy Policy - Timesheet Helper

Last Updated: January 4, 2026

This Privacy Policy explains what data the Timesheet Helper Chrome extension (the "Extension") processes, how it is used, and what choices you have. This policy is designed to meet Chrome Web Store requirements, including the Privacy Policy and Limited Use sections of the Program Policies. See Chrome’s policy for reference: [Chrome Web Store Program Policies - Privacy Policy](https://developer.chrome.com/docs/webstore/program-policies/policies#privacy_policy).

## Overview (Single Purpose)

- The Extension’s single purpose is to help you transfer your working hours from Hilan to Malam and optionally auto-click time boxes on Hilan to reveal times.
- All processing happens on your device. The Extension does not send any data to external servers, and it does not use any third‑party analytics or tracking.

## What Data We Process

The Extension only accesses page content on the specific sites you use it with and stores minimal settings and optional local statistics in Chrome’s local storage.

- **Timesheet data (local only):**
  - When you click "Copy" on a supported Hilan page, the Extension reads per‑day entry and exit times from the page and stores a temporary mapping such as `{ "YYYY/MM/DD": { entryTime, exitTime, originalHilanDate } }` under `timesheetData` in `chrome.storage.local`.
  - When you click "Paste" on a supported Malam page, the Extension reads that local `timesheetData` and fills the matching fields in the page.
- **Optional local statistics (local only):**
  - Counts of successful/failed operations and the last time each operation ran (copy, paste, auto‑click). These are aggregate counters only; no raw page content or identifiers are included. Controlled by the "Statistics" toggle.
- **Settings (local only):**
  - `extensionEnabled` (on/off), `statisticsEnabled` (on/off), `calculatorEnabled` (on/off), `currentLanguage` (en/he), `currentTheme` (system/light/dark), and `hourlyRate` (number, used by the salary calculator).

The Extension does not access your credentials, names, ID numbers, payroll amounts, or any other fields beyond the times needed to accomplish the single purpose described above.

## How We Use Data

- **Provide core functionality:**
  - Read times from Hilan and fill them into Malam when you ask it to.
  - Auto‑click Hilan time boxes to reveal times (when applicable).
  - Estimate monthly pay using the optional salary calculator (reads timesheet data locally; nothing is sent externally).
- **Improve the user experience (optional):**
  - Show local‑only aggregated statistics in the popup (success counts, last time an action ran). You can disable this at any time.

## What We Do NOT Do

- **No data is sent off your device.** There are no remote servers, no telemetry, and no third‑party analytics.
- **No sale or sharing of data.** We do not sell, rent, or share your data with any third party.
- **No unrelated use.** We do not use or retain web page content for purposes unrelated to the Extension’s single purpose.
- **No ads or tracking.** The Extension does not display ads and does not track you across sites.

## Permissions and Scope

To operate, the Extension requires the following Chrome permissions and page scope:

- **`storage`:** Save timesheet data, settings, and optional local statistics in `chrome.storage.local`.
- **Host permissions (path‑scoped):**
  - `https://*.hilan.co.il/Hilannetv2/Attendance/*` and `https://*.hilan.co.il/Hilannetv2/attendance/*`
  - `https://payroll.malam.com/Salprd5Root/faces/*`

The Extension injects content scripts only on the supported paths explicitly listed in the manifest and only to perform the user‑facing features described here.

## Data Storage and Retention

- All data is stored locally using `chrome.storage.local` and remains on your device.
- `timesheetData` remains until you clear it (see "Your Choices and Controls") or uninstall the Extension.
- Optional statistics and settings are stored locally and persist until cleared.

## Your Choices and Controls

- **Disable statistics:** Toggle "Statistics" off in the popup to stop collecting local statistics.
- **Clear all data:** Use the "Clear All Data" button in the popup to delete all locally stored data (timesheet data, statistics, and settings). After clearing, the Extension resets to defaults (enabled and statistics on by default). You can immediately re‑disable statistics if you prefer.
- **Uninstall:** Remove the Extension from Chrome to delete its data from your browser.

## Security

- The Extension follows a strict Content Security Policy and does not load or execute code from remote sources.
- Data remains in Chrome’s local extension storage and is not transmitted to external servers.
- Please note: local storage is not additionally encrypted by the Extension. Protect your device and browser profile accordingly.

## Children’s Privacy

The Extension is not directed to children under 13 and does not knowingly collect personal information from children.

## International Data Transfers

Not applicable. The Extension does not transmit data off your device.

## Compliance with Chrome Web Store Policies (Limited Use)

The Extension limits access and use of page content strictly to the user‑facing single purpose described above and does not collect or use web browsing activity beyond what is required to provide that purpose. See: [Chrome Web Store Program Policies - Privacy Policy](https://developer.chrome.com/docs/webstore/program-policies/policies#privacy_policy).

## Changes to This Policy

We may update this policy from time to time. Material changes will be reflected by updating the "Last Updated" above in the repository and on the listing.

## Contact

If you have questions or requests related to this policy or your data:

- Open an issue in the project’s issue tracker (see the "Report Issues" section in the README), or
- Use the support contact provided on the Chrome Web Store listing.
