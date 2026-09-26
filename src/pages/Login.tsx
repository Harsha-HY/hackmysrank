import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Eye, EyeOff, ArrowLeft, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import BrandLogo from "@/components/BrandLogo";
import { Loader2 } from "@/components/BrandLoader";


const roleRoutes: Record<string, string> = {
  owner: "/owner-dashboard",
  superadmin: "/admin-dashboard",
  hr: "/hr-dashboard",
  manager: "/manager-dashboard",
  candidate: "/candidate-dashboard",
};

const showcase = [
  { icon: "⚡", text: "AI scores every resume in 3 seconds" },
  { icon: "🛡️", text: "Zero tolerance anti-cheat proctoring" },
  { icon: "📊", text: "Real-time dashboard for HR teams" },
  { icon: "🎯", text: "Candidates always know their stage" },
];

const Logo = ({ size = 22 }: { size?: number }) => (
  <BrandLogo inverse markClassName="h-10 w-10" textClassName={size >= 28 ? "text-3xl" : "text-xl"} />
);

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showcaseIdx, setShowcaseIdx] = useState(0);
  const navigate = useNavigate();
  const { toast } = useToast();
  const routingRef = useRef(false);

  useEffect(() => {
    const id = setInterval(() => setShowcaseIdx((i) => (i + 1) % showcase.length), 3000);
    return () => clearInterval(id);
  }, []);

  const routeForUser = async (userId: string) => {
    if (routingRef.current) return;
    routingRef.current = true;
    const returnTo = sessionStorage.getItem("hz_return_to");
    if (returnTo) {
      sessionStorage.removeItem("hz_return_to");
      navigate(returnTo);
      return;
    }
    const { data: userData } = await supabase
      .from("users")
      .select("role, full_name")
      .eq("user_id", userId)
      .maybeSingle();

    // New Google sign-ups land without a role row → default to candidate and
    // send them straight to complete-profile (NOT to the dashboard).
    if (!userData?.role) {
      const { data: { user } } = await supabase.auth.getUser();
      const meta = user?.user_metadata || {};
      const { error: createError } = await supabase.from("users").upsert(
        {
          user_id: userId,
          email: user?.email || "",
          full_name: meta.full_name || meta.name || "",
          role: "candidate",
        },
        { onConflict: "user_id" }
      );
      if (createError) {
        routingRef.current = false;
        toast({ title: "Account setup failed", description: createError.message, variant: "destructive" });
        return;
      }
      navigate("/complete-profile");
      return;
    }

    if (userData.role === "candidate") {
      const { data: prof } = await supabase
        .from("candidate_profiles")
        .select("profile_completed")
        .eq("user_id", userId)
        .maybeSingle();
      if (!prof || !prof.profile_completed) {
        navigate("/complete-profile");
        return;
      }
    }
    navigate(roleRoutes[userData.role] || "/select-role");
  };

  useEffect(() => {
    const finishSignIn = async () => {
      const params = new URLSearchParams(window.location.search);
      const oauthError = params.get("error_description") || params.get("error");
      if (oauthError) {
        toast({ title: "Google sign-in failed", description: oauthError, variant: "destructive" });
        window.history.replaceState({}, document.title, "/login");
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (user) await routeForUser(user.id);
    };

    finishSignIn();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && session?.user) {
        void routeForUser(session.user.id);
      }
    });
    return () => subscription.unsubscribe();
  }, []);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({ title: "Missing fields", description: "Enter email and password.", variant: "destructive" });
      return;
    }
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (!error && data.user) {
      await routeForUser(data.user.id);
      setLoading(false);
      return;
    }

    const msg = /invalid login credentials/i.test(error?.message || "")
      ? "Invalid email or password. New here? Create an account below."
      : error?.message || "Could not sign in.";
    toast({ title: "Sign in failed", description: msg, variant: "destructive" });
    setLoading(false);
  };



  const handleGoogle = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/login`,
          queryParams: { prompt: "select_account" },
        },
      });
      if (error) throw error;
    } catch (e: any) {
      toast({ title: "Google sign-in failed", description: e?.message || "Try again.", variant: "destructive" });
      setLoading(false);
    }
  };

  const handleForgot = async () => {
    if (!email) {
      toast({ title: "Enter your email first", description: "Type your email above, then tap Forgot password.", variant: "destructive" });
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast({ title: "Could not send reset", description: error.message, variant: "destructive" });
    else toast({ title: "Reset link sent", description: "Check your email for the reset link." });
  };


  return (
    <div className="min-h-screen flex relative" style={{ background: "#07080f" }}>
      <Link
        to="/"
        className="absolute top-5 left-5 z-20 inline-flex items-center gap-2 text-sm px-3 py-2 rounded-full hover:bg-white/5 transition"
        style={{ color: "#cbd5e1", border: "1px solid #1a2035" }}
        aria-label="Back to home"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>
      {/* LEFT */}
      <div className="hidden md:flex w-1/2 flex-col justify-center p-16 relative overflow-hidden" style={{ background: "#07080f" }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(circle at 30% 30%, rgba(0,229,160,0.08), transparent 60%), radial-gradient(circle at 70% 80%, rgba(74,158,255,0.06), transparent 60%)" }}/>
        <div className="relative">
          <Logo size={32} />
          <div className="mt-16 min-h-[120px]">
            <AnimatePresence mode="wait">
              <motion.div key={showcaseIdx}
                initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }}
                transition={{ duration: 0.5 }}
                className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl"
                  style={{ background: "rgba(0,229,160,0.12)", border: "1px solid rgba(0,229,160,0.35)" }}>
                  {showcase[showcaseIdx].icon}
                </div>
                <div className="text-white text-2xl font-semibold leading-snug max-w-md">
                  {showcase[showcaseIdx].text}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="mt-16 grid grid-cols-1 gap-4 max-w-md">
            {[
              "Sign up only with Google",
              "Existing users: sign in with email & password",
              "Built for Indian SMBs",
            ].map((s) => (

              <div key={s} className="flex items-center gap-3 text-sm" style={{ color: "#cbd5e1" }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#00e5a0" }} />
                {s}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6 md:p-16" style={{ background: "#0d0f1a" }}>
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="w-full max-w-[420px]">
          <div className="flex justify-center"><Logo size={20} /></div>
          <h1 className="mt-8 text-3xl font-bold text-white text-center">Welcome to HireZap</h1>
          <p className="mt-2 text-center text-sm" style={{ color: "#8892a4" }}>
            Sign in with Google or your email — new? Create a candidate account below.
          </p>



          <button
            onClick={handleGoogle}
            disabled={loading}
            className="mt-8 w-full h-[52px] rounded-[10px] bg-white text-[#1a1a1a] font-semibold flex items-center justify-center gap-3 hover:shadow-lg transition-shadow disabled:opacity-60">
            <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.3 29.3 35.5 24 35.5c-6.4 0-11.5-5.1-11.5-11.5S17.6 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.6 6.5 29 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.4-.3-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 19 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.6 6.5 29 4.5 24 4.5 16.3 4.5 9.7 8.9 6.3 14.7z"/><path fill="#4CAF50" d="M24 43.5c5 0 9.5-1.9 12.9-5l-6-5c-1.9 1.3-4.3 2-6.9 2-5.3 0-9.7-3.2-11.3-7.5l-6.5 5C9.6 39 16.2 43.5 24 43.5z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.4 5.5l6 5C40.9 35.6 43.5 30.2 43.5 24c0-1.2-.1-2.4-.3-3.5z"/></svg>
            Continue with Google
          </button>

          <div className="my-6 flex items-center gap-4">
            <div className="flex-1 h-px" style={{ background: "#1a2035" }} />
            <span className="text-xs" style={{ color: "#8892a4" }}>or</span>
            <div className="flex-1 h-px" style={{ background: "#1a2035" }} />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              className="w-full h-[52px] rounded-[10px] px-4 text-white placeholder:text-[#8892a4] focus:outline-none focus:border-[#00e5a0] transition-colors"
              style={{ background: "#121424", border: "1px solid #1a2035" }} />
            <div className="relative">
              <input
                type={showPwd ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full h-[52px] rounded-[10px] px-4 pr-12 text-white placeholder:text-[#8892a4] focus:outline-none focus:border-[#00e5a0] transition-colors"
                style={{ background: "#121424", border: "1px solid #1a2035" }} />
              <button type="button" onClick={() => setShowPwd((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "#8892a4" }}>
                {showPwd ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full h-[52px] rounded-[10px] font-bold flex items-center justify-center disabled:opacity-60"
              style={{ background: "#00e5a0", color: "#07080f", boxShadow: "0 0 30px rgba(0,229,160,0.25)" }}>
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign In"}
            </button>
          </form>


          <Link
            to="/candidate-signup"
            className="mt-4 w-full h-[52px] rounded-[10px] font-semibold flex items-center justify-center gap-2 border transition-colors"
            style={{ background: "transparent", borderColor: "#1a2035", color: "#cbd5e1" }}
          >
            <UserPlus className="w-4 h-4" /> Create a candidate account
          </Link>

          <div className="mt-3 text-center">
            <button onClick={handleForgot} className="text-sm hover:underline" style={{ color: "#00e5a0" }}>Forgot password?</button>
          </div>


          <p className="mt-8 text-center text-xs" style={{ color: "#8892a4" }}>
            By continuing you agree to our{" "}
            <Link to="/terms-of-service" className="hover:underline" style={{ color: "#cbd5e1" }}>Terms of Service</Link>
            {" "}and{" "}
            <Link to="/privacy-policy" className="hover:underline" style={{ color: "#cbd5e1" }}>Privacy Policy</Link>.
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
