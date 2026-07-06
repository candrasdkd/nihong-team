import React, { createContext, useContext, useEffect, useState } from "react";
import { subscribeSettings } from "../services/settingsFirebase";
import { useAuth } from "./authContext";

interface SettingsContextType {
  unitPrice: number;
  globalJastipYen: number;
  setUnitPrice: React.Dispatch<React.SetStateAction<number>>;
  setGlobalJastipYen: React.Dispatch<React.SetStateAction<number>>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [unitPrice, setUnitPrice] = useState<number>(100_000);
  const [globalJastipYen, setGlobalJastipYen] = useState<number>(1000);

  useEffect(() => {
    if (!user) return;

    const unsub = subscribeSettings((data) => {
      if (data?.jastipYenPerKg) {
        setGlobalJastipYen(data.jastipYenPerKg);
      }
      if (data?.unitPriceIdr) {
        setUnitPrice(data.unitPriceIdr);
      }
    });

    return () => unsub();
  }, [user]);

  return (
    <SettingsContext.Provider value={{ unitPrice, globalJastipYen, setUnitPrice, setGlobalJastipYen }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
