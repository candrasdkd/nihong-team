import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("NihongStore secondary Firebase requires an admin-authenticated session", async () => {
  const [storeService, authService] = await Promise.all([
    readFile(new URL("../src/services/nihongStoreFirebase.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/services/authFirebase.ts", import.meta.url), "utf8"),
  ]);

  assert.doesNotMatch(storeService, /signInAnonymously/);
  assert.match(storeService, /signInWithEmailAndPassword\(storeAuth, email, password\)/);
  assert.match(storeService, /doc\(storeDb, "admins", credential\.user\.uid\)/);
  assert.match(authService, /await loginNihongStoreAdmin\(email, password\)/);
  assert.match(authService, /logoutNihongStoreAdmin\(\)/);
});
