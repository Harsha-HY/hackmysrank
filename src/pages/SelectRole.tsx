import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Building2, User, Check } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import BrandLogo from "@/components/BrandLogo";
import { Loader2 } from "@/components/BrandLoader";

const Logo = () => (
  <BrandLogo inverse className="justify-center" markClassName="h-12 w-12" textClassName="text-3xl" />
);

const SelectRole = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [saving, setSaving] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
        return;
      }
      const { data: row } = await supabase
        .from("users").select("role").eq("user_id", session.user.id).maybeSingle();
      if (row?.role && row.role !== "candidate") {
        const map: Record<string, string> = {
          owner: "/owner-dashboard", superadmin: "/admin-dashboard",
          hr: "/hr-dashboard", manager: "/manager-dashboard",
        };
        navigate(map[row.role] || "/candidate-dashboard");
        return;
      }
      setAuthReady(true);
    })();
  }, [navigate]);

  const choose = async (role: "hr" | "candidate") => {
    setSaving(role);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/login"); return; }

    // Ensure row exists
    const { data: existing } = await supabase
      .from("users").select("id, role").eq("user_id", session.user.id).maybeSingle();

    if (!existing) {
      const { error } = await supabase.from("users").insert({
        user_id: session.user.id,
        email: session.user.email,
        full_name: session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "User",
        role,
      });
      if (error) {
        toast({ title: "Could not save role", description: error.message, variant: "destructive" });
        setSaving(null); return;
      }
    } else if (existing.role !== role && role === "candidate") {
      // keep as is — candidate row already created by trigger
    } else if (role === "hr") {
      // candidate row exists but user is hiring — switch to hr
      const { error } = await supabase.from("users").update({ role: "hr" }).eq("user_id", session.user.id);
      if (error) {
        // role change blocked by trigger for non-service role
        toast({ title: "Role change blocked", description: "Please contact support to switch your account to a company role.", variant: "destructive" });
        setSaving(null); return;
      }
    }

    // Role is NOT cached in localStorage — always re-read from the verified Supabase session
    navigate(role === "hr" ? "/hr-dashboard" : "/candidate-dashboard");
  };

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#07080f" }}>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#00e5a0" }} />
      </div>
    );
  }

  const cards = [
    {
      role: "hr" as const, icon: Building2, accent: "#4a9eff",
      title: "I'm Hiring",
      desc: "For HR managers, recruiters and companies looking to find the right talent.",
      bullets: ["Post jobs and manage pipeline", "Review AI-scored candidates", "Access proctored assessments", "Track entire hiring journey"],
      cta: "I'm a Company",
    },
    {
      role: "candidate" as const, icon: User, accent: "#00e5a0",
      title: "I'm Looking for Work",
      desc: "For job seekers who want to apply and track their applications.",
      bullets: ["Browse and apply to jobs", "Track your application stages", "Get notified at every step", "Never wonder where you stand"],
      cta: "I'm a Candidate",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12" style={{ background: "#07080f" }}>
      <Logo />
      <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="mt-10 text-3xl md:text-4xl font-extrabold text-white text-center">
        What brings you to HireZap?
      </motion.h1>
      <p className="mt-3 text-center max-w-lg" style={{ color: "#8892a4" }}>
        Choose your role. You can always change this later in settings.
      </p>

      <div className="mt-10 grid sm:grid-cols-2 gap-6">
        {cards.map((c, i) => (
          <motion.div key={c.role}
            initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: i * 0.1 }}
            className="rounded-2xl p-8 w-full sm:w-[340px] text-center flex flex-col"
            style={{ background: "#0d0f1a", border: "2px solid #1a2035" }}>
            <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: `${c.accent}1f` }}>
              <c.icon className="w-7 h-7" style={{ color: c.accent }} />
            </div>
            <div className="mt-5 text-[22px] font-bold text-white">{c.title}</div>
            <div className="mt-2 text-sm" style={{ color: "#8892a4" }}>{c.desc}</div>
            <ul className="mt-6 space-y-2.5 text-left flex-1">
              {c.bullets.map((b) => (
                <li key={b} className="flex items-center gap-2 text-sm text-white">
                  <Check className="w-4 h-4 shrink-0" style={{ color: c.accent }} /> {b}
                </li>
              ))}
            </ul>
            <button
              disabled={saving !== null}
              onClick={() => choose(c.role)}
              className="mt-6 h-12 rounded-lg w-full font-bold flex items-center justify-center disabled:opacity-60"
              style={{ background: c.accent, color: "#07080f" }}>
              {saving === c.role ? <Loader2 className="w-4 h-4 animate-spin" /> : c.cta}
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default SelectRole;
