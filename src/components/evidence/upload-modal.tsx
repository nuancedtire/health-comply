import { useState } from "react";
import { uploadEvidenceFn } from "@/core/functions/upload";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, X, File as FileIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@tanstack/react-router";

// Mock Data for now (should fetch from DB/Seed data ideally)
const QUALITY_STATEMENTS = [
    { id: 'safe.safeguarding', title: 'Safe: Safeguarding' },
    { id: 'safe.infection_prevention_and_control', title: 'Safe: Infection Control' },
    { id: 'effective.assessing_needs', title: 'Effective: Assessing Needs' },
    { id: 'well_led.governance_management_sustainability', title: 'Well-led: Governance' },
];

const CATEGORIES = [
    { id: 'peoples_experience', title: "People's Experience" },
    { id: 'staff_feedback', title: 'Staff Feedback' },
    { id: 'processes', title: 'Processes' },
    { id: 'outcomes', title: 'Outcomes' },
];

export function UploadModal({ siteId }: { siteId: string }) {
    const [open, setOpen] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [qsId, setQsId] = useState("");
    const [categoryId, setCategoryId] = useState("");
    const [uploading, setUploading] = useState(false);
    const router = useRouter();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!file) {
            toast.error("Please select a file");
            return;
        }

        setUploading(true);
        const formData = new FormData();
        formData.append("file", file);
        if (qsId) formData.append("qsId", qsId);
        if (categoryId) formData.append("categoryId", categoryId);
        formData.append("siteId", siteId);

        try {
            await uploadEvidenceFn({ data: formData });

            toast.success("File uploaded. AI is analyzing metadata...");
            setOpen(false);
            setFile(null);
            setQsId("");
            setCategoryId("");
            router.invalidate();
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setUploading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Evidence
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Upload Compliance Evidence</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-1 gap-2">
                        <Label>Quality Statement (Optional)</Label>
                        <Select value={qsId} onValueChange={(val) => setQsId(val === 'auto_detect' ? '' : val)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select QS..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="auto_detect">✨ Auto-Detect (AI)</SelectItem>
                                {QUALITY_STATEMENTS.map(qs => (
                                    <SelectItem key={qs.id} value={qs.id}>{qs.title}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                        <Label>Evidence Category (Optional)</Label>
                        <Select value={categoryId} onValueChange={(val) => setCategoryId(val === 'auto_detect' ? '' : val)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select Category..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="auto_detect">✨ Auto-Detect (AI)</SelectItem>
                                {CATEGORIES.map(c => (
                                    <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-muted/50 transition-colors relative">
                        <input
                            type="file"
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            onChange={handleFileChange}
                            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                        />
                        {file ? (
                            <div className="flex items-center gap-2 text-sm text-primary font-medium">
                                <FileIcon className="h-6 w-6" />
                                <span className="truncate max-w-[200px]">{file.name}</span>
                                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); setFile(null); }}>
                                    <X className="h-3 w-3" />
                                </Button>
                            </div>
                        ) : (
                            <>
                                <Upload className="h-8 w-8 text-muted-foreground" />
                                <p className="text-sm text-muted-foreground">Click or Drag to Upload</p>
                            </>
                        )}
                    </div>
                </div>
                <Button onClick={handleUpload} disabled={uploading}>
                    {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {uploading ? "Uploading..." : "Upload"}
                </Button>
            </DialogContent>
        </Dialog>
    );
}
