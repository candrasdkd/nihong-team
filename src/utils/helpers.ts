import { ExtendedOrder, Order, OrderDoc } from "../types";

export const STORAGE_KEYS = {
  orders: "jastip_orders_v1",
  customers: "jastip_customers_v1",
  unitPrice: "jastip_unit_price_v1",
};
export const MONTH_LABEL_ID = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];
export const computeTotal = (kg: number, unitPrice: number) =>
  (Math.ceil(Math.max(0, kg) * 2) / 2) * unitPrice;
export const todayStr = () => new Date().toISOString().slice(0, 10);
export const monthKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
export function genOrderNo(existing: Order[]) {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const countToday = existing.filter((o) => o.no.includes(ymd)).length + 1;
  return `ORD-${ymd}-${String(countToday).padStart(3, "0")}`;
}

export const formatAndAddYear = (dateString: string) => {
  // 1. Buat objek Date dari string input
  const date = new Date(dateString);

  // 2. Tambahkan satu tahun ke tanggal tersebut
  date.setFullYear(date.getFullYear());

  // 3. Format tanggal ke "5 November 2025" menggunakan Intl.DateTimeFormat
  // 'id-ID' digunakan untuk memastikan nama bulan dalam Bahasa Indonesia
  const options = {
    day: "numeric" as const,
    month: "long" as const,
    year: "numeric" as const,
  };

  return new Intl.DateTimeFormat("id-ID", options).format(date);
};

export const formatDateDayMonth = (dateString: string) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const options = {
    day: "numeric" as const,
    month: "long" as const,
  };
  return new Intl.DateTimeFormat("id-ID", options).format(date);
};

export function normalizeTanggalString(v?: string) {
  if (!v) return "";
  // Jika sudah 'yyyy-MM-dd' biarkan
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const d = new Date(v);
  if (!Number.isNaN(d.getTime())) return toInputDate(d);
  return String(v); // fallback apa adanya (range bisa tidak akurat jika bukan yyyy-MM-dd)
}

export function toInputDate(d: Date) {
  const iso = new Date(
    d.getTime() - d.getTimezoneOffset() * 60000,
  ).toISOString();
  return iso.slice(0, 10);
}
export function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
export function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

// ---- helpers --------------------------------------------------------------
export function ceilKg(jumlahKg?: number) {
  return Math.ceil(Number(jumlahKg ?? 0) * 2) / 2;
}

export function computeDerived(input: Partial<OrderDoc>, unitPrice: number) {
  const kgCeil = ceilKg(input.jumlahKg);
  const baseOngkir =
    typeof input.hargaOngkir === "number"
      ? input.hargaOngkir
      : kgCeil * unitPrice;
  const baseJastip = Number(input.hargaJastip ?? 0);
  const jastipMarkup = Number(input.hargaJastipMarkup ?? 0);
  const ongkirMarkup = Number(input.hargaOngkirMarkup ?? 0);
  const totalPembayaran = baseJastip + baseOngkir;
  const totalKeuntungan =
    jastipMarkup + ongkirMarkup - (baseOngkir + baseJastip);
  return {
    kgCeil,
    baseOngkir,
    baseJastip,
    jastipMarkup,
    ongkirMarkup,
    totalPembayaran,
    totalKeuntungan,
  };
}

export const compute = (o: ExtendedOrder, unitPrice: number) => {
  const kg = Math.ceil(Number(o.jumlahKg ?? 0) * 2) / 2;
  // Ambil currency dari order, default ke IDR jika tidak ada
  const currency = o.tipeNominal || "IDR";

  const baseOngkir =
    typeof o.hargaOngkir === "number" ? o.hargaOngkir : kg * unitPrice;
  const jastipMarkup = Number(o.hargaJastipMarkup ?? 0);
  const baseJastip = Number(o.hargaJastip ?? 0);
  const ongkirMarkup = Number(o.hargaOngkirMarkup ?? 0);

  const totalPembayaran = jastipMarkup + ongkirMarkup;
  const totalKeuntungan =
    jastipMarkup + ongkirMarkup - (baseOngkir + baseJastip);

  return {
    kg,
    baseJastip,
    jastipMarkup,
    baseOngkir,
    ongkirMarkup,
    totalPembayaran,
    totalKeuntungan,
    currency,
  };
};

export function getOrderRevenue(o: any) {
  return Number(o?.totalPembayaran ?? o?.totalHarga ?? 0) || 0;
}
export function getOrderProfit(o: any) {
  return Number(o?.totalKeuntungan ?? o?.profit ?? 0) || 0;
}
export function getMonthKey(dateStr?: string) {
  if (!dateStr) return null;
  const norm = dateStr.replace(/\//g, "-");
  const m = norm.match(/^(\d{4})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}` : null;
}

export function toWaNumber(raw?: string) {
  if (!raw) return "";
  const digits = (raw.match(/\d+/g) || []).join("");
  if (!digits) return "";
  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("0")) return "62" + digits.slice(1);
  if (digits.startsWith("8")) return "62" + digits;
  return digits;
}
export function openWhatsApp(rawNumber?: string, message?: string) {
  const wa = toWaNumber(rawNumber);
  if (!wa) {
    alert("Nomor telepon tidak valid atau kosong.");
    return;
  }
  const url = `https://wa.me/${wa}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
  window.open(url, "_blank", "noopener,noreferrer");
}
