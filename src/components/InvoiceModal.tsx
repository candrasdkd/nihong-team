import React, { useMemo, useRef, useState, useEffect } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { Customer, ExtendedOrder } from "../types";
import { formatCurrency } from "../utils/format";
import { Modal } from "./ui/Modal";
import { Button } from "./ui/Button";

import { Download } from "lucide-react";

// --- ASSETS ---
import stampImage from "../assets/cap.png";
import logoImage from "../assets/nihong.png";

// --- DATA ---
const BANK_ACCOUNTS = [
  { bank: "BCA", number: "0800826764", name: "DIN MIZWAR ULYA SYEKH KHODIR" },
  {
    bank: "MANDIRI",
    number: "700012366782",
    name: "DIN MIZWAR ULYA SYEKH KHODIR",
  },
  {
    bank: "YUCHO JAPAN",
    number: "14080-56667651",
    name: "ディン　ミズワル　ウルヤ　シェフ　コディル",
  },
];

// --- HELPER FUNCTIONS ---
function compute(o: ExtendedOrder, unitPrice: number) {
  const kg = Math.ceil(Number(o.jumlahKg ?? 0) * 2) / 2;
  const baseJastip =
    typeof o.hargaJastip === "number" ? o.hargaJastip : kg * unitPrice;
  const jastipMarkup = Number(o.hargaJastipMarkup ?? 0);
  const baseOngkir = Number(o.hargaOngkir ?? 0);
  const ongkirMarkup = Number(o.hargaOngkirMarkup ?? 0);
  const currency = o.tipeNominal || "IDR";

  const lineTotal = jastipMarkup + ongkirMarkup;
  const keuntungan = jastipMarkup + ongkirMarkup - (baseJastip + baseOngkir);

  return { kg, jastipMarkup, ongkirMarkup, lineTotal, keuntungan, currency };
}

const getStatusBadge = (status: string) => {
  const s = status?.toLowerCase() || "";
  if (s.includes("selesai") || s.includes("lunas") || s.includes("diterima")) {
    return {
      text: "LUNAS",
      color: "text-emerald-600 border-emerald-600 bg-emerald-50",
    };
  } else if (s.includes("batal")) {
    return {
      text: "DIBATALKAN",
      color: "text-red-600 border-red-600 bg-red-50",
    };
  } else {
    return {
      text: "TAGIHAN",
      color: "text-slate-600 border-slate-600 bg-slate-50",
    };
  }
};

// --- SUB-COMPONENT: Kertas Invoice (UI Murni) ---
// Komponen ini dipisah agar bisa dirender dua kali (satu untuk preview, satu untuk PDF generator)
const InvoicePaper = React.forwardRef(
  (
    { order, items, customer, totals, grandTotal, badge, unitPrice }: any,
    ref: any,
  ) => {
    return (
      <div
        ref={ref}
        className="bg-white text-slate-900 relative shadow-sm"
        style={{
          width: "210mm", // Lebar Fix A4
          minHeight: "297mm", // Tinggi Min A4
          padding: "15mm 20mm", // Margin Kertas
          boxSizing: "border-box",
        }}
      >
        {/* Header */}
        <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-6">
          <div>
            <h1
              className="text-3xl font-extrabold tracking-tight text-slate-900 uppercase"
              style={{ letterSpacing: "2px" }}
            >
              INVOICE
            </h1>
            <div className="mt-4 text-sm text-slate-600 leading-relaxed font-sans">
              <p className="font-bold text-slate-900 text-base">
                Nihong Jastip
              </p>
              <p>Depok, Jawa Barat</p>
              <p>WhatsApp: 0851-5677-5933</p>
              <p>Email: jastipnihong@gmail.com</p>
            </div>
          </div>
          <div className="text-right">
            <div className="mb-4 flex justify-end">
              <img
                src={logoImage}
                alt="Logo"
                className="h-16 w-auto object-contain"
              />
            </div>
            <div className="space-y-1 font-sans">
              <div className="flex justify-end gap-4 text-sm">
                <span className="text-slate-500">No. Invoice:</span>
                <span className="font-mono font-medium">
                  INV/{(order as any).no || "NEW"}/{new Date().getFullYear()}
                </span>
              </div>
              <div className="flex justify-end gap-4 text-sm">
                <span className="text-slate-500">Tanggal:</span>
                <span className="font-medium">
                  {order.tanggal || new Date().toLocaleDateString("id-ID")}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bill To & Status */}
        <div className="flex justify-between mb-8">
          <div className="w-1/2 pr-4">
            <h3 className="text-xs uppercase tracking-wider font-bold text-slate-400 mb-2">
              DITAGIHKAN KEPADA
            </h3>
            <div className="text-base font-bold text-slate-900">
              {order.namaPelanggan}
            </div>
            {customer?.alamat && (
              <div className="text-sm text-slate-600 mt-1 max-w-xs leading-snug">
                {customer.alamat}
              </div>
            )}
            {customer?.telpon && (
              <div className="text-sm text-slate-600 mt-1">
                {customer.telpon}
              </div>
            )}
          </div>
          <div className="w-1/2 flex flex-col items-end justify-center">
            <div
              className={`border-4 px-6 py-2 rounded uppercase font-black text-2xl tracking-widest opacity-80 rotate-[-5deg] ${badge.color}`}
            >
              {badge.text}
            </div>
          </div>
        </div>

        {/* Table Items */}
        <div className="mb-8 min-h-[200px]">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-y-2 border-slate-900">
                <th className="py-3 text-left font-bold text-slate-900 uppercase tracking-wider text-xs w-[60%]">
                  Deskripsi
                </th>
                <th className="py-3 text-right font-bold text-slate-900 uppercase tracking-wider text-xs">
                  Berat (Kg)
                </th>
                <th className="py-3 text-right font-bold text-slate-900 uppercase tracking-wider text-xs">
                  Total ({totals.currency})
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {items.map((item: any, idx: number) => {
                const d = compute(item, unitPrice);
                return (
                  <tr key={idx}>
                    <td className="py-3 pr-4 align-top">
                      <div className="font-bold text-slate-800">
                        {item.namaBarang}
                      </div>
                      {item.catatan && (
                        <div className="text-xs text-slate-500 italic mt-1">
                          {item.catatan}
                        </div>
                      )}
                    </td>
                    <td className="py-3 text-right text-slate-600 font-mono align-top">
                      {d.kg}
                    </td>
                    <td className="py-3 text-right font-mono font-bold text-slate-900 align-top">
                      {formatCurrency(d.lineTotal, d.currency)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer Section */}
        <div className="flex flex-row justify-between items-start pt-6 border-t border-slate-300">
          {/* Left: Payment Info */}
          <div className="w-[55%] pr-8">
            <h4 className="font-bold text-sm text-slate-900 mb-3 uppercase tracking-wide">
              Metode Pembayaran
            </h4>
            <div className="text-sm text-slate-600 mb-4">
              <p className="mb-3">
                Mohon transfer ke salah satu rekening berikut:
              </p>
              <div className="space-y-3">
                {BANK_ACCOUNTS.map((acc, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-50 p-3 rounded border border-slate-200 shadow-sm break-inside-avoid"
                  >
                    <div className="flex justify-between items-center text-xs font-bold text-slate-800">
                      <span className="text-sm">{acc.bank}</span>
                      <span className="font-mono text-sm tracking-wide">
                        {acc.number}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1 uppercase font-semibold">
                      a/n {acc.name}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Totals & Signature */}
          <div className="w-[40%] flex flex-col justify-between h-full">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-slate-600">
                <span className="font-medium">Subtotal</span>
                <span className="font-mono">
                  {formatCurrency(totals.subtotal, totals.currency)}
                </span>
              </div>

              <div className="border-t-2 border-slate-900 my-2 pt-2 flex justify-between items-center">
                <span className="font-black text-xl text-slate-900">TOTAL</span>
                <span className="font-black text-2xl text-slate-900 font-mono">
                  {formatCurrency(grandTotal, totals.currency)}
                </span>
              </div>
            </div>

            <div className="mt-12 text-center relative">
              <div className="absolute top-[-25px] left-1/2 transform -translate-x-1/2 opacity-70 pointer-events-none mix-blend-multiply">
                {stampImage && (
                  <img
                    src={stampImage}
                    alt="Stamp"
                    className="w-28 h-28 object-contain rotate-12"
                  />
                )}
              </div>
              <div className="h-16"></div>
              <div className="border-t border-slate-400 w-3/4 mx-auto pt-2">
                <p className="text-xs font-bold text-slate-900 uppercase tracking-widest">
                  Nihong Jastip Admin
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-6 left-0 w-full text-center">
          <p className="text-[10px] text-slate-400 font-medium tracking-wider">
            TERIMA KASIH TELAH MENGGUNAKAN JASA KAMI
          </p>
        </div>
      </div>
    );
  },
);

// --- MAIN COMPONENT ---
export function InvoiceModal({
  order,
  orders,
  customer,
  onClose,
  unitPrice,
  itemIds,
}: {
  order: ExtendedOrder;
  orders: ExtendedOrder[];
  customer?: Customer;
  onClose: () => void;
  unitPrice: number;
  itemIds?: string[];
}) {
  const hiddenPrintRef = useRef<HTMLDivElement>(null); // Ref untuk versi hantu (A4)
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewScale, setPreviewScale] = useState(1);

  // Logic scaling khusus tampilan Preview di HP
  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      if (w < 820) {
        // 794px adalah lebar A4. Kita scale agar muat di layar HP
        // Dikurangi padding container (misal 32px)
        const scale = (w - 32) / 794;
        setPreviewScale(Math.max(scale, 0.35));
      } else {
        setPreviewScale(1);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Data Processing
  const items = useMemo(() => {
    const pool = orders || [];
    if (itemIds && itemIds.length) {
      const set = new Set(itemIds);
      return pool.filter((o) => set.has(o.id));
    }
    return pool.filter((o) => o.namaPelanggan === order.namaPelanggan);
  }, [orders, itemIds, order.namaPelanggan]);

  const totals = useMemo(() => {
    return items.reduce(
      (acc, it) => {
        const d = compute(it, unitPrice);
        acc.subtotal += d.lineTotal;
        if (!acc.currency) acc.currency = d.currency;
        return acc;
      },
      { subtotal: 0, currency: "" },
    );
  }, [items, unitPrice]);

  const grandTotal = totals.subtotal;
  const displayCurrency = totals.currency || "IDR";
  const badge = getStatusBadge(String(order.status));

  // --- FUNGSI DOWNLOAD BARU (TARGET GHOST ELEMENT) ---
  async function downloadPDF() {
    if (!hiddenPrintRef.current) return;
    setIsGenerating(true);

    try {
      // Tunggu sebentar memastikan DOM siap
      await new Promise((r) => setTimeout(r, 100));

      const elementToCapture = hiddenPrintRef.current;

      const canvas = await html2canvas(elementToCapture, {
        scale: 2, // Kualitas tinggi
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        // Kita tidak perlu windowWidth hack lagi karena element ini fix width
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgProps = pdf.getImageProperties(imgData);
      const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, pdfWidth, imgHeight);
      heightLeft -= pdfHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, pdfWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      const fileName = `Invoice_${(order as any).no || "NJ"}_${order.namaPelanggan.replace(/\s+/g, "_")}.pdf`;
      pdf.save(fileName);
    } catch (err) {
      console.error("PDF Error", err);
      alert("Gagal membuat PDF. Silakan coba lagi.");
    } finally {
      setIsGenerating(false);
    }
  }

  // Props yang akan dioper ke komponen kertas
  const paperProps = {
    order,
    items,
    customer,
    totals: { ...totals, currency: displayCurrency },
    grandTotal,
    badge,
    unitPrice,
  };

  return (
    <Modal
      onClose={onClose}
      title="Preview Invoice"
      size="full"
      contentClassName="p-0 bg-slate-100 flex flex-col h-full overflow-hidden"
    >
      {/* 1. AREA PREVIEW UNTUK DILIHAT USER (RESPONSIVE SCALED) */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden flex justify-center bg-slate-200/50 relative py-8">
        <div
          className="origin-top shadow-xl transition-transform duration-200"
          style={{ transform: `scale(${previewScale})` }} // Scale visual saja
        >
          <InvoicePaper {...paperProps} />
        </div>
      </div>

      {/* 2. AREA INVOICE "HANTU" (KHUSUS UNTUK DIGENERATE PDF) */}
      {/* Posisinya fixed di luar layar (-9999px) dengan lebar FIX A4.
          html2canvas akan memotret ini, BUKAN yang dilihat user. */}
      <div style={{ position: "fixed", top: 0, left: "-9999px", zIndex: -1 }}>
        <div ref={hiddenPrintRef}>
          <InvoicePaper {...paperProps} />
        </div>
      </div>

      {/* BOTTOM ACTION BAR */}
      <div className="bg-white border-t border-slate-200 p-4 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] safe-area-bottom">
        <div className="max-w-2xl mx-auto flex gap-3">
          <Button variant="ghost" onClick={onClose} className="flex-1">
            Tutup
          </Button>
          <Button
            onClick={downloadPDF}
            disabled={isGenerating}
            className="flex-[2] bg-slate-900 text-white hover:bg-slate-800 flex items-center justify-center gap-2 shadow-lg shadow-slate-900/20"
          >
            {isGenerating ? (
              "Memproses..."
            ) : (
              <>
                <Download size={18} /> <span>Download PDF</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
