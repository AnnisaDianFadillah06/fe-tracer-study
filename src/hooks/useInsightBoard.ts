/**
 * useInsightBoard — "Dashboard Saya": pertanyaan Insight yang disematkan.
 *
 * Papan hanya berisi rujukan ke pertanyaan; setiap kartu mengambil hasilnya
 * sendiri lewat useExplorerQuery dengan scope pengguna yang sedang login.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { InsightQuestion } from "@/hooks/useInsightQuestions";

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export type BoardItemSize = "sm" | "lg";

export interface BoardItem {
  id: number;
  position: number;
  size: BoardItemSize;
  question: InsightQuestion;
}

const BOARD_KEY = ["insight", "board"] as const;

export function useInsightBoard() {
  return useQuery({
    queryKey: BOARD_KEY,
    queryFn: async (): Promise<BoardItem[]> => {
      const { data } = await api.get<ApiEnvelope<BoardItem[]>>("/dashboard/insight/board");
      return data.data;
    },
  });
}

export function usePinQuestion() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (questionId: number): Promise<BoardItem> => {
      const { data } = await api.post<ApiEnvelope<BoardItem>>("/dashboard/insight/board", {
        question_id: questionId,
      });
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: BOARD_KEY }),
  });
}

export function useUnpinItem() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (itemId: number) => {
      await api.delete(`/dashboard/insight/board/${itemId}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: BOARD_KEY }),
  });
}

export function useResizeItem() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, size }: { id: number; size: BoardItemSize }) => {
      await api.patch(`/dashboard/insight/board/${id}`, { size });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: BOARD_KEY }),
  });
}

/**
 * Urutan diterapkan ke cache SEBELUM peladen menjawab, supaya kartu langsung
 * berpindah saat tombol naik/turun ditekan; kalau peladen menolak, urutan
 * lama dikembalikan.
 */
export function useReorderBoard() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (itemIds: number[]): Promise<BoardItem[]> => {
      const { data } = await api.put<ApiEnvelope<BoardItem[]>>("/dashboard/insight/board/order", {
        item_ids: itemIds,
      });
      return data.data;
    },
    onMutate: async (itemIds) => {
      await qc.cancelQueries({ queryKey: BOARD_KEY });
      const previous = qc.getQueryData<BoardItem[]>(BOARD_KEY);

      if (previous) {
        const byId = new Map(previous.map((i) => [i.id, i]));
        qc.setQueryData(
          BOARD_KEY,
          itemIds.map((id) => byId.get(id)).filter((i): i is BoardItem => i !== undefined),
        );
      }

      return { previous };
    },
    onError: (_e, _ids, ctx) => {
      if (ctx?.previous) qc.setQueryData(BOARD_KEY, ctx.previous);
    },
    onSuccess: (items) => qc.setQueryData(BOARD_KEY, items),
  });
}

/** Pindahkan satu kartu satu langkah; hasilnya daftar id lengkap untuk /order. */
export function moveItem(ids: number[], id: number, direction: -1 | 1): number[] {
  const from = ids.indexOf(id);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= ids.length) return ids;

  const next = [...ids];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}
