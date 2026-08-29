import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { EmailBatchStatus, EmailBulkProgress, EmailBulkResult } from "@/types/emailSelection";
import type { LucideIcon } from "lucide-react";
import { X } from "lucide-react";

interface EmailActionStatusPanelProps {
  icon: LucideIcon;
  title: string;
  isBusy: boolean;
  isPolling: boolean;
  issueProgress: EmailBulkProgress | null;
  batchStatus: EmailBatchStatus | null;
  result: EmailBulkResult | null;
  issuingLabel: string;
  sendingLabel: string;
  onCancel?: () => void;
  isCanceling?: boolean;
}

/**
 * Panel status SATU aksi bulk ("Terbitkan Akun" atau "Kirim Reminder") --
 * murni menampilkan progres/hasil, TIDAK punya tombol/kontrol sendiri
 * (pemicunya ada di toolbar atas halaman, lihat EmailManagementPage).
 * Dipasangkan dengan hook useEmailBulkAction -- satu instance per aksi,
 * supaya progres satu aksi tidak tertimpa aksi lain.
 *
 * Sengaja TIDAK dirender kalau tidak ada apa pun untuk ditunjukkan
 * (dicek pemanggil: isBusy || result) -- panel kosong hanya menghabiskan
 * ruang di atas tabel tanpa memberi informasi.
 */
const EmailBulkActionPanel = ({
  icon: Icon,
  title,
  isBusy,
  isPolling,
  issueProgress,
  batchStatus,
  result,
  issuingLabel,
  sendingLabel,
  onCancel,
  isCanceling,
}: EmailActionStatusPanelProps) => {
  return (
    <Card>
      <CardContent className="space-y-3 pt-4 pb-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Icon className="h-4 w-4 text-primary" aria-hidden />
            {title}
          </div>
          {isBusy && onCancel && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-xs text-muted-foreground hover:text-destructive"
              onClick={onCancel}
              disabled={isCanceling}
            >
              <X className="h-3.5 w-3.5" aria-hidden />
              {isCanceling ? "Membatalkan..." : "Batalkan"}
            </Button>
          )}
        </div>

        {issueProgress && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium">{issuingLabel}</span>
              <span className="text-muted-foreground">
                {issueProgress.done} selesai
                {issueProgress.remaining > 0 && ` • ${issueProgress.remaining} tersisa`}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all"
                style={{
                  width: `${Math.round(
                    (issueProgress.done / Math.max(1, issueProgress.done + issueProgress.remaining)) * 100,
                  )}%`,
                }}
              />
            </div>
          </div>
        )}

        {isPolling && batchStatus && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium">{sendingLabel}</span>
              <span className="text-muted-foreground">
                {batchStatus.sent + batchStatus.failed} / {batchStatus.total} selesai
                {batchStatus.failed > 0 && ` • ${batchStatus.failed} gagal`}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all"
                style={{
                  width: `${Math.round(((batchStatus.sent + batchStatus.failed) / Math.max(1, batchStatus.total)) * 100)}%`,
                }}
              />
            </div>
          </div>
        )}

        {!isBusy && result && (
          <div className="space-y-3">
            <div className={`grid gap-3 ${result.canceled > 0 ? "grid-cols-3" : "grid-cols-2"}`}>
              <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3 text-center">
                <p className="text-2xl font-semibold text-emerald-600">{result.sent}</p>
                <p className="text-xs text-muted-foreground">Berhasil</p>
              </div>
              <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-center">
                <p className="text-2xl font-semibold text-destructive">{result.failed}</p>
                <p className="text-xs text-muted-foreground">Gagal</p>
              </div>
              {result.canceled > 0 && (
                <div className="rounded-md border border-muted-foreground/30 bg-muted/30 p-3 text-center">
                  <p className="text-2xl font-semibold text-muted-foreground">{result.canceled}</p>
                  <p className="text-xs text-muted-foreground">Dibatalkan</p>
                </div>
              )}
            </div>

            {result.failedItems.length > 0 && (
              <div className="max-h-56 overflow-y-auto rounded-md border divide-y">
                {result.failedItems.map((item) => (
                  <div key={item.nim} className="p-2.5 text-xs space-y-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{item.name || "(tanpa nama)"}</span>
                      <span className="text-muted-foreground">{item.nim}</span>
                    </div>
                    <p className="text-muted-foreground">{item.email || "(tidak ada surel)"}</p>
                    <p className="text-destructive">{item.error_message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EmailBulkActionPanel;
