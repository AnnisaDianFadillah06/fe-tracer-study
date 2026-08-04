import { useState, useEffect } from "react";
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
import { Plus, Edit, Trash2, Search, Building2, Loader2, AlertCircle } from "lucide-react";
import api from "@/lib/api";

// ── Prodi Tab ────────────────────────────────────────────────
interface Prodi { id: string; name: string; code: string; dikti_code?: string; degree: string; jurusan: string; isActive: boolean; }

// ── Provinsi Tab ─────────────────────────────────────────────
interface Provinsi { id: string; name: string; code: string; }

// ── Kota Tab ─────────────────────────────────────────────────
interface Kota { id: string; name: string; provinsiId: string; code: string; }

const jurusanOptions = [
  "Teknik Sipil", "Teknik Mesin", "Teknik Refrigerasi & Tata Udara",
  "Teknik Konversi Energi", "Teknik Elektro", "Teknik Kimia",
  "Teknik Komputer & Informatika", "Akuntansi", "Administrasi Niaga", "Bahasa Inggris",
];

/**
 * Baris keterangan di dalam tabel untuk keadaan selain "ada data":
 * sedang memuat, gagal memuat, atau kosong.
 *
 * Sebelumnya ketiga keadaan itu tampil identik — tabel kosong tanpa
 * penjelasan — sehingga pengguna tidak tahu apakah sistem sedang bekerja,
 * gagal, atau memang tidak ada datanya.
 */
const TableStateRow = ({
  colSpan, isLoading, error, isEmpty, emptyText,
}: {
  colSpan: number; isLoading: boolean; error: string | null;
  isEmpty: boolean; emptyText: string;
}) => {
  if (!isLoading && !error && !isEmpty) return null;

  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="h-32 text-center align-middle">
        {isLoading ? (
          <span className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Memuat data...
          </span>
        ) : error ? (
          <span className="flex items-center justify-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4" aria-hidden />
            {error}
          </span>
        ) : (
          <span className="text-muted-foreground">{emptyText}</span>
        )}
      </TableCell>
    </TableRow>
  );
};

const MasterDataPage = () => {
  const { toast } = useToast();

  // Prodi state
  const [prodiList, setProdiList] = useState<Prodi[]>([]);
  const [prodiDialog, setProdiDialog] = useState(false);
  const [editProdi, setEditProdi] = useState<Prodi | null>(null);
  const [prodiForm, setProdiForm] = useState({ name: "", code: "", degree: "D3", jurusan: "" });
  const [deleteProdiId, setDeleteProdiId] = useState<string | null>(null);
  const [prodiSearch, setProdiSearch] = useState("");

  // Provinsi state
  const [provList, setProvList] = useState<Provinsi[]>([]);
  const [provDialog, setProvDialog] = useState(false);
  const [editProv, setEditProv] = useState<Provinsi | null>(null);
  const [provForm, setProvForm] = useState({ name: "", code: "" });
  const [deleteProvId, setDeleteProvId] = useState<string | null>(null);

  // Kota state
  const [kotaList, setKotaList] = useState<Kota[]>([]);

  // Status pemuatan awal. Ketiga permintaan dijalankan berbarengan dan
  // ditunggu bersama, karena tab Kota membutuhkan provList untuk
  // menerjemahkan province_code menjadi nama provinsi.
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Fetch data from API
  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const [prodiRes, provRes, kotaRes] = await Promise.all([
          api.get("/programs"),
          api.get("/provinces"),
          api.get("/cities"),
        ]);
        if (!active) return;

        const programs = prodiRes.data.data ?? prodiRes.data;
        setProdiList((programs as any[]).map((p: any) => ({
          id: String(p.id), name: p.name, code: p.code, dikti_code: p.dikti_code ?? "",
          degree: p.degree, jurusan: p.jurusan, isActive: p.is_active !== false,
        })));
        setProvList((provRes.data.data as any[]).map((p: any) => ({ id: String(p.id), name: p.name, code: p.code })));
        setKotaList((kotaRes.data.data as any[]).map((c: any) => ({ id: String(c.id), name: c.name, provinsiId: c.province_code, code: c.code })));
        setLoadError(null);
      } catch (e: any) {
        if (!active) return;
        // Sebelumnya galat ditelan diam-diam, sehingga kegagalan muat
        // tampak persis sama dengan data kosong. Sekarang dibedakan.
        setLoadError(e?.response?.data?.message ?? "Gagal memuat data master. Periksa koneksi ke server.");
      } finally {
        if (active) setIsLoading(false);
      }
    })();

    return () => { active = false; };
  }, []);
  const [kotaDialog, setKotaDialog] = useState(false);
  const [editKota, setEditKota] = useState<Kota | null>(null);
  const [kotaForm, setKotaForm] = useState({ name: "", provinsiId: "", code: "" });
  const [deleteKotaId, setDeleteKotaId] = useState<string | null>(null);

  // ── Prodi handlers ─────────────────────────────────────────
  const openProdiCreate = () => { setEditProdi(null); setProdiForm({ name: "", code: "", degree: "D3", jurusan: "" }); setProdiDialog(true); };
  const openProdiEdit = (p: Prodi) => { setEditProdi(p); setProdiForm({ name: p.name, code: p.code, degree: p.degree, jurusan: p.jurusan }); setProdiDialog(true); };
  const saveProdi = async () => {
    if (!prodiForm.name || !prodiForm.code || !prodiForm.jurusan) { toast({ title: "Error", description: "Semua field wajib diisi.", variant: "destructive" }); return; }
    try {
      if (editProdi) {
        await api.put(`/programs/${editProdi.id}`, prodiForm);
        setProdiList(prodiList.map((p) => p.id === editProdi.id ? { ...p, ...prodiForm, isActive: true } : p));
        toast({ title: "Berhasil", description: "Prodi diperbarui." });
      } else {
        const { data } = await api.post("/programs", prodiForm);
        const created = data.data ?? data;
        setProdiList([...prodiList, { id: String(created.id), ...prodiForm, isActive: true }]);
        toast({ title: "Berhasil", description: "Prodi ditambahkan." });
      }
      setProdiDialog(false);
    } catch (e: any) { toast({ title: "Gagal", description: e.response?.data?.message ?? "Terjadi kesalahan", variant: "destructive" }); }
  };
  const deleteProdi = async () => {
    try { await api.delete(`/programs/${deleteProdiId}`); setProdiList(prodiList.filter((p) => p.id !== deleteProdiId)); toast({ title: "Dihapus" }); }
    catch (e: any) { toast({ title: "Gagal", description: e.response?.data?.message ?? "Gagal menghapus", variant: "destructive" }); }
    setDeleteProdiId(null);
  };

  // ── Provinsi handlers ──────────────────────────────────────
  const openProvCreate = () => { setEditProv(null); setProvForm({ name: "", code: "" }); setProvDialog(true); };
  const openProvEdit = (p: Provinsi) => { setEditProv(p); setProvForm({ name: p.name, code: p.code }); setProvDialog(true); };
  const saveProv = async () => {
    if (!provForm.name || !provForm.code) { toast({ title: "Error", description: "Semua field wajib diisi.", variant: "destructive" }); return; }
    try {
      if (editProv) {
        await api.put(`/provinces/${editProv.id}`, provForm);
        setProvList(provList.map((p) => p.id === editProv.id ? { ...p, ...provForm } : p));
      } else {
        const { data } = await api.post("/provinces", provForm);
        const created = data.data ?? data;
        setProvList([...provList, { id: String(created.id), ...provForm }]);
      }
      setProvDialog(false);
      toast({ title: "Berhasil" });
    } catch (e: any) { toast({ title: "Gagal", description: e.response?.data?.message ?? "Terjadi kesalahan", variant: "destructive" }); }
  };
  const deleteProv = async () => {
    try { await api.delete(`/provinces/${deleteProvId}`); setProvList(provList.filter((p) => p.id !== deleteProvId)); toast({ title: "Dihapus" }); }
    catch (e: any) { toast({ title: "Gagal", description: e.response?.data?.message ?? "Gagal menghapus", variant: "destructive" }); }
    setDeleteProvId(null);
  };

  // ── Kota handlers ──────────────────────────────────────────
  const openKotaCreate = () => { setEditKota(null); setKotaForm({ name: "", provinsiId: "", code: "" }); setKotaDialog(true); };
  const openKotaEdit = (k: Kota) => { setEditKota(k); setKotaForm({ name: k.name, provinsiId: k.provinsiId, code: k.code }); setKotaDialog(true); };
  const saveKota = async () => {
    if (!kotaForm.name || !kotaForm.provinsiId || !kotaForm.code) { toast({ title: "Error", description: "Semua field wajib diisi.", variant: "destructive" }); return; }
    try {
      const payload = { name: kotaForm.name, province_code: kotaForm.provinsiId, code: kotaForm.code };
      if (editKota) {
        await api.put(`/cities/${editKota.id}`, payload);
        setKotaList(kotaList.map((k) => k.id === editKota.id ? { ...k, ...kotaForm } : k));
      } else {
        const { data } = await api.post("/cities", payload);
        const created = data.data ?? data;
        setKotaList([...kotaList, { id: String(created.id), ...kotaForm }]);
      }
      setKotaDialog(false);
      toast({ title: "Berhasil" });
    } catch (e: any) { toast({ title: "Gagal", description: e.response?.data?.message ?? "Terjadi kesalahan", variant: "destructive" }); }
  };
  const deleteKota = async () => {
    try { await api.delete(`/cities/${deleteKotaId}`); setKotaList(kotaList.filter((k) => k.id !== deleteKotaId)); toast({ title: "Dihapus" }); }
    catch (e: any) { toast({ title: "Gagal", description: e.response?.data?.message ?? "Gagal menghapus", variant: "destructive" }); }
    setDeleteKotaId(null);
  };

  const filteredProdi = prodiList.filter(
    (p) => p.name.toLowerCase().includes(prodiSearch.toLowerCase())
        || p.code.toLowerCase().includes(prodiSearch.toLowerCase()),
  );

  // Selama memuat, jumlah pada label tab belum bermakna — tampilkan titik
  // supaya tidak terbaca sebagai "datanya memang nol".
  const countLabel = (n: number) => (isLoading ? "…" : String(n));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Building2 className="h-6 w-6" /> Master Data</h1>
          <p className="text-muted-foreground">Kelola data referensi: program studi, provinsi, dan kota</p>
        </div>

        <Tabs defaultValue="prodi">
          <TabsList>
            <TabsTrigger value="prodi">Program Studi ({countLabel(prodiList.length)})</TabsTrigger>
            <TabsTrigger value="provinsi">Provinsi ({countLabel(provList.length)})</TabsTrigger>
            <TabsTrigger value="kota">Kota ({countLabel(kotaList.length)})</TabsTrigger>
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
                    <TableStateRow
                      colSpan={5} isLoading={isLoading} error={loadError}
                      isEmpty={filteredProdi.length === 0}
                      emptyText={prodiSearch ? "Tidak ada prodi yang cocok dengan pencarian." : "Belum ada data program studi."}
                    />
                    {filteredProdi.map((p) => (
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
                    <TableStateRow
                      colSpan={3} isLoading={isLoading} error={loadError}
                      isEmpty={provList.length === 0} emptyText="Belum ada data provinsi."
                    />
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
                    <TableStateRow
                      colSpan={4} isLoading={isLoading} error={loadError}
                      isEmpty={kotaList.length === 0} emptyText="Belum ada data kota."
                    />
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
