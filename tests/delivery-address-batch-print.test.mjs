import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const detailPage = await readFile(
  new URL("../src/pages/PreOrderDetailPage.tsx", import.meta.url),
  "utf8",
);
const deliveryAddressUtils = await readFile(
  new URL("../src/utils/deliveryAddress.ts", import.meta.url),
  "utf8",
);
const bottomTabBar = await readFile(
  new URL("../src/components/BottomTabBar.tsx", import.meta.url),
  "utf8",
);

test("uses one batch print action instead of a print button on every booking row", () => {
  assert.match(detailPage, /function handleDeliveryAddressBatchPrint\(\)/);
  assert.match(detailPage, /printDeliveryAddressBatch\(printItems, schedule\.rute\)/);
  assert.doesNotMatch(detailPage, /handleDeliveryAddressPrint\(po\)/);
  assert.match(detailPage, /Cetak \{pos\.length\} Alamat · A4 2 Kolom/);
  assert.match(detailPage, /group fixed/);
});

test("keeps the mobile batch print button above the bottom navigation and safe area", () => {
  assert.match(bottomTabBar, /h-\[68px\]/);
  assert.match(bottomTabBar, /env\(safe-area-inset-bottom\)/);
  assert.match(
    detailPage,
    /bottom-\[calc\(96px\+env\(safe-area-inset-bottom\)\)\].*?sm:bottom-6/,
  );
});

test("batch print creates two-column A4 cut sheets without split labels", () => {
  assert.match(deliveryAddressUtils, /@page \{ size: A4 portrait; margin: 8mm; \}/);
  assert.match(deliveryAddressUtils, /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(deliveryAddressUtils, /grid-template-rows: repeat\(4, minmax\(0, 1fr\)\)/);
  assert.match(deliveryAddressUtils, /pageStart \+= 8/);
  assert.match(deliveryAddressUtils, /border: 0\.35mm dashed/);
  assert.match(deliveryAddressUtils, /break-inside: avoid/);
  assert.match(deliveryAddressUtils, /page-break-inside: avoid/);
});
