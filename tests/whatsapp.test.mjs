import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import test, { after } from "node:test";

const testDir = dirname(fileURLToPath(import.meta.url));
const projectDir = dirname(testDir);
const outputDir = await mkdtemp(join(tmpdir(), "nihong-whatsapp-"));

execFileSync(
  join(projectDir, "node_modules/.bin/tsc"),
  [
    "src/utils/whatsapp.ts",
    "--target", "ES2022",
    "--module", "commonjs",
    "--moduleResolution", "node",
    "--outDir", outputDir,
    "--skipLibCheck",
  ],
  { cwd: projectDir, stdio: "pipe" },
);

const require = createRequire(import.meta.url);
const { normalizeWhatsAppPhone } = require(join(outputDir, "whatsapp.js"));

after(async () => {
  await rm(outputDir, { recursive: true, force: true });
});

test("normalizes Indonesian customer phone numbers for wa.me", () => {
  assert.equal(normalizeWhatsAppPhone("0812-3456-7890"), "6281234567890");
  assert.equal(normalizeWhatsAppPhone("+62 812 3456 7890"), "6281234567890");
  assert.equal(normalizeWhatsAppPhone("0062 812 3456 7890"), "6281234567890");
  assert.equal(normalizeWhatsAppPhone("+81 90-1234-5678"), "819012345678");
});
