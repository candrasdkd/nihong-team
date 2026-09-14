import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const preOrderModalFile = await readFile(
  new URL("../src/components/PreOrder/PreOrderFormModal.tsx", import.meta.url),
  "utf8",
);
const preOrderServiceFile = await readFile(
  new URL("../src/services/preOrdersFirebase.ts", import.meta.url),
  "utf8",
);

test("addPreOrder always forces status to Pending on creation", () => {
  assert.match(
    preOrderServiceFile,
    /status:\s*"Pending"\s*as\s*PreOrderStatus/,
    "addPreOrder must always enforce 'Pending' status",
  );
  assert.doesNotMatch(
    preOrderServiceFile,
    /status:\s*data\.status\s*\|\|\s*"Pending"/,
    "addPreOrder must not accept arbitrary status from payload",
  );
});

test("PreOrderFormModal does not offer Selesai option and forces Pending when creating", () => {
  assert.match(
    preOrderModalFile,
    /const\s+statusOptions:\s*PreOrderStatus\[\]\s*=\s*initial\s*\?\s*\["Pending",\s*"Selesai"\]\s*:\s*\["Pending"\]/,
    "statusOptions must only contain Pending when initial is undefined",
  );
  assert.match(
    preOrderModalFile,
    /status:\s*initial\s*\?\s*status\s*:\s*"Pending"/,
    "PreOrderFormModal onSubmit must always pass Pending when initial is undefined",
  );
  assert.match(
    preOrderModalFile,
    /disabled=\{!initial\}/,
    "status select should be disabled when creating",
  );
});

test("convertPreOrderToOrder automatically marks all items as checked", () => {
  assert.match(
    preOrderServiceFile,
    /checked:\s*true/,
    "convertPreOrderToOrder must set checked: true on items",
  );
  assert.match(
    preOrderServiceFile,
    /items:\s*updatedItems/,
    "convertPreOrderToOrder must update items with updatedItems in transaction",
  );
});

