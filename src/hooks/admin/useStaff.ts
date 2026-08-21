import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";

export interface StaffUser {
  id: number;
  name: string;
  email: string;
  role: string;
  scope: string;
  status: boolean;
  program_id: number | null;
  program_name: string | null;
  jurusan: string | null;
  /** Jurusan entity yang dipimpin (role kajur) -- dropdown single-select. */
  jurusan_id: number | null;
  jurusan_name: string | null;
  /** Fakultas entity yang dipimpin (role ketua_fakultas) -- dropdown single-select. */
  fakultas_id: number | null;
  fakultas_name: string | null;
  created_at: string;
}

export interface StaffPayload {
  name: string;
  email: string;
  password?: string;
  role: string;
  program_id?: number | null;
  jurusan?: string | null;
  jurusan_id?: number | null;
  fakultas_id?: number | null;
}

export function useStaff() {
  const queryClient = useQueryClient();

  const query = useQuery<StaffUser[]>({
    queryKey: ["users"],
    queryFn: async () => {
      const { data } = await api.get("/users");
      return data.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: StaffPayload) => {
      const { data } = await api.post("/users", payload);
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...payload }: StaffPayload & { id: number }) => {
      const { data } = await api.put(`/users/${id}`, payload);
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/users/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.patch(`/users/${id}/toggle-status`);
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });

  return {
    staff: query.data ?? [],
    isLoading: query.isLoading,
    createStaff: createMutation.mutateAsync,
    updateStaff: updateMutation.mutateAsync,
    deleteStaff: deleteMutation.mutateAsync,
    toggleStatus: toggleStatusMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
