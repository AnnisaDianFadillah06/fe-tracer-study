import { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/common/use-toast";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Edit, Trash2, Search, Building2 } from "lucide-react";

// ── Prodi Tab ────────────────────────────────────────────────
interface Prodi { id: string; name: string; code: string; degree: string; jurusan: string; isActive: boolean; }

const initialProdi: Prodi[] = [
  { id: "1", name: "Teknik Konstruksi Gedung", code: "TKG", degree: "D3", jurusan: "Teknik Sipil", isActive: true },
  { id: "2", name: "Teknik Perancangan Jalan & Jembatan", code: "TPJJ", degree: "D4", jurusan: "Teknik Sipil", isActive: true },
  { id: "3", name: "Teknik Informatika", code: "TI", degree: "D4", jurusan: "Teknik Komputer & Informatika", isActive: true },
  { id: "4", name: "Teknik Informatika", code: "TI3", degree: "D3", jurusan: "Teknik Komputer & Informatika", isActive: true },
  { id: "5", name: "Akuntansi", code: "AKT3", degree: "D3", jurusan: "Akuntansi", isActive: true },
];

// ── Provinsi Tab ─────────────────────────────────────────────
interface Provinsi { id: string; name: string; code: string; }

const initialProvinsi: Provinsi[] = [
  { id: "1", name: "Jawa Barat", code: "32" },
  { id: "2", name: "DKI Jakarta", code: "31" },
  { id: "3", name: "Jawa Tengah", code: "33" },
  { id: "4", name: "Jawa Timur", code: "35" },
  { id: "5", name: "Banten", code: "36" },
];

// ── Kota Tab ─────────────────────────────────────────────────
interface Kota { id: string; name: string; provinsiId: string; code: string; }

const initialKota: Kota[] = [
  { id: "1", name: "Kota Bandung", provinsiId: "1", code: "3273" },
  { id: "2", name: "Kab. Bandung", provinsiId: "1", code: "3204" },
  { id: "3", name: "Kota Jakarta Selatan", provinsiId: "2", code: "3174" },
  { id: "4", name: "Kota Semarang", provinsiId: "3", code: "3374" },
  { id: "5", name: "Kota Surabaya", provinsiId: "4", code: "3578" },
];

const jurusanOptions = [
  "Teknik Sipil", "Teknik Mesin", "Teknik Refrigerasi & Tata Udara",
  "Teknik Konversi Energi", "Teknik Elektro", "Teknik Kimia",
  "Teknik Komputer & Informatika", "Akuntansi", "Administrasi Niaga", "Bahasa Inggris",
];

const MasterDataPage = () => {
  const { toast } = useToast();

  // Prodi state
  const [prodiList, setProdiList] = useState<Prodi[]>(initialProdi);
  const [prodiDialog, setProdiDialog] = useState(false);
  const [editProdi, setEditProdi] = useState<Prodi | null>(null);
  const [prodiForm, setProdiForm] = useState({ name: "", code: "", degree: "D3", jurusan: "" });
  const [deleteProdiId, setDeleteProdiId] = useState<string | null>(null);
  const [prodiSearch, setProdiSearch] = useState("");

  // Provinsi state
  const [provList, setProvList] = useState<Provinsi[]>(initialProvinsi);
  const [provDialog, setProvDialog] = useState(false);
  const [editProv, setEditProv] = useState<Provinsi | null>(null);
  const [provForm, setProvForm] = useState({ name: "", code: "" });
  const [deleteProvId, setDeleteProvId] = useState<string | null>(null);

  // Kota state
  const [kotaList, setKotaList] = useState<Kota[]>(initialKota);
  const [kotaDialog, setKotaDialog] = useState(false);
  const [editKota, setEditKota] = useState<Kota | null>(null);
  const [kotaForm, setKotaForm] = useState({ name: "", provinsiId: "", code: "" });
  const [deleteKotaId, setDeleteKotaId] = useState<string | null>(null);

  // ── Prodi handlers ─────────────────────────────────────────
  const openProdiCreate = () => { setEditProdi(null); setProdiForm({ name: "", code: "", degree: "D3", jurusan: "" }); setProdiDialog(true); };
  const openProdiEdit = (p: Prodi) => { setEditProdi(p); setProdiForm({ name: p.name, code: p.code, degree: p.degree, jurusan: p.jurusan }); setProdiDialog(true); };
  const saveProdi = () => {
    if (!prodiForm.name || !prodiForm.code || !prodiForm.jurusan) { toast({ title: "Error", description: "Semua field wajib diisi.", variant: "destructive" }); return; }
    if (editProdi) {
      setProdiList(prodiList.map((p) => p.id === editProdi.id ? { ...p, ...prodiForm, isActive: true } : p));
      toast({ title: "Berhasil", description: "Prodi diperbarui." });
    } else {
      setProdiList([...prodiList, { id: Date.now().toString(), ...prodiForm, isActive: true }]);
      toast({ title: "Berhasil", description: "Prodi ditambahkan." });
    }
    setProdiDialog(false);
  };
  const deleteProdi = () => { setProdiList(prodiList.filter((p) => p.id !== deleteProdiId)); setDeleteProdiId(null); toast({ title: "Dihapus" }); };

  // ── Provinsi handlers ──────────────────────────────────────
  const openProvCreate = () => { setEditProv(null); setProvForm({ name: "", code: "" }); setProvDialog(true); };
  const openProvEdit = (p: Provinsi) => { setEditProv(p); setProvForm({ name: p.name, code: p.code }); setProvDialog(true); };
  const saveProv = () => {
    if (!provForm.name || !provForm.code) { toast({ title: "Error", description: "Semua field wajib diisi.", variant: "destructive" }); return; }
    if (editProv) {
      setProvList(provList.map((p) => p.id === editProv.id ? { ...p, ...provForm } : p));
    } else {
      setProvList([...provList, { id: Date.now().toString(), ...provForm }]);
    }
    setProvDialog(false);
    toast({ title: "Berhasil" });
  };
  const deleteProv = () => { setProvList(provList.filter((p) => p.id !== deleteProvId)); setDeleteProvId(null); toast({ title: "Dihapus" }); };

  // ── Kota handlers ──────────────────────────────────────────
  const openKotaCreate = () => { setEditKota(null); setKotaForm({ name: "", provinsiId: "", code: "" }); setKotaDialog(true); };
  const openKotaEdit = (k: Kota) => { setEditKota(k); setKotaForm({ name: k.name, provinsiId: k.provinsiId, code: k.code }); setKotaDialog(true); };
  const saveKota = () => {
    if (!kotaForm.name || !kotaForm.provinsiId || !kotaForm.code) { toast({ title: "Error", description: "Semua field wajib diisi.", variant: "destructive" }); return; }
    if (editKota) {
      setKotaList(kotaList.map((k) => k.id === editKota.id ? { ...k, ...kotaForm } : k));
    } else {
      setKotaList([...kotaList, { id: Date.now().toString(), ...kotaForm }]);
    }
    setKotaDialog(false);
    toast({ title: "Berhasil" });
  };
  const deleteKota = () => { setKotaList(kotaList.filter((k) => k.id !== deleteKotaId)); setDeleteKotaId(null); toast({ title: "Dihapus" }); };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Building2 className="h-6 w-6" /> Master Data</h1>
          <p className="text-muted-foreground">Kelola data referensi: program studi, provinsi, dan kota</p>
        </div>

        <Tabs defaultValue="prodi">
          <TabsList>
            <TabsTrigger value="prodi">Program Studi ({prodiList.length})</TabsTrigger>
            <TabsTrigger value="provinsi">Provinsi ({provList.length})</TabsTrigger>
            <TabsTrigger value="kota">Kota ({kotaList.length})</TabsTrigger>
          </TabsList>

          {/* ── PRODI TAB ── */}
          <TabsContent value="prodi" className="space-y-4">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Cari prodi..." value={prodiSearch} onChange={(e) => setProdiSearch(e.target.value)} className="pl-9" />
              </div>
              <Button onClick={openProdiCreate}><Plus className="h-4 w-4 mr-2" />Tambah Prodi</Button>
            </div>
            <Card>
              <CardContent className="pt-6">
                <Table>
                  <TableHeader><TableRow><TableHead>Kode</TableHead><TableHead>Nama</TableHead><TableHead>Jenjang</TableHead><TableHead>Jurusan</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {prodiList.filter((p) => p.name.toLowerCase().includes(prodiSearch.toLowerCase()) || p.code.toLowerCase().includes(prodiSearch.toLowerCase())).map((p) => (
                      <TableRow key={p.id}>
                        <TableCell><Badge variant="outline">{p.code}</Badge></TableCell>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell>{p.degree}</TableCell>
                        <TableCell className="text-muted-foreground">{p.jurusan}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => openProdiEdit(p)}><Edit className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteProdiId(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── PROVINSI TAB ── */}
          <TabsContent value="provinsi" className="space-y-4">
            <div className="flex justify-end"><Button onClick={openProvCreate}><Plus className="h-4 w-4 mr-2" />Tambah Provinsi</Button></div>
            <Card>
              <CardContent className="pt-6">
                <Table>
                  <TableHeader><TableRow><TableHead>Kode</TableHead><TableHead>Nama Provinsi</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {provList.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell><Badge variant="outline">{p.code}</Badge></TableCell>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => openProvEdit(p)}><Edit className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteProvId(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── KOTA TAB ── */}
          <TabsContent value="kota" className="space-y-4">
            <div className="flex justify-end"><Button onClick={openKotaCreate}><Plus className="h-4 w-4 mr-2" />Tambah Kota</Button></div>
            <Card>
              <CardContent className="pt-6">
                <Table>
                  <TableHeader><TableRow><TableHead>Kode</TableHead><TableHead>Nama Kota</TableHead><TableHead>Provinsi</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {kotaList.map((k) => (
                      <TableRow key={k.id}>
                        <TableCell><Badge variant="outline">{k.code}</Badge></TableCell>
                        <TableCell className="font-medium">{k.name}</TableCell>
                        <TableCell className="text-muted-foreground">{provList.find((p) => p.id === k.provinsiId)?.name || "-"}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => openKotaEdit(k)}><Edit className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteKotaId(k.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Prodi Dialog ── */}
      <Dialog open={prodiDialog} onOpenChange={setProdiDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editProdi ? "Edit Prodi" : "Tambah Prodi"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nama Program Studi</Label><Input value={prodiForm.name} onChange={(e) => setProdiForm({ ...prodiForm, name: e.target.value })} /></div>
            <div><Label>Kode</Label><Input value={prodiForm.code} onChange={(e) => setProdiForm({ ...prodiForm, code: e.target.value })} /></div>
            <div>
              <Label>Jenjang</Label>
              <Select value={prodiForm.degree} onValueChange={(v) => setProdiForm({ ...prodiForm, degree: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="D3">D3</SelectItem><SelectItem value="D4">D4</SelectItem><SelectItem value="S1">S1</SelectItem><SelectItem value="S2">S2</SelectItem></SelectContent>
              </Select>
            </div>
            <div>
              <Label>Jurusan</Label>
              <Select value={prodiForm.jurusan} onValueChange={(v) => setProdiForm({ ...prodiForm, jurusan: v })}>
                <SelectTrigger><SelectValue placeholder="Pilih jurusan" /></SelectTrigger>
                <SelectContent>{jurusanOptions.map((j) => <SelectItem key={j} value={j}>{j}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setProdiDialog(false)}>Batal</Button><Button onClick={saveProdi}>Simpan</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Provinsi Dialog ── */}
      <Dialog open={provDialog} onOpenChange={setProvDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editProv ? "Edit Provinsi" : "Tambah Provinsi"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nama Provinsi</Label><Input value={provForm.name} onChange={(e) => setProvForm({ ...provForm, name: e.target.value })} /></div>
            <div><Label>Kode</Label><Input value={provForm.code} onChange={(e) => setProvForm({ ...provForm, code: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setProvDialog(false)}>Batal</Button><Button onClick={saveProv}>Simpan</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Kota Dialog ── */}
      <Dialog open={kotaDialog} onOpenChange={setKotaDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editKota ? "Edit Kota" : "Tambah Kota"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nama Kota</Label><Input value={kotaForm.name} onChange={(e) => setKotaForm({ ...kotaForm, name: e.target.value })} /></div>
            <div><Label>Kode</Label><Input value={kotaForm.code} onChange={(e) => setKotaForm({ ...kotaForm, code: e.target.value })} /></div>
            <div>
              <Label>Provinsi</Label>
              <Select value={kotaForm.provinsiId} onValueChange={(v) => setKotaForm({ ...kotaForm, provinsiId: v })}>
                <SelectTrigger><SelectValue placeholder="Pilih provinsi" /></SelectTrigger>
                <SelectContent>{provList.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setKotaDialog(false)}>Batal</Button><Button onClick={saveKota}>Simpan</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmations ── */}
      <AlertDialog open={!!deleteProdiId} onOpenChange={() => setDeleteProdiId(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Hapus Prodi?</AlertDialogTitle><AlertDialogDescription>Data prodi akan dihapus permanen.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={deleteProdi} className="bg-destructive text-destructive-foreground">Hapus</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={!!deleteProvId} onOpenChange={() => setDeleteProvId(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Hapus Provinsi?</AlertDialogTitle><AlertDialogDescription>Data provinsi akan dihapus permanen.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={deleteProv} className="bg-destructive text-destructive-foreground">Hapus</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={!!deleteKotaId} onOpenChange={() => setDeleteKotaId(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Hapus Kota?</AlertDialogTitle><AlertDialogDescription>Data kota akan dihapus permanen.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={deleteKota} className="bg-destructive text-destructive-foreground">Hapus</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default MasterDataPage;
