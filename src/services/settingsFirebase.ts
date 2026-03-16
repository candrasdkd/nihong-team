import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { AppSettings } from "../types";

const SETTINGS_DOC = "global";

export function subscribeSettings(onUpdate: (data: AppSettings | null) => void) {
  const ref = doc(db, "settings", SETTINGS_DOC);
  return onSnapshot(ref, (snap) => {
    if (snap.exists()) {
      onUpdate(snap.data() as AppSettings);
    } else {
      // If doc doesn't exist yet
      onUpdate(null);
    }
  });
}

export async function updateSettings(updates: Partial<AppSettings>) {
  const ref = doc(db, "settings", SETTINGS_DOC);
  const snap = await getDoc(ref);
  const payload = {
    ...updates,
    updatedAt: new Date().toISOString()
  };

  if (snap.exists()) {
    await setDoc(ref, payload, { merge: true });
  } else {
    await setDoc(ref, payload);
  }
}
