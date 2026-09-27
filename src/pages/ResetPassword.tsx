import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import { Loader2 } from "@/components/BrandLoader";

const Logo = () => (
  <BrandLogo inverse className="justify-center" markClassName="h-12 w-12" textClassName="text-3xl" />
);

const ResetPassword = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [valid, setValid] = useState(false);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      // 1. Check for PKCE exchange code in URL search params
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      if (code) {
        try {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (!error && data?.session) {
            if (mounted) {
              setValid(true);
              setReady(true);
            }
            return;
          }
        } catch (e) {
          console.error("Code exchange error:", e);
        }
      }

      // 2. Check for hash fragment token (implicit flow / recovery link)
      const hash = window.location.hash;
      if (hash && (hash.includes("access_token") || hash.includes("type=recovery"))) {
        await new Promise((r) => setTimeout(r, 400));
      }

      // 3. Check active session
      const { data: { session } } = await supabase.auth.getSession();
      if (mounted) {
        if (session) setValid(true);
        setReady(true);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN" || event === "USER_UPDATED") {
        if (mounted) setValid(true);
      }
    });

    init();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const pwd = password;
    if (pwd.length < 6) {
      toast({ title: "Password too short", description: "Use at least 6 characters.", variant: "destructive" });
      return;
    }
    if (!/[a-z]/.test(pwd) || !/[A-Z]/.test(pwd) || !/[0-9]/.test(pwd) || !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(pwd)) {
      toast({
        title: "Weak password",
        description: "Password must contain uppercase (A-Z), lowercase (a-z), digit (0-9), and special character (e.g. Pass#1234).",
        variant: "destructive",
      });
      return;
    }
    if (password !== confirmPwd) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast({ title: "Could not update password", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Password updated successfully!", description: "Sign in with your new password." });
    await supabase.auth.signOut();
    navigate("/login");
  };

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#07080f" }}>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#00e5a0" }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#07080f" }}>
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center"><Logo /></div>
        <div className="rounded-2xl p-8" style={{ background: "#0d0f1a", border: "1px solid #1a2035" }}>
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="w-5 h-5" style={{ color: "#00e5a0" }} />
            <h1 className="text-2xl font-bold text-white">Reset your password</h1>
          </div>
          <p className="text-sm mb-6" style={{ color: "#8892a4" }}>
            {valid
              ? "Enter a new password for your HireZap account."
              : "This reset link is invalid or has expired. Request a new one from the sign-in page."}
          </p>

          {valid ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <input
                  type={show ? "text" : "password"}
                  required minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="New password"
                  className="w-full h-[52px] rounded-[10px] px-4 pr-12 text-white placeholder:text-[#8892a4] focus:outline-none focus:border-[#00e5a0] transition-colors"
                  style={{ background: "#121424", border: "1px solid #1a2035" }}
                />
                <button type="button" onClick={() => setShow((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "#8892a4" }}>
                  {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-xs text-[#8892a4] -mt-2 ml-1">Must include: A-Z, a-z, 0-9, and a symbol (e.g. Pass#1234)</p>
              <input
                type={show ? "text" : "password"}
                required minLength={6}
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
                placeholder="Confirm new password"
                className="w-full h-[52px] rounded-[10px] px-4 text-white placeholder:text-[#8892a4] focus:outline-none focus:border-[#00e5a0] transition-colors"
                style={{ background: "#121424", border: "1px solid #1a2035" }}
              />
              <button type="submit" disabled={loading}
                className="w-full h-[52px] rounded-[10px] font-bold flex items-center justify-center disabled:opacity-60"
                style={{ background: "#00e5a0", color: "#07080f" }}>
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Update password"}
              </button>
            </form>
          ) : (
            <button onClick={() => navigate("/login")}
              className="w-full h-[52px] rounded-[10px] font-bold"
              style={{ background: "#00e5a0", color: "#07080f" }}>
              Back to sign in
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
