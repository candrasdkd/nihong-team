export type OrderStatus = "Belum Membayar" | "Selesai";

export type TabId =
  | "home"
  | "orders"
  | "customers"
  | "cash"
  | "jastipers"
  | "schedules"
  | "preorders"
  | "menu"
  | string;


export interface Order {
  id?: string;
  no: string;
  namaBarang: string;
  kategori?: string;
  tanggal: string;
  namaPelanggan: string;
  jumlahKg: number;
  totalHarga?: number;
  status?: OrderStatus;
  tipeNominal?: string;
  imageUrl?: string | string[];
}

export type Customer = {
  id?: string;
  nama: string;
  alamat?: string;
  telpon?: string;
  createdAt?: any;
  updatedAt?: any;
};
export type SubscribeOpts = {
  q?: string; // (belum diimplementasi server-side; gunakan client-side jika perlu)
  status?: string;
  fromInput?: string; // yyyy-MM-dd (inklusif, 00:00)
  toInput?: string; // yyyy-MM-dd (inklusif, 23:59:59)
  sort?: "asc" | "desc"; // default 'desc'
  limit?: number; // default 250
};
// ===== Type Definitions =====
export type ExtendedOrder = Order &
  Partial<{
    pengiriman: string;
    catatan: string;
    hargaJastip: number;
    hargaJastipMarkup: number;
    hargaOngkir: number;
    hargaOngkirMarkup: number;
    tipeNominal: string;
  }>;

export type OrderDoc = {
  id: string;
  no: string;
  tanggal: string; // format dianjurkan: 'yyyy-MM-dd' agar range query & sorting valid
  idPelanggan: string;
  namaPelanggan: string;
  namaBarang: string;
  kategori?: string;
  pengiriman?: string;
  jumlahKg: number;
  kgCeil: number;
  hargaJastip: number;
  hargaJastipMarkup: number;
  hargaOngkir: number;
  hargaOngkirMarkup: number;
  totalPembayaran: number;
  totalKeuntungan: number;
  status: OrderStatus; // 'Belum Membayar' | 'Selesai'
  tipeNominal?: string;
  catatan?: string;
  imageUrl?: string;
  createdAt?: any;
  updatedAt?: any;
};

export type PeriodType = "30d" | "3m" | "12m";

export type MonthPoint = {
  key: string;
  label: string;
  total: number;
  count: number;
  profit: number;
};



export type Option = { label: string; value: string };

export interface AppSettings {
  jastipYenPerKg?: number;
  unitPriceIdr?: number; // legacy fallbacks / future global master unit price
  updatedAt?: string;
}

// ===== Jastiper Types =====
export interface Jastiper {
  id: string;
  nama: string;
  noTelpon: string;
  alamat: string;
  createdAt?: any;
  updatedAt?: any;
}

// ===== Departure Schedule Types =====
export type ScheduleStatus = "Open" | "Closed";

export interface DepartureSchedule {
  id: string;
  idJastiper: string;
  namaJastiper: string;
  rute: string;
  tanggalBerangkat: string;   // YYYY-MM-DD
  tanggalLastDrop: string;    // YYYY-MM-DD (batas akhir konsumen titip barang)
  slotBeratKg: number;        // Kapasitas berat total tersedia
  beratTerpakai: number;      // Akumulasi dari Pre Order aktif
  status: ScheduleStatus;
  catatan?: string;
  hargaFeeJastiper?: number;   // Fee Jastiper per Kg
  createdAt?: any;
  updatedAt?: any;
}

// ===== Pre Order Types =====
export interface PreOrderItem {
  namaBarang: string;
  kategori?: string;
  catatan?: string;
  checked?: boolean;
}

export type PreOrderStatus = "Pending" | "Selesai";

export interface PreOrder {
  id: string;
  idJadwal: string;
  namaJastiper: string;
  rute: string;
  tanggalBerangkat: string;
  idPelanggan: string;
  namaPelanggan: string;
  noTelponPelanggan?: string;
  pic?: string;
  items: PreOrderItem[];
  totalKg: number;
  status: PreOrderStatus;
  catatan?: string;
  createdAt?: any;
  updatedAt?: any;
}
