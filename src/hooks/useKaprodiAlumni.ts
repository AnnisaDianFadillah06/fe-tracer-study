import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

// ── Types matching backend response ──────────────────────────────────────
export interface KaprodiAlumniStats {
  total: number;
  finish: number;
  ongoing: number;
  belum_mengisi: number;
  answered: number;
  unanswered: number;
  response_rate: number; // 0 — 100
}

export interface KaprodiAlumniItem {
  id: number;
  nim: string;
  name: string;
  email: string | null;
  program_id: number | null;
  program_name: string | null;
  jurusan_name: string | null;
  graduation_year: number | null;
  is_active: boolean;
  response_status: "finish" | "ongoing" | "belum_mengisi";
}

interface AlumniPaginator {
  current_page: number;
  data: KaprodiAlumniItem[];
  last_page: number;
  per_page: number;
  total: number;
}

/**
 * Fetch stats + paginated alumni untuk halaman Kaprodi `Data Alumni Prodi`.
 *
 * Backend endpoint:
 *   GET /api/alumni/stats        → { total, answered, unanswered, response_rate }
 *   GET /api/alumni?search=&per_page= → Laravel paginator dengan response_status per item
 *
 * Filter role: backend auto-scope ke prodi kaprodi (AdminAlumniService::applyRoleScope).
 * Admin dapat aggregate semua prodi.
 */
export const useKaprodiAlumni = (perPage = 100) => {
  const [search, setSearch] = useState("");

  const statsQuery = useQuery<KaprodiAlumniStats>({
    queryKey: ["kaprodi-alumni-stats"],
    queryFn: async () => {
      const { data } = await api.get("/alumni/stats");
      return data.data;
    },
  });

  const alumniQuery = useQuery<AlumniPaginator>({
    queryKey: ["kaprodi-alumni-list", search, perPage],
    queryFn: async () => {
      const { data } = await api.get("/alumni", {
        params: { search, per_page: perPage },
      });
      return data.data;
    },
  });

  return {
    stats: statsQuery.data,
    alumni: alumniQuery.data?.data ?? [],
    pagination: alumniQuery.data
      ? {
          current_page: alumniQuery.data.current_page,
          last_page: alumniQuery.data.last_page,
          per_page: alumniQuery.data.per_page,
          total: alumniQuery.data.total,
        }
      : null,
    isLoading: statsQuery.isLoading || alumniQuery.isLoading,
    isError: statsQuery.isError || alumniQuery.isError,
    search,
    setSearch,
  };
};
