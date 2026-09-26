import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { Loader2 } from "@/components/BrandLoader";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole: string | string[];
}

const ensureCandidateUserRow = async (user: User | null) => {
  if (!user) return null;

  const metadata = user.user_metadata ?? {};
  const fallbackName =
    metadata.full_name ||
    metadata.name ||
    user.email?.split("@")[0] ||
    "Candidate";

  const { data, error } = await supabase
    .from("users")
    .upsert(
      {
        user_id: user.id,
        email: user.email || "",
        full_name: fallbackName,
        phone: metadata.phone || null,
        role: "candidate",
      },
      { onConflict: "user_id" }
    )
    .select("role")
    .single();

  if (error) throw error;
  return data;
};

const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const [status, setStatus] = useState<"loading" | "authorized" | "unauthorized">("loading");

  useEffect(() => {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];

    const check = async () => {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        setStatus("unauthorized");
        return;
      }
      const { data } = await supabase
        .from("users")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      const userRow = data ?? (roles.includes("candidate") ? await ensureCandidateUserRow(user) : null);

      if (userRow?.role && roles.includes(userRow.role)) {
        setStatus("authorized");
      } else {
        setStatus("unauthorized");
      }
    };
    check();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      check();
    });
    return () => subscription.unsubscribe();
  }, [requiredRole]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 text-primary" />
      </div>
    );
  }

  if (status === "unauthorized") {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
