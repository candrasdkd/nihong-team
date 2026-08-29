import assert from "node:assert/strict";
import test from "node:test";

import { buildPublicUrl, getPublicAppOrigin } from "../src/utils/publicUrl.ts";

test("forces HTTP for a localhost public link served by Vite", () => {
  assert.equal(
    getPublicAppOrigin("https://localhost:5173"),
    "http://localhost:5173",
  );
  assert.equal(
    buildPublicUrl("https://localhost:5173", "/?delivery=booking-123"),
    "http://localhost:5173/?delivery=booking-123",
  );
});

test("uses the configured public deployment origin when available", () => {
  assert.equal(
    buildPublicUrl(
      "http://localhost:5173",
      "/?delivery=booking-123",
      "https://nihong.example.com/",
    ),
    "https://nihong.example.com/?delivery=booking-123",
  );
});
