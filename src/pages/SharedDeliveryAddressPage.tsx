import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  LockKeyhole,
  MapPin,
  PackageCheck,
  Save,
} from "lucide-react";
import {
  Customer,
  DeliveryCountry,
  IndonesiaDeliveryAddress,
  JapanDeliveryAddress,
} from "../types";
import {
  getPublicDeliveryAddressLink,
  PublicDeliveryAddressLinkError,
  submitPublicDeliveryAddress,
} from "../services/deliveryAddressFirebase";
import {
  cleanIndonesiaDeliveryAddress,
  cleanJapanDeliveryAddress,
  getIndonesiaDeliveryAddress,
  getJapanDeliveryAddress,
  JapanDeliveryAddressErrors,
  validateJapanDeliveryAddress,
} from "../utils/deliveryAddress";
import {
  IndonesiaDeliveryAddressFields,
  JapanDeliveryAddressFields,
} from "../components/DeliveryAddressFields";

type LoadState = "loading" | "ready" | "invalid" | "used" | "error";

function CompletedView() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-indigo-50 flex items-center justify-center p-5">
      <motion.main
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="w-full max-w-md rounded-3xl border border-emerald-200 bg-white p-7 text-center shadow-2xl shadow-emerald-200/40 sm:p-9"
      >
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 ring-8 ring-emerald-50">
          <CheckCircle2 className="h-8 w-8" strokeWidth={2.5} />
        </div>
        <h1 className="mt-6 text-2xl font-black text-slate-900">Alamat Berhasil Dikirim</h1>
        <p className="mt-3 text-sm font-medium leading-relaxed text-slate-500">
          Terima kasih. Data alamat pengiriman sudah tersimpan dan form ini telah ditutup.
        </p>
        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold leading-relaxed text-slate-500">
          Link ini hanya berlaku satu kali. Jika ada data yang perlu diperbaiki, hubungi admin untuk meminta link baru.
        </div>
      </motion.main>
    </div>
  );
}

export function SharedDeliveryAddressPage({ shareToken }: { shareToken: string }) {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [country, setCountry] = useState<DeliveryCountry>("indonesia");
  const [route, setRoute] = useState("");
  const [indonesiaAddress, setIndonesiaAddress] = useState<IndonesiaDeliveryAddress>(
    getIndonesiaDeliveryAddress(),
  );
  const [japanAddress, setJapanAddress] = useState<JapanDeliveryAddress>(
    getJapanDeliveryAddress(),
  );
  const [japanErrors, setJapanErrors] = useState<JapanDeliveryAddressErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoadState("loading");

    getPublicDeliveryAddressLink(shareToken)
      .then((result) => {
        if (!active) return;
        if (result.status !== "active") {
          setLoadState(result.status);
          return;
        }

        setCustomer(result.customer);
        setCountry(result.link.country);
        setRoute(result.link.route);
        setIndonesiaAddress(getIndonesiaDeliveryAddress(result.customer));
        setJapanAddress(getJapanDeliveryAddress(result.customer));
        setLoadState("ready");
      })
      .catch((error) => {
        console.error("Gagal membuka form alamat publik:", error);
        if (active) setLoadState("error");
      });

    return () => {
      active = false;
    };
  }, [shareToken]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);

    if (country === "japan") {
      const validationErrors = validateJapanDeliveryAddress(japanAddress);
      if (Object.keys(validationErrors).length > 0) {
        setJapanErrors(validationErrors);
        setMessage("Periksa kembali data yang ditandai sebelum mengirim alamat.");
        return;
      }
    }

    setSubmitting(true);
    try {
      if (country === "japan") {
        await submitPublicDeliveryAddress(
          shareToken,
          "japan",
          cleanJapanDeliveryAddress(japanAddress),
        );
      } else {
        await submitPublicDeliveryAddress(
          shareToken,
          "indonesia",
          cleanIndonesiaDeliveryAddress(indonesiaAddress),
        );
      }
      setLoadState("used");
    } catch (error: any) {
      if (error instanceof PublicDeliveryAddressLinkError) {
        setLoadState(error.code === "used" ? "used" : "invalid");
      } else {
        setMessage(error?.message || "Alamat belum berhasil disimpan. Silakan coba lagi.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loadState === "loading") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          <p className="text-sm font-bold text-slate-500">Membuka form alamat pengiriman...</p>
        </div>
      </div>
    );
  }

  if (loadState === "used") return <CompletedView />;

  if (loadState !== "ready" || !customer) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-3xl border border-amber-200 bg-white p-7 text-center shadow-xl shadow-slate-200/60">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h1 className="text-lg font-black text-slate-800">Link Tidak Berlaku</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            {loadState === "invalid"
              ? "Link ini tidak valid atau sudah digantikan dengan link yang baru. Hubungi admin untuk meminta link terbaru."
              : "Terjadi kendala saat memuat form. Periksa koneksi lalu coba buka ulang link ini."}
          </p>
        </div>
      </div>
    );
  }

  const destinationLabel = country === "japan" ? "Jepang" : "Indonesia";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/60 px-4 py-6 sm:py-10">
      <motion.main
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-300/40"
      >
        <header className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 px-5 py-6 text-white sm:px-8">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
              <PackageCheck className="h-6 w-6 text-indigo-200" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-indigo-200">
                Form Penerima
              </p>
              <h1 className="mt-1 text-xl font-black sm:text-2xl">
                Pengiriman Domestik di {destinationLabel}
              </h1>
              <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-white/65">
                <MapPin className="h-3.5 w-3.5" />
                Tujuan otomatis mengikuti rute {route}
              </p>
            </div>
          </div>
        </header>

        <div className="border-b border-indigo-100 bg-indigo-50/70 px-5 py-3 sm:px-8">
          <div className="flex items-start gap-2 text-xs leading-relaxed text-indigo-800">
            <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Halo <strong>{customer.nama}</strong>. Periksa kembali sebelum menyimpan karena form hanya dapat dikirim satu kali.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 p-5 sm:p-8">
          {country === "japan" ? (
            <JapanDeliveryAddressFields
              value={japanAddress}
              onChange={(value) => {
                setJapanAddress(value);
                setJapanErrors({});
                setMessage(null);
              }}
              disabled={submitting}
              errors={japanErrors}
            />
          ) : (
            <IndonesiaDeliveryAddressFields
              value={indonesiaAddress}
              onChange={(value) => { setIndonesiaAddress(value); setMessage(null); }}
              disabled={submitting}
            />
          )}

          {message && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{message}</span>
            </div>
          )}

          <div className="flex justify-end border-t border-slate-100 pt-5">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 text-sm font-extrabold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-500 disabled:cursor-wait disabled:opacity-60 sm:w-auto"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {submitting ? "Menyimpan..." : "Kirim Alamat Sekali"}
            </button>
          </div>
        </form>
      </motion.main>
    </div>
  );
}
