import { useEffect } from "react";
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
import { LogOut, Star, CheckCircle2, User } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useStudentAuth } from "@/hooks/useStudentAuth";
import { useFormResponse } from "@/hooks/useFormResponse";
import type { Question } from "@/hooks/useQuestionManagement";
import { useState } from "react";
import PolbanLogo from "@/components/PolbanLogo";

const FormPage = () => {
  const navigate = useNavigate();
  const { session, isLoggedIn, logout } = useStudentAuth();
  const {
    sections,
    answers,
    submitted,
    currentSection,
    errors,
    section,
    isLastSection,
    progressPercent,
    setAnswer,
    setCheckboxAnswer,
    handleNext,
    handleBack,
    handleSubmit,
    handleReset,
  } = useFormResponse();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoggedIn) {
      navigate("/form/login");
    }
  }, [isLoggedIn, navigate]);

  if (!isLoggedIn) return null;

  const handleLogout = () => {
    logout();
    navigate("/form/login");
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
              Jawaban Anda telah berhasil dikirim. Kami sangat menghargai partisipasi Anda dalam
              Tracer Study ini.
            </p>
            {session && (
              <p className="text-sm text-muted-foreground">
                — {session.username} ({session.prodi})
              </p>
            )}
            <div className="flex gap-2 justify-center pt-2">
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
        <PolbanLogo compact title="Tracer Study" subtitle="POLBAN" textClassName="hidden sm:block" />
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
            {section.questions.map((q) => (
              <Card
                key={q.id}
                className={`glass-card ${errors[q.id] ? "border-destructive" : ""}`}
              >
                <CardContent className="pt-5 pb-5 space-y-3">
                  <div>
                    <Label className="text-base font-medium leading-snug">
                      {q.question || (
                        <span className="italic text-muted-foreground">Pertanyaan Tanpa Judul</span>
                      )}
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
                <Button type="button" variant="outline" onClick={handleBack}>
                  Sebelumnya
                </Button>
              ) : (
                <div />
              )}
              <Button type="submit">{isLastSection ? "Kirim" : "Berikutnya"}</Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Answer Field ────────────────────────────────────────────────────────────

interface AnswerFieldProps {
  q: Question;
  answer: unknown;
  setAnswer: (qId: string, val: unknown) => void;
  setCheckboxAnswer: (qId: string, oId: string, checked: boolean) => void;
}

const AnswerField = ({ q, answer, setAnswer, setCheckboxAnswer }: AnswerFieldProps) => {
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  if (q.type === "rating") {
    return (
      <div className="flex gap-1">
        {Array.from({ length: 5 }).map((_, i) => {
          const val = i + 1;
          const filled = (hoverRating ?? (answer as number) ?? 0) >= val;
          return (
            <Star
              key={i}
              className={`w-8 h-8 cursor-pointer transition-colors ${
                filled ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/40"
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
          value={(answer as string) ?? ""}
          onChange={(e) => setAnswer(q.id, e.target.value)}
          placeholder="Jawaban Anda"
        />
      );

    case "paragraph":
      return (
        <Textarea
          value={(answer as string) ?? ""}
          onChange={(e) => setAnswer(q.id, e.target.value)}
          placeholder="Jawaban Anda"
          rows={4}
        />
      );

    case "multiple_choice":
      return (
        <RadioGroup
          value={(answer as string) ?? ""}
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
