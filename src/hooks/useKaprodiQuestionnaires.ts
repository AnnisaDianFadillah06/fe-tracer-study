import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import type { KaprodiAlumniStats } from "@/hooks/useKaprodiAlumni";

// ── Types matching backend response ──────────────────────────────────────
export interface KaprodiQuestionnaire {
  id: number;
  code: string;
  title: string;
  description: string | null;
  target: string | null;
  period_year: number;
  version: number;
  status: "published" | "draft";
  program_id: number | null;
  is_global: boolean;
  response_count: number;
  sections?: Array<{ id: number; title: string; [key: string]: unknown }>;
}

/**
 * Fetch list kuesioner (kaprodi-scoped: global + prodinya saja) + stats
 * untuk halaman Kaprodi `Hasil Kuesioner Prodi`.
 *
 * Backend endpoint:
 *   GET /api/questionnaires            → list kuesioner (sudah kaprodi-scoped di BE)
 *   GET /api/alumni/stats        → { ..., response_rate }
 *
 * Query key `kaprodi-alumni-stats` di-share dengan useKaprodiAlumni agar
 * fetch stats terjadi 1× saja kalau user pindah-pindah antar 2 halaman.
 */
export const useKaprodiQuestionnaires = () => {
  const [search, setSearch] = useState("");

  const statsQuery = useQuery<KaprodiAlumniStats>({
    queryKey: ["kaprodi-alumni-stats"],
    queryFn: async () => {
      const { data } = await api.get("/alumni/stats");
      return data.data;
    },
  });

  const qnrQuery = useQuery<KaprodiQuestionnaire[]>({
    queryKey: ["kaprodi-questionnaires"],
    queryFn: async () => {
      const { data } = await api.get("/questionnaires");
      return (data.data ?? []) as KaprodiQuestionnaire[];
    },
  });

  const questionnaires = (qnrQuery.data ?? []).filter((q) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      q.title.toLowerCase().includes(s) ||
      q.code?.toLowerCase().includes(s) ||
      q.description?.toLowerCase().includes(s)
    );
  });

  return {
    responseRate: statsQuery.data?.response_rate ?? 0,
    questionnaires,
    isLoading: statsQuery.isLoading || qnrQuery.isLoading,
    isError: statsQuery.isError || qnrQuery.isError,
    search,
    setSearch,
  };
};
