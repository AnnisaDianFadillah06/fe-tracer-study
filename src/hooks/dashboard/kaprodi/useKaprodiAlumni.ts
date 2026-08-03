import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

export interface KaprodiAlumniStats {
  total: number;
  finished: number;
  ongoing: number;
  not_started: number;
  answered: number;
  unanswered: number;
  response_rate: number;
  graduation_years: number[];
}

export interface KaprodiAlumniItem {
  id: number;
  nim: string;
  name: string;
  email: string | null;
  program_id: number | null;
  program_name: string | null;
  program_degree: string | null;
  jurusan_name: string | null;
  graduation_year: number | null;
  is_active: boolean;
  response_status: "finished" | "ongoing" | "not_started";
}

interface AlumniPaginator {
  current_page: number;
  data: KaprodiAlumniItem[];
  last_page: number;
  per_page: number;
  total: number;
}

interface Params {
  search: string;
  page: number;
  graduationYear: number | null | undefined; // undefined = not yet initialized
  perPage?: number;
}

export const useKaprodiAlumni = ({ search, page, graduationYear, perPage = 100 }: Params) => {
  // Always fetch unfiltered stats first to get graduation_years list
  const yearsQuery = useQuery<KaprodiAlumniStats>({
    queryKey: ["kaprodi-alumni-years"],
    queryFn: async () => {
      const { data } = await api.get("/alumni/stats");
      return data.data;
    },
    staleTime: 60000,
  });

  const isReady = graduationYear !== undefined;

  const statsQuery = useQuery<KaprodiAlumniStats>({
    queryKey: ["kaprodi-alumni-stats", graduationYear ?? "all"],
    queryFn: async () => {
      const params: Record<string, unknown> = {};
      if (graduationYear) params.graduation_year = graduationYear;
      const { data } = await api.get("/alumni/stats", { params });
      return data.data;
    },
    enabled: isReady,
  });

  const alumniQuery = useQuery<AlumniPaginator>({
    queryKey: ["kaprodi-alumni-list", search, perPage, page, graduationYear ?? "all"],
    queryFn: async () => {
      const params: Record<string, unknown> = { search, per_page: perPage, page };
      if (graduationYear) params.graduation_year = graduationYear;
      const { data } = await api.get("/alumni", { params });
      return data.data;
    },
    enabled: isReady,
  });

  return {
    stats: statsQuery.data,
    alumni: alumniQuery.data?.data ?? [],
    pagination: alumniQuery.data
      ? { currentPage: alumniQuery.data.current_page, lastPage: alumniQuery.data.last_page, total: alumniQuery.data.total }
      : { currentPage: 1, lastPage: 1, total: 0 },
    isLoading: !isReady || statsQuery.isLoading || alumniQuery.isLoading,
    isError: statsQuery.isError || alumniQuery.isError,
    graduationYears: yearsQuery.data?.graduation_years ?? [],
  };
};
