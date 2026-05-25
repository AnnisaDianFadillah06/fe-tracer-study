import { createContext, useContext, useMemo, useState, ReactNode } from "react";

export const ALL = "__all__";

export interface GlobalFiltersState {
  degree: string;
  jurusan: string;
  prodi: string;
  tahunLulus: string; // "all" | year
  week: string;
  setDegree: (v: string) => void;
  setJurusan: (v: string) => void;
  setProdi: (v: string) => void;
  setTahunLulus: (v: string) => void;
  setWeek: (v: string) => void;
  reset: () => void;
}

const Ctx = createContext<GlobalFiltersState | undefined>(undefined);

export const WEEK_OPTIONS = [
  "2026 Mei - Minggu 3",
  "2026 Mei - Minggu 2",
  "2026 Mei - Minggu 1",
  "2026 Apr - Minggu 4",
  "2026 Apr - Minggu 3",
  "2026 Feb - Minggu 3",
  "2025 Des - Minggu 4",
];

export function GlobalFiltersProvider({ children }: { children: ReactNode }) {
  const [degree, setDegree] = useState<string>(ALL);
  const [jurusan, setJurusan] = useState<string>(ALL);
  const [prodi, setProdi] = useState<string>(ALL);
  const [tahunLulus, setTahunLulus] = useState<string>("all");
  const [week, setWeek] = useState<string>(WEEK_OPTIONS[0]);

  const value = useMemo<GlobalFiltersState>(
    () => ({
      degree, jurusan, prodi, tahunLulus, week,
      setDegree, setJurusan, setProdi, setTahunLulus, setWeek,
      reset: () => {
        setDegree(ALL); setJurusan(ALL); setProdi(ALL); setTahunLulus("all");
      },
    }),
    [degree, jurusan, prodi, tahunLulus, week]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useGlobalFilters() {
  const ctx = useContext(Ctx);
  if (!ctx) {
    // Fallback no-op state if used outside provider (e.g. landing). Returns inert defaults.
    return {
      degree: ALL, jurusan: ALL, prodi: ALL, tahunLulus: "all", week: WEEK_OPTIONS[0],
      setDegree: () => {}, setJurusan: () => {}, setProdi: () => {}, setTahunLulus: () => {}, setWeek: () => {},
      reset: () => {},
    } as GlobalFiltersState;
  }
  return ctx;
}

/* ===== KPI UI Context — controls whether Compare buttons render (Kaprodi hides) ===== */
interface KpiUIState { hideCompare: boolean }
const KpiUICtx = createContext<KpiUIState>({ hideCompare: false });
export function KpiUIProvider({ hideCompare = false, children }: { hideCompare?: boolean; children: ReactNode }) {
  return <KpiUICtx.Provider value={{ hideCompare }}>{children}</KpiUICtx.Provider>;
}
export function useKpiUI() { return useContext(KpiUICtx); }