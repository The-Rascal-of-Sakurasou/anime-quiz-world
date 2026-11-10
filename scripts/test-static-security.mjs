import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";

const frontendFiles = [
  "index.html",
  "admin.html",
  "recommend.html",
  "guide.html",
  "privacy.html",
  "terms.html",
];

const source = new Map();
for (const file of frontendFiles) {
  assert.ok(fs.existsSync(file), `Missing frontend file: ${file}`);
  source.set(file, fs.readFileSync(file, "utf8"));
}

let checkedScripts = 0;
for (const [file, html] of source) {
  const scripts = html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi);
  for (const match of scripts) {
    const attrs = match[1] || "";
    const body = match[2] || "";
    if (/\bsrc\s*=/.test(attrs) || !body.trim()) continue;
    const type = attrs.match(/\btype\s*=\s*["']([^"']+)["']/i)?.[1]?.toLowerCase();
    if (type && !["text/javascript", "application/javascript", "module"].includes(type)) continue;
    new vm.Script(body, { filename: file });
    checkedScripts++;
  }
}
assert.ok(checkedScripts > 0, "No inline JavaScript was checked");

for (const file of ["index.html", "admin.html"]) {
  const html = source.get(file);
  assert.match(html, /http-equiv\s*=\s*["']Content-Security-Policy["']/i, `${file}: CSP meta tag missing`);
  assert.match(html, /name\s*=\s*["']referrer["']/i, `${file}: Referrer-Policy meta tag missing`);
  assert.doesNotMatch(html, /SUPABASE_SERVICE_ROLE_KEY|service_role/i, `${file}: server secret marker found in client HTML`);

  // Detect embedded Supabase service-role JWTs, not just variables with obvious names.
  const jwtCandidates = html.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g) || [];
  for (const token of jwtCandidates) {
    try {
      const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
      assert.notEqual(payload.role, "service_role", `${file}: service-role JWT exposed in frontend`);
    } catch (error) {
      if (error?.code === "ERR_ASSERTION") throw error;
      // Ignore non-JWT strings that only happen to match the token shape.
    }
  }
}

const admin = source.get("admin.html");
assert.match(admin, /persistSession\s*:\s*false/, "Admin session persistence must stay disabled");
assert.match(admin, /autoRefreshToken\s*:\s*true/, "Admin token auto-refresh must stay enabled for active in-memory sessions");
assert.match(admin, /detectSessionInUrl\s*:\s*false/, "Admin URL session detection must stay disabled");
assert.match(admin, /aal2/, "Admin MFA assurance-level enforcement missing");
assert.match(admin, /mfa\.verify/, "Admin TOTP verification flow missing");
assert.match(admin, /aqw-admin-control/, "Protected admin Edge Function call missing");

const recommend = source.get("recommend.html");
const questionBlock = recommend.match(/const questions=\[([\s\S]*?)\n\];\nconst questionTitles=/)?.[1];
assert.ok(questionBlock, "Recommendation question block not found");
const questionTitles = [...questionBlock.matchAll(/title:'([^']+)'/g)].map(match => match[1].trim());
assert.equal(questionTitles.length, 13, "Recommendation diagnosis must contain exactly 13 questions");
assert.equal(new Set(questionTitles).size, questionTitles.length, "Recommendation question titles must be unique");
assert.match(recommend, /new Set\(q\.options\.map\(o=>o\.label\.trim\(\)\)\)\.size!==q\.options\.length/, "Runtime duplicate-option guard missing");

const index = source.get("index.html");
assert.match(index, /body\.textContent\s*=\s*post\.body/, "User-generated post text must be rendered with textContent");
assert.doesNotMatch(index, /innerHTML\s*=\s*[^;]*(?:post\.body|profile\.(?:username|display_name))/, "User-generated profile/post data must not be inserted with innerHTML");

console.log(`Static security checks passed. Checked ${checkedScripts} inline script(s) across ${frontendFiles.length} pages.`);
