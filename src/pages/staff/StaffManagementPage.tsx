import { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/common/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Edit, Trash2, User, Mail, Search, Shield } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { useJurusan } from "@/hooks/common/useJurusan";
import { useFakultas } from "@/hooks/common/useFakultas";
import { useRoles } from "@/hooks/admin/useRoles";
import { useStaff, StaffUser } from "@/hooks/admin/useStaff";
import { Switch } from "@/components/ui/switch";

const roleLabelsMap: Record<string, string> = {
  head_tracer: "Super Admin",
  tracer_team: "Admin",
  wadir: "Pimpinan",
  kajur: "Ketua Jurusan",
  kaprodi: "Ketua Prodi",
  ketua_fakultas: "Ketua Fakultas",
};

const roleBadgeVariant = (role: string) => {
  switch (role) {
    case "head_tracer": return "destructive" as const;
    case "tracer_team": return "default" as const;
    case "wadir": return "secondary" as const;
    default: return "outline" as const;
  }
};

const StaffManagementPage = () => {
  const { toast } = useToast();
  const { roles } = useRoles();
  const {
    staff, isLoading,
    createStaff, updateStaff, deleteStaff, toggleStatus,
    isCreating, isUpdating,
  } = useStaff();

  const { data: programs = [] } = useQuery<{ id: number; name: string; jurusan: string | null }[]>({
    queryKey: ["programs"],
    queryFn: async () => {
      const { data } = await api.get("/programs");
      return data.data;
    },
  });

  // Dari master data, bukan diturunkan dari daftar program studi. Kajur
  // untuk jurusan yang baru dibuat dan belum punya prodi tetap harus bisa
  // ditugaskan — dengan penurunan dari programs, jurusan itu tidak pernah
  // muncul di pilihan.
  const { jurusanList } = useJurusan();
  const { fakultasList } = useFakultas();

  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffUser | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: "", email: "", password: "", role: "tracer_team", program_id: "", jurusan_id: "", fakultas_id: "" });

  const filtered = staff.filter((s) => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === "all" || s.role === filterRole;
    return matchSearch && matchRole;
  });

  const resetForm = () => {
    setFormData({ name: "", email: "", password: "", role: "tracer_team", program_id: "", jurusan_id: "", fakultas_id: "" });
    setEditingStaff(null);
  };

  const handleOpenAdd = () => { resetForm(); setIsDialogOpen(true); };

  const handleOpenEdit = (user: StaffUser) => {
    setEditingStaff(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: "",
      role: user.role,
      program_id: user.program_id?.toString() ?? "",
      jurusan_id: user.jurusan_id?.toString() ?? "",
      fakultas_id: user.fakultas_id?.toString() ?? "",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      toast({ title: "Error", description: "Nama dan email harus diisi", variant: "destructive" });
      return;
    }
    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        program_id: formData.program_id ? parseInt(formData.program_id) : null,
        jurusan_id: formData.role === "kajur" && formData.jurusan_id ? parseInt(formData.jurusan_id) : null,
        fakultas_id: formData.role === "ketua_fakultas" && formData.fakultas_id ? parseInt(formData.fakultas_id) : null,
        ...(formData.password ? { password: formData.password } : {}),
      };

      if (editingStaff) {
        await updateStaff({ id: editingStaff.id, ...payload });
        toast({ title: "Berhasil", description: "Staff berhasil diperbarui" });
      } else {
        if (!formData.password) {
          toast({ title: "Error", description: "Password harus diisi untuk user baru", variant: "destructive" });
          return;
        }
        await createStaff(payload);
        toast({ title: "Berhasil", description: "Staff baru berhasil ditambahkan" });
      }
      setIsDialogOpen(false);
      resetForm();
    } catch (err: any) {
      const data = err.response?.data;
      const errors = data?.errors;
      const detail = errors
        ? Object.values(errors).flat().join(", ")
        : data?.message || "Terjadi kesalahan";
      toast({ title: "Error", description: detail, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteStaff(deletingId);
      toast({ title: "Berhasil", description: "Staff berhasil dihapus" });
    } catch (err: any) {
      toast({ title: "Error", description: err.response?.data?.message || "Gagal menghapus", variant: "destructive" });
    }
    setIsDeleteDialogOpen(false);
    setDeletingId(null);
  };

  const staffRoles = roles.length > 0 ? roles.map((r) => r.name) : ["head_tracer", "tracer_team", "wadir", "kajur", "kaprodi", "ketua_fakultas"];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-heading text-2xl font-bold">Manajemen Akun Staff</h2>
            <p className="text-muted-foreground">Kelola akun staff dan assign role</p>
          </div>
          <Button onClick={handleOpenAdd}>
            <Plus className="mr-2 h-4 w-4" />
            Tambah Staff
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Cari nama atau email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={filterRole} onValueChange={setFilterRole}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Role</SelectItem>
              {staffRoles.map((r) => (
                <SelectItem key={r} value={r}>{roleLabelsMap[r] ?? r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Staff list */}
        {isLoading ? (
          <p className="text-center text-muted-foreground py-8">Memuat data...</p>
        ) : (
          <div className="grid gap-3">
            {filtered.map((account) => (
              <Card key={account.id} className="glass-card">
                <CardContent className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-orange-light/20 flex items-center justify-center border border-border">
                      <User className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-sm">{account.name}</h4>
                        <Badge variant={roleBadgeVariant(account.role)}>{roleLabelsMap[account.role] ?? account.role}</Badge>
                        <Badge variant={account.status ? "default" : "secondary"}>{account.status ? "Aktif" : "Nonaktif"}</Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Mail className="w-3 h-3" />{account.email}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Shield className="w-3 h-3" />{account.scope}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Switch
                      checked={account.status}
                      onCheckedChange={() => toggleStatus(account.id)}
                      aria-label="Toggle status"
                    />
                    <Button variant="outline" size="sm" onClick={() => handleOpenEdit(account)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => { setDeletingId(account.id); setIsDeleteDialogOpen(true); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {filtered.length === 0 && (
              <p className="text-center text-muted-foreground py-8">Tidak ada data staff ditemukan.</p>
            )}
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingStaff ? "Edit Staff" : "Tambah Staff"}</DialogTitle>
            <DialogDescription>
              {editingStaff ? "Perbarui informasi akun staff." : "Tambahkan akun staff baru ke sistem."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nama Lengkap</Label>
              <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Nama Lengkap" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="email@test.com" />
            </div>
            <div className="space-y-2">
              <Label>Password {editingStaff && "(kosongkan jika tidak diubah)"}</Label>
              <Input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder="••••••" />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {staffRoles.map((r) => (
                    <SelectItem key={r} value={r}>{roleLabelsMap[r] ?? r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {formData.role === "kajur" && (
              <div className="space-y-2">
                <Label>Jurusan</Label>
                <Select value={formData.jurusan_id} onValueChange={(v) => setFormData({ ...formData, jurusan_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Pilih jurusan" /></SelectTrigger>
                  <SelectContent>
                    {jurusanList.filter((j) => j.is_active).map((j) => (
                      <SelectItem key={j.id} value={j.id.toString()}>{j.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Prodi yang termasuk jurusan ini dikelola di Master Data → Jurusan.
                </p>
              </div>
            )}
            {formData.role === "kaprodi" && (
              <div className="space-y-2">
                <Label>Program Studi</Label>
                <Select value={formData.program_id} onValueChange={(v) => setFormData({ ...formData, program_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Pilih program studi" /></SelectTrigger>
                  <SelectContent>
                    {programs.map((p) => (
                      <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {formData.role === "ketua_fakultas" && (
              <div className="space-y-2">
                <Label>Fakultas</Label>
                <Select value={formData.fakultas_id} onValueChange={(v) => setFormData({ ...formData, fakultas_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Pilih fakultas" /></SelectTrigger>
                  <SelectContent>
                    {fakultasList.filter((f) => f.is_active).map((f) => (
                      <SelectItem key={f.id} value={f.id.toString()}>{f.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Jurusan yang termasuk fakultas ini dikelola di Master Data → Fakultas.
                </p>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Batal</Button>
              <Button type="submit" disabled={isCreating || isUpdating}>
                {editingStaff ? "Simpan" : "Tambah"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Akun Staff?</AlertDialogTitle>
            <AlertDialogDescription>Akun ini akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default StaffManagementPage;
