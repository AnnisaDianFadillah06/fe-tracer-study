import { useMemo, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ShieldQuestion, Loader2, Inbox, Clock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
  useDataSubjectRequests,
  useResolveDataSubjectRequest,
  REQUEST_TYPE_LABELS,
  REQUEST_STATUS_LABELS,
  REQUEST_TYPE_HINTS,
  type DataSubjectRequest,
  type DataRequestStatus,
} from "@/hooks/admin/usePrivacyAdmin";

/**
 * Antrean permintaan hak subjek data — hanya untuk Ketua Tracer.
 *
 * Halaman ini adalah pasangan sisi staf dari halaman "Data Saya" milik alumni.
 * Tanpanya, permintaan alumni tersimpan rapi di basis data tetapi tidak ada
 * manusia yang dapat membacanya, sementara antarmuka alumni sudah terlanjur
 * menjanjikan permintaannya "akan ditinjau petugas".
 *
 * Nomor induk kependudukan dan nomor pokok wajib pajak SENGAJA tidak
 * ditampilkan di sini. Keduanya tidak menambah apa pun untuk memutuskan sebuah
 * permintaan, dan setiap layar yang menampilkannya adalah satu tempat lagi
 * yang dapat bocor.
 */

/** Warna lencana per status. Ditolak dibedakan tegas karena tidak dapat ditarik kembali. */
const statusVariant: Record<DataRequestStatus, "default" | "secondary" | "outline" | "destructive"> = {
  pending: "default",
  in_review: "secondary",
  fulfilled: "secondary",
  rejected: "destructive",
};

const formatTanggal = (nilai: string | null) =>
  nilai ? new Date(nilai).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) : "—";

/** Berapa lama sebuah permintaan sudah menunggu, dalam hari penuh. */
const usiaHari = (dibuat: string): number =>
  Math.floor((Date.now() - new Date(dibuat).getTime()) / 86_400_000);

const DataSubjectRequestsPage = () => {
  const [filterStatus, setFilterStatus] = useState<DataRequestStatus | "all">("pending");
  const [dipilih, setDipilih] = useState<DataSubjectRequest | null>(null);
  const [keputusan, setKeputusan] = useState<Exclude<DataRequestStatus, "pending">>("fulfilled");
  const [jawaban, setJawaban] = useState("");

  const { requests, loading, fetching } = useDataSubjectRequests(filterStatus);
  const resolve = useResolveDataSubjectRequest();

  // Dihitung dari daftar yang sedang tampil, jadi hanya berarti saat saringan
  // "Menunggu ditinjau" atau "Semua" yang dipilih.
  const menungguLama = useMemo(
    () => requests.filter((r) => r.status === "pending" && usiaHari(r.created_at) >= 3).length,
    [requests],
  );

  const bukaDialog = (r: DataSubjectRequest) => {
    setDipilih(r);
    // Keputusan awal sengaja "dikabulkan", bukan kosong: itu jawaban yang
    // paling lazim, dan pilihan awal yang kosong membuat petugas harus
    // menekan dua kali untuk hal yang paling sering dilakukan.
    setKeputusan("fulfilled");
    setJawaban(r.response ?? "");
  };

  const tutupDialog = () => {
    setDipilih(null);
    setJawaban("");
  };

  const alasanWajib = keputusan === "rejected";
  const alasanKurang = alasanWajib && jawaban.trim() === "";

  const kirim = async () => {
    if (!dipilih) return;
    try {
      await resolve.mutateAsync({
        id: dipilih.id,
        status: keputusan,
        response: jawaban.trim() || null,
      });
      toast.success("Permintaan berhasil diperbarui.");
      tutupDialog();
    } catch (err) {
      const pesan =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? "Gagal memperbarui permintaan.";
      toast.error(pesan);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="font-heading font-bold text-2xl flex items-center gap-2">
            <ShieldQuestion className="w-6 h-6 text-primary" />
            Permintaan Data Alumni
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
            Permintaan alumni atas datanya sendiri: perbaikan, penghapusan, dan keberatan
            atas pemrosesan — hak subjek data menurut UU No. 27 Tahun 2022. Setiap keputusan
            di halaman ini tercatat pada jejak audit beserta nama Anda.
          </p>
        </div>

        {/* Permintaan yang menua diangkat ke muka, bukan dibiarkan tenggelam di
            dalam tabel. Antrean yang tidak pernah menegur dirinya sendiri adalah
            antrean yang lupa dibuka. */}
        {menungguLama > 0 && (
          <div className="flex gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
            <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600" />
            <p>
              <strong>{menungguLama} permintaan</strong> sudah menunggu tiga hari atau lebih.
              Alumni yang mengajukan berhak memperoleh jawaban tertulis.
            </p>
          </div>
        )}

        <Card className="border-border">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Inbox className="w-4 h-4 text-primary" />
                  Daftar Permintaan
                  {fetching && !loading && (
                    <span className="flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Memuat…
                    </span>
                  )}
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Menampilkan {requests.length} permintaan.
                </p>
              </div>
              <div className="w-56">
                <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                  Status
                </Label>
                <Select
                  value={filterStatus}
                  onValueChange={(v) => setFilterStatus(v as DataRequestStatus | "all")}
                >
                  <SelectTrigger className="h-8 text-xs mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Menunggu ditinjau</SelectItem>
                    <SelectItem value="in_review">Sedang ditinjau</SelectItem>
                    <SelectItem value="fulfilled">Dikabulkan</SelectItem>
                    <SelectItem value="rejected">Ditolak</SelectItem>
                    <SelectItem value="all">Semua status</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin" />
                Memuat permintaan…
              </div>
            ) : requests.length === 0 ? (
              <div className="text-center py-12 text-sm text-muted-foreground">
                {filterStatus === "pending"
                  ? "Tidak ada permintaan yang menunggu ditinjau."
                  : "Tidak ada permintaan pada saringan ini."}
              </div>
            ) : (
              <div
                className={`overflow-x-auto transition-opacity ${
                  fetching && !loading ? "opacity-50 pointer-events-none" : ""
                }`}
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">Alumni</TableHead>
                      <TableHead className="whitespace-nowrap">Jenis</TableHead>
                      <TableHead className="min-w-[280px]">Penjelasan</TableHead>
                      <TableHead className="whitespace-nowrap">Diajukan</TableHead>
                      <TableHead className="whitespace-nowrap">Status</TableHead>
                      <TableHead className="whitespace-nowrap">Ditangani</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map((r) => {
                      const umur = usiaHari(r.created_at);
                      const menua = r.status === "pending" && umur >= 3;

                      return (
                        <TableRow key={r.id}>
                          <TableCell className="align-top">
                            <div className="font-medium">{r.alumni_name ?? "—"}</div>
                            <div className="text-xs text-muted-foreground">{r.alumni_nim ?? "—"}</div>
                          </TableCell>
                          <TableCell className="align-top whitespace-nowrap">
                            {REQUEST_TYPE_LABELS[r.type]}
                          </TableCell>
                          <TableCell className="align-top text-sm">
                            <p className="whitespace-pre-wrap">{r.message}</p>
                            {r.response && (
                              <p className="mt-2 rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">
                                <span className="font-medium">Jawaban: </span>{r.response}
                              </p>
                            )}
                          </TableCell>
                          <TableCell className="align-top whitespace-nowrap text-xs">
                            <div>{formatTanggal(r.created_at)}</div>
                            {menua && (
                              <div className="flex items-center gap-1 text-amber-600 mt-1">
                                <Clock className="w-3 h-3" />
                                {umur} hari
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="align-top whitespace-nowrap">
                            <Badge variant={statusVariant[r.status]}>
                              {REQUEST_STATUS_LABELS[r.status]}
                            </Badge>
                          </TableCell>
                          <TableCell className="align-top text-xs text-muted-foreground">
                            {r.handled_by_label ? (
                              <>
                                <div>{r.handled_by_label}</div>
                                <div>{formatTanggal(r.handled_at)}</div>
                              </>
                            ) : "—"}
                          </TableCell>
                          <TableCell className="align-top">
                            <Button size="sm" variant="outline" onClick={() => bukaDialog(r)}>
                              {r.status === "fulfilled" || r.status === "rejected"
                                ? "Tinjau ulang"
                                : "Jawab"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Dialog jawaban ──────────────────────────────────────────── */}
      <Dialog open={dipilih !== null} onOpenChange={(o) => !o && tutupDialog()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Jawab permintaan</DialogTitle>
            <DialogDescription>
              {dipilih && (
                <>
                  {REQUEST_TYPE_LABELS[dipilih.type]} dari {dipilih.alumni_name ?? "alumni"}
                  {dipilih.alumni_nim ? ` (${dipilih.alumni_nim})` : ""}.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {dipilih && (
            <div className="space-y-4">
              <div className="rounded-md bg-muted/50 p-3 text-sm whitespace-pre-wrap">
                {dipilih.message}
              </div>

              {/* Keterangan akibat, ditampilkan sesuai jenis permintaannya.
                  Keputusan ini punya konsekuensi yang berbeda-beda dan petugas
                  tidak seharusnya diminta mengingatnya sendiri. */}
              <div className="flex gap-2 rounded-md border border-border p-3 text-xs text-muted-foreground">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <p>{REQUEST_TYPE_HINTS[dipilih.type]}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="keputusan">Keputusan</Label>
                <Select
                  value={keputusan}
                  onValueChange={(v) => setKeputusan(v as Exclude<DataRequestStatus, "pending">)}
                >
                  <SelectTrigger id="keputusan">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in_review">Sedang ditinjau</SelectItem>
                    <SelectItem value="fulfilled">Kabulkan</SelectItem>
                    <SelectItem value="rejected">Tolak</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="jawaban">
                  Jawaban untuk alumni {alasanWajib && <span className="text-destructive">*</span>}
                </Label>
                <Textarea
                  id="jawaban"
                  value={jawaban}
                  onChange={(e) => setJawaban(e.target.value)}
                  rows={4}
                  placeholder={
                    alasanWajib
                      ? "Sebutkan dasar penolakannya."
                      : "Jelaskan apa yang Anda lakukan atas permintaan ini."
                  }
                />
                <p className="text-xs text-muted-foreground">
                  {alasanWajib
                    ? "Penolakan wajib disertai alasan tertulis — alumni berhak mengetahui dasarnya."
                    : "Jawaban ini tampil pada halaman Data Saya milik alumni."}
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={tutupDialog}>Batal</Button>
            <Button onClick={kirim} disabled={alasanKurang || resolve.isPending} className="gap-2">
              {resolve.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Simpan keputusan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default DataSubjectRequestsPage;
