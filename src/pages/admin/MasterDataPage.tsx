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
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Edit, Trash2, Search, Building2, Loader2, AlertCircle, ListChecks } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { useJurusan, JURUSAN_QUERY_KEY, type Jurusan } from "@/hooks/common/useJurusan";
import { useFakultas, FAKULTAS_QUERY_KEY, type Fakultas } from "@/hooks/common/useFakultas";
import { useDegrees, DEGREES_QUERY_KEY, type Degree } from "@/hooks/common/useDegrees";

// ── Prodi Tab ────────────────────────────────────────────────
interface Prodi { id: string; name: string; code: string; dikti_code?: string; degree: string; jurusan: string; isActive: boolean; }

// ── Provinsi Tab ─────────────────────────────────────────────
interface Provinsi { id: string; name: string; code: string; }

// ── Kota Tab ─────────────────────────────────────────────────
interface Kota { id: string; name: string; provinsiId: string; code: string; }

// Daftar jurusan tidak lagi ditulis di sini. Larik hardcoded yang dulu ada
// di tempat ini tertinggal dari basis data — "Teknik Aeronautika" tidak
// tercantum, sehingga program studi di jurusan itu tidak pernah bisa dipilih
// jurusannya dengan benar. Sekarang dari master data, lihat useJurusan().

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
  const queryClient = useQueryClient();

  // Jurusan — dari master data, bukan daftar tetap
  const { jurusanList, isLoading: jurusanLoading, isError: jurusanError } = useJurusan();
  const [jurusanDialog, setJurusanDialog] = useState(false);
  const [editJurusan, setEditJurusan] = useState<Jurusan | null>(null);
  const [jurusanForm, setJurusanForm] = useState({ name: "" });
  const [deleteJurusanId, setDeleteJurusanId] = useState<number | null>(null);
  const [jurusanSaving, setJurusanSaving] = useState(false);

  const refreshJurusan = () => queryClient.invalidateQueries({ queryKey: JURUSAN_QUERY_KEY });

  const saveJurusan = async () => {
    const name = jurusanForm.name.trim();
    if (!name) return;

    setJurusanSaving(true);
    try {
      const { data } = editJurusan
        ? await api.put(`/jurusans/${editJurusan.id}`, { name })
        : await api.post("/jurusans", { name });

      toast({ title: "Berhasil", description: data.message ?? "Jurusan tersimpan." });
      setJurusanDialog(false);
      setEditJurusan(null);
      setJurusanForm({ name: "" });
      await refreshJurusan();
      // Nama jurusan menempel di program studi, jadi daftarnya ikut basi
      // setelah penggantian nama.
      await reloadProdi();
    } catch (e: any) {
      toast({
        title: "Gagal",
        description: e?.response?.data?.message ?? "Jurusan gagal disimpan.",
        variant: "destructive",
      });
    } finally {
      setJurusanSaving(false);
    }
  };

  const confirmDeleteJurusan = async () => {
    if (deleteJurusanId === null) return;
    try {
      const { data } = await api.delete(`/jurusans/${deleteJurusanId}`);
      toast({ title: "Berhasil", description: data.message ?? "Jurusan dihapus." });
      await refreshJurusan();
    } catch (e: any) {
      toast({
        title: "Gagal",
        description: e?.response?.data?.message ?? "Jurusan gagal dihapus.",
        variant: "destructive",
      });
    } finally {
      setDeleteJurusanId(null);
    }
  };

  // ── Jurusan ↔ Program Studi (keanggotaan eksplisit, sumber cakupan Kajur) ──
  const [scopeDialogJurusan, setScopeDialogJurusan] = useState<Jurusan | null>(null);
  const [scopeProgramIds, setScopeProgramIds] = useState<number[]>([]);
  const [scopeProdiSearch, setScopeProdiSearch] = useState("");
  const [scopeSaving, setScopeSaving] = useState(false);

  const openJurusanScopeDialog = (j: Jurusan) => {
    setScopeDialogJurusan(j);
    setScopeProgramIds(j.program_ids);
    setScopeProdiSearch("");
  };

  const toggleScopeProgram = (id: number) => {
    setScopeProgramIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const saveJurusanScope = async () => {
    if (!scopeDialogJurusan) return;
    setScopeSaving(true);
    try {
      await api.put(`/jurusans/${scopeDialogJurusan.id}/programs`, { program_ids: scopeProgramIds });
      toast({ title: "Berhasil", description: "Keanggotaan program studi jurusan tersimpan." });
      setScopeDialogJurusan(null);
      await refreshJurusan();
    } catch (e: any) {
      toast({ title: "Gagal", description: e?.response?.data?.message ?? "Gagal menyimpan.", variant: "destructive" });
    } finally {
      setScopeSaving(false);
    }
  };

  // ── Jenjang — master data, menggantikan tetapan DEGREES ────────────────
  const { degrees, activeCodes, isLoading: degreeLoading, isError: degreeError } = useDegrees();
  const [degreeDialog, setDegreeDialog] = useState(false);
  const [editDegree, setEditDegree] = useState<Degree | null>(null);
  const [degreeForm, setDegreeForm] = useState({ code: "", label: "" });
  const [deleteDegreeId, setDeleteDegreeId] = useState<number | null>(null);
  const [degreeSaving, setDegreeSaving] = useState(false);

  const refreshDegrees = () => queryClient.invalidateQueries({ queryKey: DEGREES_QUERY_KEY });

  /**
   * Kode jenjang bawaan sengaja tidak ikut dikirim saat mengubah. Peladen
   * menolaknya dengan 422 karena kode sudah tersimpan di gudang data, dan
   * mengirimkannya kembali tanpa perubahan pun tetap terbaca sebagai
   * percobaan mengubah.
   */
  const saveDegree = async () => {
    const code = degreeForm.code.trim();
    const label = degreeForm.label.trim();
    if (!code) return;
    setDegreeSaving(true);
    try {
      const { data } = editDegree
        ? await api.put(`/degrees/${editDegree.id}`, {
            label: label || code,
            ...(editDegree.is_seeded ? {} : { code }),
          })
        : await api.post("/degrees", { code, label: label || code });
      toast({ title: "Berhasil", description: data.message ?? "Jenjang tersimpan." });
      setDegreeDialog(false);
      setEditDegree(null);
      setDegreeForm({ code: "", label: "" });
      await refreshDegrees();
    } catch (e: any) {
      toast({ title: "Gagal", description: e?.response?.data?.message ?? "Jenjang gagal disimpan.", variant: "destructive" });
    } finally {
      setDegreeSaving(false);
    }
  };

  const toggleDegreeActive = async (d: Degree) => {
    try {
      await api.put(`/degrees/${d.id}`, { is_active: !d.is_active });
      await refreshDegrees();
    } catch (e: any) {
      toast({ title: "Gagal", description: e?.response?.data?.message ?? "Status jenjang gagal diubah.", variant: "destructive" });
    }
  };

  const confirmDeleteDegree = async () => {
    if (deleteDegreeId === null) return;
    try {
      const { data } = await api.delete(`/degrees/${deleteDegreeId}`);
      toast({ title: "Berhasil", description: data.message ?? "Jenjang dihapus." });
      await refreshDegrees();
    } catch (e: any) {
      toast({ title: "Gagal", description: e?.response?.data?.message ?? "Jenjang gagal dihapus.", variant: "destructive" });
    } finally {
      setDeleteDegreeId(null);
    }
  };

  // ── Fakultas — entity baru, sumber cakupan Dekan ──────────────
  const { fakultasList, isLoading: fakultasLoading, isError: fakultasError } = useFakultas();
  const [fakultasDialog, setFakultasDialog] = useState(false);
  const [editFakultas, setEditFakultas] = useState<Fakultas | null>(null);
  const [fakultasForm, setFakultasForm] = useState({ name: "" });
  const [deleteFakultasId, setDeleteFakultasId] = useState<number | null>(null);
  const [fakultasSaving, setFakultasSaving] = useState(false);

  const refreshFakultas = () => queryClient.invalidateQueries({ queryKey: FAKULTAS_QUERY_KEY });

  const saveFakultas = async () => {
    const name = fakultasForm.name.trim();
    if (!name) return;
    setFakultasSaving(true);
    try {
      const { data } = editFakultas
        ? await api.put(`/fakultas/${editFakultas.id}`, { name })
        : await api.post("/fakultas", { name });
      toast({ title: "Berhasil", description: data.message ?? "Fakultas tersimpan." });
      setFakultasDialog(false);
      setEditFakultas(null);
      setFakultasForm({ name: "" });
      await refreshFakultas();
    } catch (e: any) {
      toast({ title: "Gagal", description: e?.response?.data?.message ?? "Fakultas gagal disimpan.", variant: "destructive" });
    } finally {
      setFakultasSaving(false);
    }
  };

  const confirmDeleteFakultas = async () => {
    if (deleteFakultasId === null) return;
    try {
      const { data } = await api.delete(`/fakultas/${deleteFakultasId}`);
      toast({ title: "Berhasil", description: data.message ?? "Fakultas dihapus." });
      await refreshFakultas();
    } catch (e: any) {
      toast({ title: "Gagal", description: e?.response?.data?.message ?? "Fakultas gagal dihapus.", variant: "destructive" });
    } finally {
      setDeleteFakultasId(null);
    }
  };

  // ── Fakultas ↔ Jurusan (keanggotaan eksplisit, sumber cakupan Dekan) ──
  const [scopeDialogFakultas, setScopeDialogFakultas] = useState<Fakultas | null>(null);
  const [scopeJurusanIds, setScopeJurusanIds] = useState<number[]>([]);
  const [scopeJurusanSearch, setScopeJurusanSearch] = useState("");
  const [fakultasScopeSaving, setFakultasScopeSaving] = useState(false);

  const openFakultasScopeDialog = (f: Fakultas) => {
    setScopeDialogFakultas(f);
    setScopeJurusanIds(f.jurusan_ids);
    setScopeJurusanSearch("");
  };

  const toggleScopeJurusan = (id: number) => {
    setScopeJurusanIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const saveFakultasScope = async () => {
    if (!scopeDialogFakultas) return;
    setFakultasScopeSaving(true);
    try {
      await api.put(`/fakultas/${scopeDialogFakultas.id}/jurusans`, { jurusan_ids: scopeJurusanIds });
      toast({ title: "Berhasil", description: "Keanggotaan jurusan fakultas tersimpan." });
      setScopeDialogFakultas(null);
      await refreshFakultas();
    } catch (e: any) {
      toast({ title: "Gagal", description: e?.response?.data?.message ?? "Gagal menyimpan.", variant: "destructive" });
    } finally {
      setFakultasScopeSaving(false);
    }
  };

  // Prodi state
  const [prodiList, setProdiList] = useState<Prodi[]>([]);
  const [prodiDialog, setProdiDialog] = useState(false);
  const [editProdi, setEditProdi] = useState<Prodi | null>(null);
  const [prodiForm, setProdiForm] = useState({ name: "", code: "", dikti_code: "", degree: "", jurusan: "" });
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

  /**
   * Muat ulang daftar program studi saja.
   *
   * Dipakai setelah jurusan berganti nama: kolom `programs.jurusan` ikut
   * diperbarui backend, jadi tanpa ini tabel Program Studi masih menampilkan
   * nama jurusan yang lama.
   */
  const reloadProdi = async () => {
    try {
      const { data } = await api.get("/programs");
      const programs = data.data ?? data;
      setProdiList((programs as any[]).map((p: any) => ({
        id: String(p.id), name: p.name, code: p.code, dikti_code: p.dikti_code ?? "",
        degree: p.degree, jurusan: p.jurusan, isActive: p.is_active !== false,
      })));
    } catch {
      // Kegagalan muat ulang tidak membatalkan penyimpanan yang sudah
      // berhasil — tabelnya sekadar basi sampai halaman dibuka lagi.
    }
  };

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
  const openProdiCreate = () => { setEditProdi(null); setProdiForm({ name: "", code: "", dikti_code: "", degree: activeCodes[0] ?? "", jurusan: "" }); setProdiDialog(true); };
  const openProdiEdit = (p: Prodi) => { setEditProdi(p); setProdiForm({ name: p.name, code: p.code, dikti_code: p.dikti_code ?? "", degree: p.degree, jurusan: p.jurusan }); setProdiDialog(true); };
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
      // Jumlah prodi per jurusan dan daftar keanggotaannya ikut berubah di
      // peladen. Tanpa membatalkan cache-nya, tab Jurusan tetap menampilkan
      // hitungan lama -- prodi yang baru saja ditambahkan terbaca "0".
      await refreshJurusan();
    } catch (e: any) { toast({ title: "Gagal", description: e.response?.data?.message ?? "Terjadi kesalahan", variant: "destructive" }); }
  };
  const deleteProdi = async () => {
    try {
      await api.delete(`/programs/${deleteProdiId}`);
      setProdiList(prodiList.filter((p) => p.id !== deleteProdiId));
      toast({ title: "Dihapus" });
      await refreshJurusan();
    }
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
          <p className="text-muted-foreground">Kelola data referensi: jurusan, program studi, provinsi, dan kota</p>
        </div>

        <Tabs defaultValue="jurusan">
          <TabsList>
            <TabsTrigger value="jurusan">Jurusan ({countLabel(jurusanList.length)})</TabsTrigger>
            <TabsTrigger value="fakultas">Fakultas ({countLabel(fakultasList.length)})</TabsTrigger>
            <TabsTrigger value="prodi">Program Studi ({countLabel(prodiList.length)})</TabsTrigger>
            <TabsTrigger value="jenjang">Jenjang ({countLabel(degrees.length)})</TabsTrigger>
            <TabsTrigger value="provinsi">Provinsi ({countLabel(provList.length)})</TabsTrigger>
            <TabsTrigger value="kota">Kota ({countLabel(kotaList.length)})</TabsTrigger>
          </TabsList>

          {/* ── JURUSAN TAB ── */}
          <TabsContent value="jurusan" className="space-y-4">
            <div className="flex justify-end">
              <Button
                onClick={() => {
                  setEditJurusan(null);
                  setJurusanForm({ name: "" });
                  setJurusanDialog(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />Tambah Jurusan
              </Button>
            </div>
            <Card>
              <CardContent className="pt-6">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Nama Jurusan</TableHead>
                    <TableHead className="text-center">Program Studi</TableHead>
                    <TableHead className="text-center">Akun Staf</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    <TableStateRow
                      colSpan={4}
                      isLoading={jurusanLoading}
                      error={jurusanError ? "Gagal memuat daftar jurusan." : null}
                      isEmpty={jurusanList.length === 0}
                      emptyText="Belum ada jurusan."
                    />
                    {jurusanList.map((j) => {
                      const terpakai = j.program_count > 0 || j.user_count > 0;
                      return (
                        <TableRow key={j.id}>
                          <TableCell className="font-medium">{j.name}</TableCell>
                          <TableCell className="text-center text-muted-foreground">{j.program_count}</TableCell>
                          <TableCell className="text-center text-muted-foreground">{j.user_count}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Kelola keanggotaan program studi (cakupan Kajur)"
                              onClick={() => openJurusanScopeDialog(j)}
                            >
                              <ListChecks className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditJurusan(j);
                                setJurusanForm({ name: j.name });
                                setJurusanDialog(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={terpakai}
                              title={
                                terpakai
                                  ? "Masih dipakai program studi atau akun staf"
                                  : "Hapus jurusan"
                              }
                              onClick={() => setDeleteJurusanId(j.id)}
                            >
                              <Trash2 className={`h-4 w-4 ${terpakai ? "" : "text-destructive"}`} />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── FAKULTAS TAB ── */}
          <TabsContent value="fakultas" className="space-y-4">
            <div className="flex justify-end">
              <Button
                onClick={() => {
                  setEditFakultas(null);
                  setFakultasForm({ name: "" });
                  setFakultasDialog(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />Tambah Fakultas
              </Button>
            </div>
            <Card>
              <CardContent className="pt-6">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Nama Fakultas</TableHead>
                    <TableHead className="text-center">Jurusan</TableHead>
                    <TableHead className="text-center">Akun Staf</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    <TableStateRow
                      colSpan={4}
                      isLoading={fakultasLoading}
                      error={fakultasError ? "Gagal memuat daftar fakultas." : null}
                      isEmpty={fakultasList.length === 0}
                      emptyText="Belum ada fakultas."
                    />
                    {fakultasList.map((f) => {
                      const terpakai = f.user_count > 0;
                      return (
                        <TableRow key={f.id}>
                          <TableCell className="font-medium">{f.name}</TableCell>
                          <TableCell className="text-center text-muted-foreground">{f.jurusan_count}</TableCell>
                          <TableCell className="text-center text-muted-foreground">{f.user_count}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Kelola keanggotaan jurusan (cakupan Dekan)"
                              onClick={() => openFakultasScopeDialog(f)}
                            >
                              <ListChecks className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditFakultas(f);
                                setFakultasForm({ name: f.name });
                                setFakultasDialog(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={terpakai}
                              title={terpakai ? "Masih dipakai akun staf" : "Hapus fakultas"}
                              onClick={() => setDeleteFakultasId(f.id)}
                            >
                              <Trash2 className={`h-4 w-4 ${terpakai ? "" : "text-destructive"}`} />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

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
                  <TableHeader><TableRow><TableHead>Kode</TableHead><TableHead>Kode PDDIKTI/Prodi</TableHead><TableHead>Nama</TableHead><TableHead>Jenjang</TableHead><TableHead>Jurusan</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader>
                  <TableBody>
                    <TableStateRow
                      colSpan={6} isLoading={isLoading} error={loadError}
                      isEmpty={filteredProdi.length === 0}
                      emptyText={prodiSearch ? "Tidak ada prodi yang cocok dengan pencarian." : "Belum ada data program studi."}
                    />
                    {filteredProdi.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell><Badge variant="outline">{p.code}</Badge></TableCell>
                        {/* Kosong berarti ekspor unggahan Kementerian memakai
                            kode internal di kolom ini -- ditandai supaya
                            ketahuan sebelum berkasnya ditolak portal. */}
                        <TableCell>
                          {p.dikti_code
                            ? <span className="tabular-nums">{p.dikti_code}</span>
                            : <span className="text-xs text-muted-foreground">Belum diisi</span>}
                        </TableCell>
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
          <TabsContent value="jenjang" className="space-y-4">
            <div className="flex items-start justify-between gap-6">
              <p className="text-sm text-muted-foreground max-w-xl">
                Kode terkunci setelah dipakai prodi karena tersimpan di gudang
                data; label bebas diubah. Jenjang yang tidak dipakai kampus ini
                cukup dinonaktifkan.
              </p>
              <Button
                className="shrink-0"
                onClick={() => {
                  setEditDegree(null);
                  setDegreeForm({ code: "", label: "" });
                  setDegreeDialog(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />Tambah Jenjang
              </Button>
            </div>
            <Card>
              <CardContent className="pt-6">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Kode</TableHead>
                    <TableHead>Label</TableHead>
                    <TableHead className="text-center">Program Studi</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    <TableStateRow
                      colSpan={5}
                      isLoading={degreeLoading}
                      error={degreeError ? "Gagal memuat daftar jenjang." : null}
                      isEmpty={degrees.length === 0}
                      emptyText="Belum ada jenjang."
                    />
                    {degrees.map((d) => {
                      const terpakai = d.program_count > 0;
                      const terkunci = d.is_seeded || terpakai;
                      return (
                        <TableRow key={d.id}>
                          <TableCell className="font-medium">{d.code}</TableCell>
                          <TableCell className="text-muted-foreground">{d.label}</TableCell>
                          <TableCell className="text-center text-muted-foreground">{d.program_count}</TableCell>
                          <TableCell className="text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              className={d.is_active ? "" : "text-muted-foreground"}
                              title={d.is_active ? "Nonaktifkan jenjang ini" : "Aktifkan kembali"}
                              onClick={() => toggleDegreeActive(d)}
                            >
                              {d.is_active ? "Aktif" : "Nonaktif"}
                            </Button>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditDegree(d);
                                setDegreeForm({ code: d.code, label: d.label });
                                setDegreeDialog(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={terkunci}
                              title={
                                d.is_seeded
                                  ? "Jenjang bawaan tidak bisa dihapus - nonaktifkan saja"
                                  : terpakai
                                    ? "Masih dipakai program studi"
                                    : "Hapus jenjang"
                              }
                              onClick={() => setDeleteDegreeId(d.id)}
                            >
                              <Trash2 className={`h-4 w-4 ${terkunci ? "" : "text-destructive"}`} />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

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
            <div>
              <Label>Kode</Label>
              <Input value={prodiForm.code} onChange={(e) => setProdiForm({ ...prodiForm, code: e.target.value })} />
              <p className="mt-1 text-xs text-muted-foreground">
                Singkatan internal kampus, mis. TKPB.
              </p>
            </div>
            <div>
              <Label>Kode PDDIKTI/Prodi</Label>
              <Input
                value={prodiForm.dikti_code}
                onChange={(e) => setProdiForm({ ...prodiForm, dikti_code: e.target.value })}
                placeholder="mis. 24301"
              />
            </div>
            <div>
              <Label>Jenjang</Label>
              <Select value={prodiForm.degree} onValueChange={(v) => setProdiForm({ ...prodiForm, degree: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {activeCodes.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Jurusan</Label>
              <Select value={prodiForm.jurusan} onValueChange={(v) => setProdiForm({ ...prodiForm, jurusan: v })}>
                <SelectTrigger><SelectValue placeholder="Pilih jurusan" /></SelectTrigger>
                <SelectContent>
                  {jurusanList
                    .filter((j) => j.is_active)
                    .map((j) => <SelectItem key={j.id} value={j.name}>{j.name}</SelectItem>)}
                </SelectContent>
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
      {/* ── Dialog tambah / ubah jurusan ── */}
      <Dialog open={jurusanDialog} onOpenChange={setJurusanDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editJurusan ? "Ubah Jurusan" : "Tambah Jurusan"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nama Jurusan</Label>
              <Input
                value={jurusanForm.name}
                onChange={(e) => setJurusanForm({ name: e.target.value })}
                placeholder="Contoh: Teknik Geodesi"
              />
            </div>
            {editJurusan && editJurusan.name !== jurusanForm.name.trim() && (
              <p className="text-xs text-muted-foreground">
                Nama baru akan ikut diterapkan pada{" "}
                <strong>{editJurusan.program_count} program studi</strong> dan{" "}
                <strong>{editJurusan.user_count} akun staf</strong> yang memakai jurusan ini.
                Lingkup akses Kajur mengikuti nama, jadi keduanya harus berubah bersama.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setJurusanDialog(false)}>Batal</Button>
            <Button onClick={saveJurusan} disabled={jurusanSaving || !jurusanForm.name.trim()}>
              {jurusanSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog kelola keanggotaan Program Studi jurusan ── */}
      <Dialog open={!!scopeDialogJurusan} onOpenChange={(open) => !open && setScopeDialogJurusan(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Program Studi — {scopeDialogJurusan?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Program studi yang dicentang menentukan cakupan data Kajur jurusan ini.
            </p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari program studi..."
                value={scopeProdiSearch}
                onChange={(e) => setScopeProdiSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="border rounded-md max-h-72 overflow-y-auto p-2 grid grid-cols-1 gap-1">
              {prodiList
                .filter((p) => p.name.toLowerCase().includes(scopeProdiSearch.toLowerCase()))
                .map((p) => {
                  const checked = scopeProgramIds.includes(Number(p.id));
                  return (
                    <div key={p.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted text-sm">
                      <Checkbox
                        id={`scope-prodi-${p.id}`}
                        checked={checked}
                        onCheckedChange={() => toggleScopeProgram(Number(p.id))}
                      />
                      <label htmlFor={`scope-prodi-${p.id}`} className="flex-1 cursor-pointer">
                        {p.name} <span className="text-muted-foreground">({p.degree} · {p.jurusan})</span>
                      </label>
                    </div>
                  );
                })}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScopeDialogJurusan(null)}>Batal</Button>
            <Button onClick={saveJurusanScope} disabled={scopeSaving}>
              {scopeSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog tambah / ubah fakultas ── */}
      <Dialog open={degreeDialog} onOpenChange={setDegreeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editDegree ? "Ubah Jenjang" : "Tambah Jenjang"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Kode</Label>
              <Input
                value={degreeForm.code}
                disabled={!!editDegree && (editDegree.is_seeded || editDegree.program_count > 0)}
                onChange={(e) => setDegreeForm({ ...degreeForm, code: e.target.value })}
                placeholder="Contoh: Sp-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {editDegree?.is_seeded
                  ? "Kode jenjang bawaan terkunci karena nilainya sudah tersimpan di gudang data."
                  : editDegree && editDegree.program_count > 0
                    ? "Kode terkunci karena sudah dipakai program studi dan nilainya sudah masuk gudang data."
                    : "Kode inilah yang tersimpan di data prodi dan mengalir ke gudang data. Setelah dipakai prodi, kode tidak bisa diubah lagi."}
              </p>
            </div>
            <div>
              <Label>Label</Label>
              <Input
                value={degreeForm.label}
                onChange={(e) => setDegreeForm({ ...degreeForm, label: e.target.value })}
                placeholder="Contoh: Subspesialis"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Hanya untuk tampilan, bebas diubah kapan saja.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDegreeDialog(false)}>Batal</Button>
            <Button onClick={saveDegree} disabled={degreeSaving || !degreeForm.code.trim()}>
              {degreeSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={fakultasDialog} onOpenChange={setFakultasDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editFakultas ? "Ubah Fakultas" : "Tambah Fakultas"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nama Fakultas</Label>
              <Input
                value={fakultasForm.name}
                onChange={(e) => setFakultasForm({ name: e.target.value })}
                placeholder="Contoh: Fakultas Teknik"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFakultasDialog(false)}>Batal</Button>
            <Button onClick={saveFakultas} disabled={fakultasSaving || !fakultasForm.name.trim()}>
              {fakultasSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog kelola keanggotaan Jurusan fakultas ── */}
      <Dialog open={!!scopeDialogFakultas} onOpenChange={(open) => !open && setScopeDialogFakultas(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Jurusan — {scopeDialogFakultas?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Jurusan yang dicentang menentukan cakupan data Dekan ini (gabungan seluruh
              program studi di jurusan-jurusan tersebut).
            </p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari jurusan..."
                value={scopeJurusanSearch}
                onChange={(e) => setScopeJurusanSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="border rounded-md max-h-72 overflow-y-auto p-2 grid grid-cols-1 gap-1">
              {jurusanList
                .filter((j) => j.name.toLowerCase().includes(scopeJurusanSearch.toLowerCase()))
                .map((j) => {
                  const checked = scopeJurusanIds.includes(j.id);
                  return (
                    <div key={j.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted text-sm">
                      <Checkbox
                        id={`scope-jurusan-${j.id}`}
                        checked={checked}
                        onCheckedChange={() => toggleScopeJurusan(j.id)}
                      />
                      <label htmlFor={`scope-jurusan-${j.id}`} className="flex-1 cursor-pointer">{j.name}</label>
                    </div>
                  );
                })}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScopeDialogFakultas(null)}>Batal</Button>
            <Button onClick={saveFakultasScope} disabled={fakultasScopeSaving}>
              {fakultasScopeSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteDegreeId} onOpenChange={() => setDeleteDegreeId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Jenjang?</AlertDialogTitle>
            <AlertDialogDescription>
              Hanya jenjang tambahan yang belum dipakai program studi yang bisa
              dihapus. Untuk jenjang yang sekadar tidak dipakai kampus ini,
              nonaktifkan saja.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteDegree} className="bg-destructive text-destructive-foreground">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteFakultasId} onOpenChange={() => setDeleteFakultasId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Fakultas?</AlertDialogTitle>
            <AlertDialogDescription>
              Fakultas hanya bisa dihapus kalau sudah tidak dipakai akun staf.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteFakultas} className="bg-destructive text-destructive-foreground">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteJurusanId !== null} onOpenChange={() => setDeleteJurusanId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Jurusan?</AlertDialogTitle>
            <AlertDialogDescription>
              Jurusan hanya bisa dihapus kalau sudah tidak dipakai program studi maupun akun staf.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteJurusan} className="bg-destructive text-destructive-foreground">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
