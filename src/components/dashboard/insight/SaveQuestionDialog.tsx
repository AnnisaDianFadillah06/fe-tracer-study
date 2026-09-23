import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface SaveQuestionValues {
  title: string;
  isShared: boolean;
  /** true = simpan sebagai pertanyaan baru walau sedang membuka pertanyaan lama. */
  asNew: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTitle: string;
  defaultShared: boolean;
  /** Sedang membuka pertanyaan milik sendiri → tawarkan "simpan sebagai baru". */
  editing: boolean;
  saving: boolean;
  error: string | null;
  onSave: (values: SaveQuestionValues) => void;
}

const SaveQuestionDialog = ({
  open,
  onOpenChange,
  defaultTitle,
  defaultShared,
  editing,
  saving,
  error,
  onSave,
}: Props) => {
  const [title, setTitle] = useState(defaultTitle);
  const [isShared, setIsShared] = useState(defaultShared);
  const [asNew, setAsNew] = useState(false);

  // Setiap kali dibuka, mulai dari keadaan pertanyaan yang sedang tampil.
  useEffect(() => {
    if (open) {
      setTitle(defaultTitle);
      setIsShared(defaultShared);
      setAsNew(false);
    }
  }, [open, defaultTitle, defaultShared]);

  const trimmed = title.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (trimmed) onSave({ title: trimmed, isShared, asNew });
          }}
          className="space-y-4"
        >
          <DialogHeader>
            <DialogTitle>{editing && !asNew ? "Simpan perubahan" : "Simpan pertanyaan"}</DialogTitle>
            <DialogDescription>
              Yang disimpan adalah pertanyaannya, bukan angkanya — setiap kali dibuka,
              angkanya dihitung ulang dari data terbaru.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            <Label htmlFor="insight-question-title">Nama pertanyaan</Label>
            <Input
              id="insight-question-title"
              value={title}
              maxLength={150}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          <label className="flex cursor-pointer items-start gap-2 text-sm">
            <Checkbox
              checked={isShared}
              onCheckedChange={(v) => setIsShared(v === true)}
              className="mt-0.5"
            />
            <span>
              Bagikan ke semua pengguna dashboard
              <span className="block text-xs text-muted-foreground">
                Setiap orang tetap hanya melihat data sesuai hak aksesnya sendiri.
              </span>
            </span>
          </label>

          {editing && (
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox checked={asNew} onCheckedChange={(v) => setAsNew(v === true)} />
              Simpan sebagai pertanyaan baru
            </label>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={!trimmed || saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SaveQuestionDialog;
