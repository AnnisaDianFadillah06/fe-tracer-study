import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

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

const initialStudents: Student[] = [
  {
    id: "1",
    nim: "211511001",
    username: "mahasiswa1",
    email: "mahasiswa1@student.polban.ac.id",
    password: "password123",
    prodi: "Teknik Informatika",
    angkatan: "2021",
    status: "aktif",
  },
  {
    id: "2",
    nim: "211521002",
    username: "mahasiswa2",
    email: "mahasiswa2@student.polban.ac.id",
    password: "password123",
    prodi: "Sistem Informasi",
    angkatan: "2021",
    status: "aktif",
  },
  {
    id: "3",
    nim: "201511003",
    username: "alumni2020",
    email: "alumni2020@student.polban.ac.id",
    password: "password123",
    prodi: "Teknik Elektro",
    angkatan: "2020",
    status: "nonaktif",
  },
];

const defaultForm = {
  nim: "",
  username: "",
  email: "",
  password: "",
  prodi: "",
  angkatan: "",
  status: "aktif" as "aktif" | "nonaktif",
};

export const useStudentManagement = () => {
  const { toast } = useToast();
  const [students, setStudents] = useState<Student[]>(initialStudents);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterProdi, setFilterProdi] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ ...defaultForm });

  const filtered = students.filter((s) => {
    const q = searchQuery.toLowerCase();
    const matchSearch =
      s.nim.toLowerCase().includes(q) ||
      s.username.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q);
    const matchProdi = filterProdi === "all" || s.prodi === filterProdi;
    return matchSearch && matchProdi;
  });

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
      password: student.password,
      prodi: student.prodi,
      angkatan: student.angkatan,
      status: student.status,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nim || !formData.username || !formData.email || !formData.prodi) {
      toast({ title: "Error", description: "Semua field wajib harus diisi", variant: "destructive" });
      return;
    }
    if (!editingStudent && !formData.password) {
      toast({ title: "Error", description: "Password wajib diisi untuk akun baru", variant: "destructive" });
      return;
    }
    const isDupNim = students.some((s) => s.nim === formData.nim && s.id !== editingStudent?.id);
    if (isDupNim) {
      toast({ title: "Error", description: "NIM sudah terdaftar", variant: "destructive" });
      return;
    }
    if (editingStudent) {
      setStudents((prev) =>
        prev.map((s) => (s.id === editingStudent.id ? { ...s, ...formData } : s))
      );
      toast({ title: "Berhasil", description: "Data mahasiswa berhasil diperbarui" });
    } else {
      const newStudent: Student = { id: Date.now().toString(), ...formData };
      setStudents((prev) => [...prev, newStudent]);
      toast({ title: "Berhasil", description: "Akun mahasiswa berhasil dibuat" });
    }
    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = () => {
    if (!deletingId) return;
    setStudents((prev) => prev.filter((s) => s.id !== deletingId));
    toast({ title: "Berhasil", description: "Akun mahasiswa berhasil dihapus" });
    setIsDeleteDialogOpen(false);
    setDeletingId(null);
  };

  const confirmDelete = (id: string) => {
    setDeletingId(id);
    setIsDeleteDialogOpen(true);
  };

  /**
   * Validates student credentials for form login.
   * Returns the matching student or null.
   */
  const authenticate = (nimOrEmail: string, password: string): Student | null => {
    return (
      students.find(
        (s) =>
          s.status === "aktif" &&
          (s.nim === nimOrEmail || s.email === nimOrEmail) &&
          s.password === password
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
  };
};
