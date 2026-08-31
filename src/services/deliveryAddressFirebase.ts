import {
  doc,
  DocumentData,
  getDoc,
  runTransaction,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import {
  Customer,
  DeliveryCountry,
  IndonesiaDeliveryAddress,
  JapanDeliveryAddress,
  PreOrder,
} from "../types";
import {
  cleanJapanDeliveryAddress,
  validateJapanDeliveryAddress,
} from "../utils/deliveryAddress";

const LINK_COLLECTION = "delivery_address_links";
const CUSTOMER_COLLECTION = "customer";
const BOOKING_COLLECTION = "pre_orders";

interface DeliveryAddressLinkRecord {
  bookingId: string;
  customerId: string;
  route: string;
  country: DeliveryCountry;
  createdAt: any;
  usedAt?: any;
  submittedAddress?: IndonesiaDeliveryAddress | JapanDeliveryAddress;
}

export type PublicDeliveryAddressLinkResult =
  | { status: "active"; link: DeliveryAddressLinkRecord; customer: Customer }
  | { status: "used"; link: DeliveryAddressLinkRecord; customer: Customer }
  | { status: "invalid" };

export class PublicDeliveryAddressLinkError extends Error {
  constructor(public readonly code: "invalid" | "used") {
    super(code === "used" ? "Link sudah pernah digunakan." : "Link tidak valid.");
  }
}

export function createDeliveryAddressToken() {
  const bytes = new Uint8Array(24);
  window.crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function createDeliveryAddressLink(
  booking: PreOrder,
  country: DeliveryCountry,
  token = createDeliveryAddressToken(),
) {
  if (!booking.id || !booking.idPelanggan) {
    throw new Error("Booking belum terhubung ke customer.");
  }

  if (!/^[a-f0-9]{48}$/.test(token)) {
    throw new Error("Token link alamat tidak valid.");
  }
  const linkRef = doc(db, LINK_COLLECTION, token);
  const bookingRef = doc(db, BOOKING_COLLECTION, booking.id);
  const batch = writeBatch(db);

  batch.set(linkRef, {
    bookingId: booking.id,
    customerId: booking.idPelanggan,
    route: booking.rute,
    country,
    createdAt: Date.now(),
    usedAt: null,
  } satisfies DeliveryAddressLinkRecord);
  batch.update(bookingRef, {
    deliveryAddressShareToken: token,
    deliveryAddressShareCreatedAt: Date.now(),
    updatedAt: Date.now(),
  });

  await batch.commit();
  return token;
}

export async function getPublicDeliveryAddressLink(
  token: string,
): Promise<PublicDeliveryAddressLinkResult> {
  if (!token) return { status: "invalid" };

  const linkRef = doc(db, LINK_COLLECTION, token);
  const linkSnap = await getDoc(linkRef);
  if (!linkSnap.exists()) return { status: "invalid" };

  const link = linkSnap.data() as DeliveryAddressLinkRecord;

  const [bookingSnap, customerSnap] = await Promise.all([
    getDoc(doc(db, BOOKING_COLLECTION, link.bookingId)),
    getDoc(doc(db, CUSTOMER_COLLECTION, link.customerId)),
  ]);
  if (!customerSnap.exists()) return { status: "invalid" };

  const customer = {
    id: customerSnap.id,
    ...(customerSnap.data() as DocumentData),
  } as Customer;

  if (link.usedAt) return { status: "used", link, customer };
  if (!bookingSnap.exists()) return { status: "invalid" };

  const booking = bookingSnap.data() as PreOrder;
  if (
    booking.deliveryAddressShareToken !== token
    || booking.idPelanggan !== link.customerId
  ) {
    return { status: "invalid" };
  }

  return { status: "active", link, customer };
}

export async function submitPublicDeliveryAddress(
  token: string,
  country: "indonesia",
  address: IndonesiaDeliveryAddress,
): Promise<void>;
export async function submitPublicDeliveryAddress(
  token: string,
  country: "japan",
  address: JapanDeliveryAddress,
): Promise<void>;
export async function submitPublicDeliveryAddress(
  token: string,
  country: DeliveryCountry,
  address: IndonesiaDeliveryAddress | JapanDeliveryAddress,
) {
  let storedAddress = address;
  if (country === "japan") {
    const cleanedAddress = cleanJapanDeliveryAddress(address as JapanDeliveryAddress);
    const validationErrors = validateJapanDeliveryAddress(cleanedAddress);
    const firstError = Object.values(validationErrors)[0];
    if (firstError) throw new Error(firstError);
    storedAddress = cleanedAddress;
  }

  await runTransaction(db, async (transaction) => {
    const linkRef = doc(db, LINK_COLLECTION, token);
    const linkSnap = await transaction.get(linkRef);
    if (!linkSnap.exists()) throw new PublicDeliveryAddressLinkError("invalid");

    const link = linkSnap.data() as DeliveryAddressLinkRecord;
    if (link.usedAt) throw new PublicDeliveryAddressLinkError("used");
    if (link.country !== country) throw new PublicDeliveryAddressLinkError("invalid");

    const bookingRef = doc(db, BOOKING_COLLECTION, link.bookingId);
    const customerRef = doc(db, CUSTOMER_COLLECTION, link.customerId);
    const bookingSnap = await transaction.get(bookingRef);
    const customerSnap = await transaction.get(customerRef);
    if (!bookingSnap.exists() || !customerSnap.exists()) {
      throw new PublicDeliveryAddressLinkError("invalid");
    }

    const booking = bookingSnap.data() as PreOrder;
    if (
      booking.deliveryAddressShareToken !== token
      || booking.idPelanggan !== link.customerId
    ) {
      throw new PublicDeliveryAddressLinkError("invalid");
    }

    const addressField = country === "japan"
      ? "alamatPengirimanJepang"
      : "alamatPengirimanIndonesia";
    transaction.update(customerRef, {
      [addressField]: storedAddress,
      updatedAt: serverTimestamp(),
    });
    transaction.update(linkRef, {
      usedAt: serverTimestamp(),
      submittedAddress: storedAddress,
    });
  });
}
