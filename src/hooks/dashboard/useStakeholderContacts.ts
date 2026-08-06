import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

export interface StakeholderContact {
  id: number;
  alumni_id: number;
  questionnaire_id: number;
  contact_type: string;
  contact_name: string;
  contact_email: string;
  alumni_status: string | null;
  nim: string;
  alumni_name: string;
  graduation_year: number | null;
  program_code: string | null;
  program_name: string | null;
}

export interface StakeholderStats {
  total: number;
  unique_emails: number;
  alumni_count: number;
}

interface Paginator {
  current_page: number;
  data: StakeholderContact[];
  last_page: number;
  per_page: number;
  total: number;
}

export interface StakeholderFilters {
  search: string;
  graduationYear: number | null;
  alumniStatus: string | null;
  contactType: string | null;
  programCode: string | null;
  page: number;
  perPage?: number;
}

/**
 * Penyaring → query string. Dipakai bersama oleh pengambilan tabel dan
 * tautan unduhan supaya berkas yang terunduh memuat baris yang sama dengan
 * yang sedang dilihat — backend membaca kunci yang sama untuk keduanya.
 */
export function stakeholderQueryParams(f: Omit<StakeholderFilters, "page" | "perPage">): Record<string, string> {
  const params: Record<string, string> = {};
  if (f.search.trim()) params.search = f.search.trim();
  if (f.graduationYear) params.graduation_year = String(f.graduationYear);
  if (f.alumniStatus) params.alumni_status = f.alumniStatus;
  if (f.contactType) params.contact_type = f.contactType;
  if (f.programCode) params.program_code = f.programCode;
  return params;
}

export const useStakeholderContacts = (filters: StakeholderFilters) => {
  const { page, perPage = 50, ...rest } = filters;

  const query = useQuery({
    queryKey: ["stakeholder-contacts", filters],
    queryFn: async () => {
      const { data } = await api.get("/stakeholder-contacts", {
        params: { ...stakeholderQueryParams(rest), page, per_page: perPage },
      });

      return data as { data: Paginator; stats: StakeholderStats };
    },
    // Data hanya berubah saat ada alumni mengirim kuesioner — tidak perlu
    // diambil ulang tiap kali jendela difokuskan kembali.
    staleTime: 60_000,
  });

  const paginator = query.data?.data;

  return {
    contacts: paginator?.data ?? [],
    stats: query.data?.stats ?? { total: 0, unique_emails: 0, alumni_count: 0 },
    pagination: {
      currentPage: paginator?.current_page ?? 1,
      lastPage: paginator?.last_page ?? 1,
      total: paginator?.total ?? 0,
    },
    isLoading: query.isLoading,
    isError: query.isError,
  };
};

/** Daftar prodi untuk penyaring. */
export const useProgramOptions = () => {
  const query = useQuery({
    queryKey: ["programs-options"],
    queryFn: async () => {
      const { data } = await api.get("/programs");
      const rows = data?.data ?? [];

      return (rows as Array<{ code: string; name: string; degree?: string }>).map((p) => ({
        code: p.code,
        label: p.degree ? `${p.degree} ${p.name}` : p.name,
      }));
    },
    staleTime: 30 * 60_000,
  });

  return query.data ?? [];
};
