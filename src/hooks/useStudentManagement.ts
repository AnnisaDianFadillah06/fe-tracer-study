import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";

// ── Types matching backend alumni_profiles + programs JOIN ─────────────────
export interface AlumniRecord {
  id: number;
  nim: string;
  name: string;
  email: string;
  phone: string | null;
  program_id: number | null;
  program_name: string | null; // from JOIN
  graduation_year: number | null;
  kode_pt: string | null;
  nik: string | null;
  npwp: string | null;
  created_at: string | null;
  updated_at: string | null;
}

// Legacy interface for backward compatibility with StudentManagementPage
export interface Student {
  id: string;
  nim: string;
  username: string;
  email: string;
  password: string;
  prodi: string;
  angkatan: string;
  status: "aktif" | "nonaktif";
}

export const prodiList = [
  "Teknik Informatika",
  "Sistem Informasi",
  "Teknik Elektro",
  "Teknik Mesin",
  "Teknik Sipil",
  "Akuntansi",
  "Administrasi Niaga",
  "Teknik Kimia",
  "Teknik Refrigerasi & Tata Udara",
  "Teknik Konversi Energi",
];

// ── Map backend alumni → frontend Student ─────────────────────────────────
function alumniToStudent(a: AlumniRecord): Student {
  return {
    id: String(a.id),
    nim: a.nim ?? "",
    username: a.name ?? "",
    email: a.email ?? "",
    password: "", // Backend doesn't return passwords
    prodi: a.program_name ?? "",
    angkatan: a.graduation_year ? String(a.graduation_year - 3) : "", // estimasi angkatan
    status: "aktif",
  };
}

const defaultForm = {
  nim: "",
  username: "",
  email: "",
  password: "",
  prodi: "",
  angkatan: "",
  status: "aktif" as "aktif" | "nonaktif",
};

/**
 * Hook manajemen alumni — terintegrasi dengan backend API.
 *
 * Endpoints:
 *   GET    /api/admin/alumni         → index (paginated, filterable)
 *   POST   /api/admin/alumni         → store
 *   GET    /api/admin/alumni/{id}    → show
 *   PUT    /api/admin/alumni/{id}    → update
 *   DELETE /api/admin/alumni/{id}    → destroy
 *
 * Fallback ke local state jika backend belum tersedia.
 */
export const useStudentManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ── UI State ────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [filterProdi, setFilterProdi] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ ...defaultForm });

  // ── Fetch alumni dari backend ───────────────────────────────────────────
  const {
    data: apiResponse,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["alumni", searchQuery],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (searchQuery) params.search = searchQuery;
      params.per_page = "100"; // fetch more for client-side filtering
      const { data } = await api.get("/admin/alumni", { params });
      return data;
    },
    retry: 1,
    staleTime: 30_000, // 30 seconds
  });

  // Map backend data to Student format
  const students: Student[] = (() => {
    if (apiResponse?.success && apiResponse?.data?.data) {
      return apiResponse.data.data.map((a: AlumniRecord) => alumniToStudent(a));
    }
    return [];
  })();

  // Client-side filter
  const filtered = students.filter((s) => {
    const matchProdi = filterProdi === "all" || s.prodi === filterProdi;
    return matchProdi;
  });

  // ── Mutations ───────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data } = await api.post("/admin/alumni", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alumni"] });
      toast({ title: "Berhasil", description: "Data alumni berhasil ditambahkan" });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || "Gagal menambahkan alumni";
      toast({ title: "Error", description: msg, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Record<string, unknown> }) => {
      const { data } = await api.put(`/admin/alumni/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alumni"] });
      toast({ title: "Berhasil", description: "Data alumni berhasil diperbarui" });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || "Gagal memperbarui alumni";
      toast({ title: "Error", description: msg, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/admin/alumni/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alumni"] });
      toast({ title: "Berhasil", description: "Data alumni berhasil dihapus" });
      setIsDeleteDialogOpen(false);
      setDeletingId(null);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || "Gagal menghapus alumni";
      toast({ title: "Error", description: msg, variant: "destructive" });
    },
  });

  // ── Form helpers ────────────────────────────────────────────────────────
  const resetForm = () => {
    setFormData({ ...defaultForm });
    setEditingStudent(null);
    setShowPassword(false);
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (student: Student) => {
    setEditingStudent(student);
    setFormData({
      nim: student.nim,
      username: student.username,
      email: student.email,
      password: "",
      prodi: student.prodi,
      angkatan: student.angkatan,
      status: student.status,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nim || !formData.username || !formData.email) {
      toast({
        title: "Error",
        description: "NIM, nama, dan email wajib diisi",
        variant: "destructive",
      });
      return;
    }

    // Build payload matching backend StoreAlumniRequest/UpdateAlumniRequest
    const payload: Record<string, unknown> = {
      nim: formData.nim,
      name: formData.username,
      email: formData.email,
      graduation_year: formData.angkatan
        ? parseInt(formData.angkatan) + 3
        : null,
    };

    if (editingStudent) {
      updateMutation.mutate({ id: editingStudent.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = () => {
    if (!deletingId) return;
    deleteMutation.mutate(deletingId);
  };

  const confirmDelete = (id: string) => {
    setDeletingId(id);
    setIsDeleteDialogOpen(true);
  };

  /**
   * Legacy authenticate function — masih mock untuk student login form.
   * Backend belum punya endpoint login mahasiswa.
   */
  const authenticate = (nimOrEmail: string, password: string): Student | null => {
    return (
      students.find(
        (s) =>
          s.status === "aktif" &&
          (s.nim === nimOrEmail || s.email === nimOrEmail)
      ) ?? null
    );
  };

  return {
    students,
    filtered,
    searchQuery,
    setSearchQuery,
    filterProdi,
    setFilterProdi,
    isDialogOpen,
    setIsDialogOpen,
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    editingStudent,
    deletingId,
    showPassword,
    setShowPassword,
    formData,
    setFormData,
    handleOpenAdd,
    handleOpenEdit,
    handleSubmit,
    handleDelete,
    confirmDelete,
    authenticate,
    // New: loading/error states
    isLoading,
    isError,
  };
};
