import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Bell, ArrowLeft, CheckCheck, Trash2, MessageSquare, AlertTriangle, FileCheck, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

interface NotifRow {
  id: string;
  user_id: string;
  title: string;
  message: string | null;
  read: boolean;
  created_at: string;
  type: string | null;
  category: string | null;
  link: string | null;
}

const TABS = ["All", "Unread", "Applications", "Tests", "Messages", "Alerts"] as const;
type Tab = typeof TABS[number];

const CATEGORY_MAP: Record<Tab, string | null> = {
  All: null,
  Unread: null,
  Applications: "application",
  Tests: "test",
  Messages: "message",
  Alerts: "alert",
};

function timeAgo(ts: string) {
  const diff = (Date.now() - new Date(ts).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 7 * 86400) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(ts).toLocaleDateString();
}

function classifyType(n: NotifRow): { color: string; icon: typeof Bell } {
  const t = (n.type || n.category || "").toLowerCase();
  const title = (n.title || "").toLowerCase();
  if (t === "stage" || /shortlist|advance|moved|selected|offer/.test(title))
    return { color: "text-emerald-500 bg-emerald-500/10", icon: FileCheck };
  if (t === "message" || /message|chat/.test(title))
    return { color: "text-blue-500 bg-blue-500/10", icon: MessageSquare };
  if (t === "test" || /test|aptitude|technical|video/.test(title))
    return { color: "text-amber-500 bg-amber-500/10", icon: ClipboardList };
  if (t === "alert" || /violation|warning|tab|copy/.test(title))
    return { color: "text-red-500 bg-red-500/10", icon: AlertTriangle };
  return { color: "text-primary bg-primary/10", icon: Bell };
}

export default function NotificationsCenter() {
  const navigate = useNavigate();
  const [items, setItems] = useState<NotifRow[]>([]);
  const [tab, setTab] = useState<Tab>("All");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }

      const { data: appUser } = await supabase
        .from("users")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      const ownerId = appUser?.id || user.id;
      if (!mounted) return;
      setUserId(ownerId);

      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", ownerId)
        .order("created_at", { ascending: false })
        .limit(200);
      setItems((data || []) as NotifRow[]);
      setLoading(false);

      // Ask for browser permission once
      if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission().catch(() => {});
      }

      channel = supabase
        .channel(`notif-center-${ownerId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${ownerId}` },
          (payload) => {
            const n = payload.new as NotifRow;
            setItems((prev) => [n, ...prev]);
            if ("Notification" in window && Notification.permission === "granted") {
              try {
                new Notification(n.title || "HireZap", { body: n.message || "", icon: "/favicon.png" });
              } catch { /* noop */ }
            }
          }
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${ownerId}` },
          (payload) => {
            const n = payload.new as NotifRow;
            setItems((prev) => prev.map((item) => item.id === n.id ? n : item));
          }
        )
        .on(
          "postgres_changes",
          { event: "DELETE", schema: "public", table: "notifications", filter: `user_id=eq.${ownerId}` },
          (payload) => {
            const oldId = (payload.old as Partial<NotifRow>).id;
            if (oldId) setItems((prev) => prev.filter((item) => item.id !== oldId));
          }
        )
        .subscribe();
    })();

    return () => {
      mounted = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, [navigate]);

  const filtered = useMemo(() => {
    if (tab === "All") return items;
    if (tab === "Unread") return items.filter((n) => !n.read);
    const cat = CATEGORY_MAP[tab];
    if (!cat) return items;
    return items.filter((n) => {
      const t = (n.type || n.category || "").toLowerCase();
      if (t === cat) return true;
      // Fallback heuristic on title
      const title = (n.title || "").toLowerCase();
      if (cat === "application") return /application|shortlist|stage|offer|selected|rejected|advance/.test(title);
      if (cat === "test") return /test|aptitude|technical|video|assessment/.test(title);
      if (cat === "message") return /message|chat/.test(title);
      if (cat === "alert") return /violation|warning|alert|copy|tab/.test(title);
      return false;
    });
  }, [items, tab]);

  const toggle = (id: string) => {
    setSelected((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };
  const selectAll = () => setSelected(new Set(filtered.map((n) => n.id)));
  const clearSel = () => setSelected(new Set());

  const markRead = async (ids: string[]) => {
    if (!ids.length) return;
    await supabase.from("notifications").update({ read: true }).in("id", ids);
    setItems((prev) => prev.map((n) => (ids.includes(n.id) ? { ...n, read: true } : n)));
    clearSel();
  };

  const remove = async (ids: string[]) => {
    if (!ids.length) return;
    await supabase.from("notifications").delete().in("id", ids);
    setItems((prev) => prev.filter((n) => !ids.includes(n.id)));
    clearSel();
    toast.success(`Deleted ${ids.length} notification${ids.length === 1 ? "" : "s"}`);
  };

  const openItem = async (n: NotifRow) => {
    if (!n.read) await markRead([n.id]);
    if (n.link) navigate(n.link);
  };

  const unreadCount = items.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /></Button>
          <Bell className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-bold text-foreground flex-1">Notifications</h1>
          {unreadCount > 0 && (
            <Button size="sm" variant="outline" onClick={() => markRead(items.filter((n) => !n.read).map((n) => n.id))}>
              <CheckCheck className="h-3.5 w-3.5 mr-1.5" /> Mark all read
            </Button>
          )}
        </div>
        <div className="max-w-4xl mx-auto px-4 pb-3 flex gap-2 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); clearSel(); }}
              className={`text-sm px-3 py-1.5 rounded-full border whitespace-nowrap transition ${
                tab === t ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:text-foreground"
              }`}
            >
              {t}{t === "Unread" && unreadCount > 0 ? ` (${unreadCount})` : ""}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
          <span className="text-sm text-muted-foreground flex-1">{selected.size > 0 ? `${selected.size} selected` : `${filtered.length} shown`}</span>
          <Button size="sm" variant="outline" onClick={selectAll}>Select all</Button>
          {selected.size > 0 && (
            <>
              <Button size="sm" variant="outline" onClick={() => markRead([...selected])}>
              <CheckCheck className="h-3.5 w-3.5 mr-1.5" /> Mark read
              </Button>
              <Button size="sm" variant="destructive" onClick={() => remove([...selected])}>
              <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete
              </Button>
            </>
          )}
        </div>

        {loading ? (
          <div className="text-center py-20 text-muted-foreground">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">No notifications.</div>
        ) : (
          <ul className="space-y-2">
            {filtered.map((n) => {
              const meta = classifyType(n);
              const Icon = meta.icon;
              const isSel = selected.has(n.id);
              return (
                <li
                  key={n.id}
                  className={`group flex items-start gap-3 rounded-xl border border-border p-4 transition ${
                    !n.read ? "bg-primary/5" : "bg-card"
                  } ${isSel ? "ring-2 ring-primary" : ""}`}
                >
                  <Checkbox checked={isSel} onCheckedChange={() => toggle(n.id)} className="mt-1" />
                  <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${meta.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <button onClick={() => openItem(n)} className="flex-1 text-left min-w-0">
                    <div className="flex items-start gap-2">
                      <p className="text-sm font-semibold text-foreground flex-1 truncate">{n.title}</p>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{timeAgo(n.created_at)}</span>
                    </div>
                    {n.message && <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>}
                  </button>
                  <button onClick={() => remove([n.id])} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive p-1 transition">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
