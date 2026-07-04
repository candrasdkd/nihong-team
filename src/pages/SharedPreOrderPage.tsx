// src/pages/SharedPreOrderPage.tsx
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link2, AlertTriangle, Loader2, Copy, Check, ExternalLink } from "lucide-react";
import { doc, getDoc, collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { DepartureSchedule, PreOrder, Customer } from "../types";
import { PreOrderDetailPage } from "./PreOrderDetailPage";
import { addPreOrder, updatePreOrder } from "../services/preOrdersFirebase";
import { listenCustomers } from "../services/customersFirebase";

// ─── Fetch schedule by ID (one-time) ─────────────────────────────────────────
async function fetchSchedule(scheduleId: string): Promise<DepartureSchedule | null> {
  const snap = await getDoc(doc(db, "departure_schedules", scheduleId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as DepartureSchedule;
}

// ─── Listen pre-orders for a schedule ────────────────────────────────────────
function listenSchedulePreOrders(scheduleId: string, cb: (rows: PreOrder[]) => void) {
  const q = query(
    collection(db, "pre_orders"),
    where("idJadwal", "==", scheduleId),
    orderBy("createdAt", "desc"),
  );
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as PreOrder)));
  });
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function SharedPreOrderPage({ scheduleId }: { scheduleId: string }) {
  const [schedule, setSchedule] = useState<DepartureSchedule | null>(null);
  const [schedules, setSchedules] = useState<DepartureSchedule[]>([]);
  const [preOrders, setPreOrders] = useState<PreOrder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);

  // Modal states (needed by PreOrderDetailPage)
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<PreOrder | null>(null);
  const [convertTarget, setConvertTarget] = useState<PreOrder | null>(null);
  const [isRotated, setIsRotated] = useState(false);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Load schedule once
  useEffect(() => {
    setLoadingSchedule(true);
    fetchSchedule(scheduleId)
      .then((sch) => {
        if (!sch) {
          setNotFound(true);
        } else {
          setSchedule(sch);
          setSchedules([sch]);
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoadingSchedule(false));
  }, [scheduleId]);

  // Listen pre-orders for this schedule
  useEffect(() => {
    if (!scheduleId) return;
    const unsub = listenSchedulePreOrders(scheduleId, setPreOrders);
    return () => unsub();
  }, [scheduleId]);

  // Load customers (needed for form)
  useEffect(() => {
    const unsub = listenCustomers((rows) => setCustomers(rows as Customer[]));
    return () => unsub();
  }, []);

  const handleSubmit = async (data: Omit<PreOrder, "id" | "createdAt" | "updatedAt">) => {
    if (editing) {
      await updatePreOrder(editing.id, data);
    } else {
      await addPreOrder(data);
    }
  };

  // ── Loading State ──
  if (loadingSchedule) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center">
            <Loader2 size={22} className="text-rose-500 animate-spin" />
          </div>
          <p className="text-sm font-bold text-slate-500">Memuat data jadwal...</p>
        </motion.div>
      </div>
    );
  }

  // ── Not Found State ──
  if (notFound || !schedule) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-4 text-center max-w-sm"
        >
          <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center">
            <AlertTriangle size={26} className="text-amber-400" />
          </div>
          <div>
            <p className="text-base font-extrabold text-slate-800 mb-1">Jadwal Tidak Ditemukan</p>
            <p className="text-xs text-slate-400 leading-relaxed">
              Link yang kamu akses tidak valid atau jadwal sudah dihapus.
              Minta admin untuk membagikan ulang link yang baru.
            </p>
          </div>
          <a
            href="/"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold shadow-md transition-all active:scale-95"
          >
            <ExternalLink size={12} />
            Buka Aplikasi
          </a>
        </motion.div>
      </div>
    );
  }

  // ── Main View ──
  return (
    <div className="min-h-screen bg-[#f8fafc] relative overflow-hidden">
      {/* Background ambient glows */}
      <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden">
        <div className="absolute -top-[10%] right-[5%] w-[600px] h-[600px] rounded-full bg-indigo-400/8 blur-[120px] mix-blend-multiply animate-pulse" style={{ animationDuration: "8s" }} />
        <div className="absolute bottom-[10%] left-[5%] w-[550px] h-[550px] rounded-full bg-emerald-400/6 blur-[100px] mix-blend-multiply animate-pulse" style={{ animationDuration: "12s" }} />
        <div
          className="absolute inset-0 opacity-[0.6]"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(148, 163, 184, 0.08) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(148, 163, 184, 0.08) 1px, transparent 1px)
            `,
            backgroundSize: "24px 24px",
            maskImage: "radial-gradient(ellipse at 50% 50%, black 60%, transparent 100%)",
            WebkitMaskImage: "radial-gradient(ellipse at 50% 50%, black 60%, transparent 100%)",
          }}
        />
      </div>

      {/* ── Share Mode Banner ── */}
      {!isRotated && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="sticky top-0 z-50 w-full"
        >
          <div className="bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 text-white px-4 py-2.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                <Link2 size={13} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-extrabold leading-none">Mode Berbagi</p>
                <p className="text-[10px] text-white/70 mt-0.5 truncate hidden sm:block">
                  Akses langsung tanpa login — edit bebas
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-[11px] font-bold transition-all active:scale-95 border border-white/20"
              >
                <AnimatePresence mode="wait">
                  {copied ? (
                    <motion.span
                      key="check"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="flex items-center gap-1"
                    >
                      <Check size={11} />
                      Tersalin!
                    </motion.span>
                  ) : (
                    <motion.span
                      key="copy"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="flex items-center gap-1"
                    >
                      <Copy size={11} />
                      Salin Link
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
              <a
                href="/"
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 text-[11px] font-bold transition-all border border-white/20"
                title="Buka aplikasi utama"
              >
                <ExternalLink size={11} />
                <span className="hidden sm:inline">Login</span>
              </a>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── PreOrder Detail ── */}
      <PreOrderDetailPage
        schedule={schedule}
        schedules={schedules}
        customers={customers}
        preOrders={preOrders}
        onBack={() => {}}
        onOpenCreateForm={() => {
          setEditing(null);
          setShowForm(true);
        }}
        showForm={showForm}
        setShowForm={setShowForm}
        editing={editing}
        setEditing={setEditing}
        convertTarget={convertTarget}
        setConvertTarget={setConvertTarget}
        handleSubmit={handleSubmit}
        isShareMode
        isRotated={isRotated}
        onToggleRotate={setIsRotated}
      />
    </div>
  );
}
