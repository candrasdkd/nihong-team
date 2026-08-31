import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import test, { after } from "node:test";

const testDir = dirname(fileURLToPath(import.meta.url));
const projectDir = dirname(testDir);
const outputDir = await mkdtemp(join(tmpdir(), "nihong-delivery-validation-"));

execFileSync(
  join(projectDir, "node_modules/.bin/tsc"),
  [
    "src/utils/deliveryAddress.ts",
    "src/vite-env.d.ts",
    "--target", "ES2022",
    "--module", "commonjs",
    "--moduleResolution", "node",
    "--outDir", outputDir,
    "--skipLibCheck",
    "--esModuleInterop",
  ],
  { cwd: projectDir, stdio: "pipe" },
);

const require = createRequire(import.meta.url);
const {
  cleanJapanDeliveryAddress,
  formatJapanPostalCode,
  getIndonesiaDeliveryAddress,
  getJapanDeliveryAddress,
  JAPAN_DELIVERY_TIME_OPTIONS,
  validateJapanDeliveryAddress,
} = require(
  join(outputDir, "utils/deliveryAddress.js"),
);

after(async () => {
  await rm(outputDir, { recursive: true, force: true });
});

test("accepts the Japanese postal mark in a Kanji recipient address", () => {
  const errors = validateJapanDeliveryAddress({
    namaPenerima: "Taro Yamada",
    alamatPenerimaRomaji: "Tsukatanimachi, Yamanakaonsen, Kaga, Ishikawa 922-0111",
    alamatPenerimaKanji: "〒9220111 石川県 加賀市 山中温泉 塚谷町",
    kodePos: "922-0111",
    noHpAktif: "090-1234-5678",
    jamPenerimaPaket: "18:00-20:00",
  });

  assert.equal(errors.alamatPenerimaKanji, undefined);
});

test("accepts only the Yamato-style delivery time choices", () => {
  assert.deepEqual(
    JAPAN_DELIVERY_TIME_OPTIONS.map((option) => option.value),
    [
      "No preference",
      "Morning (before 12:00)",
      "14:00–16:00",
      "16:00–18:00",
      "18:00–20:00",
      "19:00–21:00",
    ],
  );

  const baseAddress = {
    namaPenerima: "Taro Yamada",
    alamatPenerimaRomaji: "Tsukatanimachi, Yamanakaonsen, Kaga, Ishikawa 922-0111",
    alamatPenerimaKanji: "〒9220111 石川県 加賀市 山中温泉 塚谷町",
    kodePos: "922-0111",
    noHpAktif: "090-1234-5678",
  };

  for (const option of JAPAN_DELIVERY_TIME_OPTIONS) {
    const errors = validateJapanDeliveryAddress({
      ...baseAddress,
      jamPenerimaPaket: option.value,
    });
    assert.equal(errors.jamPenerimaPaket, undefined);
  }

  const invalidErrors = validateJapanDeliveryAddress({
    ...baseAddress,
    jamPenerimaPaket: "13:00–15:00",
  });
  assert.equal(invalidErrors.jamPenerimaPaket, "Pilih salah satu waktu penerimaan paket.");
});

test("formats the Japan postal code only for display and keeps Kanji address optional", () => {
  const address = {
    namaPenerima: "Taro Yamada",
    alamatPenerimaRomaji: "Tsukatanimachi, Yamanakaonsen, Kaga, Ishikawa 922-0111",
    alamatPenerimaKanji: "",
    kodePos: "922-0111",
    noHpAktif: "090-1234-5678",
    jamPenerimaPaket: "18:00–20:00",
  };

  const cleaned = cleanJapanDeliveryAddress(address);
  assert.equal(cleaned.kodePos, "9220111");
  assert.equal(formatJapanPostalCode(cleaned.kodePos), "922-0111");

  const errors = validateJapanDeliveryAddress(cleaned);
  assert.equal(errors.kodePos, undefined);
  assert.equal(errors.alamatPenerimaKanji, undefined);
});

test("does not prefill a new delivery address from the general customer profile", () => {
  const customer = {
    nama: "CUSTOMER LAMA",
    alamat: "Alamat profil lama",
    telpon: "081234567890",
  };

  assert.deepEqual(getIndonesiaDeliveryAddress(customer), {
    namaPenerima: "",
    alamatPenerima: "",
    kodePos: "",
    noHp: "",
  });
  assert.deepEqual(getJapanDeliveryAddress(customer), {
    namaPenerima: "",
    alamatPenerimaRomaji: "",
    alamatPenerimaKanji: "",
    kodePos: "",
    noHpAktif: "",
    jamPenerimaPaket: "",
  });
});
