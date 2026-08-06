import { Fragment, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { Textarea } from "@/components/ui/textarea";
import { type BuilderQuestion, type FormListItem, getInitialForms, backendToFormListItem, visibleOptions } from "@/lib/formManagement";
import { AlertCircle, AlertTriangle, ArrowLeft, Info, Loader2 } from "lucide-react";
import {
  formatNumber, formatRupiah, hintFor, parseNumericInput, validateAnswer, validateCrossField,
} from "@/lib/formValidation";
import api from "@/lib/api";
import { readDraft } from "@/lib/questionnaireDrafts";
import LookupCombobox from "@/components/form/LookupCombobox";

interface PreviewLocationState {
  form?: FormListItem;
}

/**
 * Terjemahkan pertanyaan bentuk penyunting ke bentuk yang dipakai formulir
 * alumni.
 *
 * hintFor() dan validateAnswer() dirancang untuk bentuk pertanyaan milik
 * formulir alumni, sedangkan pratinjau memegang bentuk penyunting. Dijembatani
 * di sini alih-alih menyalin aturannya, supaya pratinjau tidak pelan-pelan
 * menyimpang dari apa yang sebenarnya dialami alumni — justru itu gunanya
 * pratinjau.
 *
 * `id` pertanyaan di penyunting adalah kode pertanyaannya, jadi aturan yang
 * bersandar pada kode (NIK 16 digit, NPWP, pendapatan dalam rupiah) ikut
 * berlaku di sini tanpa perlakuan khusus.
 */
const toRendererQuestion = (question: BuilderQuestion) => {
  const isScale = question.type === "linear_scale" || question.type === "rating";
  const backendType = question.type === "date"
    ? "date"
    : isScale || question.type === "number"
      ? "number"
      : "short_text";

  return {
    id: question.id,
    code: question.id,
    question: question.question,
    required: question.required,
    backendType,
    lookup: question.lookup,
    metadata: {
      hint: question.hint,
      format: question.format,
      warn_min: question.warnMin,
      warn_max: question.warnMax,
      ...(isScale ? { scale_min: question.scaleMin, scale_max: question.scaleMax } : {}),
    },
  } as unknown as Parameters<typeof hintFor>[0];
};

const previewHint = (question: BuilderQuestion): string | null =>
  hintFor(toRendererQuestion(question));

const PREVIEW_DRAFT_KEY = "tracer_form_preview_draft";
const SUPPORTED_DEMO_TYPES = new Set([
  "short",
  "paragraph",
  "number",
  "multiple_choice",
  "checkbox",
  "dropdown",
  "lookup",
  "multiple_choice_grid",
  "checkbox_grid",
  "file_upload",
  "linear_scale",
  "rating",
  "date",
  "time",
]);


const isQuestionVisible = (
  question: BuilderQuestion,
  answers: Record<string, string | number | string[] | Record<string, string> | Record<string, string[]>>,
  _allQuestions?: BuilderQuestion[],
) => {
  const logic = question.logic;
  if (!logic || logic.type === "always") return true;
  if (logic.type !== "in_array") return true;
  if (!logic.dependsOn || logic.values.length === 0) return false;

  const currentAnswer = answers[logic.dependsOn];
  if (currentAnswer === undefined || currentAnswer === null || currentAnswer === "") return false;

  if (Array.isArray(currentAnswer)) {
    return logic.values.some((value) => currentAnswer.map(String).includes(String(value)));
  }

  return logic.values.some((value) => String(value) === String(currentAnswer));
};

const FormPreviewPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { formId } = useParams<{ formId: string }>();
  const [searchParams] = useSearchParams();

  const state = (location.state ?? {}) as PreviewLocationState;
  const isDraftMode = searchParams.get("draft") === "1";
  const isStudentMode = searchParams.get("mode") === "student";

  const draftForm = useMemo(() => {
    if (!isDraftMode) return null;
    // Draf berversi: salinan dari aplikasi versi lama diabaikan, bukan
    // dipakai — lihat BUILDER_DRAFT_SCHEMA_VERSION.
    return readDraft<FormListItem>(PREVIEW_DRAFT_KEY);
  }, [isDraftMode]);

  const fallbackForm = useMemo(() => {
    if (!formId) return null;
    return getInitialForms().find((item) => item.id === formId) ?? null;
  }, [formId]);

  const [apiForm, setApiForm] = useState<FormListItem | null>(null);
  const [apiLoading, setApiLoading] = useState(false);

  // Kuesioner yang sudah tersimpan SELALU diambil ulang dari server.
  //
  // Dulu salinan di localStorage (getInitialForms) didahulukan, dan karena
  // salinan itu hampir selalu ada, permintaan ke server tidak pernah
  // dijalankan. Akibatnya pratinjau menampilkan bentuk lama — pertanyaan
  // pendapatan tetap tampil sebagai skala 1-5 walau di basis data sudah
  // bertipe angka. Salinan lokal tetap dipakai, tapi hanya sebagai jaring
  // pengaman kalau permintaannya gagal.
  useEffect(() => {
    if (state.form || draftForm) return;
    if (!formId || !/^\d+$/.test(formId)) return;

    setApiLoading(true);
    api.get(`/questionnaires/${formId}`).then(({ data }) => {
      if (data.success && data.data) {
        setApiForm(backendToFormListItem(data.data));
      }
    }).catch(() => {}).finally(() => setApiLoading(false));
  }, [formId, state.form, draftForm]);

  const form = state.form ?? draftForm ?? apiForm ?? fallbackForm;

  const [answers, setAnswers] = useState<
    Record<string, string | number | string[] | Record<string, string> | Record<string, string[]>>
  >({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  /** Peringatan lunak — nilainya sah, tapi patut dikonfirmasi ulang. */
  const [warnings, setWarnings] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [currentSection, setCurrentSection] = useState(0);

  if (apiLoading || !form) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const section = form.sections[currentSection];
  const isLastSection = currentSection === form.sections.length - 1;

  /**
   * Bagian yang dirender sekaligus.
   *
   * Pratinjau untuk pembuat borang menampilkan seluruh kuesioner dalam satu
   * halaman — yang dicari di sana adalah gambaran utuh, dan menelusuri sebelas
   * halaman hanya untuk memeriksa satu pertanyaan justru menghalanginya.
   * Mode pengisian alumni tetap berhalaman.
   */
  const sectionsToRender = isStudentMode ? (section ? [section] : []) : form.sections;

  const backToBuilder = () => {
    if (isStudentMode) {
      navigate("/form");
      return;
    }
    if (formId) {
      navigate(`/dashboard/form-management/${formId}/edit`);
      return;
    }
    navigate("/dashboard/form-management/new/builder");
  };

  if (!form) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50/70 px-6">
        <Card className="w-full max-w-md">
          <CardContent className="space-y-3 py-8 text-center">
            <h1 className="text-xl font-semibold">Preview tidak tersedia</h1>
            <p className="text-sm text-muted-foreground">
              Data kuisioner tidak ditemukan. Kembali ke kuisioner builder untuk melanjutkan penyuntingan.
            </p>
            <Button onClick={backToBuilder}>Kembali ke Builder</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const resetDemo = () => {
    setAnswers({});
    setErrors({});
    setWarnings({});
    setSubmitted(false);
    setCurrentSection(0);
  };

  /**
   * Periksa satu pertanyaan saja — dipanggil saat isiannya ditinggalkan.
   *
   * Sama seperti formulir alumni: kesalahan ketik ketahuan begitu pengguna
   * berpindah isian, bukan ditahan sampai menekan tombol lanjut. Yang kosong
   * tidak diapa-apakan di sini; "wajib diisi" baru relevan saat berpindah
   * bagian, dan memerahkan isian yang belum sempat disentuh hanya membuat
   * halaman terlihat rusak.
   */
  const validateQuestion = (question: BuilderQuestion) => {
    const result = validateAnswer(toRendererQuestion(question), answers[question.id]);

    setErrors((prev) => {
      const next = { ...prev };
      if (result.error) next[question.id] = result.error;
      else delete next[question.id];
      return next;
    });
    setWarnings((prev) => {
      const next = { ...prev };
      if (result.warning) next[question.id] = result.warning;
      else delete next[question.id];
      return next;
    });
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    const nextWarnings: Record<string, string> = {};

    // Jawaban berkunci KODE, untuk validasi silang antar-pertanyaan.
    const byCode: Record<string, unknown> = {};

    // Seluruh bagian yang sedang tampil ikut diperiksa — di mode read-only
    // itu berarti seisi kuesioner sekaligus.
    const questionsToCheck = sectionsToRender.flatMap((sec) =>
      sec.questions.map((question) => ({ question, siblings: sec.questions })),
    );

    questionsToCheck.forEach(({ question, siblings }) => {
      if (!SUPPORTED_DEMO_TYPES.has(question.type)) return;
      if (!isQuestionVisible(question, answers, siblings)) return;

      byCode[question.id] = answers[question.id];

      // Aturan yang sama persis dengan formulir alumni: wajib-tapi-kosong,
      // tipe, panjang, format, rentang skala, dan kewajaran nilai. Sebelumnya
      // pratinjau hanya memeriksa wajib-tapi-kosong, sehingga isian ngawur
      // seperti "a" pada kolom surel lolos di sini tapi ditolak saat alumni
      // benar-benar mengisi — persis kebalikan dari gunanya pratinjau.
      const result = validateAnswer(toRendererQuestion(question), answers[question.id]);
      if (result.error) {
        nextErrors[question.id] = result.error;
      } else if (result.warning) {
        nextWarnings[question.id] = result.warning;
      }
    });

    for (const [code, message] of Object.entries(validateCrossField(byCode))) {
      if (!nextErrors[code]) nextErrors[code] = message;
    }

    setErrors(nextErrors);
    setWarnings(nextWarnings);
    if (Object.keys(nextErrors).length > 0) return;

    // Read-only sudah menampilkan semuanya, jadi lolos pemeriksaan berarti
    // selesai — tidak ada bagian berikutnya untuk dituju.
    if (!isStudentMode || isLastSection) {
      setSubmitted(true);
      return;
    }

    setCurrentSection((prev) => Math.min(prev + 1, form.sections.length - 1));
  };

  const handleBack = () => {
    setCurrentSection((prev) => Math.max(prev - 1, 0));
  };

  return (
    <div className="min-h-screen bg-slate-50/70">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1080px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={backToBuilder}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {isStudentMode ? "Pengisian Kuisioner" : "Preview Kuisioner"}
              </p>
              <h1 className="text-base font-semibold">
                {isStudentMode ? "Isi Kuisioner Tracer Study" : "Mode Read-only"}
              </h1>
            </div>
          </div>
          <Button variant="outline" onClick={backToBuilder}>
            {isStudentMode ? "Kembali ke Daftar" : "Kembali ke Builder"}
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-[1080px] space-y-5 px-4 py-6 sm:px-6">
        <Card className="border-t-4 border-t-primary shadow-sm">
          <CardContent className="space-y-3 p-6">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-bold">{form.title || "Untitled Form"}</h2>
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                {isStudentMode ? "Pengisian Form" : "Demo Pengerjaan"}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{form.description || "Tanpa deskripsi"}</p>
            {!isStudentMode && (
              <p className="text-xs text-muted-foreground">
                Ini adalah preview interaktif untuk mencoba alur pengisian sebelum disebarkan.
              </p>
            )}
          </CardContent>
        </Card>

        {submitted ? (
          <Card className="shadow-sm">
            <CardContent className="space-y-3 p-6 text-center">
              <h3 className="text-lg font-semibold">
                {isStudentMode ? "Jawaban tersimpan" : "Jawaban demo tersimpan"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {isStudentMode
                  ? "Terima kasih. Jawaban Anda tersimpan untuk simulasi ini."
                  : "Ini hanya simulasi. Data tidak dikirim ke backend."}
              </p>
              <div className="flex justify-center gap-2">
                <Button variant="outline" onClick={resetDemo}>Isi Ulang</Button>
                <Button onClick={backToBuilder}>
                  {isStudentMode ? "Kembali ke Daftar" : "Kembali ke Builder"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : section ? (
          <form onSubmit={handleSubmit} className="space-y-5">
            {isStudentMode && form.sections.length > 1 && (
              <div className="text-right text-xs text-muted-foreground">
                Bagian {currentSection + 1} dari {form.sections.length}
              </div>
            )}

            {sectionsToRender.map((section) => (
            <Card key={section.id} className="shadow-sm">
              <CardContent className="space-y-5 p-6">
                <div>
                  <h3 className="text-lg font-semibold">{section.title}</h3>
                  {section.description && (
                    <p className="text-sm text-muted-foreground">{section.description}</p>
                  )}
                </div>

                {section.questions
                  .filter((question) => isQuestionVisible(question, answers, section.questions))
                  .map((question) => (
                    <Fragment key={question.id}>
                    {question.dividerLabel && (
                      <div className="flex items-center gap-3 pt-2">
                        <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {question.dividerLabel}
                        </span>
                        <span className="h-px flex-1 bg-border" aria-hidden />
                      </div>
                    )}
                    <div
                      className={`space-y-3 rounded-lg border p-4 ${
                        errors[question.id]
                          ? "border-destructive"
                          : warnings[question.id]
                            ? "border-amber-500/60"
                            : ""
                      }`}
                    >
                      <Label className="text-sm font-medium leading-snug">
                        {question.question || "Pertanyaan belum diisi"}
                        {question.required && <span className="ml-1 text-destructive">*</span>}
                      </Label>
                      {question.description && (
                        <p className="text-sm text-muted-foreground">{question.description}</p>
                      )}
                      {/* Petunjuk dihitung dengan fungsi yang sama seperti
                          formulir alumni, jadi pratinjau menampilkan persis
                          yang nanti dilihat pengisi — termasuk petunjuk
                          otomatis yang diturunkan dari tipe pertanyaan. */}
                      {previewHint(question) && (
                        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                          <Info className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
                          {previewHint(question)}
                        </p>
                      )}
                      <InteractiveQuestionPreview
                        question={question}
                        value={answers[question.id]}
                        onChange={(value) => {
                          setAnswers((prev) => {
                            const next = { ...prev, [question.id]: value };

                            // Jawaban turunan menjadi mustahil begitu induknya
                            // berganti — kab/kota dari provinsi lain. Dikosongkan,
                            // sama seperti di formulir alumni.
                            if (prev[question.id] !== value) {
                              for (const sec of form.sections) {
                                for (const q of sec.questions) {
                                  if (q.dependsOn === question.id) delete next[q.id];
                                }
                              }
                            }

                            return next;
                          });
                          // Pesan lama dibuang begitu pengguna mulai
                          // memperbaiki; menahannya sampai blur membuat
                          // isian terlihat masih salah padahal sudah benar.
                          setErrors((prev) => {
                            if (!prev[question.id]) return prev;
                            const next = { ...prev };
                            delete next[question.id];
                            return next;
                          });
                        }}
                        onBlur={() => validateQuestion(question)}
                        parentValue={
                          question.dependsOn
                            ? (answers[question.dependsOn] as string | undefined)
                            : undefined
                        }
                      />
                      {errors[question.id] ? (
                        <p className="flex items-start gap-1.5 text-xs text-destructive" role="alert">
                          <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
                          {errors[question.id]}
                        </p>
                      ) : warnings[question.id] ? (
                        <p className="flex items-start gap-1.5 text-xs text-amber-600 dark:text-amber-500">
                          <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
                          {warnings[question.id]}
                        </p>
                      ) : null}
                    </div>
                    </Fragment>
                  ))}
              </CardContent>
            </Card>
            ))}

            {/* Mode read-only menampilkan seluruh bagian sekaligus, jadi tidak
                ada yang perlu dinavigasi — tombolnya cukup satu untuk
                memeriksa seluruh isian. Mode pengisian alumni tetap
                berhalaman, sebab di sanalah pemenggalan itu berguna. */}
            {isStudentMode ? (
              <div className="flex justify-between">
                <Button type="button" variant="outline" onClick={handleBack} disabled={currentSection === 0}>
                  Sebelumnya
                </Button>
                <Button type="submit">
                  {isLastSection ? "Kirim Demo" : "Berikutnya"}
                </Button>
              </div>
            ) : (
              <div className="flex justify-end">
                <Button type="submit">Periksa Semua Jawaban</Button>
              </div>
            )}
          </form>
        ) : null}
      </main>
    </div>
  );
};

interface InteractiveQuestionPreviewProps {
  question: BuilderQuestion;
  /** Dipanggil saat isian ditinggalkan — memicu pemeriksaan satu pertanyaan. */
  onBlur?: () => void;
  /**
   * Jawaban pertanyaan induk untuk isian referensi bertingkat — daftar
   * kab/kota baru terbuka setelah provinsinya dipilih.
   */
  parentValue?: string;
  value:
    | string
    | number
    | string[]
    | Record<string, string>
    | Record<string, string[]>
    | undefined;
  onChange: (value: string | number | string[] | Record<string, string> | Record<string, string[]>) => void;
}

const InteractiveQuestionPreview = ({ question, value, onChange, onBlur, parentValue }: InteractiveQuestionPreviewProps) => {
  const currentValue = value ?? "";

  if (!SUPPORTED_DEMO_TYPES.has(question.type)) {
    return (
      <div className="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
        Demo untuk tipe ini belum tersedia.
      </div>
    );
  }

  switch (question.type) {
    case "short":
      return (
        <Input
          value={typeof currentValue === "string" ? currentValue : ""}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          placeholder="Jawaban singkat"
          className="bg-background"
        />
      );

    // Isian angka: papan tik ponsel langsung menampilkan angka, dan nilai
    // rupiah memperlihatkan bacaan terformat seperti di formulir alumni.
    case "number": {
      const text = typeof currentValue === "string" ? currentValue : "";
      const cleaned = parseNumericInput(text);
      const numeric = /^\d+$/.test(cleaned) ? Number(cleaned) : null;
      const isRupiah = question.format === "currency";

      return (
        <div className="space-y-1.5">
          <Input
            type="text"
            inputMode="numeric"
            value={text}
            onChange={(event) => onChange(event.target.value)}
            onBlur={onBlur}
            placeholder={isRupiah ? "5000000" : "0"}
            className="bg-background"
          />
          {numeric !== null && (isRupiah || cleaned !== text.trim()) && (
            <p className="text-xs text-muted-foreground">
              Terbaca:{" "}
              <span className="font-medium text-foreground">
                {isRupiah ? formatRupiah(numeric) : formatNumber(numeric)}
              </span>
            </p>
          )}
        </div>
      );
    }

    // Pratinjau memakai komponen yang sama persis dengan halaman pengisian,
    // termasuk permintaan datanya — supaya pembuat borang melihat daftar
    // referensi yang sesungguhnya, bukan tiruan.
    case "lookup":
      return question.lookup ? (
        <LookupCombobox
          source={question.lookup}
          valueField={question.lookupValue ?? "id"}
          value={typeof currentValue === "string" ? currentValue : ""}
          onChange={(val) => onChange(val)}
          // Tanpa ini daftar kab/kota tidak pernah terbuka walau provinsinya
          // sudah dipilih — pratinjau jadi memberi kesan borangnya rusak.
          parentValue={parentValue}
        />
      ) : (
        <div className="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
          Sumber data belum dipilih di penyunting pertanyaan.
        </div>
      );

    case "paragraph":
      return (
        <Textarea
          rows={3}
          value={typeof currentValue === "string" ? currentValue : ""}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          placeholder="Jawaban panjang"
          className="bg-background"
        />
      );

    case "multiple_choice": {
      const isOtherSelected = typeof currentValue === "string" && currentValue.startsWith("Other");
      const otherText = isOtherSelected
        ? currentValue.replace(/^Other:\s?/, "")
        : "";

      return (
        <div className="space-y-2">
          <RadioGroup
            value={isOtherSelected ? "Other" : (typeof currentValue === "string" ? currentValue : "")}
            onValueChange={(val) => onChange(val === "Other" ? "Other" : val)}
          >
            {visibleOptions(question).map((option, index) => (
              <div key={`${question.id}-option-${index}`} className="flex items-center gap-2">
                <RadioGroupItem value={option} id={`${question.id}-option-${index}`} />
                <Label htmlFor={`${question.id}-option-${index}`}>{option}</Label>
              </div>
            ))}
            {question.allowOther && (
              <div className="flex items-center gap-2">
                <RadioGroupItem value="Other" id={`${question.id}-option-other`} />
                <Label htmlFor={`${question.id}-option-other`}>Other</Label>
              </div>
            )}
          </RadioGroup>
          {question.allowOther && (currentValue === "Other" || isOtherSelected) && (
            <Input
              value={otherText}
              onChange={(event) => onChange(`Other: ${event.target.value}`)}
              placeholder="Tulis jawaban lain"
            />
          )}
        </div>
      );
    }

    case "checkbox": {
      const selected = Array.isArray(currentValue) ? currentValue : [];
      const toggleValue = (option: string, checked: boolean) => {
        const next = checked
          ? [...selected, option]
          : selected.filter((item) => item !== option);
        onChange(next);
      };

      return (
        <div className="space-y-2">
          {visibleOptions(question).map((option, index) => (
            <div key={`${question.id}-check-${index}`} className="flex items-center gap-2">
              <Checkbox
                checked={selected.includes(option)}
                onCheckedChange={(checked) => toggleValue(option, Boolean(checked))}
              />
              <Label>{option}</Label>
            </div>
          ))}
          {question.allowOther && (
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selected.includes("Other")}
                onCheckedChange={(checked) => toggleValue("Other", Boolean(checked))}
              />
              <Label>Other</Label>
            </div>
          )}
        </div>
      );
    }

    case "dropdown":
      return (
        <Select
          value={typeof currentValue === "string" ? currentValue : ""}
          onValueChange={(val) => onChange(val)}
        >
          <SelectTrigger className="bg-background">
            <SelectValue placeholder="Pilih opsi" />
          </SelectTrigger>
          <SelectContent>
            {visibleOptions(question).map((option, index) => (
              <SelectItem key={`${question.id}-select-${index}`} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );

    case "multiple_choice_grid": {
      const rows = question.gridRows ?? [];
      const columns = question.gridColumns ?? [];
      const currentGrid =
        typeof currentValue === "object" && !Array.isArray(currentValue)
          ? (currentValue as Record<string, string>)
          : {};

      return (
        <div className="overflow-x-auto rounded-lg border bg-background">
          <table className="w-full min-w-[520px] border-collapse text-sm">
            <thead>
              <tr>
                <th className="border-b border-r bg-muted/40 px-3 py-2 text-left font-medium">Pernyataan</th>
                {columns.map((column, index) => (
                  <th key={`${question.id}-column-${index}`} className="border-b px-3 py-2 text-center font-medium">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={`${question.id}-row-${rowIndex}`}>
                  <td className="border-r border-t bg-muted/20 px-3 py-2">{row}</td>
                  {columns.map((column, colIndex) => (
                    <td key={`${question.id}-cell-${rowIndex}-${colIndex}`} className="border-t px-3 py-2 text-center">
                      <input
                        type="radio"
                        name={`${question.id}-${rowIndex}`}
                        checked={currentGrid[row] === column}
                        onChange={() => onChange({ ...currentGrid, [row]: column })}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    case "checkbox_grid": {
      const rows = question.gridRows ?? [];
      const columns = question.gridColumns ?? [];
      const currentGrid =
        typeof currentValue === "object" && !Array.isArray(currentValue)
          ? (currentValue as Record<string, string[]>)
          : {};

      const toggleGridValue = (row: string, column: string, checked: boolean) => {
        const rowValues = currentGrid[row] ?? [];
        const nextValues = checked
          ? [...rowValues, column]
          : rowValues.filter((item) => item !== column);
        onChange({ ...currentGrid, [row]: nextValues });
      };

      return (
        <div className="overflow-x-auto rounded-lg border bg-background">
          <table className="w-full min-w-[520px] border-collapse text-sm">
            <thead>
              <tr>
                <th className="border-b border-r bg-muted/40 px-3 py-2 text-left font-medium">Pernyataan</th>
                {columns.map((column, index) => (
                  <th key={`${question.id}-column-${index}`} className="border-b px-3 py-2 text-center font-medium">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={`${question.id}-row-${rowIndex}`}>
                  <td className="border-r border-t bg-muted/20 px-3 py-2">{row}</td>
                  {columns.map((column, colIndex) => (
                    <td key={`${question.id}-cell-${rowIndex}-${colIndex}`} className="border-t px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={(currentGrid[row] ?? []).includes(column)}
                        onChange={(event) =>
                          toggleGridValue(row, column, event.target.checked)
                        }
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    case "file_upload":
      return <Input type="file" className="max-w-xs bg-background" />;

    // Bentuknya mengikuti formulir alumni: sederet tombol radio bernomor,
    // dengan keterangan hanya di kedua ujungnya. Sebelumnya di sini setiap
    // angka diberi label sendiri — dan karena kuesioner umumnya tidak
    // menyimpan label per angka, yang muncul adalah label bawaan "Sangat
    // tidak setuju" pada pertanyaan yang sama sekali bukan pernyataan sikap.
    case "linear_scale": {
      const min = question.scaleMin ?? 1;
      const max = question.scaleMax ?? 5;
      const values = Array.from({ length: Math.max(0, max - min + 1) }, (_, idx) => min + idx);
      const labels = question.scaleLabels ?? [];
      const minLabel = labels[0] ?? "";
      const maxLabel = labels.length > 0 ? labels[labels.length - 1] : "";

      return (
        <div className="flex items-center gap-2">
          {minLabel && (
            <span className="w-20 text-right text-xs text-muted-foreground">{minLabel}</span>
          )}
          <div className="flex flex-1 justify-center gap-3">
            {values.map((value) => (
              <label key={`${question.id}-scale-${value}`} className="flex cursor-pointer flex-col items-center gap-1">
                <input
                  type="radio"
                  name={question.id}
                  value={value}
                  checked={currentValue === value}
                  onChange={() => onChange(value)}
                  className="h-4 w-4 accent-primary"
                />
                <span className="text-xs text-muted-foreground">{value}</span>
              </label>
            ))}
          </div>
          {maxLabel && <span className="w-20 text-xs text-muted-foreground">{maxLabel}</span>}
        </div>
      );
    }

    case "rating":
      return (
        <div className="flex gap-2">
          {Array.from({ length: 5 }).map((_, index) => {
            const ratingValue = index + 1;
            const isActive = typeof currentValue === "number" && currentValue >= ratingValue;
            return (
              <Button
                key={`${question.id}-rating-${index}`}
                type="button"
                variant={isActive ? "default" : "outline"}
                size="icon"
                onClick={() => onChange(ratingValue)}
              >
                {isActive ? "★" : "☆"}
              </Button>
            );
          })}
        </div>
      );

    case "date":
      return (
        <Input
          type="date"
          value={typeof currentValue === "string" ? currentValue : ""}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          className="max-w-xs bg-background"
        />
      );

    case "time":
      return (
        <Input
          type="time"
          value={typeof currentValue === "string" ? currentValue : ""}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          className="max-w-xs bg-background"
        />
      );
  }
};

export default FormPreviewPage;
