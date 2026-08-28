import { useCallback, useMemo, useState } from "react";
import { useToast } from "@/hooks/common/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { useJurusan } from "@/hooks/common/useJurusan";

// ── Types matching backend alumni_profiles + programs JOIN ─────────────────
export interface AlumniRecord {
  id: number;
  nim: string;
  name: string;
  email: string;
  phone: string | null;
  program_id: number | null;
  program_name: string | null; // from JOIN
  program_code: string | null; // from JOIN — Kode Prodi, dipakai ekspor & impor
  jurusan_name: string | null; // from JOIN
  graduation_year: number | null;
  is_active: boolean | null;
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
  jurusan: string;
  programId: string;
  angkatan: string;
  status: "aktif" | "nonaktif";
  // ── Medan di bawah ini dipakai ekspor alumni (DATA-06) ──────────────────
  // Berkas ekspor harus berkolom sama persis dengan templat impor supaya
  // dapat disunting lalu diunggah kembali tanpa menyusun ulang kolomnya.
  // Tanpa medan-medan ini, ekspornya kehilangan Kode PT, Kode Prodi, No. HP,
  // NIK, dan NPWP — dan Kode Prodi adalah kolom yang DIWAJIBKAN importer,
  // sehingga berkasnya pasti ditolak.
  kodePt: string;
  /** Kode program studi, bukan namanya. Inilah yang dibaca importer. */
  kodeProdi: string;
  phone: string;
  nik: string;
  npwp: string;
  /** Nama program studi tanpa imbuhan jenjang, sebagaimana bentuk di templat. */
  namaProdi: string;
}

// Larik `prodiList` yang dulu di sini sudah dihapus: tidak dipakai siapa pun,
// isinya nama prodi karangan yang tidak ada di basis data ("Sistem
// Informasi"), dan namanya menyesatkan karena sebagian isinya justru nama
// jurusan. Daftar prodi yang sebenarnya datang dari `/programs`.

export interface ProgramOption {
  id: number;
  name: string;
  code?: string | null;
  degree?: string | null;
  /** Jurusan induk. Dipakai menyaring daftar prodi begitu jurusan dipilih. */
  jurusan?: string | null;
}

// ── Map backend alumni → frontend Student ─────────────────────────────────
function alumniToStudent(a: AlumniRecord): Student {
  const degree = (a as any).program_degree;
  return {
    id: String(a.id),
    nim: a.nim ?? "",
    username: a.name ?? "",
    email: a.email ?? "",
    password: "",
    prodi: a.program_name ? `${a.program_name}${degree ? ` (${degree})` : ""}` : "",
    jurusan: a.jurusan_name ?? "",
    programId: a.program_id ? String(a.program_id) : "",
    angkatan: a.graduation_year ? String(a.graduation_year) : "",
    // Dibaca dari kolomnya, bukan dipatok "aktif". Sebelumnya borang Edit
    // selalu terbuka dengan Status Akun = Aktif, jadi menyimpan perubahan
    // apa pun diam-diam mengaktifkan kembali alumni yang sengaja
    // dinonaktifkan.
    status: a.is_active === false ? "nonaktif" : "aktif",
    kodePt: a.kode_pt ?? "",
    kodeProdi: a.program_code ?? "",
    phone: a.phone ?? "",
    nik: a.nik ?? "",
    npwp: a.npwp ?? "",
    // Sengaja TANPA imbuhan jenjang, berbeda dari `prodi` di atas yang
    // dipakai tampilan. Templat impor memuat nama program studi apa adanya,
    // dan menambahkan "(D3)" akan membuat berkas ekspor tidak sebangun.
    namaProdi: a.program_name ?? "",
  };
}

const defaultForm = {
  nim: "",
  username: "",
  email: "",
  password: "",
  programId: "",
  angkatan: "",
  status: "aktif" as "aktif" | "nonaktif",
};

/**
 * Hook manajemen alumni — terintegrasi dengan backend API.
 *
 * Endpoints:
 *   GET            → index (paginated, filterable)
 *   POST   /api/alumni         → store
 *   GET    /api/alumni/{id}    → show
 *   PUT    /api/alumni/{id}    → update
 *   DELETE /api/alumni/{id}    → destroy
 *
 * Fallback ke local state jika backend belum tersedia.
 */
export const useStudentManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ── UI State ────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [filterProdi, setFilterProdi] = useState("all");
  const [filterJurusan, setFilterJurusan] = useState("all");
  // "" = angkatan belum dipilih (halaman masih menampilkan kartu tahun),
  // "all" = lintas angkatan, selain itu satu tahun lulusan.
  const [filterGraduationYear, setFilterGraduationYear] = useState("");
  const [page, setPage] = useState(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ ...defaultForm });
  /**
   * Buka-tutup kata sandi di borang Tambah/Edit Akun Mahasiswa.
   *
   * Halaman sudah memakai state ini sejak awal, tetapi hook tidak pernah
   * mengembalikannya — `setShowPassword` di sana bernilai undefined dan
   * menekan tombol matanya melempar. Direset setiap kali borang dibuka.
   */
  const [showPassword, setShowPassword] = useState(false);

  const userRole = useMemo(() => {
    if (typeof window === "undefined") return "";
    try {
      const raw = localStorage.getItem("auth_user");
      const parsed = raw ? JSON.parse(raw) : null;
      return parsed?.role ?? "";
    } catch {
      return "";
    }
  }, []);

  const {
    data: programsResponse,
  } = useQuery({
    queryKey: ["programs"],
    queryFn: async () => {
      const { data } = await api.get("/programs", { params: { include_inactive: true } });
      return data;
    },
    staleTime: 60_000,
    retry: 1,
  });

  const programs: ProgramOption[] = useMemo(() => {
    if (programsResponse?.success && Array.isArray(programsResponse.data)) {
      return programsResponse.data.map((item: any) => ({
        id: item.id,
        name: item.name,
        code: item.code ?? null,
        degree: item.degree ?? null,
        jurusan: item.jurusan ?? null,
      }));
    }

    return [];
  }, [programsResponse]);

  /**
   * Penyaring yang sedang aktif, tanpa halaman.
   *
   * Dipakai kueri daftar MAUPUN pengambilan seluruh halaman untuk ekspor.
   * Ditaruh di satu tempat supaya keduanya tidak pernah menyimpang — ekspor
   * yang penyaringnya berbeda dari yang terlihat di layar adalah kekeliruan
   * yang sulit disadari, karena berkasnya tampak wajar.
   */
  const buildAlumniParams = useCallback((): Record<string, string> => {
    const params: Record<string, string> = { sort: "-graduation_year" };
    if (searchQuery) params.search = searchQuery;
    if (filterProdi !== "all") params.program_id = filterProdi;
    if (filterJurusan !== "all") params.jurusan = filterJurusan;
    if (filterGraduationYear !== "all") params.graduation_year = filterGraduationYear;
    return params;
  }, [searchQuery, filterProdi, filterJurusan, filterGraduationYear]);

  /**
   * Seluruh alumni yang cocok dengan penyaring aktif, lintas halaman.
   *
   * Daftar di layar sengaja dipetak per seratus baris, dan ekspor yang hanya
   * membawa halaman yang sedang terbuka akan terpotong diam-diam pada baris
   * keseratus. Itu berbahaya justru karena berkas ekspor dimaksudkan untuk
   * disunting lalu diunggah kembali: berkas yang terpotong tetap terlihat
   * lengkap dan sah.
   *
   * Pengambilannya bertahap per halaman, bukan sekali tarik dengan `per_page`
   * raksasa, supaya satu permintaan tidak pernah membengkak tak terkendali
   * pada angkatan besar.
   */
  const fetchAllStudents = useCallback(async (
    onProgress?: (loaded: number, total: number) => void,
  ): Promise<Student[]> => {
    const out: Student[] = [];
    let pageNo = 1;
    let lastPage = 1;

    do {
      const { data } = await api.get("/alumni", {
        params: { ...buildAlumniParams(), per_page: "200", page: String(pageNo) },
      });
      const rows: AlumniRecord[] = data?.data?.data ?? [];
      out.push(...rows.map(alumniToStudent));
      lastPage = Number(data?.data?.last_page ?? 1);
      onProgress?.(out.length, Number(data?.data?.total ?? out.length));

      // Penjaga kedua: halaman yang tidak menghasilkan baris menghentikan
      // perulangan, supaya kekeliruan paginasi di server tidak pernah
      // berubah menjadi perulangan tanpa akhir di peramban.
      if (rows.length === 0) break;
      pageNo += 1;
    } while (pageNo <= lastPage);

    return out;
  }, [buildAlumniParams]);

  // ── Fetch alumni dari backend ───────────────────────────────────────────
  const {
    data: apiResponse,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["alumni", searchQuery, filterProdi, filterJurusan, filterGraduationYear, page],
    queryFn: async () => {
      const { data } = await api.get("/alumni", {
        params: { ...buildAlumniParams(), per_page: "100", page: String(page) },
      });
      return data;
    },
    retry: 1,
    staleTime: 30_000,
    // Ditahan selama angkatan belum dipilih supaya membuka halaman tidak
    // langsung menarik daftar alumni.
    enabled: filterGraduationYear !== "",
  });

  // Pagination metadata
  const paginationMeta = useMemo(() => {
    const d = apiResponse?.data;
    return { currentPage: d?.current_page ?? 1, lastPage: d?.last_page ?? 1, total: d?.total ?? 0 };
  }, [apiResponse]);

  // Map backend data to Student format
  const students: Student[] = (() => {
    if (apiResponse?.success && apiResponse?.data?.data) {
      return apiResponse.data.data.map((a: AlumniRecord) => alumniToStudent(a));
    }
    return [];
  })();

  // No more client-side filter — all done server-side
  const filtered = students;

  // Dari master data, bukan diturunkan dari `students`. Daftar mahasiswa
  // di sini terpotong paginasi, jadi turunannya membuat pilihan penyaring
  // berubah-ubah mengikuti halaman yang sedang dibuka — jurusan yang
  // kebetulan tidak punya wakil di halaman ini akan hilang dari penyaring.
  const { jurusanNames: jurusanOptions } = useJurusan();

  // ── Mutations ───────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data } = await api.post("/alumni", payload);
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
      const { data } = await api.put(`/alumni/${id}`, payload);
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
      const { data } = await api.delete(`/alumni/${id}`);
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
    setShowPassword(false);
    setFormData({
      nim: student.nim,
      username: student.username,
      email: student.email,
      password: "",
      programId: student.programId,
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

    // Kata sandi wajib pada akun baru: tanpa itu barisnya tersimpan tanpa
    // kredensial dan alumninya ditolak masuk dengan "Akun Anda belum memiliki
    // kata sandi" — padahal staf merasa sudah mengisinya. Pada penyuntingan,
    // kosong berarti tidak diganti.
    if (!editingStudent && !formData.password) {
      toast({
        title: "Error",
        description: "Password wajib diisi untuk akun baru",
        variant: "destructive",
      });
      return;
    }

    if (formData.password && formData.password.length < 8) {
      toast({
        title: "Error",
        description: "Password minimal 8 karakter",
        variant: "destructive",
      });
      return;
    }

    // Build payload matching backend StoreAlumniRequest/UpdateAlumniRequest
    const payload: Record<string, unknown> = {
      nim: formData.nim,
      name: formData.username,
      email: formData.email,
      graduation_year: formData.angkatan ? parseInt(formData.angkatan) : null,
      is_active: formData.status === "aktif",
    };

    // Kunci `password` hanya disertakan bila benar-benar diisi. Mengirimkannya
    // sebagai string kosong akan membuat backend mengira staf ingin mengganti
    // kata sandi menjadi kosong.
    if (formData.password) {
      payload.password = formData.password;
    }

    if (formData.programId) {
      payload.program_id = Number(formData.programId);
    } else if (userRole === "head_tracer") {
      toast({
        title: "Error",
        description: "Program studi wajib dipilih untuk akun baru.",
        variant: "destructive",
      });
      return;
    }

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

  return {
    students,
    filtered,
    searchQuery,
    setSearchQuery,
    filterProdi,
    setFilterProdi,
    filterJurusan,
    setFilterJurusan,
    filterGraduationYear,
    setFilterGraduationYear,
    page,
    setPage,
    paginationMeta,
    fetchAllStudents,
    jurusanOptions,
    programs,
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
    // New: loading/error states
    isLoading,
    isError,
  };
};
