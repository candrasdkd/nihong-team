// src/hooks/useExchangeRate.ts
import { useState, useEffect } from "react";

const CACHE_KEY = "jastip_exchange_rate_jpy_idr";
const CACHE_TIME_KEY = "jastip_exchange_rate_time";
// 12 hours cache
const CACHE_DURATION = 12 * 60 * 60 * 1000;

export function useExchangeRate() {
  const [rate, setRate] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRate() {
      try {
        setLoading(true);
        // Cek cache
        const cachedRate = localStorage.getItem(CACHE_KEY);
        const cachedTime = localStorage.getItem(CACHE_TIME_KEY);

        if (cachedRate && cachedTime) {
          const isExpired = Date.now() - Number(cachedTime) > CACHE_DURATION;
          if (!isExpired) {
            setRate(Number(cachedRate));
            setLoading(false);
            return;
          }
        }

        // Fetch dari API gratis (Open Exchange Rates atau sejenisnya)
        // Disini menggunakan exchangerate-api yang free dan no-auth untuk public pairs
        const res = await fetch("https://api.exchangerate-api.com/v4/latest/JPY");
        if (!res.ok) throw new Error("Gagal mengambil kurs");

        const data = await res.json();
        const idrRate = data.rates?.IDR;

        if (idrRate) {
          setRate(idrRate);
          localStorage.setItem(CACHE_KEY, String(idrRate));
          localStorage.setItem(CACHE_TIME_KEY, String(Date.now()));
        } else {
          throw new Error("Mata uang IDR tidak ditemukan");
        }
      } catch (err: any) {
        console.error("Exchange rate error:", err);
        setError(err.message || "Terjadi kesalahan");
        
        // Fallback to cache if available even if expired, or a hardcoded sane default
        const fallback = localStorage.getItem(CACHE_KEY);
        if (fallback) {
          setRate(Number(fallback));
        } else {
          setRate(105.00); // Sane default 1 JPY = Rp 105
        }
      } finally {
        setLoading(false);
      }
    }

    fetchRate();
  }, []);

  return { rate, loading, error };
}
