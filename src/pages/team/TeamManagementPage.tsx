import { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
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
import { Plus, Edit, Trash2, User, Mail, Phone } from "lucide-react";

interface TeamMember {
  id: string;
  name: string;
  role: string;
  email?: string;
  phone?: string;
  isLead: boolean;
}

const initialTeamMembers: TeamMember[] = [
  {
    id: "1",
    name: "Dr. Tomy Andrianto, S.S.T., M-M.Par.",
    role: "Wakil Direktur Bidang Kemahasiswaan",
    email: "wadir3@polban.ac.id",
    isLead: true,
  },
  {
    id: "2",
    name: "Rony Pasonang Sihombing, S.T., M.Eng.",
    role: "Tim Tracer Study",
    isLead: false,
  },
  {
    id: "3",
    name: "Hanny Madiawati, S.S.T., M.T.",
    role: "Tim Tracer Study",
    isLead: false,
  },
  {
    id: "4",
    name: "Yeti Nugraheni, S.T., M.T.",
    role: "Tim Tracer Study",
    isLead: false,
  },
  {
    id: "5",
    name: "Asri Maspupah, S.S.T., M.T.",
    role: "Tim Tracer Study",
    isLead: false,
  },
  {
    id: "6",
    name: "Susilawati, S.T., M.Eng.",
    role: "Tim Tracer Study",
    isLead: false,
  },
];

const TeamManagementPage = () => {
  const { toast } = useToast();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(initialTeamMembers);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [deletingMemberId, setDeletingMemberId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    role: "",
    email: "",
    phone: "",
    isLead: false,
  });

  const resetForm = () => {
    setFormData({
      name: "",
      role: "",
      email: "",
      phone: "",
      isLead: false,
    });
    setEditingMember(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (member: TeamMember) => {
    setEditingMember(member);
    setFormData({
      name: member.name,
      role: member.role,
      email: member.email || "",
      phone: member.phone || "",
      isLead: member.isLead,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.role) {
      toast({
        title: "Error",
        description: "Nama dan role harus diisi",
        variant: "destructive",
      });
      return;
    }

    if (editingMember) {
      // Update existing member
      setTeamMembers(prev =>
        prev.map(member =>
          member.id === editingMember.id
            ? {
                ...member,
                name: formData.name,
                role: formData.role,
                email: formData.email || undefined,
                phone: formData.phone || undefined,
                isLead: formData.isLead,
              }
            : member
        )
      );
      toast({
        title: "Berhasil",
        description: "Data koordinator berhasil diperbarui",
      });
    } else {
      // Add new member
      const newMember: TeamMember = {
        id: Date.now().toString(),
        name: formData.name,
        role: formData.role,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        isLead: formData.isLead,
      };
      setTeamMembers(prev => [...prev, newMember]);
      toast({
        title: "Berhasil",
        description: "Koordinator baru berhasil ditambahkan",
      });
    }

    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = () => {
    if (!deletingMemberId) return;
    
    setTeamMembers(prev => prev.filter(member => member.id !== deletingMemberId));
    toast({
      title: "Berhasil",
      description: "Data koordinator berhasil dihapus",
    });
    setIsDeleteDialogOpen(false);
    setDeletingMemberId(null);
  };

  const confirmDelete = (id: string) => {
    setDeletingMemberId(id);
    setIsDeleteDialogOpen(true);
  };

  const leadMember = teamMembers.find(m => m.isLead);
  const regularMembers = teamMembers.filter(m => !m.isLead);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-heading text-2xl font-bold">Tim Koordinator</h2>
            <p className="text-muted-foreground">Kelola tim koordinator yang tampil di landing page</p>
          </div>
          <Button onClick={handleOpenAdd}>
            <Plus className="mr-2 h-4 w-4" />
            Tambah Koordinator
          </Button>
        </div>

        {/* Lead Coordinator */}
        {leadMember && (
          <Card className="glass-card border-2 border-primary/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-primary">Koordinator Utama</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/30 to-orange-light/30 flex items-center justify-center border-2 border-primary/50">
                    <User className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-lg">{leadMember.name}</h3>
                    <p className="text-primary text-sm">{leadMember.role}</p>
                    {leadMember.email && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <Mail className="w-3 h-3" />
                        {leadMember.email}
                      </div>
                    )}
                    {leadMember.phone && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Phone className="w-3 h-3" />
                        {leadMember.phone}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleOpenEdit(leadMember)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => confirmDelete(leadMember.id)}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Hapus
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Team Members Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {regularMembers.map((member) => (
            <Card key={member.id} className="glass-card hover:border-primary/30 transition-all">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-secondary to-secondary/50 flex items-center justify-center border border-border">
                      <User className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm leading-tight">{member.name}</h4>
                      <p className="text-xs text-muted-foreground">{member.role}</p>
                      {member.email && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <Mail className="w-3 h-3" />
                          {member.email}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-4 justify-end">
                  <Button variant="outline" size="sm" onClick={() => handleOpenEdit(member)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => confirmDelete(member.id)}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Hapus
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Add/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingMember ? "Edit Koordinator" : "Tambah Koordinator"}
              </DialogTitle>
              <DialogDescription>
                {editingMember
                  ? "Perbarui data koordinator"
                  : "Tambahkan anggota baru ke tim koordinator"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nama Lengkap *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Dr. Nama Lengkap, S.T., M.T."
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role / Jabatan *</Label>
                  <Input
                    id="role"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    placeholder="Tim Tracer Study"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@polban.ac.id"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telepon</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="(022) 1234567"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isLead"
                    checked={formData.isLead}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, isLead: checked as boolean })
                    }
                  />
                  <Label htmlFor="isLead" className="text-sm font-normal">
                    Jadikan sebagai koordinator utama
                  </Label>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Batal
                </Button>
                <Button type="submit">
                  {editingMember ? "Simpan Perubahan" : "Tambah"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Hapus Koordinator?</AlertDialogTitle>
              <AlertDialogDescription>
                Apakah Anda yakin ingin menghapus data koordinator ini? Tindakan ini tidak dapat dibatalkan.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Hapus
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
};

export default TeamManagementPage;
