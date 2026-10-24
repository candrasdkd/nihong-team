import { useState } from "react";
import { AlertCircle, ShoppingBasket } from "lucide-react";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { Modal } from "./ui/Modal";
import { RupiahInput } from "./ui/RupiahInput";
import { ShoppingNoteCustomerPickerModal } from "./ShoppingNoteCustomerPickerModal";
import type { ShoppingNote, ShoppingNoteCustomer, ShoppingNotePayload } from "../services/shoppingNotesFirebase";
import { SHOPPING_NOTE_CATEGORIES, SHOPPING_NOTE_UNITS } from "../constants/shoppingNotes";
import type { Customer } from "../types";

const EMPTY_NOTE: ShoppingNotePayload = {
  kategoriPemilik: SHOPPING_NOTE_CATEGORIES[0],
  pelanggan: null,
  namaBarang: "",
  jumlah: 1,
  satuan: "pcs",
  harga: 0,
  status: "Belum",
  aktif: true,
  catatan: "",
};

export function ShoppingNoteFormModal({
  initial,
  onClose,
  onSubmit,
}: {
  initial?: ShoppingNote | null;
  onClose: () => void;
  onSubmit: (payload: ShoppingNotePayload) => Promise<void>;
}) {
  const [form, setForm] = useState<ShoppingNotePayload>(initial ? {
    kategoriPemilik: initial.kategoriPemilik,
    pelanggan: initial.pelanggan,
    namaBarang: initial.namaBarang,
    jumlah: initial.jumlah,
    satuan: initial.satuan,
    harga: initial.harga,
    status: initial.status,
    aktif: initial.aktif,
    catatan: initial.catatan,
  } : { ...EMPTY_NOTE });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [customerPickerOpen, setCustomerPickerOpen] = useState(false);

  const change = <K extends keyof ShoppingNotePayload>(field: K, value: ShoppingNotePayload[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  function chooseCustomer(customer: Customer | null) {
    const selected: ShoppingNoteCustomer | null = customer?.id
      ? { id: customer.id, nama: customer.nama }
      : null;
    change("pelanggan", selected);
    setCustomerPickerOpen(false);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      await onSubmit(form);
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Catatan belanja gagal disimpan.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
    <Modal
      title={initial ? "Edit Catatan Belanja" : "Tambah Catatan Belanja"}
      onClose={saving ? () => undefined : onClose}
      size="lg"
      footer={(
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Batal
          </Button>
          <Button type="submit" form="shopping-note-form" isLoading={saving}>
            {initial ? "Simpan Perubahan" : "Simpan Catatan"}
          </Button>
        </div>
      )}
    >
      <form id="shopping-note-form" onSubmit={submit} className="space-y-4">
        {error && (
          <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="rounded-2xl border border-brand-orange/15 bg-brand-cream/60 p-3.5">
          <div className="mb-3 flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-brand-navyDark">
            <ShoppingBasket className="h-4 w-4 text-brand-orange" />
            Detail barang
          </div>
          <div className="space-y-3">
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-slate-700">Kategori *</span>
              <select
                value={form.kategoriPemilik}
                onChange={(event) => change("kategoriPemilik", event.target.value)}
                required
                disabled={saving}
                className="block min-h-[44px] w-full rounded-input border border-surface-border bg-surface-card px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-brand-navy focus:ring-2 focus:ring-brand-navy/20"
              >
                {!SHOPPING_NOTE_CATEGORIES.includes(form.kategoriPemilik as typeof SHOPPING_NOTE_CATEGORIES[number]) && (
                  <option value={form.kategoriPemilik}>Nilai saat ini: {form.kategoriPemilik}</option>
                )}
                {SHOPPING_NOTE_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-slate-700">Pelanggan (opsional)</span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCustomerPickerOpen(true)}
                  disabled={saving}
                  className="min-h-[44px] flex-1 justify-start truncate text-left"
                >
                  {form.pelanggan?.nama || "Pilih pelanggan"}
                </Button>
                {form.pelanggan && (
                  <Button type="button" variant="ghost" onClick={() => change("pelanggan", null)} disabled={saving}>
                    Hapus
                  </Button>
                )}
              </div>
            </label>

            <Input
              label="Nama Barang *"
              value={form.namaBarang}
              onChange={(event) => change("namaBarang", event.target.value)}
              placeholder="Contoh: Sari Gandum Sandwich"
              required
              disabled={saving}
              autoFocus
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Jumlah *"
                type="number"
                inputMode="decimal"
                min="0.01"
                step="any"
                value={form.jumlah || ""}
                onChange={(event) => change("jumlah", Number(event.target.value))}
                required
                disabled={saving}
              />
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-slate-700">Satuan *</span>
                <select
                  value={form.satuan}
                  onChange={(event) => change("satuan", event.target.value)}
                  required
                  disabled={saving}
                  className="block min-h-[44px] w-full rounded-input border border-surface-border bg-surface-card px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-brand-navy focus:ring-2 focus:ring-brand-navy/20"
                >
                  {!SHOPPING_NOTE_UNITS.includes(form.satuan as typeof SHOPPING_NOTE_UNITS[number]) && (
                    <option value={form.satuan}>Nilai saat ini: {form.satuan}</option>
                  )}
                  {SHOPPING_NOTE_UNITS.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
                </select>
              </label>
            </div>

            <RupiahInput
              label="Harga"
              value={form.harga}
              onChange={(harga) => change("harga", harga)}
              placeholder="Rp 0"
              disabled={saving}
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-slate-700">Status belanja</span>
            <select
              value={form.status}
              onChange={(event) => change("status", event.target.value as ShoppingNotePayload["status"])}
              disabled={saving}
              className="block min-h-[44px] w-full rounded-input border border-surface-border bg-surface-card px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-brand-navy focus:ring-2 focus:ring-brand-navy/20"
            >
              <option value="Belum">Belum dibeli</option>
              <option value="Selesai">Selesai</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-slate-700">Catatan</span>
            <textarea
              value={form.catatan}
              onChange={(event) => change("catatan", event.target.value)}
              placeholder="Warna, ukuran, atau info tambahan"
              disabled={saving}
              rows={2}
              className="block min-h-[44px] w-full resize-y rounded-input border border-surface-border bg-surface-card px-3.5 py-2.5 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-brand-navy focus:ring-2 focus:ring-brand-navy/20"
            />
          </label>
        </div>
      </form>
    </Modal>
    {customerPickerOpen && (
      <ShoppingNoteCustomerPickerModal
        selectedCustomerId={form.pelanggan?.id}
        onClose={() => setCustomerPickerOpen(false)}
        onSelect={chooseCustomer}
      />
    )}
    </>
  );
}
