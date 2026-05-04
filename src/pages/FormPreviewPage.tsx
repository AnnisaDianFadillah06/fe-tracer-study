import { useMemo, useState } from "react";
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
import { type BuilderQuestion, type FormListItem, getInitialForms } from "@/lib/formManagement";
import { ArrowLeft } from "lucide-react";

interface PreviewLocationState {
  form?: FormListItem;
}

const PREVIEW_DRAFT_KEY = "tracer_form_preview_draft";
const SUPPORTED_DEMO_TYPES = new Set([
  "short",
  "paragraph",
  "multiple_choice",
  "checkbox",
  "dropdown",
  "multiple_choice_grid",
  "checkbox_grid",
  "file_upload",
  "linear_scale",
  "rating",
  "date",
  "time",
]);

const getScaleLabels = (min: number, max: number, customLabels?: string[]) => {
  const count = Math.max(0, max - min + 1);
  const hasCustom = Array.isArray(customLabels) && customLabels.some((label) => label.trim() !== "");
  if (count === 5) {
    return [
      "Sangat tidak setuju",
      "Tidak setuju",
      "Netral",
      "Setuju",
      "Sangat setuju",
    ];
  }
  if (count === 4) {
    return ["Sangat buruk", "Buruk", "Baik", "Sangat baik"];
  }
  if (count === 3) {
    return ["Rendah", "Sedang", "Tinggi"];
  }
  if (count === 7) {
    return [
      "Sangat rendah",
      "Rendah",
      "Agak rendah",
      "Netral",
      "Agak tinggi",
      "Tinggi",
      "Sangat tinggi",
    ];
  }
  const defaults = Array.from({ length: count }, (_, index) => `Nilai ${min + index}`);

  if (!hasCustom || !customLabels) {
    return defaults;
  }

  return defaults.map((fallback, index) => {
    const label = customLabels[index]?.trim();
    return label ? label : fallback;
  });
};

const FormPreviewPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { formId } = useParams<{ formId: string }>();
  const [searchParams] = useSearchParams();

  const state = (location.state ?? {}) as PreviewLocationState;
  const isDraftMode = searchParams.get("draft") === "1";

  const draftForm = useMemo(() => {
    if (!isDraftMode || typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(PREVIEW_DRAFT_KEY);
      return raw ? (JSON.parse(raw) as FormListItem) : null;
    } catch {
      return null;
    }
  }, [isDraftMode]);

  const fallbackForm = useMemo(() => {
    if (!formId) return null;
    return getInitialForms().find((item) => item.id === formId) ?? null;
  }, [formId]);

  const form = state.form ?? draftForm ?? fallbackForm;

  const [answers, setAnswers] = useState<
    Record<string, string | number | string[] | Record<string, string> | Record<string, string[]>>
  >({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const backToBuilder = () => {
    if (formId) {
      navigate(`/dashboard/form-management/${formId}/edit`);
      return;
    }
    navigate("/dashboard/form-management/new");
  };

  if (!form) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50/70 px-6">
        <Card className="w-full max-w-md">
          <CardContent className="space-y-3 py-8 text-center">
            <h1 className="text-xl font-semibold">Preview tidak tersedia</h1>
            <p className="text-sm text-muted-foreground">
              Data formulir tidak ditemukan. Kembali ke form builder untuk melanjutkan penyuntingan.
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
    setSubmitted(false);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};

    form.sections.forEach((section) => {
      section.questions.forEach((question) => {
        if (!question.required) return;
        if (!SUPPORTED_DEMO_TYPES.has(question.type)) return;

        const value = answers[question.id];
        const isEmpty =
          value === undefined ||
          value === null ||
          (typeof value === "string" && value.trim() === "") ||
          (Array.isArray(value) && value.length === 0);

        if (isEmpty) {
          nextErrors[question.id] = "Pertanyaan ini wajib diisi.";
        }
      });
    });

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) {
      setSubmitted(true);
    }
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
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Preview Form</p>
              <h1 className="text-base font-semibold">Mode Read-only</h1>
            </div>
          </div>
          <Button variant="outline" onClick={backToBuilder}>Kembali ke Builder</Button>
        </div>
      </header>

      <main className="mx-auto max-w-[1080px] space-y-5 px-4 py-6 sm:px-6">
        <Card className="border-t-4 border-t-primary shadow-sm">
          <CardContent className="space-y-3 p-6">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-bold">{form.title || "Untitled Form"}</h2>
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                Demo Pengerjaan
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{form.description || "Tanpa deskripsi"}</p>
            <p className="text-xs text-muted-foreground">
              Ini adalah preview interaktif untuk mencoba alur pengisian sebelum disebarkan.
            </p>
          </CardContent>
        </Card>

        {submitted ? (
          <Card className="shadow-sm">
            <CardContent className="space-y-3 p-6 text-center">
              <h3 className="text-lg font-semibold">Jawaban demo tersimpan</h3>
              <p className="text-sm text-muted-foreground">
                Ini hanya simulasi. Data tidak dikirim ke backend.
              </p>
              <div className="flex justify-center gap-2">
                <Button variant="outline" onClick={resetDemo}>Isi Ulang</Button>
                <Button onClick={backToBuilder}>Kembali ke Builder</Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {form.sections.map((section) => (
              <Card key={section.id} className="shadow-sm">
                <CardContent className="space-y-5 p-6">
                  <div>
                    <h3 className="text-lg font-semibold">{section.title}</h3>
                    {section.description && (
                      <p className="text-sm text-muted-foreground">{section.description}</p>
                    )}
                  </div>

                  {section.questions.map((question) => (
                    <div key={question.id} className="space-y-3 rounded-lg border p-4">
                      <Label className="text-sm font-medium leading-snug">
                        {question.question || "Pertanyaan belum diisi"}
                        {question.required && <span className="ml-1 text-destructive">*</span>}
                      </Label>
                      <InteractiveQuestionPreview
                        question={question}
                        value={answers[question.id]}
                        onChange={(value) =>
                          setAnswers((prev) => ({ ...prev, [question.id]: value }))
                        }
                      />
                      {errors[question.id] && (
                        <p className="text-xs text-destructive">{errors[question.id]}</p>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}

            <div className="flex justify-end">
              <Button type="submit">Kirim Demo</Button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
};

interface InteractiveQuestionPreviewProps {
  question: BuilderQuestion;
  value:
    | string
    | number
    | string[]
    | Record<string, string>
    | Record<string, string[]>
    | undefined;
  onChange: (value: string | number | string[] | Record<string, string> | Record<string, string[]>) => void;
}

const InteractiveQuestionPreview = ({ question, value, onChange }: InteractiveQuestionPreviewProps) => {
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
          placeholder="Jawaban singkat"
          className="bg-background"
        />
      );

    case "paragraph":
      return (
        <Textarea
          rows={3}
          value={typeof currentValue === "string" ? currentValue : ""}
          onChange={(event) => onChange(event.target.value)}
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
            {question.options.map((option, index) => (
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
          {question.options.map((option, index) => (
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
            {question.options.map((option, index) => (
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

    case "linear_scale": {
      const min = question.scaleMin ?? 1;
      const max = question.scaleMax ?? 5;
      const values = Array.from({ length: Math.max(0, max - min + 1) }, (_, idx) => min + idx);
      const labels = getScaleLabels(min, max, question.scaleLabels);

      return (
        <div className="space-y-3">
          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${values.length}, minmax(0, 1fr))` }}>
            {values.map((value, index) => (
              <div key={`${question.id}-scale-${value}`} className="flex flex-col items-center gap-1">
                <Button
                  type="button"
                  variant={currentValue === value ? "default" : "outline"}
                  size="sm"
                  onClick={() => onChange(value)}
                >
                  {value}
                </Button>
                <span className="text-[11px] text-muted-foreground text-center">
                  {labels[index]}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    case "rating":
      return (
        <div className="flex gap-2">
          {Array.from({ length: 5 }).map((_, index) => {
            const ratingValue = index + 1;
            const isActive = currentValue === ratingValue;
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
          className="max-w-xs bg-background"
        />
      );

    case "time":
      return (
        <Input
          type="time"
          value={typeof currentValue === "string" ? currentValue : ""}
          onChange={(event) => onChange(event.target.value)}
          className="max-w-xs bg-background"
        />
      );
  }
};

export default FormPreviewPage;
