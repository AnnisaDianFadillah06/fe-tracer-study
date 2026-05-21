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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";

interface StaffUser {
  id: number;
  name: string;
  email: string;
  role: string;
  scope: string;
  program_id: number | null;
  program_name: string | null;
  jurusan: string | null;
  created_at: string;
}

const allRoles: AppRole[] = ["head_tracer", "tracer_team", "wadir", "kajur", "kaprodi"];

const roleBadgeVariant = (role: string) => {
  switch (role) {
    case "head_tracer": return "destructive" as const;
    case "tracer_team": return "default" as const;
    case "wadir": return "secondary" as const;
    default: return "outline" as const;
  }
};

const UserManagementPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery<StaffUser[]>({
    queryKey: ["users"],
    queryFn: async () => {
      const { data } = await api.get("/users");
      return data.data;
    },
  });

  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editingUser, setEditingUser] = useState<StaffUser | null>(null);
  const [formData, setFormData] = useState({ name: "", email: "", role: "tracer_team" as string, jurusan: "", program_id: "", password: "" });

  const createMutation = useMutation({
    mutationFn: (payload: any) => api.post("/users", payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...payload }: any) => api.put(`/users/${id}`, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/users/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });

  const filtered = users.filter((u) => {
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === "all" || u.role === filterRole;
    return matchSearch && matchRole;
  });

  const resetForm = () => setFormData({ name: "", email: "", role: "tracer_team", jurusan: "", program_id: "", password: "" });

  const openCreate = () => { resetForm(); setEditingUser(null); setDialogOpen(true); };
  const openEdit = (user: StaffUser) => {
    setEditingUser(user);
    setFormData({ name: user.name, email: user.email, role: user.role, jurusan: user.jurusan || "", program_id: user.program_id?.toString() || "", password: "" });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.email) {
      toast({ title: "Error", description: "Nama dan email wajib diisi.", variant: "destructive" });
      return;
    }
    if (!editingUser && !formData.password) {
      toast({ title: "Error", description: "Password wajib diisi untuk user baru.", variant: "destructive" });
      return;
    }

    try {
      const payload: any = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        program_id: formData.program_id ? parseInt(formData.program_id) : null,
        jurusan: formData.jurusan || null,
      };
      if (formData.password) payload.password = formData.password;

      if (editingUser) {
        await updateMutation.mutateAsync({ id: editingUser.id, ...payload });
        toast({ title: "Berhasil", description: "User berhasil diperbarui." });
      } else {
        await createMutation.mutateAsync(payload);
        toast({ title: "Berhasil", description: "User baru berhasil ditambahkan." });
      }
      setDialogOpen(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.response?.data?.message || "Terjadi kesalahan.", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      toast({ title: "Berhasil", description: "User berhasil dihapus." });
    } catch (err: any) {
      toast({ title: "Error", description: err.response?.data?.message || "Gagal menghapus.", variant: "destructive" });
    }
    setDeleteId(null);
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
            {isLoading ? (
              <p className="text-center text-muted-foreground py-8">Memuat data...</p>
            ) : (
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
                      <TableCell><Badge variant={roleBadgeVariant(user.role)}>{roleLabels[user.role as AppRole] ?? user.role}</Badge></TableCell>
                      <TableCell className="text-muted-foreground">{user.scope || "—"}</TableCell>
                      <TableCell><Badge variant="default">Aktif</Badge></TableCell>
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
            )}
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
            <div><Label>Password {editingUser && "(kosongkan jika tidak diubah)"}</Label><Input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} /></div>
            <div>
              <Label>Role</Label>
              <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v, jurusan: "", program_id: "" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{allRoles.map((r) => <SelectItem key={r} value={r}>{roleLabels[r]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {formData.role === "kajur" && (
              <div><Label>Jurusan</Label><Input value={formData.jurusan} onChange={(e) => setFormData({ ...formData, jurusan: e.target.value })} placeholder="Nama jurusan" /></div>
            )}
            {formData.role === "kaprodi" && (
              <div><Label>Program ID</Label><Input value={formData.program_id} onChange={(e) => setFormData({ ...formData, program_id: e.target.value })} placeholder="ID program studi" /></div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>{editingUser ? "Simpan" : "Tambah"}</Button>
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
