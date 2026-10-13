import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const templatesPageSource = await readFile(
  new URL("../src/pages/WhatsAppTemplatesPage.tsx", import.meta.url),
  "utf8",
);

const orderModalSource = await readFile(
  new URL("../src/components/OrderWhatsAppModal.tsx", import.meta.url),
  "utf8",
);

const ordersPageSource = await readFile(
  new URL("../src/pages/OrdersPage.tsx", import.meta.url),
  "utf8",
);

test("WhatsApp templates page defines all categories and required templates", () => {
  // Categories
  assert.match(templatesPageSource, /type TemplateCategory = "all" \| "ongkir" \| "pembayaran" \| "alamat" \| "aturan"/);
  assert.match(templatesPageSource, /id: "all", label: "Semua"/);
  assert.match(templatesPageSource, /id: "pembayaran", label: "Rekening & DP"/);
  assert.match(templatesPageSource, /id: "ongkir", label: "Ongkir & Tarif"/);
  assert.match(templatesPageSource, /id: "alamat", label: "Alamat & Resi"/);
  assert.match(templatesPageSource, /id: "aturan", label: "Aturan & Jadwal"/);

  // New templates
  assert.match(templatesPageSource, /id: "dp-confirmed"/);
  assert.match(templatesPageSource, /title: "Konfirmasi Penerimaan DP"/);
  assert.match(templatesPageSource, /id: "settlement-reminder"/);
  assert.match(templatesPageSource, /title: "Pengingat Pelunasan Barang Tiba"/);
  assert.match(templatesPageSource, /id: "tracking-number"/);
  assert.match(templatesPageSource, /title: "Pemberitahuan Resi Pengiriman"/);
  assert.match(templatesPageSource, /id: "last-drop-reminder"/);
  assert.match(templatesPageSource, /title: "Pengingat Batas Titip \(Last Drop\)"/);
});

test("WhatsApp templates page includes customer picker and WhatsApp bubble preview", () => {
  // Customer integration
  assert.match(templatesPageSource, /listenCustomers/);
  assert.match(templatesPageSource, /Pilih dari Data Pelanggan/);
  assert.match(templatesPageSource, /handlePickCustomer/);
  assert.match(templatesPageSource, /selectedCustomerName/);

  // Simulated WhatsApp chat bubble
  assert.match(templatesPageSource, /function WhatsAppBubblePreview/);
  assert.match(templatesPageSource, /Preview Balon WA/);
  assert.match(templatesPageSource, /bg-\[\#DCF8C6\]/); // WhatsApp light green bubble
  assert.match(templatesPageSource, /CheckCheck/); // WhatsApp double checkmark
});

test("OrderWhatsAppModal exists and is wired into MobileOrderCard and OrdersPage", () => {
  // OrderWhatsAppModal features
  assert.match(orderModalSource, /export function OrderWhatsAppModal/);
  assert.match(orderModalSource, /normalizeWhatsAppPhone/);
  assert.match(orderModalSource, /Tagihan DP 50%/);
  assert.match(orderModalSource, /Barang Tiba & Pelunasan/);
  assert.match(orderModalSource, /Resi Pengiriman/);
  assert.match(orderModalSource, /https:\/\/wa\.me/);

  // OrdersPage wiring
  assert.match(ordersPageSource, /<OrderWhatsAppModal/);
  assert.match(ordersPageSource, /onWhatsApp=\{\(\) => setWhatsAppModalOrder\(o\)\}/);
  assert.match(ordersPageSource, /onWhatsApp: \(\) => void/);
  assert.match(ordersPageSource, /title="Kirim Pesan WhatsApp"/);
});
