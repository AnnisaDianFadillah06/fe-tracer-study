import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
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
import TablePagination from "@/components/common/TablePagination";
import EmailBulkActionPanel from "@/components/admin/EmailBulkActionPanel";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useEmailManagement } from "@/hooks/admin/useEmailManagement";
import { useEmailBulkAction } from "@/hooks/admin/useEmailBulkAction";
import { useState } from "react";
import { AlertCircle, CheckCircle2, Circle, Clock, KeyRound, Loader2, Mail, X } from "lucide-react";

/**
 * "Manajemen Email" — tabel alumni ter-paginasi dengan checkbox seleksi
 * hybrid (pilih per-baris, atau "pilih semua N sesuai filter" lintas
 * halaman dengan pengecualian manual), dipakai DUA aksi bulk yang
 * dipicu dari toolbar DI ATAS tabel (bukan kartu terpisah di bawah):
 *
 *   - "Terbitkan Akun": kata sandi baru dibangkitkan untuk alumni terpilih,
 *     langsung dikirim lewat email (backend: AlumniCredentialEmailController,
 *     AlumniCredentialService::issueForSelection()).
 *   - "Kirim Reminder": pengingat isi kuesioner untuk alumni yang SUDAH
 *     punya akun tapi belum selesai -- TIDAK meregenerasi kata sandi
 *     (backend: AlumniReminderController).
 *
 * Gaya tabel disamakan dengan Manajemen Kuesioner (FormManagementPage):
 * kartu tabel tanpa CardHeader/judul, badge status berbentuk pil dengan
 * ikon di depan label -- bukan kartu tabel berjudul ala Kelola Mahasiswa.
 *
 * Kolom Status Akun/Status Kuesioner datang dari `GET /alumni` yang SUDAH
 * mengembalikan `password_issued_at` dan `response_status` -- tidak ada
 * endpoint baru untuk ini, lihat useEmailManagement.ts.
 */
const EmailManagementPage = () => {
  const email = useEmailManagement();
  const accountAction = useEmailBulkAction("account");
  const reminderAction = useEmailBulkAction("reminder");

  const [onlyWithoutCreds, setOnlyWithoutCreds] = useState(true);

  const isAnyActionBusy = accountAction.isBusy || reminderAction.isBusy;

  /**
   * Hint kelayakan reminder -- HANYA dihitung dari baris yang SEDANG
   * tampil di halaman ini (bukan seluruh seleksi, yang bisa lintas ribuan
   * baris tak termuat). Backend tetap satu-satunya sumber kebenaran
   * penyaringan; ini murni bantuan visual di FE.
   */
  const ineligibleOnPage = email.rows.filter(
    (r) => email.isRowSelected(r.nim) && (!r.passwordIssuedAt || r.responseStatus === "finished"),
  ).length;

  const runIssueAccounts = () => {
    accountAction.run({ ...email.selectionPayload, only_without_credentials: onlyWithoutCreds });
  };

  const runSendReminders = () => {
    reminderAction.run(email.selectionPayload);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-heading font-bold">Manajemen Email</h2>
          <p className="text-muted-foreground text-sm">
            Terbitkan akun alumni atau kirim pengingat kuesioner, langsung lewat email bulk
          </p>
        </div>

        {/* Toolbar: filter + seleksi + dua tombol aksi */}
        <Card className="glass-card">
          <CardContent className="pt-4 pb-4 space-y-4">
            <div className="flex gap-3 flex-wrap">
              <Select value={email.year === "" ? "all" : email.year} onValueChange={(v) => email.setYear(v === "all" ? "" : v)}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Tahun Lulus" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua lulusan</SelectItem>
                  {email.yearSummaries.map((y) => (
                    <SelectItem key={y.tahun} value={String(y.tahun)}>
                      Lulusan {y.tahun}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={email.jurusan === "" ? "all" : email.jurusan}
                onValueChange={(v) => email.setJurusan(v === "all" ? "" : v)}
              >
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="Semua jurusan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua jurusan</SelectItem>
                  {email.jurusanOptions.map((j) => (
                    <SelectItem key={j} value={j}>
                      {j}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={email.prodi === "" ? "all" : email.prodi}
                onValueChange={(v) => email.setProdi(v === "all" ? "" : v)}
              >
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="Semua program studi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua program studi</SelectItem>
                  {email.prodiOptions.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name}
                      {p.degree ? ` (${p.degree})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                <span>
                  <span className="font-semibold tabular-nums">{email.selectedCount}</span> alumni dipilih
                </span>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="only-without-creds"
                    checked={onlyWithoutCreds}
                    onCheckedChange={(v) => setOnlyWithoutCreds(v === true)}
                    disabled={isAnyActionBusy}
                  />
                  <Label htmlFor="only-without-creds" className="font-normal text-muted-foreground">
                    Hanya yang belum pernah menerima kredensial
                  </Label>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={runSendReminders} disabled={isAnyActionBusy || email.selectedCount === 0}>
                  {reminderAction.isBusy ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <Mail className="mr-2 h-4 w-4" aria-hidden />
                  )}
                  Kirim Reminder
                </Button>
                <Button onClick={runIssueAccounts} disabled={isAnyActionBusy || email.selectedCount === 0}>
                  {accountAction.isBusy ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <KeyRound className="mr-2 h-4 w-4" aria-hidden />
                  )}
                  Terbitkan Akun
                </Button>
              </div>
            </div>

            {ineligibleOnPage > 0 && (
              <p className="text-xs text-muted-foreground">
                {ineligibleOnPage} dari yang dipilih (di halaman ini) belum punya akun atau sudah
                menyelesaikan kuesioner — akan dilewati otomatis oleh server saat "Kirim Reminder".
              </p>
            )}
          </CardContent>
        </Card>

        {/* Banner seleksi lintas-halaman */}
        {email.showSelectAllBanner && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2.5 text-sm">
            <span>Semua {email.rows.length} baris di halaman ini dipilih.</span>
            <button
              type="button"
              onClick={email.selectAllMatchingFilter}
              className="font-medium text-primary underline underline-offset-2 hover:no-underline"
            >
              Pilih semua {email.paginationMeta.total} alumni sesuai filter
            </button>
          </div>
        )}
        {email.selection.mode === "all-filtered" && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2.5 text-sm">
            <span>
              <span className="font-semibold tabular-nums">{email.selectedCount}</span> alumni dipilih
              (sesuai filter{email.selection.excluded.size > 0 && `, dikurangi ${email.selection.excluded.size} yang dikecualikan manual`}).
            </span>
            <button
              type="button"
              onClick={email.clearSelection}
              className="flex items-center gap-1 font-medium text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
              Batalkan
            </button>
          </div>
        )}

        {/* Panel status -- hanya tampil kalau sedang berjalan atau punya hasil */}
        {(accountAction.isBusy || accountAction.result) && (
          <EmailBulkActionPanel
            icon={KeyRound}
            title="Terbitkan Akun"
            isBusy={accountAction.isBusy}
            isPolling={accountAction.isPolling}
            issueProgress={accountAction.issueProgress}
            batchStatus={accountAction.batchStatus}
            result={accountAction.result}
            issuingLabel="Menerbitkan akun…"
            sendingLabel="Mengirim email…"
            onCancel={accountAction.cancel}
            isCanceling={accountAction.isCanceling}
          />
        )}
        {(reminderAction.isBusy || reminderAction.result) && (
          <EmailBulkActionPanel
            icon={Mail}
            title="Kirim Reminder"
            isBusy={reminderAction.isBusy}
            isPolling={reminderAction.isPolling}
            issueProgress={reminderAction.issueProgress}
            batchStatus={reminderAction.batchStatus}
            result={reminderAction.result}
            issuingLabel="Menyiapkan reminder…"
            sendingLabel="Mengirim reminder…"
            onCancel={reminderAction.cancel}
            isCanceling={reminderAction.isCanceling}
          />
        )}

        {/* Tabel alumni -- gaya disamakan dengan Manajemen Kuesioner: tanpa
            CardHeader/judul di kartu tabel, badge status berikon. */}
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table className="min-w-[1080px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={email.headerCheckboxState}
                        onCheckedChange={email.toggleSelectAllOnPage}
                        disabled={email.rows.length === 0 || isAnyActionBusy}
                        aria-label="Pilih semua baris di halaman ini"
                      />
                    </TableHead>
                    <TableHead className="w-16">No</TableHead>
                    <TableHead>NIM</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status Akun</TableHead>
                    <TableHead>Status Kuesioner</TableHead>
                    <TableHead>Email Terakhir</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {email.isLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                        <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" aria-hidden />
                        Memuat data alumni…
                      </TableCell>
                    </TableRow>
                  ) : email.isError ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-10 text-center text-destructive">
                        Gagal memuat data alumni.
                      </TableCell>
                    </TableRow>
                  ) : email.rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                        Tidak ada alumni yang cocok dengan penyaring ini.
                      </TableCell>
                    </TableRow>
                  ) : (
                    email.rows.map((row, index) => (
                      <TableRow key={row.id} data-state={email.isRowSelected(row.nim) ? "selected" : undefined}>
                        <TableCell>
                          <Checkbox
                            checked={email.isRowSelected(row.nim)}
                            onCheckedChange={() => email.toggleRow(row.nim)}
                            disabled={isAnyActionBusy}
                            aria-label={`Pilih ${row.name || row.nim}`}
                          />
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {(email.paginationMeta.currentPage - 1) * 20 + index + 1}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{row.nim}</TableCell>
                        <TableCell className="font-medium">{row.name || "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{row.email || "—"}</TableCell>
                        <TableCell>
                          {row.passwordIssuedAt ? (
                            <Badge variant="outline" className="border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                              <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                              Sudah
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-border/60 text-muted-foreground">
                              <Circle className="mr-1 h-3.5 w-3.5" />
                              Belum
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {row.responseStatus === "finished" ? (
                            <Badge variant="outline" className="border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                              <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                              Selesai
                            </Badge>
                          ) : row.responseStatus === "ongoing" ? (
                            <Badge variant="outline" className="border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-300">
                              <Clock className="mr-1 h-3.5 w-3.5" />
                              Sedang
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-border/60 text-muted-foreground">
                              <Circle className="mr-1 h-3.5 w-3.5" />
                              Belum
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {row.lastEmail ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div>
                                  {row.lastEmail.status === "sent" ? (
                                    <Badge variant="outline" className="border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                                      <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                                      Terkirim
                                    </Badge>
                                  ) : row.lastEmail.status === "failed" ? (
                                    <Badge variant="outline" className="border-destructive/30 bg-destructive/10 text-destructive">
                                      <AlertCircle className="mr-1 h-3.5 w-3.5" />
                                      Gagal
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300">
                                      <Clock className="mr-1 h-3.5 w-3.5" />
                                      Pending
                                    </Badge>
                                  )}
                                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                                    {row.lastEmail.kind === "account" ? "Akun" : "Reminder"}
                                    {row.lastEmail.at && ` • ${new Date(row.lastEmail.at).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}`}
                                  </p>
                                </div>
                              </TooltipTrigger>
                              {row.lastEmail.status === "failed" && row.lastEmail.error && (
                                <TooltipContent className="max-w-xs">{row.lastEmail.error}</TooltipContent>
                              )}
                            </Tooltip>
                          ) : (
                            <span className="text-xs text-muted-foreground">Belum pernah</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <TablePagination
              page={email.paginationMeta.currentPage}
              totalPages={email.paginationMeta.lastPage}
              total={email.paginationMeta.total}
              perPage={20}
              itemLabel="alumni"
              onPageChange={email.setPage}
            />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default EmailManagementPage;
