import { useState, useMemo, useCallback, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProgrammeModules } from "@/hooks/useCoreData";
import { useContentBlocks } from "@/hooks/useContentBlocks";
import {
  useLearnerContentProgress,
  useToggleBlockCompletion,
  useLearnerNotes,
  useCreateNote,
  useDeleteNote,
  useLearnerBookmarks,
  useToggleBookmark,
} from "@/hooks/useLearnerCourseData";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import CourseSidebar from "@/components/learner-course/CourseSidebar";
import ContentBlockViewer from "@/components/learner-course/ContentBlockViewer";
import CourseToolbar from "@/components/learner-course/CourseToolbar";
import CourseNotesPanel from "@/components/learner-course/CourseNotesPanel";
import CourseDiscussionPanel from "@/components/learner-course/CourseDiscussionPanel";
import AIWorkflowOverlay from "@/components/ai-learning/AIWorkflowOverlay";
import { toast } from "sonner";

export default function LearnerProgrammeDetail() {
  const { enrolmentId } = useParams<{ enrolmentId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  // UI state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [rightPanel, setRightPanel] = useState<"none" | "notes" | "discussion">("none");

  // Fetch enrolment with cohort → programme
  const { data: enrolment, isLoading: enrolLoading } = useQuery({
    queryKey: ["enrolment-detail", enrolmentId],
    enabled: !!enrolmentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrolments")
        .select("*, cohorts(name, start_date, end_date, programmes(id, title, description, duration_months, credits, nqf_level, programme_types(name, color)))")
        .eq("id", enrolmentId!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const programmeId = (enrolment as any)?.cohorts?.programmes?.id;
  const programme = (enrolment as any)?.cohorts?.programmes;
  const programmeTitle = programme?.title ?? "Programme";

  // Modules
  const { data: rawModules = [], isLoading: modLoading } = useProgrammeModules(programmeId);

  // Content blocks for all modules (we need to fetch per module)
  const moduleIds = (rawModules as any[]).map((m: any) => m.id);
  const { data: allBlocks = [], isLoading: blocksLoading } = useQuery({
    queryKey: ["all_content_blocks", programmeId, moduleIds],
    enabled: !!programmeId && moduleIds.length > 0,
    queryFn: async () => {
      if (!moduleIds.length) return [];
      const { data, error } = await supabase
        .from("content_blocks")
        .select("*")
        .in("module_id", moduleIds)
        .order("sequence_order");
      if (error) throw error;
      return data;
    },
  });

  // Progress, notes, bookmarks
  const { data: progressRecords = [] } = useLearnerContentProgress(enrolmentId, user?.id);
  const { data: notes = [] } = useLearnerNotes(enrolmentId, user?.id);
  const { data: bookmarks = [] } = useLearnerBookmarks(enrolmentId, user?.id);
  const toggleCompletion = useToggleBlockCompletion();
  const createNote = useCreateNote();
  const deleteNote = useDeleteNote();
  const toggleBookmark = useToggleBookmark();

  // Derived data
  const completedBlockIds = useMemo(
    () => new Set((progressRecords as any[]).filter((p) => p.is_completed).map((p) => p.content_block_id)),
    [progressRecords]
  );
  const bookmarkedBlockIds = useMemo(
    () => new Set((bookmarks as any[]).map((b) => b.content_block_id)),
    [bookmarks]
  );

  // Build module tree with blocks
  const modules = useMemo(() => {
    return (rawModules as any[]).map((mod) => ({
      ...mod,
      blocks: (allBlocks as any[])
        .filter((b) => b.module_id === mod.id)
        .sort((a, b) => a.sequence_order - b.sequence_order),
    }));
  }, [rawModules, allBlocks]);

  // Flat list of all blocks for navigation
  const flatBlocks = useMemo(() => {
    const list: { moduleId: string; block: any }[] = [];
    modules.forEach((mod) => {
      mod.blocks.forEach((block: any) => {
        list.push({ moduleId: mod.id, block });
      });
    });
    return list;
  }, [modules]);

  // Auto-select the first block on initial load
  useEffect(() => {
    if (!activeBlockId && flatBlocks.length > 0) {
      setActiveModuleId(flatBlocks[0].moduleId);
      setActiveBlockId(flatBlocks[0].block.id);
    }
  }, [flatBlocks, activeBlockId]);

  const totalBlocks = flatBlocks.length;
  const currentIndex = flatBlocks.findIndex((fb) => fb.block.id === activeBlockId);
  const currentFlatBlock = currentIndex >= 0 ? flatBlocks[currentIndex] : null;
  const activeBlock = currentFlatBlock?.block ?? null;
  const activeModule = modules.find((m) => m.id === activeModuleId);

  // Overall progress
  const overallProgress = totalBlocks > 0
    ? Math.round((completedBlockIds.size / totalBlocks) * 100)
    : 0;

  // Estimated time remaining
  const timeRemaining = useMemo(() => {
    const remaining = flatBlocks
      .filter((fb) => !completedBlockIds.has(fb.block.id))
      .reduce((sum, fb) => sum + (fb.block.duration_minutes || 5), 0);
    if (remaining >= 60) return `${Math.round(remaining / 60)}h ${remaining % 60}m remaining`;
    return `${remaining}m remaining`;
  }, [flatBlocks, completedBlockIds]);

  // Handlers
  const handleSelectBlock = useCallback((moduleId: string, blockId: string) => {
    setActiveModuleId(moduleId);
    setActiveBlockId(blockId);
  }, []);

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      const prev = flatBlocks[currentIndex - 1];
      handleSelectBlock(prev.moduleId, prev.block.id);
    }
  }, [currentIndex, flatBlocks, handleSelectBlock]);

  const handleNext = useCallback(() => {
    if (currentIndex < totalBlocks - 1) {
      const next = flatBlocks[currentIndex + 1];
      handleSelectBlock(next.moduleId, next.block.id);
    }
  }, [currentIndex, totalBlocks, flatBlocks, handleSelectBlock]);

  const handleToggleComplete = useCallback(() => {
    if (!activeBlockId || !activeModuleId || !user?.id || !enrolmentId) return;
    const isCompleted = completedBlockIds.has(activeBlockId);
    toggleCompletion.mutate(
      {
        learner_id: user.id,
        content_block_id: activeBlockId,
        module_id: activeModuleId,
        enrolment_id: enrolmentId,
        is_completed: !isCompleted,
      },
      {
        onSuccess: () => {
          if (!isCompleted) toast.success("Lesson marked as complete!");
        },
      }
    );
  }, [activeBlockId, activeModuleId, user?.id, enrolmentId, completedBlockIds, toggleCompletion]);

  const handleToggleBookmark = useCallback(() => {
    if (!activeBlockId || !user?.id || !enrolmentId) return;
    const isBookmarked = bookmarkedBlockIds.has(activeBlockId);
    toggleBookmark.mutate({
      learner_id: user.id,
      content_block_id: activeBlockId,
      enrolment_id: enrolmentId,
      isBookmarked,
    });
  }, [activeBlockId, user?.id, enrolmentId, bookmarkedBlockIds, toggleBookmark]);

  const handleAddNote = useCallback(
    (text: string) => {
      if (!user?.id || !enrolmentId) return;
      createNote.mutate({
        learner_id: user.id,
        content_block_id: activeBlockId ?? undefined,
        module_id: activeModuleId ?? undefined,
        enrolment_id: enrolmentId,
        note_text: text,
      });
    },
    [user?.id, enrolmentId, activeBlockId, activeModuleId, createNote]
  );

  const handleDeleteNote = useCallback(
    (noteId: string) => {
      if (!enrolmentId) return;
      deleteNote.mutate({ id: noteId, enrolmentId });
    },
    [enrolmentId, deleteNote]
  );

  // Loading
  const isLoading = enrolLoading || modLoading;

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-120px)] gap-0">
        <Skeleton className="w-72 h-full rounded-none" />
        <Skeleton className="flex-1 h-full rounded-none" />
      </div>
    );
  }

  if (!enrolment || !programme) {
    return (
      <div className="text-center py-20">
        <p className="text-sm text-muted-foreground">Enrolment not found.</p>
        <Button variant="outline" size="sm" onClick={() => navigate("/learner/programmes")} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Programmes
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-120px)] -m-4 sm:-m-6 overflow-hidden bg-background">
      {/* Left: Course Navigation Sidebar */}
      <CourseSidebar
        programmeTitle={programmeTitle}
        modules={modules}
        activeBlockId={activeBlockId}
        activeModuleId={activeModuleId}
        completedBlockIds={completedBlockIds}
        bookmarkedBlockIds={bookmarkedBlockIds}
        onSelectBlock={handleSelectBlock}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        overallProgress={overallProgress}
      />

      {/* Center: Content Viewer */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top info bar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border/30 bg-muted/30 text-[10px] text-muted-foreground">
          <button
            onClick={() => navigate("/learner/programmes")}
            className="flex items-center gap-1 hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-3 h-3" />
            Back to My Programmes
          </button>
          <span>{timeRemaining}</span>
        </div>

        {/* Content block */}
        <ContentBlockViewer
          block={activeBlock}
          moduleTitle={activeModule?.title ?? ""}
        />

        {/* AI Learning Workflow Overlay */}
        {activeBlock && (
          <AIWorkflowOverlay
            contentBlockId={activeBlock.id}
            programmeId={programmeId}
            title={activeBlock.title}
          />
        )}

        {/* Bottom toolbar */}
        {activeBlock && (
          <CourseToolbar
            currentIndex={currentIndex}
            totalBlocks={totalBlocks}
            isCompleted={completedBlockIds.has(activeBlockId!)}
            isBookmarked={bookmarkedBlockIds.has(activeBlockId!)}
            onPrevious={handlePrevious}
            onNext={handleNext}
            onToggleComplete={handleToggleComplete}
            onToggleBookmark={handleToggleBookmark}
            onOpenNotes={() => setRightPanel(rightPanel === "notes" ? "none" : "notes")}
            onOpenDiscussion={() => setRightPanel(rightPanel === "discussion" ? "none" : "discussion")}
            hasPrevious={currentIndex > 0}
            hasNext={currentIndex < totalBlocks - 1}
            blockTitle={activeBlock?.title ?? ""}
          />
        )}
      </div>

      {/* Right Panel: Notes or Discussion */}
      {rightPanel === "notes" && (
        <CourseNotesPanel
          notes={(notes as any[]) ?? []}
          blockTitle={activeBlock?.title ?? ""}
          blockId={activeBlockId}
          onAddNote={handleAddNote}
          onDeleteNote={handleDeleteNote}
          onClose={() => setRightPanel("none")}
          isAdding={createNote.isPending}
        />
      )}
      {rightPanel === "discussion" && (
        <CourseDiscussionPanel
          moduleId={activeModuleId}
          onClose={() => setRightPanel("none")}
        />
      )}
    </div>
  );
}
