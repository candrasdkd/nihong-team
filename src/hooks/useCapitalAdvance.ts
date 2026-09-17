import { useEffect, useState } from "react";
import { subscribeCapitalAdvances, type CapitalAdvance } from "../services/capitalAdvanceFirebase";

export function useCapitalAdvance() {
  const [pending, setPending] = useState<CapitalAdvance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [returning, setReturning] = useState<CapitalAdvance | null>(null);
  useEffect(() => subscribeCapitalAdvances("belum_kembali", rows => {
    setPending([...rows].sort((a, b) => b.tanggalKeluar.localeCompare(a.tanggalKeluar) || b.createdAt - a.createdAt));
    setLoading(false);
    setError(null);
  }, () => {
    setError("Catatan modal gagal dimuat. Muat ulang halaman untuk mencoba lagi.");
    setLoading(false);
  }), []);
  return { pending, loading, error, returning, setReturning, handleMarkReturned: setReturning };
}
