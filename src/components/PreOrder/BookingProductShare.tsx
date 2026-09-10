import { useState } from "react";
import { Copy, Link2 } from "lucide-react";
import { Button } from "../ui/Button";
import { ensureBookingProductLink, revokeBookingProductLink } from "../../services/bookingProductsFirebase";
import { buildPublicUrl } from "../../utils/publicUrl";

export function BookingProductShare({ bookingId }: { bookingId: string }) {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function prepare() {
    setBusy(true); setMessage("");
    try {
      const token = await ensureBookingProductLink(bookingId);
      setUrl(buildPublicUrl(window.location.origin, `/?products=${token}`, import.meta.env.VITE_PUBLIC_APP_URL));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gagal membuat link produk.");
    } finally { setBusy(false); }
  }

  async function revoke() {
    setBusy(true); setMessage("");
    try {
      await revokeBookingProductLink(bookingId);
      setUrl(""); setMessage("Link dinonaktifkan. Customer tidak dapat memakai link lama.");
    } catch { setMessage("Gagal menonaktifkan link. Silakan coba lagi."); }
    finally { setBusy(false); }
  }

  return <section className="mx-5 mt-3 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 space-y-2">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="text-sm font-bold text-brand-navy">Produk untuk customer</div>
      {!url && <Button variant="outline" onClick={prepare} isLoading={busy}><Link2 size={16} />Bagikan produk</Button>}
    </div>
    <p className="text-sm text-slate-600">Customer dapat cek dan update produk melalui link ini tanpa login. Bagikan hanya kepada pemilik booking.</p>
    {url && <>
      <input aria-label="Link produk customer" readOnly value={url} onFocus={event => event.target.select()} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" />
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" disabled={busy} onClick={async () => {
          try { await navigator.clipboard.writeText(url); setMessage("Link produk disalin."); }
          catch { setMessage("Pilih dan salin link di atas secara manual."); }
        }}><Copy size={16} />Salin link</Button>
        <Button variant="ghost" disabled={busy} onClick={revoke}>Nonaktifkan link</Button>
      </div>
    </>}
    {message && <p role="status" className="text-sm text-slate-700">{message}</p>}
  </section>;
}
