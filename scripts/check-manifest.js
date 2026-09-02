import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const MANIFEST_PATH = resolve(process.cwd(), ".output/chrome-mv3/manifest.json");

const EXPECTED_PERMISSIONS = ["storage"];
const EXPECTED_HOST_PERMISSIONS = [
  "https://*.hilan.co.il/Hilannetv2/Attendance/*",
  "https://*.hilan.co.il/Hilannetv2/attendance/*",
  "https://payroll.malam.com/Salprd5Root/faces/*",
  "https://portal.malam-payroll.com/Salprd5Root/faces/*",
];
const EXPECTED_STYLE_SRC = ["'self'", "'unsafe-inline'"];

const isLocalScriptSource = token =>
  token === "'self'" ||
  token === "'none'" ||
  token.startsWith("'nonce-") ||
  token.startsWith("'sha256-") ||
  token.startsWith("'sha384-") ||
  token.startsWith("'sha512-");

const parseCsp = csp => {
  const directives = new Map();
  for (const segment of csp.split(";")) {
    const [name, ...values] = segment.trim().split(/\s+/).filter(Boolean);
    if (name) directives.set(name.toLowerCase(), values);
  }
  return directives;
};

const sameSet = (a, b) => a.length === b.length && [...a].sort().join("|") === [...b].sort().join("|");

const failures = [];
const fail = message => failures.push(message);

let manifest;
try {
  manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
} catch (error) {
  console.error(`Cannot read built manifest at ${MANIFEST_PATH} — run \`bun run build\` first.`);
  console.error(String(error));
  process.exit(1);
}

const csp = manifest.content_security_policy?.extension_pages ?? "";
if (!csp) fail("content_security_policy.extension_pages is missing");

const directives = parseCsp(csp);
const scriptSrc = directives.get("script-src") ?? [];
const styleSrc = directives.get("style-src") ?? [];

if (scriptSrc.includes("'unsafe-inline'")) fail("script-src contains 'unsafe-inline'");
if (csp.includes("'unsafe-eval'")) fail("CSP contains 'unsafe-eval'");
for (const token of scriptSrc) {
  if (token === "'unsafe-inline'" || token === "'unsafe-eval'") continue;
  if (!isLocalScriptSource(token)) fail(`script-src allows a remote/non-local source: ${token}`);
}

if (!sameSet(directives.get("object-src") ?? [], ["'none'"])) fail("object-src 'none' is missing");
if (!sameSet(directives.get("base-uri") ?? [], ["'none'"])) fail("base-uri 'none' is missing");
if (!(directives.get("require-trusted-types-for") ?? []).includes("'script'"))
  fail("require-trusted-types-for 'script' is missing");
if (!(directives.get("trusted-types") ?? []).includes("default")) fail("trusted-types default is missing");

if (!sameSet(styleSrc, EXPECTED_STYLE_SRC))
  fail(
    `style-src drifted from the tracked exception "${EXPECTED_STYLE_SRC.join(" ")}" (got: "${styleSrc.join(" ") || "<empty>"}")`
  );

if (!sameSet(manifest.permissions ?? [], EXPECTED_PERMISSIONS))
  fail(
    `permissions drifted from ${JSON.stringify(EXPECTED_PERMISSIONS)} (got: ${JSON.stringify(manifest.permissions ?? [])})`
  );

if (!sameSet(manifest.host_permissions ?? [], EXPECTED_HOST_PERMISSIONS))
  fail(
    `host_permissions drifted from the scoped Hilan/Malam patterns (got: ${JSON.stringify(manifest.host_permissions ?? [])})`
  );

const contentScriptMatches = (manifest.content_scripts ?? []).flatMap(script => script.matches ?? []);
if (!sameSet(contentScriptMatches, EXPECTED_HOST_PERMISSIONS))
  fail(
    `content_scripts.matches drifted from the scoped Hilan/Malam patterns (got: ${JSON.stringify(contentScriptMatches)})`
  );

if (failures.length) {
  console.error(`Manifest/CSP guard FAILED (${failures.length} issue(s)):`);
  for (const message of failures) console.error(`  - ${message}`);
  process.exit(1);
}

console.log("Manifest/CSP guard passed.");
