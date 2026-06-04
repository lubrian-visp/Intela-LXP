export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activity_grades: {
        Row: {
          activity_date: string
          activity_title: string
          activity_type: string
          cohort_id: string | null
          created_at: string
          enrolment_id: string | null
          evidence_url: string | null
          feedback: string | null
          id: string
          learner_id: string
          max_score: number
          moderated_at: string | null
          moderated_by: string | null
          moderation_notes: string | null
          moderation_status: string
          programme_id: string | null
          recorded_at: string
          recorded_by: string
          score: number | null
          status: string
          updated_at: string
          weighting: number
        }
        Insert: {
          activity_date?: string
          activity_title: string
          activity_type: string
          cohort_id?: string | null
          created_at?: string
          enrolment_id?: string | null
          evidence_url?: string | null
          feedback?: string | null
          id?: string
          learner_id: string
          max_score?: number
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_notes?: string | null
          moderation_status?: string
          programme_id?: string | null
          recorded_at?: string
          recorded_by: string
          score?: number | null
          status?: string
          updated_at?: string
          weighting?: number
        }
        Update: {
          activity_date?: string
          activity_title?: string
          activity_type?: string
          cohort_id?: string | null
          created_at?: string
          enrolment_id?: string | null
          evidence_url?: string | null
          feedback?: string | null
          id?: string
          learner_id?: string
          max_score?: number
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_notes?: string | null
          moderation_status?: string
          programme_id?: string | null
          recorded_at?: string
          recorded_by?: string
          score?: number | null
          status?: string
          updated_at?: string
          weighting?: number
        }
        Relationships: [
          {
            foreignKeyName: "activity_grades_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_grades_enrolment_id_fkey"
            columns: ["enrolment_id"]
            isOneToOne: false
            referencedRelation: "enrolments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_grades_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "programmes"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_access_tokens: {
        Row: {
          attempt_id: string
          created_at: string
          expires_at: string
          id: string
          is_revoked: boolean
          issued_at: string
          last_used_at: string | null
          learner_id: string
          max_usage: number
          revocation_reason: string | null
          revoked_at: string | null
          token_hash: string
          usage_count: number
        }
        Insert: {
          attempt_id: string
          created_at?: string
          expires_at: string
          id?: string
          is_revoked?: boolean
          issued_at?: string
          last_used_at?: string | null
          learner_id: string
          max_usage?: number
          revocation_reason?: string | null
          revoked_at?: string | null
          token_hash: string
          usage_count?: number
        }
        Update: {
          attempt_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          is_revoked?: boolean
          issued_at?: string
          last_used_at?: string | null
          learner_id?: string
          max_usage?: number
          revocation_reason?: string | null
          revoked_at?: string | null
          token_hash?: string
          usage_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "ai_access_tokens_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "ai_learning_attempts"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_adaptive_history: {
        Row: {
          action_applied: Json
          attempt_id: string
          created_at: string
          id: string
          learner_id: string
          rule_id: string
          triggered_metric: string
          triggered_value: number
        }
        Insert: {
          action_applied?: Json
          attempt_id: string
          created_at?: string
          id?: string
          learner_id: string
          rule_id: string
          triggered_metric: string
          triggered_value: number
        }
        Update: {
          action_applied?: Json
          attempt_id?: string
          created_at?: string
          id?: string
          learner_id?: string
          rule_id?: string
          triggered_metric?: string
          triggered_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "ai_adaptive_history_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "ai_learning_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_adaptive_history_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "ai_adaptive_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_adaptive_rules: {
        Row: {
          action_params: Json
          action_type: string
          condition_metric: string
          condition_operator: string
          condition_threshold: number
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          priority: number
          rule_key: string
          rule_name: string
          updated_at: string
        }
        Insert: {
          action_params?: Json
          action_type: string
          condition_metric: string
          condition_operator?: string
          condition_threshold: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          priority?: number
          rule_key: string
          rule_name: string
          updated_at?: string
        }
        Update: {
          action_params?: Json
          action_type?: string
          condition_metric?: string
          condition_operator?: string
          condition_threshold?: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          priority?: number
          rule_key?: string
          rule_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_interaction_logs: {
        Row: {
          accepted_without_change: boolean | null
          attempt_id: string
          created_at: string
          id: string
          interaction_duration_seconds: number | null
          learner_id: string
          model_used: string | null
          request_prompt: string
          response_text: string
          suggestion_accepted: boolean | null
          suggestion_improved: boolean | null
          tokens_used: number | null
          was_bad_suggestion: boolean | null
        }
        Insert: {
          accepted_without_change?: boolean | null
          attempt_id: string
          created_at?: string
          id?: string
          interaction_duration_seconds?: number | null
          learner_id: string
          model_used?: string | null
          request_prompt: string
          response_text: string
          suggestion_accepted?: boolean | null
          suggestion_improved?: boolean | null
          tokens_used?: number | null
          was_bad_suggestion?: boolean | null
        }
        Update: {
          accepted_without_change?: boolean | null
          attempt_id?: string
          created_at?: string
          id?: string
          interaction_duration_seconds?: number | null
          learner_id?: string
          model_used?: string | null
          request_prompt?: string
          response_text?: string
          suggestion_accepted?: boolean | null
          suggestion_improved?: boolean | null
          tokens_used?: number | null
          was_bad_suggestion?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_interaction_logs_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "ai_learning_attempts"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_learning_attempts: {
        Row: {
          ads_acceptance_score: number | null
          ads_frequency_score: number | null
          ads_timing_score: number | null
          ai_access_level: number
          ai_dependency_score: number | null
          ai_interaction_count: number | null
          ai_phase_started_at: string | null
          assessment_id: string | null
          attempt_quality_score: number | null
          completed_at: string | null
          composite_score: number | null
          content_block_id: string | null
          created_at: string
          current_phase: string
          decision_quality_score: number | null
          dqs_blind_penalty: number | null
          dqs_critique_score: number | null
          dqs_improvement_delta: number | null
          id: string
          initial_attempt_submitted_at: string | null
          initial_attempt_text: string | null
          is_ai_enabled: boolean
          learner_id: string
          phase_gate_reason: string | null
          programme_id: string | null
          rds_error_identification: number | null
          rds_reasoning_quality: number | null
          rds_relevance_score: number | null
          reflection_depth_score: number | null
          reflection_started_at: string | null
          revised_solution_submitted_at: string | null
          revised_solution_text: string | null
          time_spent_seconds: number | null
          updated_at: string
        }
        Insert: {
          ads_acceptance_score?: number | null
          ads_frequency_score?: number | null
          ads_timing_score?: number | null
          ai_access_level?: number
          ai_dependency_score?: number | null
          ai_interaction_count?: number | null
          ai_phase_started_at?: string | null
          assessment_id?: string | null
          attempt_quality_score?: number | null
          completed_at?: string | null
          composite_score?: number | null
          content_block_id?: string | null
          created_at?: string
          current_phase?: string
          decision_quality_score?: number | null
          dqs_blind_penalty?: number | null
          dqs_critique_score?: number | null
          dqs_improvement_delta?: number | null
          id?: string
          initial_attempt_submitted_at?: string | null
          initial_attempt_text?: string | null
          is_ai_enabled?: boolean
          learner_id: string
          phase_gate_reason?: string | null
          programme_id?: string | null
          rds_error_identification?: number | null
          rds_reasoning_quality?: number | null
          rds_relevance_score?: number | null
          reflection_depth_score?: number | null
          reflection_started_at?: string | null
          revised_solution_submitted_at?: string | null
          revised_solution_text?: string | null
          time_spent_seconds?: number | null
          updated_at?: string
        }
        Update: {
          ads_acceptance_score?: number | null
          ads_frequency_score?: number | null
          ads_timing_score?: number | null
          ai_access_level?: number
          ai_dependency_score?: number | null
          ai_interaction_count?: number | null
          ai_phase_started_at?: string | null
          assessment_id?: string | null
          attempt_quality_score?: number | null
          completed_at?: string | null
          composite_score?: number | null
          content_block_id?: string | null
          created_at?: string
          current_phase?: string
          decision_quality_score?: number | null
          dqs_blind_penalty?: number | null
          dqs_critique_score?: number | null
          dqs_improvement_delta?: number | null
          id?: string
          initial_attempt_submitted_at?: string | null
          initial_attempt_text?: string | null
          is_ai_enabled?: boolean
          learner_id?: string
          phase_gate_reason?: string | null
          programme_id?: string | null
          rds_error_identification?: number | null
          rds_reasoning_quality?: number | null
          rds_relevance_score?: number | null
          reflection_depth_score?: number | null
          reflection_started_at?: string | null
          revised_solution_submitted_at?: string | null
          revised_solution_text?: string | null
          time_spent_seconds?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_learning_attempts_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_learning_attempts_content_block_id_fkey"
            columns: ["content_block_id"]
            isOneToOne: false
            referencedRelation: "content_blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_learning_attempts_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "programmes"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_reflections: {
        Row: {
          ai_scored_rds: number | null
          ai_scoring_rationale: string | null
          attempt_id: string
          changes_cited: string | null
          created_at: string
          id: string
          is_validated: boolean | null
          learner_id: string
          learning_objectives_connection: string | null
          reasoning_depth: string | null
          reflection_text: string
          submitted_at: string
          updated_at: string
        }
        Insert: {
          ai_scored_rds?: number | null
          ai_scoring_rationale?: string | null
          attempt_id: string
          changes_cited?: string | null
          created_at?: string
          id?: string
          is_validated?: boolean | null
          learner_id: string
          learning_objectives_connection?: string | null
          reasoning_depth?: string | null
          reflection_text: string
          submitted_at?: string
          updated_at?: string
        }
        Update: {
          ai_scored_rds?: number | null
          ai_scoring_rationale?: string | null
          attempt_id?: string
          changes_cited?: string | null
          created_at?: string
          id?: string
          is_validated?: boolean | null
          learner_id?: string
          learning_objectives_connection?: string | null
          reasoning_depth?: string | null
          reflection_text?: string
          submitted_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_reflections_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "ai_learning_attempts"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_scoring_config: {
        Row: {
          config_key: string
          config_value: Json
          created_at: string
          description: string | null
          id: string
          updated_at: string
        }
        Insert: {
          config_key: string
          config_value?: Json
          created_at?: string
          description?: string | null
          id?: string
          updated_at?: string
        }
        Update: {
          config_key?: string
          config_value?: Json
          created_at?: string
          description?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      announcement_reads: {
        Row: {
          announcement_id: string
          id: string
          read_at: string
          user_id: string
        }
        Insert: {
          announcement_id: string
          id?: string
          read_at?: string
          user_id: string
        }
        Update: {
          announcement_id?: string
          id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_reads_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          author_id: string
          body: string
          created_at: string
          expires_at: string | null
          id: string
          is_published: boolean
          priority: string
          published_at: string | null
          scope_id: string | null
          scope_type: string
          tenant_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_published?: boolean
          priority?: string
          published_at?: string | null
          scope_id?: string | null
          scope_type?: string
          tenant_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_published?: boolean
          priority?: string
          published_at?: string | null
          scope_id?: string | null
          scope_type?: string
          tenant_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_routing_rules: {
        Row: {
          approver_role: string | null
          approver_user_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          rule_name: string
          scope_type: string
          scope_value: string | null
          step_order: number
          updated_at: string
        }
        Insert: {
          approver_role?: string | null
          approver_user_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          rule_name: string
          scope_type?: string
          scope_value?: string | null
          step_order?: number
          updated_at?: string
        }
        Update: {
          approver_role?: string | null
          approver_user_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          rule_name?: string
          scope_type?: string
          scope_value?: string | null
          step_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      approval_tasks: {
        Row: {
          assigned_role: string | null
          assigned_to: string | null
          created_at: string
          decided_at: string | null
          decided_by: string | null
          description: string | null
          id: string
          notes: string | null
          reference_id: string
          reference_table: string
          requested_by: string | null
          status: string
          task_type: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_role?: string | null
          assigned_to?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          description?: string | null
          id?: string
          notes?: string | null
          reference_id: string
          reference_table: string
          requested_by?: string | null
          status?: string
          task_type: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_role?: string | null
          assigned_to?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          description?: string | null
          id?: string
          notes?: string | null
          reference_id?: string
          reference_table?: string
          requested_by?: string | null
          status?: string
          task_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      assessment_links: {
        Row: {
          assessment_id: string
          created_at: string
          created_by: string | null
          id: string
          is_inherited: boolean
          lesson_id: string | null
          link_type: string
          module_id: string | null
          pathway_id: string | null
          updated_at: string
        }
        Insert: {
          assessment_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_inherited?: boolean
          lesson_id?: string | null
          link_type?: string
          module_id?: string | null
          pathway_id?: string | null
          updated_at?: string
        }
        Update: {
          assessment_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_inherited?: boolean
          lesson_id?: string | null
          link_type?: string
          module_id?: string | null
          pathway_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_links_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_links_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_links_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "programme_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_links_pathway_id_fkey"
            columns: ["pathway_id"]
            isOneToOne: false
            referencedRelation: "pathways"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_prerequisites: {
        Row: {
          assessment_id: string
          created_at: string
          id: string
          min_score: number | null
          prerequisite_assessment_id: string | null
          prerequisite_module_id: string | null
          prerequisite_type: string
        }
        Insert: {
          assessment_id: string
          created_at?: string
          id?: string
          min_score?: number | null
          prerequisite_assessment_id?: string | null
          prerequisite_module_id?: string | null
          prerequisite_type?: string
        }
        Update: {
          assessment_id?: string
          created_at?: string
          id?: string
          min_score?: number | null
          prerequisite_assessment_id?: string | null
          prerequisite_module_id?: string | null
          prerequisite_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_prerequisites_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_prerequisites_prerequisite_assessment_id_fkey"
            columns: ["prerequisite_assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_prerequisites_prerequisite_module_id_fkey"
            columns: ["prerequisite_module_id"]
            isOneToOne: false
            referencedRelation: "programme_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_rubrics: {
        Row: {
          assessment_id: string
          created_at: string
          id: string
          rubric_id: string
        }
        Insert: {
          assessment_id: string
          created_at?: string
          id?: string
          rubric_id: string
        }
        Update: {
          assessment_id?: string
          created_at?: string
          id?: string
          rubric_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_rubrics_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_rubrics_rubric_id_fkey"
            columns: ["rubric_id"]
            isOneToOne: false
            referencedRelation: "rubrics"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_settings: {
        Row: {
          access_code: string | null
          allow_backtracking: boolean
          assessment_id: string
          attempts_allowed: number | null
          availability_end: string | null
          availability_start: string | null
          created_at: string
          display_mode: string
          feedback_release: string
          id: string
          ip_restrictions: string[] | null
          randomise_options: boolean
          randomise_questions: boolean
          require_lockdown_browser: boolean
          show_correct_answers: boolean
          show_question_flagging: boolean
          time_limit_minutes: number | null
          updated_at: string
        }
        Insert: {
          access_code?: string | null
          allow_backtracking?: boolean
          assessment_id: string
          attempts_allowed?: number | null
          availability_end?: string | null
          availability_start?: string | null
          created_at?: string
          display_mode?: string
          feedback_release?: string
          id?: string
          ip_restrictions?: string[] | null
          randomise_options?: boolean
          randomise_questions?: boolean
          require_lockdown_browser?: boolean
          show_correct_answers?: boolean
          show_question_flagging?: boolean
          time_limit_minutes?: number | null
          updated_at?: string
        }
        Update: {
          access_code?: string | null
          allow_backtracking?: boolean
          assessment_id?: string
          attempts_allowed?: number | null
          availability_end?: string | null
          availability_start?: string | null
          created_at?: string
          display_mode?: string
          feedback_release?: string
          id?: string
          ip_restrictions?: string[] | null
          randomise_options?: boolean
          randomise_questions?: boolean
          require_lockdown_browser?: boolean
          show_correct_answers?: boolean
          show_question_flagging?: boolean
          time_limit_minutes?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_settings_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: true
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_submissions: {
        Row: {
          assessed_at: string | null
          assessment_id: string
          assessor_id: string | null
          created_at: string
          enrolment_id: string | null
          feedback: string | null
          id: string
          learner_id: string
          moderated_at: string | null
          moderation_notes: string | null
          moderation_status: string
          moderator_id: string | null
          score: number | null
          selected_question_ids: Json
          status: string
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          assessed_at?: string | null
          assessment_id: string
          assessor_id?: string | null
          created_at?: string
          enrolment_id?: string | null
          feedback?: string | null
          id?: string
          learner_id: string
          moderated_at?: string | null
          moderation_notes?: string | null
          moderation_status?: string
          moderator_id?: string | null
          score?: number | null
          selected_question_ids?: Json
          status?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          assessed_at?: string | null
          assessment_id?: string
          assessor_id?: string | null
          created_at?: string
          enrolment_id?: string | null
          feedback?: string | null
          id?: string
          learner_id?: string
          moderated_at?: string | null
          moderation_notes?: string | null
          moderation_status?: string
          moderator_id?: string | null
          score?: number | null
          selected_question_ids?: Json
          status?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_submissions_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_submissions_enrolment_id_fkey"
            columns: ["enrolment_id"]
            isOneToOne: false
            referencedRelation: "enrolments"
            referencedColumns: ["id"]
          },
        ]
      }
      assessments: {
        Row: {
          assessment_category: string
          assessment_type: string
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          learning_outcomes: Json
          max_score: number | null
          module_id: string | null
          pass_mark: number | null
          programme_id: string
          published_at: string | null
          published_by: string | null
          requires_moderation: boolean
          status: string
          tenant_id: string | null
          title: string
          updated_at: string
          weighting: number | null
        }
        Insert: {
          assessment_category?: string
          assessment_type?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          learning_outcomes?: Json
          max_score?: number | null
          module_id?: string | null
          pass_mark?: number | null
          programme_id: string
          published_at?: string | null
          published_by?: string | null
          requires_moderation?: boolean
          status?: string
          tenant_id?: string | null
          title: string
          updated_at?: string
          weighting?: number | null
        }
        Update: {
          assessment_category?: string
          assessment_type?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          learning_outcomes?: Json
          max_score?: number | null
          module_id?: string | null
          pass_mark?: number | null
          programme_id?: string
          published_at?: string | null
          published_by?: string | null
          requires_moderation?: boolean
          status?: string
          tenant_id?: string | null
          title?: string
          updated_at?: string
          weighting?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "assessments_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "programme_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "programmes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      assessor_reliability_metrics: {
        Row: {
          agreement_rate: number | null
          assessor_id: string
          average_score: number | null
          calculated_at: string
          cohens_kappa: number | null
          consistency_rating: string
          created_at: string
          deviation_from_mean: number | null
          id: string
          programme_id: string | null
          standard_deviation: number | null
          total_graded: number
          updated_at: string
        }
        Insert: {
          agreement_rate?: number | null
          assessor_id: string
          average_score?: number | null
          calculated_at?: string
          cohens_kappa?: number | null
          consistency_rating?: string
          created_at?: string
          deviation_from_mean?: number | null
          id?: string
          programme_id?: string | null
          standard_deviation?: number | null
          total_graded?: number
          updated_at?: string
        }
        Update: {
          agreement_rate?: number | null
          assessor_id?: string
          average_score?: number | null
          calculated_at?: string
          cohens_kappa?: number | null
          consistency_rating?: string
          created_at?: string
          deviation_from_mean?: number | null
          id?: string
          programme_id?: string | null
          standard_deviation?: number | null
          total_graded?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessor_reliability_metrics_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "programmes"
            referencedColumns: ["id"]
          },
        ]
      }
      assessor_report_template_versions: {
        Row: {
          change_reason: string | null
          changed_by: string | null
          created_at: string
          id: string
          section2_criteria: Json
          section3_criteria: Json
          template_id: string
          version_number: number
        }
        Insert: {
          change_reason?: string | null
          changed_by?: string | null
          created_at?: string
          id?: string
          section2_criteria?: Json
          section3_criteria?: Json
          template_id: string
          version_number?: number
        }
        Update: {
          change_reason?: string | null
          changed_by?: string | null
          created_at?: string
          id?: string
          section2_criteria?: Json
          section3_criteria?: Json
          template_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "assessor_report_template_versions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "assessor_report_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      assessor_report_templates: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          programme_id: string | null
          scope_level: string
          section2_criteria: Json
          section3_criteria: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          programme_id?: string | null
          scope_level?: string
          section2_criteria?: Json
          section3_criteria?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          programme_id?: string | null
          scope_level?: string
          section2_criteria?: Json
          section3_criteria?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessor_report_templates_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "programmes"
            referencedColumns: ["id"]
          },
        ]
      }
      assessor_reports: {
        Row: {
          admin_signature_date: string | null
          assessor_id: string
          assessor_name: string | null
          assessor_signature_date: string | null
          client_name: string | null
          cohort_id: string | null
          created_at: string
          end_date: string | null
          id: string
          learner_id: string | null
          module_us_covered: string | null
          programme_id: string
          programme_name: string | null
          report_mode: string
          section2_criteria: Json | null
          section2_problems: string | null
          section2_strengths: string | null
          section3_criteria: Json | null
          section3_evidence: string | null
          section3_problems: string | null
          section3_recommendations: string | null
          section3_strengths: string | null
          section4_learners: Json | null
          section5_conflicts: string | null
          section5_declaration: string | null
          section5_difficulties: string | null
          section5_mentor_update: string | null
          start_date: string | null
          status: string
          submission_date: string | null
          updated_at: string
          venue: string | null
        }
        Insert: {
          admin_signature_date?: string | null
          assessor_id: string
          assessor_name?: string | null
          assessor_signature_date?: string | null
          client_name?: string | null
          cohort_id?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          learner_id?: string | null
          module_us_covered?: string | null
          programme_id: string
          programme_name?: string | null
          report_mode?: string
          section2_criteria?: Json | null
          section2_problems?: string | null
          section2_strengths?: string | null
          section3_criteria?: Json | null
          section3_evidence?: string | null
          section3_problems?: string | null
          section3_recommendations?: string | null
          section3_strengths?: string | null
          section4_learners?: Json | null
          section5_conflicts?: string | null
          section5_declaration?: string | null
          section5_difficulties?: string | null
          section5_mentor_update?: string | null
          start_date?: string | null
          status?: string
          submission_date?: string | null
          updated_at?: string
          venue?: string | null
        }
        Update: {
          admin_signature_date?: string | null
          assessor_id?: string
          assessor_name?: string | null
          assessor_signature_date?: string | null
          client_name?: string | null
          cohort_id?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          learner_id?: string | null
          module_us_covered?: string | null
          programme_id?: string
          programme_name?: string | null
          report_mode?: string
          section2_criteria?: Json | null
          section2_problems?: string | null
          section2_strengths?: string | null
          section3_criteria?: Json | null
          section3_evidence?: string | null
          section3_problems?: string | null
          section3_recommendations?: string | null
          section3_strengths?: string | null
          section4_learners?: Json | null
          section5_conflicts?: string | null
          section5_declaration?: string | null
          section5_difficulties?: string | null
          section5_mentor_update?: string | null
          start_date?: string | null
          status?: string
          submission_date?: string | null
          updated_at?: string
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assessor_reports_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessor_reports_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "programmes"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_findings: {
        Row: {
          assigned_to: string | null
          audit_id: string
          clause_reference: string | null
          closed_at: string | null
          closed_by: string | null
          corrective_action: string | null
          created_at: string
          description: string | null
          due_date: string | null
          evidence: string | null
          finding_type: string
          id: string
          root_cause: string | null
          severity: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          audit_id: string
          clause_reference?: string | null
          closed_at?: string | null
          closed_by?: string | null
          corrective_action?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          evidence?: string | null
          finding_type?: string
          id?: string
          root_cause?: string | null
          severity?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          audit_id?: string
          clause_reference?: string | null
          closed_at?: string | null
          closed_by?: string | null
          corrective_action?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          evidence?: string | null
          finding_type?: string
          id?: string
          root_cause?: string | null
          severity?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_findings_audit_id_fkey"
            columns: ["audit_id"]
            isOneToOne: false
            referencedRelation: "internal_audits"
            referencedColumns: ["id"]
          },
        ]
      }
      badges: {
        Row: {
          category: string
          color: string
          created_at: string
          criteria_type: string
          criteria_value: Json | null
          description: string | null
          icon: string
          id: string
          is_active: boolean
          name: string
          points_value: number
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          category?: string
          color?: string
          created_at?: string
          criteria_type?: string
          criteria_value?: Json | null
          description?: string | null
          icon?: string
          id?: string
          is_active?: boolean
          name: string
          points_value?: number
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          category?: string
          color?: string
          created_at?: string
          criteria_type?: string
          criteria_value?: Json | null
          description?: string | null
          icon?: string
          id?: string
          is_active?: boolean
          name?: string
          points_value?: number
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "badges_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "badges_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          payload: Json
          processed_at: string | null
          processing_error: string | null
          provider_event_id: string | null
          provider_key: string
          subscription_id: string | null
          tenant_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          payload: Json
          processed_at?: string | null
          processing_error?: string | null
          provider_event_id?: string | null
          provider_key: string
          subscription_id?: string | null
          tenant_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json
          processed_at?: string | null
          processing_error?: string | null
          provider_event_id?: string | null
          provider_key?: string
          subscription_id?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_events_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "tenant_subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_invoices: {
        Row: {
          amount_paid_minor: number
          created_at: string
          currency: string
          due_date: string | null
          hosted_invoice_url: string | null
          id: string
          invoice_number: string | null
          issued_at: string | null
          metadata: Json
          paid_at: string | null
          pdf_url: string | null
          provider_invoice_id: string | null
          provider_key: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          subscription_id: string | null
          subtotal_minor: number
          tax_minor: number
          tenant_id: string
          total_minor: number
          updated_at: string
        }
        Insert: {
          amount_paid_minor?: number
          created_at?: string
          currency: string
          due_date?: string | null
          hosted_invoice_url?: string | null
          id?: string
          invoice_number?: string | null
          issued_at?: string | null
          metadata?: Json
          paid_at?: string | null
          pdf_url?: string | null
          provider_invoice_id?: string | null
          provider_key?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subscription_id?: string | null
          subtotal_minor?: number
          tax_minor?: number
          tenant_id: string
          total_minor?: number
          updated_at?: string
        }
        Update: {
          amount_paid_minor?: number
          created_at?: string
          currency?: string
          due_date?: string | null
          hosted_invoice_url?: string | null
          id?: string
          invoice_number?: string | null
          issued_at?: string | null
          metadata?: Json
          paid_at?: string | null
          pdf_url?: string | null
          provider_invoice_id?: string | null
          provider_key?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subscription_id?: string | null
          subtotal_minor?: number
          tax_minor?: number
          tenant_id?: string
          total_minor?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_invoices_provider_key_fkey"
            columns: ["provider_key"]
            isOneToOne: false
            referencedRelation: "billing_providers"
            referencedColumns: ["provider_key"]
          },
          {
            foreignKeyName: "billing_invoices_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "tenant_subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_overage_rates: {
        Row: {
          created_at: string
          currency: string
          id: string
          is_active: boolean
          meter_key: string
          tier_id: string
          unit_amount_minor: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency: string
          id?: string
          is_active?: boolean
          meter_key: string
          tier_id: string
          unit_amount_minor: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          meter_key?: string
          tier_id?: string
          unit_amount_minor?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_overage_rates_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "billing_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_payment_attempts: {
        Row: {
          amount_minor: number
          created_at: string
          currency: string
          failure_reason: string | null
          id: string
          invoice_id: string | null
          metadata: Json
          provider_key: string | null
          provider_payment_id: string | null
          status: Database["public"]["Enums"]["payment_attempt_status"]
          subscription_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount_minor: number
          created_at?: string
          currency: string
          failure_reason?: string | null
          id?: string
          invoice_id?: string | null
          metadata?: Json
          provider_key?: string | null
          provider_payment_id?: string | null
          status?: Database["public"]["Enums"]["payment_attempt_status"]
          subscription_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount_minor?: number
          created_at?: string
          currency?: string
          failure_reason?: string | null
          id?: string
          invoice_id?: string | null
          metadata?: Json
          provider_key?: string | null
          provider_payment_id?: string | null
          status?: Database["public"]["Enums"]["payment_attempt_status"]
          subscription_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_payment_attempts_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "billing_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_payment_attempts_provider_key_fkey"
            columns: ["provider_key"]
            isOneToOne: false
            referencedRelation: "billing_providers"
            referencedColumns: ["provider_key"]
          },
          {
            foreignKeyName: "billing_payment_attempts_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "tenant_subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_payment_attempts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_payment_attempts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_providers: {
        Row: {
          config: Json
          created_at: string
          credential_schema: Json
          display_name: string
          gateway_type: string
          id: string
          is_available_to_tenants: boolean
          is_enabled: boolean
          logo_url: string | null
          provider_key: string
          setup_instructions: string | null
          sort_order: number
          supported_countries: string[]
          supported_currencies: string[]
          supports_one_time: boolean
          supports_subscriptions: boolean
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          credential_schema?: Json
          display_name: string
          gateway_type?: string
          id?: string
          is_available_to_tenants?: boolean
          is_enabled?: boolean
          logo_url?: string | null
          provider_key: string
          setup_instructions?: string | null
          sort_order?: number
          supported_countries?: string[]
          supported_currencies?: string[]
          supports_one_time?: boolean
          supports_subscriptions?: boolean
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          credential_schema?: Json
          display_name?: string
          gateway_type?: string
          id?: string
          is_available_to_tenants?: boolean
          is_enabled?: boolean
          logo_url?: string | null
          provider_key?: string
          setup_instructions?: string | null
          sort_order?: number
          supported_countries?: string[]
          supported_currencies?: string[]
          supports_one_time?: boolean
          supports_subscriptions?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      billing_routing_rules: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          match_country: string | null
          match_currency: string | null
          notes: string | null
          preferred_provider: string
          priority: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          match_country?: string | null
          match_currency?: string | null
          notes?: string | null
          preferred_provider: string
          priority?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          match_country?: string | null
          match_currency?: string | null
          notes?: string | null
          preferred_provider?: string
          priority?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_routing_rules_preferred_provider_fkey"
            columns: ["preferred_provider"]
            isOneToOne: false
            referencedRelation: "billing_providers"
            referencedColumns: ["provider_key"]
          },
        ]
      }
      billing_tier_prices: {
        Row: {
          billing_interval: Database["public"]["Enums"]["billing_interval"]
          created_at: string
          currency: string
          id: string
          is_active: boolean
          provider_price_refs: Json
          tier_id: string
          unit_amount_minor: number
          updated_at: string
        }
        Insert: {
          billing_interval: Database["public"]["Enums"]["billing_interval"]
          created_at?: string
          currency: string
          id?: string
          is_active?: boolean
          provider_price_refs?: Json
          tier_id: string
          unit_amount_minor: number
          updated_at?: string
        }
        Update: {
          billing_interval?: Database["public"]["Enums"]["billing_interval"]
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          provider_price_refs?: Json
          tier_id?: string
          unit_amount_minor?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_tier_prices_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "billing_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_tiers: {
        Row: {
          created_at: string
          description: string | null
          display_name: string
          id: string
          is_active: boolean
          is_default: boolean
          is_public: boolean
          limits: Json
          sort_order: number
          tier_key: string
          trial_days: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_name: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          is_public?: boolean
          limits?: Json
          sort_order?: number
          tier_key: string
          trial_days?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_name?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          is_public?: boolean
          limits?: Json
          sort_order?: number
          tier_key?: string
          trial_days?: number
          updated_at?: string
        }
        Relationships: []
      }
      billing_usage_events: {
        Row: {
          created_at: string
          id: string
          metadata: Json
          meter_key: string
          occurred_at: string
          quantity: number
          subscription_id: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json
          meter_key: string
          occurred_at?: string
          quantity?: number
          subscription_id?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json
          meter_key?: string
          occurred_at?: string
          quantity?: number
          subscription_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_usage_events_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "tenant_subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_usage_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_usage_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      certificate_templates: {
        Row: {
          accent_color: string | null
          background_color: string | null
          created_at: string
          created_by: string | null
          id: string
          is_default: boolean | null
          logo_url: string | null
          name: string
          programme_id: string | null
          programme_type_id: string | null
          signatory_name: string | null
          signatory_title: string | null
          template_html: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          accent_color?: string | null
          background_color?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_default?: boolean | null
          logo_url?: string | null
          name: string
          programme_id?: string | null
          programme_type_id?: string | null
          signatory_name?: string | null
          signatory_title?: string | null
          template_html?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          accent_color?: string | null
          background_color?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_default?: boolean | null
          logo_url?: string | null
          name?: string
          programme_id?: string | null
          programme_type_id?: string | null
          signatory_name?: string | null
          signatory_title?: string | null
          template_html?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificate_templates_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "programmes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificate_templates_programme_type_id_fkey"
            columns: ["programme_type_id"]
            isOneToOne: false
            referencedRelation: "programme_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificate_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificate_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_exam_attempts: {
        Row: {
          answers: Json | null
          completed_at: string | null
          created_at: string
          exam_id: string
          id: string
          learner_id: string
          passed: boolean | null
          score: number | null
          started_at: string
        }
        Insert: {
          answers?: Json | null
          completed_at?: string | null
          created_at?: string
          exam_id: string
          id?: string
          learner_id: string
          passed?: boolean | null
          score?: number | null
          started_at?: string
        }
        Update: {
          answers?: Json | null
          completed_at?: string | null
          created_at?: string
          exam_id?: string
          id?: string
          learner_id?: string
          passed?: boolean | null
          score?: number | null
          started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_exam_attempts_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "challenge_exams"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_exams: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          max_attempts: number | null
          on_fail_action: string | null
          on_pass_action: string | null
          passing_grade: number
          programme_id: string
          question_count: number | null
          question_pool_assessment_ids: string[] | null
          time_limit_minutes: number | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_attempts?: number | null
          on_fail_action?: string | null
          on_pass_action?: string | null
          passing_grade?: number
          programme_id: string
          question_count?: number | null
          question_pool_assessment_ids?: string[] | null
          time_limit_minutes?: number | null
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_attempts?: number | null
          on_fail_action?: string | null
          on_pass_action?: string | null
          passing_grade?: number
          programme_id?: string
          question_count?: number | null
          question_pool_assessment_ids?: string[] | null
          time_limit_minutes?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_exams_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "programmes"
            referencedColumns: ["id"]
          },
        ]
      }
      cms_menu_items: {
        Row: {
          created_at: string
          css_class: string | null
          external_url: string | null
          icon_name: string | null
          id: string
          is_active: boolean
          item_type: string
          label: string
          menu_id: string
          open_in_new_tab: boolean
          page_id: string | null
          parent_item_id: string | null
          sort_order: number
          target_path: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          css_class?: string | null
          external_url?: string | null
          icon_name?: string | null
          id?: string
          is_active?: boolean
          item_type?: string
          label: string
          menu_id: string
          open_in_new_tab?: boolean
          page_id?: string | null
          parent_item_id?: string | null
          sort_order?: number
          target_path?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          css_class?: string | null
          external_url?: string | null
          icon_name?: string | null
          id?: string
          is_active?: boolean
          item_type?: string
          label?: string
          menu_id?: string
          open_in_new_tab?: boolean
          page_id?: string | null
          parent_item_id?: string | null
          sort_order?: number
          target_path?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cms_menu_items_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "cms_menus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cms_menu_items_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "cms_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cms_menu_items_parent_item_id_fkey"
            columns: ["parent_item_id"]
            isOneToOne: false
            referencedRelation: "cms_menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      cms_menus: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
          sort_order: number
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cms_menus_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cms_menus_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      cms_page_blocks: {
        Row: {
          block_type: string
          config: Json | null
          content: Json | null
          created_at: string
          id: string
          is_visible: boolean
          page_id: string
          sort_order: number
          title: string | null
          updated_at: string
        }
        Insert: {
          block_type?: string
          config?: Json | null
          content?: Json | null
          created_at?: string
          id?: string
          is_visible?: boolean
          page_id: string
          sort_order?: number
          title?: string | null
          updated_at?: string
        }
        Update: {
          block_type?: string
          config?: Json | null
          content?: Json | null
          created_at?: string
          id?: string
          is_visible?: boolean
          page_id?: string
          sort_order?: number
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cms_page_blocks_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "cms_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      cms_pages: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_homepage: boolean
          is_published: boolean
          meta_description: string | null
          meta_title: string | null
          published_at: string | null
          slug: string
          tenant_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_homepage?: boolean
          is_published?: boolean
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          slug: string
          tenant_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_homepage?: boolean
          is_published?: boolean
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          slug?: string
          tenant_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cms_pages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cms_pages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      cms_role_menu_permissions: {
        Row: {
          created_at: string
          id: string
          is_visible: boolean
          menu_id: string | null
          menu_item_id: string | null
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_visible?: boolean
          menu_id?: string | null
          menu_item_id?: string | null
          role: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_visible?: boolean
          menu_id?: string | null
          menu_item_id?: string | null
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cms_role_menu_permissions_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "cms_menus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cms_role_menu_permissions_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "cms_menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      cohort_staff_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          cohort_id: string
          created_at: string
          id: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          cohort_id: string
          created_at?: string
          id?: string
          role: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          cohort_id?: string
          created_at?: string
          id?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cohort_staff_assignments_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
            referencedColumns: ["id"]
          },
        ]
      }
      cohorts: {
        Row: {
          archived_at: string | null
          archived_by: string | null
          code: string | null
          created_at: string
          end_date: string | null
          facilitator_id: string | null
          id: string
          max_learners: number | null
          name: string
          programme_id: string
          start_date: string | null
          status: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          archived_by?: string | null
          code?: string | null
          created_at?: string
          end_date?: string | null
          facilitator_id?: string | null
          id?: string
          max_learners?: number | null
          name: string
          programme_id: string
          start_date?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          archived_by?: string | null
          code?: string | null
          created_at?: string
          end_date?: string | null
          facilitator_id?: string | null
          id?: string
          max_learners?: number | null
          name?: string
          programme_id?: string
          start_date?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cohorts_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "programmes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cohorts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cohorts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_requirements: {
        Row: {
          created_at: string
          description: string | null
          frequency: string | null
          id: string
          is_mandatory: boolean
          mapping_id: string
          name: string
          requirement_type: string
          responsible_body_id: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          frequency?: string | null
          id?: string
          is_mandatory?: boolean
          mapping_id: string
          name: string
          requirement_type: string
          responsible_body_id?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          frequency?: string | null
          id?: string
          is_mandatory?: boolean
          mapping_id?: string
          name?: string
          requirement_type?: string
          responsible_body_id?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_requirements_mapping_id_fkey"
            columns: ["mapping_id"]
            isOneToOne: false
            referencedRelation: "programme_type_country_mappings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_requirements_responsible_body_id_fkey"
            columns: ["responsible_body_id"]
            isOneToOne: false
            referencedRelation: "regulatory_bodies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_requirements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_requirements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      content_blocks: {
        Row: {
          block_type: string
          content: Json | null
          created_at: string
          duration_minutes: number | null
          file_url: string | null
          id: string
          is_required: boolean
          lesson_id: string | null
          module_id: string
          sequence_order: number
          title: string
          updated_at: string
        }
        Insert: {
          block_type?: string
          content?: Json | null
          created_at?: string
          duration_minutes?: number | null
          file_url?: string | null
          id?: string
          is_required?: boolean
          lesson_id?: string | null
          module_id: string
          sequence_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          block_type?: string
          content?: Json | null
          created_at?: string
          duration_minutes?: number | null
          file_url?: string | null
          id?: string
          is_required?: boolean
          lesson_id?: string | null
          module_id?: string
          sequence_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_blocks_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_blocks_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "programme_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      content_comments: {
        Row: {
          body: string
          content_block_id: string | null
          created_at: string
          id: string
          is_flagged: boolean
          parent_comment_id: string | null
          ugc_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          content_block_id?: string | null
          created_at?: string
          id?: string
          is_flagged?: boolean
          parent_comment_id?: string | null
          ugc_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          content_block_id?: string | null
          created_at?: string
          id?: string
          is_flagged?: boolean
          parent_comment_id?: string | null
          ugc_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_comments_content_block_id_fkey"
            columns: ["content_block_id"]
            isOneToOne: false
            referencedRelation: "content_blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "content_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_comments_ugc_id_fkey"
            columns: ["ugc_id"]
            isOneToOne: false
            referencedRelation: "user_generated_content"
            referencedColumns: ["id"]
          },
        ]
      }
      content_prerequisites: {
        Row: {
          content_block_id: string
          created_at: string
          id: string
          min_score: number | null
          prerequisite_block_id: string
          prerequisite_type: string
        }
        Insert: {
          content_block_id: string
          created_at?: string
          id?: string
          min_score?: number | null
          prerequisite_block_id: string
          prerequisite_type?: string
        }
        Update: {
          content_block_id?: string
          created_at?: string
          id?: string
          min_score?: number | null
          prerequisite_block_id?: string
          prerequisite_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_prerequisites_content_block_id_fkey"
            columns: ["content_block_id"]
            isOneToOne: false
            referencedRelation: "content_blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_prerequisites_prerequisite_block_id_fkey"
            columns: ["prerequisite_block_id"]
            isOneToOne: false
            referencedRelation: "content_blocks"
            referencedColumns: ["id"]
          },
        ]
      }
      content_ratings: {
        Row: {
          content_block_id: string | null
          created_at: string
          id: string
          is_helpful: boolean | null
          rating: number
          review_text: string | null
          ugc_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content_block_id?: string | null
          created_at?: string
          id?: string
          is_helpful?: boolean | null
          rating: number
          review_text?: string | null
          ugc_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content_block_id?: string | null
          created_at?: string
          id?: string
          is_helpful?: boolean | null
          rating?: number
          review_text?: string | null
          ugc_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_ratings_content_block_id_fkey"
            columns: ["content_block_id"]
            isOneToOne: false
            referencedRelation: "content_blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_ratings_ugc_id_fkey"
            columns: ["ugc_id"]
            isOneToOne: false
            referencedRelation: "user_generated_content"
            referencedColumns: ["id"]
          },
        ]
      }
      content_skill_tags: {
        Row: {
          assessment_id: string | null
          content_block_id: string | null
          created_at: string
          created_by: string | null
          id: string
          programme_id: string | null
          skill_id: string
        }
        Insert: {
          assessment_id?: string | null
          content_block_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          programme_id?: string | null
          skill_id: string
        }
        Update: {
          assessment_id?: string | null
          content_block_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          programme_id?: string | null
          skill_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_skill_tags_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_skill_tags_content_block_id_fkey"
            columns: ["content_block_id"]
            isOneToOne: false
            referencedRelation: "content_blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_skill_tags_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "programmes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_skill_tags_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
      countries: {
        Row: {
          created_at: string
          currency_code: string
          id: string
          is_active: boolean
          iso_code: string
          name: string
          region: string
          sub_region: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency_code?: string
          id?: string
          is_active?: boolean
          iso_code: string
          name: string
          region: string
          sub_region?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency_code?: string
          id?: string
          is_active?: boolean
          iso_code?: string
          name?: string
          region?: string
          sub_region?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      country_regulatory_frameworks: {
        Row: {
          country_id: string
          created_at: string
          effective_date: string
          expiry_date: string | null
          id: string
          legislative_references: Json | null
          notes: string | null
          review_date: string | null
          sector_regulations: Json | null
          status: string
          updated_at: string
          version: number
        }
        Insert: {
          country_id: string
          created_at?: string
          effective_date?: string
          expiry_date?: string | null
          id?: string
          legislative_references?: Json | null
          notes?: string | null
          review_date?: string | null
          sector_regulations?: Json | null
          status?: string
          updated_at?: string
          version?: number
        }
        Update: {
          country_id?: string
          created_at?: string
          effective_date?: string
          expiry_date?: string | null
          id?: string
          legislative_references?: Json | null
          notes?: string | null
          review_date?: string | null
          sector_regulations?: Json | null
          status?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "country_regulatory_frameworks_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      course_content_links: {
        Row: {
          created_at: string
          custom_settings: Json | null
          id: string
          lesson_id: string | null
          module_id: string | null
          pinned_version: number | null
          position: number
          programme_id: string | null
          shared_item_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          custom_settings?: Json | null
          id?: string
          lesson_id?: string | null
          module_id?: string | null
          pinned_version?: number | null
          position?: number
          programme_id?: string | null
          shared_item_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          custom_settings?: Json | null
          id?: string
          lesson_id?: string | null
          module_id?: string | null
          pinned_version?: number | null
          position?: number
          programme_id?: string | null
          shared_item_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_content_links_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_content_links_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "programme_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_content_links_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "programmes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_content_links_shared_item_id_fkey"
            columns: ["shared_item_id"]
            isOneToOne: false
            referencedRelation: "shared_content_items"
            referencedColumns: ["id"]
          },
        ]
      }
      data_quality_audit_results: {
        Row: {
          affected_record_ids: string[] | null
          audit_type: string
          created_at: string
          id: string
          issue_description: string
          resolved: boolean
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          table_name: string
        }
        Insert: {
          affected_record_ids?: string[] | null
          audit_type: string
          created_at?: string
          id?: string
          issue_description: string
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          table_name: string
        }
        Update: {
          affected_record_ids?: string[] | null
          audit_type?: string
          created_at?: string
          id?: string
          issue_description?: string
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          table_name?: string
        }
        Relationships: []
      }
      delegated_approvers: {
        Row: {
          assigned_by: string
          created_at: string
          delegated_user_id: string
          expires_at: string | null
          id: string
          is_active: boolean
          revoked_at: string | null
          revoked_by: string | null
          scope_type: string
          scope_value: string | null
          updated_at: string
        }
        Insert: {
          assigned_by: string
          created_at?: string
          delegated_user_id: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          revoked_at?: string | null
          revoked_by?: string | null
          scope_type?: string
          scope_value?: string | null
          updated_at?: string
        }
        Update: {
          assigned_by?: string
          created_at?: string
          delegated_user_id?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          revoked_at?: string | null
          revoked_by?: string | null
          scope_type?: string
          scope_value?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      deletion_audit_log: {
        Row: {
          action_type: string
          created_at: string
          details: Json | null
          entity_id: string
          entity_name: string | null
          entity_type: string
          id: string
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          details?: Json | null
          entity_id: string
          entity_name?: string | null
          entity_type: string
          id?: string
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          details?: Json | null
          entity_id?: string
          entity_name?: string | null
          entity_type?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      directory_oversight_settings: {
        Row: {
          created_at: string
          disabled_at: string | null
          disabled_by: string | null
          feature_key: string
          id: string
          is_disabled: boolean
          reason: string | null
          target_role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          disabled_at?: string | null
          disabled_by?: string | null
          feature_key: string
          id?: string
          is_disabled?: boolean
          reason?: string | null
          target_role: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          disabled_at?: string | null
          disabled_by?: string | null
          feature_key?: string
          id?: string
          is_disabled?: boolean
          reason?: string | null
          target_role?: string
          updated_at?: string
        }
        Relationships: []
      }
      discussion_posts: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          is_solution: boolean
          parent_post_id: string | null
          thread_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          is_solution?: boolean
          parent_post_id?: string | null
          thread_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          is_solution?: boolean
          parent_post_id?: string | null
          thread_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "discussion_posts_parent_post_id_fkey"
            columns: ["parent_post_id"]
            isOneToOne: false
            referencedRelation: "discussion_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussion_posts_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "discussion_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      discussion_threads: {
        Row: {
          author_id: string
          body: string | null
          created_at: string
          id: string
          is_locked: boolean
          is_pinned: boolean
          last_activity_at: string
          reply_count: number
          scope_id: string
          scope_type: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          body?: string | null
          created_at?: string
          id?: string
          is_locked?: boolean
          is_pinned?: boolean
          last_activity_at?: string
          reply_count?: number
          scope_id: string
          scope_type?: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string | null
          created_at?: string
          id?: string
          is_locked?: boolean
          is_pinned?: boolean
          last_activity_at?: string
          reply_count?: number
          scope_id?: string
          scope_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      document_requests: {
        Row: {
          created_at: string
          document_types: string[]
          expires_at: string
          fulfilled_at: string | null
          id: string
          last_reminder_at: string | null
          message: string | null
          registration_id: string
          reminder_count: number
          requested_by: string | null
          secure_upload_token: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          document_types?: string[]
          expires_at?: string
          fulfilled_at?: string | null
          id?: string
          last_reminder_at?: string | null
          message?: string | null
          registration_id: string
          reminder_count?: number
          requested_by?: string | null
          secure_upload_token?: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          document_types?: string[]
          expires_at?: string
          fulfilled_at?: string | null
          id?: string
          last_reminder_at?: string | null
          message?: string | null
          registration_id?: string
          reminder_count?: number
          requested_by?: string | null
          secure_upload_token?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_requests_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "learner_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      drip_schedules: {
        Row: {
          assessment_id: string | null
          content_block_id: string | null
          created_at: string
          drip_date: string | null
          drip_type: string
          drip_value: number | null
          id: string
          is_sample: boolean | null
          lesson_id: string | null
          module_id: string | null
          programme_id: string
          updated_at: string
        }
        Insert: {
          assessment_id?: string | null
          content_block_id?: string | null
          created_at?: string
          drip_date?: string | null
          drip_type?: string
          drip_value?: number | null
          id?: string
          is_sample?: boolean | null
          lesson_id?: string | null
          module_id?: string | null
          programme_id: string
          updated_at?: string
        }
        Update: {
          assessment_id?: string | null
          content_block_id?: string | null
          created_at?: string
          drip_date?: string | null
          drip_type?: string
          drip_value?: number | null
          id?: string
          is_sample?: boolean | null
          lesson_id?: string | null
          module_id?: string | null
          programme_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "drip_schedules_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drip_schedules_content_block_id_fkey"
            columns: ["content_block_id"]
            isOneToOne: false
            referencedRelation: "content_blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drip_schedules_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drip_schedules_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "programme_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drip_schedules_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "programmes"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      enrolment_toggles: {
        Row: {
          changed_by: string | null
          created_at: string
          id: string
          is_enabled: boolean
          reason: string | null
          scope_id: string | null
          scope_level: string
          updated_at: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          id?: string
          is_enabled?: boolean
          reason?: string | null
          scope_id?: string | null
          scope_level: string
          updated_at?: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          id?: string
          is_enabled?: boolean
          reason?: string | null
          scope_id?: string | null
          scope_level?: string
          updated_at?: string
        }
        Relationships: []
      }
      enrolments: {
        Row: {
          approved_by: string | null
          cohort_id: string | null
          completed_at: string | null
          created_at: string
          enrolled_at: string | null
          id: string
          learner_id: string
          mentor_id: string | null
          progress_percentage: number | null
          sponsor_id: string | null
          status: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          approved_by?: string | null
          cohort_id?: string | null
          completed_at?: string | null
          created_at?: string
          enrolled_at?: string | null
          id?: string
          learner_id: string
          mentor_id?: string | null
          progress_percentage?: number | null
          sponsor_id?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          approved_by?: string | null
          cohort_id?: string | null
          completed_at?: string | null
          created_at?: string
          enrolled_at?: string | null
          id?: string
          learner_id?: string
          mentor_id?: string | null
          progress_percentage?: number | null
          sponsor_id?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrolments_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrolments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrolments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      external_content_items: {
        Row: {
          content_type: string | null
          content_url: string | null
          created_at: string
          description: string | null
          difficulty_level: string | null
          duration_minutes: number | null
          external_id: string | null
          id: string
          is_active: boolean
          provider_id: string
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          content_type?: string | null
          content_url?: string | null
          created_at?: string
          description?: string | null
          difficulty_level?: string | null
          duration_minutes?: number | null
          external_id?: string | null
          id?: string
          is_active?: boolean
          provider_id: string
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          content_type?: string | null
          content_url?: string | null
          created_at?: string
          description?: string | null
          difficulty_level?: string | null
          duration_minutes?: number | null
          external_id?: string | null
          id?: string
          is_active?: boolean
          provider_id?: string
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "external_content_items_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "external_content_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      external_content_providers: {
        Row: {
          api_key_configured: boolean
          base_url: string | null
          config: Json | null
          created_at: string
          id: string
          is_active: boolean
          provider_name: string
          provider_type: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          api_key_configured?: boolean
          base_url?: string | null
          config?: Json | null
          created_at?: string
          id?: string
          is_active?: boolean
          provider_name: string
          provider_type?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          api_key_configured?: boolean
          base_url?: string | null
          config?: Json | null
          created_at?: string
          id?: string
          is_active?: boolean
          provider_name?: string
          provider_type?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "external_content_providers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_content_providers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flag_catalog: {
        Row: {
          category: string
          created_at: string
          default_value: boolean
          description: string | null
          display_name: string
          flag_key: string
          min_tier: string
          sort_order: number
        }
        Insert: {
          category?: string
          created_at?: string
          default_value?: boolean
          description?: string | null
          display_name: string
          flag_key: string
          min_tier?: string
          sort_order?: number
        }
        Update: {
          category?: string
          created_at?: string
          default_value?: boolean
          description?: string | null
          display_name?: string
          flag_key?: string
          min_tier?: string
          sort_order?: number
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          created_at: string
          description: string | null
          flag_key: string
          id: string
          is_enabled: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          flag_key: string
          id?: string
          is_enabled?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          flag_key?: string
          id?: string
          is_enabled?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      font_audit_log: {
        Row: {
          action: string
          after_value: Json | null
          before_value: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          notes: string | null
          performed_by: string | null
        }
        Insert: {
          action: string
          after_value?: Json | null
          before_value?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          notes?: string | null
          performed_by?: string | null
        }
        Update: {
          action?: string
          after_value?: Json | null
          before_value?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          notes?: string | null
          performed_by?: string | null
        }
        Relationships: []
      }
      font_library: {
        Row: {
          category: string | null
          created_at: string
          created_by: string | null
          family_name: string
          file_urls: Json | null
          font_source: string
          id: string
          is_active: boolean
          is_favorite: boolean
          license_expiry: string | null
          license_type: string | null
          popularity_rank: number | null
          preview_text: string | null
          subsets: Json | null
          tenant_id: string | null
          updated_at: string
          variants: Json
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          family_name: string
          file_urls?: Json | null
          font_source?: string
          id?: string
          is_active?: boolean
          is_favorite?: boolean
          license_expiry?: string | null
          license_type?: string | null
          popularity_rank?: number | null
          preview_text?: string | null
          subsets?: Json | null
          tenant_id?: string | null
          updated_at?: string
          variants?: Json
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          family_name?: string
          file_urls?: Json | null
          font_source?: string
          id?: string
          is_active?: boolean
          is_favorite?: boolean
          license_expiry?: string | null
          license_type?: string | null
          popularity_rank?: number | null
          preview_text?: string | null
          subsets?: Json | null
          tenant_id?: string | null
          updated_at?: string
          variants?: Json
        }
        Relationships: [
          {
            foreignKeyName: "font_library_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "font_library_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      funding_rules: {
        Row: {
          claim_process: string | null
          created_at: string
          description: string | null
          eligibility_criteria: Json | null
          framework_id: string
          funding_type: string
          id: string
          is_active: boolean
          name: string
          rate_or_amount: string | null
          updated_at: string
        }
        Insert: {
          claim_process?: string | null
          created_at?: string
          description?: string | null
          eligibility_criteria?: Json | null
          framework_id: string
          funding_type: string
          id?: string
          is_active?: boolean
          name: string
          rate_or_amount?: string | null
          updated_at?: string
        }
        Update: {
          claim_process?: string | null
          created_at?: string
          description?: string | null
          eligibility_criteria?: Json | null
          framework_id?: string
          funding_type?: string
          id?: string
          is_active?: boolean
          name?: string
          rate_or_amount?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "funding_rules_framework_id_fkey"
            columns: ["framework_id"]
            isOneToOne: false
            referencedRelation: "country_regulatory_frameworks"
            referencedColumns: ["id"]
          },
        ]
      }
      grade_audit_log: {
        Row: {
          action: string
          changed_by: string
          created_at: string
          grade_id: string
          grade_source: string
          id: string
          learner_id: string
          new_score: number | null
          new_status: string | null
          previous_score: number | null
          previous_status: string | null
          reason: string | null
        }
        Insert: {
          action: string
          changed_by: string
          created_at?: string
          grade_id: string
          grade_source: string
          id?: string
          learner_id: string
          new_score?: number | null
          new_status?: string | null
          previous_score?: number | null
          previous_status?: string | null
          reason?: string | null
        }
        Update: {
          action?: string
          changed_by?: string
          created_at?: string
          grade_id?: string
          grade_source?: string
          id?: string
          learner_id?: string
          new_score?: number | null
          new_status?: string | null
          previous_score?: number | null
          previous_status?: string | null
          reason?: string | null
        }
        Relationships: []
      }
      grading_scale_bands: {
        Row: {
          colour_token: string
          created_at: string
          id: string
          is_pass: boolean
          label: string
          max_score: number | null
          min_score: number | null
          scale_id: string
          sequence_order: number
          short_code: string | null
        }
        Insert: {
          colour_token?: string
          created_at?: string
          id?: string
          is_pass?: boolean
          label: string
          max_score?: number | null
          min_score?: number | null
          scale_id: string
          sequence_order?: number
          short_code?: string | null
        }
        Update: {
          colour_token?: string
          created_at?: string
          id?: string
          is_pass?: boolean
          label?: string
          max_score?: number | null
          min_score?: number | null
          scale_id?: string
          sequence_order?: number
          short_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "grading_scale_bands_scale_id_fkey"
            columns: ["scale_id"]
            isOneToOne: false
            referencedRelation: "grading_scales"
            referencedColumns: ["id"]
          },
        ]
      }
      grading_scales: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          scale_type: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          scale_type: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          scale_type?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "grading_scales_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grading_scales_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      idempotency_keys: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          idempotency_key: string
          operation: string
          request_hash: string | null
          response_body: Json | null
          response_status: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          idempotency_key: string
          operation: string
          request_hash?: string | null
          response_body?: Json | null
          response_status?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          idempotency_key?: string
          operation?: string
          request_hash?: string | null
          response_body?: Json | null
          response_status?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      incentive_schemes: {
        Row: {
          config: Json | null
          country_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          points_multipliers: Json | null
          scheme_name: string
          scheme_type: string
          target_groups: Json | null
          updated_at: string
        }
        Insert: {
          config?: Json | null
          country_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          points_multipliers?: Json | null
          scheme_name: string
          scheme_type: string
          target_groups?: Json | null
          updated_at?: string
        }
        Update: {
          config?: Json | null
          country_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          points_multipliers?: Json | null
          scheme_name?: string
          scheme_type?: string
          target_groups?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "incentive_schemes_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_audits: {
        Row: {
          audit_type: string
          completed_date: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          lead_auditor_id: string | null
          objectives: string | null
          scheduled_date: string | null
          scope: string | null
          standard_reference: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          audit_type?: string
          completed_date?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          lead_auditor_id?: string | null
          objectives?: string | null
          scheduled_date?: string | null
          scope?: string | null
          standard_reference?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          audit_type?: string
          completed_date?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          lead_auditor_id?: string | null
          objectives?: string | null
          scheduled_date?: string | null
          scope?: string | null
          standard_reference?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      issued_credentials: {
        Row: {
          blockchain_hash: string | null
          created_at: string
          credential_type: string
          enrolment_id: string
          expires_at: string | null
          id: string
          issued_at: string | null
          issued_by: string | null
          learner_id: string
          programme_id: string
          status: string
          title: string
          updated_at: string
          verification_url: string | null
        }
        Insert: {
          blockchain_hash?: string | null
          created_at?: string
          credential_type?: string
          enrolment_id: string
          expires_at?: string | null
          id?: string
          issued_at?: string | null
          issued_by?: string | null
          learner_id: string
          programme_id: string
          status?: string
          title: string
          updated_at?: string
          verification_url?: string | null
        }
        Update: {
          blockchain_hash?: string | null
          created_at?: string
          credential_type?: string
          enrolment_id?: string
          expires_at?: string | null
          id?: string
          issued_at?: string | null
          issued_by?: string | null
          learner_id?: string
          programme_id?: string
          status?: string
          title?: string
          updated_at?: string
          verification_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "issued_credentials_enrolment_id_fkey"
            columns: ["enrolment_id"]
            isOneToOne: false
            referencedRelation: "enrolments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issued_credentials_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "programmes"
            referencedColumns: ["id"]
          },
        ]
      }
      learner_badges: {
        Row: {
          awarded_by: string | null
          badge_id: string
          earned_at: string
          enrolment_id: string | null
          id: string
          learner_id: string
        }
        Insert: {
          awarded_by?: string | null
          badge_id: string
          earned_at?: string
          enrolment_id?: string | null
          id?: string
          learner_id: string
        }
        Update: {
          awarded_by?: string | null
          badge_id?: string
          earned_at?: string
          enrolment_id?: string | null
          id?: string
          learner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "learner_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learner_badges_enrolment_id_fkey"
            columns: ["enrolment_id"]
            isOneToOne: false
            referencedRelation: "enrolments"
            referencedColumns: ["id"]
          },
        ]
      }
      learner_bookmarks: {
        Row: {
          content_block_id: string
          created_at: string
          enrolment_id: string
          id: string
          learner_id: string
        }
        Insert: {
          content_block_id: string
          created_at?: string
          enrolment_id: string
          id?: string
          learner_id: string
        }
        Update: {
          content_block_id?: string
          created_at?: string
          enrolment_id?: string
          id?: string
          learner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "learner_bookmarks_content_block_id_fkey"
            columns: ["content_block_id"]
            isOneToOne: false
            referencedRelation: "content_blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learner_bookmarks_enrolment_id_fkey"
            columns: ["enrolment_id"]
            isOneToOne: false
            referencedRelation: "enrolments"
            referencedColumns: ["id"]
          },
        ]
      }
      learner_content_progress: {
        Row: {
          completed_at: string | null
          content_block_id: string
          created_at: string
          enrolment_id: string
          id: string
          is_completed: boolean
          learner_id: string
          module_id: string
          time_spent_seconds: number | null
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          content_block_id: string
          created_at?: string
          enrolment_id: string
          id?: string
          is_completed?: boolean
          learner_id: string
          module_id: string
          time_spent_seconds?: number | null
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          content_block_id?: string
          created_at?: string
          enrolment_id?: string
          id?: string
          is_completed?: boolean
          learner_id?: string
          module_id?: string
          time_spent_seconds?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "learner_content_progress_content_block_id_fkey"
            columns: ["content_block_id"]
            isOneToOne: false
            referencedRelation: "content_blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learner_content_progress_enrolment_id_fkey"
            columns: ["enrolment_id"]
            isOneToOne: false
            referencedRelation: "enrolments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learner_content_progress_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "programme_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      learner_documents: {
        Row: {
          confidence_score: number | null
          created_at: string
          document_name: string
          document_type: string
          extracted_data: Json | null
          file_path: string
          file_size: number | null
          id: string
          mime_type: string | null
          notes: string | null
          registration_id: string
          rejection_reason: string | null
          status: string
          updated_at: string
          uploaded_by: string | null
          validation_details: Json | null
          validation_mode: string
          validation_status: string
          verified_at: string | null
          verified_by: string | null
          version: number
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          document_name: string
          document_type: string
          extracted_data?: Json | null
          file_path: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          notes?: string | null
          registration_id: string
          rejection_reason?: string | null
          status?: string
          updated_at?: string
          uploaded_by?: string | null
          validation_details?: Json | null
          validation_mode?: string
          validation_status?: string
          verified_at?: string | null
          verified_by?: string | null
          version?: number
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          document_name?: string
          document_type?: string
          extracted_data?: Json | null
          file_path?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          notes?: string | null
          registration_id?: string
          rejection_reason?: string | null
          status?: string
          updated_at?: string
          uploaded_by?: string | null
          validation_details?: Json | null
          validation_mode?: string
          validation_status?: string
          verified_at?: string | null
          verified_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "learner_documents_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "learner_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      learner_eligibility_checks: {
        Row: {
          check_type: string
          checked_at: string
          details: string | null
          id: string
          is_passed: boolean
          registration_id: string
        }
        Insert: {
          check_type: string
          checked_at?: string
          details?: string | null
          id?: string
          is_passed?: boolean
          registration_id: string
        }
        Update: {
          check_type?: string
          checked_at?: string
          details?: string | null
          id?: string
          is_passed?: boolean
          registration_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "learner_eligibility_checks_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "learner_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      learner_notes: {
        Row: {
          content_block_id: string | null
          created_at: string
          enrolment_id: string
          id: string
          learner_id: string
          module_id: string | null
          note_text: string
          updated_at: string
        }
        Insert: {
          content_block_id?: string | null
          created_at?: string
          enrolment_id: string
          id?: string
          learner_id: string
          module_id?: string | null
          note_text: string
          updated_at?: string
        }
        Update: {
          content_block_id?: string | null
          created_at?: string
          enrolment_id?: string
          id?: string
          learner_id?: string
          module_id?: string | null
          note_text?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "learner_notes_content_block_id_fkey"
            columns: ["content_block_id"]
            isOneToOne: false
            referencedRelation: "content_blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learner_notes_enrolment_id_fkey"
            columns: ["enrolment_id"]
            isOneToOne: false
            referencedRelation: "enrolments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learner_notes_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "programme_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      learner_points: {
        Row: {
          created_at: string
          enrolment_id: string | null
          id: string
          learner_id: string
          points: number
          reason: string
          reference_id: string | null
          reference_type: string | null
        }
        Insert: {
          created_at?: string
          enrolment_id?: string | null
          id?: string
          learner_id: string
          points: number
          reason: string
          reference_id?: string | null
          reference_type?: string | null
        }
        Update: {
          created_at?: string
          enrolment_id?: string | null
          id?: string
          learner_id?: string
          points?: number
          reason?: string
          reference_id?: string | null
          reference_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "learner_points_enrolment_id_fkey"
            columns: ["enrolment_id"]
            isOneToOne: false
            referencedRelation: "enrolments"
            referencedColumns: ["id"]
          },
        ]
      }
      learner_registrations: {
        Row: {
          address: string | null
          country: string | null
          created_at: string
          date_of_birth: string | null
          disability: string | null
          documents: Json | null
          education_level: string | null
          email: string
          full_name: string
          gender: string | null
          id: string
          is_archived: boolean | null
          learner_number: string | null
          national_id: string | null
          notes: string | null
          phone: string | null
          programme_id: string | null
          programme_name: string | null
          registered_by: string | null
          registration_method: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          sla_breached: boolean | null
          sla_deadline_at: string | null
          sla_paused_at: string | null
          sla_paused_duration_minutes: number | null
          sla_started_at: string | null
          status: string
          tenant_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          disability?: string | null
          documents?: Json | null
          education_level?: string | null
          email: string
          full_name: string
          gender?: string | null
          id?: string
          is_archived?: boolean | null
          learner_number?: string | null
          national_id?: string | null
          notes?: string | null
          phone?: string | null
          programme_id?: string | null
          programme_name?: string | null
          registered_by?: string | null
          registration_method?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sla_breached?: boolean | null
          sla_deadline_at?: string | null
          sla_paused_at?: string | null
          sla_paused_duration_minutes?: number | null
          sla_started_at?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          disability?: string | null
          documents?: Json | null
          education_level?: string | null
          email?: string
          full_name?: string
          gender?: string | null
          id?: string
          is_archived?: boolean | null
          learner_number?: string | null
          national_id?: string | null
          notes?: string | null
          phone?: string | null
          programme_id?: string | null
          programme_name?: string | null
          registered_by?: string | null
          registration_method?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sla_breached?: boolean | null
          sla_deadline_at?: string | null
          sla_paused_at?: string | null
          sla_paused_duration_minutes?: number | null
          sla_started_at?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "learner_registrations_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "programmes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learner_registrations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learner_registrations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      learner_skill_profiles: {
        Row: {
          created_at: string
          id: string
          last_assessed_at: string | null
          learner_id: string
          proficiency_level: number
          skill_id: string
          target_level: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_assessed_at?: string | null
          learner_id: string
          proficiency_level?: number
          skill_id: string
          target_level?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_assessed_at?: string | null
          learner_id?: string
          proficiency_level?: number
          skill_id?: string
          target_level?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "learner_skill_profiles_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_recommendations: {
        Row: {
          content_block_id: string | null
          created_at: string
          expires_at: string | null
          id: string
          is_completed: boolean
          is_dismissed: boolean
          learner_id: string
          programme_id: string | null
          reason: string | null
          recommendation_type: string
          relevance_score: number
          ugc_id: string | null
        }
        Insert: {
          content_block_id?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_completed?: boolean
          is_dismissed?: boolean
          learner_id: string
          programme_id?: string | null
          reason?: string | null
          recommendation_type?: string
          relevance_score?: number
          ugc_id?: string | null
        }
        Update: {
          content_block_id?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_completed?: boolean
          is_dismissed?: boolean
          learner_id?: string
          programme_id?: string | null
          reason?: string | null
          recommendation_type?: string
          relevance_score?: number
          ugc_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "learning_recommendations_content_block_id_fkey"
            columns: ["content_block_id"]
            isOneToOne: false
            referencedRelation: "content_blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_recommendations_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "programmes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_recommendations_ugc_id_fkey"
            columns: ["ugc_id"]
            isOneToOne: false
            referencedRelation: "user_generated_content"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          created_at: string
          description: string | null
          duration_minutes: number | null
          id: string
          is_mandatory: boolean
          learning_objective: string | null
          module_id: string
          sequence_order: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_mandatory?: boolean
          learning_objective?: string | null
          module_id: string
          sequence_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_mandatory?: boolean
          learning_objective?: string | null
          module_id?: string
          sequence_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "programme_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      lti_registrations: {
        Row: {
          auth_endpoint: string
          client_id: string
          created_at: string
          created_by: string | null
          deployment_id: string | null
          id: string
          is_active: boolean | null
          issuer: string
          jwks_endpoint: string
          platform_name: string
          tenant_id: string | null
          token_endpoint: string
          updated_at: string
        }
        Insert: {
          auth_endpoint: string
          client_id: string
          created_at?: string
          created_by?: string | null
          deployment_id?: string | null
          id?: string
          is_active?: boolean | null
          issuer: string
          jwks_endpoint: string
          platform_name: string
          tenant_id?: string | null
          token_endpoint: string
          updated_at?: string
        }
        Update: {
          auth_endpoint?: string
          client_id?: string
          created_at?: string
          created_by?: string | null
          deployment_id?: string | null
          id?: string
          is_active?: boolean | null
          issuer?: string
          jwks_endpoint?: string
          platform_name?: string
          tenant_id?: string | null
          token_endpoint?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lti_registrations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lti_registrations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      lti_resource_links: {
        Row: {
          assessment_id: string
          created_at: string
          id: string
          registration_id: string
          resource_link_id: string
          title: string | null
        }
        Insert: {
          assessment_id: string
          created_at?: string
          id?: string
          registration_id: string
          resource_link_id: string
          title?: string | null
        }
        Update: {
          assessment_id?: string
          created_at?: string
          id?: string
          registration_id?: string
          resource_link_id?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lti_resource_links_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lti_resource_links_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "lti_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_participants: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          is_hand_raised: boolean
          is_muted: boolean
          is_screen_sharing: boolean
          is_video_on: boolean
          joined_at: string
          left_at: string | null
          role: string
          session_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id?: string
          is_hand_raised?: boolean
          is_muted?: boolean
          is_screen_sharing?: boolean
          is_video_on?: boolean
          joined_at?: string
          left_at?: string | null
          role?: string
          session_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          is_hand_raised?: boolean
          is_muted?: boolean
          is_screen_sharing?: boolean
          is_video_on?: boolean
          joined_at?: string
          left_at?: string | null
          role?: string
          session_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_participants_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "training_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_participants_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "training_sessions_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_reactions: {
        Row: {
          created_at: string
          id: string
          reaction_type: string
          session_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reaction_type?: string
          session_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reaction_type?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_reactions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "training_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_reactions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "training_sessions_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_goals: {
        Row: {
          created_at: string
          description: string | null
          enrolment_id: string | null
          id: string
          mentee_id: string
          mentee_notes: string | null
          mentor_id: string
          mentor_notes: string | null
          progress_percentage: number | null
          status: string
          target_date: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          enrolment_id?: string | null
          id?: string
          mentee_id: string
          mentee_notes?: string | null
          mentor_id: string
          mentor_notes?: string | null
          progress_percentage?: number | null
          status?: string
          target_date?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          enrolment_id?: string | null
          id?: string
          mentee_id?: string
          mentee_notes?: string | null
          mentor_id?: string
          mentor_notes?: string | null
          progress_percentage?: number | null
          status?: string
          target_date?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentor_goals_enrolment_id_fkey"
            columns: ["enrolment_id"]
            isOneToOne: false
            referencedRelation: "enrolments"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_messages: {
        Row: {
          body: string
          created_at: string
          enrolment_id: string | null
          id: string
          is_read: boolean | null
          recipient_id: string
          sender_id: string
        }
        Insert: {
          body: string
          created_at?: string
          enrolment_id?: string | null
          id?: string
          is_read?: boolean | null
          recipient_id: string
          sender_id: string
        }
        Update: {
          body?: string
          created_at?: string
          enrolment_id?: string | null
          id?: string
          is_read?: boolean | null
          recipient_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentor_messages_enrolment_id_fkey"
            columns: ["enrolment_id"]
            isOneToOne: false
            referencedRelation: "enrolments"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_sessions: {
        Row: {
          action_items: Json | null
          created_at: string
          duration_minutes: number | null
          enrolment_id: string | null
          id: string
          location: string | null
          mentee_id: string
          mentor_id: string
          notes: string | null
          scheduled_at: string
          session_type: string
          status: string
          updated_at: string
        }
        Insert: {
          action_items?: Json | null
          created_at?: string
          duration_minutes?: number | null
          enrolment_id?: string | null
          id?: string
          location?: string | null
          mentee_id: string
          mentor_id: string
          notes?: string | null
          scheduled_at: string
          session_type?: string
          status?: string
          updated_at?: string
        }
        Update: {
          action_items?: Json | null
          created_at?: string
          duration_minutes?: number | null
          enrolment_id?: string | null
          id?: string
          location?: string | null
          mentee_id?: string
          mentor_id?: string
          notes?: string | null
          scheduled_at?: string
          session_type?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentor_sessions_enrolment_id_fkey"
            columns: ["enrolment_id"]
            isOneToOne: false
            referencedRelation: "enrolments"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_items: {
        Row: {
          content: string
          created_at: string
          flagged_at: string
          id: string
          item_type: string
          moderation_feedback: string | null
          priority: string
          programme_id: string | null
          reason: string
          rejection_category: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submission_id: string | null
          submitted_by: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          flagged_at?: string
          id?: string
          item_type?: string
          moderation_feedback?: string | null
          priority?: string
          programme_id?: string | null
          reason: string
          rejection_category?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submission_id?: string | null
          submitted_by: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          flagged_at?: string
          id?: string
          item_type?: string
          moderation_feedback?: string | null
          priority?: string
          programme_id?: string | null
          reason?: string
          rejection_category?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submission_id?: string | null
          submitted_by?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "moderation_items_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "programmes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moderation_items_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "assessment_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      moderator_reports: {
        Row: {
          approved_count: number | null
          assessor_performance: Json | null
          avg_turnaround_hours: number | null
          cohort_id: string | null
          created_at: string
          declaration_text: string | null
          id: string
          improvement_actions: string | null
          moderator_id: string
          moderator_signature_date: string | null
          patterns_observed: string | null
          period_end: string | null
          period_start: string | null
          programme_id: string
          qa_manager_signature_date: string | null
          recommendations: string | null
          rejected_count: number | null
          report_date: string | null
          report_mode: string
          sampling_achieved_pct: number | null
          sampling_target_pct: number | null
          status: string
          summary_notes: string | null
          systemic_issues: string | null
          total_items_reviewed: number | null
          updated_at: string
        }
        Insert: {
          approved_count?: number | null
          assessor_performance?: Json | null
          avg_turnaround_hours?: number | null
          cohort_id?: string | null
          created_at?: string
          declaration_text?: string | null
          id?: string
          improvement_actions?: string | null
          moderator_id: string
          moderator_signature_date?: string | null
          patterns_observed?: string | null
          period_end?: string | null
          period_start?: string | null
          programme_id: string
          qa_manager_signature_date?: string | null
          recommendations?: string | null
          rejected_count?: number | null
          report_date?: string | null
          report_mode?: string
          sampling_achieved_pct?: number | null
          sampling_target_pct?: number | null
          status?: string
          summary_notes?: string | null
          systemic_issues?: string | null
          total_items_reviewed?: number | null
          updated_at?: string
        }
        Update: {
          approved_count?: number | null
          assessor_performance?: Json | null
          avg_turnaround_hours?: number | null
          cohort_id?: string | null
          created_at?: string
          declaration_text?: string | null
          id?: string
          improvement_actions?: string | null
          moderator_id?: string
          moderator_signature_date?: string | null
          patterns_observed?: string | null
          period_end?: string | null
          period_start?: string | null
          programme_id?: string
          qa_manager_signature_date?: string | null
          recommendations?: string | null
          rejected_count?: number | null
          report_date?: string | null
          report_mode?: string
          sampling_achieved_pct?: number | null
          sampling_target_pct?: number | null
          status?: string
          summary_notes?: string | null
          systemic_issues?: string | null
          total_items_reviewed?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "moderator_reports_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moderator_reports_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "programmes"
            referencedColumns: ["id"]
          },
        ]
      }
      module_prerequisites: {
        Row: {
          created_at: string
          id: string
          module_id: string
          prerequisite_module_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          module_id: string
          prerequisite_module_id: string
        }
        Update: {
          created_at?: string
          id?: string
          module_id?: string
          prerequisite_module_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_prerequisites_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "programme_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_prerequisites_prerequisite_module_id_fkey"
            columns: ["prerequisite_module_id"]
            isOneToOne: false
            referencedRelation: "programme_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          category: string
          created_at: string
          email_enabled: boolean
          id: string
          in_app_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          email_enabled?: boolean
          id?: string
          in_app_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          email_enabled?: boolean
          id?: string
          in_app_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_url: string | null
          body: string | null
          category: string
          created_at: string
          email_sent: boolean
          email_sent_at: string | null
          id: string
          is_read: boolean
          reference_id: string | null
          reference_table: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          body?: string | null
          category?: string
          created_at?: string
          email_sent?: boolean
          email_sent_at?: string | null
          id?: string
          is_read?: boolean
          reference_id?: string | null
          reference_table?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          body?: string | null
          category?: string
          created_at?: string
          email_sent?: boolean
          email_sent_at?: string | null
          id?: string
          is_read?: boolean
          reference_id?: string | null
          reference_table?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      onboarding_audit_log: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string
          entity_type: string
          id: string
          performed_by: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id: string
          entity_type: string
          id?: string
          performed_by?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string
          entity_type?: string
          id?: string
          performed_by?: string | null
        }
        Relationships: []
      }
      pathways: {
        Row: {
          created_at: string
          id: string
          phase: string
          programme_id: string
          status: string
          tenant_id: string | null
          title: string
          updated_at: string
          version: string
        }
        Insert: {
          created_at?: string
          id?: string
          phase?: string
          programme_id: string
          status?: string
          tenant_id?: string | null
          title: string
          updated_at?: string
          version?: string
        }
        Update: {
          created_at?: string
          id?: string
          phase?: string
          programme_id?: string
          status?: string
          tenant_id?: string | null
          title?: string
          updated_at?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "pathways_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "programmes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pathways_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pathways_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_gateways: {
        Row: {
          branding_color: string | null
          config: Json | null
          created_at: string
          created_by: string | null
          currencies: string[] | null
          gateway_key: string
          id: string
          is_primary: boolean
          methods: string[] | null
          name: string
          public_key_name: string | null
          region: string | null
          secret_key_name: string | null
          status: string
          tagline: string | null
          tenant_id: string | null
          test_mode: boolean
          updated_at: string
          webhook_secret_key_name: string | null
          webhook_url: string | null
        }
        Insert: {
          branding_color?: string | null
          config?: Json | null
          created_at?: string
          created_by?: string | null
          currencies?: string[] | null
          gateway_key: string
          id?: string
          is_primary?: boolean
          methods?: string[] | null
          name: string
          public_key_name?: string | null
          region?: string | null
          secret_key_name?: string | null
          status?: string
          tagline?: string | null
          tenant_id?: string | null
          test_mode?: boolean
          updated_at?: string
          webhook_secret_key_name?: string | null
          webhook_url?: string | null
        }
        Update: {
          branding_color?: string | null
          config?: Json | null
          created_at?: string
          created_by?: string | null
          currencies?: string[] | null
          gateway_key?: string
          id?: string
          is_primary?: boolean
          methods?: string[] | null
          name?: string
          public_key_name?: string | null
          region?: string | null
          secret_key_name?: string | null
          status?: string
          tagline?: string | null
          tenant_id?: string | null
          test_mode?: boolean
          updated_at?: string
          webhook_secret_key_name?: string | null
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_gateways_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_gateways_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_routing_rules: {
        Row: {
          created_at: string
          currency: string
          fallback_gateway_id: string | null
          id: string
          is_active: boolean
          max_amount: number | null
          min_amount: number | null
          primary_gateway_id: string
          priority: number
          reason: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency: string
          fallback_gateway_id?: string | null
          id?: string
          is_active?: boolean
          max_amount?: number | null
          min_amount?: number | null
          primary_gateway_id: string
          priority?: number
          reason?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          fallback_gateway_id?: string | null
          id?: string
          is_active?: boolean
          max_amount?: number | null
          min_amount?: number | null
          primary_gateway_id?: string
          priority?: number
          reason?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_routing_rules_fallback_gateway_id_fkey"
            columns: ["fallback_gateway_id"]
            isOneToOne: false
            referencedRelation: "payment_gateways"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_routing_rules_primary_gateway_id_fkey"
            columns: ["primary_gateway_id"]
            isOneToOne: false
            referencedRelation: "payment_gateways"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_routing_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_routing_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_transactions: {
        Row: {
          amount: number
          created_at: string
          currency: string
          customer_email: string | null
          customer_name: string | null
          enrolment_id: string | null
          external_ref: string | null
          gateway_id: string
          id: string
          metadata: Json | null
          payment_method: string | null
          status: string
          tenant_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          currency: string
          customer_email?: string | null
          customer_name?: string | null
          enrolment_id?: string | null
          external_ref?: string | null
          gateway_id: string
          id?: string
          metadata?: Json | null
          payment_method?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          customer_email?: string | null
          customer_name?: string | null
          enrolment_id?: string | null
          external_ref?: string | null
          gateway_id?: string
          id?: string
          metadata?: Json | null
          payment_method?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_enrolment_id_fkey"
            columns: ["enrolment_id"]
            isOneToOne: false
            referencedRelation: "enrolments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_gateway_id_fkey"
            columns: ["gateway_id"]
            isOneToOne: false
            referencedRelation: "payment_gateways"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_webhook_logs: {
        Row: {
          created_at: string
          error_message: string | null
          event_type: string
          gateway_id: string
          id: string
          payload: Json | null
          processed_at: string | null
          reference: string | null
          response_code: number | null
          status: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          event_type: string
          gateway_id: string
          id?: string
          payload?: Json | null
          processed_at?: string | null
          reference?: string | null
          response_code?: number | null
          status?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          event_type?: string
          gateway_id?: string
          id?: string
          payload?: Json | null
          processed_at?: string | null
          reference?: string | null
          response_code?: number | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_webhook_logs_gateway_id_fkey"
            columns: ["gateway_id"]
            isOneToOne: false
            referencedRelation: "payment_gateways"
            referencedColumns: ["id"]
          },
        ]
      }
      peer_review_assignments: {
        Row: {
          assessment_id: string
          assigned_by: string | null
          created_at: string
          due_date: string | null
          id: string
          reviewee_id: string
          reviewer_id: string
          status: string
          submission_id: string | null
          updated_at: string
        }
        Insert: {
          assessment_id: string
          assigned_by?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          reviewee_id: string
          reviewer_id: string
          status?: string
          submission_id?: string | null
          updated_at?: string
        }
        Update: {
          assessment_id?: string
          assigned_by?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          reviewee_id?: string
          reviewer_id?: string
          status?: string
          submission_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "peer_review_assignments_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "peer_review_assignments_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "assessment_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      peer_reviews: {
        Row: {
          assignment_id: string
          created_at: string
          feedback: string | null
          id: string
          is_anonymous: boolean | null
          reviewer_id: string
          rubric_scores: Json | null
          score: number | null
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          assignment_id: string
          created_at?: string
          feedback?: string | null
          id?: string
          is_anonymous?: boolean | null
          reviewer_id: string
          rubric_scores?: Json | null
          score?: number | null
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          assignment_id?: string
          created_at?: string
          feedback?: string | null
          id?: string
          is_anonymous?: boolean | null
          reviewer_id?: string
          rubric_scores?: Json | null
          score?: number | null
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "peer_reviews_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "peer_review_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      plagiarism_checks: {
        Row: {
          ai_analysis: string | null
          checked_at: string | null
          created_at: string
          flagged_segments: Json | null
          id: string
          learner_id: string
          similarity_score: number | null
          status: string
          submission_id: string
          updated_at: string
        }
        Insert: {
          ai_analysis?: string | null
          checked_at?: string | null
          created_at?: string
          flagged_segments?: Json | null
          id?: string
          learner_id: string
          similarity_score?: number | null
          status?: string
          submission_id: string
          updated_at?: string
        }
        Update: {
          ai_analysis?: string | null
          checked_at?: string | null
          created_at?: string
          flagged_segments?: Json | null
          id?: string
          learner_id?: string
          similarity_score?: number | null
          status?: string
          submission_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plagiarism_checks_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "assessment_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          is_editable: boolean
          label: string
          setting_key: string
          setting_type: string
          setting_value: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_editable?: boolean
          label: string
          setting_key: string
          setting_type?: string
          setting_value?: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_editable?: boolean
          label?: string
          setting_key?: string
          setting_type?: string
          setting_value?: string
          updated_at?: string
        }
        Relationships: []
      }
      policy_document_versions: {
        Row: {
          change_summary: string | null
          content: string | null
          created_at: string
          created_by: string | null
          id: string
          policy_id: string
          version_number: number
        }
        Insert: {
          change_summary?: string | null
          content?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          policy_id: string
          version_number: number
        }
        Update: {
          change_summary?: string | null
          content?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          policy_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "policy_document_versions_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "policy_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      policy_documents: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          category: string
          content: string | null
          created_at: string
          description: string | null
          effective_date: string | null
          id: string
          owner_id: string
          review_date: string | null
          standard_references: string[] | null
          status: string
          tenant_id: string | null
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          category?: string
          content?: string | null
          created_at?: string
          description?: string | null
          effective_date?: string | null
          id?: string
          owner_id: string
          review_date?: string | null
          standard_references?: string[] | null
          status?: string
          tenant_id?: string | null
          title: string
          updated_at?: string
          version?: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          category?: string
          content?: string | null
          created_at?: string
          description?: string | null
          effective_date?: string | null
          id?: string
          owner_id?: string
          review_date?: string | null
          standard_references?: string[] | null
          status?: string
          tenant_id?: string | null
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "policy_documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policy_documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      proctoring_violations: {
        Row: {
          created_at: string
          details: Json | null
          id: string
          learner_id: string
          severity: string
          submission_id: string
          timestamp: string
          violation_type: string
        }
        Insert: {
          created_at?: string
          details?: Json | null
          id?: string
          learner_id: string
          severity?: string
          submission_id: string
          timestamp?: string
          violation_type: string
        }
        Update: {
          created_at?: string
          details?: Json | null
          id?: string
          learner_id?: string
          severity?: string
          submission_id?: string
          timestamp?: string
          violation_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "proctoring_violations_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "assessment_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          department: string | null
          email: string | null
          full_name: string | null
          id: string
          job_title: string | null
          location: string | null
          organisation: string | null
          phone: string | null
          status: string
          tenant_id: string | null
          updated_at: string
          user_id: string
          verified_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          job_title?: string | null
          location?: string | null
          organisation?: string | null
          phone?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
          user_id: string
          verified_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          job_title?: string | null
          location?: string | null
          organisation?: string | null
          phone?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
          user_id?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      programme_assessment_config: {
        Row: {
          allow_resubmission: boolean
          assessment_type: string
          created_at: string
          enabled: boolean
          id: string
          max_attempts: number
          pass_mark: number | null
          programme_id: string
          requires_moderation: boolean
          updated_at: string
          weighting: number | null
        }
        Insert: {
          allow_resubmission?: boolean
          assessment_type: string
          created_at?: string
          enabled?: boolean
          id?: string
          max_attempts?: number
          pass_mark?: number | null
          programme_id: string
          requires_moderation?: boolean
          updated_at?: string
          weighting?: number | null
        }
        Update: {
          allow_resubmission?: boolean
          assessment_type?: string
          created_at?: string
          enabled?: boolean
          id?: string
          max_attempts?: number
          pass_mark?: number | null
          programme_id?: string
          requires_moderation?: boolean
          updated_at?: string
          weighting?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "programme_assessment_config_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "programmes"
            referencedColumns: ["id"]
          },
        ]
      }
      programme_completion_config: {
        Row: {
          completion_message: string | null
          created_at: string
          custom_html: string | null
          id: string
          programme_id: string
          recommended_programme_ids: string[] | null
          redirect_url: string | null
          show_certificate: boolean | null
          show_next_recommendations: boolean | null
          show_social_share: boolean | null
          updated_at: string
        }
        Insert: {
          completion_message?: string | null
          created_at?: string
          custom_html?: string | null
          id?: string
          programme_id: string
          recommended_programme_ids?: string[] | null
          redirect_url?: string | null
          show_certificate?: boolean | null
          show_next_recommendations?: boolean | null
          show_social_share?: boolean | null
          updated_at?: string
        }
        Update: {
          completion_message?: string | null
          created_at?: string
          custom_html?: string | null
          id?: string
          programme_id?: string
          recommended_programme_ids?: string[] | null
          redirect_url?: string | null
          show_certificate?: boolean | null
          show_next_recommendations?: boolean | null
          show_social_share?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "programme_completion_config_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: true
            referencedRelation: "programmes"
            referencedColumns: ["id"]
          },
        ]
      }
      programme_edit_permissions: {
        Row: {
          created_at: string
          expires_at: string | null
          granted_by: string
          grantee_id: string
          id: string
          is_active: boolean
          permission_type: string
          programme_id: string | null
          reason: string | null
          revoked_at: string | null
          revoked_by: string | null
          scope: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          granted_by: string
          grantee_id: string
          id?: string
          is_active?: boolean
          permission_type?: string
          programme_id?: string | null
          reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          scope?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          granted_by?: string
          grantee_id?: string
          id?: string
          is_active?: boolean
          permission_type?: string
          programme_id?: string | null
          reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          scope?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "programme_edit_permissions_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "programmes"
            referencedColumns: ["id"]
          },
        ]
      }
      programme_enrolment_config: {
        Row: {
          allow_re_enrolment: boolean | null
          capacity_limit: number | null
          coupon_codes: Json | null
          created_at: string
          currency: string | null
          duration_days: number | null
          duration_end_date: string | null
          duration_type: string | null
          enrolment_end: string | null
          enrolment_mode: string
          enrolment_start: string | null
          free_trial_days: number | null
          gateway_key: string | null
          id: string
          prerequisite_programme_ids: string[] | null
          price: number | null
          programme_id: string
          recurring_interval: string | null
          updated_at: string
          waitlist_enabled: boolean | null
        }
        Insert: {
          allow_re_enrolment?: boolean | null
          capacity_limit?: number | null
          coupon_codes?: Json | null
          created_at?: string
          currency?: string | null
          duration_days?: number | null
          duration_end_date?: string | null
          duration_type?: string | null
          enrolment_end?: string | null
          enrolment_mode?: string
          enrolment_start?: string | null
          free_trial_days?: number | null
          gateway_key?: string | null
          id?: string
          prerequisite_programme_ids?: string[] | null
          price?: number | null
          programme_id: string
          recurring_interval?: string | null
          updated_at?: string
          waitlist_enabled?: boolean | null
        }
        Update: {
          allow_re_enrolment?: boolean | null
          capacity_limit?: number | null
          coupon_codes?: Json | null
          created_at?: string
          currency?: string | null
          duration_days?: number | null
          duration_end_date?: string | null
          duration_type?: string | null
          enrolment_end?: string | null
          enrolment_mode?: string
          enrolment_start?: string | null
          free_trial_days?: number | null
          gateway_key?: string | null
          id?: string
          prerequisite_programme_ids?: string[] | null
          price?: number | null
          programme_id?: string
          recurring_interval?: string | null
          updated_at?: string
          waitlist_enabled?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "programme_enrolment_config_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: true
            referencedRelation: "programmes"
            referencedColumns: ["id"]
          },
        ]
      }
      programme_grading_scales: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          programme_id: string
          scale_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          programme_id: string
          scale_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          programme_id?: string
          scale_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "programme_grading_scales_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: true
            referencedRelation: "programmes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programme_grading_scales_scale_id_fkey"
            columns: ["scale_id"]
            isOneToOne: false
            referencedRelation: "grading_scales"
            referencedColumns: ["id"]
          },
        ]
      }
      programme_lifecycle_audit: {
        Row: {
          action: string
          created_at: string
          id: string
          metadata: Json | null
          new_status: string | null
          performed_by: string
          previous_status: string | null
          programme_id: string
          reason: string | null
          role_at_action: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          metadata?: Json | null
          new_status?: string | null
          performed_by: string
          previous_status?: string | null
          programme_id: string
          reason?: string | null
          role_at_action: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          new_status?: string | null
          performed_by?: string
          previous_status?: string | null
          programme_id?: string
          reason?: string | null
          role_at_action?: string
        }
        Relationships: [
          {
            foreignKeyName: "programme_lifecycle_audit_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "programmes"
            referencedColumns: ["id"]
          },
        ]
      }
      programme_modules: {
        Row: {
          created_at: string
          credential_label: string | null
          credits: number | null
          description: string | null
          duration_hours: number | null
          id: string
          is_mandatory: boolean | null
          module_type: string | null
          nqf_level: number | null
          pathway_id: string | null
          prerequisite_module_id: string | null
          programme_id: string
          sequence_order: number
          title: string
          unit_standard_code: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          credential_label?: string | null
          credits?: number | null
          description?: string | null
          duration_hours?: number | null
          id?: string
          is_mandatory?: boolean | null
          module_type?: string | null
          nqf_level?: number | null
          pathway_id?: string | null
          prerequisite_module_id?: string | null
          programme_id: string
          sequence_order?: number
          title: string
          unit_standard_code?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          credential_label?: string | null
          credits?: number | null
          description?: string | null
          duration_hours?: number | null
          id?: string
          is_mandatory?: boolean | null
          module_type?: string | null
          nqf_level?: number | null
          pathway_id?: string | null
          prerequisite_module_id?: string | null
          programme_id?: string
          sequence_order?: number
          title?: string
          unit_standard_code?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "programme_modules_pathway_id_fkey"
            columns: ["pathway_id"]
            isOneToOne: false
            referencedRelation: "pathways"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programme_modules_prerequisite_module_id_fkey"
            columns: ["prerequisite_module_id"]
            isOneToOne: false
            referencedRelation: "programme_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programme_modules_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "programmes"
            referencedColumns: ["id"]
          },
        ]
      }
      programme_type_country_mappings: {
        Row: {
          additional_rules: Json | null
          behaviour_overrides: Json | null
          country_id: string
          created_at: string
          id: string
          is_active: boolean
          local_name: string
          mentor_requirements: string | null
          programme_type_name: string
          qualification_framework_id: string | null
          regulatory_body_id: string | null
          theory_percentage: number | null
          updated_at: string
          verification_requirements: string | null
          workplace_percentage: number | null
        }
        Insert: {
          additional_rules?: Json | null
          behaviour_overrides?: Json | null
          country_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          local_name: string
          mentor_requirements?: string | null
          programme_type_name: string
          qualification_framework_id?: string | null
          regulatory_body_id?: string | null
          theory_percentage?: number | null
          updated_at?: string
          verification_requirements?: string | null
          workplace_percentage?: number | null
        }
        Update: {
          additional_rules?: Json | null
          behaviour_overrides?: Json | null
          country_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          local_name?: string
          mentor_requirements?: string | null
          programme_type_name?: string
          qualification_framework_id?: string | null
          regulatory_body_id?: string | null
          theory_percentage?: number | null
          updated_at?: string
          verification_requirements?: string | null
          workplace_percentage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "programme_type_country_mappings_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programme_type_country_mappings_qualification_framework_id_fkey"
            columns: ["qualification_framework_id"]
            isOneToOne: false
            referencedRelation: "qualification_frameworks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programme_type_country_mappings_regulatory_body_id_fkey"
            columns: ["regulatory_body_id"]
            isOneToOne: false
            referencedRelation: "regulatory_bodies"
            referencedColumns: ["id"]
          },
        ]
      }
      programme_types: {
        Row: {
          archived_at: string | null
          archived_by: string | null
          color: string
          config: Json
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          programme_count: number
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          archived_by?: string | null
          color?: string
          config?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          programme_count?: number
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          archived_by?: string | null
          color?: string
          config?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          programme_count?: number
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "programme_types_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programme_types_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      programmes: {
        Row: {
          ai_content_enabled: boolean
          ai_workflow_enabled: boolean | null
          archived_at: string | null
          archived_by: string | null
          cost_per_learner: number | null
          country_id: string | null
          created_at: string
          created_by: string | null
          credits: number | null
          description: string | null
          duration_months: number | null
          id: string
          manager_id: string | null
          nqf_level: number | null
          programme_type_id: string | null
          qualification_framework_id: string | null
          status: string
          tenant_id: string | null
          theory_percentage: number | null
          title: string
          updated_at: string
          version: string
          workplace_percentage: number | null
        }
        Insert: {
          ai_content_enabled?: boolean
          ai_workflow_enabled?: boolean | null
          archived_at?: string | null
          archived_by?: string | null
          cost_per_learner?: number | null
          country_id?: string | null
          created_at?: string
          created_by?: string | null
          credits?: number | null
          description?: string | null
          duration_months?: number | null
          id?: string
          manager_id?: string | null
          nqf_level?: number | null
          programme_type_id?: string | null
          qualification_framework_id?: string | null
          status?: string
          tenant_id?: string | null
          theory_percentage?: number | null
          title: string
          updated_at?: string
          version?: string
          workplace_percentage?: number | null
        }
        Update: {
          ai_content_enabled?: boolean
          ai_workflow_enabled?: boolean | null
          archived_at?: string | null
          archived_by?: string | null
          cost_per_learner?: number | null
          country_id?: string | null
          created_at?: string
          created_by?: string | null
          credits?: number | null
          description?: string | null
          duration_months?: number | null
          id?: string
          manager_id?: string | null
          nqf_level?: number | null
          programme_type_id?: string | null
          qualification_framework_id?: string | null
          status?: string
          tenant_id?: string | null
          theory_percentage?: number | null
          title?: string
          updated_at?: string
          version?: string
          workplace_percentage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "programmes_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programmes_programme_type_id_fkey"
            columns: ["programme_type_id"]
            isOneToOne: false
            referencedRelation: "programme_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programmes_qualification_framework_id_fkey"
            columns: ["qualification_framework_id"]
            isOneToOne: false
            referencedRelation: "qualification_frameworks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programmes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programmes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      qualification_frameworks: {
        Row: {
          acronym: string
          country_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          regional_alignment: string | null
          total_levels: number
          updated_at: string
        }
        Insert: {
          acronym: string
          country_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          regional_alignment?: string | null
          total_levels?: number
          updated_at?: string
        }
        Update: {
          acronym?: string
          country_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          regional_alignment?: string | null
          total_levels?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "qualification_frameworks_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      qualification_levels: {
        Row: {
          created_at: string
          credit_range: string | null
          descriptor: string | null
          framework_id: string
          id: string
          level_name: string
          level_number: number
        }
        Insert: {
          created_at?: string
          credit_range?: string | null
          descriptor?: string | null
          framework_id: string
          id?: string
          level_name: string
          level_number: number
        }
        Update: {
          created_at?: string
          credit_range?: string | null
          descriptor?: string | null
          framework_id?: string
          id?: string
          level_name?: string
          level_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "qualification_levels_framework_id_fkey"
            columns: ["framework_id"]
            isOneToOne: false
            referencedRelation: "qualification_frameworks"
            referencedColumns: ["id"]
          },
        ]
      }
      question_bank_items: {
        Row: {
          bank_id: string
          created_at: string
          created_by: string | null
          difficulty_level: string | null
          explanation: string | null
          fill_blanks: Json | null
          id: string
          learning_outcome_ids: string[] | null
          likert_config: Json | null
          matching_pairs: Json | null
          options: Json | null
          ordering_items: Json | null
          points: number
          question_text: string
          question_type: string
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          bank_id: string
          created_at?: string
          created_by?: string | null
          difficulty_level?: string | null
          explanation?: string | null
          fill_blanks?: Json | null
          id?: string
          learning_outcome_ids?: string[] | null
          likert_config?: Json | null
          matching_pairs?: Json | null
          options?: Json | null
          ordering_items?: Json | null
          points?: number
          question_text: string
          question_type?: string
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          bank_id?: string
          created_at?: string
          created_by?: string | null
          difficulty_level?: string | null
          explanation?: string | null
          fill_blanks?: Json | null
          id?: string
          learning_outcome_ids?: string[] | null
          likert_config?: Json | null
          matching_pairs?: Json | null
          options?: Json | null
          ordering_items?: Json | null
          points?: number
          question_text?: string
          question_type?: string
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_bank_items_bank_id_fkey"
            columns: ["bank_id"]
            isOneToOne: false
            referencedRelation: "question_banks"
            referencedColumns: ["id"]
          },
        ]
      }
      question_banks: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          folder_path: string | null
          id: string
          is_shared: boolean
          name: string
          programme_id: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          folder_path?: string | null
          id?: string
          is_shared?: boolean
          name: string
          programme_id?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          folder_path?: string | null
          id?: string
          is_shared?: boolean
          name?: string
          programme_id?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_banks_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "programmes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_banks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_banks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_options: {
        Row: {
          created_at: string
          id: string
          is_correct: boolean
          option_text: string
          question_id: string
          sequence_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_correct?: boolean
          option_text: string
          question_id: string
          sequence_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_correct?: boolean
          option_text?: string
          question_id?: string
          sequence_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "quiz_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          assessment_id: string
          branching_rules: Json
          created_at: string
          explanation: string | null
          id: string
          metadata: Json
          points: number
          question_text: string
          question_type: string
          section_id: string | null
          sequence_order: number
          updated_at: string
        }
        Insert: {
          assessment_id: string
          branching_rules?: Json
          created_at?: string
          explanation?: string | null
          id?: string
          metadata?: Json
          points?: number
          question_text: string
          question_type?: string
          section_id?: string | null
          sequence_order?: number
          updated_at?: string
        }
        Update: {
          assessment_id?: string
          branching_rules?: Json
          created_at?: string
          explanation?: string | null
          id?: string
          metadata?: Json
          points?: number
          question_text?: string
          question_type?: string
          section_id?: string | null
          sequence_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_questions_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "quiz_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_responses: {
        Row: {
          created_at: string
          id: string
          is_correct: boolean | null
          points_earned: number | null
          question_id: string
          selected_option_id: string | null
          submission_id: string
          text_answer: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_correct?: boolean | null
          points_earned?: number | null
          question_id: string
          selected_option_id?: string | null
          submission_id: string
          text_answer?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_correct?: boolean | null
          points_earned?: number | null
          question_id?: string
          selected_option_id?: string | null
          submission_id?: string
          text_answer?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_responses_selected_option_id_fkey"
            columns: ["selected_option_id"]
            isOneToOne: false
            referencedRelation: "quiz_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_responses_selected_option_id_fkey"
            columns: ["selected_option_id"]
            isOneToOne: false
            referencedRelation: "quiz_options_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_responses_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "assessment_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_sections: {
        Row: {
          assessment_id: string
          created_at: string
          description: string | null
          filter_difficulty: string[] | null
          filter_question_types: string[] | null
          filter_tags: string[] | null
          id: string
          is_pool: boolean
          pick_count: number | null
          sequence_order: number
          shuffle_questions: boolean
          source_bank_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assessment_id: string
          created_at?: string
          description?: string | null
          filter_difficulty?: string[] | null
          filter_question_types?: string[] | null
          filter_tags?: string[] | null
          id?: string
          is_pool?: boolean
          pick_count?: number | null
          sequence_order?: number
          shuffle_questions?: boolean
          source_bank_id?: string | null
          title?: string
          updated_at?: string
        }
        Update: {
          assessment_id?: string
          created_at?: string
          description?: string | null
          filter_difficulty?: string[] | null
          filter_question_types?: string[] | null
          filter_tags?: string[] | null
          id?: string
          is_pool?: boolean
          pick_count?: number | null
          sequence_order?: number
          shuffle_questions?: boolean
          source_bank_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_sections_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_sections_source_bank_id_fkey"
            columns: ["source_bank_id"]
            isOneToOne: false
            referencedRelation: "question_banks"
            referencedColumns: ["id"]
          },
        ]
      }
      registration_approval_steps: {
        Row: {
          approver_role: string | null
          approver_user_id: string | null
          created_at: string
          decided_at: string | null
          id: string
          reason: string | null
          registration_id: string
          status: string
          step_order: number
          updated_at: string
        }
        Insert: {
          approver_role?: string | null
          approver_user_id?: string | null
          created_at?: string
          decided_at?: string | null
          id?: string
          reason?: string | null
          registration_id: string
          status?: string
          step_order?: number
          updated_at?: string
        }
        Update: {
          approver_role?: string | null
          approver_user_id?: string | null
          created_at?: string
          decided_at?: string | null
          id?: string
          reason?: string | null
          registration_id?: string
          status?: string
          step_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "registration_approval_steps_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "learner_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      regulatory_bodies: {
        Row: {
          acronym: string
          body_type: string
          country_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
          website_url: string | null
        }
        Insert: {
          acronym: string
          body_type: string
          country_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          acronym?: string
          body_type?: string
          country_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "regulatory_bodies_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      reporting_mandates: {
        Row: {
          acronym: string | null
          created_at: string
          description: string | null
          framework_id: string
          frequency: string
          id: string
          is_mandatory: boolean
          report_name: string
          submission_body_id: string | null
          template_format: string | null
          updated_at: string
        }
        Insert: {
          acronym?: string | null
          created_at?: string
          description?: string | null
          framework_id: string
          frequency: string
          id?: string
          is_mandatory?: boolean
          report_name: string
          submission_body_id?: string | null
          template_format?: string | null
          updated_at?: string
        }
        Update: {
          acronym?: string | null
          created_at?: string
          description?: string | null
          framework_id?: string
          frequency?: string
          id?: string
          is_mandatory?: boolean
          report_name?: string
          submission_body_id?: string | null
          template_format?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reporting_mandates_framework_id_fkey"
            columns: ["framework_id"]
            isOneToOne: false
            referencedRelation: "country_regulatory_frameworks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reporting_mandates_submission_body_id_fkey"
            columns: ["submission_body_id"]
            isOneToOne: false
            referencedRelation: "regulatory_bodies"
            referencedColumns: ["id"]
          },
        ]
      }
      role_audit_log: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string
          entity_type: string
          id: string
          performed_by: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id: string
          entity_type: string
          id?: string
          performed_by?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string
          entity_type?: string
          id?: string
          performed_by?: string | null
        }
        Relationships: []
      }
      role_definitions: {
        Row: {
          base_role: Database["public"]["Enums"]["app_role"] | null
          created_at: string
          created_by: string | null
          dashboard_path: string | null
          description: string | null
          display_name: string
          domain: string
          id: string
          is_active: boolean
          is_predefined: boolean
          menu_config: Json | null
          permissions: Json | null
          portal_subtitle: string | null
          portal_title: string | null
          role_key: string
          template_source_id: string | null
          tenant_id: string | null
          updated_at: string
          widget_config: Json | null
        }
        Insert: {
          base_role?: Database["public"]["Enums"]["app_role"] | null
          created_at?: string
          created_by?: string | null
          dashboard_path?: string | null
          description?: string | null
          display_name: string
          domain: string
          id?: string
          is_active?: boolean
          is_predefined?: boolean
          menu_config?: Json | null
          permissions?: Json | null
          portal_subtitle?: string | null
          portal_title?: string | null
          role_key: string
          template_source_id?: string | null
          tenant_id?: string | null
          updated_at?: string
          widget_config?: Json | null
        }
        Update: {
          base_role?: Database["public"]["Enums"]["app_role"] | null
          created_at?: string
          created_by?: string | null
          dashboard_path?: string | null
          description?: string | null
          display_name?: string
          domain?: string
          id?: string
          is_active?: boolean
          is_predefined?: boolean
          menu_config?: Json | null
          permissions?: Json | null
          portal_subtitle?: string | null
          portal_title?: string | null
          role_key?: string
          template_source_id?: string | null
          tenant_id?: string | null
          updated_at?: string
          widget_config?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "role_definitions_template_source_id_fkey"
            columns: ["template_source_id"]
            isOneToOne: false
            referencedRelation: "role_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_definitions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_definitions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          action: string
          conditions: Json | null
          created_at: string
          id: string
          is_granted: boolean
          resource: string
          role_definition_id: string
          updated_at: string
        }
        Insert: {
          action: string
          conditions?: Json | null
          created_at?: string
          id?: string
          is_granted?: boolean
          resource: string
          role_definition_id: string
          updated_at?: string
        }
        Update: {
          action?: string
          conditions?: Json | null
          created_at?: string
          id?: string
          is_granted?: boolean
          resource?: string
          role_definition_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_role_definition_id_fkey"
            columns: ["role_definition_id"]
            isOneToOne: false
            referencedRelation: "role_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      rubric_criteria: {
        Row: {
          created_at: string
          criterion_name: string
          description: string | null
          id: string
          max_points: number
          performance_levels: Json
          rubric_id: string
          sequence_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          criterion_name: string
          description?: string | null
          id?: string
          max_points?: number
          performance_levels?: Json
          rubric_id: string
          sequence_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          criterion_name?: string
          description?: string | null
          id?: string
          max_points?: number
          performance_levels?: Json
          rubric_id?: string
          sequence_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rubric_criteria_rubric_id_fkey"
            columns: ["rubric_id"]
            isOneToOne: false
            referencedRelation: "rubrics"
            referencedColumns: ["id"]
          },
        ]
      }
      rubrics: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_reusable: boolean
          max_score: number | null
          name: string
          programme_id: string | null
          rubric_type: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_reusable?: boolean
          max_score?: number | null
          name: string
          programme_id?: string | null
          rubric_type?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_reusable?: boolean
          max_score?: number | null
          name?: string
          programme_id?: string | null
          rubric_type?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rubrics_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "programmes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rubrics_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rubrics_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      scorm_cmi_data: {
        Row: {
          element: string
          id: string
          session_id: string
          updated_at: string
          value: string | null
        }
        Insert: {
          element: string
          id?: string
          session_id: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          element?: string
          id?: string
          session_id?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scorm_cmi_data_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "scorm_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      scorm_packages: {
        Row: {
          content_block_id: string | null
          created_at: string
          created_by: string | null
          error_message: string | null
          file_size_bytes: number | null
          id: string
          launch_path: string
          manifest: Json | null
          scorm_version: string
          status: string
          storage_path: string
          tenant_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          content_block_id?: string | null
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          file_size_bytes?: number | null
          id?: string
          launch_path?: string
          manifest?: Json | null
          scorm_version?: string
          status?: string
          storage_path: string
          tenant_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          content_block_id?: string | null
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          file_size_bytes?: number | null
          id?: string
          launch_path?: string
          manifest?: Json | null
          scorm_version?: string
          status?: string
          storage_path?: string
          tenant_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scorm_packages_content_block_id_fkey"
            columns: ["content_block_id"]
            isOneToOne: false
            referencedRelation: "content_blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scorm_packages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scorm_packages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      scorm_sessions: {
        Row: {
          attempt_number: number
          completion_status: string | null
          entry_mode: string | null
          exit_mode: string | null
          finished_at: string | null
          id: string
          last_accessed_at: string
          learner_id: string
          location: string | null
          package_id: string
          sco_id: string
          score_max: number | null
          score_min: number | null
          score_raw: number | null
          score_scaled: number | null
          session_time_seconds: number | null
          started_at: string
          success_status: string | null
          suspend_data: string | null
          total_time_seconds: number | null
        }
        Insert: {
          attempt_number?: number
          completion_status?: string | null
          entry_mode?: string | null
          exit_mode?: string | null
          finished_at?: string | null
          id?: string
          last_accessed_at?: string
          learner_id: string
          location?: string | null
          package_id: string
          sco_id?: string
          score_max?: number | null
          score_min?: number | null
          score_raw?: number | null
          score_scaled?: number | null
          session_time_seconds?: number | null
          started_at?: string
          success_status?: string | null
          suspend_data?: string | null
          total_time_seconds?: number | null
        }
        Update: {
          attempt_number?: number
          completion_status?: string | null
          entry_mode?: string | null
          exit_mode?: string | null
          finished_at?: string | null
          id?: string
          last_accessed_at?: string
          learner_id?: string
          location?: string | null
          package_id?: string
          sco_id?: string
          score_max?: number | null
          score_min?: number | null
          score_raw?: number | null
          score_scaled?: number | null
          session_time_seconds?: number | null
          started_at?: string
          success_status?: string | null
          suspend_data?: string | null
          total_time_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "scorm_sessions_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "scorm_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      security_incidents: {
        Row: {
          affected_systems: string | null
          affected_users_count: number | null
          assigned_to: string | null
          category: string
          corrective_actions: string | null
          created_at: string
          data_breach: boolean
          description: string | null
          detected_at: string
          id: string
          preventive_actions: string | null
          regulator_notified: boolean
          regulator_notified_at: string | null
          reported_by: string
          resolution_notes: string | null
          resolved_at: string | null
          root_cause: string | null
          severity: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          affected_systems?: string | null
          affected_users_count?: number | null
          assigned_to?: string | null
          category?: string
          corrective_actions?: string | null
          created_at?: string
          data_breach?: boolean
          description?: string | null
          detected_at?: string
          id?: string
          preventive_actions?: string | null
          regulator_notified?: boolean
          regulator_notified_at?: string | null
          reported_by: string
          resolution_notes?: string | null
          resolved_at?: string | null
          root_cause?: string | null
          severity?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          affected_systems?: string | null
          affected_users_count?: number | null
          assigned_to?: string | null
          category?: string
          corrective_actions?: string | null
          created_at?: string
          data_breach?: boolean
          description?: string | null
          detected_at?: string
          id?: string
          preventive_actions?: string | null
          regulator_notified?: boolean
          regulator_notified_at?: string | null
          reported_by?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          root_cause?: string | null
          severity?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      session_attendance: {
        Row: {
          check_in_method: string | null
          checked_in_at: string | null
          checked_out_at: string | null
          created_at: string
          duration_minutes: number | null
          id: string
          late_minutes: number | null
          learner_id: string
          marked_by: string | null
          notes: string | null
          qr_token: string | null
          session_id: string
          status: string
          updated_at: string
        }
        Insert: {
          check_in_method?: string | null
          checked_in_at?: string | null
          checked_out_at?: string | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          late_minutes?: number | null
          learner_id: string
          marked_by?: string | null
          notes?: string | null
          qr_token?: string | null
          session_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          check_in_method?: string | null
          checked_in_at?: string | null
          checked_out_at?: string | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          late_minutes?: number | null
          learner_id?: string
          marked_by?: string | null
          notes?: string | null
          qr_token?: string | null
          session_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_attendance_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "training_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_attendance_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "training_sessions_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      session_chat_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          message_type: string
          session_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          message_type?: string
          session_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          message_type?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "training_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "training_sessions_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      session_notes: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          is_shared: boolean
          note_type: string
          session_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          content?: string
          created_at?: string
          id?: string
          is_shared?: boolean
          note_type?: string
          session_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          is_shared?: boolean
          note_type?: string
          session_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_notes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "training_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_notes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "training_sessions_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_content_items: {
        Row: {
          content: Json | null
          content_type: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          status: string
          tags: string[] | null
          tenant_id: string | null
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          content?: Json | null
          content_type?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          status?: string
          tags?: string[] | null
          tenant_id?: string | null
          title: string
          updated_at?: string
          version?: number
        }
        Update: {
          content?: Json | null
          content_type?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          status?: string
          tags?: string[] | null
          tenant_id?: string | null
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "shared_content_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_content_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_content_versions: {
        Row: {
          change_reason: string | null
          changed_by: string | null
          content: Json | null
          created_at: string
          id: string
          item_id: string
          version_number: number
        }
        Insert: {
          change_reason?: string | null
          changed_by?: string | null
          content?: Json | null
          created_at?: string
          id?: string
          item_id: string
          version_number: number
        }
        Update: {
          change_reason?: string | null
          changed_by?: string | null
          content?: Json | null
          created_at?: string
          id?: string
          item_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "shared_content_versions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "shared_content_items"
            referencedColumns: ["id"]
          },
        ]
      }
      skills: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "skills_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skills_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsor_compliance_evidence: {
        Row: {
          created_at: string
          description: string | null
          evidence_type: string
          external_url: string | null
          file_path: string | null
          id: string
          record_id: string
          reference_id: string | null
          reference_table: string | null
          title: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          evidence_type?: string
          external_url?: string | null
          file_path?: string | null
          id?: string
          record_id: string
          reference_id?: string | null
          reference_table?: string | null
          title: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          evidence_type?: string
          external_url?: string | null
          file_path?: string | null
          id?: string
          record_id?: string
          reference_id?: string | null
          reference_table?: string | null
          title?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sponsor_compliance_evidence_record_id_fkey"
            columns: ["record_id"]
            isOneToOne: false
            referencedRelation: "sponsor_compliance_records"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsor_compliance_frameworks: {
        Row: {
          beneficiary_categories: Json
          country_id: string
          created_at: string
          description: string | null
          effective_from: string
          effective_to: string | null
          framework_code: string
          framework_name: string
          id: string
          is_active: boolean
          scoring_config: Json
          updated_at: string
          version: string
        }
        Insert: {
          beneficiary_categories?: Json
          country_id: string
          created_at?: string
          description?: string | null
          effective_from?: string
          effective_to?: string | null
          framework_code: string
          framework_name: string
          id?: string
          is_active?: boolean
          scoring_config?: Json
          updated_at?: string
          version?: string
        }
        Update: {
          beneficiary_categories?: Json
          country_id?: string
          created_at?: string
          description?: string | null
          effective_from?: string
          effective_to?: string | null
          framework_code?: string
          framework_name?: string
          id?: string
          is_active?: boolean
          scoring_config?: Json
          updated_at?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "sponsor_compliance_frameworks_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsor_compliance_indicators: {
        Row: {
          category: string
          created_at: string
          data_source: string | null
          description: string | null
          framework_id: string
          id: string
          indicator_code: string
          indicator_name: string
          is_active: boolean
          is_auto_captured: boolean
          max_points: number
          sequence_order: number
          target_value: number | null
          unit: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          data_source?: string | null
          description?: string | null
          framework_id: string
          id?: string
          indicator_code: string
          indicator_name: string
          is_active?: boolean
          is_auto_captured?: boolean
          max_points?: number
          sequence_order?: number
          target_value?: number | null
          unit?: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          data_source?: string | null
          description?: string | null
          framework_id?: string
          id?: string
          indicator_code?: string
          indicator_name?: string
          is_active?: boolean
          is_auto_captured?: boolean
          max_points?: number
          sequence_order?: number
          target_value?: number | null
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sponsor_compliance_indicators_framework_id_fkey"
            columns: ["framework_id"]
            isOneToOne: false
            referencedRelation: "sponsor_compliance_frameworks"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsor_compliance_records: {
        Row: {
          actual_value: number
          beneficiary_breakdown: Json | null
          calculated_score: number
          created_at: string
          framework_id: string
          id: string
          indicator_id: string
          last_calculated_at: string | null
          notes: string | null
          reporting_period_end: string
          reporting_period_start: string
          score_capped: boolean
          sponsor_id: string
          target_value: number
          updated_at: string
        }
        Insert: {
          actual_value?: number
          beneficiary_breakdown?: Json | null
          calculated_score?: number
          created_at?: string
          framework_id: string
          id?: string
          indicator_id: string
          last_calculated_at?: string | null
          notes?: string | null
          reporting_period_end: string
          reporting_period_start: string
          score_capped?: boolean
          sponsor_id: string
          target_value?: number
          updated_at?: string
        }
        Update: {
          actual_value?: number
          beneficiary_breakdown?: Json | null
          calculated_score?: number
          created_at?: string
          framework_id?: string
          id?: string
          indicator_id?: string
          last_calculated_at?: string | null
          notes?: string | null
          reporting_period_end?: string
          reporting_period_start?: string
          score_capped?: boolean
          sponsor_id?: string
          target_value?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sponsor_compliance_records_framework_id_fkey"
            columns: ["framework_id"]
            isOneToOne: false
            referencedRelation: "sponsor_compliance_frameworks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsor_compliance_records_indicator_id_fkey"
            columns: ["indicator_id"]
            isOneToOne: false
            referencedRelation: "sponsor_compliance_indicators"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsor_compliance_reports: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          bbbee_level: string | null
          created_at: string
          file_path: string | null
          framework_id: string
          generated_at: string
          id: string
          report_data: Json
          reporting_period_end: string
          reporting_period_start: string
          sponsor_id: string
          status: string
          total_ed_score: number | null
          total_sd_score: number | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          bbbee_level?: string | null
          created_at?: string
          file_path?: string | null
          framework_id: string
          generated_at?: string
          id?: string
          report_data?: Json
          reporting_period_end: string
          reporting_period_start: string
          sponsor_id: string
          status?: string
          total_ed_score?: number | null
          total_sd_score?: number | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          bbbee_level?: string | null
          created_at?: string
          file_path?: string | null
          framework_id?: string
          generated_at?: string
          id?: string
          report_data?: Json
          reporting_period_end?: string
          reporting_period_start?: string
          sponsor_id?: string
          status?: string
          total_ed_score?: number | null
          total_sd_score?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sponsor_compliance_reports_framework_id_fkey"
            columns: ["framework_id"]
            isOneToOne: false
            referencedRelation: "sponsor_compliance_frameworks"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsor_invitations: {
        Row: {
          accepted_at: string | null
          company_name: string
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          notes: string | null
          programme_ids: string[] | null
          status: string
          token: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          company_name: string
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          notes?: string | null
          programme_ids?: string[] | null
          status?: string
          token?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          company_name?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          notes?: string | null
          programme_ids?: string[] | null
          status?: string
          token?: string
          updated_at?: string
        }
        Relationships: []
      }
      sponsor_invoices: {
        Row: {
          amount: number
          claim_reference: string | null
          cohort_id: string | null
          cost_per_learner: number | null
          country_id: string | null
          created_at: string
          currency: string
          description: string | null
          due_date: string | null
          framework_id: string | null
          funding_type: string | null
          id: string
          invoice_number: string
          issued_date: string | null
          learner_count: number | null
          notes: string | null
          paid_date: string | null
          payment_reference: string | null
          programme_id: string | null
          programme_type_id: string | null
          quote_id: string | null
          sponsor_id: string
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          claim_reference?: string | null
          cohort_id?: string | null
          cost_per_learner?: number | null
          country_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          due_date?: string | null
          framework_id?: string | null
          funding_type?: string | null
          id?: string
          invoice_number: string
          issued_date?: string | null
          learner_count?: number | null
          notes?: string | null
          paid_date?: string | null
          payment_reference?: string | null
          programme_id?: string | null
          programme_type_id?: string | null
          quote_id?: string | null
          sponsor_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          claim_reference?: string | null
          cohort_id?: string | null
          cost_per_learner?: number | null
          country_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          due_date?: string | null
          framework_id?: string | null
          funding_type?: string | null
          id?: string
          invoice_number?: string
          issued_date?: string | null
          learner_count?: number | null
          notes?: string | null
          paid_date?: string | null
          payment_reference?: string | null
          programme_id?: string | null
          programme_type_id?: string | null
          quote_id?: string | null
          sponsor_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sponsor_invoices_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsor_invoices_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsor_invoices_framework_id_fkey"
            columns: ["framework_id"]
            isOneToOne: false
            referencedRelation: "country_regulatory_frameworks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsor_invoices_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "programmes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsor_invoices_programme_type_id_fkey"
            columns: ["programme_type_id"]
            isOneToOne: false
            referencedRelation: "programme_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsor_invoices_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "sponsor_quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsor_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          is_read: boolean
          parent_message_id: string | null
          read_at: string | null
          recipient_id: string
          sender_id: string
          subject: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_read?: boolean
          parent_message_id?: string | null
          read_at?: string | null
          recipient_id: string
          sender_id: string
          subject: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_read?: boolean
          parent_message_id?: string | null
          read_at?: string | null
          recipient_id?: string
          sender_id?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "sponsor_messages_parent_message_id_fkey"
            columns: ["parent_message_id"]
            isOneToOne: false
            referencedRelation: "sponsor_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsor_profiles: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          bee_level: string | null
          billing_address: string | null
          billing_email: string | null
          company_name: string
          contact_email: string | null
          contact_person: string | null
          contact_phone: string | null
          country_id: string | null
          created_at: string
          id: string
          industry: string | null
          notes: string | null
          registration_number: string | null
          rejection_reason: string | null
          sector: string | null
          status: string
          tenant_id: string | null
          updated_at: string
          user_id: string
          vat_number: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          bee_level?: string | null
          billing_address?: string | null
          billing_email?: string | null
          company_name: string
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          country_id?: string | null
          created_at?: string
          id?: string
          industry?: string | null
          notes?: string | null
          registration_number?: string | null
          rejection_reason?: string | null
          sector?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
          user_id: string
          vat_number?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          bee_level?: string | null
          billing_address?: string | null
          billing_email?: string | null
          company_name?: string
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          country_id?: string | null
          created_at?: string
          id?: string
          industry?: string | null
          notes?: string | null
          registration_number?: string | null
          rejection_reason?: string | null
          sector?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
          user_id?: string
          vat_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sponsor_profiles_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsor_profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsor_profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsor_programme_links: {
        Row: {
          cohort_id: string | null
          contract_reference: string | null
          created_at: string
          created_by: string | null
          end_date: string | null
          enrolment_id: string | null
          funding_amount: number | null
          funding_currency: string | null
          id: string
          link_type: string
          notes: string | null
          programme_id: string | null
          sponsor_id: string
          start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          cohort_id?: string | null
          contract_reference?: string | null
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          enrolment_id?: string | null
          funding_amount?: number | null
          funding_currency?: string | null
          id?: string
          link_type?: string
          notes?: string | null
          programme_id?: string | null
          sponsor_id: string
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          cohort_id?: string | null
          contract_reference?: string | null
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          enrolment_id?: string | null
          funding_amount?: number | null
          funding_currency?: string | null
          id?: string
          link_type?: string
          notes?: string | null
          programme_id?: string | null
          sponsor_id?: string
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sponsor_programme_links_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsor_programme_links_enrolment_id_fkey"
            columns: ["enrolment_id"]
            isOneToOne: false
            referencedRelation: "enrolments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsor_programme_links_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "programmes"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsor_quotes: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          cohort_id: string | null
          cost_per_learner: number
          country_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          id: string
          learner_count: number
          notes: string | null
          programme_id: string | null
          programme_type_id: string | null
          quote_number: string
          rejected_at: string | null
          rejection_reason: string | null
          revision_notes: string | null
          sponsor_id: string
          status: string
          total_amount: number | null
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          cohort_id?: string | null
          cost_per_learner?: number
          country_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          learner_count?: number
          notes?: string | null
          programme_id?: string | null
          programme_type_id?: string | null
          quote_number: string
          rejected_at?: string | null
          rejection_reason?: string | null
          revision_notes?: string | null
          sponsor_id: string
          status?: string
          total_amount?: number | null
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          cohort_id?: string | null
          cost_per_learner?: number
          country_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          learner_count?: number
          notes?: string | null
          programme_id?: string | null
          programme_type_id?: string | null
          quote_number?: string
          rejected_at?: string | null
          rejection_reason?: string | null
          revision_notes?: string | null
          sponsor_id?: string
          status?: string
          total_amount?: number | null
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sponsor_quotes_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsor_quotes_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsor_quotes_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "programmes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsor_quotes_programme_type_id_fkey"
            columns: ["programme_type_id"]
            isOneToOne: false
            referencedRelation: "programme_types"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsor_sd_expenditures: {
        Row: {
          amount: number
          beneficiary_type: string | null
          category: string
          created_at: string
          description: string | null
          evidence_reference: string | null
          expenditure_date: string | null
          id: string
          is_accredited: boolean
          learner_id: string | null
          profile_id: string
          sponsor_id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          beneficiary_type?: string | null
          category: string
          created_at?: string
          description?: string | null
          evidence_reference?: string | null
          expenditure_date?: string | null
          id?: string
          is_accredited?: boolean
          learner_id?: string | null
          profile_id: string
          sponsor_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          beneficiary_type?: string | null
          category?: string
          created_at?: string
          description?: string | null
          evidence_reference?: string | null
          expenditure_date?: string | null
          id?: string
          is_accredited?: boolean
          learner_id?: string | null
          profile_id?: string
          sponsor_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sponsor_sd_expenditures_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "sponsor_sd_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsor_sd_profiles: {
        Row: {
          admin_cap_percentage: number
          annual_leviable_amount: number
          atr_submitted: boolean
          calculated_target: number | null
          created_at: string
          financial_year: string
          id: string
          informal_cap_percentage: number
          notes: string | null
          scorecard_type: string
          sponsor_id: string
          sub_minimum_percentage: number
          target_percentage: number
          travel_cap_percentage: number
          updated_at: string
          wsp_submitted: boolean
        }
        Insert: {
          admin_cap_percentage?: number
          annual_leviable_amount?: number
          atr_submitted?: boolean
          calculated_target?: number | null
          created_at?: string
          financial_year: string
          id?: string
          informal_cap_percentage?: number
          notes?: string | null
          scorecard_type?: string
          sponsor_id: string
          sub_minimum_percentage?: number
          target_percentage?: number
          travel_cap_percentage?: number
          updated_at?: string
          wsp_submitted?: boolean
        }
        Update: {
          admin_cap_percentage?: number
          annual_leviable_amount?: number
          atr_submitted?: boolean
          calculated_target?: number | null
          created_at?: string
          financial_year?: string
          id?: string
          informal_cap_percentage?: number
          notes?: string | null
          scorecard_type?: string
          sponsor_id?: string
          sub_minimum_percentage?: number
          target_percentage?: number
          travel_cap_percentage?: number
          updated_at?: string
          wsp_submitted?: boolean
        }
        Relationships: []
      }
      sponsor_seta_checklist: {
        Row: {
          check_key: string
          check_label: string
          completed_at: string | null
          completed_by: string | null
          created_at: string
          financial_year: string
          id: string
          is_completed: boolean
          notes: string | null
          sponsor_id: string
          updated_at: string
        }
        Insert: {
          check_key: string
          check_label: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          financial_year: string
          id?: string
          is_completed?: boolean
          notes?: string | null
          sponsor_id: string
          updated_at?: string
        }
        Update: {
          check_key?: string
          check_label?: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          financial_year?: string
          id?: string
          is_completed?: boolean
          notes?: string | null
          sponsor_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      staff_document_requests: {
        Row: {
          created_at: string
          document_types: string[]
          expires_at: string
          fulfilled_at: string | null
          id: string
          last_reminder_at: string | null
          message: string | null
          registration_id: string
          reminder_count: number
          requested_by: string | null
          secure_upload_token: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          document_types?: string[]
          expires_at?: string
          fulfilled_at?: string | null
          id?: string
          last_reminder_at?: string | null
          message?: string | null
          registration_id: string
          reminder_count?: number
          requested_by?: string | null
          secure_upload_token?: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          document_types?: string[]
          expires_at?: string
          fulfilled_at?: string | null
          id?: string
          last_reminder_at?: string | null
          message?: string | null
          registration_id?: string
          reminder_count?: number
          requested_by?: string | null
          secure_upload_token?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_document_requests_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "staff_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_registrations: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          credentials_sent: boolean | null
          department: string | null
          document_verification_status: string
          document_verified_at: string | null
          document_verified_by: string | null
          documents: Json | null
          email: string
          full_name: string
          id: string
          notes: string | null
          phone: string | null
          portal_access_granted: boolean | null
          registered_by: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          role_requested: string
          status: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          credentials_sent?: boolean | null
          department?: string | null
          document_verification_status?: string
          document_verified_at?: string | null
          document_verified_by?: string | null
          documents?: Json | null
          email: string
          full_name: string
          id?: string
          notes?: string | null
          phone?: string | null
          portal_access_granted?: boolean | null
          registered_by?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          role_requested: string
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          credentials_sent?: boolean | null
          department?: string | null
          document_verification_status?: string
          document_verified_at?: string | null
          document_verified_by?: string | null
          documents?: Json | null
          email?: string
          full_name?: string
          id?: string
          notes?: string | null
          phone?: string | null
          portal_access_granted?: boolean | null
          registered_by?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          role_requested?: string
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_registrations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_registrations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_role_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          created_at: string
          id: string
          is_active: boolean
          role_name: string
          staff_registration_id: string
          updated_at: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          role_name: string
          staff_registration_id: string
          updated_at?: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          role_name?: string
          staff_registration_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_role_assignments_staff_registration_id_fkey"
            columns: ["staff_registration_id"]
            isOneToOne: false
            referencedRelation: "staff_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_verification_items: {
        Row: {
          check_label: string
          check_name: string
          created_at: string
          evidence_document_id: string | null
          id: string
          is_required: boolean
          notes: string | null
          registration_id: string
          section: string
          status: string
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          check_label: string
          check_name: string
          created_at?: string
          evidence_document_id?: string | null
          id?: string
          is_required?: boolean
          notes?: string | null
          registration_id: string
          section: string
          status?: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          check_label?: string
          check_name?: string
          created_at?: string
          evidence_document_id?: string | null
          id?: string
          is_required?: boolean
          notes?: string | null
          registration_id?: string
          section?: string
          status?: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_verification_items_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "staff_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key: string
          setting_value?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      tenant_audit_log: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
          performed_by: string | null
          tenant_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          performed_by?: string | null
          tenant_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          performed_by?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_audit_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_audit_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_domains: {
        Row: {
          created_at: string
          created_by: string | null
          hostname: string
          id: string
          is_primary: boolean
          last_checked_at: string | null
          status: string
          tenant_id: string
          updated_at: string
          verification_method: string
          verification_token: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          hostname: string
          id?: string
          is_primary?: boolean
          last_checked_at?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
          verification_method?: string
          verification_token: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          hostname?: string
          id?: string
          is_primary?: boolean
          last_checked_at?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
          verification_method?: string
          verification_token?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_domains_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_domains_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_feature_flags: {
        Row: {
          config: Json | null
          created_at: string
          flag_key: string
          id: string
          is_enabled: boolean
          tenant_id: string
          updated_at: string
        }
        Insert: {
          config?: Json | null
          created_at?: string
          flag_key: string
          id?: string
          is_enabled?: boolean
          tenant_id: string
          updated_at?: string
        }
        Update: {
          config?: Json | null
          created_at?: string
          flag_key?: string
          id?: string
          is_enabled?: boolean
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_feature_flags_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_feature_flags_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          role: string
          status: string
          tenant_id: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: string
          status?: string
          tenant_id: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: string
          status?: string
          tenant_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_invitations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_invitations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_payment_gateways: {
        Row: {
          created_at: string
          created_by: string | null
          credentials_live: Json
          credentials_test: Json
          display_label: string | null
          id: string
          is_default: boolean
          is_enabled: boolean
          last_verified_at: string | null
          mode: string
          provider_key: string
          tenant_id: string
          updated_at: string
          verification_status: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          credentials_live?: Json
          credentials_test?: Json
          display_label?: string | null
          id?: string
          is_default?: boolean
          is_enabled?: boolean
          last_verified_at?: string | null
          mode?: string
          provider_key: string
          tenant_id: string
          updated_at?: string
          verification_status?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          credentials_live?: Json
          credentials_test?: Json
          display_label?: string | null
          id?: string
          is_default?: boolean
          is_enabled?: boolean
          last_verified_at?: string | null
          mode?: string
          provider_key?: string
          tenant_id?: string
          updated_at?: string
          verification_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_payment_gateways_provider_key_fkey"
            columns: ["provider_key"]
            isOneToOne: false
            referencedRelation: "billing_providers"
            referencedColumns: ["provider_key"]
          },
          {
            foreignKeyName: "tenant_payment_gateways_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_payment_gateways_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          cancelled_at: string | null
          created_at: string
          currency: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          metadata: Json
          price_id: string | null
          provider_customer_id: string | null
          provider_key: string | null
          provider_subscription_id: string | null
          status: Database["public"]["Enums"]["subscription_status"]
          tenant_id: string
          tier_id: string
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          cancelled_at?: string | null
          created_at?: string
          currency?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          metadata?: Json
          price_id?: string | null
          provider_customer_id?: string | null
          provider_key?: string | null
          provider_subscription_id?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          tenant_id: string
          tier_id: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          cancel_at_period_end?: boolean
          cancelled_at?: string | null
          created_at?: string
          currency?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          metadata?: Json
          price_id?: string | null
          provider_customer_id?: string | null
          provider_key?: string | null
          provider_subscription_id?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          tenant_id?: string
          tier_id?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_subscriptions_price_id_fkey"
            columns: ["price_id"]
            isOneToOne: false
            referencedRelation: "billing_tier_prices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_subscriptions_provider_key_fkey"
            columns: ["provider_key"]
            isOneToOne: false
            referencedRelation: "billing_providers"
            referencedColumns: ["provider_key"]
          },
          {
            foreignKeyName: "tenant_subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_subscriptions_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "billing_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_users: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          joined_at: string
          role: string
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          joined_at?: string
          role?: string
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          joined_at?: string
          role?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          address: string | null
          contact_email: string | null
          contact_phone: string | null
          country: string | null
          created_at: string
          created_by: string | null
          domain: string | null
          favicon_url: string | null
          id: string
          logo_url: string | null
          max_programmes: number | null
          max_users: number | null
          name: string
          primary_color: string | null
          secondary_color: string | null
          settings: Json | null
          slug: string
          status: string
          subscription_tier: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          domain?: string | null
          favicon_url?: string | null
          id?: string
          logo_url?: string | null
          max_programmes?: number | null
          max_users?: number | null
          name: string
          primary_color?: string | null
          secondary_color?: string | null
          settings?: Json | null
          slug: string
          status?: string
          subscription_tier?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          domain?: string | null
          favicon_url?: string | null
          id?: string
          logo_url?: string | null
          max_programmes?: number | null
          max_users?: number | null
          name?: string
          primary_color?: string | null
          secondary_color?: string | null
          settings?: Json | null
          slug?: string
          status?: string
          subscription_tier?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      training_sessions: {
        Row: {
          actual_end: string | null
          actual_start: string | null
          agenda: Json | null
          cohort_id: string
          created_at: string
          created_by: string
          description: string | null
          facilitator_id: string | null
          id: string
          jitsi_room_id: string
          max_duration_minutes: number | null
          meeting_config: Json | null
          meeting_url: string | null
          notes: string | null
          qr_checkin_enabled: boolean | null
          qr_token: string | null
          recording_url: string | null
          recurrence_parent_id: string | null
          recurrence_rule: string | null
          scheduled_end: string
          scheduled_start: string
          session_type: string
          status: string
          tenant_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          actual_end?: string | null
          actual_start?: string | null
          agenda?: Json | null
          cohort_id: string
          created_at?: string
          created_by: string
          description?: string | null
          facilitator_id?: string | null
          id?: string
          jitsi_room_id?: string
          max_duration_minutes?: number | null
          meeting_config?: Json | null
          meeting_url?: string | null
          notes?: string | null
          qr_checkin_enabled?: boolean | null
          qr_token?: string | null
          recording_url?: string | null
          recurrence_parent_id?: string | null
          recurrence_rule?: string | null
          scheduled_end: string
          scheduled_start: string
          session_type?: string
          status?: string
          tenant_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          actual_end?: string | null
          actual_start?: string | null
          agenda?: Json | null
          cohort_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          facilitator_id?: string | null
          id?: string
          jitsi_room_id?: string
          max_duration_minutes?: number | null
          meeting_config?: Json | null
          meeting_url?: string | null
          notes?: string | null
          qr_checkin_enabled?: boolean | null
          qr_token?: string | null
          recording_url?: string | null
          recurrence_parent_id?: string | null
          recurrence_rule?: string | null
          scheduled_end?: string
          scheduled_start?: string
          session_type?: string
          status?: string
          tenant_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_sessions_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_sessions_recurrence_parent_id_fkey"
            columns: ["recurrence_parent_id"]
            isOneToOne: false
            referencedRelation: "training_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_sessions_recurrence_parent_id_fkey"
            columns: ["recurrence_parent_id"]
            isOneToOne: false
            referencedRelation: "training_sessions_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      transactional_outbox: {
        Row: {
          aggregate_id: string
          aggregate_type: string
          created_at: string
          event_type: string
          id: string
          last_error: string | null
          payload: Json
          processed_at: string | null
          retry_count: number
          status: string
        }
        Insert: {
          aggregate_id: string
          aggregate_type: string
          created_at?: string
          event_type: string
          id?: string
          last_error?: string | null
          payload?: Json
          processed_at?: string | null
          retry_count?: number
          status?: string
        }
        Update: {
          aggregate_id?: string
          aggregate_type?: string
          created_at?: string
          event_type?: string
          id?: string
          last_error?: string | null
          payload?: Json
          processed_at?: string | null
          retry_count?: number
          status?: string
        }
        Relationships: []
      }
      typography_assignments: {
        Row: {
          created_at: string
          desktop_settings: Json
          element_group: string
          font_family: string
          font_source: string
          font_style: string | null
          font_weight: string | null
          id: string
          is_draft: boolean
          loaded_variants: Json
          mobile_settings: Json
          tablet_settings: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          desktop_settings?: Json
          element_group: string
          font_family: string
          font_source?: string
          font_style?: string | null
          font_weight?: string | null
          id?: string
          is_draft?: boolean
          loaded_variants?: Json
          mobile_settings?: Json
          tablet_settings?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          desktop_settings?: Json
          element_group?: string
          font_family?: string
          font_source?: string
          font_style?: string | null
          font_weight?: string | null
          id?: string
          is_draft?: boolean
          loaded_variants?: Json
          mobile_settings?: Json
          tablet_settings?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      typography_presets: {
        Row: {
          assignments: Json
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_system: boolean
          preset_name: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          assignments?: Json
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_system?: boolean
          preset_name: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          assignments?: Json
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_system?: boolean
          preset_name?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "typography_presets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "typography_presets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      user_generated_content: {
        Row: {
          accuracy_verified: boolean
          author_id: string
          content_type: string
          content_url: string | null
          created_at: string
          description: string | null
          file_path: string | null
          id: string
          moderated_at: string | null
          moderated_by: string | null
          moderation_notes: string | null
          programme_id: string | null
          published_at: string | null
          relevance_score: number | null
          status: string
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          view_count: number
        }
        Insert: {
          accuracy_verified?: boolean
          author_id: string
          content_type?: string
          content_url?: string | null
          created_at?: string
          description?: string | null
          file_path?: string | null
          id?: string
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_notes?: string | null
          programme_id?: string | null
          published_at?: string | null
          relevance_score?: number | null
          status?: string
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          accuracy_verified?: boolean
          author_id?: string
          content_type?: string
          content_url?: string | null
          created_at?: string
          description?: string | null
          file_path?: string | null
          id?: string
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_notes?: string | null
          programme_id?: string | null
          published_at?: string | null
          relevance_score?: number | null
          status?: string
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_generated_content_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "programmes"
            referencedColumns: ["id"]
          },
        ]
      }
      user_role_scopes: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          role_definition_id: string
          scope_label: string | null
          scope_type: string
          scope_value: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          role_definition_id: string
          scope_label?: string | null
          scope_type: string
          scope_value?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          role_definition_id?: string
          scope_label?: string | null
          scope_type?: string
          scope_value?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_role_scopes_role_definition_id_fkey"
            columns: ["role_definition_id"]
            isOneToOne: false
            referencedRelation: "role_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      verification_checklist_items: {
        Row: {
          check_label: string
          check_name: string
          created_at: string
          evidence_document_id: string | null
          id: string
          is_required: boolean
          notes: string | null
          registration_id: string
          section: string
          status: string
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          check_label: string
          check_name: string
          created_at?: string
          evidence_document_id?: string | null
          id?: string
          is_required?: boolean
          notes?: string | null
          registration_id: string
          section: string
          status?: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          check_label?: string
          check_name?: string
          created_at?: string
          evidence_document_id?: string | null
          id?: string
          is_required?: boolean
          notes?: string | null
          registration_id?: string
          section?: string
          status?: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "verification_checklist_items_evidence_document_id_fkey"
            columns: ["evidence_document_id"]
            isOneToOne: false
            referencedRelation: "learner_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_checklist_items_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "learner_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      wbt_backlog_items: {
        Row: {
          acceptance_criteria: string | null
          approved_by: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          priority: number | null
          project_id: string
          sequence_order: number | null
          sprint_id: string | null
          status: string
          story_points: number | null
          title: string
          updated_at: string
        }
        Insert: {
          acceptance_criteria?: string | null
          approved_by?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          priority?: number | null
          project_id: string
          sequence_order?: number | null
          sprint_id?: string | null
          status?: string
          story_points?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          acceptance_criteria?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          priority?: number | null
          project_id?: string
          sequence_order?: number | null
          sprint_id?: string | null
          status?: string
          story_points?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wbt_backlog_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "wbt_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wbt_backlog_items_sprint_id_fkey"
            columns: ["sprint_id"]
            isOneToOne: false
            referencedRelation: "wbt_sprints"
            referencedColumns: ["id"]
          },
        ]
      }
      wbt_board_cards: {
        Row: {
          assigned_to: string | null
          backlog_item_id: string | null
          column_id: string
          created_at: string
          description: string | null
          id: string
          priority: string | null
          project_id: string
          sequence_order: number | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          backlog_item_id?: string | null
          column_id: string
          created_at?: string
          description?: string | null
          id?: string
          priority?: string | null
          project_id: string
          sequence_order?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          backlog_item_id?: string | null
          column_id?: string
          created_at?: string
          description?: string | null
          id?: string
          priority?: string | null
          project_id?: string
          sequence_order?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wbt_board_cards_backlog_item_id_fkey"
            columns: ["backlog_item_id"]
            isOneToOne: false
            referencedRelation: "wbt_backlog_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wbt_board_cards_column_id_fkey"
            columns: ["column_id"]
            isOneToOne: false
            referencedRelation: "wbt_board_columns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wbt_board_cards_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "wbt_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      wbt_board_columns: {
        Row: {
          color: string | null
          column_key: string
          created_at: string
          id: string
          is_done: boolean | null
          is_mentor_review: boolean | null
          project_id: string
          sequence_order: number | null
          title: string
        }
        Insert: {
          color?: string | null
          column_key: string
          created_at?: string
          id?: string
          is_done?: boolean | null
          is_mentor_review?: boolean | null
          project_id: string
          sequence_order?: number | null
          title: string
        }
        Update: {
          color?: string | null
          column_key?: string
          created_at?: string
          id?: string
          is_done?: boolean | null
          is_mentor_review?: boolean | null
          project_id?: string
          sequence_order?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "wbt_board_columns_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "wbt_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      wbt_escrow_transactions: {
        Row: {
          amount: number
          created_at: string
          currency: string | null
          gateway_reference: string | null
          id: string
          net_amount: number | null
          payee_id: string | null
          payer_id: string | null
          payment_gateway: string | null
          platform_fee_amount: number | null
          platform_fee_percent: number | null
          project_id: string
          release_reason: string | null
          released_at: string | null
          released_by: string | null
          second_review_notes: string | null
          second_review_status: string | null
          second_reviewed_at: string | null
          second_reviewer_id: string | null
          sprint_id: string | null
          status: string
          transaction_type: string
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string | null
          gateway_reference?: string | null
          id?: string
          net_amount?: number | null
          payee_id?: string | null
          payer_id?: string | null
          payment_gateway?: string | null
          platform_fee_amount?: number | null
          platform_fee_percent?: number | null
          project_id: string
          release_reason?: string | null
          released_at?: string | null
          released_by?: string | null
          second_review_notes?: string | null
          second_review_status?: string | null
          second_reviewed_at?: string | null
          second_reviewer_id?: string | null
          sprint_id?: string | null
          status?: string
          transaction_type?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string | null
          gateway_reference?: string | null
          id?: string
          net_amount?: number | null
          payee_id?: string | null
          payer_id?: string | null
          payment_gateway?: string | null
          platform_fee_amount?: number | null
          platform_fee_percent?: number | null
          project_id?: string
          release_reason?: string | null
          released_at?: string | null
          released_by?: string | null
          second_review_notes?: string | null
          second_review_status?: string | null
          second_reviewed_at?: string | null
          second_reviewer_id?: string | null
          sprint_id?: string | null
          status?: string
          transaction_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wbt_escrow_transactions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "wbt_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wbt_escrow_transactions_sprint_id_fkey"
            columns: ["sprint_id"]
            isOneToOne: false
            referencedRelation: "wbt_sprints"
            referencedColumns: ["id"]
          },
        ]
      }
      wbt_mentor_notes: {
        Row: {
          content: string
          created_at: string
          id: string
          is_private: boolean | null
          learner_id: string | null
          mentor_id: string
          note_type: string | null
          project_id: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_private?: boolean | null
          learner_id?: string | null
          mentor_id: string
          note_type?: string | null
          project_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_private?: boolean | null
          learner_id?: string | null
          mentor_id?: string
          note_type?: string | null
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wbt_mentor_notes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "wbt_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      wbt_mentor_profiles: {
        Row: {
          bio: string | null
          created_at: string
          id: string
          is_available: boolean | null
          max_concurrent_projects: number | null
          rating_average: number | null
          skills: string[] | null
          total_projects_completed: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          id?: string
          is_available?: boolean | null
          max_concurrent_projects?: number | null
          rating_average?: number | null
          skills?: string[] | null
          total_projects_completed?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          id?: string
          is_available?: boolean | null
          max_concurrent_projects?: number | null
          rating_average?: number | null
          skills?: string[] | null
          total_projects_completed?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wbt_mentor_ratings: {
        Row: {
          communication_score: number
          created_at: string
          feedback: string | null
          id: string
          is_anonymous: boolean | null
          mentor_id: string
          mentorship_score: number
          overall_score: number
          project_id: string
          rated_by: string
          rater_role: string
          technical_score: number
        }
        Insert: {
          communication_score: number
          created_at?: string
          feedback?: string | null
          id?: string
          is_anonymous?: boolean | null
          mentor_id: string
          mentorship_score: number
          overall_score: number
          project_id: string
          rated_by: string
          rater_role?: string
          technical_score: number
        }
        Update: {
          communication_score?: number
          created_at?: string
          feedback?: string | null
          id?: string
          is_anonymous?: boolean | null
          mentor_id?: string
          mentorship_score?: number
          overall_score?: number
          project_id?: string
          rated_by?: string
          rater_role?: string
          technical_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "wbt_mentor_ratings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "wbt_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      wbt_project_applications: {
        Row: {
          cover_note: string | null
          created_at: string
          id: string
          learner_id: string
          project_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          cover_note?: string | null
          created_at?: string
          id?: string
          learner_id: string
          project_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          cover_note?: string | null
          created_at?: string
          id?: string
          learner_id?: string
          project_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wbt_project_applications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "wbt_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      wbt_project_credentials: {
        Row: {
          completion_date: string | null
          created_at: string
          credential_id: string | null
          hours_logged: number | null
          id: string
          learner_id: string
          mentor_endorsement: string | null
          project_id: string
        }
        Insert: {
          completion_date?: string | null
          created_at?: string
          credential_id?: string | null
          hours_logged?: number | null
          id?: string
          learner_id: string
          mentor_endorsement?: string | null
          project_id: string
        }
        Update: {
          completion_date?: string | null
          created_at?: string
          credential_id?: string | null
          hours_logged?: number | null
          id?: string
          learner_id?: string
          mentor_endorsement?: string | null
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wbt_project_credentials_credential_id_fkey"
            columns: ["credential_id"]
            isOneToOne: false
            referencedRelation: "issued_credentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wbt_project_credentials_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "wbt_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      wbt_projects: {
        Row: {
          agile_framework: string
          budget: number | null
          client_id: string | null
          config_json: Json | null
          created_at: string
          created_by: string
          currency: string | null
          description: string | null
          enable_mentor_review_column: boolean | null
          end_date: string | null
          id: string
          max_learners: number | null
          mentor_id: string | null
          payment_model: string
          programme_id: string | null
          project_model: string
          required_skills: string[] | null
          sprint_length_weeks: number | null
          start_date: string | null
          status: string
          tenant_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          agile_framework?: string
          budget?: number | null
          client_id?: string | null
          config_json?: Json | null
          created_at?: string
          created_by: string
          currency?: string | null
          description?: string | null
          enable_mentor_review_column?: boolean | null
          end_date?: string | null
          id?: string
          max_learners?: number | null
          mentor_id?: string | null
          payment_model?: string
          programme_id?: string | null
          project_model?: string
          required_skills?: string[] | null
          sprint_length_weeks?: number | null
          start_date?: string | null
          status?: string
          tenant_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          agile_framework?: string
          budget?: number | null
          client_id?: string | null
          config_json?: Json | null
          created_at?: string
          created_by?: string
          currency?: string | null
          description?: string | null
          enable_mentor_review_column?: boolean | null
          end_date?: string | null
          id?: string
          max_learners?: number | null
          mentor_id?: string | null
          payment_model?: string
          programme_id?: string | null
          project_model?: string
          required_skills?: string[] | null
          sprint_length_weeks?: number | null
          start_date?: string | null
          status?: string
          tenant_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wbt_projects_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "programmes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wbt_projects_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wbt_projects_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      wbt_sprint_reviews: {
        Row: {
          created_at: string
          decision: string
          feedback: string | null
          id: string
          payment_release_approved: boolean | null
          project_id: string
          reviewed_at: string | null
          reviewer_id: string
          reviewer_role: string
          second_review_decision: string | null
          second_review_notes: string | null
          second_reviewed_at: string | null
          second_reviewer_id: string | null
          sprint_id: string
          stories_accepted: number | null
          stories_rejected: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          decision?: string
          feedback?: string | null
          id?: string
          payment_release_approved?: boolean | null
          project_id: string
          reviewed_at?: string | null
          reviewer_id: string
          reviewer_role?: string
          second_review_decision?: string | null
          second_review_notes?: string | null
          second_reviewed_at?: string | null
          second_reviewer_id?: string | null
          sprint_id: string
          stories_accepted?: number | null
          stories_rejected?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          decision?: string
          feedback?: string | null
          id?: string
          payment_release_approved?: boolean | null
          project_id?: string
          reviewed_at?: string | null
          reviewer_id?: string
          reviewer_role?: string
          second_review_decision?: string | null
          second_review_notes?: string | null
          second_reviewed_at?: string | null
          second_reviewer_id?: string | null
          sprint_id?: string
          stories_accepted?: number | null
          stories_rejected?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wbt_sprint_reviews_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "wbt_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wbt_sprint_reviews_sprint_id_fkey"
            columns: ["sprint_id"]
            isOneToOne: false
            referencedRelation: "wbt_sprints"
            referencedColumns: ["id"]
          },
        ]
      }
      wbt_sprints: {
        Row: {
          created_at: string
          end_date: string
          goal: string | null
          id: string
          payment_released: boolean | null
          project_id: string
          review_status: string | null
          reviewed_by: string | null
          second_review_status: string | null
          second_reviewer_id: string | null
          sprint_number: number
          start_date: string
          status: string
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date: string
          goal?: string | null
          id?: string
          payment_released?: boolean | null
          project_id: string
          review_status?: string | null
          reviewed_by?: string | null
          second_review_status?: string | null
          second_reviewer_id?: string | null
          sprint_number?: number
          start_date: string
          status?: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string
          goal?: string | null
          id?: string
          payment_released?: boolean | null
          project_id?: string
          review_status?: string | null
          reviewed_by?: string | null
          second_review_status?: string | null
          second_reviewer_id?: string | null
          sprint_number?: number
          start_date?: string
          status?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wbt_sprints_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "wbt_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_audit_log: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          instance_id: string | null
          performed_by: string | null
          step_instance_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          instance_id?: string | null
          performed_by?: string | null
          step_instance_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          instance_id?: string | null
          performed_by?: string | null
          step_instance_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_audit_log_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "workflow_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_audit_log_step_instance_id_fkey"
            columns: ["step_instance_id"]
            isOneToOne: false
            referencedRelation: "workflow_step_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_instances: {
        Row: {
          completed_at: string | null
          created_at: string
          current_step_id: string | null
          entity_id: string
          entity_type: string
          id: string
          metadata: Json | null
          started_at: string
          started_by: string | null
          status: string
          template_id: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          current_step_id?: string | null
          entity_id: string
          entity_type: string
          id?: string
          metadata?: Json | null
          started_at?: string
          started_by?: string | null
          status?: string
          template_id: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          current_step_id?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          metadata?: Json | null
          started_at?: string
          started_by?: string | null
          status?: string
          template_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_instances_current_step_id_fkey"
            columns: ["current_step_id"]
            isOneToOne: false
            referencedRelation: "workflow_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_instances_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "workflow_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_step_instances: {
        Row: {
          assigned_role: string | null
          assigned_to: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string
          id: string
          instance_id: string
          outcome: string | null
          reason: string | null
          result_data: Json | null
          started_at: string | null
          status: string
          step_id: string
          updated_at: string
        }
        Insert: {
          assigned_role?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          instance_id: string
          outcome?: string | null
          reason?: string | null
          result_data?: Json | null
          started_at?: string | null
          status?: string
          step_id: string
          updated_at?: string
        }
        Update: {
          assigned_role?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          instance_id?: string
          outcome?: string | null
          reason?: string | null
          result_data?: Json | null
          started_at?: string | null
          status?: string
          step_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_step_instances_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "workflow_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_step_instances_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "workflow_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_steps: {
        Row: {
          config: Json
          created_at: string
          id: string
          is_required: boolean
          next_step_on_approve: string | null
          next_step_on_reject: string | null
          step_name: string
          step_order: number
          step_type: string
          template_id: string
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          is_required?: boolean
          next_step_on_approve?: string | null
          next_step_on_reject?: string | null
          step_name: string
          step_order?: number
          step_type?: string
          template_id: string
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          is_required?: boolean
          next_step_on_approve?: string | null
          next_step_on_reject?: string | null
          step_name?: string
          step_order?: number
          step_type?: string
          template_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_steps_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "workflow_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_templates: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          entity_type: string
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          scope_id: string | null
          scope_type: string
          tenant_id: string | null
          trigger_event: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          entity_type?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          scope_id?: string | null
          scope_type?: string
          tenant_id?: string | null
          trigger_event?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          entity_type?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          scope_id?: string | null
          scope_type?: string
          tenant_id?: string | null
          trigger_event?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      workplace_evidence: {
        Row: {
          created_at: string
          description: string | null
          enrolment_id: string | null
          evidence_type: string
          file_url: string | null
          id: string
          learner_id: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          enrolment_id?: string | null
          evidence_type?: string
          file_url?: string | null
          id?: string
          learner_id: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          enrolment_id?: string | null
          evidence_type?: string
          file_url?: string | null
          id?: string
          learner_id?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workplace_evidence_enrolment_id_fkey"
            columns: ["enrolment_id"]
            isOneToOne: false
            referencedRelation: "enrolments"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      assessment_settings_safe: {
        Row: {
          allow_backtracking: boolean | null
          assessment_id: string | null
          attempts_allowed: number | null
          availability_end: string | null
          availability_start: string | null
          created_at: string | null
          display_mode: string | null
          feedback_release: string | null
          id: string | null
          randomise_options: boolean | null
          randomise_questions: boolean | null
          require_lockdown_browser: boolean | null
          requires_access_code: boolean | null
          show_correct_answers: boolean | null
          show_question_flagging: boolean | null
          time_limit_minutes: number | null
          updated_at: string | null
        }
        Insert: {
          allow_backtracking?: boolean | null
          assessment_id?: string | null
          attempts_allowed?: number | null
          availability_end?: string | null
          availability_start?: string | null
          created_at?: string | null
          display_mode?: string | null
          feedback_release?: string | null
          id?: string | null
          randomise_options?: boolean | null
          randomise_questions?: boolean | null
          require_lockdown_browser?: boolean | null
          requires_access_code?: never
          show_correct_answers?: boolean | null
          show_question_flagging?: boolean | null
          time_limit_minutes?: number | null
          updated_at?: string | null
        }
        Update: {
          allow_backtracking?: boolean | null
          assessment_id?: string | null
          attempts_allowed?: number | null
          availability_end?: string | null
          availability_start?: string | null
          created_at?: string | null
          display_mode?: string | null
          feedback_release?: string | null
          id?: string | null
          randomise_options?: boolean | null
          randomise_questions?: boolean | null
          require_lockdown_browser?: boolean | null
          requires_access_code?: never
          show_correct_answers?: boolean | null
          show_question_flagging?: boolean | null
          time_limit_minutes?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assessment_settings_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: true
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      credential_verification_safe: {
        Row: {
          blockchain_hash: string | null
          credential_type: string | null
          issued_at: string | null
          status: string | null
          title: string | null
          verification_url: string | null
        }
        Insert: {
          blockchain_hash?: string | null
          credential_type?: string | null
          issued_at?: string | null
          status?: string | null
          title?: string | null
          verification_url?: string | null
        }
        Update: {
          blockchain_hash?: string | null
          credential_type?: string | null
          issued_at?: string | null
          status?: string | null
          title?: string | null
          verification_url?: string | null
        }
        Relationships: []
      }
      profiles_safe: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          department: string | null
          email: string | null
          full_name: string | null
          id: string | null
          job_title: string | null
          location: string | null
          organisation: string | null
          phone: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
          verified_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          department?: string | null
          email?: string | null
          full_name?: string | null
          id?: string | null
          job_title?: string | null
          location?: string | null
          organisation?: never
          phone?: never
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          verified_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          department?: string | null
          email?: string | null
          full_name?: string | null
          id?: string | null
          job_title?: string | null
          location?: string | null
          organisation?: never
          phone?: never
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          verified_at?: string | null
        }
        Relationships: []
      }
      quiz_options_safe: {
        Row: {
          created_at: string | null
          id: string | null
          option_text: string | null
          question_id: string | null
          sequence_order: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          option_text?: string | null
          question_id?: string | null
          sequence_order?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          option_text?: string | null
          question_id?: string | null
          sequence_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants_safe: {
        Row: {
          country: string | null
          created_at: string | null
          domain: string | null
          favicon_url: string | null
          id: string | null
          logo_url: string | null
          name: string | null
          primary_color: string | null
          secondary_color: string | null
          settings: Json | null
          slug: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string | null
          domain?: string | null
          favicon_url?: string | null
          id?: string | null
          logo_url?: string | null
          name?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          settings?: Json | null
          slug?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string | null
          domain?: string | null
          favicon_url?: string | null
          id?: string | null
          logo_url?: string | null
          name?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          settings?: Json | null
          slug?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      training_sessions_safe: {
        Row: {
          actual_end: string | null
          actual_start: string | null
          agenda: Json | null
          cohort_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          facilitator_id: string | null
          id: string | null
          jitsi_room_id: string | null
          max_duration_minutes: number | null
          meeting_config: Json | null
          meeting_url: string | null
          notes: string | null
          qr_checkin_enabled: boolean | null
          recording_url: string | null
          recurrence_parent_id: string | null
          recurrence_rule: string | null
          scheduled_end: string | null
          scheduled_start: string | null
          session_type: string | null
          status: string | null
          tenant_id: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          actual_end?: string | null
          actual_start?: string | null
          agenda?: Json | null
          cohort_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          facilitator_id?: string | null
          id?: string | null
          jitsi_room_id?: string | null
          max_duration_minutes?: number | null
          meeting_config?: Json | null
          meeting_url?: string | null
          notes?: string | null
          qr_checkin_enabled?: boolean | null
          recording_url?: string | null
          recurrence_parent_id?: string | null
          recurrence_rule?: string | null
          scheduled_end?: string | null
          scheduled_start?: string | null
          session_type?: string | null
          status?: string | null
          tenant_id?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          actual_end?: string | null
          actual_start?: string | null
          agenda?: Json | null
          cohort_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          facilitator_id?: string | null
          id?: string | null
          jitsi_room_id?: string | null
          max_duration_minutes?: number | null
          meeting_config?: Json | null
          meeting_url?: string | null
          notes?: string | null
          qr_checkin_enabled?: boolean | null
          recording_url?: string | null
          recurrence_parent_id?: string | null
          recurrence_rule?: string | null
          scheduled_end?: string | null
          scheduled_start?: string | null
          session_type?: string | null
          status?: string | null
          tenant_id?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_sessions_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_sessions_recurrence_parent_id_fkey"
            columns: ["recurrence_parent_id"]
            isOneToOne: false
            referencedRelation: "training_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_sessions_recurrence_parent_id_fkey"
            columns: ["recurrence_parent_id"]
            isOneToOne: false
            referencedRelation: "training_sessions_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      unified_audit_log: {
        Row: {
          action: string | null
          created_at: string | null
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string | null
          source: string | null
          user_id: string | null
        }
        Relationships: []
      }
      unified_gradebook: {
        Row: {
          activity_date: string | null
          activity_id: string | null
          activity_title: string | null
          activity_type: string | null
          created_at: string | null
          feedback: string | null
          grade_id: string | null
          graded_at: string | null
          learner_id: string | null
          max_score: number | null
          moderated_by: string | null
          moderation_status: string | null
          pass_mark: number | null
          programme_id: string | null
          recorded_by: string | null
          score: number | null
          source: string | null
          status: string | null
          updated_at: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_tenant_invitation: { Args: { _token: string }; Returns: string }
      add_tenant_domain: {
        Args: { _hostname: string; _method?: string; _tenant_id: string }
        Returns: {
          created_at: string
          created_by: string | null
          hostname: string
          id: string
          is_primary: boolean
          last_checked_at: string | null
          status: string
          tenant_id: string
          updated_at: string
          verification_method: string
          verification_token: string
          verified_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "tenant_domains"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      calculate_compliance_score: {
        Args: { _actual: number; _max_points: number; _target: number }
        Returns: number
      }
      can_access_tenant: { Args: { _tenant_id: string }; Returns: boolean }
      can_act_on_workflow_step: {
        Args: { _step_instance_id: string; _user_id: string }
        Returns: boolean
      }
      can_approve_programme: {
        Args: { _programme_id: string; _user_id: string }
        Returns: boolean
      }
      can_approve_registration: {
        Args: { _registration_id: string; _user_id: string }
        Returns: boolean
      }
      can_edit_programme_content: {
        Args: { _programme_id: string; _user_id: string }
        Returns: boolean
      }
      cleanup_expired_idempotency_keys: { Args: never; Returns: undefined }
      current_tenant_id: { Args: never; Returns: string }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_available_gateways_for_tenant: {
        Args: { _tenant_id: string }
        Returns: {
          credential_schema: Json
          display_name: string
          gateway_type: string
          is_default: boolean
          is_enabled_for_tenant: boolean
          logo_url: string
          mode: string
          provider_key: string
          setup_instructions: string
          sort_order: number
          supported_countries: string[]
          supported_currencies: string[]
          verification_status: string
        }[]
      }
      get_platform_analytics: {
        Args: never
        Returns: {
          active_enrolments: number
          active_members: number
          active_programmes: number
          created_at: string
          custom_domains: number
          health_score: number
          max_programmes: number
          max_users: number
          pending_invitations: number
          status: string
          submissions_30d: number
          subscription_tier: string
          tenant_id: string
          tenant_name: string
          tenant_slug: string
          total_enrolments: number
          total_programmes: number
          verified_domains: number
        }[]
      }
      get_platform_stats: { Args: never; Returns: Json }
      get_recommended_provider: {
        Args: { _country: string; _currency: string }
        Returns: string
      }
      get_tenant_active_subscription: {
        Args: { _tenant_id: string }
        Returns: {
          billing_interval: Database["public"]["Enums"]["billing_interval"]
          currency: string
          current_period_end: string
          limits: Json
          provider_key: string
          status: Database["public"]["Enums"]["subscription_status"]
          subscription_id: string
          tier_id: string
          tier_key: string
          tier_name: string
          trial_ends_at: string
          unit_amount_minor: number
        }[]
      }
      get_tenant_branding: {
        Args: { _slug: string }
        Returns: {
          favicon_url: string
          id: string
          logo_url: string
          name: string
          primary_color: string
          secondary_color: string
          slug: string
        }[]
      }
      get_tenant_effective_flags: {
        Args: { _tenant_id: string }
        Returns: {
          category: string
          description: string
          display_name: string
          flag_key: string
          has_override: boolean
          is_enabled: boolean
          min_tier: string
          sort_order: number
        }[]
      }
      get_tenant_quota_usage: {
        Args: { _tenant_id: string }
        Returns: {
          active_users: number
          current_programmes: number
          max_programmes: number
          max_users: number
        }[]
      }
      get_tenant_usage_summary: {
        Args: { _since?: string; _tenant_id: string }
        Returns: {
          event_count: number
          meter_key: string
          total_quantity: number
        }[]
      }
      get_user_admin_tenant_ids: {
        Args: { _user_id: string }
        Returns: string[]
      }
      get_user_tenant_ids: { Args: { _user_id: string }; Returns: string[] }
      has_permission: {
        Args: { _action: string; _resource: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_delegated_approver: {
        Args: { _programme_id?: string; _user_id: string }
        Returns: boolean
      }
      is_platform_admin: { Args: { _user_id: string }; Returns: boolean }
      is_tenant_admin: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
      is_tenant_member: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
      is_tenant_owner_or_admin: {
        Args: { _tenant_id: string; _uid: string }
        Returns: boolean
      }
      issue_manual_invoice: {
        Args: {
          _currency: string
          _due_days?: number
          _invoice_number?: string
          _notes?: string
          _subtotal_minor: number
          _tax_minor?: number
          _tenant_id: string
        }
        Returns: string
      }
      mark_invoice_paid: {
        Args: { _invoice_id: string; _payment_reference?: string }
        Returns: undefined
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      reactivate_tenant: { Args: { _tenant_id: string }; Returns: undefined }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      record_usage_event: {
        Args: {
          _metadata?: Json
          _meter_key: string
          _quantity?: number
          _tenant_id: string
        }
        Returns: string
      }
      remove_tenant_domain: { Args: { _domain_id: string }; Returns: undefined }
      resolve_tenant_by_hostname: {
        Args: { _hostname: string }
        Returns: {
          favicon_url: string
          id: string
          logo_url: string
          name: string
          primary_color: string
          secondary_color: string
          slug: string
        }[]
      }
      set_active_tenant: { Args: { _tenant_id: string }; Returns: undefined }
      set_primary_tenant_domain: {
        Args: { _domain_id: string }
        Returns: undefined
      }
      set_tenant_member_role: {
        Args: {
          _is_active?: boolean
          _role: string
          _tenant_id: string
          _user_id: string
        }
        Returns: undefined
      }
      storage_path_tenant_id: { Args: { _name: string }; Returns: string }
      suspend_tenant: {
        Args: { _reason?: string; _tenant_id: string }
        Returns: undefined
      }
      tenant_for_assessment: {
        Args: { _assessment_id: string }
        Returns: string
      }
      tenant_for_cohort: { Args: { _cohort_id: string }; Returns: string }
      tenant_for_programme: { Args: { _programme_id: string }; Returns: string }
      tenant_for_user: { Args: { _user_id: string }; Returns: string }
      tenant_has_flag: {
        Args: { _flag_key: string; _tenant_id: string }
        Returns: boolean
      }
      update_tenant_branding: {
        Args: {
          _contact_email?: string
          _favicon_url?: string
          _logo_url?: string
          _name?: string
          _primary_color?: string
          _secondary_color?: string
          _tenant_id: string
        }
        Returns: {
          address: string | null
          contact_email: string | null
          contact_phone: string | null
          country: string | null
          created_at: string
          created_by: string | null
          domain: string | null
          favicon_url: string | null
          id: string
          logo_url: string | null
          max_programmes: number | null
          max_users: number | null
          name: string
          primary_color: string | null
          secondary_color: string | null
          settings: Json | null
          slug: string
          status: string
          subscription_tier: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "tenants"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      verify_tenant_domain: {
        Args: { _domain_id: string; _verified: boolean }
        Returns: {
          created_at: string
          created_by: string | null
          hostname: string
          id: string
          is_primary: boolean
          last_checked_at: string | null
          status: string
          tenant_id: string
          updated_at: string
          verification_method: string
          verification_token: string
          verified_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "tenant_domains"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      void_invoice: {
        Args: { _invoice_id: string; _reason?: string }
        Returns: undefined
      }
      wbt_suggest_mentors: {
        Args: { _limit?: number; _project_id: string }
        Returns: {
          current_projects: number
          match_score: number
          rating_average: number
          skills: string[]
          user_id: string
        }[]
      }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "programme_manager"
        | "facilitator"
        | "assessor"
        | "moderator"
        | "mentor"
        | "learner"
        | "sponsor"
        | "operations"
        | "systems_admin"
        | "talent_manager"
      billing_interval: "monthly" | "annual" | "one_time"
      invoice_status:
        | "draft"
        | "open"
        | "paid"
        | "past_due"
        | "void"
        | "refunded"
      payment_attempt_status: "pending" | "succeeded" | "failed" | "cancelled"
      subscription_status:
        | "trialling"
        | "active"
        | "past_due"
        | "cancelled"
        | "suspended"
        | "incomplete"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "super_admin",
        "programme_manager",
        "facilitator",
        "assessor",
        "moderator",
        "mentor",
        "learner",
        "sponsor",
        "operations",
        "systems_admin",
        "talent_manager",
      ],
      billing_interval: ["monthly", "annual", "one_time"],
      invoice_status: ["draft", "open", "paid", "past_due", "void", "refunded"],
      payment_attempt_status: ["pending", "succeeded", "failed", "cancelled"],
      subscription_status: [
        "trialling",
        "active",
        "past_due",
        "cancelled",
        "suspended",
        "incomplete",
      ],
    },
  },
} as const
