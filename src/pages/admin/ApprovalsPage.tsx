import { useEffect, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/common/use-toast";
import { useRole } from "@/contexts/RoleContext";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { CheckCircle, XCircle, Clock, Search, ShieldCheck, Loader2, Eye } from "lucide-react";
import api from "@/lib/api";
import { useNavigate } from "react-router-dom";

interface ApprovalRequest {
  id: number;
  requester: { id: number; name: string; email: string };
  type: string;
  payload: { questionnaire_id?: number; title?: string };
  status: "pending" | "approved" | "rejected";
  note: string | null;
  created_at: string;
  resolved_at: string | null;
}

const typeLabels: Record<string, string> = {
  add_questionnaire: "Tambah Kuesioner",
  delete_questionnaire: "Hapus Kuesioner",
};

const ApprovalsPage = () => {
  const { toast } = useToast();
  const { currentRole } = useRole();
  const navigate = useNavigate();
  const isHeadTracer = currentRole === "head_tracer";

  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);
  const [note, setNote] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchApprovals = async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get("/approvals");
      if (data.success) setRequests(data.data);
    } catch {
      toast({ title: "Gagal", description: "Tidak dapat memuat data approval.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchApprovals(); }, []);

  const filtered = requests.filter((r) => {
    const matchSearch = (r.payload?.title ?? "").toLowerCase().includes(search.toLowerCase()) || r.requester.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || r.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  const handleAction = async (action: "approve" | "reject") => {
    if (!selectedRequest) return;
    setActionLoading(true);
    try {
      const { data } = await api.post(`/approvals/${selectedRequest.id}/${action}`, { note });
      if (data.success) {
        toast({ title: action === "approve" ? "Disetujui" : "Ditolak", description: data.message });
        fetchApprovals();
      }
    } catch {
      toast({ title: "Gagal", description: "Terjadi kesalahan.", variant: "destructive" });
    } finally {
      setActionLoading(false);
      setSelectedRequest(null);
      setNote("");
    }
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
          <h1 className="text-2xl font-bold flex items-center gap-2"><ShieldCheck className="h-6 w-6" /> {isHeadTracer ? "Approval Request" : "Riwayat Pengajuan"}</h1>
          <p className="text-muted-foreground">{isHeadTracer ? "Kelola permintaan dari Tim Tracer (tambah/hapus kuesioner)" : "Riwayat pengajuan tambah/hapus kuesioner Anda"}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Pending</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-orange-500">{pendingCount}</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Approved</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-green-500">{requests.filter((r) => r.status === "approved").length}</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Rejected</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-red-500">{requests.filter((r) => r.status === "rejected").length}</p></CardContent></Card>
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
                {isLoading && (
                  <TableRow><TableCell colSpan={6} className="py-10 text-center"><Loader2 className="inline w-5 h-5 animate-spin" /> Memuat...</TableCell></TableRow>
                )}
                {!isLoading && filtered.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">Tidak ada request.</TableCell></TableRow>
                )}
                {!isLoading && filtered.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell className="font-medium">{req.requester.name}</TableCell>
                    <TableCell><Badge variant="outline">{typeLabels[req.type] ?? req.type}</Badge></TableCell>
                    <TableCell>{req.payload?.title ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{new Date(req.created_at).toLocaleDateString("id-ID")}</TableCell>
                    <TableCell>{statusBadge(req.status)}</TableCell>
                    <TableCell className="text-right">
                      {req.status === "pending" && isHeadTracer ? (
                        <div className="flex items-center justify-end gap-2">
                          {req.payload?.questionnaire_id && (
                            <Button size="sm" variant="outline" onClick={() => navigate(`/dashboard/form-management/${req.payload.questionnaire_id}/preview`)}>
                              <Eye className="h-4 w-4 mr-1" />Lihat
                            </Button>
                          )}
                          <Button size="sm" onClick={() => { setSelectedRequest(req); setNote(""); }}>Review</Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">{req.note || (req.status === "pending" ? "Menunggu approval" : "")}</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
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
                <div><span className="text-muted-foreground">Requester:</span> {selectedRequest.requester.name}</div>
                <div><span className="text-muted-foreground">Tipe:</span> {typeLabels[selectedRequest.type] ?? selectedRequest.type}</div>
                <div className="col-span-2"><span className="text-muted-foreground">Judul:</span> {selectedRequest.payload?.title ?? "—"}</div>
              </div>
              {selectedRequest.payload?.questionnaire_id && (
                <Button variant="outline" className="w-full" onClick={() => { setSelectedRequest(null); navigate(`/dashboard/form-management/${selectedRequest.payload.questionnaire_id}/preview`); }}>
                  <Eye className="h-4 w-4 mr-2" />Lihat Isi Kuesioner
                </Button>
              )}
              <div><Label>Catatan (opsional)</Label><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Tambahkan catatan..." /></div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSelectedRequest(null)}>Batal</Button>
            <Button variant="destructive" disabled={actionLoading} onClick={() => handleAction("reject")}><XCircle className="h-4 w-4 mr-1" />Tolak</Button>
            <Button disabled={actionLoading} onClick={() => handleAction("approve")}><CheckCircle className="h-4 w-4 mr-1" />Setujui</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default ApprovalsPage;
