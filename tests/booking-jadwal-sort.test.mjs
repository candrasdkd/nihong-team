import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const schedulesFirebaseFile = await readFile(
  new URL("../src/services/schedulesFirebase.ts", import.meta.url),
  "utf8",
);
const preOrdersHookFile = await readFile(
  new URL("../src/hooks/usePreOrders.ts", import.meta.url),
  "utf8",
);
const preOrderModalFile = await readFile(
  new URL("../src/components/PreOrder/PreOrderFormModal.tsx", import.meta.url),
  "utf8",
);
const formatFile = await readFile(
  new URL("../src/utils/format.ts", import.meta.url),
  "utf8",
);

function compareDepartureDates(dateA, dateB) {
  const valA = dateA?.trim() || "";
  const valB = dateB?.trim() || "";
  if (!valA && !valB) return 0;
  if (!valA) return 1;
  if (!valB) return -1;
  return valA.localeCompare(valB);
}

test("compareDepartureDates sorts chronological dates ascending (nearest first)", () => {
  const dates = ["2026-11-20", "2026-09-29", "", "2026-10-05", null, "2026-09-30"];
  const sorted = [...dates].sort(compareDepartureDates);

  assert.deepEqual(sorted, [
    "2026-09-29",
    "2026-09-30",
    "2026-10-05",
    "2026-11-20",
    "",
    null,
  ]);
});

test("compareDepartureDates handles equal dates and edge cases correctly", () => {
  assert.equal(compareDepartureDates("2026-10-01", "2026-10-01"), 0);
  assert.equal(compareDepartureDates("", ""), 0);
  assert.equal(compareDepartureDates(null, undefined), 0);
  assert.ok(compareDepartureDates("2026-09-29", "2026-10-01") < 0);
  assert.ok(compareDepartureDates("2026-10-01", "2026-09-29") > 0);
  assert.ok(compareDepartureDates("", "2026-09-29") > 0);
  assert.ok(compareDepartureDates("2026-09-29", "") < 0);
});

test("format.ts exports compareDepartureDates function", () => {
  assert.match(
    formatFile,
    /export\s+function\s+compareDepartureDates/,
    "format.ts must export compareDepartureDates",
  );
});

test("schedulesFirebase listenSchedules query orders by tanggalBerangkat asc", () => {
  assert.match(
    schedulesFirebaseFile,
    /orderBy\(\s*"tanggalBerangkat",\s*"asc"\s*\)/,
    "listenSchedules must query Firestore by tanggalBerangkat ascending",
  );
  assert.doesNotMatch(
    schedulesFirebaseFile,
    /orderBy\(\s*"tanggalBerangkat",\s*"desc"\s*\)/,
    "listenSchedules must not order by tanggalBerangkat descending",
  );
});

test("usePreOrders sorts schedules and jastiper groups by nearest departure date", () => {
  assert.match(
    preOrdersHookFile,
    /import\s*\{[^}]*compareDepartureDates[^}]*\}\s*from\s*"\.\.\/utils\/format"/,
    "usePreOrders must import compareDepartureDates",
  );

  assert.match(
    preOrdersHookFile,
    /const\s+sorted\s*=\s*\[\.\.\.rows\]\.sort\(\s*\(a,\s*b\)\s*=>\s*compareDepartureDates\(a\.tanggalBerangkat,\s*b\.tanggalBerangkat\)\s*\)/,
    "usePreOrders must sort received schedules state by compareDepartureDates",
  );

  assert.match(
    preOrdersHookFile,
    /list\.sort\(\(a,\s*b\)\s*=>\s*compareDepartureDates\(a\.date,\s*b\.date\)\)/,
    "groupedBySchedule must sort by departure date ascending",
  );

  assert.match(
    preOrdersHookFile,
    /schedules:\s*g\.schedules\.sort\(\(a,\s*b\)\s*=>\s*compareDepartureDates\(a\.date,\s*b\.date\)\)/,
    "groupedByJastiper must sort schedules inside each jastiper group by nearest date",
  );

  assert.match(
    preOrdersHookFile,
    /result\.sort\(\(a,\s*b\)\s*=>\s*\{[\s\S]*?compareDepartureDates\(earliestA,\s*earliestB\)[\s\S]*?\}\)/,
    "groupedByJastiper must sort Jastiper groups so the Jastiper with the nearest trip comes first",
  );
});

test("PreOrderFormModal ScheduleSelect sorts options by nearest departure date", () => {
  assert.match(
    preOrderModalFile,
    /compareDepartureDates\(a\.tanggalBerangkat,\s*b\.tanggalBerangkat\)/,
    "ScheduleSelect must sort schedule options with compareDepartureDates",
  );
});
