import { useMemo, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { PRODI_LIST } from "@/lib/mockData";

export const LAM_OPTIONS = [
  "BAN-PT",
  "LAM Teknik",
  "LAM Infokom",
  "LAM EMBA",
  "LAM Ekonomi",
  "LAM Kependidikan",
  "LAM Sains",
] as const;

export type LamName = (typeof LAM_OPTIONS)[number];
export type ThresholdStatus = "aktif" | "nonaktif";

export interface Threshold {
  id: string;
  lam: string;
  tahun: number;
  nilai: number;
  prodi: string[];
  status: ThresholdStatus;
}

export const ALL_PRODI = PRODI_LIST.map((p) => `${p.name} (${p.jenjang})`);

const initialData: Threshold[] = [
  {
    id: "t1",
    lam: "LAM Teknik",
    tahun: 2024,
    nilai: 70,
    prodi: [
      "Teknik Informatika (D3)",
      "Teknik Informatika (D4)",
      "Teknik Elektronika (D3)",
      "Teknik Mesin (D3)",
    ],
    status: "aktif",
  },
  {
    id: "t2",
    lam: "LAM EMBA",
    tahun: 2024,
    nilai: 60,
    prodi: ["Teknik Kimia (D3)", "Teknik Konversi Energi (D3)", "Teknik Pendingin (D3)"],
    status: "aktif",
  },
  {
    id: "t3",
    lam: "BAN-PT",
    tahun: 2023,
    nilai: 50,
    prodi: ["Magister Manajemen (S2)"],
    status: "nonaktif",
  },
];

const defaultForm = {
  lam: "",
  tahun: new Date().getFullYear(),
  nilai: 0,
  prodi: [] as string[],
  status: "aktif" as ThresholdStatus,
};

export const useThresholdManagement = () => {
  const { toast } = useToast();
  const [items, setItems] = useState<Threshold[]>(initialData);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterLam, setFilterLam] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Threshold | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({ ...defaultForm });
  const [prodiSearch, setProdiSearch] = useState("");

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return items.filter((t) => {
      const matchSearch =
        !q ||
        t.lam.toLowerCase().includes(q) ||
        String(t.tahun).includes(q) ||
        t.prodi.some((p) => p.toLowerCase().includes(q));
      const matchLam = filterLam === "all" || t.lam === filterLam;
      const matchStatus = filterStatus === "all" || t.status === filterStatus;
      return matchSearch && matchLam && matchStatus;
    });
  }, [items, searchQuery, filterLam, filterStatus]);

  const filteredProdiOptions = useMemo(() => {
    const q = prodiSearch.toLowerCase();
    return ALL_PRODI.filter((p) => p.toLowerCase().includes(q));
  }, [prodiSearch]);

  const resetForm = () => {
    setFormData({ ...defaultForm });
    setEditing(null);
    setProdiSearch("");
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (t: Threshold) => {
    setEditing(t);
    setFormData({
      lam: t.lam,
      tahun: t.tahun,
      nilai: t.nilai,
      prodi: [...t.prodi],
      status: t.status,
    });
    setProdiSearch("");
    setIsDialogOpen(true);
  };

  const toggleProdi = (name: string) => {
    setFormData((f) => ({
      ...f,
      prodi: f.prodi.includes(name) ? f.prodi.filter((p) => p !== name) : [...f.prodi, name],
    }));
  };

  const toggleAllVisibleProdi = (select: boolean) => {
    setFormData((f) => {
      const visible = filteredProdiOptions;
      if (select) {
        const merged = Array.from(new Set([...f.prodi, ...visible]));
        return { ...f, prodi: merged };
      }
      return { ...f, prodi: f.prodi.filter((p) => !visible.includes(p)) };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.lam || !formData.tahun || formData.nilai === undefined) {
      toast({ title: "Error", description: "Nama LAM, tahun, dan nilai wajib diisi", variant: "destructive" });
      return;
    }
    if (formData.nilai < 0 || formData.nilai > 100) {
      toast({ title: "Error", description: "Nilai threshold harus 0 - 100", variant: "destructive" });
      return;
    }
    if (formData.prodi.length === 0) {
      toast({ title: "Error", description: "Pilih minimal satu prodi", variant: "destructive" });
      return;
    }
    if (editing) {
      setItems((prev) => prev.map((t) => (t.id === editing.id ? { ...t, ...formData } : t)));
      toast({ title: "Berhasil", description: "Threshold diperbarui" });
    } else {
      setItems((prev) => [...prev, { id: Date.now().toString(), ...formData }]);
      toast({ title: "Berhasil", description: "Threshold ditambahkan" });
    }
    setIsDialogOpen(false);
    resetForm();
  };

  const confirmDelete = (id: string) => {
    setDeletingId(id);
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = () => {
    if (!deletingId) return;
    setItems((prev) => prev.filter((t) => t.id !== deletingId));
    toast({ title: "Berhasil", description: "Threshold dihapus" });
    setIsDeleteDialogOpen(false);
    setDeletingId(null);
  };

  const toggleStatus = (id: string) => {
    setItems((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, status: t.status === "aktif" ? "nonaktif" : "aktif" } : t,
      ),
    );
  };

  return {
    items,
    filtered,
    searchQuery,
    setSearchQuery,
    filterLam,
    setFilterLam,
    filterStatus,
    setFilterStatus,
    isDialogOpen,
    setIsDialogOpen,
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    editing,
    formData,
    setFormData,
    prodiSearch,
    setProdiSearch,
    filteredProdiOptions,
    handleOpenAdd,
    handleOpenEdit,
    handleSubmit,
    confirmDelete,
    handleDelete,
    toggleProdi,
    toggleAllVisibleProdi,
    toggleStatus,
  };
};