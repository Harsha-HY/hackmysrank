import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "@/components/BrandLoader";


const LANGS: Record<string, { label: string; version: string }> = {
  javascript: { label: "JavaScript (Node 18)", version: "18.15.0" },
  python:     { label: "Python 3.10",         version: "3.10.0" },
  java:       { label: "Java 15",             version: "15.0.2" },
  cpp:        { label: "C++ (GCC 10)",        version: "10.2.0" },
  c:          { label: "C (GCC 10)",          version: "10.2.0" },
  typescript: { label: "TypeScript 5",        version: "5.0.3" },
  go:         { label: "Go 1.16",             version: "1.16.2" },
};

interface Props {
  code: string;
  onLanguageChange?: (lang: string) => void;
  defaultLanguage?: string;
  stdin?: string;
}

export default function CodeRunner({ code, defaultLanguage = "python", onLanguageChange, stdin = "" }: Props) {
  const [language, setLanguage] = useState(defaultLanguage);
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState<{ stdout: string; stderr: string; time?: string } | null>(null);

  const run = async () => {
    if (!code.trim()) {
      setOutput({ stdout: "", stderr: "⚠️ Write some code before running." });
      return;
    }
    setRunning(true);
    setOutput(null);
    try {
      const { data, error } = await supabase.functions.invoke("run-code", { body: { language, code, stdin } });
      if (error || (data as any)?.error) {
        throw new Error((data as any)?.details || (data as any)?.error || error?.message || "Execution failed");
      }
      setOutput({
        stdout: (data as any).stdout || "",
        stderr: (data as any).stderr || "",
        time: (data as any).signal || ((data as any).code !== undefined ? `exit ${(data as any).code}` : undefined),
      });
    } catch (e: any) {
      setOutput({ stdout: "", stderr: e?.message || "Could not reach the code execution service." });
    }

    setRunning(false);
  };


  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Select value={language} onValueChange={(v) => { setLanguage(v); onLanguageChange?.(v); }}>
          <SelectTrigger className="w-48 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(LANGS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={run} disabled={running} className="gap-1 h-8">
          {running ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
          {running ? "Running…" : "Run Code"}
        </Button>
        {output?.time && <span className="text-[10px] text-muted-foreground">{output.time}</span>}
      </div>
      {output && (
        <div className="grid grid-cols-1 gap-2">
          {output.stdout && (
            <div>
              <p className="text-[10px] font-semibold text-primary mb-1">STDOUT</p>
              <pre className="text-xs bg-background border border-border rounded p-2 max-h-40 overflow-auto whitespace-pre-wrap font-mono">{output.stdout}</pre>
            </div>
          )}
          {output.stderr && (
            <div>
              <p className="text-[10px] font-semibold text-destructive mb-1">STDERR</p>
              <pre className="text-xs bg-destructive/5 border border-destructive/30 rounded p-2 max-h-40 overflow-auto whitespace-pre-wrap font-mono text-destructive">{output.stderr}</pre>
            </div>
          )}
          {!output.stdout && !output.stderr && (
            <p className="text-xs text-muted-foreground">Program finished with no output.</p>
          )}
        </div>
      )}
    </div>
  );
}
