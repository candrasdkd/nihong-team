function groupSubscriber(digits: string, prefixLength: number) {
  const prefix = digits.slice(0, prefixLength);
  const rest = digits.slice(prefixLength);
  if (!rest) return prefix;
  if (rest.length <= 4) return `${prefix}-${rest}`;
  if (rest.length <= 8) {
    return `${prefix}-${rest.slice(0, -4)}-${rest.slice(-4)}`;
  }
  return `${prefix}-${rest.slice(0, 4)}-${rest.slice(4, 8)}-${rest.slice(8)}`;
}

/** Format nomor untuk tampilan tanpa mengubah nilai asli yang tersimpan. */
export function formatPhoneDisplay(raw?: string) {
  const value = raw?.trim() ?? "";
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";

  if (digits.startsWith("62") && digits.length >= 10) {
    return `+62 ${groupSubscriber(digits.slice(2), 3)}`;
  }

  if (digits.startsWith("81") && digits.length >= 10) {
    return `+81 ${groupSubscriber(digits.slice(2), 2)}`;
  }

  if (/^0(?:70|80|90)/.test(digits) && digits.length === 11) {
    return `+81 ${groupSubscriber(digits.slice(1), 2)}`;
  }

  if (digits.startsWith("0")) {
    return `+62 ${groupSubscriber(digits.slice(1), 3)}`;
  }

  if (digits.startsWith("8") && digits.length >= 9) {
    return `+62 ${groupSubscriber(digits, 3)}`;
  }

  if (value.startsWith("+")) {
    return `+${digits.match(/.{1,4}/g)?.join("-") ?? digits}`;
  }

  return digits.match(/.{1,4}/g)?.join("-") ?? digits;
}
