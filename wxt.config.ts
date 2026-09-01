import { resolve } from "node:path";
import { defineConfig } from "wxt";
import tailwindcss from "@tailwindcss/vite";

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "frame-ancestors 'none'",
  "connect-src 'self'",
  "img-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "require-trusted-types-for 'script'",
  "trusted-types default",
].join("; ");

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  alias: {
    "@": resolve("."),
  },
  manifest: {
    name: "Timesheet Helper",
    description: "Copy work hours from Hilan timesheet to Malam payroll, with an on-device salary estimate.",
    permissions: ["storage"],
    host_permissions: [
      "https://*.hilan.co.il/Hilannetv2/Attendance/*",
      "https://*.hilan.co.il/Hilannetv2/attendance/*",
      "https://payroll.malam.com/Salprd5Root/faces/*",
      "https://portal.malam-payroll.com/Salprd5Root/faces/*",
    ],
    commands: {
      "copy-hours": {
        suggested_key: { default: "Alt+C", mac: "MacCtrl+Shift+C" },
        description: "Copy hours from the Hilan timesheet",
      },
      "paste-hours": {
        suggested_key: { default: "Alt+V", mac: "MacCtrl+Shift+V" },
        description: "Paste hours into the Malam payroll",
      },
      "auto-click": {
        suggested_key: { default: "Alt+X", mac: "MacCtrl+Shift+X" },
        description: "Auto-click the Hilan time boxes",
      },
      "sync-all": {
        suggested_key: { default: "Alt+S", mac: "MacCtrl+Shift+S" },
        description: "Sync everything: copy from Hilan and paste into Malam",
      },
    },
    content_security_policy: {
      extension_pages: CSP,
    },
  },
  vite: () => ({
    plugins: [tailwindcss()],
  }),
});
