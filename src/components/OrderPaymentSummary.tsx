import { CheckCircle2, Clock3, CreditCard, FileText } from "lucide-react";
import type { ExtendedOrder } from "../types";
import { formatCurrency } from "../utils/format";
import { getPaymentSummary } from "../utils/payment";

interface OrderPaymentSummaryProps {
  order: ExtendedOrder;
  total: number;
  currency: string;
  compact?: boolean;
  compactAlign?: "left" | "right";
}

function paymentDate(value?: string) {
  if (!value) return "Tanggal belum dicatat";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("id-ID", {
    day: "numeric", month: "short", year: "numeric",
  });
}

export function OrderPaymentSummary({ order, total, currency, compact = false, compactAlign = "left" }: OrderPaymentSummaryProps) {
  const payment = getPaymentSummary(order, total);
  const complete = order.status === "Selesai";
  const incompleteRecord = complete && payment.remaining > 0;

  if (compact) {
    if (payment.paid <= 0) return order.status === "DP Terbayar"
      ? <p className={`mt-1.5 max-w-[12rem] text-xs leading-5 text-amber-700 ${compactAlign === "right" ? "ml-auto" : "text-left"}`}>Nominal DP belum dicatat</p>
      : null;

    return (
      <dl className={`mt-1.5 grid w-max grid-cols-[auto_auto] items-baseline gap-x-3 gap-y-0.5 text-xs leading-5 tabular-nums ${compactAlign === "right" ? "ml-auto" : ""}`}>
        {payment.dp > 0 && (
          <>
            <dt className="whitespace-nowrap text-left text-slate-500">DP</dt>
            <dd className="whitespace-nowrap text-right font-medium text-indigo-700">{formatCurrency(payment.dp, currency)}</dd>
          </>
        )}
        {!complete && (
          <>
            <dt className="whitespace-nowrap text-left text-slate-500">Sisa</dt>
            <dd className="whitespace-nowrap text-right font-semibold text-slate-800">{formatCurrency(payment.remaining, currency)}</dd>
          </>
        )}
      </dl>
    );
  }

  const records = [
    { label: "DP terbayar", amount: payment.dp, date: order.dpTanggal, method: order.dpMetode, note: order.dpCatatan, color: "text-indigo-700", background: "bg-indigo-50" },
    { label: "Pelunasan", amount: payment.settlement, date: order.pelunasanTanggal, method: order.pelunasanMetode, note: order.pelunasanCatatan, color: "text-emerald-700", background: "bg-emerald-50" },
  ];

  return (
    <section aria-label="Ringkasan pembayaran" className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="space-y-5 bg-brand-navy p-5 text-white">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm font-medium text-slate-300">Ringkasan pembayaran</span>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${complete ? "bg-emerald-400/15 text-emerald-200" : payment.paid > 0 || order.status === "DP Terbayar" ? "bg-indigo-400/20 text-indigo-100" : "bg-amber-400/15 text-amber-200"}`}>
            {complete ? <CheckCircle2 size={14} /> : <Clock3 size={14} />}
            {complete ? "Lunas" : order.status || "Belum Membayar"}
          </span>
        </div>
        <div>
          <p className="text-sm text-slate-300">{incompleteRecord ? "Total tagihan" : "Sisa tagihan"}</p>
          <p className="mt-1 break-words text-3xl font-bold tracking-tight tabular-nums">
            {formatCurrency(incompleteRecord ? total : payment.remaining, currency)}
          </p>
        </div>
        <div className="space-y-2.5">
          <div className="flex flex-wrap justify-between gap-2 text-sm">
            <span className="text-slate-300">Tercatat masuk</span>
            <span className="font-semibold tabular-nums">{formatCurrency(payment.paid, currency)}</span>
          </div>
          <div role="progressbar" aria-label="Pembayaran tercatat" aria-valuenow={payment.percent} aria-valuemin={0} aria-valuemax={100} className="h-1.5 overflow-hidden rounded-full bg-white/15">
            <div className="h-full rounded-full bg-emerald-400 transition-[width]" style={{ width: `${payment.percent}%` }} />
          </div>
          <div className="flex flex-wrap justify-between gap-2 text-xs text-slate-300">
            <span>{payment.percent}% tercatat</span>
            <span>Total {formatCurrency(total, currency)}</span>
          </div>
        </div>
      </div>
      <div className="divide-y divide-slate-100 px-5">
        {records.map((record) => (
          <div key={record.label} className="py-4">
            <div className="flex items-start gap-3">
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${record.background} ${record.color}`}><CreditCard size={17} /></span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <p className="text-sm font-medium text-slate-600">{record.label}</p>
                  <p className={`text-base font-bold tabular-nums ${record.amount > 0 ? record.color : "text-slate-400"}`}>
                    {record.amount > 0 ? formatCurrency(record.amount, currency) : "Belum dicatat"}
                  </p>
                </div>
                {(record.amount > 0 || record.date || record.method) && (
                  <p className="mt-1 break-words text-xs leading-relaxed text-slate-500">{paymentDate(record.date)}{record.method ? ` · ${record.method}` : ""}</p>
                )}
              </div>
            </div>
            {record.note?.trim() && (
              <div className="mt-3 flex items-start gap-2 rounded-xl bg-slate-50 p-3">
                <FileText size={15} className="mt-0.5 shrink-0 text-slate-400" />
                <p className="min-w-0 flex-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-600">{record.note}</p>
              </div>
            )}
          </div>
        ))}
        {(incompleteRecord || (order.status === "DP Terbayar" && payment.dp === 0)) && (
          <p className="py-4 text-sm leading-relaxed text-amber-700">
            {incompleteRecord ? "Pesanan ditandai lunas. Rincian nominal pembayaran belum lengkap." : "Status DP terbayar sudah dipilih. Lengkapi nominal DP agar sisa tagihan dapat dihitung."}
          </p>
        )}
      </div>
    </section>
  );
}
