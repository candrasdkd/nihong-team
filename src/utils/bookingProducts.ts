import type { PreOrderItem } from "../types";

export interface CustomerProductDraft {
  originalIndex: number | null;
  namaBarang: string;
}

export function productRevision(items: PreOrderItem[]) {
  return JSON.stringify(items.map(item => [item.namaBarang, item.kategori || "", item.catatan || "", !!item.checked]));
}

export function productDrafts(items: PreOrderItem[]): CustomerProductDraft[] {
  return items.map((item, originalIndex) => ({
    originalIndex, namaBarang: item.namaBarang,
  }));
}

/** Whitelist customer edits; checklist status and other item metadata stay owned by admin. */
export function applyCustomerProducts(
  current: PreOrderItem[],
  expectedRevision: string,
  drafts: CustomerProductDraft[],
): PreOrderItem[] {
  if (productRevision(current) !== expectedRevision) {
    throw new Error("Produk telah diperbarui. Muat data terbaru sebelum menyimpan kembali.");
  }
  if (!Array.isArray(drafts) || drafts.length < 1 || drafts.length > 100) {
    throw new Error("Isi minimal 1 dan maksimal 100 produk.");
  }
  const seen = new Set<number>();
  const result = drafts.map(draft => {
    if (!draft || typeof draft !== "object") throw new Error("Data produk tidak valid.");
    const index = draft.originalIndex;
    if (index !== null && (!Number.isInteger(index) || index < 0 || index >= current.length || seen.has(index))) {
      throw new Error("Data produk tidak valid. Muat data terbaru.");
    }
    if (index !== null) seen.add(index);
    const original = index === null ? undefined : current[index];
    // Completed products cannot be renamed, removed, or have their status reset.
    if (original?.checked) return { ...original };
    const field = (value: unknown, max: number) => {
      if (typeof value !== "string" || value.trim().length > max) throw new Error("Detail produk terlalu panjang atau tidak valid.");
      return value.trim();
    };
    const namaBarang = field(draft.namaBarang, 200);
    if (!namaBarang) throw new Error("Nama setiap produk wajib diisi.");
    return {
      ...original, namaBarang,
      kategori: original?.kategori || "", catatan: original?.catatan || "",
      checked: !!original?.checked,
    };
  });
  if (current.some((item, index) => item.checked && !seen.has(index))) {
    throw new Error("Produk yang sudah selesai tidak dapat dihapus.");
  }
  return result;
}
