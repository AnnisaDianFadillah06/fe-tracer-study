import { useCallback, useState } from "react";

const KEY = "insight.advanced";

function read(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Mode analisis lanjutan halaman Insight (slice, dice, roll-up). Mati bawaan;
 * pilihan diingat per peramban. Tanpa localStorage tetap berfungsi untuk
 * sesi berjalan.
 */
export function useAdvancedMode(): [boolean, (on: boolean) => void] {
  const [advanced, setState] = useState(read);

  const setAdvanced = useCallback((on: boolean) => {
    setState(on);
    try {
      localStorage.setItem(KEY, on ? "1" : "0");
    } catch {
      /* penyimpanan tidak tersedia: cukup berlaku untuk sesi ini */
    }
  }, []);

  return [advanced, setAdvanced];
}
