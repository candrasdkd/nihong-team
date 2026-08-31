import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const preOrderDetailPage = await readFile(
  new URL("../src/pages/PreOrderDetailPage.tsx", import.meta.url),
  "utf8",
);

function deliveryAddressShareHandlerSource() {
  const start = preOrderDetailPage.indexOf("async function handleDeliveryAddressShare");
  const end = preOrderDetailPage.indexOf("\n  function ", start + 1);
  assert.notEqual(start, -1, "handleDeliveryAddressShare must exist");
  return preOrderDetailPage.slice(start, end === -1 ? undefined : end);
}

test("link and WhatsApp icons use separate delivery-address actions", () => {
  assert.match(
    preOrderDetailPage,
    /handleDeliveryAddressShare\(po, "copy"\)/,
  );
  assert.match(
    preOrderDetailPage,
    /handleDeliveryAddressShare\(po, "whatsapp"\)/,
  );
  assert.match(preOrderDetailPage, /title="Salin link form alamat"/);
  assert.match(preOrderDetailPage, /title="Kirim form alamat via WhatsApp"/);
});

test("WhatsApp action is hidden without a customer phone and completed rows have no redundant badge", () => {
  assert.match(
    preOrderDetailPage,
    /const hasWhatsAppPhone = !!normalizeWhatsAppPhone\(customerPhone\)/,
  );
  assert.match(preOrderDetailPage, /hasWhatsAppPhone && \(/);
  assert.doesNotMatch(preOrderDetailPage, /Sudah dipindahkan/);
});

test("copy and WhatsApp browser APIs start before awaiting network work", () => {
  const handler = deliveryAddressShareHandlerSource();
  const firstAwait = handler.indexOf("await ");
  const popupStart = handler.indexOf("window.open(");
  const clipboardStart = handler.indexOf("navigator.clipboard.writeText(");

  assert.match(handler, /action === "copy"/);
  assert.match(handler, /action === "whatsapp"/);
  assert.match(handler, /https:\/\/wa\.me\//);
  assert.ok(popupStart >= 0, "WhatsApp window must start from the click handler");
  assert.ok(clipboardStart >= 0, "clipboard copy must start from the click handler");
  assert.ok(popupStart < firstAwait, "WhatsApp window must open before the first await");
  assert.ok(clipboardStart < firstAwait, "clipboard copy must start before the first await");
});

test("the WhatsApp URL targets the booking customer phone", () => {
  const handler = deliveryAddressShareHandlerSource();
  assert.match(handler, /po\.noTelponPelanggan/);
  assert.match(handler, /normalizeWhatsAppPhone\(customerPhone\)/);
  assert.match(handler, /wa\.me\/\$\{whatsappPhone\}/);
});
