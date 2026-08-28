import { Fragment, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LogOut, Star, CheckCircle2, User, Info, AlertCircle, AlertTriangle, RotateCcw, ShieldCheck } from "lucide-react";
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
  hintFor, parseNumericInput, formatRupiah, formatNumber, isCurrencyQuestion,
} from "@/lib/formValidation";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import InstitutionLogo from "@/components/common/InstitutionLogo";
import { useStudentAuth } from "@/hooks/auth/useStudentAuth";
import LookupCombobox from "@/components/form/LookupCombobox";
import { useTracerForm, isQuestionVisible } from "@/hooks/form/useTracerForm";
import type { Question } from "@/hooks/form/useQuestionManagement";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import ConsentGate from "@/components/form/ConsentGate";
import { fetchConsentState, type ConsentState } from "@/lib/privacy";

const FormPage = () => {
  const navigate = useNavigate();
  const { session, isLoggedIn, logout } = useStudentAuth();
  /** Dialog konfirmasi "Mulai ulang" — dipicu dari dua tempat. */
  const [resetOpen, setResetOpen] = useState(false);

  // Pass kode_prodi dari session agar backend bisa filter kuesioner yang relevan
  const kodeProdi = session?.kodeProdi ?? undefined;
  const graduationYear = session?.graduationYear ?? (session?.angkatan ? parseInt(session.angkatan) + 3 : undefined);
  const {
    sections,
    answers,
    submitted,
    currentSection,
    errors,
    warnings,
    validateQuestion,
    restoredDraft,
    discardDraft,
    section,
    isLastSection,
    sectionPosition,
    sectionCount,
    progressPercent,
    isLoadingForms,
    isSubmitting,
    hasResponded,
    setAnswer,
    setCheckboxAnswer,
    handleNext,
    handleBack,
    handleSubmit: submitToBackend,
    handleReset,
    flushDraftNow,
  } = useTracerForm(kodeProdi, graduationYear, session?.nim, {
    // Bagian identitas diisi dari data yang sudah ada di basis data supaya
    // alumni tidak mengetik ulang apa yang sudah diketahui sistem. Semuanya
    // tetap bisa disunting — email dan telepon justru yang paling sering
    // berubah setelah lulus, dan itulah yang ingin diperbarui tracer study.
    // Kode PT tidak ikut: kolomnya tidak pernah diisi impor alumni.
    nim: session?.nim,
    name: session?.username,
    email: session?.email,
    phone: session?.phone,
    kodeProdi,
    graduationYear,
    nik: session?.nik,
    npwp: session?.npwp,
  });

  // Wrap submit to include identity data from session.
  // NIK dan NPWP sengaja tidak dititipkan di sini walau sesi sudah membawanya:
  // keduanya isian yang boleh disunting alumni, jadi yang dikirim harus nilai
  // dari formulir. Sesi hanya dipakai sebagai nilai awal (IDENTITY_MAP).
  const handleSubmit = (e: React.FormEvent) => {
    const identityData = session
      ? {
        nim: session.nim,
        name: session.username,
        email: session.email,
        phone: session.phone || undefined,
        tahun_lulus: session.graduationYear ?? (parseInt(session.angkatan) + 3),
        kdpstmsmh: kodeProdi ?? "",
      }
      : undefined;
    submitToBackend(e, identityData);
  };

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoggedIn) {
      navigate("/login");
    }
  }, [isLoggedIn, navigate]);

  // ── Gerbang persetujuan (UU 27/2022) ──────────────────────────────
  // Keadaannya diambil ulang dari server, bukan dibaca dari sesi yang
  // tersimpan di sessionStorage. Sesi itu dibekukan saat login dan bisa
  // sudah basi: alumni mungkin menarik persetujuannya dari perangkat lain,
  // atau versi pemberitahuannya baru saja dinaikkan pengelola.
  const [consent, setConsent] = useState<ConsentState | null>(null);
  const [consentLoading, setConsentLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn) return;
    let aktif = true;
    fetchConsentState()
      .then((state) => { if (aktif) setConsent(state); })
      // Kegagalan mengambil keadaan TIDAK diperlakukan sebagai "sudah
      // setuju". Kalau server tak terjangkau, gerbangnya tetap tertutup dan
      // percobaan menyimpan akan ditolak 451 — menutup saat ragu adalah
      // arah gagal yang benar untuk syarat hukum.
      .catch(() => { if (aktif) setConsent(null); })
      .finally(() => { if (aktif) setConsentLoading(false); });
    return () => { aktif = false; };
  }, [isLoggedIn]);

  if (!isLoggedIn) return null;

  const handleLogout = async () => {
    // Simpan dulu, baru keluar. logout() menghapus SELURUH draf lokal
    // (clearAllDrafts) demi privasi, jadi isian yang belum sempat terkirim ke
    // server — autosave-nya berjalan tiap 15 detik — akan hilang tanpa sisa
    // kalau urutannya dibalik. Kegagalan menyimpan tidak boleh menahan alumni
    // keluar dari sesinya, karena itu galatnya ditelan di dalam flushDraftNow.
    await flushDraftNow();
    logout();
    navigate("/login");
  };

  // Gerbang persetujuan dipasang SEBELUM kuesioner dimuat: memuat pertanyaan
  // lebih dulu berarti alumni sempat melihat formulir yang belum boleh ia isi,
  // dan autosave bisa menulis jawaban pertamanya sebelum ada dasar hukumnya.
  if (consentLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Memeriksa persetujuan...</p>
        </div>
      </div>
    );
  }

  if (!consent?.granted) {
    return (
      <ConsentGate
        consent={
          consent ?? {
            granted: false,
            granted_at: null,
            granted_version: null,
            current_version: "-",
            needs_renewal: false,
            retention_years: 10,
          }
        }
        onGranted={() => setConsent((c) => (c ? { ...c, granted: true, needs_renewal: false } : c))}
      />
    );
  }

  // Loading state saat fetch kuesioner dari backend
  if (isLoadingForms) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Memuat kuisioner...</p>
        </div>
      </div>
    );
  }

  // Already responded state
  if (!isLoadingForms && hasResponded && !submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md w-full text-center glass-card">
          <CardContent className="pt-10 pb-10 space-y-4">
            <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            </div>
            <h2 className="font-heading text-xl font-bold">Anda Sudah Mengisi</h2>
            <p className="text-muted-foreground">
              Terima kasih! Anda sudah mengisi kuesioner Tracer Study. Data Anda telah tersimpan.
            </p>
            {session && (
              <p className="text-sm text-muted-foreground">
                — {session.username} ({session.nim})
              </p>
            )}
            {/* Jalan ke hak subjek data WAJIB ada di layar ini, bukan hanya
                di bilah atas halaman pengisian. Alumni yang sudah selesai
                mengisi justru kelompok yang paling mungkin bertanya datanya
                dipakai untuk apa dan siapa saja yang sudah melihatnya —
                sementara layar ini melakukan early return sehingga bilah
                atasnya tidak pernah tampil. Tanpa tombol di sini, satu-satunya
                jalan adalah mengetik alamatnya sendiri, dan hak akses yang
                hanya bisa ditemukan begitu sama saja dengan tidak ada. */}
            <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
              <Button onClick={() => navigate("/data-saya")}>
                <ShieldCheck className="w-4 h-4 mr-2" />
                Data Saya
              </Button>
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Keluar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Empty state — tidak ada kuesioner aktif untuk tahun lulusan alumni
  if (!isLoadingForms && sections.length === 0 && !submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md w-full text-center glass-card">
          <CardContent className="pt-10 pb-10 space-y-4">
            <h2 className="font-heading text-xl font-bold">Tidak Ada Kuesioner</h2>
            <p className="text-muted-foreground">
              Saat ini belum ada kuesioner aktif untuk tahun lulusan Anda. Silakan hubungi admin atau coba lagi nanti.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Button onClick={() => navigate("/data-saya")}>
                <ShieldCheck className="mr-2 h-4 w-4" />
                Data Saya
              </Button>
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Keluar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md w-full text-center glass-card">
          <CardContent className="pt-10 pb-10 space-y-4">
            <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            </div>
            <h2 className="font-heading text-2xl font-bold">Terima Kasih!</h2>
            <p className="text-muted-foreground">
              Jawaban Anda telah berhasil dikirim. Kami sangat menghargai partisipasi Anda dalam
              Tracer Study ini.
            </p>
            {session && (
              <p className="text-sm text-muted-foreground">
                — {session.username} ({session.prodi})
              </p>
            )}
            {/* Tepat sesudah mengirim adalah saat alumni paling sadar bahwa
                datanya baru saja berpindah tangan — jadi ini tempat paling
                wajar menawarkan halaman haknya, bukan hanya tombol keluar. */}
            <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
              <Button onClick={() => navigate("/data-saya")}>
                <ShieldCheck className="w-4 h-4 mr-2" />
                Data Saya
              </Button>
              <Button variant="outline" onClick={handleReset}>
                Isi Ulang
              </Button>
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Keluar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top Nav */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border flex items-center justify-between px-6 h-14">
        <InstitutionLogo compact title="Smart Tracer" textClassName="hidden sm:block" />
        <div className="flex items-center gap-2">
          {session && (
            <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
              <User className="w-4 h-4" />
              <span>{session.username}</span>
              <span className="opacity-50">•</span>
              <span>{session.nim}</span>
            </div>
          )}
          <ThemeToggle />
          {/* Pintu masuk ke hak subjek data. Ditaruh di bilah atas halaman
              pengisian karena di sinilah alumni berada saat pertanyaan soal
              datanya muncul — portal yang hanya bisa ditemukan lewat menu lain
              sama saja dengan tidak ada. */}
          <Button variant="ghost" size="sm" onClick={() => navigate("/data-saya")} className="gap-2">
            <ShieldCheck className="w-4 h-4" />
            <span className="hidden sm:inline">Data Saya</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2">
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Keluar</span>
          </Button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-muted">
        <div
          className="h-full bg-primary transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
        {currentSection === 0 && (
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="text-muted-foreground self-center">Unduh referensi:</span>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => window.open(`${import.meta.env.VITE_API_URL ?? "/api"}/provinces/download`, "_blank")}>Kode Provinsi</Button>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => window.open(`${import.meta.env.VITE_API_URL ?? "/api"}/cities/download`, "_blank")}>Kode Kab/Kota</Button>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => window.open(`${import.meta.env.VITE_API_URL ?? "/api"}/programs/download`, "_blank")}>Kode Prodi</Button>
          </div>
        )}
        {sectionCount > 1 && (
          <div className="text-right text-xs text-muted-foreground">
            Bagian {sectionPosition} dari {sectionCount}
          </div>
        )}

        {/* Pemberitahuan pemulihan isian yang tertinggal. Ditampilkan sekali
            dan bisa dibuang bila ternyata bukan pengisian yang diinginkan. */}
        {restoredDraft && (
          <Card className="border-primary/40 bg-primary/[0.04]">
            <CardContent className="py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-2.5">
                <RotateCcw className="h-4 w-4 text-primary shrink-0 mt-0.5" aria-hidden />
                <div className="text-sm">
                  <p className="font-medium">Isian sebelumnya dipulihkan</p>
                  <p className="text-muted-foreground text-xs mt-0.5">
                    {restoredDraft.count} jawaban tersimpan otomatis, terakhir {restoredDraft.time}.
                    Anda bisa melanjutkan dari sini — termasuk dari perangkat lain.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setResetOpen(true)}
                className="shrink-0"
              >
                Mulai ulang
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Section Header */}
        <Card className="border-t-4 border-t-primary">
          <CardContent className="pt-5 pb-5">
            <h1 className="font-heading text-xl font-bold">{section.title}</h1>
            {section.description && (
              <p className="text-muted-foreground text-sm mt-1">{section.description}</p>
            )}
            {section.questions.some((q) => q.required) && (
              <p className="text-xs text-destructive mt-3">* Pertanyaan wajib diisi</p>
            )}
          </CardContent>
        </Card>

        {/* Questions */}
        <form
          onSubmit={
            isLastSection
              ? handleSubmit
              : (e) => {
                e.preventDefault();
                handleNext();
              }
          }
        >
          <div className="space-y-4">
            {section.questions
              .filter((q) => isQuestionVisible(q, answers, section.questions))
              .map((q) => (
              <Fragment key={q.id}>
              {/* Pemisah bertajuk di antara kelompok pertanyaan yang saling
                  berpasangan — mis. "Penilai 1" di atas pasangan nama dan
                  surelnya. Satu pertanyaan tetap satu kartu, jadi tanpa ini
                  enam kartu beruntun terbaca sebagai satu daftar panjang. */}
              {typeof q.metadata?.divider_label === "string" && (
                <div className="flex items-center gap-3 pt-4 pb-1 first:pt-0">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground shrink-0">
                    {q.metadata.divider_label}
                  </span>
                  <span className="h-px flex-1 bg-border" aria-hidden />
                </div>
              )}
              <Card
                // data-question-id dipakai penggulir otomatis untuk membawa
                // pengguna ke pertanyaan bermasalah pertama.
                data-question-id={q.id}
                className={`glass-card ${
                  errors[q.id]
                    ? "border-destructive"
                    : warnings?.[q.id]
                      ? "border-amber-500/60"
                      : ""
                }`}
              >
                <CardContent className="pt-5 pb-5 space-y-3">
                  <div>
                    <Label className="text-base font-medium leading-snug">
                      {q.question || (
                        <span className="italic text-muted-foreground">Pertanyaan Tanpa Judul</span>
                      )}
                      {q.required && (
                        <span className="text-destructive ml-1" aria-label="wajib diisi">*</span>
                      )}
                    </Label>
                    {q.description && (
                      <p className="text-sm text-muted-foreground mt-1">{q.description}</p>
                    )}
                    {/* Petunjuk pengisian — terutama untuk isian angka, supaya
                        alumni tidak perlu menebak formatnya. */}
                    {hintFor(q) && (
                      <p className="text-xs text-muted-foreground mt-1.5 flex items-start gap-1.5">
                        <Info className="h-3.5 w-3.5 shrink-0 mt-px" aria-hidden />
                        {hintFor(q)}
                      </p>
                    )}
                  </div>

                  <AnswerField
                    q={q}
                    answer={answers[q.id]}
                    parentAnswer={q.dependsOn ? (answers[q.dependsOn] as string) : undefined}
                    setAnswer={setAnswer}
                    setCheckboxAnswer={setCheckboxAnswer}
                    onBlur={() => validateQuestion(q)}
                    invalid={!!errors[q.id]}
                    lockedNim={q.code === "nimhsmsmh" ? session?.nim : undefined}
                  />

                  {errors[q.id] ? (
                    <p className="text-xs text-destructive flex items-start gap-1.5" role="alert">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-px" aria-hidden />
                      {errors[q.id]}
                    </p>
                  ) : warnings?.[q.id] ? (
                    // Peringatan lunak: nilainya sah, pengisian tetap boleh
                    // dilanjutkan. Hanya mengajak memeriksa ulang.
                    <p className="text-xs text-amber-600 dark:text-amber-500 flex items-start gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-px" aria-hidden />
                      {warnings[q.id]}
                    </p>
                  ) : null}
                </CardContent>
              </Card>
              </Fragment>
            ))}

            <div className="flex justify-between pt-2">
              {sectionPosition > 1 ? (
                <Button type="button" variant="outline" onClick={handleBack}>
                  Sebelumnya
                </Button>
              ) : (
                <div />
              )}
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" />Mengirim...</>
                ) : isLastSection ? "Kirim" : "Berikutnya"}
              </Button>
            </div>

            {/* Selalu tersedia selama pengisian, bukan hanya saat draf baru
                dipulihkan. Sejak draf ikut akun, keluar-lalu-masuk tidak lagi
                mengosongkan formulir — ini satu-satunya jalan mulai ulang. */}
            <div className="flex justify-center pt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => setResetOpen(true)}
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" aria-hidden />
                Mulai ulang pengisian
              </Button>
            </div>
          </div>
        </form>

        {/* Satu dialog untuk dua pemicu (spanduk draf & tombol bawah). Dibuat
            terkendali supaya render ulang akibat autosave tidak menutupnya. */}
        <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Mulai ulang pengisian?</AlertDialogTitle>
              <AlertDialogDescription>
                Semua jawaban yang sudah Anda isi akan dihapus — termasuk yang tersimpan
                di akun Anda, sehingga tidak akan muncul lagi di perangkat lain.
                Formulir kembali kosong dari bagian pertama. Tindakan ini tidak bisa dibatalkan.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction onClick={() => void discardDraft()}>
                Ya, mulai ulang
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

// ─── Answer Field ────────────────────────────────────────────────────────────

interface AnswerFieldProps {
  q: Question;
  answer: unknown;
  /** Jawaban pertanyaan induk, untuk isian referensi bertingkat (kab/kota). */
  parentAnswer?: string;
  setAnswer: (qId: string, val: unknown) => void;
  setCheckboxAnswer: (qId: string, oId: string, checked: boolean) => void;
  /** Divalidasi saat pengguna meninggalkan isian, bukan tiap ketikan. */
  onBlur?: () => void;
  invalid?: boolean;
  /**
   * NIM pemegang token. Hanya diisi untuk pertanyaan NIM, dan membuatnya
   * terkunci: server menolak submit bila NIM tidak sama persis dengan pemilik
   * token, jadi membiarkannya bisa disunting hanya menunda kegagalan sampai
   * seluruh borang selesai diisi.
   */
  lockedNim?: string;
}

const AnswerField = ({
  q, answer, parentAnswer, setAnswer, setCheckboxAnswer, onBlur, invalid, lockedNim,
}: AnswerFieldProps) => {
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  const aria = { "aria-invalid": invalid || undefined } as const;

  // Isian referensi: pilihannya dari tabel master, bukan dari opsi yang
  // diketik pembuat borang. Diperiksa sebelum percabangan tipe karena di
  // database tipenya tetap short_text.
  if (q.lookup) {
    return (
      <div className="space-y-1.5">
        <LookupCombobox
          id={q.id}
          source={q.lookup}
          valueField={q.lookupValue ?? "id"}
          value={(answer as string) ?? ""}
          onChange={(val) => {
            setAnswer(q.id, val);
            onBlur?.();
          }}
          parentValue={parentAnswer}
          hasError={!!invalid}
        />
      </div>
    );
  }

  if (lockedNim) {
    return (
      <div className="space-y-1.5">
        <Input
          {...aria}
          type="text"
          value={lockedNim}
          readOnly
          className="bg-muted/60 text-muted-foreground"
        />
        <p className="text-xs text-muted-foreground">
          Diambil dari akun Anda dan tidak dapat diubah. Bila keliru, hubungi
          pengelola tracer study.
        </p>
      </div>
    );
  }

  /**
   * Isian angka.
   *
   * Pengguna boleh mengetik "5.000.000" — pemisah ribuan dibersihkan saat
   * dikirim, dan nilai bersihnya ditampilkan sebagai pratinjau di bawah kotak
   * sebagai konfirmasi. Menolak titik mentah-mentah hanya membingungkan,
   * padahal maksud pengguna sudah jelas.
   */
  if (q.backendType === "number" && q.type === "short") {
    const text = (answer as string) ?? "";
    const cleaned = parseNumericInput(text);
    const numeric = /^\d+$/.test(cleaned) ? Number(cleaned) : null;
    const showPreview = numeric !== null && cleaned !== text.trim();

    return (
      <div className="space-y-1.5">
        <Input
          {...aria}
          type="text"
          inputMode="numeric"
          value={text}
          onChange={(e) => setAnswer(q.id, e.target.value)}
          onBlur={onBlur}
          placeholder={isCurrencyQuestion(q) ? "5000000" : "0"}
        />
        {numeric !== null && (showPreview || isCurrencyQuestion(q)) && (
          <p className="text-xs text-muted-foreground">
            Terbaca:{" "}
            <span className="font-medium text-foreground">
              {isCurrencyQuestion(q) ? formatRupiah(numeric) : formatNumber(numeric)}
            </span>
            {showPreview && <span> — dikirim sebagai {cleaned}</span>}
          </p>
        )}
      </div>
    );
  }

  if (q.type === "rating") {
    return (
      <div className="flex gap-1">
        {Array.from({ length: 5 }).map((_, i) => {
          const val = i + 1;
          const filled = (hoverRating ?? (answer as number) ?? 0) >= val;
          return (
            <Star
              key={i}
              className={`w-8 h-8 cursor-pointer transition-colors ${filled ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/40"
                }`}
              onMouseEnter={() => setHoverRating(val)}
              onMouseLeave={() => setHoverRating(null)}
              onClick={() => setAnswer(q.id, val)}
            />
          );
        })}
      </div>
    );
  }

  switch (q.type) {
    case "short":
      return (
        <Input
          {...aria}
          type={q.backendType === "date" ? "date" : "text"}
          value={(answer as string) ?? ""}
          onChange={(e) => setAnswer(q.id, e.target.value)}
          onBlur={onBlur}
          placeholder="Jawaban Anda"
        />
      );

    case "paragraph":
      return (
        <Textarea
          {...aria}
          value={(answer as string) ?? ""}
          onChange={(e) => setAnswer(q.id, e.target.value)}
          onBlur={onBlur}
          placeholder="Jawaban Anda"
          rows={4}
        />
      );

    case "multiple_choice":
      return (
        <RadioGroup
          value={(answer as string) ?? ""}
          onValueChange={(v) => { setAnswer(q.id, v); onBlur?.(); }}
          className="space-y-2"
        >
          {q.options.map((opt) => (
            <div key={opt.id} className="flex items-start gap-3">
              <RadioGroupItem value={opt.id} id={`${q.id}_${opt.id}`} className="mt-0.5" />
              <Label htmlFor={`${q.id}_${opt.id}`} className="font-normal cursor-pointer leading-snug">
                {opt.label}
                {/* Keterangan per opsi (mis. "Pendiri utama usaha" untuk
                    Founder) — menjaga pilihan tetap ringkas tapi jelas. */}
                {q.optionHints?.[opt.id] && (
                  <span className="block text-xs text-muted-foreground mt-0.5">
                    {q.optionHints[opt.id]}
                  </span>
                )}
              </Label>
            </div>
          ))}
        </RadioGroup>
      );

    case "checkbox":
      return (
        <div className="space-y-2">
          {q.options.map((opt) => {
            const checked = ((answer as string[]) ?? []).includes(opt.id);
            return (
              <div key={opt.id} className="flex items-center gap-3">
                <Checkbox
                  id={`${q.id}_${opt.id}`}
                  checked={checked}
                  onCheckedChange={(v) => setCheckboxAnswer(q.id, opt.id, !!v)}
                />
                <Label htmlFor={`${q.id}_${opt.id}`} className="font-normal cursor-pointer">
                  {opt.label}
                </Label>
              </div>
            );
          })}
        </div>
      );

    case "dropdown":
      return (
        <Select value={(answer as string) ?? ""} onValueChange={(v) => setAnswer(q.id, v)}>
          <SelectTrigger>
            <SelectValue placeholder="Pilih salah satu" />
          </SelectTrigger>
          <SelectContent>
            {q.options.map((opt) => (
              <SelectItem key={opt.id} value={opt.id}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );

    case "linear_scale": {
      const min = q.scaleMin ?? 1;
      const max = q.scaleMax ?? 5;
      const scale = Array.from({ length: max - min + 1 }, (_, i) => i + min);
      // Draf lokal menyimpan angka, tapi jawaban yang datang dari server selalu
      // teks ("4" — response_answers.answer_text). Perbandingan ketat terhadap
      // angka membuat pilihan yang sudah tersimpan tampak kosong setiap kali
      // pengisian dimuat ulang dari server (mis. setelah reset ke Ongoing).
      const picked =
        answer === undefined || answer === null || answer === "" ? null : Number(answer);
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            {q.scaleMinLabel && (
              <span className="text-xs text-muted-foreground w-20 text-right">
                {q.scaleMinLabel}
              </span>
            )}
            <div className="flex gap-3 flex-1 justify-center">
              {scale.map((v) => (
                <label key={v} className="flex flex-col items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    name={q.id}
                    value={v}
                    checked={picked === v}
                    onChange={() => setAnswer(q.id, v)}
                    className="w-4 h-4 accent-primary"
                  />
                  <span className="text-xs text-muted-foreground">{v}</span>
                </label>
              ))}
            </div>
            {q.scaleMaxLabel && (
              <span className="text-xs text-muted-foreground w-20">{q.scaleMaxLabel}</span>
            )}
          </div>
        </div>
      );
    }

    case "date":
      return (
        <Input
          type="date"
          value={(answer as string) ?? ""}
          onChange={(e) => setAnswer(q.id, e.target.value)}
          className="max-w-xs"
        />
      );

    case "time":
      return (
        <Input
          type="time"
          value={(answer as string) ?? ""}
          onChange={(e) => setAnswer(q.id, e.target.value)}
          className="max-w-xs"
        />
      );

    default:
      return <p className="text-sm text-muted-foreground italic">Tipe pertanyaan tidak didukung</p>;
  }
};

export default FormPage;
