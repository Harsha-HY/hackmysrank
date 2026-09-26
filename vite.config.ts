import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

function nodeGithubApiPlugin() {
  return {
    name: "node-github-api",
    configureServer(server: any) {
      server.middlewares.use("/api/github-inspect", async (req: any, res: any) => {
        try {
          const host = req.headers.host || "localhost:8080";
          const url = new URL(req.url, `http://${host}`);
          const repoUrl = url.searchParams.get("repo") || "https://github.com/Harsha-HY/nalapaka";
          const candidateName = url.searchParams.get("candidate") || "Candidate";

          // Dynamically import via Vite SSR module loader in Node.js
          const { fetchRealGitHubAnalysis } = await server.ssrLoadModule("./src/lib/githubRealFetcher.ts");
          const result = await fetchRealGitHubAnalysis(repoUrl, candidateName);

          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(result));
        } catch (err: any) {
          console.error("Error in /api/github-inspect Node middleware:", err);
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: err.message || "Failed to inspect repository" }));
        }
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), nodeGithubApiPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
