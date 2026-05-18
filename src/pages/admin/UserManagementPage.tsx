import { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/common/use-toast";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Edit, Trash2, Search, Users } from "lucide-react";
import { type AppRole, roleLabels } from "@/lib/rbac";

interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: AppRole;
  jurusan?: string;
  program?: string;
  isActive: boolean;
}

const allRoles: AppRole[] = ["head_tracer", "tracer_team", "wadir", "kajur", "kaprodi"];

const jurusanList = [
  "Teknik Sipil", "Teknik Mesin", "Teknik Refrigerasi & Tata Udara",
  "Teknik Konversi Energi", "Teknik Elektro", "Teknik Kimia",
  "Teknik Komputer & Informatika", "Akuntansi", "Administrasi Niaga", "Bahasa Inggris",
];

const prodiList = [
  "D3 Teknik Konstruksi Gedung", "D4 Teknik Perancangan Jalan & Jembatan",
  "D3 Teknik Mesin", "D4 Teknik Informatika", "D3 Teknik Informatika",
  "D3 Akuntansi", "D4 Keuangan Syariah", "D3 Administrasi Bisnis",
];

const initialUsers: UserAccount[] = [
  { id: "1", name: "Kepala Tracer Study", email: "head.tracer@test.com", role: "head_tracer", isActive: true },
  { id: "2", name: "Tim Tracer 1", email: "tracer1@test.com", role: "tracer_team", isActive: true },
  { id: "3", name: "Tim Tracer 2", email: "tracer2@test.com", role: "tracer_team", isActive: true },
  { id: "4", name: "Direktur", email: "direktur@test.com", role: "wadir", isActive: true },
  { id: "5", name: "Wakil Direktur 1", email: "wakil.direktur.1@test.com", role: "wadir", isActive: true },
  { id: "6", name: "Kajur Teknik Informatika", email: "kajur.teknik-komputer-informatika@test.com", role: "kajur", jurusan: "Teknik Komputer & Informatika", isActive: true },
  { id: "7", name: "Kaprodi D4 Teknik Informatika", email: "prodi.ti@test.com", role: "kaprodi", program: "D4 Teknik Informatika", isActive: true },
];

const roleBadgeVariant = (role: AppRole) => {
  switch (role) {
    case "head_tracer": return "destructive" as const;
    case "tracer_team": return "default" as const;
    case "wadir": return "secondary" as const;
    case "kajur": return "outline" as const;
    default: return "outline" as const;
  }
};

const UserManagementPage = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserAccount[]>(initialUsers);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [formData, setFormData] = useState({ name: "", email: "", role: "tracer_team" as AppRole, jurusan: "", program: "", password: "" });

  const filtered = users.filter((u) => {
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === "all" || u.role === filterRole;
    return matchSearch && matchRole;
  });

  const resetForm = () => setFormData({ name: "", email: "", role: "tracer_team", jurusan: "", program: "", password: "" });

  const openCreate = () => { resetForm(); setEditingUser(null); setDialogOpen(true); };
  const openEdit = (user: UserAccount) => {
    setEditingUser(user);
    setFormData({ name: user.name, email: user.email, role: user.role, jurusan: user.jurusan || "", program: user.program || "", password: "" });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.name || !formData.email) {
      toast({ title: "Error", description: "Nama dan email wajib diisi.", variant: "destructive" });
      return;
    }
    if (!editingUser && !formData.password) {
      toast({ title: "Error", description: "Password wajib diisi untuk user baru.", variant: "destructive" });
      return;
    }
    if (formData.role === "kajur" && !formData.jurusan) {
      toast({ title: "Error", description: "Jurusan wajib dipilih untuk role Kajur.", variant: "destructive" });
      return;
    }
    if (formData.role === "kaprodi" && !formData.program) {
      toast({ title: "Error", description: "Program studi wajib dipilih untuk role Kaprodi.", variant: "destructive" });
      return;
    }

    if (editingUser) {
      setUsers(users.map((u) => u.id === editingUser.id ? { ...u, ...formData } : u));
      toast({ title: "Berhasil", description: "User berhasil diperbarui." });
    } else {
      const newUser: UserAccount = { id: Date.now().toString(), ...formData, isActive: true };
      setUsers([...users, newUser]);
      toast({ title: "Berhasil", description: "User baru berhasil ditambahkan." });
    }
    setDialogOpen(false);
  };

  const handleDelete = () => {
    if (!deleteId) return;
    setUsers(users.filter((u) => u.id !== deleteId));
    setDeleteId(null);
    toast({ title: "Berhasil", description: "User berhasil dihapus." });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="h-6 w-6" /> Kelola Staff</h1>
            <p className="text-muted-foreground">Manajemen semua akun pengguna sistem</p>
          </div>
          <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" /> Tambah User</Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {allRoles.map((role) => (
            <Card key={role}>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{roleLabels[role]}</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">{users.filter((u) => u.role === role).length}</p></CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Cari nama atau email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
              </div>
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger className="w-[200px]"><SelectValue placeholder="Filter role" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Role</SelectItem>
                  {allRoles.map((r) => <SelectItem key={r} value={r}>{roleLabels[r]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell><Badge variant={roleBadgeVariant(user.role)}>{roleLabels[user.role]}</Badge></TableCell>
                    <TableCell className="text-muted-foreground">{user.jurusan || user.program || "—"}</TableCell>
                    <TableCell><Badge variant={user.isActive ? "default" : "secondary"}>{user.isActive ? "Aktif" : "Nonaktif"}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(user)}><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(user.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Tidak ada user ditemukan.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingUser ? "Edit User" : "Tambah User Baru"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nama</Label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} /></div>
            <div><Label>Email</Label><Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} /></div>
            {!editingUser && <div><Label>Password</Label><Input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} /></div>}
            <div>
              <Label>Role</Label>
              <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v as AppRole, jurusan: "", program: "" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{allRoles.map((r) => <SelectItem key={r} value={r}>{roleLabels[r]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {formData.role === "kajur" && (
              <div>
                <Label>Jurusan</Label>
                <Select value={formData.jurusan} onValueChange={(v) => setFormData({ ...formData, jurusan: v })}>
                  <SelectTrigger><SelectValue placeholder="Pilih jurusan" /></SelectTrigger>
                  <SelectContent>{jurusanList.map((j) => <SelectItem key={j} value={j}>{j}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            {formData.role === "kaprodi" && (
              <div>
                <Label>Program Studi</Label>
                <Select value={formData.program} onValueChange={(v) => setFormData({ ...formData, program: v })}>
                  <SelectTrigger><SelectValue placeholder="Pilih prodi" /></SelectTrigger>
                  <SelectContent>{prodiList.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button onClick={handleSave}>{editingUser ? "Simpan" : "Tambah"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus User?</AlertDialogTitle>
            <AlertDialogDescription>Aksi ini tidak dapat dibatalkan. User akan dihapus permanen dari sistem.</AlertDialogDescription>
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

export default UserManagementPage;
