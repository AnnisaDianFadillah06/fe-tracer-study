import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import ExcelJS from "exceljs";
import { Loader2, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/common/use-toast";
import api from "@/lib/api";
import { workbookCreator } from "@/config/institution";

/**
 * Penerbitan kredensial alumni yang HIDUP DI ATAS ROUTER (RBAC-16).
 *
 * KENAPA DI SINI, BUKAN DI HALAMANNYA
 *
 * Penerbitan berjalan berpotong — pencincangan kata sandi sengaja lambat,
 * jadi lingkup berisi ribuan alumni dipecah menjadi belasan permintaan
 * berurutan yang bisa memakan beberapa menit. Selama itu tidak ada alasan
 * teknis apa pun petugas harus terpaku di satu halaman.
 *
 * Semula perulangan dan kumpulan barisnya tinggal di StudentManagementPage.
 * Akibatnya berpindah halaman membongkar komponennya: perulangan berhenti di
 * tengah dan baris yang sudah terkumpul hilang — padahal kata sandinya SUDAH
 * berganti di basis data. Alumni pada potongan itu terkunci tanpa seorang pun
 * memegang kata sandi barunya, dan satu-satunya pemulihan adalah menerbitkan
 * ulang.
 *
 * Karena itu keadaannya dipindah ke provider yang dipasang di atas <Routes>.
 * Provider tidak ikut dibongkar saat rute berganti, sehingga perulangan terus
 * berjalan, penanda mengambangnya ikut ke halaman mana pun, dan berkasnya
 * tetap terunduh sendiri begitu potongan terakhir selesai.
 *
 * Yang TETAP tidak bisa diselamatkan adalah menutup tab atau memuat ulang
 * halaman: kata sandi polos hanya hidup di memori peramban dan tidak boleh
 * disinggahkan ke mana pun — tidak ke localStorage, tidak ke server. Untuk itu
 * ada penjaga beforeunload di bawah, yang hanya bisa bertanya, bukan mencegah.
 */

/** Satu baris kredensial hasil penerbitan. */
export type IssuedCredential = { nim: string; name: string; email: string; password: string };

/** Lingkup penerbitan, dibekukan saat mulai. */
export type CredentialScope = {
  graduationYear: string;
  jurusan: string;
  programId: string;
  onlyWithoutCredentials: boolean;
  /** Ringkasan lingkup untuk ditampilkan, mis. "Lulusan 2026 • Teknik Informatika". */
  label: string;
};

type Progress = { done: number; remaining: number };

type CredentialIssueValue = {
  isRunning: boolean;
  progress: Progress | null;
  scopeLabel: string;
  percent: number;
  /** Mulai penerbitan. Diabaikan bila satu penerbitan sudah berjalan. */
  start: (scope: CredentialScope) => void;
  /**
   * Dilapor halaman penerbitan: apakah dialognya sedang terlihat. Selama
   * terlihat, penanda mengambang disembunyikan supaya kemajuan yang sama tidak
   * tampil dua kali.
   */
  setDialogVisible: (visible: boolean) => void;
  /**
   * Dinaikkan penanda mengambang saat diklik. Halaman penerbitan mengamati
   * angkanya dan membuka dialognya kembali.
   */
  openDialogRequest: number;
  requestOpenDialog: () => void;
};

const CredentialIssueContext = createContext<CredentialIssueValue | null>(null);

/** Halaman tempat dialog penerbitan tinggal; tujuan tombol buka-kembali. */
const ISSUE_PAGE_PATH = "/dashboard/student-management";

export const CredentialIssueProvider = ({ children }: { children: ReactNode }) => {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [scopeLabel, setScopeLabel] = useState("");
  const [dialogVisible, setDialogVisible] = useState(false);
  const [openDialogRequest, setOpenDialogRequest] = useState(0);

  // Penjaga terhadap panggilan ganda. State saja tidak cukup: dua klik dalam
  // satu putaran render membaca nilai lama yang sama.
  const runningRef = useRef(false);

  /**
   * Peringatan sebelum tab ditutup atau dimuat ulang.
   *
   * Ini satu-satunya kehilangan yang tersisa setelah perpindahan halaman aman,
   * dan ia tidak bisa dicegah — peramban hanya mengizinkan bertanya. Teksnya
   * sendiri diabaikan peramban modern; yang penting kotaknya muncul.
   */
  useEffect(() => {
    if (!isRunning) return;

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isRunning]);

  const start = useCallback(
    async (scope: CredentialScope) => {
      if (runningRef.current) return;
      runningRef.current = true;

      setIsRunning(true);
      setProgress(null);
      setScopeLabel(scope.label);

      const rows: IssuedCredential[] = [];
      let cursor: string | null = null;

      try {
        // Perulangan tak bersyarat dengan penjaga di dalam: berhenti saat
        // server melaporkan tidak ada sisa, atau saat satu potong tidak
        // menghasilkan apa-apa (penjaga kedua, supaya kekeliruan di sisi
        // server tidak pernah berubah menjadi perulangan tanpa akhir).
        for (;;) {
          const payload: Record<string, unknown> = {
            only_without_credentials: scope.onlyWithoutCredentials,
          };
          if (scope.graduationYear) payload.graduation_year = Number(scope.graduationYear);
          if (scope.jurusan) payload.jurusan = scope.jurusan;
          if (scope.programId) payload.program_id = Number(scope.programId);
          if (cursor) payload.after_nim = cursor;

          const { data } = await api.post("/alumni/credentials/issue", payload);
          const batch: IssuedCredential[] = data?.data?.issued ?? [];
          const remaining: number = Number(data?.data?.remaining ?? 0);

          rows.push(...batch);
          cursor = data?.data?.last_nim ?? null;
          setProgress({ done: rows.length, remaining });

          if (batch.length === 0 || remaining <= 0 || !cursor) break;
        }

        if (rows.length === 0) {
          throw new Error("Tidak ada kredensial yang diterbitkan.");
        }

        await downloadCredentialWorkbook(rows);

        toast({
          title: "Kredensial diterbitkan",
          description:
            `${rows.length} kata sandi dibuat dan berkasnya terunduh. Berkas ini satu-satunya ` +
            `salinan — simpan di tempat aman, dan hapus setelah kiriman surel selesai.`,
          duration: 12000,
        });
      } catch (error: any) {
        const message =
          error?.response?.data?.message ?? error?.message ?? "Gagal menerbitkan kredensial.";

        // Potongan yang sudah terbit TIDAK dapat dibatalkan — kata sandinya
        // sudah berganti di basis data. Berkasnya tetap diunduh supaya
        // kredensial itu tidak hilang bersama kegagalannya; tanpa ini, alumni
        // pada potongan tersebut terkunci tanpa siapa pun tahu kata sandinya.
        if (rows.length > 0) {
          await downloadCredentialWorkbook(rows);
          toast({
            title: "Penerbitan terhenti di tengah",
            description:
              `${message} ${rows.length} kredensial yang terlanjur terbit sudah diunduh dan tetap ` +
              `berlaku. Jalankan lagi dengan pilihan "hanya yang belum pernah menerima kredensial" ` +
              `untuk melanjutkan sisanya.`,
            variant: "destructive",
            duration: 20000,
          });
        } else {
          toast({ title: "Gagal", description: message, variant: "destructive", duration: 12000 });
        }
      } finally {
        runningRef.current = false;
        setIsRunning(false);
        setProgress(null);
      }
    },
    [toast],
  );

  const requestOpenDialog = useCallback(() => {
    navigate(ISSUE_PAGE_PATH);
    setOpenDialogRequest((n) => n + 1);
  }, [navigate]);

  const percent = progress
    ? Math.round((progress.done / Math.max(1, progress.done + progress.remaining)) * 100)
    : 0;

  const value = useMemo<CredentialIssueValue>(
    () => ({
      isRunning,
      progress,
      scopeLabel,
      percent,
      start,
      setDialogVisible,
      openDialogRequest,
      requestOpenDialog,
    }),
    [isRunning, progress, scopeLabel, percent, start, openDialogRequest, requestOpenDialog],
  );

  return (
    <CredentialIssueContext.Provider value={value}>
      {children}
      {isRunning && !dialogVisible && <CredentialProgressCard />}
    </CredentialIssueContext.Provider>
  );
};

export const useCredentialIssue = (): CredentialIssueValue => {
  const ctx = useContext(CredentialIssueContext);
  if (!ctx) {
    throw new Error("useCredentialIssue harus dipakai di dalam CredentialIssueProvider.");
  }
  return ctx;
};

/**
 * Penanda kemajuan mengambang di pojok kanan bawah — pola yang sama dengan
 * kotak unggahan Google Drive.
 *
 * Dirender provider, bukan halaman penerbitan, supaya ikut terlihat di halaman
 * mana pun. Tidak ada tombol tutup: selama penerbitan berjalan, satu-satunya
 * salinan kata sandi ada di memori tab ini, dan itu harus tetap terlihat.
 * Tombol yang ada membawa kembali ke dialognya.
 */
const CredentialProgressCard = () => {
  const { progress, scopeLabel, percent, requestOpenDialog } = useCredentialIssue();

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border bg-background shadow-lg">
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">Menerbitkan kredensial</p>
          <p className="truncate text-xs text-muted-foreground">{scopeLabel}</p>
        </div>
        <span className="text-sm font-semibold tabular-nums">{percent}%</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={requestOpenDialog}
          title="Buka kembali jendela penerbitan"
        >
          <ChevronUp className="h-4 w-4" />
        </Button>
      </div>
      <div className="space-y-2 px-3 py-2">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary transition-all" style={{ width: `${percent}%` }} />
        </div>
        <p className="text-xs text-muted-foreground">
          {progress
            ? `${progress.done} selesai${
                progress.remaining > 0 ? ` • ${progress.remaining} tersisa` : ""
              }. `
            : "Menyiapkan potongan pertama… "}
          Berkasnya terunduh sendiri setelah selesai. Silakan berpindah halaman — yang tidak boleh
          hanya menutup atau memuat ulang tab ini.
        </p>
      </div>
    </div>
  );
};

/**
 * Rakit dan unduh berkas kredensial. Dipakai jalur sukses maupun gagal-sebagian.
 *
 * Formatnya .xlsx, bukan CSV. Berkas CSV berpemisah koma dibuka Excel berlokal
 * Indonesia dengan seluruh kolom menempel jadi satu.
 */
const downloadCredentialWorkbook = async (rows: IssuedCredential[]) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = workbookCreator;
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Kredensial Alumni");
  sheet.columns = [
    { header: "NIM", key: "nim", width: 20 },
    { header: "Nama", key: "name", width: 32 },
    { header: "Surel", key: "email", width: 32 },
    { header: "Kata Sandi", key: "password", width: 20 },
  ];

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FF1F2937" } };
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDBEAFE" } };
  headerRow.alignment = { horizontal: "center", vertical: "middle" };
  headerRow.height = 24;
  sheet.views = [{ state: "frozen", ySplit: 1 }];

  rows.forEach((r) => sheet.addRow(r));

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Kredensial_Alumni_${new Date().toISOString().slice(0, 10)}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
};
