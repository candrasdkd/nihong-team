import {
  Customer,
  DeliveryCountry,
  IndonesiaDeliveryAddress,
  JapanDeliveryAddress,
} from "../types";

export const JAPAN_DELIVERY_TIME_OPTIONS = [
  { value: "No preference", label: "Tidak ditentukan", japaneseLabel: "指定なし" },
  { value: "Morning (before 12:00)", label: "Pagi (sebelum 12.00)", japaneseLabel: "午前中" },
  { value: "14:00–16:00", label: "14.00–16.00", japaneseLabel: "14時–16時" },
  { value: "16:00–18:00", label: "16.00–18.00", japaneseLabel: "16時–18時" },
  { value: "18:00–20:00", label: "18.00–20.00", japaneseLabel: "18時–20時" },
  { value: "19:00–21:00", label: "19.00–21.00", japaneseLabel: "19時–21時" },
] as const;

export function normalizeJapanPostalCode(value?: string) {
  return String(value || "").replace(/\D/g, "").slice(0, 7);
}

export function formatJapanPostalCode(value?: string) {
  const digits = normalizeJapanPostalCode(value);
  return digits.length > 3 ? `${digits.slice(0, 3)}-${digits.slice(3)}` : digits;
}

function normalizeJapanDeliveryTime(value?: string) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (JAPAN_DELIVERY_TIME_OPTIONS.some((option) => option.value === raw)) return raw;

  const normalized = raw.toLocaleLowerCase("id-ID");
  if (/tidak ada|tidak ditentukan|指定なし/.test(normalized)) {
    return "No preference";
  }
  if (/pagi|morning|午前中/.test(normalized)) {
    return "Morning (before 12:00)";
  }

  const hourMatches = normalized.match(/\d{1,2}/g)?.map(Number) || [];
  const matchingRange = JAPAN_DELIVERY_TIME_OPTIONS.find((option) => {
    const optionHours = option.value.match(/\d{1,2}/g)?.map(Number) || [];
    return optionHours.length >= 2
      && hourMatches[0] === optionHours[0]
      && hourMatches[1] === optionHours[1];
  });
  return matchingRange?.value || "";
}

export function inferDeliveryCountry(route?: string): DeliveryCountry {
  const normalized = String(route || "").toLocaleLowerCase("id-ID");
  const indonesiaIndex = Math.max(normalized.lastIndexOf("indonesia"), normalized.lastIndexOf("indo"));
  const japanIndex = Math.max(normalized.lastIndexOf("jepang"), normalized.lastIndexOf("japan"));

  if (indonesiaIndex >= 0 && japanIndex >= 0) {
    return japanIndex > indonesiaIndex ? "japan" : "indonesia";
  }
  if (japanIndex >= 0) return "japan";
  return "indonesia";
}

export function getIndonesiaDeliveryAddress(
  customer?: Customer | null,
): IndonesiaDeliveryAddress {
  const saved = customer?.alamatPengirimanIndonesia;
  return {
    namaPenerima: saved?.namaPenerima || "",
    alamatPenerima: saved?.alamatPenerima || "",
    kodePos: saved?.kodePos || "",
    noHp: saved?.noHp || "",
  };
}

export function getJapanDeliveryAddress(
  customer?: Customer | null,
): JapanDeliveryAddress {
  const saved = customer?.alamatPengirimanJepang;
  return {
    namaPenerima: saved?.namaPenerima || saved?.namaPenerimaRomaji || "",
    alamatPenerimaRomaji: saved?.alamatPenerimaRomaji || saved?.alamatPenerima || "",
    alamatPenerimaKanji: saved?.alamatPenerimaKanji || "",
    kodePos: normalizeJapanPostalCode(saved?.kodePos),
    noHpAktif: saved?.noHpAktif || "",
    jamPenerimaPaket: normalizeJapanDeliveryTime(saved?.jamPenerimaPaket),
  };
}

export function cleanIndonesiaDeliveryAddress(
  value: IndonesiaDeliveryAddress,
): IndonesiaDeliveryAddress {
  return {
    namaPenerima: value.namaPenerima.trim(),
    alamatPenerima: value.alamatPenerima.trim(),
    kodePos: value.kodePos.trim(),
    noHp: value.noHp.trim(),
  };
}

export function cleanJapanDeliveryAddress(
  value: JapanDeliveryAddress,
): JapanDeliveryAddress {
  return {
    namaPenerima: value.namaPenerima.trim(),
    alamatPenerimaRomaji: value.alamatPenerimaRomaji.trim(),
    alamatPenerimaKanji: value.alamatPenerimaKanji.trim(),
    kodePos: normalizeJapanPostalCode(value.kodePos),
    noHpAktif: value.noHpAktif.trim(),
    jamPenerimaPaket: normalizeJapanDeliveryTime(value.jamPenerimaPaket),
  };
}

export type JapanDeliveryAddressErrors = Partial<
  Record<
    | "namaPenerima"
    | "alamatPenerimaRomaji"
    | "alamatPenerimaKanji"
    | "kodePos"
    | "noHpAktif"
    | "jamPenerimaPaket",
    string
  >
>;

const ROMAJI_ADDRESS_PATTERN = /^[\p{Script=Latin}\p{Mark}\d\s.,'’/#()\-]+$/u;
const JAPANESE_ADDRESS_PATTERN = /^[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Latin}\p{Mark}\d\s.,'’/#()\-々〆ヵヶー・〒]+$/u;

export function validateJapanDeliveryAddress(
  value: JapanDeliveryAddress,
): JapanDeliveryAddressErrors {
  const address = cleanJapanDeliveryAddress(value);
  const errors: JapanDeliveryAddressErrors = {};

  if (!address.namaPenerima) {
    errors.namaPenerima = "Nama penerima wajib diisi.";
  }

  if (!address.alamatPenerimaRomaji) {
    errors.alamatPenerimaRomaji = "Alamat penerima Romaji wajib diisi.";
  } else if (
    !ROMAJI_ADDRESS_PATTERN.test(address.alamatPenerimaRomaji)
    || !/\p{Script=Latin}/u.test(address.alamatPenerimaRomaji)
  ) {
    errors.alamatPenerimaRomaji = "Gunakan alamat berhuruf Latin/Romaji; angka dan tanda alamat diperbolehkan.";
  }

  if (address.alamatPenerimaKanji && (
    !JAPANESE_ADDRESS_PATTERN.test(address.alamatPenerimaKanji)
    || !/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(address.alamatPenerimaKanji)
  )) {
    errors.alamatPenerimaKanji = "Gunakan aksara Jepang; angka dan tanda alamat diperbolehkan.";
  }
  if (!address.kodePos) {
    errors.kodePos = "Kode pos wajib diisi.";
  } else if (!/^\d{7}$/.test(address.kodePos)) {
    errors.kodePos = "Kode pos Jepang harus 7 angka, misalnya 123-4567.";
  }
  if (!address.noHpAktif) {
    errors.noHpAktif = "No. HP aktif wajib diisi.";
  } else {
    const phoneDigits = address.noHpAktif.replace(/\D/g, "");
    if (!/^\+?[\d\s()-]+$/.test(address.noHpAktif) || phoneDigits.length < 10 || phoneDigits.length > 12) {
      errors.noHpAktif = "Masukkan nomor telepon aktif yang valid (10–12 angka).";
    }
  }
  if (!address.jamPenerimaPaket) {
    errors.jamPenerimaPaket = "Pilih salah satu waktu penerimaan paket.";
  } else if (!JAPAN_DELIVERY_TIME_OPTIONS.some((option) => option.value === address.jamPenerimaPaket)) {
    errors.jamPenerimaPaket = "Pilihan waktu penerimaan paket tidak valid.";
  }

  return errors;
}

export function formatDeliveryAddress(
  country: "indonesia",
  address: IndonesiaDeliveryAddress,
): string;
export function formatDeliveryAddress(
  country: "japan",
  address: JapanDeliveryAddress,
): string;
export function formatDeliveryAddress(
  country: DeliveryCountry,
  address: IndonesiaDeliveryAddress | JapanDeliveryAddress,
) {
  if (country === "japan") {
    const jp = address as JapanDeliveryAddress;
    return [
      "Domestic Shipping in Japan",
      "",
      "Recipient Form",
      "",
      `•Recipient Name: ${jp.namaPenerima}`,
      `•Recipient Address (Romaji): ${jp.alamatPenerimaRomaji}`,
      `•Recipient Address (Kanji): ${jp.alamatPenerimaKanji}`,
      `•Postal Code: ${formatJapanPostalCode(jp.kodePos)}`,
      `•Active Phone Number: ${jp.noHpAktif}`,
      `•Package Receiving Time: ${jp.jamPenerimaPaket}`,
    ].join("\n");
  }

  const id = address as IndonesiaDeliveryAddress;
  return [
    "pengiriman domestik di Indonesia",
    "",
    "Form Penerima",
    "",
    `•Nama penerima: ${id.namaPenerima}`,
    `•Alamat Penerima : ${id.alamatPenerima}`,
    `•Kode pos : ${id.kodePos}`,
    `•No hp : ${id.noHp}`,
  ].join("\n");
}

export interface DeliveryAddressBatchPrintItem {
  country: DeliveryCountry;
  address: IndonesiaDeliveryAddress | JapanDeliveryAddress;
  bookingLabel: string;
}

function appendPrintField(
  document: Document,
  container: HTMLElement,
  label: string,
  value?: string,
) {
  if (!value) return;
  const row = document.createElement("div");
  row.className = "field";

  const fieldLabel = document.createElement("div");
  fieldLabel.className = "field-label";
  fieldLabel.textContent = label;

  const fieldValue = document.createElement("div");
  fieldValue.className = "field-value";
  fieldValue.textContent = value;

  row.append(fieldLabel, fieldValue);
  container.appendChild(row);
}

export function printDeliveryAddressBatch(
  items: DeliveryAddressBatchPrintItem[],
  batchTitle: string,
) {
  if (!items.length) return false;

  const popup = window.open("", "_blank", "width=1100,height=820");
  if (!popup) return false;
  popup.opener = null;

  popup.document.title = `Label Alamat - ${batchTitle}`;

  const style = popup.document.createElement("style");
  style.textContent = `
    @page { size: A4 portrait; margin: 8mm; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; color: #0f172a; font-family: Arial, Helvetica, sans-serif; }
    body { background: #eef2f7; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .sheet {
      width: 194mm;
      height: 281mm;
      margin: 8mm auto;
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      grid-template-rows: repeat(4, minmax(0, 1fr));
      gap: 2mm;
      break-after: page;
      page-break-after: always;
    }
    .sheet:last-child { break-after: auto; page-break-after: auto; }
    .label-card {
      position: relative;
      min-width: 0;
      min-height: 0;
      overflow: hidden;
      padding: 3.5mm;
      background: #fff;
      border: 0.35mm dashed #64748b;
      border-radius: 2mm;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .cut-mark {
      position: absolute;
      top: 1.2mm;
      left: 1.8mm;
      padding: 0 1mm;
      background: #fff;
      color: #64748b;
      font-size: 7pt;
      line-height: 1;
    }
    .card-topline {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 3mm;
      padding-bottom: 1.4mm;
      border-bottom: 0.25mm solid #cbd5e1;
    }
    .brand { color: #475569; font-size: 7.5pt; font-weight: 800; letter-spacing: 0.12em; }
    .booking-label {
      max-width: 56%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      border-radius: 999px;
      padding: 1mm 2mm;
      background: #0f172a;
      color: #fff;
      font-size: 7pt;
      font-weight: 800;
    }
    .country-title { margin: 1.8mm 0 1.5mm; font-size: 9pt; font-weight: 900; line-height: 1.1; }
    .fields {
      display: flex;
      flex-direction: column;
      gap: 0.9mm;
    }
    .field { min-width: 0; }
    .field-label { color: #64748b; font-size: 5.5pt; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; }
    .field-value {
      margin-top: 0.2mm;
      color: #0f172a;
      font-size: 7.7pt;
      font-weight: 700;
      line-height: 1.15;
      overflow-wrap: anywhere;
      white-space: pre-wrap;
    }
    @media print {
      body { background: #fff; }
      .sheet { margin: 0; }
    }
  `;
  popup.document.head.appendChild(style);

  for (let pageStart = 0; pageStart < items.length; pageStart += 8) {
    const sheet = popup.document.createElement("section");
    sheet.className = "sheet";

    items.slice(pageStart, pageStart + 8).forEach((item) => {
      const card = popup.document.createElement("article");
      card.className = "label-card";

      const cutMark = popup.document.createElement("span");
      cutMark.className = "cut-mark";
      cutMark.textContent = "✂ CUT";

      const topLine = popup.document.createElement("div");
      topLine.className = "card-topline";
      const brand = popup.document.createElement("span");
      brand.className = "brand";
      brand.textContent = "NIHONG DELIVERY";
      const bookingLabel = popup.document.createElement("span");
      bookingLabel.className = "booking-label";
      bookingLabel.textContent = item.bookingLabel;
      topLine.append(brand, bookingLabel);

      const title = popup.document.createElement("h2");
      title.className = "country-title";
      title.textContent = item.country === "japan"
        ? "Domestic Shipping in Japan"
        : "Pengiriman Domestik di Indonesia";

      const fields = popup.document.createElement("div");
      fields.className = `fields fields-${item.country}`;
      if (item.country === "japan") {
        const address = item.address as JapanDeliveryAddress;
        appendPrintField(popup.document, fields, "Recipient Name", address.namaPenerima);
        appendPrintField(popup.document, fields, "Recipient Address (Romaji)", address.alamatPenerimaRomaji);
        appendPrintField(popup.document, fields, "Recipient Address (Kanji)", address.alamatPenerimaKanji);
        appendPrintField(popup.document, fields, "Postal Code", formatJapanPostalCode(address.kodePos));
        appendPrintField(popup.document, fields, "Active Phone Number", address.noHpAktif);
        appendPrintField(popup.document, fields, "Package Receiving Time", address.jamPenerimaPaket);
      } else {
        const address = item.address as IndonesiaDeliveryAddress;
        appendPrintField(popup.document, fields, "Nama Penerima", address.namaPenerima);
        appendPrintField(popup.document, fields, "Alamat Penerima", address.alamatPenerima);
        appendPrintField(popup.document, fields, "Kode Pos", address.kodePos);
        appendPrintField(popup.document, fields, "No. HP", address.noHp);
      }

      card.append(cutMark, topLine, title, fields);
      sheet.appendChild(card);
    });

    popup.document.body.appendChild(sheet);
  }

  window.setTimeout(() => {
    popup.focus();
    popup.print();
  }, 250);
  return true;
}
