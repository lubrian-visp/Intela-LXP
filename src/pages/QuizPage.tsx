import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import EnhancedQuizTaker from "@/components/quiz/EnhancedQuizTaker";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function QuizPage() {
  const { assessmentId }    = useParams<{ assessmentId: string }>();
  const [searchParams]      = useSearchParams();
  const navigate            = useNavigate();

  // enrolmentId passed from LearnerAssessments via ?enrolmentId=xxx
  const enrolmentId = searchParams.get("enrolmentId") ?? undefined;

  const { data: assessment, isLoading } = useQuery({
    queryKey: ["assessment-detail", assessmentId],
    enabled: !!assessmentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessments")
        .select("*")
        .eq("id", assessmentId!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  usePageTitle(assessment?.title ?? "Assessment", "Learner Portal");

  if (isLoading) {
    return <Skeleton className="h-96 rounded-xl" />;
  }

  if (!assessment) {
    return (
      <div className="text-center py-20">
        <p className="text-sm text-muted-foreground">Assessment not found.</p>
        <Button variant="outline" size="sm" onClick={() => navigate(-1)} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-1" /> Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-3 h-3" /> Back to My Assessments
      </button>

      <EnhancedQuizTaker
        assessmentId={assessment.id}
        assessmentTitle={assessment.title}
        enrolmentId={enrolmentId}        {/* ← now properly wired */}
        onComplete={() => {}}
        onClose={() => navigate("/learner/assessments")}
      />
    </div>
  );
}
