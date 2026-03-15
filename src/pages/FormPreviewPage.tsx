import { useState, useEffect } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { GraduationCap, ArrowLeft, Star, CheckCircle2 } from "lucide-react";
import type { FormSection, Question } from "./QuestionManagementPage";
import { ThemeToggle } from "@/components/ThemeToggle";

const defaultSections: FormSection[] = [
  {
    id: "s1",
    title: "Kuesioner Tracer Study",
    description: "Silakan isi formulir berikut dengan jujur dan lengkap.",
    questions: [
      {
        id: "q1",
        type: "multiple_choice",
        question: "Status pekerjaan Anda saat ini?",
        options: [
          { id: "o1", label: "Bekerja" },
          { id: "o2", label: "Wiraswasta" },
          { id: "o3", label: "Studi lanjut" },
          { id: "o4", label: "Mencari kerja" },
        ],
        required: true,
      },
      {
        id: "q2",
        type: "short",
        question: "Nama perusahaan / instansi tempat Anda bekerja",
        options: [],
        required: false,
      },
      {
        id: "q3",
        type: "linear_scale",
        question: "Seberapa relevan pendidikan Anda dengan pekerjaan saat ini?",
        options: [],
        required: true,
        scaleMin: 1,
        scaleMax: 5,
        scaleMinLabel: "Tidak relevan",
        scaleMaxLabel: "Sangat relevan",
      },
    ],
  },
];

const FormPreviewPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sections, setSections] = useState<FormSection[]>(defaultSections);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState(false);
  const [currentSection, setCurrentSection] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const saved = localStorage.getItem("tracer_form_sections");
    if (saved) {
      try {
        setSections(JSON.parse(saved));
      } catch {}
    }
  }, []);

  const setAnswer = (questionId: string, value: any) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    setErrors((prev) => ({ ...prev, [questionId]: "" }));
  };

  const setCheckboxAnswer = (questionId: string, optionId: string, checked: boolean) => {
    setAnswers((prev) => {
      const current: string[] = prev[questionId] ?? [];
      return {
        ...prev,
        [questionId]: checked
          ? [...current, optionId]
          : current.filter((id) => id !== optionId),
      };
    });
    setErrors((prev) => ({ ...prev, [questionId]: "" }));
  };

  const validateSection = (sectionIdx: number) => {
    const sec = sections[sectionIdx];
    const newErrors: Record<string, string> = {};
    let valid = true;
    sec.questions.forEach((q) => {
      if (!q.required) return;
      const ans = answers[q.id];
      const isEmpty =
        ans === undefined ||
        ans === "" ||
        ans === null ||
        (Array.isArray(ans) && ans.length === 0);
      if (isEmpty) {
        newErrors[q.id] = "Pertanyaan ini wajib diisi";
        valid = false;
      }
    });
    setErrors(newErrors);
    return valid;
  };

  const handleNext = () => {
    if (!validateSection(currentSection)) return;
    setCurrentSection((prev) => prev + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateSection(currentSection)) return;
    setSubmitted(true);
    toast({ title: "Berhasil!", description: "Kuesioner telah berhasil dikirim" });
  };

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
              Jawaban Anda telah berhasil dikirim. Kami sangat menghargai partisipasi Anda dalam Tracer Study ini.
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => {
                setSubmitted(false);
                setAnswers({});
                setCurrentSection(0);
              }}
            >
              Isi Ulang
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const section = sections[currentSection];
  const isLastSection = currentSection === sections.length - 1;

  return (
    <div className="min-h-screen bg-background">
      {/* Top Nav */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border flex items-center justify-between px-6 h-14">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/question-management")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-orange-400 flex items-center justify-center">
            <GraduationCap className="w-4 h-4 text-white" />
          </div>
          <span className="font-heading font-semibold text-sm">Preview Form</span>
        </div>
        <ThemeToggle />
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-muted">
        <div
          className="h-full bg-primary transition-all duration-500"
          style={{ width: `${((currentSection + 1) / sections.length) * 100}%` }}
        />
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
        {/* Section info */}
        {sections.length > 1 && (
          <div className="text-right text-xs text-muted-foreground">
            Bagian {currentSection + 1} dari {sections.length}
          </div>
        )}

        {/* Section Header */}
        <Card className="border-t-4 border-t-primary">
          <CardContent className="pt-5 pb-5">
            <h1 className="font-heading text-xl font-bold">{section.title}</h1>
            {section.description && (
              <p className="text-muted-foreground text-sm mt-1">{section.description}</p>
            )}
            {section.questions.some((q) => q.required) && (
              <p className="text-xs text-destructive mt-3">
                * Pertanyaan wajib diisi
              </p>
            )}
          </CardContent>
        </Card>

        {/* Questions */}
        <form onSubmit={isLastSection ? handleSubmit : (e) => { e.preventDefault(); handleNext(); }}>
          <div className="space-y-4">
            {section.questions.map((q) => (
              <Card key={q.id} className={`glass-card ${errors[q.id] ? "border-destructive" : ""}`}>
                <CardContent className="pt-5 pb-5 space-y-3">
                  <div>
                    <Label className="text-base font-medium leading-snug">
                      {q.question || <span className="italic text-muted-foreground">Pertanyaan Tanpa Judul</span>}
                      {q.required && <span className="text-destructive ml-1">*</span>}
                    </Label>
                    {q.description && (
                      <p className="text-sm text-muted-foreground mt-1">{q.description}</p>
                    )}
                  </div>

                  <AnswerField
                    q={q}
                    answer={answers[q.id]}
                    setAnswer={setAnswer}
                    setCheckboxAnswer={setCheckboxAnswer}
                  />

                  {errors[q.id] && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <span>⚠</span> {errors[q.id]}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}

            <div className="flex justify-between pt-2">
              {currentSection > 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentSection((p) => p - 1)}
                >
                  Sebelumnya
                </Button>
              ) : (
                <div />
              )}
              <Button type="submit">
                {isLastSection ? "Kirim" : "Berikutnya"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Answer Field Sub-component ────────────────────────────────────────────────

interface AnswerFieldProps {
  q: Question;
  answer: any;
  setAnswer: (qId: string, val: any) => void;
  setCheckboxAnswer: (qId: string, oId: string, checked: boolean) => void;
}

const AnswerField = ({ q, answer, setAnswer, setCheckboxAnswer }: AnswerFieldProps) => {
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  if (q.type === "rating") {
    return (
      <div className="flex gap-1">
        {Array.from({ length: 5 }).map((_, i) => {
          const val = i + 1;
          const filled = (hoverRating ?? answer ?? 0) >= val;
          return (
            <Star
              key={i}
              className={`w-8 h-8 cursor-pointer transition-colors ${filled ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/40"}`}
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
          value={answer ?? ""}
          onChange={(e) => setAnswer(q.id, e.target.value)}
          placeholder="Jawaban Anda"
        />
      );

    case "paragraph":
      return (
        <Textarea
          value={answer ?? ""}
          onChange={(e) => setAnswer(q.id, e.target.value)}
          placeholder="Jawaban Anda"
          rows={4}
        />
      );

    case "multiple_choice":
      return (
        <RadioGroup
          value={answer ?? ""}
          onValueChange={(v) => setAnswer(q.id, v)}
          className="space-y-2"
        >
          {q.options.map((opt) => (
            <div key={opt.id} className="flex items-center gap-3">
              <RadioGroupItem value={opt.id} id={`${q.id}_${opt.id}`} />
              <Label htmlFor={`${q.id}_${opt.id}`} className="font-normal cursor-pointer">
                {opt.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
      );

    case "checkbox":
      return (
        <div className="space-y-2">
          {q.options.map((opt) => {
            const checked = (answer ?? []).includes(opt.id);
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
        <Select value={answer ?? ""} onValueChange={(v) => setAnswer(q.id, v)}>
          <SelectTrigger>
            <SelectValue placeholder="Pilih salah satu" />
          </SelectTrigger>
          <SelectContent>
            {q.options.map((opt) => (
              <SelectItem key={opt.id} value={opt.id}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      );

    case "linear_scale": {
      const min = q.scaleMin ?? 1;
      const max = q.scaleMax ?? 5;
      const scale = Array.from({ length: max - min + 1 }, (_, i) => i + min);
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            {q.scaleMinLabel && (
              <span className="text-xs text-muted-foreground w-20 text-right">{q.scaleMinLabel}</span>
            )}
            <div className="flex gap-3 flex-1 justify-center">
              {scale.map((v) => (
                <label key={v} className="flex flex-col items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    name={q.id}
                    value={v}
                    checked={answer === v}
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
          value={answer ?? ""}
          onChange={(e) => setAnswer(q.id, e.target.value)}
          className="max-w-xs"
        />
      );

    case "time":
      return (
        <Input
          type="time"
          value={answer ?? ""}
          onChange={(e) => setAnswer(q.id, e.target.value)}
          className="max-w-xs"
        />
      );

    default:
      return <p className="text-sm text-muted-foreground italic">Tipe pertanyaan tidak didukung</p>;
  }
};

export default FormPreviewPage;
