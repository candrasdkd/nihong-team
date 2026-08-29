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

test("one click starts clipboard copy and opens WhatsApp before awaiting network work", () => {
  const handler = deliveryAddressShareHandlerSource();
  const firstAwait = handler.indexOf("await ");
  const popupStart = handler.indexOf("window.open(");
  const clipboardStart = handler.indexOf("navigator.clipboard.writeText(");

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
