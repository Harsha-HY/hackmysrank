import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, BellRing, Mail, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

const TYPES = [
  { key: "new_application", label: "New application received", desc: "When a candidate applies to one of your jobs" },
  { key: "test_submitted", label: "Test submitted", desc: "When a candidate completes a test" },
  { key: "stage_changed", label: "Stage changed", desc: "When you advance to or out of a hiring stage" },
  { key: "message_received", label: "Message received", desc: "Chat messages from HR or candidates" },
  { key: "violation_detected", label: "Violation detected", desc: "Tab switching, copy-paste, or other proctoring alerts" },
  { key: "offer_accepted", label: "Offer accepted", desc: "When a candidate accepts an offer" },
] as const;

type Key = typeof TYPES[number]["key"];
type Prefs = Record<Key, { push: boolean; email: boolean }>;

const DEFAULT_PREFS: Prefs = TYPES.reduce((acc, t) => {
  acc[t.key] = { push: true, email: t.key === "stage_changed" || t.key === "violation_detected" || t.key === "offer_accepted" };
  return acc;
}, {} as Prefs);

export default function NotificationSettings() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }
      setUserId(user.id);
      const { data } = await supabase
        .from("user_notification_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        const next = { ...DEFAULT_PREFS };
        for (const t of TYPES) {
          next[t.key] = {
            push: (data as any)[`push_${t.key}`] ?? true,
            email: (data as any)[`email_${t.key}`] ?? false,
          };
        }
        setPrefs(next);
      }
      setLoading(false);
    })();
  }, [navigate]);

  const update = (key: Key, channel: "push" | "email", val: boolean) => {
    setPrefs((p) => ({ ...p, [key]: { ...p[key], [channel]: val } }));
  };

  const save = async () => {
    if (!userId) return;
    setSaving(true);
    const row: Record<string, any> = { user_id: userId };
    for (const t of TYPES) {
      row[`push_${t.key}`] = prefs[t.key].push;
      row[`email_${t.key}`] = prefs[t.key].email;
    }
    const { error } = await supabase
      .from("user_notification_preferences")
      .upsert(row as any, { onConflict: "user_id" });
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Preferences saved");
  };

  const requestBrowserPerm = async () => {
    if (!("Notification" in window)) return toast.error("Browser notifications not supported");
    const r = await Notification.requestPermission();
    if (r === "granted") toast.success("Browser notifications enabled");
    else toast.error("Permission denied");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /></Button>
          <h1 className="text-lg font-bold text-foreground flex-1">Notification preferences</h1>
          <Button size="sm" onClick={save} disabled={saving || loading}>
            <Save className="h-3.5 w-3.5 mr-1.5" /> {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <div className="rounded-xl border border-border bg-card p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Browser notifications</p>
            <p className="text-xs text-muted-foreground">Enable system pop-ups so alerts appear even when HireZap is in another tab.</p>
          </div>
          <Button size="sm" variant="outline" onClick={requestBrowserPerm}>
            <BellRing className="h-3.5 w-3.5 mr-1.5" /> Enable
          </Button>
        </div>

        <div className="rounded-xl border border-border bg-card">
          <div className="grid grid-cols-[1fr,80px,80px] items-center px-4 py-3 border-b border-border text-xs uppercase text-muted-foreground">
            <span>Type</span>
            <span className="text-center inline-flex items-center justify-center gap-1"><BellRing className="h-3 w-3" />In-app</span>
            <span className="text-center inline-flex items-center justify-center gap-1"><Mail className="h-3 w-3" />Email</span>
          </div>
          {loading ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">Loading…</div>
          ) : (
            TYPES.map((t) => (
              <div key={t.key} className="grid grid-cols-[1fr,80px,80px] items-center px-4 py-3 border-b border-border last:border-0">
                <div className="pr-3">
                  <p className="text-sm font-medium text-foreground">{t.label}</p>
                  <p className="text-xs text-muted-foreground">{t.desc}</p>
                </div>
                <div className="flex justify-center">
                  <Switch checked={prefs[t.key].push} onCheckedChange={(v) => update(t.key, "push", v)} />
                </div>
                <div className="flex justify-center">
                  <Switch checked={prefs[t.key].email} onCheckedChange={(v) => update(t.key, "email", v)} />
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
