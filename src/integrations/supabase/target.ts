// Active backend target.
// Edit these two values (or set VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY
// in your hosting env, e.g. Vercel) to point the whole app at a different project.

// NOTE: hardcoded on purpose. Older build environments still carry VITE_SUPABASE_*
// values pointing at the retired backend, which broke auth in the preview.
export const TARGET_SUPABASE_URL = "https://kriafnaoqxbbdxknnbgf.supabase.co";

export const TARGET_SUPABASE_PUBLISHABLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtyaWFmbmFvcXhiYmR4a25uYmdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY4OTA4OTgsImV4cCI6MjEwMjQ2Njg5OH0.yZuos8XzxI7ARgrEB1O4Ohnl1QjMofsTSqrkJ70bCyc";

