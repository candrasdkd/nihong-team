import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { PreOrder } from "../../types";
import { convertPreOrderToOrder } from "../../services/preOrdersFirebase";
import { Button } from "../ui/Button";

export function ConvertPreOrderModal({
  preOrder,
  onClose,
  onConverted,
}: {
  preOrder: PreOrder;
  onClose: () => void;
  onConverted: (orderId: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleConvert() {
    setLoading(true);
    try {
      const namaBarang = preOrder.items.map((i) => i.namaBarang).join("\n");

      const orderId = await convertPreOrderToOrder(preOrder.id, {
        no: `PO-${Date.now()}`,
        tanggal: new Date().toISOString().split("T")[0],
        idPelanggan: preOrder.idPelanggan,
        namaPelanggan: preOrder.namaPelanggan,
        namaBarang,
        kategori: "",
        pengiriman: preOrder.rute,
        jumlahKg: preOrder.totalKg,
        kgCeil: Math.ceil(preOrder.totalKg),
        hargaJastip: 0,
        hargaJastipMarkup: 0,
        hargaOngkir: 0,
        hargaOngkirMarkup: 0,
        totalPembayaran: 0,
        totalKeuntungan: 0,
        status: "Belum Membayar",
        catatan: preOrder.catatan || "",
      });
      onConverted(orderId);
    } catch (err: any) {
      setError(err.message || "Gagal mengkonversi pre order.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.92 }}
          className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-10"
        >
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-6 text-white">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <ArrowRight size={20} />
              </div>
              <h3 className="font-extrabold text-lg">Pindahkan ke Pesanan</h3>
            </div>
            <p className="text-emerald-100 text-sm">
              Booking akan dikonversi menjadi Pesanan resmi. Lengkapi harga setelah konversi.
            </p>
          </div>

          <div className="p-6 space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-600">
                {error}
              </div>
            )}

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Ringkasan</p>
              <p className="text-sm font-bold text-slate-800">{preOrder.namaPelanggan}</p>
              <p className="text-xs text-slate-500">{preOrder.rute}</p>
              <div className="pt-2 border-t border-slate-200 space-y-1">
                {preOrder.items.map((item, i) => (
                  <div key={i} className="text-xs text-slate-600">
                    • {item.namaBarang}
                  </div>
                ))}
                <div className="flex justify-between text-xs font-extrabold text-emerald-600 pt-2 border-t border-slate-200">
                  <span>Total Berat</span>
                  <span>{preOrder.totalKg} Kg</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3 font-semibold">
              ⚠️ Harga jastip dan ongkir akan diisi <strong>0</strong>. Lengkapi di halaman Pesanan setelah konversi.
            </p>

            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Batal
              </Button>
              <Button
                isLoading={loading}
                onClick={handleConvert}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white border-0"
              >
                <ArrowRight size={16} className="mr-2" />
                Konversi Sekarang
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
