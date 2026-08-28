import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft, Loader2, ShieldCheck, ShieldAlert, Clock, FileText, History, Send,
} from "lucide-react";
import { toast } from "sonner";
import InstitutionLogo from "@/components/common/InstitutionLogo";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { useStudentAuth } from "@/hooks/auth/useStudentAuth";
import {
  fetchMyData, fetchMyRequests, submitDataRequest, withdrawConsent,
  describeActivity, DATA_REQUEST_LABELS, DATA_REQUEST_STATUS_LABELS,
  type MyData, type DataRequest, type DataRequestType,
} from "@/lib/privacy";

/**
 * Halaman "Data Saya" — hak atas informasi (UU No. 27 Tahun 2022 Pasal 5) dan
 * hak akses atas salinan data sendiri (Pasal 7).
 *
 * Empat hal ditampilkan bersama, dan ketiganya yang terakhir itulah yang
 * membedakan halaman ini dari sekadar halaman profil: data apa yang disimpan,
 * atas dasar apa dan sampai kapan, apa saja yang pernah dikirim, dan siapa
 * saja yang pernah menyentuhnya.
 *
 * TIDAK ADA SATU PUN ISIAN YANG BISA DISUNTING DI SINI, dan itu disengaja.
 * Data akademik menentukan angka keterserapan per program studi; menyerahkan
 * suntingannya kepada orang yang dinilai berarti menyerahkan angka akreditasi
 * kepada yang berkepentingan atasnya. Perubahan ditempuh lewat permintaan
 * yang ditinjau petugas dan dijawab tertulis.
 */
const DataSayaPage = () => {
  const navigate = useNavigate();
  const { isLoggedIn, logout } = useStudentAuth();

  const [data, setData] = useState<MyData | null>(null);
  const [requests, setRequests] = useState<DataRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const [requestType, setRequestType] = useState<DataRequestType>("correction");
  const [requestMessage, setRequestMessage] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!isLoggedIn) navigate("/login");
  }, [isLoggedIn, navigate]);

  const muat = async () => {
    try {
      const [d, r] = await Promise.all([fetchMyData(), fetchMyRequests()]);
      setData(d);
      setRequests(r);
    } catch {
      toast.error("Gagal memuat data Anda. Periksa koneksi lalu muat ulang halaman.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn) muat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn]);

  const handleWithdraw = async () => {
    try {
      const pesan = await withdrawConsent();
      toast.success(pesan);
      muat();
    } catch {
      toast.error("Penarikan persetujuan gagal. Coba lagi.");
    }
  };

  const handleSubmitRequest = async () => {
    setSending(true);
    try {
      await submitDataRequest(requestType, requestMessage);
      toast.success("Permintaan Anda telah tercatat dan akan ditinjau petugas.");
      setRequestMessage("");
      muat();
    } catch (err) {
      // Pesan dari server dipakai apa adanya bila ada: server tahu alasan
      // sebenarnya (permintaan menumpuk, penjelasan terlalu singkat), dan
      // menggantinya dengan kalimat umum menghilangkan jalan keluarnya.
      const pesan =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? "Permintaan gagal dikirim. Coba lagi.";
      toast.error(pesan);
    } finally {
      setSending(false);
    }
  };

  if (!isLoggedIn) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Memuat data Anda...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-10 pb-10 space-y-4">
            <p className="text-muted-foreground">Data Anda tidak dapat dimuat.</p>
            <Button onClick={() => { setLoading(true); muat(); }}>Coba lagi</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { profile, consent, retention, responses, activity } = data;

  const baris: Array<[string, string | number | null]> = [
    ["NIM", profile.nim],
    ["Nama", profile.name],
    ["Surel", profile.email],
    ["Telepon", profile.phone],
    ["NIK", profile.nik],
    ["NPWP", profile.npwp],
    ["Program studi", profile.program_name],
    ["Jenjang", profile.program_degree],
    ["Jurusan", profile.jurusan],
    ["Tahun masuk", profile.entry_year],
    ["Tahun lulus", profile.graduation_year],
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border flex items-center justify-between px-6 h-14">
        <InstitutionLogo compact title="Smart Tracer" textClassName="hidden sm:block" />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="ghost" size="sm" onClick={() => navigate("/form/fill")} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Kembali</span>
          </Button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-bold">Data Saya</h1>
          <p className="text-sm text-muted-foreground">
            Seluruh data yang disimpan sistem tentang Anda, beserta hak Anda atasnya
            menurut UU No. 27 Tahun 2022 tentang Perlindungan Data Pribadi.
          </p>
        </div>

        {/* ── Persetujuan ───────────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              {consent.granted
                ? <ShieldCheck className="w-4 h-4 text-green-600" />
                : <ShieldAlert className="w-4 h-4 text-amber-600" />}
              Persetujuan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {consent.granted ? (
              <p className="text-muted-foreground">
                Anda menyetujui pemberitahuan privasi versi {consent.granted_version}
                {consent.granted_at
                  ? ` pada ${new Date(consent.granted_at).toLocaleString("id-ID")}`
                  : ""}.
              </p>
            ) : (
              <p className="text-muted-foreground">
                {consent.needs_renewal
                  ? "Pemberitahuan privasi telah diperbarui. Anda perlu menyetujui versi terbaru sebelum dapat mengisi kuesioner."
                  : "Anda belum menyetujui pemberitahuan privasi, sehingga kuesioner belum dapat diisi."}
              </p>
            )}

            {consent.granted && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm">Tarik persetujuan</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Tarik persetujuan?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Anda tidak akan dapat mengisi kuesioner sampai menyetujui kembali.
                      Jawaban yang sudah terkirim sebelumnya tetap tersimpan — sebagiannya
                      wajib disimpan untuk pelaporan PDDIKTI. Ajukan permintaan penghapusan
                      di bawah bila Anda menghendakinya.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Batal</AlertDialogCancel>
                    <AlertDialogAction onClick={handleWithdraw}>Tarik</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </CardContent>
        </Card>

        {/* ── Data yang disimpan ────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Data yang disimpan</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="divide-y divide-border text-sm">
              {baris.map(([label, nilai]) => (
                <div key={label} className="flex justify-between gap-4 py-2">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="text-right font-medium break-all">
                    {nilai !== null && nilai !== "" ? nilai : <span className="text-muted-foreground font-normal">—</span>}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="pt-3 text-xs text-muted-foreground">
              Isian di halaman ini tidak dapat disunting sendiri karena ikut menentukan
              angka penyerapan lulusan program studi. Ajukan permintaan perbaikan di bawah.
            </p>
          </CardContent>
        </Card>

        {/* ── Masa simpan & dasar pemrosesan ────────────────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Masa simpan dan dasar pemrosesan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Data Anda disimpan {retention.years} tahun sejak tahun kelulusan
              {retention.until_year ? `, yaitu sampai tahun ${retention.until_year}` : ""}.
            </p>
            <ul className="list-disc pl-5 space-y-1">
              {retention.legal_basis.map((dasar) => <li key={dasar}>{dasar}</li>)}
            </ul>
          </CardContent>
        </Card>

        {/* ── Kuesioner yang pernah diisi ───────────────────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Kuesioner yang pernah Anda isi
            </CardTitle>
          </CardHeader>
          <CardContent>
            {responses.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada.</p>
            ) : (
              <ul className="divide-y divide-border text-sm">
                {responses.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-4 py-2">
                    <span>{r.questionnaire_title ?? `Kuesioner #${r.id}`}</span>
                    <span className="flex items-center gap-2 shrink-0">
                      <Badge variant={r.status === "started" ? "outline" : "secondary"}>
                        {r.status === "started" ? "Draf" : "Terkirim"}
                      </Badge>
                      <span className="text-muted-foreground text-xs">
                        {new Date(r.created_at).toLocaleDateString("id-ID")}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* ── Permintaan ────────────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Send className="w-4 h-4" />
              Ajukan permintaan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="jenis-permintaan">Jenis permintaan</Label>
              <Select value={requestType} onValueChange={(v) => setRequestType(v as DataRequestType)}>
                <SelectTrigger id="jenis-permintaan">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(DATA_REQUEST_LABELS) as DataRequestType[]).map((t) => (
                    <SelectItem key={t} value={t}>{DATA_REQUEST_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pesan-permintaan">Penjelasan</Label>
              <Textarea
                id="pesan-permintaan"
                value={requestMessage}
                onChange={(e) => setRequestMessage(e.target.value)}
                placeholder="Contoh: Tahun kelulusan saya tertulis 2020, seharusnya 2021."
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Sebutkan data mana yang dimaksud agar dapat ditindaklanjuti. Minimal 10 karakter.
              </p>
            </div>

            <Button
              onClick={handleSubmitRequest}
              disabled={sending || requestMessage.trim().length < 10}
              className="gap-2"
            >
              {sending && <Loader2 className="w-4 h-4 animate-spin" />}
              Kirim permintaan
            </Button>

            {requests.length > 0 && (
              <div className="pt-2 space-y-2">
                <h3 className="text-sm font-semibold">Riwayat permintaan Anda</h3>
                <ul className="divide-y divide-border text-sm">
                  {requests.map((r) => (
                    <li key={r.id} className="py-3 space-y-1">
                      <div className="flex items-center justify-between gap-4">
                        <span className="font-medium">{DATA_REQUEST_LABELS[r.type]}</span>
                        <Badge variant={r.status === "rejected" ? "destructive" : "secondary"}>
                          {DATA_REQUEST_STATUS_LABELS[r.status]}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground">{r.message}</p>
                      {r.response && (
                        <p className="rounded-md bg-muted/50 p-2 text-muted-foreground">
                          <span className="font-medium">Jawaban petugas: </span>{r.response}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Jejak audit ───────────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <History className="w-4 h-4" />
              Riwayat perlakuan atas data Anda
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activity.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada catatan.</p>
            ) : (
              <ul className="divide-y divide-border text-sm">
                {activity.map((a, i) => (
                  <li key={`${a.created_at}-${i}`} className="flex items-start justify-between gap-4 py-2">
                    <span>
                      {describeActivity(a.action)}
                      {a.actor_type === "user" && (
                        <span className="block text-xs text-muted-foreground">oleh {a.actor}</span>
                      )}
                    </span>
                    <span className="text-muted-foreground text-xs shrink-0">
                      {new Date(a.created_at).toLocaleString("id-ID")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-center pb-8">
          <Button variant="ghost" size="sm" onClick={() => { logout(); navigate("/login"); }}>
            Keluar dari sesi
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DataSayaPage;
