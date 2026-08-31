import React, { useMemo, useRef, useState, useEffect } from "react";
import jsPDF from "jspdf";
import { toPng } from "html-to-image";
import { Customer, ExtendedOrder } from "../types";
import { formatCurrency } from "../utils/format";
import { Modal } from "./ui/Modal";
import { Button } from "./ui/Button";
import { Download, Loader2 } from "lucide-react";
import { FlagID, FlagJP, FlagSG, FlagMY } from "./ui/Flags";

// --- ASSETS ---
import stampImage from "../assets/cap.png";
import logoImage from "../assets/nihong.png";

// --- DATA ---
const BANK_ACCOUNTS = [
  { bank: "BCA", number: "0800826764", name: "DIN MIZWAR ULYA SYEKH KHODIR" },
  { bank: "MANDIRI", number: "700012366782", name: "DIN MIZWAR ULYA SYEKH KHODIR" },
  { bank: "YUCHO JAPAN", number: "14080-56667651", name: "ディン　ミズワル　ウルヤ　シェフ　コディル" },
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
    return { text: "LUNAS", bgColor: "#059669", textColor: "#fff" };
  } else if (s.includes("batal")) {
    return { text: "DIBATALKAN", bgColor: "#dc2626", textColor: "#fff" };
  } else {
    return { text: "TAGIHAN", bgColor: "#f59e0b", textColor: "#fff" };
  }
};

function getFlagComponent(flagEmoji?: string, size = "4.2mm") {
  const style = { width: size, height: size };
  if (flagEmoji === "🇮🇩") return <FlagID style={style} />;
  if (flagEmoji === "🇯🇵") return <FlagJP style={style} />;
  if (flagEmoji === "🇸🇬") return <FlagSG style={style} />;
  if (flagEmoji === "🇲🇾") return <FlagMY style={style} />;
  return <span style={{ fontSize: "3mm", lineHeight: 1 }}>📍</span>;
}

// --- ROUTE PARSER HELPERS ---
function parseRoute(routeStr?: string) {
  if (!routeStr) return null;
  const parts = routeStr.split(/\s*(?:-|->|>|TO|—|→)\s*/i);

  const getCountryInfo = (name: string) => {
    const norm = name.trim().toUpperCase();
    if (norm.includes("INDO") || norm === "ID") return { label: "Indonesia", code: "IDN", flag: "🇮🇩" };
    if (norm.includes("JEPANG") || norm.includes("JAPAN") || norm === "JP") return { label: "Jepang", code: "JPN", flag: "🇯🇵" };
    if (norm.includes("SINGAPUR") || norm === "SG" || norm === "SGP") return { label: "Singapura", code: "SGP", flag: "🇸🇬" };
    if (norm.includes("MALAYSIA") || norm === "MY" || norm === "MYS") return { label: "Malaysia", code: "MYS", flag: "🇲🇾" };
    return { label: name.trim(), code: name.trim().slice(0, 3).toUpperCase(), flag: "📍" };
  };

  if (parts.length >= 2) {
    return {
      from: getCountryInfo(parts[0]),
      to: getCountryInfo(parts[1]),
      isSplit: true
    };
  }
  return {
    single: getCountryInfo(routeStr),
    isSplit: false
  };
}

// --- TEXT SANITIZER ---
// Strips control characters (e.g. vertical tab \u000b from pasted WhatsApp/Word text)
// that are invalid in XML and break html-to-image's SVG serialization,
// causing the exported <img> to silently fail to decode.
function sanitizeText(value?: string | null): string {
  if (!value) return "";
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, " ");
}

// --- BRAND COLORS ---
const NAVY = "#0c2a4a";
const GOLD = "#f59e0b";
const GOLD_LIGHT = "#fef3c7";

function parseInvoiceItems(rawText?: string | null): string[] {
  if (!rawText) return [];
  const clean = sanitizeText(rawText).trim();
  let lines = clean.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  if (lines.length === 1 && (clean.match(/\(x\d+\)/g) || []).length > 1) {
    const splitByQty = clean
      .split(/(?<=\))\s+(?=[A-Z0-9])/g)
      .map((s) => s.trim())
      .filter(Boolean);
    if (splitByQty.length > 1) {
      lines = splitByQty;
    }
  }
  return lines;
}

// --- SUB-COMPONENT: Invoice Paper (Pure UI) ---
const InvoicePaper = React.forwardRef(
  ({ order, items, customer, totals, grandTotal, badge, unitPrice }: any, ref: any) => {
    const invoiceNo = `INV/${(order as any).no || "NEW"}/${new Date().getFullYear()}`;
    const invoiceDate = order.tanggal
      ? new Date(order.tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
      : new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

    return (
      <div
        ref={ref}
        className="bg-white text-slate-900 relative"
        style={{
          width: "210mm",
          minHeight: "297mm",
          boxSizing: "border-box",
          fontFamily: "'Segoe UI', system-ui, sans-serif",
        }}
      >
        {/* ===== HEADER AREA (NAVY) ===== */}
        <div
          style={{
            background: `linear-gradient(135deg, ${NAVY} 0%, #1a3f6f 60%, #0c2a4a 100%)`,
            padding: "8mm 15mm 6mm 15mm",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Decorative circles */}
          <div style={{
            position: "absolute", top: "-30mm", right: "-20mm",
            width: "70mm", height: "70mm",
            borderRadius: "50%",
            background: "rgba(245,158,11,0.08)",
          }} />
          <div style={{
            position: "absolute", bottom: "-20mm", left: "30mm",
            width: "45mm", height: "45mm",
            borderRadius: "50%",
            background: "rgba(255,255,255,0.04)",
          }} />

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative" }}>
            {/* Left: Logo + Brand */}
            <div style={{ display: "flex", alignItems: "center", gap: "6mm" }}>
              <div style={{
                width: "14mm", height: "14mm",
                borderRadius: "3mm",
                overflow: "hidden",
                background: "rgba(255,255,255,0.1)",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                <img
                  src={logoImage}
                  alt="Logo"
                  crossOrigin="anonymous"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
              <div>
                <div style={{ fontSize: "5.5mm", fontWeight: 900, color: "#fff", letterSpacing: "1px", lineHeight: 1 }}>
                  Nihong Jastip
                </div>
                <div style={{ fontSize: "2.6mm", color: "rgba(255,255,255,0.6)", marginTop: "1mm", letterSpacing: "0.5px" }}>
                  Pengiriman Internasional Indonesia — Jepang
                </div>
                <div style={{ display: "flex", gap: "3mm", marginTop: "2mm", flexWrap: "wrap" }}>
                  {[
                    { icon: "📱", text: "0851-5677-5933" },
                    { icon: "✉️", text: "jastipnihong@gmail.com" },
                    { icon: "📍", text: "Depok, Jawa Barat" },
                  ].map((item, i) => (
                    <span key={i} style={{ fontSize: "2.4mm", color: "rgba(255,255,255,0.7)", display: "flex", alignItems: "center", gap: "1.5mm" }}>
                      <span>{item.icon}</span>{item.text}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Invoice Title + Meta */}
            <div style={{ textAlign: "right" }}>
              <div style={{
                fontSize: "7.5mm", fontWeight: 900, color: GOLD,
                letterSpacing: "3px", lineHeight: 1, textTransform: "uppercase",
              }}>
                INVOICE
              </div>
              <div style={{
                display: "inline-block",
                background: "rgba(245,158,11,0.15)",
                border: `1px solid ${GOLD}40`,
                borderRadius: "1.5mm",
                padding: "1mm 2.5mm",
                marginTop: "1.5mm",
              }}>
                <span style={{ fontSize: "2.6mm", color: GOLD, fontWeight: 700, fontFamily: "monospace", letterSpacing: "0.5px" }}>
                  {invoiceNo}
                </span>
              </div>
              <div style={{ marginTop: "1.5mm", fontSize: "2.6mm", color: "rgba(255,255,255,0.6)" }}>
                Tanggal: <span style={{ color: "#fff", fontWeight: 600 }}>{invoiceDate}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ===== GOLD ACCENT LINE ===== */}
        <div style={{ height: "1mm", background: `linear-gradient(90deg, ${GOLD}, #f97316, ${GOLD})` }} />

        {/* ===== BODY ===== */}
        <div style={{ padding: "6mm 15mm" }}>

          {/* Bill To & Shipment Row */}
          <div style={{ marginBottom: "6mm" }}>
            <div style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderLeft: `4px solid ${NAVY}`,
              borderRadius: "0 2mm 2mm 0",
              padding: "4mm 5mm",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "stretch",
            }}>
              {/* Left Column: Customer Info */}
              <div style={{ flex: 1, paddingRight: "5mm" }}>
                <div style={{ fontSize: "2.4mm", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "1.5mm" }}>
                  Ditagihkan Kepada
                </div>
                <div style={{ fontSize: "4.5mm", fontWeight: 800, color: NAVY, lineHeight: 1.2 }}>
                  {sanitizeText(order.namaPelanggan)}
                </div>
                {customer?.alamat && (
                  <div style={{ fontSize: "2.8mm", color: "#64748b", marginTop: "1mm", lineHeight: 1.3 }}>
                    {sanitizeText(customer.alamat)}
                  </div>
                )}
                {customer?.telpon && (
                  <div style={{ fontSize: "2.8mm", color: "#64748b", marginTop: "0.8mm" }}>
                    📱 {sanitizeText(customer.telpon)}
                  </div>
                )}
              </div>

              {/* Vertical Divider */}
              <div style={{ borderLeft: "1px dashed #cbd5e1", margin: "0 2mm" }} />

              {/* Right Column: Shipment Details */}
              <div style={{ width: "75mm", paddingLeft: "5mm", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <div style={{ fontSize: "2.4mm", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "1.5mm" }}>
                  Rute & Pengiriman
                </div>
                {(() => {
                  const parsedRoute = parseRoute((order as any).pengiriman);
                  return parsedRoute ? (
                    <div style={{
                      background: "#ffffff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "2.2mm",
                      padding: "2.2mm 3mm",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
                    }}>
                      {parsedRoute.isSplit ? (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative" }}>
                          {/* From Country */}
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", width: "22mm" }}>
                            <span style={{ fontSize: "1.8mm", color: "#94a3b8", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.5px" }}>DARI</span>
                            <span style={{ display: "flex", alignItems: "center", gap: "1.2mm", fontSize: "3mm", fontWeight: 800, color: NAVY, marginTop: "0.5mm", whiteSpace: "nowrap" }}>
                              {getFlagComponent(parsedRoute.from?.flag, "4.2mm")}
                              <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{parsedRoute.from?.label}</span>
                            </span>
                            <span style={{ fontSize: "2mm", color: "#64748b", fontWeight: 600, fontFamily: "monospace", marginTop: "0.2mm" }}>
                              {parsedRoute.from?.code}
                            </span>
                          </div>

                          {/* Flight path line with airplane */}
                          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 1.5mm", position: "relative" }}>
                            <div style={{
                              width: "100%",
                              height: "0.4mm",
                              background: `linear-gradient(90deg, ${GOLD} 0%, ${NAVY} 50%, ${GOLD} 100%)`,
                              position: "relative",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center"
                            }}>
                              <span style={{
                                position: "absolute",
                                fontSize: "3mm",
                                color: GOLD,
                                background: "#fff",
                                padding: "0 0.8mm",
                                transform: "translateY(-0.2mm)",
                                lineHeight: 1
                              }}>
                                ✈
                              </span>
                            </div>
                            <span style={{ fontSize: "1.6mm", color: "#94a3b8", fontWeight: 700, marginTop: "1.2mm", letterSpacing: "0.5px" }}>KARGO UDARA</span>
                          </div>

                          {/* To Country */}
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", width: "22mm", textAlign: "right" }}>
                            <span style={{ fontSize: "1.8mm", color: "#94a3b8", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.5px" }}>KE</span>
                            <span style={{ display: "flex", alignItems: "center", gap: "1.2mm", fontSize: "3mm", fontWeight: 800, color: NAVY, marginTop: "0.5mm", whiteSpace: "nowrap", justifyContent: "flex-end", width: "100%" }}>
                              <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{parsedRoute.to?.label}</span>
                              {getFlagComponent(parsedRoute.to?.flag, "4.2mm")}
                            </span>
                            <span style={{ fontSize: "2mm", color: "#64748b", fontWeight: 600, fontFamily: "monospace", marginTop: "0.2mm" }}>
                              {parsedRoute.to?.code}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: "flex", alignItems: "center", gap: "2mm" }}>
                          {getFlagComponent(parsedRoute.single?.flag, "4.5mm")}
                          <div style={{ display: "flex", flexDirection: "column" }}>
                            <span style={{ fontSize: "1.8mm", color: "#94a3b8", textTransform: "uppercase", fontWeight: 700 }}>Rute</span>
                            <span style={{ fontSize: "3mm", fontWeight: 800, color: NAVY, marginTop: "0.2mm" }}>
                              {parsedRoute.single?.label}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ fontSize: "2.8mm", color: "#94a3b8", fontStyle: "italic" }}>
                      Tidak ada informasi rute
                    </div>
                  );
                })()}
                {order.namaJastiper && (
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "1.5mm",
                    marginTop: "2mm",
                    fontSize: "2.6mm",
                    color: "#64748b",
                  }}>
                    <span style={{ color: GOLD }}>👤</span>
                    <span>Jastiper: <strong style={{ color: NAVY, fontWeight: 700 }}>{sanitizeText(order.namaJastiper)}</strong></span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ===== ITEMS TABLE ===== */}
          <div style={{ marginBottom: "8mm" }}>
            {/* Table Header */}
            <div style={{
              display: "flex",
              background: NAVY,
              borderRadius: "2mm 2mm 0 0",
              padding: "3mm 5mm",
              gap: "2mm",
            }}>
              <div style={{ flex: "1", fontSize: "2.6mm", fontWeight: 700, color: "#fff", textTransform: "uppercase", letterSpacing: "0.8px" }}>
                Deskripsi Barang
              </div>
              <div style={{ width: "20mm", fontSize: "2.6mm", fontWeight: 700, color: "#fff", textAlign: "right", textTransform: "uppercase", letterSpacing: "0.8px" }}>
                Berat (Kg)
              </div>
              <div style={{ width: "35mm", fontSize: "2.6mm", fontWeight: 700, color: GOLD, textAlign: "right", textTransform: "uppercase", letterSpacing: "0.8px" }}>
                Total ({totals.currency})
              </div>
            </div>

            {/* Table Rows */}
            <div style={{ border: "1px solid #e2e8f0", borderTop: "none", borderRadius: "0 0 2mm 2mm", overflow: "hidden" }}>
              {items.map((item: any, idx: number) => {
                const d = compute(item, unitPrice);
                const isEven = idx % 2 === 1;
                return (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      padding: "4mm 5mm",
                      gap: "2mm",
                      background: isEven ? "#f8fafc" : "#fff",
                      borderBottom: idx < items.length - 1 ? "1px solid #e2e8f0" : "none",
                      alignItems: "stretch",
                    }}
                  >
                    <div style={{ flex: "1", minWidth: 0 }}>
                      {(() => {
                        const subItems = parseInvoiceItems(item.namaBarang);
                        if (subItems.length > 1) {
                          return (
                            <div style={{
                              display: "flex",
                              flexDirection: "column",
                              borderLeft: "0.7mm solid #dbeafe",
                              paddingLeft: "3mm",
                            }}>
                              {subItems.map((sub, sIdx) => {
                                const qtyMatch = sub.match(/\(x(\d+)\)/i);
                                const qty = qtyMatch ? qtyMatch[1] : null;
                                return (
                                  <div
                                    key={sIdx}
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "2mm",
                                      minHeight: "7mm",
                                      padding: "1.1mm 0",
                                      borderBottom: sIdx < subItems.length - 1
                                        ? "1px solid #e2e8f0"
                                        : "none",
                                    }}
                                  >
                                    <span
                                      style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        width: "4.8mm",
                                        height: "4.8mm",
                                        borderRadius: "50%",
                                        background: "#eff6ff",
                                        border: "1px solid #bfdbfe",
                                        color: NAVY,
                                        fontSize: "2.2mm",
                                        fontWeight: 800,
                                        flexShrink: 0,
                                      }}
                                    >
                                      {sIdx + 1}
                                    </span>
                                    <div style={{ flex: 1, minWidth: 0, fontSize: "3.1mm", fontWeight: 700, color: "#1e293b", lineHeight: 1.35 }}>
                                      {sanitizeText(sub)}
                                    </div>
                                    {qty && (
                                      <span
                                        style={{
                                          fontSize: "2.3mm",
                                          fontWeight: 800,
                                          color: "#b45309",
                                          background: "#fffbeb",
                                          border: "1px solid #fde68a",
                                          padding: "0.5mm 1.5mm",
                                          borderRadius: "999px",
                                          flexShrink: 0,
                                        }}
                                      >
                                        {qty} pcs
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          );
                        }
                        return (
                          <div style={{ fontSize: "3.2mm", fontWeight: 700, color: "#1e293b", wordBreak: "break-word", whiteSpace: "pre-line", lineHeight: 1.35 }}>
                            {sanitizeText(item.namaBarang)}
                          </div>
                        );
                      })()}
                      {item.catatan && (
                        <div style={{
                          display: "flex",
                          gap: "1.5mm",
                          alignItems: "flex-start",
                          fontSize: "2.5mm",
                          color: "#64748b",
                          marginTop: "2mm",
                          paddingTop: "1.8mm",
                          borderTop: "1px dashed #cbd5e1",
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                        }}>
                          <span style={{ color: GOLD, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.4px" }}>
                            Catatan
                          </span>
                          <span>{sanitizeText(item.catatan)}</span>
                        </div>
                      )}
                    </div>
                    <div style={{
                      width: "20mm",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "flex-end",
                      fontSize: "3mm",
                      color: "#64748b",
                      fontVariantNumeric: "tabular-nums",
                      textAlign: "right",
                    }}>
                      {d.kg} Kg
                    </div>
                    <div style={{
                      width: "35mm",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "flex-end",
                      fontSize: "3.4mm",
                      fontWeight: 800,
                      color: NAVY,
                      fontVariantNumeric: "tabular-nums",
                      textAlign: "right",
                    }}>
                      {formatCurrency(d.lineTotal, d.currency)}
                    </div>
                  </div>
                );
              })}

              {items.length === 0 && (
                <div style={{ padding: "10mm", textAlign: "center", color: "#94a3b8", fontSize: "3mm" }}>
                  Tidak ada item
                </div>
              )}
            </div>
          </div>

          {/* ===== FOOTER SECTION ===== */}
          <div style={{ display: "flex", gap: "10mm", alignItems: "flex-start" }}>

            {/* Left: Bank Info */}
            <div style={{ flex: "1" }}>
              <div style={{
                fontSize: "2.8mm", fontWeight: 700, color: NAVY,
                textTransform: "uppercase", letterSpacing: "1px",
                marginBottom: "3mm",
                display: "flex", alignItems: "center", gap: "2mm",
              }}>
                <span style={{ display: "inline-block", width: "4mm", height: "0.6mm", background: GOLD, borderRadius: "1mm" }} />
                Metode Pembayaran
              </div>
              <div style={{ fontSize: "2.6mm", color: "#64748b", marginBottom: "3mm" }}>
                Mohon transfer ke salah satu rekening berikut:
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "2.5mm" }}>
                {BANK_ACCOUNTS.map((acc, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: "#fff",
                      border: "1px solid #e2e8f0",
                      borderLeft: `3px solid ${GOLD}`,
                      borderRadius: "0 2mm 2mm 0",
                      padding: "3mm 4mm",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "3mm", fontWeight: 800, color: NAVY }}>{acc.bank}</div>
                      <div style={{ fontSize: "2.4mm", color: "#94a3b8", marginTop: "0.5mm" }}>a/n {acc.name}</div>
                    </div>
                    <div style={{ fontSize: "3mm", fontWeight: 700, color: "#334155", fontFamily: "monospace", letterSpacing: "0.5px" }}>
                      {acc.number}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Totals + Stamp */}
            <div style={{ width: "65mm", flexShrink: 0 }}>
              {/* Summary Box */}
              <div style={{
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "2mm",
                overflow: "hidden",
              }}>
                <div style={{ padding: "3mm 4mm", borderBottom: "1px solid #e2e8f0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "2.8mm", color: "#64748b", fontWeight: 500 }}>Subtotal</span>
                    <span style={{ fontSize: "3mm", fontFamily: "monospace", color: "#334155", fontWeight: 600 }}>
                      {formatCurrency(totals.subtotal, totals.currency)}
                    </span>
                  </div>
                </div>
                <div style={{
                  padding: "4mm",
                  background: NAVY,
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                  <span style={{ fontSize: "3.5mm", fontWeight: 800, color: "#fff", letterSpacing: "1px" }}>TOTAL</span>
                  <span style={{ fontSize: "4.5mm", fontWeight: 900, color: GOLD, fontFamily: "monospace" }}>
                    {formatCurrency(grandTotal, totals.currency)}
                  </span>
                </div>
              </div>

              {/* Signature + Stamp Area */}
              <div style={{ marginTop: "12mm", textAlign: "center", position: "relative" }}>
                {/* Cap Nihong */}
                <div style={{
                  position: "absolute",
                  top: "-10mm",
                  left: "50%",
                  transform: "translateX(-50%)",
                  opacity: 0.72,
                  mixBlendMode: "multiply" as any,
                  zIndex: 2,
                }}>
                  {stampImage && (
                    <img
                      src={stampImage}
                      alt="Stamp"
                      crossOrigin="anonymous"
                      style={{ width: "32mm", height: "32mm", objectFit: "contain", transform: "rotate(10deg)" }}
                    />
                  )}
                </div>

                {/* Status ghost text — below the cap, like ink impression */}
                <div style={{
                  position: "absolute",
                  top: "10mm",
                  left: "50%",
                  transform: "translateX(-50%) rotate(-5deg)",
                  opacity: 0.18,
                  mixBlendMode: "multiply" as any,
                  whiteSpace: "nowrap",
                  zIndex: 1,
                  pointerEvents: "none",
                }}>
                  <div style={{
                    fontSize: "14mm",
                    fontWeight: 900,
                    color: badge.bgColor,
                    letterSpacing: "4px",
                    textTransform: "uppercase",
                    fontFamily: "'Arial Black', 'Impact', sans-serif",
                  }}>
                    {badge.text}
                  </div>
                </div>

                <div style={{ height: "24mm" }} />
                <div style={{
                  borderTop: "1px solid #94a3b8",
                  paddingTop: "2mm",
                  width: "70%",
                  margin: "0 auto",
                }}>
                  <div style={{ fontSize: "2.4mm", fontWeight: 700, color: NAVY, textTransform: "uppercase", letterSpacing: "1px" }}>
                    Nihong Jastip Admin
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ===== FOOTER BAR ===== */}
        <div style={{
          position: "absolute",
          bottom: 0, left: 0, right: 0,
          background: `linear-gradient(135deg, ${NAVY}, #1a3f6f)`,
          padding: "4mm 15mm",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <div style={{ fontSize: "2.6mm", color: "rgba(255,255,255,0.6)", letterSpacing: "0.5px" }}>
            🌸 Terima kasih telah menggunakan layanan Nihong Jastip
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "2mm" }}>
            <div style={{ width: "3mm", height: "3mm", borderRadius: "50%", background: GOLD, opacity: 0.8 }} />
            <div style={{ fontSize: "2.4mm", color: "rgba(255,255,255,0.5)" }}>nihongjastip.com</div>
          </div>
        </div>

        {/* Bottom Padding for footer */}
        <div style={{ height: "18mm" }} />
      </div>
    );
  },
);

// --- IMAGE-READY HELPER (fixes intermittent toPng "error" events) ---
async function waitForImages(container: HTMLElement, timeoutMs = 3000) {
  const imgs = Array.from(container.querySelectorAll("img"));
  await Promise.all(
    imgs.map((img) => {
      if (img.complete && img.naturalWidth !== 0) return Promise.resolve();
      return new Promise<void>((resolve) => {
        const done = () => resolve();
        img.addEventListener("load", done, { once: true });
        img.addEventListener("error", done, { once: true }); // don't hang the whole export on one broken img
        setTimeout(done, timeoutMs); // safety net
      });
    }),
  );
}

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
  const hiddenPrintRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewScale, setPreviewScale] = useState(1);

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      if (w < 820) {
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

  const items = useMemo(() => {
    const pool = orders || [];
    if (itemIds && itemIds.length) {
      const set = new Set(itemIds);
      return pool.filter((o) => set.has(o.id || ""));
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

  async function downloadPDF() {
    if (!hiddenPrintRef.current) return;
    setIsGenerating(true);
    try {
      const elementToCapture = hiddenPrintRef.current;

      // Wait for the layout to settle, then make sure every <img>
      // inside the capture target has actually finished loading
      // (this is what was throwing the sporadic "error" Event on <img>).
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      await waitForImages(elementToCapture);

      const imgData = await toPng(elementToCapture, {
        backgroundColor: "#ffffff",
        pixelRatio: 2,
        cacheBust: true,
      });
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

      const fileName = `Invoice_${(order as any).no || "NJ"}_${(order.namaPelanggan || "Pelanggan").replace(/\s+/g, "_")}.pdf`;
      pdf.save(fileName);
    } catch (err) {
      console.error("PDF Error", err);
      alert("Gagal membuat PDF. Silakan coba lagi.");
    } finally {
      setIsGenerating(false);
    }
  }

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
      {/* 1. PREVIEW AREA */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden flex justify-center bg-slate-300/60 relative py-8">
        <div
          className="origin-top shadow-2xl transition-transform duration-200"
          style={{ transform: `scale(${previewScale})` }}
        >
          <InvoicePaper {...paperProps} />
        </div>
      </div>

      {/* 2. GHOST ELEMENT (FOR PDF) */}
      <div style={{ position: "fixed", top: 0, left: "-9999px", zIndex: -1 }}>
        <div ref={hiddenPrintRef}>
          <InvoicePaper {...paperProps} />
        </div>
      </div>

      {/* BOTTOM ACTION BAR */}
      <div className="bg-white border-t border-slate-200 p-4 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] safe-area-bottom">
        <div className="max-w-2xl mx-auto flex gap-3">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isGenerating}
            className="flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Tutup
          </Button>
          <Button
            onClick={downloadPDF}
            disabled={isGenerating}
            className="flex-[2] text-white flex items-center justify-center gap-2 shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
            style={{ background: NAVY }}
          >
            {isGenerating ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Memproses...</span>
              </>
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
