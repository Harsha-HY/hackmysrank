import { supabase } from "@/integrations/supabase/client";

export const BUCKET = "company-assets";

export async function signCompanyAsset(path: string | null | undefined, expiresIn = 3600): Promise<string | null> {
  if (!path) return null;
  // Already a full URL
  if (/^https?:\/\//i.test(path)) return path;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresIn);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

export async function signMany(paths: (string | null | undefined)[]): Promise<(string | null)[]> {
  return Promise.all(paths.map((p) => signCompanyAsset(p)));
}

export function slugify(name: string): string {
  return (name || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);
}
