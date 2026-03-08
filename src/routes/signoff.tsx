import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { MainLayout } from "@/components/main-layout";
import {
  useSuspenseQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  getEvidenceForReviewFn,
  getEvidenceForSiteFn,
  updateEvidenceFn,
} from "@/core/functions/evidence";
import { useSite } from "@/components/site-context";
import { useState } from "react";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { toast } from "sonner";
import {
  CheckCircle,
  XCircle,
  Eye,
  FileText,
  Clock,
  User,
  AlertTriangle,
  Building2,
  ArrowRight,
} from "lucide-react";

export const Route = createFileRoute("/signoff")({
  beforeLoad: ({ context }) => {
    if (!context.user) {
      throw redirect({ to: "/login" });
    }
  },
  head: () => ({
    meta: [{ title: "Document Sign-off" }],
  }),
  component: SignoffPage,
});

function SignoffPage() {
  const { activeSite, sites, isLoading: isSiteLoading } = useSite();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  if (!isSiteLoading && sites.length === 0) {
    return (
      <MainLayout title="Document Sign-off">
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <Building2 className="w-10 h-10 text-primary" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">No Site Set Up Yet</h2>
              <p className="text-muted-foreground">
                You need to create a site before you can review and sign off documents.
              </p>
            </div>
            <Button size="lg" className="w-full" onClick={() => navigate({ to: '/create-site' })}>
              Create Your First Site
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  const [selectedEvidence, setSelectedEvidence] = useState<any>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);

  // Fetch evidence pending review that the current user is authorized to review
  const { data: pendingEvidence } = useSuspenseQuery({
    queryKey: ["evidence-for-review", activeSite?.id],
    queryFn: async () => {
      if (!activeSite?.id) return [];
      return await getEvidenceForReviewFn({ data: { siteId: activeSite.id } });
    },
  });

  // Fetch all evidence for the recently reviewed section
  const { data: allEvidence } = useSuspenseQuery({
    queryKey: ["evidence", activeSite?.id],
    queryFn: async () => {
      if (!activeSite?.id) return [];
      return await getEvidenceForSiteFn({ data: { siteId: activeSite.id } });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (evidenceId: string) => {
      await updateEvidenceFn({
        data: {
          evidenceId,
          updates: {
            status: "approved",
            reviewNotes: reviewNotes || undefined,
          },
        },
      });
    },
    onSuccess: () => {
      toast.success("Evidence approved successfully");
      queryClient.invalidateQueries({ queryKey: ["evidence"] });
      queryClient.invalidateQueries({ queryKey: ["evidence-for-review"] });
      queryClient.invalidateQueries({ queryKey: ["checklist-data"] });
      setSelectedEvidence(null);
      setApproveDialogOpen(false);
      setReviewNotes("");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to approve evidence");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (evidenceId: string) => {
      if (!reviewNotes.trim()) {
        throw new Error("Please provide a reason for rejection");
      }
      await updateEvidenceFn({
        data: {
          evidenceId,
          updates: {
            status: "rejected",
            reviewNotes,
          },
        },
      });
    },
    onSuccess: () => {
      toast.success("Evidence rejected");
      queryClient.invalidateQueries({ queryKey: ["evidence"] });
      queryClient.invalidateQueries({ queryKey: ["evidence-for-review"] });
      setSelectedEvidence(null);
      setRejectDialogOpen(false);
      setReviewNotes("");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to reject evidence");
    },
  });

  if (isSiteLoading) {
    return (
      <MainLayout title="Sign-off">
        <div className="p-8">Loading...</div>
      </MainLayout>
    );
  }

  if (!activeSite) {
    return (
      <MainLayout title="Sign-off">
        <div className="p-8 text-center text-muted-foreground">
          Please select a site from the team switcher.
        </div>
      </MainLayout>
    );
  }

  // Pending evidence is already filtered by user role from the server
  const pendingReview = pendingEvidence || [];

  // Recently reviewed from all evidence
  const recentlyReviewed = (allEvidence || [])
    .filter((e) => e.status === "approved" || e.status === "rejected")
    .slice(0, 10);

  return (
    <MainLayout title="Document Sign-off">
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Document Sign-off
          </h2>
          <p className="text-muted-foreground">
            Review and approve evidence submissions for{" "}
            <span className="font-semibold">{activeSite.name}</span>
          </p>
        </div>

        {/* Pending Review Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-500" />
            <h3 className="text-lg font-semibold">Pending Review</h3>
            {pendingReview.length > 0 && (
              <Badge variant="secondary">{pendingReview.length}</Badge>
            )}
          </div>

          {pendingReview.length === 0 ? (
            <div className="rounded-lg border bg-muted/50 p-8 text-center">
              <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
              <p className="text-lg font-medium">All caught up!</p>
              <p className="text-muted-foreground">
                No documents pending review
              </p>
            </div>
          ) : (
            <div className="rounded-lg border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document</TableHead>
                    <TableHead>Control</TableHead>
                    <TableHead>Uploaded By</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Confidence</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingReview.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium truncate max-w-[200px]">
                            {item.title}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {item.localControl?.title ||
                            item.suggestedControl?.title ||
                            "Unassigned"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{item.uploaderName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(item.uploadedAt), "MMM d, yyyy")}
                        </span>
                      </TableCell>
                      <TableCell>
                        {item.aiConfidence ? (
                          <Badge
                            variant={
                              item.aiConfidence >= 80
                                ? "default"
                                : item.aiConfidence >= 50
                                  ? "secondary"
                                  : "destructive"
                            }
                          >
                            {item.aiConfidence}%
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedEvidence(item)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Review
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => {
                              setSelectedEvidence(item);
                              setApproveDialogOpen(true);
                            }}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              setSelectedEvidence(item);
                              setRejectDialogOpen(true);
                            }}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Recently Reviewed Section */}
        {recentlyReviewed.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Recently Reviewed</h3>
            <div className="rounded-lg border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reviewed</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentlyReviewed.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item.title}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            item.status === "approved"
                              ? "default"
                              : "destructive"
                          }
                          className={
                            item.status === "approved"
                              ? "bg-green-100 text-green-800 dark:bg-green-800/80 dark:text-green-200"
                              : ""
                          }
                        >
                          {item.status === "approved" ? (
                            <CheckCircle className="h-3 w-3 mr-1" />
                          ) : (
                            <XCircle className="h-3 w-3 mr-1" />
                          )}
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {item.reviewedAt
                          ? format(new Date(item.reviewedAt), "MMM d, yyyy")
                          : "-"}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-muted-foreground">
                        {item.reviewNotes || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>

      {/* Approve Confirmation Dialog */}
      <AlertDialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Evidence</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to approve "{selectedEvidence?.title}". This will
              mark the evidence as verified for compliance purposes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium">Notes (optional)</label>
            <Textarea
              placeholder="Add any notes about this approval..."
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setReviewNotes("")}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-green-600 hover:bg-green-700"
              onClick={() => approveMutation.mutate(selectedEvidence?.id)}
              disabled={approveMutation.isPending}
            >
              {approveMutation.isPending ? "Approving..." : "Approve"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Reject Evidence
            </DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting "{selectedEvidence?.title}".
              This will be sent back to the uploader for revision.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium">
              Reason for rejection <span className="text-destructive">*</span>
            </label>
            <Textarea
              placeholder="Explain why this evidence is being rejected..."
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              className="mt-2"
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectDialogOpen(false);
                setReviewNotes("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => rejectMutation.mutate(selectedEvidence?.id)}
              disabled={rejectMutation.isPending || !reviewNotes.trim()}
            >
              {rejectMutation.isPending ? "Rejecting..." : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog
        open={!!selectedEvidence && !approveDialogOpen && !rejectDialogOpen}
        onOpenChange={(open) => !open && setSelectedEvidence(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedEvidence?.title}</DialogTitle>
            <DialogDescription>
              Uploaded by {selectedEvidence?.uploaderName} on{" "}
              {selectedEvidence?.uploadedAt &&
                format(new Date(selectedEvidence.uploadedAt), "MMMM d, yyyy")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Summary */}
            {selectedEvidence?.summary && (
              <div>
                <h4 className="text-sm font-medium mb-2">AI Summary</h4>
                <p className="text-sm text-muted-foreground bg-muted p-3 rounded">
                  {selectedEvidence.summary}
                </p>
              </div>
            )}

            {/* Control Assignment */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium mb-1">Assigned Control</h4>
                <p className="text-sm text-muted-foreground">
                  {selectedEvidence?.localControl?.title || "Not assigned"}
                </p>
              </div>
              <div>
                <h4 className="text-sm font-medium mb-1">Quality Statement</h4>
                <p className="text-sm text-muted-foreground">
                  {selectedEvidence?.qs?.title || selectedEvidence?.qsId}
                </p>
              </div>
            </div>

            {/* Text Content Preview */}
            {selectedEvidence?.textContent && (
              <div>
                <h4 className="text-sm font-medium mb-2">Document Content</h4>
                <div className="text-sm text-muted-foreground bg-muted p-3 rounded max-h-[200px] overflow-y-auto whitespace-pre-wrap">
                  {selectedEvidence.textContent.substring(0, 1000)}
                  {selectedEvidence.textContent.length > 1000 && "..."}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedEvidence(null)}>
              Close
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={() => setApproveDialogOpen(true)}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Approve
            </Button>
            <Button
              variant="destructive"
              onClick={() => setRejectDialogOpen(true)}
            >
              <XCircle className="h-4 w-4 mr-1" />
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
