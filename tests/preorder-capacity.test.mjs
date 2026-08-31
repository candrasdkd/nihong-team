import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const detailPage = await readFile(
  new URL("../src/pages/PreOrderDetailPage.tsx", import.meta.url),
  "utf8",
);
const preOrderService = await readFile(
  new URL("../src/services/preOrdersFirebase.ts", import.meta.url),
  "utf8",
);
const scheduleService = await readFile(
  new URL("../src/services/schedulesFirebase.ts", import.meta.url),
  "utf8",
);

test("remaining capacity counts both Pending and Selesai bookings", () => {
  assert.match(
    detailPage,
    /schedule\.slotBeratKg - totalBeratPOs/,
  );
  assert.doesNotMatch(
    detailPage,
    /Sisa \{Math\.max\(0, schedule\.slotBeratKg - schedule\.beratTerpakai\)/,
  );
});

test("changing a booking to Selesai does not release its schedule weight", () => {
  assert.match(preOrderService, /const oldContribution = oldTotalKg/);
  assert.match(preOrderService, /const newContribution = newTotalKg/);
  assert.doesNotMatch(preOrderService, /oldStatus === "Pending" \? oldTotalKg : 0/);
  assert.doesNotMatch(preOrderService, /newStatus === "Pending" \? newTotalKg : 0/);
  assert.doesNotMatch(preOrderService, /if \(payload\.status === "Pending"\)/);
  assert.doesNotMatch(preOrderService, /if \(data\.status === "Pending"\)/);
});

test("legacy stored schedule weight is reconciled from the live booking total", () => {
  assert.match(scheduleService, /export async function setScheduleUsedWeight/);
  assert.match(detailPage, /setScheduleUsedWeight\(schedule\.id, totalBeratPOs\)/);
});
