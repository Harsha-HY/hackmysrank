import { useState } from "react";
import { CheckCircle, ChevronDown, ChevronUp, Plus, Trash2, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface ExtractedQuestion {
  question_number: number;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: "A" | "B" | "C" | "D";
  category: string;
  difficulty: "Easy" | "Medium" | "Hard";
  time_seconds: number;
}

interface Props {
  open: boolean;
  questions: ExtractedQuestion[];
  onClose: () => void;
  onUseAll: (qs: ExtractedQuestion[]) => void;
  onReupload: () => void;
}

const CATEGORIES = ["Logical", "Quantitative", "English", "Technical", "General"];
const DIFFICULTIES = ["Easy", "Medium", "Hard"] as const;
const LETTERS = ["A", "B", "C", "D"] as const;

const inputCls =
  "w-full rounded-md border border-border bg-secondary/40 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary";

const PdfQuestionsModal = ({ open, questions, onClose, onUseAll, onReupload }: Props) => {
  const [mode, setMode] = useState<"preview" | "edit">("preview");
  const [items, setItems] = useState<ExtractedQuestion[]>(questions);
  const [expanded, setExpanded] = useState<number | null>(0);

  // Resync when new extraction comes in
  if (open && items !== questions && mode === "preview" && items.length === 0) {
    setItems(questions);
  }

  const handleClose = () => {
    setMode("preview");
    onClose();
  };

  const updateQ = (idx: number, patch: Partial<ExtractedQuestion>) => {
    setItems((p) => p.map((q, i) => (i === idx ? { ...q, ...patch } : q)));
  };

  const removeQ = (idx: number) => {
    setItems((p) => p.filter((_, i) => i !== idx).map((q, i) => ({ ...q, question_number: i + 1 })));
  };

  const addQ = () => {
    setItems((p) => [
      ...p,
      {
        question_number: p.length + 1,
        question: "",
        option_a: "",
        option_b: "",
        option_c: "",
        option_d: "",
        correct_answer: "A",
        category: "General",
        difficulty: "Medium",
        time_seconds: 60,
      },
    ]);
    setExpanded(items.length);
  };

  const preview = items.slice(0, 5);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-foreground">
            {mode === "preview" ? "Questions Extracted from PDF" : "Review & Edit Questions"}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{items.length} questions found</p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2 space-y-3">
          {mode === "preview" &&
            preview.map((q, i) => (
              <div key={i} className="rounded-lg border border-border bg-secondary/30 p-4">
                <p className="text-xs text-muted-foreground mb-1">
                  Q{q.question_number} · {q.category} · {q.difficulty} · {q.time_seconds}s
                </p>
                <p className="text-sm font-medium text-foreground mb-3">{q.question}</p>
                <div className="grid gap-1.5">
                  {LETTERS.map((L) => {
                    const text = (q as any)[`option_${L.toLowerCase()}`];
                    const correct = q.correct_answer === L;
                    return (
                      <div
                        key={L}
                        className={`flex items-start gap-2 rounded-md px-2.5 py-1.5 text-sm border ${
                          correct
                            ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-200"
                            : "bg-secondary/40 border-border text-foreground"
                        }`}
                      >
                        <span className="font-semibold">{L}.</span>
                        <span className="flex-1">{text}</span>
                        {correct && <CheckCircle className="h-4 w-4 text-emerald-400 mt-0.5" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

          {mode === "preview" && items.length > 5 && (
            <p className="text-xs text-muted-foreground text-center">
              + {items.length - 5} more questions
            </p>
          )}

          {mode === "edit" && (
            <>
              {items.map((q, idx) => {
                const isOpen = expanded === idx;
                return (
                  <div key={idx} className="rounded-lg border border-border bg-secondary/30">
                    <button
                      type="button"
                      onClick={() => setExpanded(isOpen ? null : idx)}
                      className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
                    >
                      <span className="text-sm text-foreground truncate">
                        <span className="text-muted-foreground">Q{q.question_number}.</span>{" "}
                        {q.question || <em className="text-muted-foreground">New question</em>}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeQ(idx);
                          }}
                          className="text-muted-foreground hover:text-destructive"
                          aria-label="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        {isOpen ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </button>
                    {isOpen && (
                      <div className="border-t border-border p-4 space-y-3">
                        <textarea
                          rows={2}
                          value={q.question}
                          onChange={(e) => updateQ(idx, { question: e.target.value })}
                          placeholder="Question text"
                          className={`${inputCls} resize-none`}
                        />
                        {LETTERS.map((L) => {
                          const key = `option_${L.toLowerCase()}` as keyof ExtractedQuestion;
                          return (
                            <div key={L} className="flex items-center gap-2">
                              <span className="text-xs font-semibold w-5 text-muted-foreground">{L}.</span>
                              <input
                                type="text"
                                value={(q[key] as string) || ""}
                                onChange={(e) => updateQ(idx, { [key]: e.target.value } as any)}
                                placeholder={`Option ${L}`}
                                className={inputCls}
                              />
                              <button
                                type="button"
                                onClick={() => updateQ(idx, { correct_answer: L })}
                                className={`shrink-0 rounded px-2 py-1 text-[10px] font-semibold border transition ${
                                  q.correct_answer === L
                                    ? "bg-emerald-500/20 border-emerald-500 text-emerald-200"
                                    : "border-border text-muted-foreground hover:border-primary"
                                }`}
                              >
                                {q.correct_answer === L ? "Correct" : "Mark"}
                              </button>
                            </div>
                          );
                        })}
                        <div className="grid grid-cols-3 gap-2">
                          <Select value={q.category} onValueChange={(v) => updateQ(idx, { category: v })}>
                            <SelectTrigger className="bg-secondary/40 border-border h-9 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {CATEGORIES.map((c) => (
                                <SelectItem key={c} value={c}>
                                  {c}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select
                            value={q.difficulty}
                            onValueChange={(v) => updateQ(idx, { difficulty: v as any })}
                          >
                            <SelectTrigger className="bg-secondary/40 border-border h-9 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {DIFFICULTIES.map((d) => (
                                <SelectItem key={d} value={d}>
                                  {d}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <input
                            type="number"
                            min={10}
                            max={300}
                            value={q.time_seconds}
                            onChange={(e) =>
                              updateQ(idx, { time_seconds: Number(e.target.value) || 60 })
                            }
                            className={`${inputCls} h-9 py-0`}
                            placeholder="Seconds"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              <button
                type="button"
                onClick={addQ}
                className="w-full flex items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-secondary/20 py-3 text-sm text-muted-foreground hover:border-primary hover:text-primary transition"
              >
                <Plus className="h-4 w-4" /> Add Question
              </button>
            </>
          )}
        </div>

        <DialogFooter className="flex-row gap-2 sm:gap-2 pt-3 border-t border-border">
          {mode === "preview" ? (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setMode("preview");
                  onReupload();
                }}
                className="flex-1"
              >
                <X className="h-4 w-4 mr-1" /> Re-upload Different PDF
              </Button>
              <Button variant="outline" onClick={() => setMode("edit")} className="flex-1">
                Review & Edit
              </Button>
              <Button onClick={() => onUseAll(items)} className="flex-1">
                Use All Questions
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setMode("preview")} className="flex-1">
                Back to Preview
              </Button>
              <Button
                onClick={() => onUseAll(items.map((q, i) => ({ ...q, question_number: i + 1 })))}
                className="flex-1"
              >
                Save Changes & Use
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PdfQuestionsModal;
