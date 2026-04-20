import { useMemo } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  isGridQuestionType,
  type BuilderQuestion,
  type FormListItem,
  getInitialForms,
} from "@/lib/formManagement";
import { ArrowLeft } from "lucide-react";

interface PreviewLocationState {
  form?: FormListItem;
}

const FormPreviewPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { formId } = useParams<{ formId: string }>();

  const state = (location.state ?? {}) as PreviewLocationState;

  const fallbackForm = useMemo(() => {
    if (!formId) return null;
    return getInitialForms().find((item) => item.id === formId) ?? null;
  }, [formId]);

  const form = state.form ?? fallbackForm;

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
            <h2 className="text-2xl font-bold">{form.title || "Untitled Form"}</h2>
            <p className="text-sm text-muted-foreground">{form.description || "Tanpa deskripsi"}</p>
          </CardContent>
        </Card>

        {form.sections.map((section) => (
          <Card key={section.id} className="shadow-sm">
            <CardContent className="space-y-5 p-6">
              <div>
                <h3 className="text-lg font-semibold">{section.title}</h3>
                {section.description && <p className="text-sm text-muted-foreground">{section.description}</p>}
              </div>

              {section.questions.map((question) => (
                <div key={question.id} className="space-y-3 rounded-lg border p-4">
                  <Label className="text-sm font-medium leading-snug">
                    {question.question || "Pertanyaan belum diisi"}
                    {question.required && <span className="ml-1 text-destructive">*</span>}
                  </Label>
                  <ReadOnlyQuestionPreview question={question} />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </main>
    </div>
  );
};

interface ReadOnlyQuestionPreviewProps {
  question: BuilderQuestion;
}

const ReadOnlyQuestionPreview = ({ question }: ReadOnlyQuestionPreviewProps) => {
  switch (question.type) {
    case "short":
      return <Input disabled placeholder="Short answer" className="bg-background" />;

    case "paragraph":
      return <Textarea disabled rows={3} placeholder="Paragraph answer" className="bg-background" />;

    case "multiple_choice":
    case "checkbox":
      return (
        <div className="space-y-2">
          {question.options.map((option, index) => (
            <div key={`${question.id}-preview-${index}`} className="text-sm text-muted-foreground">
              - {option}
            </div>
          ))}
          {question.allowOther && <div className="text-sm text-muted-foreground">- Other</div>}
        </div>
      );

    case "dropdown":
      return (
        <Select disabled>
          <SelectTrigger className="bg-background">
            <SelectValue placeholder="Pilih opsi" />
          </SelectTrigger>
          <SelectContent>
            {question.options.map((option, index) => (
              <SelectItem key={`${question.id}-select-${index}`} value={`${index}`}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );

    case "linear_scale": {
      const min = question.scaleMin ?? 1;
      const max = question.scaleMax ?? 5;
      const values = Array.from({ length: Math.max(0, max - min + 1) }, (_, idx) => min + idx);

      return (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {values.map((value) => (
              <div
                key={`${question.id}-scale-${value}`}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-background text-sm"
              >
                {value}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{min}</span>
            <span>{max}</span>
          </div>
        </div>
      );
    }

    case "rating":
      return (
        <div className="flex gap-2 text-muted-foreground">
          {Array.from({ length: 5 }).map((_, index) => (
            <span key={`${question.id}-rating-${index}`}>☆</span>
          ))}
        </div>
      );

    case "date":
      return <Input type="date" disabled className="max-w-xs bg-background" />;

    case "time":
      return <Input type="time" disabled className="max-w-xs bg-background" />;

    default:
      if (isGridQuestionType(question.type)) {
        const rows = question.gridRows ?? [];
        const columns = question.gridColumns ?? [];

        return (
          <div className="overflow-x-auto rounded-lg border bg-background">
            <table className="w-full min-w-[460px] border-collapse text-sm">
              <thead>
                <tr>
                  <th className="border-b border-r bg-muted/40 px-3 py-2 text-left font-medium">Rows</th>
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
                    {columns.map((_, colIndex) => (
                      <td key={`${question.id}-cell-${rowIndex}-${colIndex}`} className="border-t px-3 py-2 text-center">
                        <div className="mx-auto h-4 w-4 rounded-full border border-muted-foreground/50" />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }

      return (
        <div className="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
          Preview untuk tipe ini tersedia setelah renderer responden terintegrasi penuh.
        </div>
      );
  }
};

export default FormPreviewPage;
