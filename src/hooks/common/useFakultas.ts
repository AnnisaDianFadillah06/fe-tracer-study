import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

export interface Fakultas {
  id: number;
  name: string;
  is_active: boolean;
  /** Jumlah jurusan anggota fakultas ini lewat fakultas_jurusan_scopes. */
  jurusan_count: number;
  /** Jumlah akun staf (Ketua Fakultas) yang lingkupnya dipatok ke fakultas ini. */
  user_count: number;
  /** jurusan_id anggota fakultas ini. */
  jurusan_ids: number[];
}

/**
 * Daftar Fakultas dari master data — entity baru (redesain scope Ketua
 * Fakultas), berbeda dari Jurusan yang punya jalur teks warisan.
 *
 * Kunci query-nya dipakai bersama supaya perubahan di Master Data langsung
 * terasa di seluruh halaman lain tanpa muat ulang peramban.
 */
export const FAKULTAS_QUERY_KEY = ["fakultas"] as const;

export function useFakultas() {
  const query = useQuery<Fakultas[]>({
    queryKey: FAKULTAS_QUERY_KEY,
    queryFn: async () => {
      const { data } = await api.get("/fakultas");
      return data.data ?? [];
    },
  });

  return {
    fakultasList: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}
