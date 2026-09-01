import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const rupiahInput = await readFile(
  new URL("../src/components/ui/RupiahInput.tsx", import.meta.url),
  "utf8"
);

const orderFormModal = await readFile(
  new URL("../src/components/OrderFormModal.tsx", import.meta.url),
  "utf8"
);

test("RupiahInput enforces strict numeric keyboard without comma and blocks letter inputs without pattern conflict", () => {
  assert.match(rupiahInput, /inputMode="numeric"/);
  assert.doesNotMatch(rupiahInput, /pattern="\[0-9\]\*"/);
  assert.match(rupiahInput, /data-keyboard-type="numeric"/);
  assert.match(rupiahInput, /handleKeyDown/);
  assert.match(rupiahInput, /handleBeforeInput/);
  assert.match(rupiahInput, /handlePaste/);
});

test("OrderFormModal uses RupiahInput for jastip and ongkir fields with decimal comma support for weight (kg)", () => {
  assert.match(orderFormModal, /<RupiahInput[^>]*value=\{hargaJastipManual\}/);
  assert.match(orderFormModal, /<RupiahInput[^>]*value=\{hargaJastipMarkup\}/);
  assert.match(orderFormModal, /<RupiahInput[^>]*value=\{hargaOngkir\}/);
  assert.match(orderFormModal, /<RupiahInput[^>]*value=\{hargaOngkirMarkup\}/);
  assert.match(orderFormModal, /inputMode="decimal"/);
});
