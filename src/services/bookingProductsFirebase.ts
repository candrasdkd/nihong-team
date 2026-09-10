import { doc, getDoc, onSnapshot, runTransaction } from "firebase/firestore";
import { db } from "../lib/firebase";
import type { PreOrder } from "../types";
import { applyCustomerProducts, type CustomerProductDraft } from "../utils/bookingProducts";

const LINKS = "booking_product_links";
const validToken = (token: string) => /^[a-f0-9]{48}$/.test(token);
const invalid = () => new Error("Link produk tidak aktif. Minta link baru kepada admin.");
type ProductLink = { bookingId: string; customerId: string };

export function createBookingProductToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(24)), byte => byte.toString(16).padStart(2, "0")).join("");
}

export async function ensureBookingProductLink(bookingId: string) {
  const token = createBookingProductToken();
  return runTransaction(db, async transaction => {
    const bookingRef = doc(db, "pre_orders", bookingId);
    const snap = await transaction.get(bookingRef);
    if (!snap.exists()) throw invalid();
    const booking = snap.data() as PreOrder;
    if (!booking.idPelanggan) throw new Error("Booking belum terhubung ke customer.");
    if (booking.productShareToken && validToken(booking.productShareToken)) {
      const existing = await transaction.get(doc(db, LINKS, booking.productShareToken));
      if (existing.exists() && existing.data().customerId === booking.idPelanggan && existing.data().bookingId === bookingId) {
        return booking.productShareToken;
      }
    }
    transaction.set(doc(db, LINKS, token), {
      bookingId, customerId: booking.idPelanggan, createdAt: Date.now(),
    });
    transaction.update(bookingRef, { productShareToken: token, updatedAt: Date.now() });
    return token;
  });
}

export async function revokeBookingProductLink(bookingId: string) {
  await runTransaction(db, async transaction => {
    const ref = doc(db, "pre_orders", bookingId);
    const snap = await transaction.get(ref);
    if (!snap.exists()) throw invalid();
    const token = snap.data().productShareToken;
    if (typeof token === "string" && validToken(token)) transaction.delete(doc(db, LINKS, token));
    transaction.update(ref, { productShareToken: "", updatedAt: Date.now() });
  });
}

function matches(booking: PreOrder, link: ProductLink, token: string) {
  return booking.productShareToken === token && booking.idPelanggan === link.customerId;
}

// Never subscribe to the full booking/customer collections on the public page.
export function listenPublicBookingProducts(
  token: string, onData: (booking: PreOrder | null) => void, onError: (error: Error) => void,
) {
  let stopped = false;
  let unsubscribe = () => {};
  if (!validToken(token)) { onData(null); return unsubscribe; }
  getDoc(doc(db, LINKS, token)).then(snap => {
    if (stopped) return;
    if (!snap.exists()) { onData(null); return; }
    const link = snap.data() as ProductLink;
    unsubscribe = onSnapshot(doc(db, "pre_orders", link.bookingId), bookingSnap => {
      if (stopped) return;
      const booking = bookingSnap.exists() ? { ...bookingSnap.data(), id: bookingSnap.id } as PreOrder : null;
      onData(booking && matches(booking, link, token) ? booking : null);
    }, onError);
  }).catch(error => { if (!stopped) onError(error); });
  return () => { stopped = true; unsubscribe(); };
}

export async function savePublicBookingProducts(token: string, revision: string, drafts: CustomerProductDraft[]) {
  if (!validToken(token)) throw invalid();
  await runTransaction(db, async transaction => {
    const linkSnap = await transaction.get(doc(db, LINKS, token));
    if (!linkSnap.exists()) throw invalid();
    const link = linkSnap.data() as ProductLink;
    const ref = doc(db, "pre_orders", link.bookingId);
    const snap = await transaction.get(ref);
    if (!snap.exists()) throw invalid();
    const booking = snap.data() as PreOrder;
    if (!matches(booking, link, token)) throw invalid();
    if (booking.status !== "Pending") throw new Error("Booking sudah selesai dan hanya dapat dilihat.");
    const items = applyCustomerProducts(booking.items, revision, drafts);
    transaction.update(ref, { items, updatedAt: Date.now() });
  });
}
