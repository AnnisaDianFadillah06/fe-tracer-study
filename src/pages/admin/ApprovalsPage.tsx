import { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/common/use-toast";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { CheckCircle, XCircle, Clock, Search, ShieldCheck } from "lucide-react";

interface ApprovalRequest {
  id: string;
  requester: string;
  type: "add_questionnaire" | "delete_questionnaire";
  title: string;
  description: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  resolvedAt?: string;
  note?: string;
}

const typeLabels: Record<string, string> = {
  add_questionnaire: "Tambah Kuesioner",
  delete_questionnaire: "Hapus Kuesioner",
};

const initialRequests: ApprovalRequest[] = [
  { id: "1", requester: "Tim Tracer 1", type: "add_questionnaire", title: "Kuesioner Kepuasan Kerja 2026", description: "Kuesioner baru untuk mengukur kepuasan kerja alumni tahun 2026", status: "pending", createdAt: "2026-05-15" },
  { id: "2", requester: "Tim Tracer 2", type: "delete_questionnaire", title: "Kuesioner Lama 2024", description: "Kuesioner sudah tidak relevan, data sudah diarsipkan", status: "pending", createdAt: "2026-05-16" },
  { id: "3", requester: "Tim Tracer 3", type: "add_questionnaire", title: "Survey Kompetensi Digital", description: "Survey tambahan untuk mengukur kompetensi digital alumni", status: "approved", createdAt: "2026-05-10", resolvedAt: "2026-05-12", note: "Disetujui, silakan publish." },
  { id: "4", requester: "Tim Tracer 1", type: "delete_questionnaire", title: "Form Test ABC", description: "Form testing yang tidak sengaja dipublish", status: "rejected", createdAt: "2026-05-08", resolvedAt: "2026-05-09", note: "Masih ada responden aktif." },
];

const ApprovalsPage = () => {
  const { toast } = useToast();
  const [requests, setRequests] = useState<ApprovalRequest[]>(initialRequests);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);
  const [note, setNote] = useState("");

  const filtered = requests.filter((r) => {
    const matchSearch = r.title.toLowerCase().includes(search.toLowerCase()) || r.requester.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || r.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  const handleAction = (action: "approved" | "rejected") => {
    if (!selectedRequest) return;
    setRequests(requests.map((r) =>
      r.id === selectedRequest.id ? { ...r, status: action, resolvedAt: new Date().toISOString().split("T")[0], note } : r
    ));
    setSelectedRequest(null);
    setNote("");
    toast({
      title: action === "approved" ? "Disetujui" : "Ditolak",
      description: `Request "${selectedRequest.title}" telah ${action === "approved" ? "disetujui" : "ditolak"}.`,
    });
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "pending": return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" />Pending</Badge>;
      case "approved": return <Badge variant="default" className="gap-1"><CheckCircle className="h-3 w-3" />Approved</Badge>;
      case "rejected": return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Rejected</Badge>;
      default: return null;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><ShieldCheck className="h-6 w-6" /> Approval Request</h1>
          <p className="text-muted-foreground">Kelola permintaan dari Tim Tracer (tambah/hapus kuesioner)</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Pending</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold text-orange-500">{pendingCount}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Approved</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold text-green-500">{requests.filter((r) => r.status === "approved").length}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Rejected</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold text-red-500">{requests.filter((r) => r.status === "rejected").length}</p></CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Cari judul atau requester..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Requester</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead>Judul</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell className="font-medium">{req.requester}</TableCell>
                    <TableCell><Badge variant="outline">{typeLabels[req.type]}</Badge></TableCell>
                    <TableCell>{req.title}</TableCell>
                    <TableCell className="text-muted-foreground">{req.createdAt}</TableCell>
                    <TableCell>{statusBadge(req.status)}</TableCell>
                    <TableCell className="text-right">
                      {req.status === "pending" ? (
                        <Button size="sm" onClick={() => { setSelectedRequest(req); setNote(""); }}>Review</Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">{req.note}</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Tidak ada request.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Review Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Review Request</DialogTitle></DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Requester:</span> {selectedRequest.requester}</div>
                <div><span className="text-muted-foreground">Tipe:</span> {typeLabels[selectedRequest.type]}</div>
                <div className="col-span-2"><span className="text-muted-foreground">Judul:</span> {selectedRequest.title}</div>
              </div>
              <div className="p-3 bg-muted rounded-md text-sm">{selectedRequest.description}</div>
              <div><Label>Catatan (opsional)</Label><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Tambahkan catatan..." /></div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSelectedRequest(null)}>Batal</Button>
            <Button variant="destructive" onClick={() => handleAction("rejected")}><XCircle className="h-4 w-4 mr-1" />Tolak</Button>
            <Button onClick={() => handleAction("approved")}><CheckCircle className="h-4 w-4 mr-1" />Setujui</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default ApprovalsPage;
