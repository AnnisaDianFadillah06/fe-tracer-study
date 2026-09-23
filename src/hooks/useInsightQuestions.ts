/**
 * useInsightQuestions
 *
 * Pertanyaan tersimpan halaman Insight: daftar (milik sendiri + yang
 * dibagikan), satu pertanyaan (tautan ?q=id), serta simpan/ubah/hapus.
 *
 * Yang tersimpan hanya susunannya. Hasilnya tetap diambil lewat
 * useExplorerQuery, sehingga scope role dan snapshot terbaru selalu berlaku.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { ExplorerQueryInput } from "@/lib/olapExplorer";

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export interface InsightQuestion {
  id: number;
  title: string;
  description: string | null;
  query: ExplorerQueryInput;
  chart_measure: string | null;
  is_shared: boolean;
  is_mine: boolean;
  owner_name: string | null;
  updated_at: string | null;
}

export interface InsightQuestionInput {
  title: string;
  description?: string | null;
  query: ExplorerQueryInput;
  chart_measure?: string | null;
  is_shared?: boolean;
}

const LIST_KEY = ["insight", "questions"] as const;

export function useInsightQuestions() {
  return useQuery({
    queryKey: LIST_KEY,
    queryFn: async (): Promise<InsightQuestion[]> => {
      const { data } = await api.get<ApiEnvelope<InsightQuestion[]>>("/dashboard/insight/questions");
      return data.data;
    },
  });
}

export function useInsightQuestion(id: number | null) {
  return useQuery({
    queryKey: [...LIST_KEY, id],
    queryFn: async (): Promise<InsightQuestion> => {
      const { data } = await api.get<ApiEnvelope<InsightQuestion>>(
        `/dashboard/insight/questions/${id}`,
      );
      return data.data;
    },
    enabled: id !== null,
    retry: false,
  });
}

export function useSaveInsightQuestion() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...body
    }: Partial<InsightQuestionInput> & { id?: number }): Promise<InsightQuestion> => {
      const { data } = id
        ? await api.put<ApiEnvelope<InsightQuestion>>(`/dashboard/insight/questions/${id}`, body)
        : await api.post<ApiEnvelope<InsightQuestion>>("/dashboard/insight/questions", body);
      return data.data;
    },
    onSuccess: (saved) => {
      qc.setQueryData([...LIST_KEY, saved.id], saved);
      qc.invalidateQueries({ queryKey: LIST_KEY, exact: true });
    },
  });
}

export function useDeleteInsightQuestion() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/dashboard/insight/questions/${id}`);
      return id;
    },
    onSuccess: (id) => {
      qc.removeQueries({ queryKey: [...LIST_KEY, id], exact: true });
      qc.invalidateQueries({ queryKey: LIST_KEY, exact: true });
      // Tersemat di Dashboard Saya ikut terhapus di peladen (cascade).
      qc.invalidateQueries({ queryKey: ["insight", "board"] });
    },
  });
}
