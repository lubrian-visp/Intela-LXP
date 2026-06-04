import { useMemo, useState } from "react";
import { useQuestionAnalytics } from "@/hooks/useQuestionAnalytics";
import { useAssessments } from "@/hooks/useCoreData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, Target, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

interface Props {
  programmeId?: string;
}

export function QuestionAnalyticsPanel({ programmeId }: Props) {
  const [assessmentId, setAssessmentId] = useState<string>("");
  const { data: assessments = [] } = useAssessments(
    programmeId === "all" ? undefined : programmeId
  );

  const activeId = assessmentId || (assessments[0] as any)?.id;
  const { data: stats = [], isLoading } = useQuestionAnalytics(activeId);

  const summary = useMemo(() => {
    if (!stats.length) return null;
    const withAttempts = stats.filter(s => s.totalAttempts > 0);
    const easy = stats.filter(s => s.difficulty === "easy").length;
    const medium = stats.filter(s => s.difficulty === "medium").length;
    const hard = stats.filter(s => s.difficulty === "hard").length;
    const veryHard = stats.filter(s => s.difficulty === "very-hard").length;
    const avgDifficulty = withAttempts.length
      ? Math.round(withAttempts.reduce((a, s) => a + s.difficultyIndex, 0) / withAttempts.length)
      : 0;
    return { easy, medium, hard, veryHard, avgDifficulty, totalQuestions: stats.length, answeredQuestions: withAttempts.length };
  }, [stats]);

  const mostMissed = useMemo(
    () => stats.filter(s => s.totalAttempts > 0).slice(0, 5),
    [stats]
  );
  const easiest = useMemo(
    () => [...stats].filter(s => s.totalAttempts > 0).sort((a, b) => b.difficultyIndex - a.difficultyIndex).slice(0, 5),
    [stats]
  );

  const chartData = stats.filter(s => s.totalAttempts > 0).map((s, i) => ({
    name: `Q${i + 1}`,
    difficulty: s.difficultyIndex,
    fill: s.difficulty === "easy" ? "hsl(var(--success))" :
          s.difficulty === "medium" ? "hsl(var(--info))" :
          s.difficulty === "hard" ? "hsl(var(--warning))" :
          "hsl(var(--destructive))",
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Item Analysis</h3>
        <Select value={activeId || ""} onValueChange={setAssessmentId}>
          <SelectTrigger className="w-64 h-8 text-xs">
            <SelectValue placeholder="Select assessment" />
          </SelectTrigger>
          <SelectContent>
            {assessments.map((a: any) => (
              <SelectItem key={a.id} value={a.id} className="text-xs">{a.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!activeId ? (
        <div className="bg-card rounded-xl p-12 text-center border border-border/50">
          <Target className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
          <p className="text-xs text-muted-foreground">Select an assessment to see question-level analytics.</p>
        </div>
      ) : isLoading ? (
        <Skeleton className="h-72 rounded-xl" />
      ) : !stats.length ? (
        <div className="bg-card rounded-xl p-12 text-center border border-border/50">
          <AlertCircle className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
          <p className="text-xs text-muted-foreground">No questions found for this assessment.</p>
        </div>
      ) : (
        <>
          {summary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Avg Difficulty", value: `${summary.avgDifficulty}%`, hint: "% correct" },
                { label: "Easy", value: summary.easy, hint: "≥80% correct" },
                { label: "Hard", value: summary.hard + summary.veryHard, hint: "<50% correct" },
                { label: "With Data", value: `${summary.answeredQuestions}/${summary.totalQuestions}`, hint: "questions answered" },
              ].map(s => (
                <div key={s.label} className="bg-card rounded-xl p-4 shadow-card border border-border/50">
                  <p className="text-lg font-bold text-foreground">{s.value}</p>
                  <p className="text-[10px] text-muted-foreground">{s.label}</p>
                  <p className="text-[9px] text-muted-foreground/70">{s.hint}</p>
                </div>
              ))}
            </div>
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Difficulty Distribution</CardTitle>
            </CardHeader>
            <CardContent className="h-64">
              {chartData.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center pt-16">No response data yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} label={{ value: "% correct", angle: -90, position: "insideLeft", style: { fontSize: 10 } }} />
                    <Tooltip />
                    <Bar dataKey="difficulty" radius={[4, 4, 0, 0]}>
                      {chartData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-destructive" /> Most-Missed Questions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {mostMissed.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No data</p>
                ) : mostMissed.map((q, i) => (
                  <div key={q.questionId} className="p-2 rounded-lg bg-destructive/5 border border-destructive/10">
                    <div className="flex items-start gap-2">
                      <span className="text-[10px] text-muted-foreground font-mono shrink-0">Q{i + 1}</span>
                      <p className="text-xs text-foreground flex-1 line-clamp-2">{q.questionText}</p>
                      <Badge variant="outline" className="text-[9px] shrink-0">{q.questionType}</Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Progress value={q.difficultyIndex} className="h-1 flex-1" />
                      <span className={cn("text-[10px] font-semibold", q.difficultyIndex < 25 ? "text-destructive" : "text-warning")}>
                        {q.difficultyIndex}%
                      </span>
                      <span className="text-[9px] text-muted-foreground">({q.totalAttempts})</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-success" /> Easiest Questions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {easiest.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No data</p>
                ) : easiest.map((q, i) => (
                  <div key={q.questionId} className="p-2 rounded-lg bg-success/5 border border-success/10">
                    <div className="flex items-start gap-2">
                      <span className="text-[10px] text-muted-foreground font-mono shrink-0">Q{i + 1}</span>
                      <p className="text-xs text-foreground flex-1 line-clamp-2">{q.questionText}</p>
                      <Badge variant="outline" className="text-[9px] shrink-0">{q.questionType}</Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Progress value={q.difficultyIndex} className="h-1 flex-1" />
                      <span className="text-[10px] font-semibold text-success">{q.difficultyIndex}%</span>
                      <span className="text-[9px] text-muted-foreground">({q.totalAttempts})</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
