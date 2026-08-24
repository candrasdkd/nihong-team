export type CurrencyCode = "IDR" | "JPY" | "SGD" | "MYR";

export const formatIDR = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Math.round(n || 0));

const currencyFormatters: Record<CurrencyCode, (n: number) => string> = {
  IDR: (n) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(Math.round(n || 0)),
  JPY: (n) =>
    new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
      minimumFractionDigits: 0,
    }).format(n || 0),
  SGD: (n) =>
    new Intl.NumberFormat("en-SG", {
      style: "currency",
      currency: "SGD",
      maximumFractionDigits: 0,
    }).format(n || 0),
  MYR: (n) =>
    new Intl.NumberFormat("ms-MY", {
      style: "currency",
      currency: "MYR",
      maximumFractionDigits: 0,
    }).format(n || 0),
};

export const formatCurrency = (val: number, currency?: string) => {
  if (currency && currency in currencyFormatters) {
    return currencyFormatters[currency as CurrencyCode](val);
  }
  return formatIDR(val);
};

export const parseSafeDate = (d: any): Date | null => {
  if (!d) return null;
  try {
    if (d instanceof Date) return isNaN(d.getTime()) ? null : d;
    if (typeof d === "object" && typeof d.toDate === "function") return d.toDate();
    if (typeof d === "object" && typeof d.seconds === "number") return new Date(d.seconds * 1000);
    if (typeof d === "number") return new Date(d);
    if (typeof d === "string") {
      const parsed = new Date(d);
      return isNaN(parsed.getTime()) ? null : parsed;
    }
    return null;
  } catch {
    return null;
  }
};

export const formatDate = (d: any) => {
  const dateObj = parseSafeDate(d);
  if (!dateObj) return "-";
  return dateObj.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
};

export const formatDateTime = (d: any) => {
  const dateObj = parseSafeDate(d);
  if (!dateObj) return "-";
  const dateStr = dateObj.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  const timeStr = dateObj.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }).replace(".", ":");
  return `${dateStr} · ${timeStr}`;
};
