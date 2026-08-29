import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const publicPage = await readFile(
  new URL("../src/pages/SharedDeliveryAddressPage.tsx", import.meta.url),
  "utf8",
);
const linkService = await readFile(
  new URL("../src/services/deliveryAddressFirebase.ts", import.meta.url),
  "utf8",
);
const deliveryAddressUtils = await readFile(
  new URL("../src/utils/deliveryAddress.ts", import.meta.url),
  "utf8",
);
const deliveryAddressFields = await readFile(
  new URL("../src/components/DeliveryAddressFields.tsx", import.meta.url),
  "utf8",
);

test("customer page hides the form and printing after a successful submission", () => {
  assert.match(publicPage, /if \(loadState === "used"\) return <CompletedView \/>/);
  assert.doesNotMatch(publicPage, /printDeliveryAddress|Cetak Preview|Preview format cetak/);
});

test("delivery address links are single-use and a new link replaces the active token", () => {
  assert.match(linkService, /if \(link\.usedAt\) throw new PublicDeliveryAddressLinkError\("used"\)/);
  assert.match(linkService, /transaction\.update\(linkRef, \{\s*usedAt: serverTimestamp\(\)/);
  assert.match(linkService, /deliveryAddressShareToken: token/);
  assert.match(linkService, /booking\.deliveryAddressShareToken !== token/);
});

test("Japan delivery form validates separate Romaji and Kanji addresses", () => {
  assert.match(deliveryAddressFields, /Alamat Penerima \(Romaji\)/);
  assert.match(deliveryAddressFields, /Alamat Penerima \(Kanji\)/);
  assert.match(deliveryAddressFields, /<FieldLabel optional>Alamat Penerima \(Kanji\)<\/FieldLabel>/);
  assert.match(deliveryAddressFields, /formatJapanPostalCode\(value\.kodePos\)/);
  assert.match(deliveryAddressFields, /normalizeJapanPostalCode\(event\.target\.value\)/);
  assert.match(deliveryAddressFields, /No\. HP Aktif \(No\. Telepon Jepang\)/);
  assert.doesNotMatch(deliveryAddressFields, /No\. kamar|No\. Room/);
  assert.match(deliveryAddressUtils, /ROMAJI_ADDRESS_PATTERN/);
  assert.match(deliveryAddressUtils, /JAPANESE_ADDRESS_PATTERN/);
  assert.match(deliveryAddressUtils, /Domestic Shipping in Japan/);
  assert.match(deliveryAddressUtils, /Package Receiving Time/);
  assert.doesNotMatch(deliveryAddressUtils, /No Kamar \(Jika Ada\)/);
  assert.match(deliveryAddressFields, /type="radio"/);
  assert.match(deliveryAddressUtils, /Morning \(before 12:00\)/);
  assert.match(deliveryAddressUtils, /19:00–21:00/);
  assert.match(publicPage, /validateJapanDeliveryAddress\(japanAddress\)/);
  assert.match(linkService, /validateJapanDeliveryAddress\(cleanedAddress\)/);
});
