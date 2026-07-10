import { useEffect, useState } from "react";
import { Input } from "./Input";

const formatJPY = (n: number) => {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    minimumFractionDigits: 0,
  }).format(Math.max(0, Math.floor(n || 0)));
};

const formatIDR = (n: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Math.max(0, Math.floor(n || 0)));
};

export function RupiahInput({
  label,
  value,
  onChange,
  disabled,
  className,
  currency = "IDR",
  placeholder,
}: {
  label: string;
  value: number;
  onChange: (val: number) => void;
  disabled?: boolean;
  className?: string;
  currency?: "IDR" | "JPY";
  placeholder?: string;
}) {
  const fmt = (n: number) => {
    if (currency === "JPY") return formatJPY(n);
    return formatIDR(n);
  };

  const [text, setText] = useState<string>(value ? fmt(value) : "");

  useEffect(() => {
    setText(value ? fmt(value) : "");
  }, [value, currency]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value ?? "";
    const digits = raw.replace(/[^\d]/g, "");

    if (!digits) {
      setText("");
      onChange(0);
      return;
    }

    const n = Number(digits);
    setText(fmt(n));
    onChange(n);
  };

  const activePlaceholder = placeholder || (currency === "JPY" ? "¥ 0" : "Rp 0");

  return (
    <Input
      label={label}
      type="text"
      value={text}
      onChange={handleChange}
      disabled={disabled}
      placeholder={activePlaceholder}
      className={className}
    />
  );
}
