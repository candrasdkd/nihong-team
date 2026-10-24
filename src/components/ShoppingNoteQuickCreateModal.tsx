import { useState } from "react";
import { getCustomersPage } from "../services/customersFirebase";
import { SHOPPING_NOTE_CATEGORIES, SHOPPING_NOTE_UNITS } from "../constants/shoppingNotes";
import type { Customer } from "../types";
import type { ShoppingNoteCustomer, ShoppingNotePayload } from "../services/shoppingNotesFirebase";
import { Button } from "./ui/Button";
import { Modal } from "./ui/Modal";

const TEMPLATE_ROWS = [
  ["Kategori", "Pelanggan", "Nama Barang", "Jumlah", "Satuan", "Harga"],
  ["Makanan", "-", "Sari Gandum Sandwich", "2", "pcs", "44000"],
  ["Minuman", "-", "Good Day Freeze", "2", "renceng", "46000"],
];
const TEMPLATE_TEXT = TEMPLATE_ROWS.map((row) => row.join("\t")).join("\n");

interface ShoppingNoteQuickCreateModalProps {
  onClose: () => void;
  onSubmit: (payloads: ShoppingNotePayload[]) => Promise<void>;
}

interface PasteRow {
  rowNumber: number;
  kategoriPemilik: string;
  namaPelanggan: string;
  namaBarang: string;
  jumlah: number;
  satuan: string;
  harga: number;
}

function splitColumns(line: string): string[] {
  return (line.includes("\t") ? line.split("\t") : line.split("|"))
    .map((cell) => cell.trim());
}

function matchOption(value: string, options: readonly string[]): string | undefined {
  return options.find((option) => option.toLocaleLowerCase("id-ID") === value.trim().toLocaleLowerCase("id-ID"));
}

function parseAmount(value: string, allowBlank = false): number | undefined {
  const trimmed = value.trim();
  if (allowBlank && (!trimmed || trimmed === "-")) return 0;
  const normalized = trimmed.replace(/^rp\s*/i, "").replace(/[.\s,]/g, "");
  if (!normalized && allowBlank) return 0;
  if (!/^\d+(?:\.\d+)?$/.test(normalized)) return undefined;
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : undefined;
}

function parsePaste(text: string): { rows: PasteRow[]; errors: string[] } {
  const rows: PasteRow[] = [];
  const errors: string[] = [];
  const lines = text.split(/\r?\n/);

  lines.forEach((line, index) => {
    if (!line.trim()) return;
    const cells = splitColumns(line);
    if (index === 0 && cells[0]?.toLocaleLowerCase("id-ID") === "kategori") {
      const expected = ["kategori", "pelanggan", "nama barang", "jumlah", "satuan", "harga"];
      if (!expected.every((label, cellIndex) => cells[cellIndex]?.toLocaleLowerCase("id-ID") === label)) {
        errors.push(`Baris ${index + 1}: judul kolom belum sesuai template.`);
      }
      return;
    }
    if (cells.every((cell) => !cell)) return;

    // Five columns are also accepted when the Pelanggan column is omitted.
    const [category, customer, item, quantity, unit, price] = cells.length === 5
      ? [cells[0], "", cells[1], cells[2], cells[3], cells[4]]
      : cells;
    const rowNumber = index + 1;

    if (cells.length !== 5 && cells.length !== 6) {
      errors.push(`Baris ${rowNumber}: isi 5 kolom tanpa pelanggan atau 6 kolom dengan pelanggan.`);
      return;
    }
    const kategoriPemilik = matchOption(category ?? "", SHOPPING_NOTE_CATEGORIES);
    const satuan = matchOption(unit ?? "", SHOPPING_NOTE_UNITS);
    const parsedQuantity = parseAmount(quantity ?? "");
    const parsedPrice = parseAmount(price ?? "", true);
    if (!kategoriPemilik) errors.push(`Baris ${rowNumber}: kategori harus Makanan, Minuman, Kosmetik, Obat, atau Fashion.`);
    if (!(item ?? "").trim()) errors.push(`Baris ${rowNumber}: nama barang wajib diisi.`);
    if (parsedQuantity === undefined || parsedQuantity <= 0) errors.push(`Baris ${rowNumber}: jumlah harus angka lebih dari 0.`);
    if (!satuan) errors.push(`Baris ${rowNumber}: satuan harus renceng, pcs, atau slop.`);
    if (parsedPrice === undefined) errors.push(`Baris ${rowNumber}: harga harus angka; boleh dikosongkan.`);

    if (kategoriPemilik && (item ?? "").trim() && parsedQuantity !== undefined && parsedQuantity > 0 && satuan && parsedPrice !== undefined) {
      rows.push({
        rowNumber,
        kategoriPemilik,
        namaPelanggan: customer === "-" ? "" : (customer ?? "").trim(),
        namaBarang: (item ?? "").trim(),
        jumlah: parsedQuantity,
        satuan,
        harga: parsedPrice,
      });
    }
  });

  if (rows.length > 450) errors.push("Maksimal 450 barang dalam satu kali tempel.");
  return { rows, errors };
}

async function findCustomerByName(name: string): Promise<ShoppingNoteCustomer | null> {
  const wantedName = name.trim().toLocaleLowerCase("id-ID");
  let cursor;
  let hasMore = true;
  while (hasMore) {
    const page = await getCustomersPage({ pageSize: 15, search: name, cursor });
    const customer = page.rows.find((row: Customer) => row.nama.trim().toLocaleLowerCase("id-ID") === wantedName);
    if (customer?.id) return { id: customer.id, nama: customer.nama };
    if (!page.hasMore || !page.cursor) break;
    cursor = page.cursor;
  }
  return null;
}

async function resolveCustomers(names: string[]): Promise<Map<string, ShoppingNoteCustomer | null>> {
  const uniqueNames = [...new Set(names.map((name) => name.trim()).filter(Boolean))];
  const results = new Map<string, ShoppingNoteCustomer | null>();
  let nextIndex = 0;
  const workerCount = Math.min(4, uniqueNames.length);
  await Promise.all(Array.from({ length: workerCount }, async () => {
    while (nextIndex < uniqueNames.length) {
      const name = uniqueNames[nextIndex++];
      try {
        results.set(name.toLocaleLowerCase("id-ID"), await findCustomerByName(name));
      } catch {
        // Keep manually entered names usable even when no customer record can be resolved.
        results.set(name.toLocaleLowerCase("id-ID"), null);
      }
    }
  }));
  return results;
}

export function ShoppingNoteQuickCreateModal({ onClose, onSubmit }: ShoppingNoteQuickCreateModalProps) {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [message, setMessage] = useState("");

  async function saveList() {
    setErrors([]);
    setMessage("");
    const parsed = parsePaste(text);
    if (parsed.errors.length) {
      setErrors(parsed.errors.slice(0, 8));
      if (parsed.errors.length > 8) setMessage(`Ada ${parsed.errors.length - 8} kesalahan lainnya.`);
      return;
    }
    if (!parsed.rows.length) {
      setMessage("Tempel daftar barang dulu.");
      return;
    }

    setSaving(true);
    try {
      const customerMap = await resolveCustomers(parsed.rows.map((row) => row.namaPelanggan));
      const payloads: ShoppingNotePayload[] = parsed.rows.map((row) => ({
        kategoriPemilik: row.kategoriPemilik,
        pelanggan: row.namaPelanggan
          ? customerMap.get(row.namaPelanggan.toLocaleLowerCase("id-ID")) ?? { nama: row.namaPelanggan }
          : null,
        namaBarang: row.namaBarang,
        jumlah: row.jumlah,
        satuan: row.satuan,
        harga: row.harga,
        status: "Belum",
        aktif: true,
        catatan: "",
      }));
      await onSubmit(payloads);
      onClose();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Daftar barang gagal disimpan.");
    } finally {
      setSaving(false);
    }
  }

  async function copyTemplate() {
    try {
      await navigator.clipboard.writeText(TEMPLATE_TEXT);
      setMessage("Template disalin. Tempel ke kolom di bawah.");
    } catch {
      setMessage("Salin format ini: Kategori | Pelanggan | Nama Barang | Jumlah | Satuan | Harga.");
    }
  }

  return (
    <Modal
      title="Tempel Daftar Belanja"
      onClose={onClose}
      size="2xl"
      contentClassName="space-y-4"
      footer={(
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onClose}>Tutup</Button>
          <Button onClick={saveList} isLoading={saving}>Simpan Daftar</Button>
        </div>
      )}
    >
      <div className="space-y-2 text-sm text-slate-600">
        <p>Salin tabel dari spreadsheet, lalu tempel di sini. Satu baris untuk satu barang.</p>
        <p className="rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">
          Urutan kolom: <strong>Kategori · Pelanggan · Nama Barang · Jumlah · Satuan · Harga</strong><br />
          Pelanggan boleh “-” atau kosong; nama yang belum ada di daftar tetap disimpan sesuai yang ditempel. Harga boleh kosong atau “-”. Status otomatis “Belum”. Kategori: Makanan, Minuman, Kosmetik, Obat, Fashion. Satuan: renceng, pcs, slop, botol, bungkus, pack/pcs, box.
        </p>
        <button type="button" onClick={copyTemplate} className="min-h-[44px] text-sm font-semibold text-brand-navy underline underline-offset-2">
          Salin contoh tabel
        </button>
      </div>

      <textarea
        value={text}
        onChange={(event) => { setText(event.target.value); setErrors([]); setMessage(""); }}
        placeholder={TEMPLATE_TEXT}
        aria-label="Tempel tabel catatan belanja"
        spellCheck={false}
        className="min-h-[220px] w-full resize-y rounded-xl border border-surface-border bg-white p-3 font-mono text-base leading-6 text-slate-800 outline-none placeholder:text-slate-400 focus:border-brand-navy focus:ring-2 focus:ring-brand-navy/20 sm:min-h-[280px]"
      />

      {errors.length > 0 && (
        <div role="alert" className="space-y-1 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {errors.map((error) => <p key={error}>{error}</p>)}
        </div>
      )}
      {message && <p role="status" className="text-sm font-medium text-slate-600">{message}</p>}
    </Modal>
  );
}
