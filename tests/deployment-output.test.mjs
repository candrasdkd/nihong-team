import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

test("build output supports both Vercel and Sites", async () => {
  assert.equal(
    await exists("dist/index.html"),
    true,
    "Vercel requires the app entry at dist/index.html",
  );
  assert.equal(
    await exists("dist/client/index.html"),
    true,
    "Sites requires static assets under dist/client",
  );
  assert.equal(
    await exists("dist/server/index.js"),
    true,
    "Sites requires a worker entry point",
  );
  assert.equal(
    await exists("dist/.openai/hosting.json"),
    true,
    "Sites requires hosting metadata",
  );

  const serviceWorker = await readFile("dist/sw.js", "utf8");
  assert.doesNotMatch(
    serviceWorker,
    /client\/index\.html/,
    "the Vercel service worker must not precache the duplicated Sites artifact",
  );

  const vercelConfig = JSON.parse(await readFile("vercel.json", "utf8"));
  assert.equal(vercelConfig.outputDirectory, "dist");
  assert.deepEqual(vercelConfig.rewrites, [
    { source: "/(.*)", destination: "/index.html" },
  ]);
});
