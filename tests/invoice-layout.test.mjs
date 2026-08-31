import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const invoice = await readFile(
  new URL("../src/components/InvoiceModal.tsx", import.meta.url),
  "utf8",
);

test("invoice renders multi-item descriptions as a compact list instead of input-like boxes", () => {
  assert.match(invoice, /borderLeft: "0\.7mm solid #dbeafe"/);
  assert.match(invoice, /borderBottom: sIdx < subItems\.length - 1/);
  assert.doesNotMatch(invoice, /background: "rgba\(241, 245, 249, 0\.7\)"/);
});

test("invoice centers weight and total alongside the complete item description", () => {
  assert.match(invoice, /alignItems: "stretch"/);
  assert.match(invoice, /fontVariantNumeric: "tabular-nums"/);
  assert.match(invoice, /borderTop: "1px dashed #cbd5e1"/);
});
