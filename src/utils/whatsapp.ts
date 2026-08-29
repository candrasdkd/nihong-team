export function normalizeWhatsAppPhone(value?: string) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = `62${digits.slice(1)}`;
  return digits;
}
