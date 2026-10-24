import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  documentId,
  getDocsFromServer,
  limit as queryLimit,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type QueryDocumentSnapshot,
  type QueryConstraint,
} from "firebase/firestore";
import { auth, db } from "../lib/firebase";

export type ShoppingNoteStatus = "Belum" | "Selesai";
export type ShoppingNoteFilter = "Semua" | ShoppingNoteStatus;
export type ShoppingNoteActiveFilter = "Aktif" | "Nonaktif";
export interface ShoppingNoteCustomer {
  id?: string;
  nama: string;
}

export interface ShoppingNote {
  id: string;
  kategoriPemilik: string;
  pelanggan: ShoppingNoteCustomer | null;
  namaBarang: string;
  jumlah: number;
  satuan: string;
  harga: number;
  status: ShoppingNoteStatus;
  aktif: boolean;
  catatan: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type ShoppingNotePayload = Omit<ShoppingNote, "id" | "createdAt" | "updatedAt">;
export type ShoppingNoteEditableField = "kategoriPemilik" | "pelanggan" | "namaBarang" | "jumlah" | "satuan" | "harga" | "catatan";

export interface ShoppingNotesPageResult {
  rows: ShoppingNote[];
  cursor?: QueryDocumentSnapshot<DocumentData>;
  hasMore: boolean;
}

const shoppingNotesCollection = () => collection(db, "shopping_notes");
const ACTIVE_FLAG_MIGRATION_PAGE_SIZE = 15;
let activeFlagMigrationPromise: Promise<void> | null = null;

async function migrateShoppingNoteActiveFlags(): Promise<void> {
  const userId = auth.currentUser?.uid;
  if (!userId) {
    currentActor();
    return;
  }

  const migrationKey = `shopping-notes-active-v1:${userId}`;
  try {
    if (window.localStorage.getItem(migrationKey) === "done") return;
  } catch {
    // Continue the idempotent migration when browser storage is unavailable.
  }

  let cursor: QueryDocumentSnapshot<DocumentData> | undefined;
  let hasMore = true;
  while (hasMore) {
    const constraints: QueryConstraint[] = [orderBy(documentId(), "asc")];
    if (cursor) constraints.push(startAfter(cursor));
    constraints.push(queryLimit(ACTIVE_FLAG_MIGRATION_PAGE_SIZE));
    const snapshot = await getDocsFromServer(query(shoppingNotesCollection(), ...constraints));
    const legacyDocs = snapshot.docs.filter((item) => typeof item.data().aktif !== "boolean");
    if (legacyDocs.length > 0) {
      const batch = writeBatch(db);
      legacyDocs.forEach((item) => batch.update(item.ref, { aktif: true }));
      await batch.commit();
    }

    cursor = snapshot.docs[snapshot.docs.length - 1];
    hasMore = snapshot.docs.length === ACTIVE_FLAG_MIGRATION_PAGE_SIZE;
  }

  try {
    window.localStorage.setItem(migrationKey, "done");
  } catch {
    // The Firestore flags are already migrated; a later visit can safely retry the scan.
  }
}

/** Backfill older notes once so active/inactive filtering includes existing records. */
export function ensureShoppingNoteActiveFlags(): Promise<void> {
  if (activeFlagMigrationPromise) return activeFlagMigrationPromise;
  const migration = migrateShoppingNoteActiveFlags();
  activeFlagMigrationPromise = migration;
  return migration.finally(() => {
    if (activeFlagMigrationPromise === migration) activeFlagMigrationPromise = null;
  });
}

function currentActor() {
  if (!auth.currentUser) throw new Error("Silakan masuk kembali untuk mengubah catatan belanja.");
  return auth.currentUser.email || auth.currentUser.uid;
}

function cleanPayload(payload: ShoppingNotePayload): ShoppingNotePayload {
  const kategoriPemilik = payload.kategoriPemilik.trim();
  const pelanggan = cleanCustomer(payload.pelanggan);
  const namaBarang = payload.namaBarang.trim();
  const satuan = payload.satuan.trim();
  const catatan = payload.catatan.trim();
  const jumlah = Number(payload.jumlah);
  const harga = Number(payload.harga);

  if (!kategoriPemilik) throw new Error("Kategori atau pemilik wajib diisi.");
  if (!namaBarang) throw new Error("Nama barang wajib diisi.");
  if (!satuan) throw new Error("Satuan wajib diisi.");
  if (!Number.isFinite(jumlah) || jumlah <= 0) throw new Error("Jumlah harus lebih besar dari 0.");
  if (!Number.isFinite(harga) || harga < 0) throw new Error("Harga tidak boleh kurang dari 0.");
  if (payload.status !== "Belum" && payload.status !== "Selesai") throw new Error("Status belanja tidak valid.");
  if (typeof payload.aktif !== "boolean") throw new Error("Status batch harus aktif atau nonaktif.");

  // Explicit field list keeps client input away from audit and timestamp fields.
  return { kategoriPemilik, pelanggan, namaBarang, jumlah, satuan, harga, status: payload.status, aktif: payload.aktif, catatan };
}

function cleanCustomer(value: ShoppingNoteCustomer | null | undefined): ShoppingNoteCustomer | null {
  if (!value) return null;
  const nama = value.nama.trim();
  const id = value.id?.trim();
  if (!nama) throw new Error("Nama pelanggan wajib diisi.");
  return id ? { id, nama } : { nama };
}

function mapShoppingNote(snapshot: QueryDocumentSnapshot<DocumentData>): ShoppingNote {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    kategoriPemilik: String(data.kategoriPemilik || "Tanpa kategori"),
    pelanggan: data.pelanggan && typeof data.pelanggan === "object" && String(data.pelanggan.nama || "").trim()
      ? {
          ...(String(data.pelanggan.id || "").trim() ? { id: String(data.pelanggan.id).trim() } : {}),
          nama: String(data.pelanggan.nama).trim(),
        }
      : null,
    namaBarang: String(data.namaBarang || ""),
    jumlah: Number(data.jumlah || 0),
    satuan: String(data.satuan || ""),
    harga: Number(data.harga || 0),
    status: data.status === "Selesai" ? "Selesai" : "Belum",
    aktif: data.aktif !== false,
    catatan: String(data.catatan || ""),
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

/** Read one server-side page. The document ID is an explicit stable tie-breaker. */
export async function getShoppingNotesPage(
  status: ShoppingNoteFilter = "Semua",
  active = true,
  cursor?: QueryDocumentSnapshot<DocumentData>,
  pageSize = 15,
): Promise<ShoppingNotesPageResult> {
  const constraints: QueryConstraint[] = [where("aktif", "==", active)];
  if (status !== "Semua") constraints.push(where("status", "==", status));
  constraints.push(orderBy("namaBarang", "asc"), orderBy(documentId(), "asc"));
  if (cursor) constraints.push(startAfter(cursor));
  constraints.push(queryLimit(pageSize + 1));

  const snapshot = await getDocsFromServer(query(shoppingNotesCollection(), ...constraints));
  const visibleDocs = snapshot.docs.slice(0, pageSize);
  return {
    rows: visibleDocs.map(mapShoppingNote),
    cursor: visibleDocs[visibleDocs.length - 1],
    hasMore: snapshot.docs.length > pageSize,
  };
}

export function matchesShoppingNoteSearch(note: ShoppingNote, searchText: string): boolean {
  const needle = searchText.trim().toLocaleLowerCase("id-ID");
  if (!needle) return true;
  return [
    note.namaBarang,
    note.kategoriPemilik,
    note.pelanggan?.nama || "",
    note.satuan,
    note.status,
    note.catatan,
  ].some((value) => value.toLocaleLowerCase("id-ID").includes(needle));
}

/** Search all pages in the currently selected batch/status scope after the caller debounces input. */
export async function searchShoppingNotes(
  searchText: string,
  status: ShoppingNoteFilter,
  active: boolean,
  signal?: AbortSignal,
): Promise<ShoppingNote[]> {
  if (!searchText.trim()) return [];

  const matches: ShoppingNote[] = [];
  let cursor: QueryDocumentSnapshot<DocumentData> | undefined;
  let hasMore = true;
  while (hasMore && !signal?.aborted) {
    const page = await getShoppingNotesPage(status, active, cursor, 200);
    if (signal?.aborted) return [];
    matches.push(...page.rows.filter((note) => matchesShoppingNoteSearch(note, searchText)));
    cursor = page.cursor;
    hasMore = page.hasMore;
  }

  return matches;
}

export async function createShoppingNote(payload: ShoppingNotePayload): Promise<void> {
  const actor = currentActor();
  const clean = cleanPayload(payload);
  await addDoc(shoppingNotesCollection(), {
    ...clean,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: actor,
    updatedBy: actor,
  });
}

/** Create a group of shopping notes atomically so quick entry cannot partially save. */
export async function createShoppingNotes(payloads: ShoppingNotePayload[]): Promise<void> {
  const actor = currentActor();
  if (payloads.length === 0) throw new Error("Tambahkan minimal satu barang.");
  if (payloads.length > 450) throw new Error("Maksimal 450 barang dalam satu kali tambah cepat.");

  const cleanedPayloads = payloads.map(cleanPayload);
  const batch = writeBatch(db);
  const notes = shoppingNotesCollection();

  cleanedPayloads.forEach((payload) => {
    const noteRef = doc(notes);
    batch.set(noteRef, {
      ...payload,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: actor,
      updatedBy: actor,
    });
  });

  await batch.commit();
}

export async function updateShoppingNote(id: string, payload: ShoppingNotePayload): Promise<void> {
  const actor = currentActor();
  const clean = cleanPayload(payload);
  await updateDoc(doc(shoppingNotesCollection(), id), {
    ...clean,
    updatedAt: serverTimestamp(),
    updatedBy: actor,
  });
}

export async function updateShoppingNoteStatus(id: string, status: ShoppingNoteStatus): Promise<void> {
  const actor = currentActor();
  if (status !== "Belum" && status !== "Selesai") throw new Error("Status belanja tidak valid.");
  await updateDoc(doc(shoppingNotesCollection(), id), {
    status,
    updatedAt: serverTimestamp(),
    updatedBy: actor,
  });
}

export async function updateShoppingNoteActive(id: string, aktif: boolean): Promise<void> {
  const actor = currentActor();
  if (typeof aktif !== "boolean") throw new Error("Status batch harus aktif atau nonaktif.");
  await updateDoc(doc(shoppingNotesCollection(), id), {
    aktif,
    updatedAt: serverTimestamp(),
    updatedBy: actor,
  });
}

export async function updateShoppingNoteField(
  id: string,
  field: ShoppingNoteEditableField,
  value: string | number | ShoppingNoteCustomer | null,
): Promise<void> {
  const actor = currentActor();
  let cleanValue: string | number | ShoppingNoteCustomer | null = value;

  if (field === "pelanggan") {
    cleanValue = cleanCustomer(value as ShoppingNoteCustomer | null);
  } else if (field === "jumlah" || field === "harga") {
    cleanValue = Number(value);
    if (!Number.isFinite(cleanValue)) throw new Error("Nilai angka tidak valid.");
    if (field === "jumlah" && cleanValue <= 0) throw new Error("Jumlah harus lebih besar dari 0.");
    if (field === "harga" && cleanValue < 0) throw new Error("Harga tidak boleh kurang dari 0.");
  } else {
    cleanValue = String(value).trim();
    if (field !== "catatan" && !cleanValue) {
      throw new Error(field === "kategoriPemilik" ? "Kategori atau pemilik wajib diisi." : field === "namaBarang" ? "Nama barang wajib diisi." : "Satuan wajib diisi.");
    }
  }

  await updateDoc(doc(shoppingNotesCollection(), id), {
    [field]: cleanValue,
    updatedAt: serverTimestamp(),
    updatedBy: actor,
  });
}

export async function deleteShoppingNote(id: string): Promise<void> {
  currentActor();
  await deleteDoc(doc(shoppingNotesCollection(), id));
}
