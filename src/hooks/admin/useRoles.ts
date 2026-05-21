import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";

export interface RoleRecord {
  id: number;
  name: string;
  label: string;
  description: string | null;
  scope: string | null;
  created_at: string;
  updated_at: string;
}

export function useRoles() {
  const queryClient = useQueryClient();

  const query = useQuery<RoleRecord[]>({
    queryKey: ["roles"],
    queryFn: async () => {
      const { data } = await api.get("/roles");
      return data.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: { name: string; label: string; description?: string; scope?: string }) => {
      const { data } = await api.post("/roles", payload);
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["roles"] }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...payload }: { id: number; name: string; label: string; description?: string; scope?: string }) => {
      const { data } = await api.put(`/roles/${id}`, payload);
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["roles"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/roles/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["roles"] }),
  });

  return {
    roles: query.data ?? [],
    isLoading: query.isLoading,
    createRole: createMutation.mutateAsync,
    updateRole: updateMutation.mutateAsync,
    deleteRole: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
