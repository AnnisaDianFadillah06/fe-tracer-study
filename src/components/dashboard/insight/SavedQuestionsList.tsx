import { useState } from "react";
import { Bookmark, Trash2, Users } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { InsightQuestion } from "@/hooks/useInsightQuestions";

interface Props {
  questions: InsightQuestion[];
  activeId: number | null;
  onOpen: (question: InsightQuestion) => void;
  onDelete: (question: InsightQuestion) => void;
}

/** Daftar pertanyaan tersimpan: klik untuk membuka, tempat sampah untuk yang milik sendiri. */
const SavedQuestionsList = ({ questions, activeId, onOpen, onDelete }: Props) => {
  const [confirming, setConfirming] = useState<InsightQuestion | null>(null);

  return (
    <>
      <ul className="divide-y rounded-md border text-left">
        {questions.map((q) => (
          <li
            key={q.id}
            className={`flex items-center gap-2 px-3 py-2 ${q.id === activeId ? "bg-accent" : ""}`}
          >
            <button
              type="button"
              className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm hover:underline"
              onClick={() => onOpen(q)}
            >
              <Bookmark className="h-3.5 w-3.5 shrink-0 text-primary" />
              <span className="truncate">{q.title}</span>
            </button>

            {q.is_shared && (
              <Badge variant="secondary" className="shrink-0 gap-1 font-normal">
                <Users className="h-3 w-3" />
                {q.is_mine ? "Dibagikan" : `oleh ${q.owner_name ?? "pengguna lain"}`}
              </Badge>
            )}

            {q.is_mine && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                aria-label={`Hapus ${q.title}`}
                onClick={() => setConfirming(q)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </li>
        ))}
      </ul>

      <AlertDialog open={confirming !== null} onOpenChange={(o) => !o && setConfirming(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus pertanyaan?</AlertDialogTitle>
            <AlertDialogDescription>
              "{confirming?.title}" akan dihapus
              {confirming?.is_shared ? " — termasuk bagi pengguna lain yang memakainya" : ""}.
              Data alumninya sendiri tidak terpengaruh.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirming) onDelete(confirming);
                setConfirming(null);
              }}
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default SavedQuestionsList;
