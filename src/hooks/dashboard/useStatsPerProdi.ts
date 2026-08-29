import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

/**
 * Ringkasan alumni dipecah per program studi, untuk layar kartu prodi di
 * halaman Data Alumni.
 *
 * Cakupannya ditentukan peladen dan sama persis dengan yang dipakai kartu
 * ringkasan serta tabelnya: Kaprodi hanya prodinya, Kajur dan Dekan sebatas
 * jangkauannya, peran lain seluruh prodi. Karena itu berkas ini tidak perlu
 * tahu peran pemanggil sama sekali.
 */

export interface ProdiSummary {
  program_id: number;
  program_name: string;
  program_code: string | null;
  program_degree: string | null;
  jurusan_name: string | null;
  total: number;
  answered: number;
  unanswered: number;
  ongoing: number;
  not_started: number;
  response_rate: number;
}

export const useStatsPerProdi = (graduationYear: number | null | undefined) => {
  const query = useQuery<ProdiSummary[]>({
    queryKey: ["alumni-stats-per-prodi", graduationYear ?? "all"],
    queryFn: async () => {
      const params: Record<string, unknown> = {};
      if (graduationYear) params.graduation_year = graduationYear;
      const { data } = await api.get("/alumni/stats-by-program", { params });
      return data.data ?? [];
    },
    // Tahun belum dipilih berarti layar kartu tahun yang sedang tampil;
    // permintaannya ditahan, sama seperti di useKaprodiAlumni.
    enabled: graduationYear !== undefined,
    staleTime: 60000,
  });

  return {
    prodi: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
};
