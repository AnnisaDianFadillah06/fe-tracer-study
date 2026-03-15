import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, Search, ChevronLeft, ChevronRight, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Student } from "@/lib/mockData";

interface ColumnDef {
  key: string;
  label: string;
  render?: (value: any, student: Student) => React.ReactNode;
}

interface StudentDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: React.ReactNode;
  students: Student[];
  columns: ColumnDef[];
}

const defaultColumns: ColumnDef[] = [
  { key: "nama", label: "Nama" },
  { key: "nim", label: "NIM" },
  { key: "prodi", label: "Program Studi" },
  { key: "jenjang", label: "Jenjang" },
  { key: "tahunLulus", label: "Tahun Lulus" },
];

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const StudentDataModal = ({
  isOpen,
  onClose,
  title,
  subtitle,
  students,
  columns,
}: StudentDataModalProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Reset page when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentPage(1);
      setSearchTerm("");
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "auto";
    };
  }, [isOpen, onClose]);

  const allColumns = [...defaultColumns, ...columns.filter(c => !defaultColumns.find(d => d.key === c.key))];

  const filteredStudents = students.filter(s =>
    s.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.nim.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.prodi.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const paginatedStudents = filteredStudents.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleExportCSV = () => {
    const headers = allColumns.map(c => c.label).join(",");
    const rows = filteredStudents.map(s =>
      allColumns.map(c => {
        const value = s[c.key as keyof Student];
        if (c.key === "gaji") return formatCurrency(value as number);
        return value;
      }).join(",")
    ).join("\n");
    
    const csv = `${headers}\n${rows}`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `data-mahasiswa-${title.toLowerCase().replace(/\s+/g, "-")}.csv`;
    a.click();
  };

  const handleExportExcel = () => {
    const headers = allColumns.map(c => `<Cell><Data ss:Type="String">${c.label}</Data></Cell>`).join("");
    const rows = filteredStudents.map(s =>
      `<Row>${allColumns.map(c => {
        const value = s[c.key as keyof Student];
        const type = typeof value === "number" ? "Number" : "String";
        const displayValue = c.key === "gaji" ? value : value;
        return `<Cell><Data ss:Type="${type}">${displayValue}</Data></Cell>`;
      }).join("")}</Row>`
    ).join("");
    
    const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Worksheet ss:Name="Data Mahasiswa">
<Table>
<Row>${headers}</Row>
${rows}
</Table>
</Worksheet>
</Workbook>`;
    
    const blob = new Blob([xml], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `data-mahasiswa-${title.toLowerCase().replace(/\s+/g, "-")}.xls`;
    a.click();
  };

  if (!isOpen) return null;

  const modalContent = (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
        style={{ backgroundColor: "rgba(0, 0, 0, 0.9)" }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 50 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="w-full h-full max-w-[1800px] max-h-[95vh] bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 md:p-6 border-b border-border bg-card/50 backdrop-blur shrink-0">
            <div>
              <h2 className="font-heading text-xl md:text-2xl font-bold">{title}</h2>
              {subtitle && (
                typeof subtitle === "string" 
                  ? <p className="text-sm text-muted-foreground">{subtitle}</p>
                  : subtitle
              )}
            </div>
            <div className="flex items-center gap-2 md:gap-3">
              <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-2 hidden sm:flex">
                <Download className="w-4 h-4" />
                CSV
              </Button>
              <Button variant="default" size="sm" onClick={handleExportExcel} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                <FileSpreadsheet className="w-4 h-4" />
                <span className="hidden sm:inline">Excel</span>
              </Button>
              <Button variant="ghost" size="icon" onClick={onClose} className="ml-2">
                <X className="w-6 h-6" />
              </Button>
            </div>
          </div>

          {/* Search & Info */}
          <div className="p-4 border-b border-border flex flex-col sm:flex-row items-center justify-between gap-4 bg-secondary/20 shrink-0">
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama, NIM, atau prodi..."
                value={searchTerm}
                onChange={e => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10 bg-background/50 border-border"
              />
            </div>
            <span className="text-sm text-muted-foreground font-medium whitespace-nowrap">
              Total: <span className="text-foreground">{filteredStudents.length}</span> data
            </span>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto min-h-0">
            <table className="w-full">
              <thead className="bg-secondary/50 sticky top-0 z-10">
                <tr>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider py-4 px-4 w-12">
                    No
                  </th>
                  {allColumns.map(col => (
                    <th key={col.key} className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider py-4 px-4 whitespace-nowrap">
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedStudents.map((student, idx) => (
                  <tr key={student.id} className="border-t border-border/30 hover:bg-secondary/30 transition-colors">
                    <td className="py-3 px-4 text-sm text-muted-foreground">
                      {(currentPage - 1) * itemsPerPage + idx + 1}
                    </td>
                    {allColumns.map(col => (
                      <td key={col.key} className="py-3 px-4 text-sm whitespace-nowrap">
                        {col.render
                          ? col.render(student[col.key as keyof Student], student)
                          : col.key === "gaji"
                          ? formatCurrency(student.gaji)
                          : String(student[col.key as keyof Student] ?? "-")}
                      </td>
                    ))}
                  </tr>
                ))}
                {paginatedStudents.length === 0 && (
                  <tr>
                    <td colSpan={allColumns.length + 1} className="py-16 text-center text-muted-foreground">
                      <div className="text-4xl mb-2">📭</div>
                      Tidak ada data yang ditemukan
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 bg-card/50 backdrop-blur shrink-0">
            <span className="text-sm text-muted-foreground">
              Halaman <span className="font-medium text-foreground">{currentPage}</span> dari{" "}
              <span className="font-medium text-foreground">{totalPages || 1}</span>
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
              >
                Awal
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="hidden sm:flex gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let page = i + 1;
                  if (totalPages > 5) {
                    if (currentPage > 3) {
                      page = currentPage - 2 + i;
                    }
                    if (page > totalPages) page = totalPages - 4 + i;
                  }
                  return (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      className="w-10"
                    >
                      {page}
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages || totalPages === 0}
              >
                Akhir
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  // Use portal to render at document body level
  return createPortal(modalContent, document.body);
};

export default StudentDataModal;
