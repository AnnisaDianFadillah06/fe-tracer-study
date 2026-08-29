import { useEffect, useRef, useState } from "react";
import api from "@/lib/api";
import { useToast } from "@/hooks/common/use-toast";
import type {
  EmailBatchStatus,
  EmailBulkActionKind,
  EmailBulkProgress,
  EmailBulkResult,
  EmailSelectionPayload,
} from "@/types/emailSelection";

const ISSUE_ENDPOINT: Record<EmailBulkActionKind, string> = {
  account: "/alumni/credentials/issue-email",
  reminder: "/alumni/reminders/issue-email",
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const toBatchStatus = (data: any): EmailBatchStatus => ({
  total: Number(data?.total ?? 0),
  sent: Number(data?.sent ?? 0),
  failed: Number(data?.failed ?? 0),
  canceled: Number(data?.canceled ?? 0),
  pending: Number(data?.pending ?? 0),
});

const toResult = (data: any): EmailBulkResult => ({
  sent: Number(data?.sent ?? 0),
  failed: Number(data?.failed ?? 0),
  canceled: Number(data?.canceled ?? 0),
  failedItems: data?.failed_items ?? [],
});

/**
 * Chunk-loop + polling generik untuk KEDUA aksi bulk di halaman "Manajemen
 * Email" ("Terbitkan Akun" & "Kirim Reminder") — bentuk request/response
 * chunk dan polling identik antara keduanya, hanya endpoint issue yang
 * beda (endpoint status batch sudah netral, dipakai bersama). Diekstrak
 * jadi satu hook supaya logic async ini tidak diimplementasikan dua kali.
 *
 * DUA FASE, sama seperti versi form-filter sebelumnya. Fase 1: kirim
 * potongan seleksi (kursor `after_nim`) ke endpoint issue, server hanya
 * MENGANTREKAN. Fase 2: setelah seluruh potongan selesai diantrekan, poll
 * GET /alumni/email-batches/{batchId} tiap 1.5 detik sampai `pending`
 * nol — baru di situ ketahuan siapa yang sukses/gagal, karena kirim SMTP
 * sesungguhnya terjadi async di worker.
 *
 * PEMULIHAN SETELAH REFRESH: `batchId` sebelumnya cuma hidup di state
 * komponen, hilang begitu halaman direfresh walau worker tetap jalan di
 * belakang layar. Sekarang saat hook dipasang, ia bertanya ke backend
 * (GET /alumni/email-batches/active?kind=...) apakah admin yang sedang
 * login punya batch `kind` ini yang masih ada baris `queued`-nya -- kalau
 * ada, langsung lanjut polling batch itu alih-alih menunggu `run()`
 * dipanggil lagi.
 *
 * PEMBATALAN: `cancel()` memanggil POST .../cancel yang menandai sisa
 * baris `queued` jadi `canceled`, lalu poll loop di sini berhenti sendiri
 * begitu `pending` mencapai nol (baris `canceled` tidak dihitung pending).
 *
 * Setiap aksi (account/reminder) punya instance TERPISAH dari hook ini
 * (bukan satu shared yang ganti `kind` di tengah jalan), supaya progress
 * satu aksi tidak tertimpa aksi lain kalau admin klik keduanya bergantian.
 */
export function useEmailBulkAction(kind: EmailBulkActionKind) {
  const { toast } = useToast();

  const [isIssuing, setIsIssuing] = useState(false);
  const [issueProgress, setIssueProgress] = useState<EmailBulkProgress | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [batchStatus, setBatchStatus] = useState<EmailBatchStatus | null>(null);
  const [result, setResult] = useState<EmailBulkResult | null>(null);
  const [isCanceling, setIsCanceling] = useState(false);

  const isBusy = isIssuing || isPolling;

  const batchIdRef = useRef<string | null>(null);
  // Dicek di dalam loop poll setiap iterasi -- begitu cancel() menyalakan
  // ini, loop berhenti mem-poll lebih lanjut walau `pending` backend belum
  // sempat nol (backend mungkin masih memproses baris yang kepalang
  // dikirim sebelum status canceled tersimpan).
  const canceledRef = useRef(false);

  const pollUntilDone = async (batchId: string) => {
    setIsPolling(true);
    for (;;) {
      const { data } = await api.get(`/alumni/email-batches/${batchId}`);
      const status = toBatchStatus(data?.data);
      setBatchStatus(status);

      if (status.pending <= 0 || canceledRef.current) {
        setResult(toResult(data?.data));
        break;
      }
      await sleep(1500);
    }
    setIsPolling(false);
  };

  // Pemulihan progres setelah refresh -- sekali saat dipasang.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data } = await api.get("/alumni/email-batches/active", { params: { kind } });
        if (cancelled || !data?.data) return;

        const batchId: string = data.data.batch_id;
        batchIdRef.current = batchId;
        canceledRef.current = false;
        setBatchStatus(toBatchStatus(data.data));
        await pollUntilDone(batchId);
      } catch {
        // Diam-diam saja -- kalau gagal, admin cukup memulai aksi baru
        // manual, tidak ada progres yang hilang selain tampilan pemulihan.
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  /**
   * @param basePayload Bagian payload di luar `batch_id`/`after_nim` --
   *   selection (nims ATAU filter+excluded_nims) ditambah field spesifik
   *   aksi (mis. `only_without_credentials` untuk account).
   */
  const run = async (basePayload: EmailSelectionPayload & Record<string, unknown>) => {
    setIsIssuing(true);
    setIssueProgress(null);
    setResult(null);
    setBatchStatus(null);
    canceledRef.current = false;

    const batchId = crypto.randomUUID();
    batchIdRef.current = batchId;
    let totalQueued = 0;
    let totalSkipped = 0;
    let cursor: string | null = null;

    try {
      for (;;) {
        const payload: Record<string, unknown> = { ...basePayload, batch_id: batchId };
        if (cursor) payload.after_nim = cursor;

        const { data } = await api.post(ISSUE_ENDPOINT[kind], payload);
        const queued: number = Number(data?.data?.queued ?? 0);
        const skipped: number = Number(data?.data?.skipped_no_email ?? 0);
        const issuedCount: number = Number(data?.data?.issued_count ?? 0);
        const remaining: number = Number(data?.data?.remaining ?? 0);

        totalQueued += queued;
        totalSkipped += skipped;
        cursor = data?.data?.last_nim ?? null;
        setIssueProgress({ done: totalQueued + totalSkipped, remaining });

        if (issuedCount === 0 || remaining <= 0 || !cursor || canceledRef.current) break;
      }

      if (totalQueued === 0 && totalSkipped === 0) {
        throw new Error(
          kind === "account" ? "Tidak ada akun yang diterbitkan." : "Tidak ada reminder yang dikirim.",
        );
      }

      setIsIssuing(false);
      setIssueProgress(null);

      if (totalQueued > 0) {
        await pollUntilDone(batchId);
      } else {
        // Semua dilewati (mis. tidak punya surel) — sudah tercatat backend
        // sebagai baris `failed`, ambil sekali untuk menampilkan daftarnya.
        const { data } = await api.get(`/alumni/email-batches/${batchId}`);
        setResult(toResult(data?.data));
      }
    } catch (error: any) {
      const message =
        error?.response?.data?.message ?? error?.message ?? "Gagal memproses permintaan.";
      toast({
        title: totalQueued > 0 ? "Terhenti di tengah" : "Gagal",
        description:
          totalQueued > 0
            ? `${message} ${totalQueued} email yang terlanjur masuk antrean tetap diproses di latar belakang.`
            : message,
        variant: "destructive",
        duration: 20000,
      });
    } finally {
      setIsIssuing(false);
      setIsPolling(false);
      setIssueProgress(null);
    }
  };

  const cancel = async () => {
    const batchId = batchIdRef.current;
    if (!batchId) return;

    setIsCanceling(true);
    canceledRef.current = true;
    try {
      const { data } = await api.post(`/alumni/email-batches/${batchId}/cancel`);
      setBatchStatus(toBatchStatus(data?.data));
      toast({ title: "Dibatalkan", description: "Sisa email yang belum terkirim dibatalkan." });
    } catch (error: any) {
      toast({
        title: "Gagal membatalkan",
        description: error?.response?.data?.message ?? error?.message ?? "Coba lagi.",
        variant: "destructive",
      });
    } finally {
      setIsCanceling(false);
    }
  };

  const reset = () => {
    setResult(null);
    setBatchStatus(null);
    setIssueProgress(null);
    batchIdRef.current = null;
    canceledRef.current = false;
  };

  return {
    run,
    reset,
    cancel,
    isBusy,
    isIssuing,
    isPolling,
    isCanceling,
    issueProgress,
    batchStatus,
    result,
  };
}
