/**
 * DrillDownModal.tsx
 *
 * Modal generik untuk drill-down data alumni dari BE (server-side pagination).
 * Dipakai di semua KPI. Kolom base selalu sama:
 *   Nama | NIM | Program Studi | Jenjang | Tahun Lulus
 * Ditambah 1 kolom konteks KPI yang di-pass lewat prop `contextColumn`.
 *
 * Segment filter (tab status) dibentuk dinamis dari data BE —
 * tidak ada hardcode label status.
 */

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { DrillDownResponse, DrillDownStudent } from "@/hooks/useKeterserapan";

// ─────────────────────────────────────────────────────────────────────────────

export interface ContextColumn {
  /** key field di DrillDownStudent */
  key: keyof DrillDownStudent | string;
  label: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  /** Data respons dari BE (null saat belum load) */
  data: DrillDownResponse | null;
  loading: boolean;
  error: string | null;
  /** Kolom tambahan sesuai konteks KPI */
  contextColumn: ContextColumn | null;
  /** Dipanggil saat user ganti halaman atau search */
  onPageChange: (page: number, search?: string) => void;
}

// ─────────────────────────────────────────────────────────────────────────────

const DrillDownModal = ({
  isOpen,
  onClose,
  title,
  data,
  loading,
  error,
  contextColumn,
  onPageChange,
}: Props) => {
  const [search, setSearch]     = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  // Reset saat modal dibuka
  useEffect(() => {
    if (isOpen) {
      setSearch("");
      setCurrentPage(1);
    }
  }, [isOpen]);

  // Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (isOpen) {
      document.addEventListener("keydown", handler);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "auto";
    };
  }, [isOpen, onClose]);

  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    setCurrentPage(1);
    if (searchTimeout) clearTimeout(searchTimeout);
    setSearchTimeout(setTimeout(() => { onPageChange(1, value); }, 400));
  }, [onPageChange, searchTimeout]);

  const gotoPage = useCallback((page: number) => {
    setCurrentPage(page);
    onPageChange(page, search);
  }, [onPageChange, search]);

  const students: DrillDownStudent[] = data?.data ?? [];
  const pagination = data?.pagination;
  const totalOnPage = pagination?.total_on_page ?? 0;
  const perPage = pagination?.per_page ?? 15;
  // BE belum tentu kirim total keseluruhan → estimasi hasMore dari total_on_page
  const hasMore = totalOnPage === perPage;
  const hasPrev = currentPage > 1;

  if (!isOpen) return null;

  const content = (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
        style={{ backgroundColor: "rgba(0,0,0,0.85)" }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 40 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="w-full h-full max-w-[1400px] max-h-[92vh] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/60 shrink-0">
            <h2 className="font-heading text-xl font-bold truncate max-w-[80%]">{title}</h2>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Search */}
          <div className="px-6 py-3 border-b border-border bg-secondary/10 shrink-0">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama, NIM, atau prodi…"
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10 bg-background/60 border-border"
              />
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto min-h-0">
            {loading ? (
              <div className="flex items-center justify-center h-48 gap-3 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Memuat data…</span>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-48 text-destructive">
                {error}
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-secondary/40 sticky top-0 z-10">
                  <tr>
                    <th className="py-3 px-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-10">No</th>
                    <th className="py-3 px-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nama</th>
                    <th className="py-3 px-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">NIM</th>
                    <th className="py-3 px-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Program Studi</th>
                    <th className="py-3 px-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Jenjang</th>
                    <th className="py-3 px-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tahun Lulus</th>
                    {contextColumn && (
                      <th className="py-3 px-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {contextColumn.label}
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {students.map((s, idx) => (
                    <tr key={`${s.nim}-${idx}`} className="border-t border-border/30 hover:bg-secondary/20 transition-colors">
                      <td className="py-2.5 px-4 text-muted-foreground">{(currentPage - 1) * perPage + idx + 1}</td>
                      <td className="py-2.5 px-4 font-medium whitespace-nowrap">{s.nama}</td>
                      <td className="py-2.5 px-4 text-muted-foreground whitespace-nowrap">{s.nim}</td>
                      <td className="py-2.5 px-4 whitespace-nowrap">{s.nama_prodi}</td>
                      <td className="py-2.5 px-4">{s.jenjang}</td>
                      <td className="py-2.5 px-4">{s.tahun_lulus}</td>
                      {contextColumn && (
                        <td className="py-2.5 px-4">
                          {(s as any)[contextColumn.key] ?? "—"}
                        </td>
                      )}
                    </tr>
                  ))}
                  {students.length === 0 && (
                    <tr>
                      <td colSpan={contextColumn ? 7 : 6} className="py-16 text-center text-muted-foreground">
                        <div className="text-3xl mb-2">📭</div>
                        Tidak ada data yang ditemukan
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          <div className="px-6 py-3 border-t border-border bg-card/60 flex items-center justify-between gap-4 shrink-0">
            <span className="text-sm text-muted-foreground">
              Halaman <span className="font-medium text-foreground">{currentPage}</span>
              {totalOnPage > 0 && (
                <> · {(currentPage - 1) * perPage + 1}–{(currentPage - 1) * perPage + students.length} data</>
              )}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={!hasPrev} onClick={() => gotoPage(currentPage - 1)}>
                <ChevronLeft className="w-4 h-4" />
                Sebelumnya
              </Button>
              <Button variant="outline" size="sm" disabled={!hasMore} onClick={() => gotoPage(currentPage + 1)}>
                Berikutnya
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  return createPortal(content, document.body);
};

export default DrillDownModal;