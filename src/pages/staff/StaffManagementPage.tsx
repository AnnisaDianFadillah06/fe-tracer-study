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
import { type AppRole, roleLabels } from "@/lib/rbac";

interface StaffAccount {
  id: string;
  name: string;
  email: string;
  role: AppRole;
  program?: string;
  isActive: boolean;
}

const staffRoles: AppRole[] = ["admin", "head_tracer", "tracer_team", "kaprodi", "wadir"];

const initialStaff: StaffAccount[] = [
  { id: "1", name: "Super Admin", email: "admin@polban.ac.id", role: "admin", isActive: true },
  { id: "2", name: "Dr. Rina Maulida, M.T.", email: "rina.maulida@polban.ac.id", role: "head_tracer", isActive: true },
  { id: "3", name: "Rony Pasonang Sihombing, S.T., M.Eng.", email: "rony.sihombing@polban.ac.id", role: "tracer_team", isActive: true },
  { id: "4", name: "Hanny Madiawati, S.S.T., M.T.", email: "hanny.madiawati@polban.ac.id", role: "tracer_team", isActive: true },
  { id: "5", name: "Dr. Ahmad Fauzi, M.Kom.", email: "ahmad.fauzi@polban.ac.id", role: "kaprodi", program: "Teknik Informatika", isActive: true },
  { id: "6", name: "Ir. Siti Nurhasanah, M.T.", email: "siti.nurhasanah@polban.ac.id", role: "kaprodi", program: "Teknik Sipil", isActive: true },
  { id: "7", name: "Prof. Dr. Budi Santoso, M.Sc.", email: "budi.santoso@polban.ac.id", role: "wadir", isActive: true },
  { id: "8", name: "Yeti Nugraheni, S.T., M.T.", email: "yeti.nugraheni@polban.ac.id", role: "tracer_team", isActive: false },
];

const roleBadgeVariant = (role: AppRole) => {
  switch (role) {
    case "admin": return "destructive" as const;
    case "head_tracer": return "default" as const;
    case "wadir": return "secondary" as const;
    default: return "outline" as const;
  }
};

const StaffManagementPage = () => {
  const { toast } = useToast();
  const [staff, setStaff] = useState<StaffAccount[]>(initialStaff);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffAccount | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", email: "", role: "tracer_team" as AppRole, program: "" });

  const filtered = staff.filter((s) => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === "all" || s.role === filterRole;
    return matchSearch && matchRole;
  });

  const resetForm = () => {
    setFormData({ name: "", email: "", role: "tracer_team", program: "" });
    setEditingStaff(null);
  };

  const handleOpenAdd = () => { resetForm(); setIsDialogOpen(true); };

  const handleOpenEdit = (account: StaffAccount) => {
    setEditingStaff(account);
    setFormData({ name: account.name, email: account.email, role: account.role, program: account.program ?? "" });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      toast({ title: "Error", description: "Nama dan email harus diisi", variant: "destructive" });
      return;
    }
    if (editingStaff) {
      setStaff((prev) => prev.map((s) => s.id === editingStaff.id ? { ...s, ...formData } : s));
      toast({ title: "Berhasil", description: "Akun staff berhasil diperbarui" });
    } else {
      setStaff((prev) => [...prev, { id: Date.now().toString(), ...formData, isActive: true }]);
      toast({ title: "Berhasil", description: "Akun staff baru berhasil ditambahkan" });
    }
    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = () => {
    if (!deletingId) return;
    setStaff((prev) => prev.filter((s) => s.id !== deletingId));
    toast({ title: "Berhasil", description: "Akun staff berhasil dihapus" });
    setIsDeleteDialogOpen(false);
    setDeletingId(null);
  };

  const toggleActive = (id: string) => {
    setStaff((prev) => prev.map((s) => s.id === id ? { ...s, isActive: !s.isActive } : s));
  };

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
                <SelectItem key={r} value={r}>{roleLabels[r]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Staff list */}
        <div className="grid gap-3">
          {filtered.map((account) => (
            <Card key={account.id} className={`glass-card transition-all ${!account.isActive ? "opacity-60" : ""}`}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-orange-light/20 flex items-center justify-center border border-border">
                    <User className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-sm">{account.name}</h4>
                      <Badge variant={roleBadgeVariant(account.role)}>{roleLabels[account.role]}</Badge>
                      {!account.isActive && <Badge variant="secondary">Nonaktif</Badge>}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Mail className="w-3 h-3" />{account.email}
                      </span>
                      {account.program && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Shield className="w-3 h-3" />{account.program}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => toggleActive(account.id)}>
                    {account.isActive ? "Nonaktifkan" : "Aktifkan"}
                  </Button>
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
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingStaff ? "Edit Akun Staff" : "Tambah Akun Staff"}</DialogTitle>
            <DialogDescription>
              {editingStaff ? "Perbarui informasi akun staff." : "Tambahkan akun staff baru ke sistem."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nama Lengkap</Label>
              <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Dr. Nama Lengkap, M.T." />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="email@polban.ac.id" />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v as AppRole })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {staffRoles.map((r) => (
                    <SelectItem key={r} value={r}>{roleLabels[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {formData.role === "kaprodi" && (
              <div className="space-y-2">
                <Label>Program Studi</Label>
                <Input value={formData.program} onChange={(e) => setFormData({ ...formData, program: e.target.value })} placeholder="Teknik Informatika" />
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Batal</Button>
              <Button type="submit">{editingStaff ? "Simpan" : "Tambah"}</Button>
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
