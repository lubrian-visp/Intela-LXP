import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Star, Send } from "lucide-react";

interface ReflectionSubmissionPanelProps {
  attemptId: string;
  onSubmit: (input: {
    reflection_text: string;
    changes_cited?: string;
    reasoning_depth?: string;
    learning_objectives_connection?: string;
  }) => void;
  isSubmitting: boolean;
}

export function ReflectionSubmissionPanel({ attemptId, onSubmit, isSubmitting }: ReflectionSubmissionPanelProps) {
  const [reflectionText, setReflectionText] = useState("");
  const [changesCited, setChangesCited] = useState("");
  const [reasoningDepth, setReasoningDepth] = useState("");
  const [objectivesConnection, setObjectivesConnection] = useState("");

  const handleSubmit = () => {
    onSubmit({
      reflection_text: reflectionText,
      changes_cited: changesCited || undefined,
      reasoning_depth: reasoningDepth || undefined,
      learning_objectives_connection: objectivesConnection || undefined,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Star className="w-5 h-5 text-purple-500" />
          Phase 3: Reflection
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Reflect on your learning journey. Your reflection will be scored on specificity, reasoning depth, and connection to learning objectives.
        </p>

        <div className="space-y-2">
          <Label className="text-sm">Overall Reflection *</Label>
          <Textarea
            value={reflectionText}
            onChange={(e) => setReflectionText(e.target.value)}
            placeholder="What did you learn from this activity? How did the AI guidance change your approach?"
            rows={5}
            className="text-sm"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm">Specific Changes Made</Label>
          <Textarea
            value={changesCited}
            onChange={(e) => setChangesCited(e.target.value)}
            placeholder="What specific changes did you make to your initial attempt? Why?"
            rows={3}
            className="text-sm"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm">Reasoning & Decision-Making</Label>
          <Textarea
            value={reasoningDepth}
            onChange={(e) => setReasoningDepth(e.target.value)}
            placeholder="Explain your thought process. What decisions did you make and why?"
            rows={3}
            className="text-sm"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm">Connection to Learning Objectives</Label>
          <Textarea
            value={objectivesConnection}
            onChange={(e) => setObjectivesConnection(e.target.value)}
            placeholder="How does this connect to broader learning goals or real-world applications?"
            rows={3}
            className="text-sm"
          />
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!reflectionText.trim() || isSubmitting}
          className="w-full"
        >
          <Send className="w-4 h-4 mr-1" />
          {isSubmitting ? "Scoring Reflection..." : "Submit Reflection"}
        </Button>
      </CardContent>
    </Card>
  );
}
