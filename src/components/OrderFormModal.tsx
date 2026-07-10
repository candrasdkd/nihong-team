import React, { useMemo, useState } from "react";
import { Customer, Order } from "../types";
import { todayStr } from "../utils/helpers";
import { Input } from "./ui/Input";
import { Button } from "./ui/Button";
import { Modal } from "./ui/Modal";
import { formatCurrency } from "../utils/format";
import SearchableSelect from "./ui/SearchableSelect";
import { Select } from "./ui/Select";
import { RupiahInput } from "./ui/RupiahInput";
import { FlagID, FlagJP } from "./ui/Flags";
import { ORDER_STATUSES } from "../utils/constants";
import {
  ImageIcon,
  Loader2,
  X,
  Upload,
  Coins,
  TrendingUp,
  Package,
  User,
  Scale,
  AlertCircle,
  Sparkles,
  Trash2,
  FileText,
  Info,
  Plus,
} from "lucide-react";
import { compressImage } from "../utils/image";
import { addCustomer } from "../services/customersFirebase";
import { CustomerFormModal } from "./CustomerFormModal";

const toStr = (v: number) => (Number.isFinite(v) ? String(v) : "");
const num = (v: any) => {
  const n = parseFloat(String(v));
  return Number.isFinite(n) ? n : 0;
};

export function OrderFormModal({
  customers,
  initial,
  onClose,
  onSubmit,
  existing,
  unitPrice,
}: {
  customers: Customer[];
  initial?: Order;
  onClose: () => void;
  onSubmit: (order: Order) => void | Promise<void>;
  existing: Order[];
  unitPrice: number;
}) {
  const [loading, setLoading] = useState(false);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [tempCustomerName, setTempCustomerName] = useState("");

  // Status and Style Helpers for Inputs
  const renderLabel = (text: string, value?: any, isRequired: boolean = false) => {
    return (
      <div className="flex justify-between items-center mb-1.5 select-none">
        <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
          <span>{text}</span>
          {isRequired && <span className="text-rose-500 font-extrabold">*</span>}
        </span>
      </div>
    );
  };

  const getInputClass = (value: any, isRequired: boolean = false, extraClasses: string = "") => {
    const borderStyle = "border-slate-200 hover:border-slate-350 focus:border-indigo-500";
    const backgroundStyle = "bg-white text-slate-800 shadow-2xs";
    const focusStyle = "focus:ring-4 focus:ring-indigo-500/10 focus:outline-hidden";

    return `w-full rounded-xl transition-all duration-300 py-2.5 px-3 border text-sm ${borderStyle} ${backgroundStyle} ${focusStyle} ${extraClasses}`;
  };

  // State Mata Uang
  const [currency, setCurrency] = useState<"IDR" | "JPY">(
    (initial as any)?.currency || (initial as any)?.tipeNominal || "IDR"
  );

  // State Form Utama
  const [no] = useState(initial?.no || `ORD-${new Date().getTime()}`);
  const [tanggal, setTanggal] = useState(initial?.tanggal || todayStr());
  const [namaPelanggan, setNamaPelanggan] = useState(initial?.namaPelanggan || "");
  const [jumlahKg, setJumlahKg] = useState<number>(initial?.jumlahKg || 1);
  const [pengiriman, setPengiriman] = useState<string>(
    (initial as any)?.pengiriman || "INDO - JEPANG"
  );

  const [routeOption, setRouteOption] = useState<"INDO - JEPANG" | "JEPANG - INDO" | "Lainnya">(() => {
    const val = (initial as any)?.pengiriman || "INDO - JEPANG";
    if (val === "INDO - JEPANG" || val === "JEPANG - INDO") {
      return val;
    }
    return "Lainnya";
  });

  const handleRouteChange = (option: "INDO - JEPANG" | "JEPANG - INDO" | "Lainnya") => {
    setRouteOption(option);
    if (option === "Lainnya") {
      if (pengiriman === "INDO - JEPANG" || pengiriman === "JEPANG - INDO") {
        setPengiriman("");
      }
    } else {
      setPengiriman(option);
    }
  };

  const [catatan, setCatatan] = useState<string>((initial as any)?.catatan || "");
  const [status, setStatus] = useState<string>(
    (initial?.status as any) || "Belum Membayar"
  );
  const [imageUrls, setImageUrls] = useState<string[]>(
    Array.isArray((initial as any)?.imageUrl)
      ? (initial as any).imageUrl
      : (initial as any)?.imageUrl
        ? [(initial as any).imageUrl]
        : []
  );
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // State Harga
  const [hargaJastipManual, setHargaJastipManual] = useState<number>(
    Number((initial as any)?.hargaJastipManual ?? (initial as any)?.hargaJastip ?? 0)
  );
  const [hargaJastipMarkup, setHargaJastipMarkup] = useState<number>(
    Number((initial as any)?.hargaJastipMarkup ?? 0)
  );
  const [hargaOngkir, setHargaOngkir] = useState<number>(
    (initial as any)?.hargaOngkir ?? 0
  );
  const [hargaOngkirMarkup, setHargaOngkirMarkup] = useState<number>(
    Number((initial as any)?.hargaOngkirMarkup ?? 0)
  );

  // Multiple Item Names State
  const [namaBarangList, setNamaBarangList] = useState<string[]>(() => {
    if (initial?.namaBarang) {
      return initial.namaBarang.split(", ").map((s) => s.trim());
    }
    return [""];
  });
  const [autoFocusIndex, setAutoFocusIndex] = useState<number | null>(null);

  // Item name helper methods
  const handleNameChange = (idx: number, val: string) => {
    setNamaBarangList((prev) => prev.map((item, i) => (i === idx ? val : item)));
  };

  const addNameField = () => {
    setNamaBarangList((prev) => [...prev, ""]);
  };

  const removeNameField = (idx: number) => {
    setNamaBarangList((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (namaBarangList[idx].trim()) {
        addNameField();
        setAutoFocusIndex(namaBarangList.length);
      }
    }
  };

  // Memoized Calculations
  const baseOngkir = useMemo(() => Number(hargaOngkir) || 0, [hargaOngkir]);
  const ceilKg = useMemo(() => Math.ceil(Number(jumlahKg || 0) * 2) / 2, [jumlahKg]);

  const totalPembayaran = useMemo(
    () => (Number(hargaJastipMarkup) || 0) + (Number(hargaOngkirMarkup) || 0),
    [hargaJastipMarkup, hargaOngkirMarkup]
  );

  const totalKeuntungan = useMemo(
    () =>
      (Number(hargaJastipMarkup) || 0) +
      (Number(hargaOngkirMarkup) || 0) -
      (Number(hargaJastipManual) || 0) -
      (Number(baseOngkir) || 0),
    [hargaJastipMarkup, hargaOngkirMarkup, hargaJastipManual, baseOngkir]
  );

  const profitNegative = useMemo(
    () => Number.isFinite(totalKeuntungan) && totalKeuntungan < 0,
    [totalKeuntungan]
  );

  const customerEmpty = useMemo(
    () => !String(namaPelanggan || "").trim(),
    [namaPelanggan]
  );

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const compressedBlob = await compressImage(file);
      const cloudName = (import.meta as any).env.VITE_CLOUDINARY_CLOUD_NAME;
      const uploadPreset = (import.meta as any).env.VITE_CLOUDINARY_UPLOAD_PRESET;

      if (!cloudName || !uploadPreset || cloudName === "your_cloud_name") {
        alert("Konfigurasi Cloudinary belum lengkap di .env");
        return;
      }

      const formData = new FormData();
      formData.append("file", compressedBlob, file.name);
      formData.append("upload_preset", uploadPreset);

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        {
          method: "POST",
          body: formData,
        }
      );
      const data = await res.json();
      if (data.secure_url) {
        setImageUrls((prev) => [...prev, data.secure_url]);
      } else if (data.error) {
        alert(`Cloudinary Error: ${data.error.message}`);
      }
    } catch (err) {
      console.error("Upload error:", err);
      alert("Gagal mengunggah gambar. Pastikan setting Cloudinary di .env sudah benar.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddCustomer = async (initialName: string) => {
    setTempCustomerName(initialName);
    setCustomerModalOpen(true);
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    if (customerEmpty) {
      alert("Nama Pelanggan wajib diisi.");
      return;
    }

    const filteredNames = namaBarangList.map((n) => n.trim()).filter((n) => n !== "");
    if (filteredNames.length === 0) {
      alert("Nama Barang wajib diisi minimal satu.");
      return;
    }

    setLoading(true);
    try {
      const combinedNamaBarang = filteredNames.join(", ");

      const payload: any = {
        id: initial?.id || crypto.randomUUID(),
        no,
        namaBarang: combinedNamaBarang,
        kategori: "",
        tanggal,
        namaPelanggan,
        jumlahKg: num(jumlahKg),
        totalHarga: baseOngkir,
        status,
        pengiriman: pengiriman || "",
        catatan: catatan || "",
        hargaJastip: num(hargaJastipManual),
        hargaJastipMarkup: num(hargaJastipMarkup),
        hargaOngkir: num(baseOngkir),
        hargaOngkirMarkup: num(hargaOngkirMarkup),
        totalKeuntungan,
        totalPembayaran,
        kgCeil: ceilKg,
        tipeNominal: currency,
        imageUrl: imageUrls,
        _computed: { unitPriceAtSave: unitPrice },
      };
      await Promise.resolve(onSubmit(payload as Order));
    } catch (err: any) {
      alert(`Gagal menyimpan: ${err?.message || err}`);
    } finally {
      setLoading(false);
    }
  }

  const customerOptions = useMemo(() => {
    const sorted = [...customers].sort((a, b) => a.nama.localeCompare(b.nama));
    return sorted.map((c) => {
      const parts = [];
      if (c.telpon) parts.push(c.telpon);
      if (c.alamat) parts.push(c.alamat);
      return {
        label: c.nama,
        value: c.nama,
        sublabel: parts.length > 0 ? parts.join(" • ") : undefined,
      };
    });
  }, [customers]);

  return (
    <Modal
      onClose={loading ? () => {} : onClose}
      title={initial ? "Edit Pesanan" : "Tambah Pesanan"}
      size="5xl"
      contentClassName="w-full bg-slate-50/30"
      footer={
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 w-full">
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-semibold self-start sm:self-auto select-none">
            <Info size={11} className="text-slate-400" />
            <span>Wajib mengisi semua kolom bertanda bintang (*)</span>
          </div>

          <div className="flex justify-end gap-2.5 w-full sm:w-auto">
            <Button
              variant="ghost"
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 rounded-xl h-11 text-xs font-bold"
            >
              Batal
            </Button>
            <Button
              type="submit"
              form="order-form"
              disabled={loading || profitNegative || customerEmpty}
              className={`px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl shadow-md shadow-orange-200 flex items-center gap-2 font-bold transition-all active:scale-[0.98] h-11 text-xs ${
                loading || profitNegative || customerEmpty ? "opacity-40 cursor-not-allowed shadow-none" : ""
              }`}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Sparkles size={15} />
                  <span>{initial ? "Simpan Perubahan" : "Simpan Pesanan"}</span>
                </>
              )}
            </Button>
          </div>
        </div>
      }
    >
      {/* HEADER INFO & CURRENCY SWITCHER */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 pb-4 border-b border-slate-100 mb-6">
        <div className="bg-slate-100/60 border border-slate-200/50 px-4 py-2.5 rounded-2xl flex items-center gap-3 w-fit select-none">
          <div className="p-1.5 bg-slate-200/80 text-slate-500 rounded-lg shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">No. Registrasi Pesanan</p>
              <span className="text-[8px] font-black text-slate-500 bg-slate-250 border border-slate-300 px-1.5 py-0.5 rounded-md uppercase tracking-wider leading-none">
                🔒 OTOMATIS / LOCKED
              </span>
            </div>
            <span className="text-sm font-black text-slate-700 tracking-tight block mt-0.5">
              {no}
            </span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 tracking-wider uppercase mb-1.5 text-left sm:text-right">
            Mata Uang Transaksi
          </label>
          <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200/50 w-fit">
            <button
              type="button"
              onClick={() => setCurrency("IDR")}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                currency === "IDR"
                  ? "bg-white text-orange-600 shadow-sm border border-orange-100"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <FlagID />
              <span>IDR (Rp)</span>
            </button>
            <button
              type="button"
              onClick={() => setCurrency("JPY")}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                currency === "JPY"
                  ? "bg-white text-rose-600 shadow-sm border border-rose-100"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <FlagJP />
              <span>JPY (¥)</span>
            </button>
          </div>
        </div>
      </div>

      <form id="order-form" onSubmit={submit} className="space-y-6">
          <fieldset disabled={loading} className={`space-y-6 ${loading ? "opacity-70" : ""}`}>
            
            {/* GRID SECTIONS A & B */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* SECTION 1: INFORMASI PRODUK / NAMA BARANG */}
              <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-1">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-orange-50 text-orange-600 rounded-lg">
                      <Package size={18} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">Nama Barang Belanjaan</h4>
                      <p className="text-[10px] text-slate-400">Input satu atau beberapa nama barang</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={addNameField}
                    className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50/50 hover:bg-blue-50 border border-blue-200/50 px-2 py-1 rounded-lg transition-all"
                  >
                    <Plus size={11} strokeWidth="3" />
                    <span>Baris Baru</span>
                  </button>
                </div>

                <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                  {namaBarangList.map((name, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="flex-1">
                        <Input
                          value={name}
                          onChange={(e) => handleNameChange(index, e.target.value)}
                          onKeyDown={(e) => handleNameKeyDown(e, index)}
                          autoFocus={index === autoFocusIndex}
                          required
                          placeholder={`Nama barang #${index + 1}...`}
                          className={getInputClass(name, true)}
                        />
                      </div>
                      {namaBarangList.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeNameField(index)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors shrink-0"
                          title="Hapus baris"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-slate-100">
                  {renderLabel("Status Pesanan", status, true)}
                  <div className="flex gap-2.5">
                    <div className="flex-1">
                      <Select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className={getInputClass(status, true)}
                      >
                        {ORDER_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s === "Belum Membayar" ? "Belum Bayar" : s}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div className={`px-4 py-2 text-xs font-bold rounded-xl border flex items-center justify-center shadow-sm transition-all shrink-0 select-none ${
                      status === "Selesai"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200/60"
                        : "bg-amber-50 text-amber-700 border-amber-200/60"
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${status === "Selesai" ? "bg-emerald-500" : "bg-amber-500 animate-pulse"}`}></span>
                      {status === "Belum Membayar" ? "Belum Bayar" : status}
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 2: DETAIL PELANGGAN & DISTRIBUSI */}
              <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-1">
                  <div className="p-1.5 bg-brand-navyDark/10 text-brand-navyDark rounded-lg">
                    <User size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">Pelanggan & Distribusi</h4>
                    <p className="text-[10px] text-slate-400">Identitas pelanggan & jadwal pengiriman</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    {renderLabel("Nama Pelanggan", namaPelanggan, true)}
                    <SearchableSelect
                      value={namaPelanggan}
                      onChange={setNamaPelanggan}
                      options={customerOptions}
                      disabled={loading}
                      onAddOption={handleAddCustomer}
                      placeholder="Cari atau pilih pelanggan..."
                      buttonClassName={getInputClass(namaPelanggan, true)}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      {renderLabel("Tanggal Pesanan", tanggal, true)}
                      <Input
                        type="date"
                        value={tanggal}
                        onChange={(e) => setTanggal(e.target.value)}
                        required
                        className={getInputClass(tanggal, true)}
                      />
                    </div>

                    <div>
                      {renderLabel("Berat (Kg)", jumlahKg, true)}
                      <div className="relative">
                        <Input
                          type="number"
                          step="0.01"
                          value={toStr(jumlahKg)}
                          onChange={(e) => setJumlahKg(num(e.target.value))}
                          required
                          placeholder="0.0"
                          className={`${getInputClass(jumlahKg, true)} pr-20`}
                        />
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] bg-gradient-to-r from-blue-50 to-indigo-50 text-indigo-700 px-2 py-0.5 rounded-lg font-bold border border-indigo-100 flex items-center gap-1 shadow-sm select-none">
                          <Scale size={9} /> Dibulatkan: {ceilKg} kg
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    {renderLabel("Rute / Lokasi Pengiriman", pengiriman, false)}
                    <div className="flex p-1 bg-slate-150/70 dark:bg-slate-800 rounded-2xl border border-slate-200/50 w-full gap-1 mb-2">
                      <button
                        type="button"
                        onClick={() => handleRouteChange("INDO - JEPANG")}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                          routeOption === "INDO - JEPANG"
                            ? "bg-white text-indigo-600 shadow-sm border border-indigo-150/60"
                            : "text-slate-500 hover:text-slate-800 hover:bg-white/40"
                        }`}
                      >
                        INDO - JEPANG
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRouteChange("JEPANG - INDO")}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                          routeOption === "JEPANG - INDO"
                            ? "bg-white text-indigo-600 shadow-sm border border-indigo-150/60"
                            : "text-slate-500 hover:text-slate-800 hover:bg-white/40"
                        }`}
                      >
                        JEPANG - INDO
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRouteChange("Lainnya")}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                          routeOption === "Lainnya"
                        ? "bg-white text-indigo-600 shadow-sm border border-indigo-150/60"
                        : "text-slate-500 hover:text-slate-800 hover:bg-white/40"
                    }`}
                  >
                    Lainnya
                  </button>
                </div>
                {routeOption === "Lainnya" && (
                  <div className="transition-all duration-300">
                    <Input
                      value={pengiriman}
                      onChange={(e) => setPengiriman(e.target.value)}
                      placeholder="Masukkan rute pengiriman khusus (misal: SINGAPURA - INDO)..."
                      className={getInputClass(pengiriman, false)}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>

            {/* SECTION 3: Rincian Keuangan & Markup Harga */}
            <div className="border rounded-2xl bg-white shadow-sm overflow-hidden transition-all border-slate-200/80">
              <div className="h-1.5 w-full bg-slate-800"></div>

              <div className="p-5 sm:p-6 space-y-6">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <div className="p-1.5 rounded-lg bg-slate-100 text-slate-600">
                    <Coins size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">Rincian Keuangan & Markup Harga</h4>
                    <p className="text-[10px] text-slate-400">
                      Kelola harga modal jastip/ongkir dan harga markup yang ditagih ke pelanggan ({currency})
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* JASTIP BOX */}
                  <div className="p-4 rounded-2xl border bg-slate-50/50 border-slate-150 space-y-4">
                    <h5 className="text-xs font-extrabold text-slate-700 tracking-wide uppercase flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-slate-600"></span>
                      Biaya Jasa Titip (Jastip)
                    </h5>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        {renderLabel("Jastip Asli (Modal)", hargaJastipManual, false)}
                        <RupiahInput
                          currency={currency}
                          label=""
                          value={hargaJastipManual}
                          onChange={setHargaJastipManual}
                          placeholder={currency === "JPY" ? "¥ 0" : "Rp 0"}
                          className={getInputClass(hargaJastipManual)}
                        />
                      </div>
                      <div>
                        {renderLabel("Jastip Nihong (Jual)", hargaJastipMarkup, false)}
                        <RupiahInput
                          currency={currency}
                          label=""
                          value={hargaJastipMarkup}
                          onChange={setHargaJastipMarkup}
                          placeholder={currency === "JPY" ? "¥ 0" : "Rp 0"}
                          className={getInputClass(hargaJastipMarkup)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* SHIPPING / ONGKIR BOX */}
                  <div className="p-4 rounded-2xl border bg-slate-50/50 border-slate-150 space-y-4">
                    <h5 className="text-xs font-extrabold text-slate-700 tracking-wide uppercase flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-slate-600"></span>
                      Biaya Ongkos Kirim (Shipping)
                    </h5>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        {renderLabel("Ongkir Asli (Modal)", hargaOngkir, false)}
                        <RupiahInput
                          currency={currency}
                          label=""
                          value={hargaOngkir}
                          onChange={setHargaOngkir}
                          placeholder={currency === "JPY" ? "¥ 0" : "Rp 0"}
                          className={getInputClass(hargaOngkir)}
                        />
                      </div>
                      <div>
                        {renderLabel("Ongkir Nihong (Jual)", hargaOngkirMarkup, false)}
                        <RupiahInput
                          currency={currency}
                          label=""
                          value={hargaOngkirMarkup}
                          onChange={setHargaOngkirMarkup}
                          placeholder={currency === "JPY" ? "¥ 0" : "Rp 0"}
                          className={getInputClass(hargaOngkirMarkup)}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 flex items-center justify-between text-xs font-bold text-slate-700 select-none">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400">Total Tagihan:</span>
                    <span className="font-extrabold text-slate-800 flex items-center gap-1">
                      {currency === "JPY" ? <FlagJP /> : <FlagID />}
                      {formatCurrency(totalPembayaran, currency)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400">Total Profit:</span>
                    <span
                      className={`font-extrabold flex items-center gap-1 ${
                        profitNegative ? "text-red-600" : "text-emerald-600"
                      }`}
                    >
                      {currency === "JPY" ? <FlagJP /> : <FlagID />}
                      {profitNegative ? "-" : ""}
                      {formatCurrency(Math.abs(totalKeuntungan), currency)}
                    </span>
                  </div>
                </div>

                {profitNegative && (
                  <div className="flex items-start gap-3 bg-red-50 border border-red-200/60 text-red-800 p-4 rounded-2xl text-xs leading-relaxed shadow-sm">
                    <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5 animate-bounce" />
                    <div>
                      <p className="font-bold text-red-900 mb-0.5">Keuntungan Bernilai Negatif (Rugi)</p>
                      <p>
                        Total harga jualan (Nihong) lebih kecil dibandingkan harga modal asli Anda. Pesanan tidak dapat disimpan sebelum margin keuntungan disesuaikan menjadi bernilai positif atau Rp 0.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* SECTION 4: VISUAL UPLOADER & CATATAN */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* UPLOADER */}
              <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-1">
                  <div className="p-1.5 bg-orange-50 text-orange-600 rounded-lg">
                    <ImageIcon size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">Foto Produk</h4>
                    <p className="text-[10px] text-slate-400">Unggah foto barang belanjaan ({imageUrls.length}/3)</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3.5 p-4 border border-dashed border-slate-200 rounded-2xl bg-slate-50/30 min-h-[96px] justify-center sm:justify-start">
                  {imageUrls.map((url, idx) => (
                    <div key={idx} className="group relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 shadow-sm transition-transform hover:scale-105 duration-200">
                      <img src={url} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button
                          type="button"
                          onClick={() => setImageUrls((prev) => prev.filter((_, i) => i !== idx))}
                          className="bg-red-600 text-white p-1 rounded-lg hover:bg-red-700 transition shadow-md"
                          title="Hapus foto"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}

                  {imageUrls.length < 3 && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 bg-white hover:border-orange-500 hover:text-orange-500 hover:shadow-sm transition-all duration-200 cursor-pointer"
                    >
                      {isUploading ? (
                        <Loader2 size={18} className="animate-spin text-orange-500" />
                      ) : (
                        <>
                          <Upload size={16} />
                          <span className="text-[8px] font-extrabold mt-1 uppercase tracking-wider">Upload</span>
                        </>
                      )}
                    </button>
                  )}

                  {imageUrls.length === 0 && !isUploading && (
                    <div className="flex-1 text-center sm:text-left">
                      <p className="text-[10px] text-slate-400 font-medium">Opsional: Maksimal 3 foto produk untuk referensi belanja.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* CATATAN */}
              <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-1">
                  <div className="p-1.5 bg-brand-navyDark/10 text-brand-navyDark rounded-lg">
                    <FileText size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">Catatan Khusus</h4>
                    <p className="text-[10px] text-slate-400">Memo khusus atau catatan khusus untuk pesanan</p>
                  </div>
                </div>

                <textarea
                  rows={3}
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 outline-none text-sm placeholder:text-slate-400 shadow-sm bg-white transition-all resize-none"
                  placeholder="Contoh: Titipan kosmetik warna nomor 3, bungkus ekstra bubble wrap..."
                />
              </div>
            </div>
          </fieldset>
        </form>

      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleFileUpload}
        onClick={(e) => {
          (e.target as HTMLInputElement).value = "";
        }}
      />
      {customerModalOpen && (
        <CustomerFormModal
          initial={{ nama: tempCustomerName }}
          onClose={() => setCustomerModalOpen(false)}
          onSubmit={async (values) => {
            const cleanName = values.nama.trim().toUpperCase();
            const isDuplicate = customers.some(
              (c) => c.nama.toUpperCase().trim() === cleanName
            );
            if (isDuplicate) {
              throw new Error(`Pelanggan "${cleanName}" sudah terdaftar.`);
            }
            const newCust = await addCustomer({
              nama: cleanName,
              telpon: values.telpon || "",
              alamat: values.alamat || "",
            });
            setNamaPelanggan(newCust.nama);
            setCustomerModalOpen(false);
          }}
        />
      )}
    </Modal>
  );
}
