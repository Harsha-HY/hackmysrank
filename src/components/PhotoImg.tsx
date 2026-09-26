import { useEffect, useState } from "react";
import { resolvePhotoUrl } from "@/lib/photoUrl";

interface PhotoImgProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  path: string | null | undefined;
}

/**
 * <img> that resolves a `photos` bucket path/legacy public URL into a signed URL.
 * Renders nothing until the URL is available.
 */
export function PhotoImg({ path, ...imgProps }: PhotoImgProps) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!path) { setUrl(null); return; }
    resolvePhotoUrl(path).then((u) => { if (active) setUrl(u); });
    return () => { active = false; };
  }, [path]);

  if (!url) return null;
  return <img src={url} {...imgProps} />;
}
