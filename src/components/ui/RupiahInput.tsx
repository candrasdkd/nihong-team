import React, { useEffect, useState, useRef, forwardRef, useImperativeHandle } from "react";
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

export const RupiahInput = forwardRef<
  HTMLInputElement,
  {
    label?: string;
    value: number;
    onChange: (val: number) => void;
    disabled?: boolean;
    className?: string;
    currency?: "IDR" | "JPY";
    placeholder?: string;
    id?: string;
  }
>(function RupiahInput(
  {
    label = "",
    value,
    onChange,
    disabled,
    className,
    currency = "IDR",
    placeholder,
    ...props
  },
  forwardedRef
) {
  const internalRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(forwardedRef, () => internalRef.current as HTMLInputElement);

  const fmt = (n: number) => {
    if (currency === "JPY") return formatJPY(n);
    return formatIDR(n);
  };

  const [text, setText] = useState<string>(value ? fmt(value) : "");

  useEffect(() => {
    const formatted = value ? fmt(value) : "";
    setText(formatted);
    if (internalRef.current && internalRef.current.value !== formatted) {
      internalRef.current.value = formatted;
    }
  }, [value, currency]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow navigation, modifier shortcuts, backspace, delete, tab, enter
    if (
      e.key === "Backspace" ||
      e.key === "Delete" ||
      e.key === "Tab" ||
      e.key === "Enter" ||
      e.key === "Escape" ||
      e.key === "ArrowLeft" ||
      e.key === "ArrowRight" ||
      e.key === "ArrowUp" ||
      e.key === "ArrowDown" ||
      e.key === "Home" ||
      e.key === "End" ||
      e.key === "PageUp" ||
      e.key === "PageDown" ||
      e.ctrlKey ||
      e.metaKey ||
      e.altKey
    ) {
      return;
    }

    // Block any non-digit character (allow only 0-9)
    if (!/^\d$/.test(e.key)) {
      e.preventDefault();
    }
  };

  const handleBeforeInput = (e: React.FormEvent<HTMLInputElement> & { data?: string | null }) => {
    if (e.data && !/^\d+$/.test(e.data)) {
      e.preventDefault();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData?.getData("text") || "";
    // If the pasted string contains no digits, block paste
    if (!/\d/.test(pasted)) {
      e.preventDefault();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value ?? "";
    const digits = raw.replace(/[^\d]/g, "");

    if (!digits || Number(digits) === 0) {
      setText("");
      if (internalRef.current) {
        internalRef.current.value = "";
      }
      onChange(0);
      return;
    }

    const n = Number(digits);
    const formatted = fmt(n);
    setText(formatted);
    if (internalRef.current) {
      internalRef.current.value = formatted;
    }
    onChange(n);
  };

  const activePlaceholder = placeholder || (currency === "JPY" ? "¥ 0" : "Rp 0");

  return (
    <Input
      ref={internalRef}
      label={label}
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      data-keyboard-type="numeric"
      value={text}
      onKeyDown={handleKeyDown}
      onBeforeInput={handleBeforeInput}
      onPaste={handlePaste}
      onChange={handleChange}
      disabled={disabled}
      placeholder={activePlaceholder}
      className={className}
      {...props}
    />
  );
});
