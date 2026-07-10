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

export const formatDate = (d: string) => {
  if (!d) return "-";
  try {
    return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return d;
  }
};
