import { useMemo, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  History, Loader2, ChevronLeft, ChevronRight, FilterX, Info,
} from "lucide-react";
import {
  useAuditLogs,
  describeAuditAction,
  ACTOR_TYPE_LABELS,
  AUDIT_ACTION_GROUPS,
  type AuditActorType,
} from "@/hooks/admin/usePrivacyAdmin";

/**
 * Penelusuran jejak audit — hanya untuk Ketua Tracer.
 *
 * HANYA BACA, dan itu bukan kelalaian. Tidak ada tombol sunting maupun hapus
 * di halaman ini: jejak audit yang dapat diubah oleh orang yang perbuatannya
 * tercatat di dalamnya tidak membuktikan apa pun. Penulisannya hanya terjadi
 * dari dalam alur yang dicatatnya.
 */

const formatWaktu = (nilai: string) =>
  new Date(nilai).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "medium" });

/** Warna lencana per jenis pelaku. Sistem dibedakan karena bukan perbuatan manusia. */
const actorVariant: Record<AuditActorType, "default" | "secondary" | "outline"> = {
  user: "default",
  alumni: "secondary",
  system: "outline",
};

const AuditLogPage = () => {
  const [action, setAction] = useState("all");
  const [actorType, setActorType] = useState<AuditActorType | "all">("all");
  const [alumniId, setAlumniId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);

  const filters = useMemo(
    () => ({
      action: action !== "all" ? action : undefined,
      actor_type: actorType !== "all" ? actorType : undefined,
      subject_alumni_id: alumniId.trim() ? Number(alumniId.trim()) : undefined,
      from: from || undefined,
      to: to || undefined,
      page,
      per_page: 50,
    }),
    [action, actorType, alumniId, from, to, page],
  );

  const { entries, total, currentPage, lastPage, loading, fetching } = useAuditLogs(filters);

  const adaSaringan =
    action !== "all" || actorType !== "all" || !!alumniId || !!from || !!to;

  const resetSaringan = () => {
    setAction("all");
    setActorType("all");
    setAlumniId("");
    setFrom("");
    setTo("");
    setPage(1);
  };

  /** Setiap perubahan saringan mengembalikan ke halaman pertama. */
  const ubah = <T,>(setter: (v: T) => void) => (nilai: T) => {
    setter(nilai);
    setPage(1);
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="font-heading font-bold text-2xl flex items-center gap-2">
            <History className="w-6 h-6 text-primary" />
            Jejak Audit
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
            Catatan setiap perbuatan yang menyentuh data pribadi alumni: masuk dan percobaan
            masuk, perubahan data, impor massal, penerbitan kredensial, ekspor, serta seluruh
            peristiwa persetujuan dan permintaan hak subjek data.
          </p>
        </div>

        <div className="flex gap-3 rounded-lg border border-border bg-muted/40 p-4 text-xs text-muted-foreground">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <p>
            Halaman ini hanya membaca. Catatan tidak dapat disunting maupun dihapus dari
            antarmuka mana pun — termasuk oleh Anda. Nilai data pribadi tidak pernah disimpan
            utuh di dalam catatan; yang tercatat adalah nama kolom yang berubah, bukan isinya.
          </p>
        </div>

        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              Penyaring
              {/* Penanda kerja yang sedang berjalan. Ditaruh di judul penyaring,
                  bukan di atas tabel, karena di sinilah mata pengguna berada
                  tepat setelah ia mengubah saringan. */}
              {fetching && !loading && (
                <span className="flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Menyaring…
                </span>
              )}
            </CardTitle>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 pt-3">
              <div>
                <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                  Perbuatan
                </Label>
                <Select value={action} onValueChange={ubah(setAction)}>
                  <SelectTrigger className="h-8 text-xs mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua perbuatan</SelectItem>
                    {AUDIT_ACTION_GROUPS.map((g) => (
                      <SelectItem key={g.value} value={g.value} className="text-xs">
                        {g.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                  Pelaku
                </Label>
                <Select
                  value={actorType}
                  onValueChange={ubah((v: string) => setActorType(v as AuditActorType | "all"))}
                >
                  <SelectTrigger className="h-8 text-xs mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua pelaku</SelectItem>
                    <SelectItem value="user" className="text-xs">Staf</SelectItem>
                    <SelectItem value="alumni" className="text-xs">Alumni</SelectItem>
                    <SelectItem value="system" className="text-xs">Sistem</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                  ID Alumni
                </Label>
                <Input
                  value={alumniId}
                  onChange={(e) => ubah(setAlumniId)(e.target.value)}
                  placeholder="mis. 408"
                  className="h-8 text-xs mt-1"
                  inputMode="numeric"
                />
              </div>

              <div>
                <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                  Dari tanggal
                </Label>
                <Input
                  type="date"
                  value={from}
                  onChange={(e) => ubah(setFrom)(e.target.value)}
                  className="h-8 text-xs mt-1"
                />
              </div>

              <div>
                <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                  Sampai tanggal
                </Label>
                <Input
                  type="date"
                  value={to}
                  onChange={(e) => ubah(setTo)(e.target.value)}
                  className="h-8 text-xs mt-1"
                />
              </div>
            </div>

            {adaSaringan && (
              <div className="pt-3">
                <Button variant="ghost" size="sm" onClick={resetSaringan} className="h-7 text-xs gap-1">
                  <FilterX className="w-3 h-3" />
                  Bersihkan penyaring
                </Button>
              </div>
            )}
          </CardHeader>

          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin" />
                Memuat jejak audit…
              </div>
            ) : entries.length === 0 ? (
              <div className="text-center py-12 text-sm text-muted-foreground">
                Tidak ada catatan pada saringan ini.
              </div>
            ) : (
              <>
                {/* Hasil lama diredupkan dan tidak dapat diklik selama hasil
                    baru diambil. Tanpa ini, tabel yang isinya belum berganti
                    tampak seolah saringannya tidak berpengaruh — dan pengguna
                    mengklik lagi, yang justru menambah antrean permintaan. */}
                <div
                  className={`overflow-x-auto transition-opacity ${
                    fetching && !loading ? "opacity-50 pointer-events-none" : ""
                  }`}
                >
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="whitespace-nowrap">Waktu</TableHead>
                        <TableHead className="whitespace-nowrap">Perbuatan</TableHead>
                        <TableHead className="whitespace-nowrap">Pelaku</TableHead>
                        <TableHead className="whitespace-nowrap">Sasaran</TableHead>
                        <TableHead className="min-w-[220px]">Konteks</TableHead>
                        <TableHead className="whitespace-nowrap">Alamat IP</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entries.map((e) => (
                        <TableRow key={e.id}>
                          <TableCell className="align-top whitespace-nowrap text-xs">
                            {formatWaktu(e.created_at)}
                          </TableCell>
                          <TableCell className="align-top text-sm">
                            {describeAuditAction(e.action)}
                            <div className="text-[11px] text-muted-foreground font-mono">
                              {e.action}
                            </div>
                          </TableCell>
                          <TableCell className="align-top text-xs">
                            <Badge variant={actorVariant[e.actor_type]} className="mb-1">
                              {ACTOR_TYPE_LABELS[e.actor_type]}
                            </Badge>
                            {/* Cuplikan nama pelaku inilah yang membuat baris ini
                                tetap terbaca setelah akunnya dihapus. */}
                            <div className="text-muted-foreground break-all">
                              {e.actor_label ?? "—"}
                            </div>
                          </TableCell>
                          <TableCell className="align-top text-xs text-muted-foreground">
                            {e.subject_alumni_id ? (
                              <div>Alumni #{e.subject_alumni_id}</div>
                            ) : e.entity_type ? (
                              <div>{e.entity_type}{e.entity_id ? ` #${e.entity_id}` : ""}</div>
                            ) : "—"}
                          </TableCell>
                          <TableCell className="align-top text-xs">
                            {e.context ? (
                              <div className="space-y-0.5">
                                {Object.entries(e.context).map(([k, v]) => (
                                  <div key={k} className="break-all">
                                    <span className="text-muted-foreground">{k}: </span>
                                    <span className="font-mono">
                                      {typeof v === "object" ? JSON.stringify(v) : String(v)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ) : "—"}
                          </TableCell>
                          <TableCell className="align-top text-xs font-mono text-muted-foreground">
                            {e.ip_address ?? "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex items-center justify-between gap-4 pt-4 flex-wrap">
                  <p className="text-xs text-muted-foreground">
                    {total} catatan &middot; halaman {currentPage} dari {lastPage}
                  </p>
                  <div className="flex gap-2">
                    {/* Ikut dimatikan selama pengambilan: menekan "Berikutnya"
                        dua kali sebelum halaman pertama tiba akan melompati
                        satu halaman tanpa pengguna sadar. */}
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage <= 1 || fetching}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="gap-1"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Sebelumnya
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage >= lastPage || fetching}
                      onClick={() => setPage((p) => p + 1)}
                      className="gap-1"
                    >
                      Berikutnya
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AuditLogPage;
