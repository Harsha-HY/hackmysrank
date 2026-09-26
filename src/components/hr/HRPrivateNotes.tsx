import { useEffect, useState, useCallback } from "react";
import { Lock, Pencil, Trash2, Download, Search, Save, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
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

interface Note {
  id: string;
  note_text: string;
  created_by: string;
  created_by_name: string | null;
  created_at: string;
}

interface Props {
  candidateId: string;
  applicationId?: string | null;
  candidateName?: string;
}

export const HRPrivateNotes = ({ candidateId, applicationId, candidateName }: Props) => {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [me, setMe] = useState<{ id: string; name: string } | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        setAllowed(false);
        return;
      }
      const { data: u } = await supabase
        .from("users")
        .select("id, user_id, full_name, role")
        .eq("user_id", auth.user.id)
        .maybeSingle();
      const ok = !!u && ["owner", "superadmin", "hr", "manager"].includes((u as any).role);
      setAllowed(ok);
      if (ok) setMe({ id: auth.user.id, name: (u as any).full_name || auth.user.email || "HR" });
    })();
  }, []);

  const load = useCallback(async () => {
    if (!candidateId) return;
    const { data, error } = await supabase
      .from("candidate_notes" as any)
      .select("id, note_text, created_by, created_by_name, created_at")
      .eq("candidate_id", candidateId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false });
    if (error) return;
    setNotes((data as any) || []);
  }, [candidateId]);

  useEffect(() => {
    if (allowed) load();
  }, [allowed, load]);

  if (allowed === null) return null;
  if (!allowed) return null;

  const addNote = async () => {
    const text = draft.trim();
    if (!text || !me) return;
    if (text.length > 1000) {
      toast.error("Note exceeds 1000 characters");
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("candidate_notes" as any).insert({
      candidate_id: candidateId,
      application_id: applicationId || null,
      note_text: text,
      created_by: me.id,
      created_by_name: me.name,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setDraft("");
    toast.success("Note saved privately.");
    load();
  };

  const saveEdit = async (id: string) => {
    const text = editText.trim();
    if (!text) return;
    if (text.length > 1000) {
      toast.error("Note exceeds 1000 characters");
      return;
    }
    const { error } = await supabase
      .from("candidate_notes" as any)
      .update({ note_text: text })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setEditingId(null);
    setEditText("");
    toast.success("Note updated.");
    load();
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase
      .from("candidate_notes" as any)
      .update({ is_deleted: true })
      .eq("id", deleteId);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Note deleted.");
      load();
    }
    setDeleteId(null);
  };

  const exportNotes = () => {
    const safe = (candidateName || "Candidate").replace(/[^a-z0-9_-]+/gi, "_");
    const lines = notes.map(
      (n) =>
        `[${new Date(n.created_at).toLocaleString()}] ${n.created_by_name || "HR"}\n${n.note_text}\n`
    );
    const content = `Private Notes — ${candidateName || ""}\nExported: ${new Date().toLocaleString()}\n\n${lines.join("\n----\n")}`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${safe}_Notes.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = search.trim()
    ? notes.filter((n) => n.note_text.toLowerCase().includes(search.toLowerCase()))
    : notes;

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-primary" />
            <h4 className="text-sm font-semibold text-foreground">Private Notes</h4>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Only visible to HR, Hiring Manager, Admin & Owner. Candidates cannot see these notes.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={exportNotes}
          disabled={notes.length === 0}
          className="h-7 text-xs"
        >
          <Download className="h-3 w-3 mr-1" /> Export
        </Button>
      </div>

      <div className="space-y-2">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, 1000))}
          placeholder="Add a private note about this candidate..."
          className="min-h-[80px] text-sm"
          maxLength={1000}
        />
        <div className="flex items-center justify-between">
          <div className="text-[11px] text-muted-foreground">
            {new Date().toLocaleString()} · {draft.length}/1000
          </div>
          <Button
            type="button"
            size="sm"
            onClick={addNote}
            disabled={loading || !draft.trim()}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            Add Note
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search notes..."
          className="pl-8 h-8 text-xs"
        />
      </div>

      <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
        {filtered.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-3">
            {notes.length === 0 ? "No notes yet." : "No notes match your search."}
          </p>
        )}
        {filtered.map((n) => (
          <div key={n.id} className="rounded-lg bg-muted/50 border border-border p-3">
            {editingId === n.id ? (
              <div className="space-y-2">
                <Textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value.slice(0, 1000))}
                  className="min-h-[70px] text-sm"
                  maxLength={1000}
                />
                <div className="flex gap-2 justify-end">
                  <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="h-7">
                    <X className="h-3 w-3 mr-1" /> Cancel
                  </Button>
                  <Button size="sm" onClick={() => saveEdit(n.id)} className="h-7 bg-green-600 hover:bg-green-700 text-white">
                    <Save className="h-3 w-3 mr-1" /> Save Edit
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm text-foreground whitespace-pre-wrap flex-1">{n.note_text}</p>
                  <div className="flex gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(n.id);
                        setEditText(n.note_text);
                      }}
                      className="p-1 rounded hover:bg-background text-muted-foreground hover:text-foreground"
                      title="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteId(n.id)}
                      className="p-1 rounded hover:bg-background text-muted-foreground hover:text-destructive"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1.5">
                  Added by: {n.created_by_name || "HR"}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {new Date(n.created_at).toLocaleString()}
                </p>
              </>
            )}
          </div>
        ))}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this note?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Confirm Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
