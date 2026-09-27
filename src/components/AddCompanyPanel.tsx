import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { createClient } from "@supabase/supabase-js";
import { TARGET_SUPABASE_URL, TARGET_SUPABASE_PUBLISHABLE_KEY } from "@/integrations/supabase/target";
import { useToast } from "@/hooks/use-toast";
import { Building2, MapPin, User, Mail, Phone, KeyRound, Lock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";

interface AddCompanyPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompanyCreated: () => void;
}

const industries = ["IT", "Finance", "Healthcare", "Ecommerce", "Education", "Other"];
const plans = ["Starter", "Growth", "Enterprise"];

const AddCompanyPanel = ({ open, onOpenChange, onCompanyCreated }: AddCompanyPanelProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    companyName: "",
    industry: "IT",
    location: "",
    plan: "Starter",
    adminName: "",
    adminEmail: "",
    adminPhone: "",
    companyCode: "",
    adminPassword: "",
    confirmPassword: "",
  });

  const update = (key: string, value: string) => setForm((p) => ({ ...p, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.adminPassword !== form.confirmPassword) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    const pwd = form.adminPassword;
    if (pwd.length < 6) {
      toast({ title: "Password too short", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    if (!/[a-z]/.test(pwd) || !/[A-Z]/.test(pwd) || !/[0-9]/.test(pwd) || !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(pwd)) {
      toast({
        title: "Weak password",
        description: "Password must contain uppercase (A-Z), lowercase (a-z), digit (0-9), and special character (e.g. Admin#2026).",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast({ title: "Not authenticated", variant: "destructive" });
      setLoading(false);
      return;
    }

    // 1. Create company
    const { data: company, error: companyErr } = await supabase
      .from("companies")
      .insert({
        company_name: form.companyName,
        industry: form.industry,
        location: form.location,
        plan: form.plan,
        company_code: form.companyCode,
        owner_id: session.user.id,
      })
      .select("id")
      .single();

    if (companyErr) {
      toast({ title: "Failed to create company", description: companyErr.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    let adminCreated = false;
    let failureReason = "";

    // 2. Primary: Create Super Admin directly using isolated auth client (preserves owner session)
    try {
      const isolatedAuth = createClient(TARGET_SUPABASE_URL, TARGET_SUPABASE_PUBLISHABLE_KEY, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      });

      const { data: signUpData, error: signUpErr } = await isolatedAuth.auth.signUp({
        email: form.adminEmail,
        password: form.adminPassword,
        options: {
          data: {
            full_name: form.adminName,
            phone: form.adminPhone,
            role: "superadmin",
            company_id: company.id,
          },
        },
      });

      if (!signUpErr && signUpData.user) {
        adminCreated = true;
      } else if (signUpErr && /already been registered|already exists/i.test(signUpErr.message)) {
        // Account exists: link and update superadmin metadata with provided password
        const { data: signInData, error: signInErr } = await isolatedAuth.auth.signInWithPassword({
          email: form.adminEmail,
          password: form.adminPassword,
        });
        if (!signInErr && signInData?.user) {
          await isolatedAuth.auth.updateUser({
            data: {
              full_name: form.adminName,
              phone: form.adminPhone,
              role: "superadmin",
              company_id: company.id,
            },
          });
          adminCreated = true;
        } else {
          failureReason = "An account with this email already exists. Please enter its existing password or use a different email.";
        }
      } else if (signUpErr) {
        failureReason = signUpErr.message;
      }
    } catch (fbErr: any) {
      failureReason = fbErr?.message || "Auth sign up failed";
    }

    // Optional background sync with edge function (non-blocking)
    if (adminCreated) {
      supabase.functions.invoke("create-user", {
        body: {
          email: form.adminEmail,
          password: form.adminPassword,
          fullName: form.adminName,
          phone: form.adminPhone,
          role: "superadmin",
          companyId: company.id,
        },
      }).catch(() => { /* non-blocking sync */ });
    }

    if (!adminCreated) {
      // Rollback created company to avoid leaving orphaned companies
      await supabase.from("companies").delete().eq("id", company.id);

      const friendlyMsg = /password should contain/i.test(failureReason)
        ? "Password must contain uppercase (A-Z), lowercase (a-z), digit (0-9), and special character (e.g. Admin#2026)."
        : failureReason || "Failed to create super admin account. Please try again.";

      toast({
        title: "Failed to create admin account",
        description: friendlyMsg,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    toast({ title: "✅ Company and Super Admin created successfully!" });
    setForm({
      companyName: "", industry: "IT", location: "", plan: "Starter",
      adminName: "", adminEmail: "", adminPhone: "", companyCode: "",
      adminPassword: "", confirmPassword: "",
    });
    onOpenChange(false);
    onCompanyCreated();
    setLoading(false);
  };

  const inputClass = "w-full rounded-lg border border-border bg-secondary/50 py-3 pl-11 pr-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg bg-card border-border overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-xl font-bold text-foreground">Create New Company</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Company Details */}
          <div>
            <h3 className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">Company Details</h3>
            <div className="space-y-3">
              <div className="relative">
                <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input type="text" placeholder="Company Name" required value={form.companyName} onChange={(e) => update("companyName", e.target.value)} className={inputClass} />
              </div>
              <Select value={form.industry} onValueChange={(v) => update("industry", v)}>
                <SelectTrigger className="bg-secondary/50 border-border h-12">
                  <SelectValue placeholder="Industry" />
                </SelectTrigger>
                <SelectContent>
                  {industries.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="relative">
                <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input type="text" placeholder="Location" required value={form.location} onChange={(e) => update("location", e.target.value)} className={inputClass} />
              </div>
              <Select value={form.plan} onValueChange={(v) => update("plan", v)}>
                <SelectTrigger className="bg-secondary/50 border-border h-12">
                  <SelectValue placeholder="Plan" />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Admin Details */}
          <div>
            <h3 className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">Super Admin Details</h3>
            <div className="space-y-3">
              {[
                { icon: User, key: "adminName", placeholder: "Admin Full Name", type: "text" },
                { icon: Mail, key: "adminEmail", placeholder: "Admin Email", type: "email" },
                { icon: Phone, key: "adminPhone", placeholder: "Admin Phone", type: "tel" },
                { icon: KeyRound, key: "companyCode", placeholder: "Company Code", type: "text", hint: "Example: TECH-2024-ABC" },
                { icon: Lock, key: "adminPassword", placeholder: "Admin Password", type: "password", hint: "Must include A-Z, a-z, 0-9, and a symbol (e.g. Admin#2026)" },
                { icon: ShieldCheck, key: "confirmPassword", placeholder: "Confirm Password", type: "password" },
              ].map(({ icon: Icon, key, placeholder, type, hint }) => (
                <div key={key}>
                  <div className="relative">
                    <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type={type}
                      placeholder={placeholder}
                      required
                      value={(form as any)[key]}
                      onChange={(e) => update(key, e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  {hint && <p className="text-xs text-muted-foreground mt-1 ml-1">{hint}</p>}
                </div>
              ))}
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg py-6 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_hsl(160,100%,45%,0.2)] transition-all"
          >
            {loading ? "Creating..." : "Create Company Account"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
};

export default AddCompanyPanel;
