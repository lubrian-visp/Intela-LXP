import { useState } from "react";
import { Bell, Plus, Eye, EyeOff, AlertTriangle, Info, Megaphone } from "lucide-react";
import { FadeIn } from "@/components/animations/MotionWrappers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAnnouncements, useCreateAnnouncement, useUpdateAnnouncement } from "@/hooks/useCollaboration";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const priorityConfig: Record<string, { icon: any; color: string; label: string }> = {
  low: { icon: Info, color: "text-muted-foreground", label: "Low" },
  normal: { icon: Bell, color: "text-foreground", label: "Normal" },
  high: { icon: AlertTriangle, color: "text-warning", label: "High" },
  urgent: { icon: Megaphone, color: "text-destructive", label: "Urgent" },
};

export default function AnnouncementsManager() {
  const { user, hasRole } = useAuth();
  const isStaff = hasRole("super_admin") || hasRole("programme_manager") || hasRole("facilitator") || hasRole("operations");
  const { data: announcements = [], isLoading } = useAnnouncements({ publishedOnly: !isStaff });
  const createAnnouncement = useCreateAnnouncement();
  const updateAnnouncement = useUpdateAnnouncement();

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [priority, setPriority] = useState("normal");

  const handleCreate = () => {
    if (!title.trim() || !body.trim() || !user?.id) return;
    createAnnouncement.mutate(
      {
        title, body, priority, author_id: user.id,
        is_published: true, published_at: new Date().toISOString(),
      },
      {
        onSuccess: () => {
          setOpen(false);
          setTitle("");
          setBody("");
          setPriority("normal");
          toast.success("Announcement published");
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      <FadeIn>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Announcements</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Stay up to date with the latest news</p>
          </div>
          {isStaff && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5"><Plus className="w-4 h-4" /> New Announcement</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Create Announcement</DialogTitle></DialogHeader>
                <div className="space-y-3 mt-2">
                  <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Announcement title…" />
                  <Textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Write your announcement…" rows={5} />
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low Priority</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High Priority</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={handleCreate} disabled={!title.trim() || !body.trim() || createAnnouncement.isPending} className="w-full">
                    Publish Announcement
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </FadeIn>

      <div className="space-y-4">
        {isLoading ? (
          <p className="text-center text-sm text-muted-foreground py-12">Loading announcements…</p>
        ) : announcements.length === 0 ? (
          <div className="text-center py-16">
            <Bell className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No announcements yet</p>
          </div>
        ) : (
          announcements.map((ann: any) => {
            const config = priorityConfig[ann.priority] || priorityConfig.normal;
            const Icon = config.icon;
            return (
              <FadeIn key={ann.id}>
                <div className={cn(
                  "bg-card rounded-xl border p-5",
                  ann.priority === "urgent" ? "border-destructive/30 bg-destructive/5" :
                  ann.priority === "high" ? "border-warning/30 bg-warning/5" :
                  "border-border/50"
                )}>
                  <div className="flex items-start gap-3">
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                      ann.priority === "urgent" ? "bg-destructive/10" :
                      ann.priority === "high" ? "bg-warning/10" : "bg-primary/10"
                    )}>
                      <Icon className={cn("w-4 h-4", config.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-foreground">{ann.title}</h3>
                        <Badge variant="outline" className="text-[9px]">{config.label}</Badge>
                        {!ann.is_published && <Badge variant="secondary" className="text-[9px]">Draft</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{ann.body}</p>
                      <p className="text-[10px] text-muted-foreground mt-2">
                        {ann.published_at ? format(new Date(ann.published_at), "MMM dd, yyyy 'at' HH:mm") : "Not published"}
                      </p>
                    </div>
                    {isStaff && (
                      <Button
                        size="sm" variant="ghost"
                        onClick={() => updateAnnouncement.mutate({ id: ann.id, is_published: !ann.is_published })}
                      >
                        {ann.is_published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    )}
                  </div>
                </div>
              </FadeIn>
            );
          })
        )}
      </div>
    </div>
  );
}
