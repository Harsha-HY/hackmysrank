import { supabase } from "@/integrations/supabase/client";

/**
 * Resolve a photos-bucket reference into a usable URL.
 * - Full http(s) URLs are returned as-is.
 * - Legacy public URLs containing /object/public/photos/ are converted to signed URLs.
 * - Storage paths (e.g. "<userId>/file.jpg") are signed for the requested TTL.
 */
export async function resolvePhotoUrl(
  ref: string | null | undefined,
  expiresIn = 3600
): Promise<string | null> {
  if (!ref) return null;
  let path = ref;
  if (ref.startsWith("http")) {
    const marker = "/object/public/photos/";
    const idx = ref.indexOf(marker);
    if (idx === -1) return ref; // external URL (e.g. Google avatar)
    path = ref.slice(idx + marker.length);
  }
  const { data, error } = await supabase.storage
    .from("photos")
    .createSignedUrl(path, expiresIn);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
