import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PeerReviewAssignment {
  id: string;
  assessment_id: string;
  reviewer_id: string;
  reviewee_id: string;
  submission_id: string | null;
  status: string;
  due_date: string | null;
  assigned_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PeerReview {
  id: string;
  assignment_id: string;
  reviewer_id: string;
  score: number | null;
  feedback: string | null;
  rubric_scores: any;
  is_anonymous: boolean;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Fetch peer review assignments for an assessment */
export function usePeerReviewAssignments(assessmentId: string | undefined) {
  return useQuery({
    queryKey: ["peer_review_assignments", assessmentId],
    enabled: !!assessmentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("peer_review_assignments")
        .select("*")
        .eq("assessment_id", assessmentId!)
        .order("created_at");
      if (error) throw error;
      return data as PeerReviewAssignment[];
    },
  });
}

/** Fetch peer review assignments for current user as reviewer */
export function useMyPeerReviewAssignments() {
  return useQuery({
    queryKey: ["my_peer_review_assignments"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from("peer_review_assignments")
        .select("*")
        .eq("reviewer_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as PeerReviewAssignment[];
    },
  });
}

/** Create peer review assignments (bulk) */
export function useCreatePeerReviewAssignments() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      assessment_id: string;
      pairs: { reviewer_id: string; reviewee_id: string; submission_id?: string }[];
      due_date?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const rows = input.pairs.map((p) => ({
        assessment_id: input.assessment_id,
        reviewer_id: p.reviewer_id,
        reviewee_id: p.reviewee_id,
        submission_id: p.submission_id || null,
        due_date: input.due_date || null,
        assigned_by: user?.id || null,
      }));
      const { data, error } = await supabase
        .from("peer_review_assignments")
        .insert(rows)
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["peer_review_assignments", vars.assessment_id] });
      toast.success(`${_.length} peer review assignments created`);
    },
    onError: (err: any) => toast.error(err.message),
  });
}

/** Submit a peer review */
export function useSubmitPeerReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      assignment_id: string;
      score?: number;
      feedback?: string;
      rubric_scores?: any;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Insert the review
      const { data: review, error } = await supabase
        .from("peer_reviews")
        .insert({
          assignment_id: input.assignment_id,
          reviewer_id: user.id,
          score: input.score ?? null,
          feedback: input.feedback ?? null,
          rubric_scores: input.rubric_scores ?? [],
          submitted_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (error) throw error;

      // Update assignment status
      await supabase
        .from("peer_review_assignments")
        .update({ status: "completed" })
        .eq("id", input.assignment_id);

      return review;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my_peer_review_assignments"] });
      qc.invalidateQueries({ queryKey: ["peer_review_assignments"] });
      qc.invalidateQueries({ queryKey: ["peer_reviews"] });
      toast.success("Peer review submitted");
    },
    onError: (err: any) => toast.error(err.message),
  });
}

/** Fetch peer reviews for an assignment */
export function usePeerReviews(assignmentId: string | undefined) {
  return useQuery({
    queryKey: ["peer_reviews", assignmentId],
    enabled: !!assignmentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("peer_reviews")
        .select("*")
        .eq("assignment_id", assignmentId!)
        .order("created_at");
      if (error) throw error;
      return data as PeerReview[];
    },
  });
}

/** Auto-assign peer reviews using round-robin */
export function useAutoAssignPeerReviews() {
  const createAssignments = useCreatePeerReviewAssignments();
  return useMutation({
    mutationFn: async (input: {
      assessment_id: string;
      learner_ids: string[];
      reviews_per_learner: number;
      due_date?: string;
    }) => {
      const { learner_ids, reviews_per_learner } = input;
      if (learner_ids.length < 2) throw new Error("Need at least 2 learners for peer review");

      const pairs: { reviewer_id: string; reviewee_id: string }[] = [];
      const n = learner_ids.length;

      for (let i = 0; i < n; i++) {
        for (let j = 1; j <= Math.min(reviews_per_learner, n - 1); j++) {
          const reviewerIdx = i;
          const revieweeIdx = (i + j) % n;
          pairs.push({
            reviewer_id: learner_ids[reviewerIdx],
            reviewee_id: learner_ids[revieweeIdx],
          });
        }
      }

      return createAssignments.mutateAsync({
        assessment_id: input.assessment_id,
        pairs,
        due_date: input.due_date,
      });
    },
  });
}
