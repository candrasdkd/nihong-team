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
  const spaRoute = new RegExp(`^${vercelConfig.rewrites[0].source}$`);
  assert.equal(spaRoute.test("/cari-jastiper"), true);
});

test("Sites worker serves static assets and keeps SPA navigation", async () => {
  const { default: worker } = await import(new URL("../dist/server/index.js", import.meta.url));
  let assetCalls = 0;
  const env = { ASSETS: { fetch: async (request) => {
    assetCalls++;
    return new URL(request.url).pathname === "/index.html" ? new Response("app") : new Response("missing", { status: 404 });
  } } };
  const notFound = await worker.fetch(new Request("https://nihong.example/api/unknown"), env);
  assert.equal(notFound.status, 404);
  assert.equal(assetCalls, 0);
  const page = await worker.fetch(new Request("https://nihong.example/cari-jastiper", { headers: { Accept: "text/html" } }), env);
  assert.equal(await page.text(), "app");
  assert.equal(assetCalls, 2);
});
