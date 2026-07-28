import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(
  new URL("../src/components/BottomTabBar.tsx", import.meta.url),
  "utf8",
);

test("centers the quick-action panel outside the animated transform", () => {
  assert.doesNotMatch(
    source,
    /<motion\.div[\s\S]*?className="[^"]*bottom-\[76px\][^"]*left-1\/2[^"]*-translate-x-1\/2/,
    "Framer Motion overrides the translate transform when centering and animation share one element",
  );

  assert.match(
    source,
    /<div className="absolute bottom-\[76px\] left-1\/2 -translate-x-1\/2">[\s\S]*?<motion\.div/,
    "the non-animated wrapper should own horizontal centering",
  );
});
