import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

export interface Jurusan {
  id: number;
  name: string;
  is_active: boolean;
  /** Jumlah program studi yang memakai jurusan ini. */
  program_count: number;
  /** Jumlah akun staf (Kajur) yang lingkupnya dipatok ke jurusan ini. */
  user_count: number;
  /**
   * program_id anggota jurusan ini lewat jurusan_program_scopes --
   * keanggotaan EKSPLISIT yang jadi sumber cakupan Kajur, dikelola admin
   * di Master Data (bukan lagi cocokkan teks programs.jurusan).
   */
  program_ids: number[];
}

/**
 * Daftar jurusan dari master data.
 *
 * Menggantikan tiga cara lama yang semuanya keliru dengan caranya sendiri:
 *
 *   - larik hardcoded di MasterDataPage dan useStudentManagement — daftarnya
 *     tertinggal dari basis data (mis. "Teknik Aeronautika" tidak ada di
 *     sana), sehingga jurusan itu tidak pernah bisa dipilih;
 *   - diturunkan dari `/programs` — jurusan yang belum punya program studi
 *     tidak akan muncul, padahal justru itu yang baru dibuat;
 *   - diturunkan dari daftar mahasiswa yang sedang tampil — ikut terpotong
 *     paginasi, jadi pilihannya berubah-ubah mengikuti halaman.
 *
 * Kunci query-nya dipakai bersama supaya perubahan di Master Data langsung
 * terasa di seluruh halaman lain tanpa muat ulang peramban.
 */
export const JURUSAN_QUERY_KEY = ["jurusans"] as const;

export function useJurusan() {
  const query = useQuery<Jurusan[]>({
    queryKey: JURUSAN_QUERY_KEY,
    queryFn: async () => {
      const { data } = await api.get("/jurusans");
      return data.data ?? [];
    },
  });

  return {
    jurusanList: query.data ?? [],
    /** Nama saja — bentuk yang dipakai penyaring dan dropdown. */
    jurusanNames: (query.data ?? []).filter((j) => j.is_active).map((j) => j.name),
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}
