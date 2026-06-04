import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  Plus, Search, Library, Trash2, Import, Loader2, FolderOpen, X,
  CheckCircle2, HelpCircle, GripVertical,
} from "lucide-react";
import {
  useQuestionBanks, useQuestionBankItems, useCreateQuestionBank,
  useCreateQuestionBankItem, useDeleteQuestionBankItem, useImportBankItemToQuiz,
  type QuestionBankItem,
} from "@/hooks/useQuestionBank";

const QUESTION_TYPES = [
  { value: "multiple_choice", label: "Multiple Choice" },
  { value: "true_false", label: "True / False" },
  { value: "short_answer", label: "Short Answer" },
  { value: "fill_in_blank", label: "Fill in the Blank" },
  { value: "matching", label: "Matching" },
  { value: "ordering", label: "Ordering / Ranking" },
  { value: "essay", label: "Essay / Long Answer" },
  { value: "likert", label: "Likert / Rating Scale" },
  { value: "file_upload", label: "File Upload" },
];

const DIFFICULTY_LEVELS = [
  { value: "easy", label: "Easy", color: "text-success" },
  { value: "medium", label: "Medium", color: "text-warning" },
  { value: "hard", label: "Hard", color: "text-destructive" },
];

interface QuestionBankPanelProps {
  programmeId?: string;
  assessmentId?: string;
  existingQuestionCount?: number;
}

export default function QuestionBankPanel({ programmeId, assessmentId, existingQuestionCount = 0 }: QuestionBankPanelProps) {
  const [selectedBankId, setSelectedBankId] = useState<string>("");
  const [showCreateBank, setShowCreateBank] = useState(false);
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [search, setSearch] = useState("");
  const [newBankName, setNewBankName] = useState("");
  const [newBankDesc, setNewBankDesc] = useState("");
  const [newBankShared, setNewBankShared] = useState(false);

  // Question form state
  const [qText, setQText] = useState("");
  const [qType, setQType] = useState("multiple_choice");
  const [qPoints, setQPoints] = useState("1");
  const [qDifficulty, setQDifficulty] = useState("medium");
  const [qExplanation, setQExplanation] = useState("");
  const [qOptions, setQOptions] = useState([
    { option_text: "", is_correct: true },
    { option_text: "", is_correct: false },
    { option_text: "", is_correct: false },
    { option_text: "", is_correct: false },
  ]);

  const { data: banks = [], isLoading: banksLoading } = useQuestionBanks(programmeId);
  const { data: items = [], isLoading: itemsLoading } = useQuestionBankItems(selectedBankId || undefined);
  const createBank = useCreateQuestionBank();
  const createItem = useCreateQuestionBankItem();
  const deleteItem = useDeleteQuestionBankItem();
  const importItem = useImportBankItemToQuiz();

  const filteredItems = items.filter((i) =>
    !search || i.question_text.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreateBank = async () => {
    if (!newBankName.trim()) return;
    await createBank.mutateAsync({
      name: newBankName,
      description: newBankDesc || undefined,
      programme_id: programmeId,
      is_shared: newBankShared,
    });
    setShowCreateBank(false);
    setNewBankName("");
    setNewBankDesc("");
  };

  const handleAddQuestion = async () => {
    if (!qText.trim() || !selectedBankId) return;
    await createItem.mutateAsync({
      bank_id: selectedBankId,
      question_text: qText,
      question_type: qType,
      points: parseInt(qPoints) || 1,
      difficulty_level: qDifficulty,
      explanation: qExplanation || undefined,
      options: qType !== "short_answer" && qType !== "essay" && qType !== "file_upload"
        ? qOptions.filter((o) => o.option_text.trim())
        : [],
    });
    setShowAddQuestion(false);
    resetQuestionForm();
  };

  const handleImport = async (item: QuestionBankItem) => {
    if (!assessmentId) return;
    await importItem.mutateAsync({
      item,
      assessment_id: assessmentId,
      sequence_order: existingQuestionCount,
    });
  };

  const resetQuestionForm = () => {
    setQText(""); setQType("multiple_choice"); setQPoints("1");
    setQDifficulty("medium"); setQExplanation("");
    setQOptions([
      { option_text: "", is_correct: true },
      { option_text: "", is_correct: false },
      { option_text: "", is_correct: false },
      { option_text: "", is_correct: false },
    ]);
  };

  const handleOptionChange = (index: number, field: string, value: any) => {
    setQOptions((prev) => prev.map((o, i) => {
      if (i !== index) {
        if (field === "is_correct" && value === true) return { ...o, is_correct: false };
        return o;
      }
      return { ...o, [field]: value };
    }));
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Library className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Question Bank</h3>
        </div>
        <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs" onClick={() => setShowCreateBank(true)}>
          <Plus className="w-3 h-3" /> New Bank
        </Button>
      </div>

      {/* Bank selector */}
      <Select value={selectedBankId} onValueChange={setSelectedBankId}>
        <SelectTrigger className="text-sm">
          <SelectValue placeholder="Select a question bank..." />
        </SelectTrigger>
        <SelectContent>
          {banks.map((b) => (
            <SelectItem key={b.id} value={b.id} className="text-xs">
              <span className="flex items-center gap-2">
                <FolderOpen className="w-3 h-3" />
                {b.name}
                {b.is_shared && <Badge variant="secondary" className="text-[8px] ml-1">Shared</Badge>}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Bank contents */}
      {selectedBankId && (
        <>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search questions..." className="pl-8 h-8 text-xs" />
            </div>
            <Button size="sm" className="gap-1.5 h-8 text-xs" onClick={() => setShowAddQuestion(true)}>
              <Plus className="w-3 h-3" /> Add Question
            </Button>
          </div>

          {itemsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="bg-card rounded-xl p-8 border border-border/50 text-center">
              <HelpCircle className="w-8 h-8 mx-auto text-muted-foreground/20 mb-2" />
              <p className="text-xs text-muted-foreground">No questions in this bank yet.</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-2">
                {filteredItems.map((item) => (
                  <div key={item.id} className="bg-card rounded-lg border border-border/50 p-3 flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary" className="text-[8px]">{item.question_type.replace(/_/g, " ")}</Badge>
                        <span className={cn("text-[9px] font-medium", DIFFICULTY_LEVELS.find((d) => d.value === item.difficulty_level)?.color || "text-muted-foreground")}>
                          {item.difficulty_level}
                        </span>
                        <span className="text-[9px] text-muted-foreground">{item.points}pt{item.points !== 1 ? "s" : ""}</span>
                      </div>
                      <p className="text-xs text-foreground line-clamp-2">{item.question_text}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {assessmentId && (
                        <Button
                          variant="outline" size="icon" className="h-6 w-6"
                          onClick={() => handleImport(item)}
                          disabled={importItem.isPending}
                          title="Import to assessment"
                        >
                          <Import className="w-3 h-3" />
                        </Button>
                      )}
                      <Button
                        variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        onClick={() => deleteItem.mutate({ id: item.id, bank_id: selectedBankId })}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </>
      )}

      {/* Create Bank Dialog */}
      <Dialog open={showCreateBank} onOpenChange={setShowCreateBank}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="text-base">Create Question Bank</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Bank Name *</Label>
              <Input value={newBankName} onChange={(e) => setNewBankName(e.target.value)} placeholder="e.g., Module 1 Questions" className="text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Description</Label>
              <Textarea value={newBankDesc} onChange={(e) => setNewBankDesc(e.target.value)} placeholder="Optional description..." className="text-sm min-h-[60px]" />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
              <div>
                <p className="text-xs font-medium">Share across programmes</p>
                <p className="text-[10px] text-muted-foreground">Other programmes can use these questions</p>
              </div>
              <Switch checked={newBankShared} onCheckedChange={setNewBankShared} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowCreateBank(false)}>Cancel</Button>
            <Button size="sm" onClick={handleCreateBank} disabled={!newBankName.trim() || createBank.isPending}>
              {createBank.isPending && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
              Create Bank
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Question Dialog */}
      <Dialog open={showAddQuestion} onOpenChange={setShowAddQuestion}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-base">Add Question to Bank</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Question Type</Label>
                <Select value={qType} onValueChange={setQType}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {QUESTION_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value} className="text-xs">{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Difficulty</Label>
                <Select value={qDifficulty} onValueChange={setQDifficulty}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DIFFICULTY_LEVELS.map((d) => (
                      <SelectItem key={d.value} value={d.value} className="text-xs">{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Question Text</Label>
              <Textarea value={qText} onChange={(e) => setQText(e.target.value)} placeholder="Enter your question..." className="min-h-[60px] text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Points</Label>
                <Input type="number" min={1} value={qPoints} onChange={(e) => setQPoints(e.target.value)} className="h-8 text-xs" />
              </div>
              <div>
                <Label className="text-xs">Explanation</Label>
                <Input value={qExplanation} onChange={(e) => setQExplanation(e.target.value)} placeholder="Shown after answering" className="h-8 text-xs" />
              </div>
            </div>

            {/* Options for applicable types */}
            {!["short_answer", "essay", "file_upload"].includes(qType) && (
              <div className="space-y-2">
                <Label className="text-xs">Answer Options</Label>
                {qOptions.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Switch checked={opt.is_correct} onCheckedChange={(v) => handleOptionChange(i, "is_correct", v)} className="scale-75" />
                    <Input value={opt.option_text} onChange={(e) => handleOptionChange(i, "option_text", e.target.value)} placeholder={`Option ${i + 1}`} className="h-8 text-xs flex-1" />
                    {qOptions.length > 2 && (
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setQOptions((p) => p.filter((_, idx) => idx !== i))}>
                        <X className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                ))}
                {qOptions.length < 8 && (
                  <Button variant="outline" size="sm" className="text-xs h-7 gap-1" onClick={() => setQOptions((p) => [...p, { option_text: "", is_correct: false }])}>
                    <Plus className="w-3 h-3" /> Add Option
                  </Button>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowAddQuestion(false)}>Cancel</Button>
            <Button size="sm" onClick={handleAddQuestion} disabled={!qText.trim() || createItem.isPending}>
              {createItem.isPending && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
              Add Question
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
