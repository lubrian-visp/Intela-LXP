import { Button } from "@/components/ui/button";
import {
  ChevronLeft, ChevronRight, CheckCircle2, Circle,
  Bookmark, StickyNote, MessageSquare
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CourseToolbarProps {
  currentIndex: number;
  totalBlocks: number;
  isCompleted: boolean;
  isBookmarked: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onToggleComplete: () => void;
  onToggleBookmark: () => void;
  onOpenNotes: () => void;
  onOpenDiscussion: () => void;
  hasPrevious: boolean;
  hasNext: boolean;
  blockTitle: string;
}

export default function CourseToolbar({
  currentIndex,
  totalBlocks,
  isCompleted,
  isBookmarked,
  onPrevious,
  onNext,
  onToggleComplete,
  onToggleBookmark,
  onOpenNotes,
  onOpenDiscussion,
  hasPrevious,
  hasNext,
  blockTitle,
}: CourseToolbarProps) {
  return (
    <div className="border-t border-border/50 bg-card px-4 py-3 flex items-center gap-2 shrink-0">
      {/* Left: Navigation */}
      <Button
        variant="outline"
        size="sm"
        onClick={onPrevious}
        disabled={!hasPrevious}
        className="text-xs gap-1"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
        Previous
      </Button>

      <div className="flex-1 flex items-center justify-center gap-3">
        {/* Progress indicator */}
        <span className="text-[10px] text-muted-foreground font-medium">
          {currentIndex + 1} / {totalBlocks}
        </span>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleComplete}
            aria-label={isCompleted ? `Mark "${blockTitle}" as incomplete` : `Mark "${blockTitle}" as complete`}
            aria-pressed={isCompleted}
            className={cn(
              "text-xs gap-1.5 h-8",
              isCompleted
                ? "text-emerald-600 hover:text-emerald-700"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {isCompleted ? (
              <CheckCircle2 className="w-4 h-4 fill-emerald-100" />
            ) : (
              <Circle className="w-4 h-4" />
            )}
            {isCompleted ? "Completed" : "Mark Complete"}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onToggleBookmark}
            aria-label={isBookmarked ? `Remove bookmark from "${blockTitle}"` : `Bookmark "${blockTitle}"`}
            aria-pressed={isBookmarked}
            title={isBookmarked ? "Remove bookmark" : "Bookmark this lesson"}
          >
            <Bookmark
              className={cn(
                "w-4 h-4",
                isBookmarked ? "text-amber-500 fill-amber-500" : "text-muted-foreground"
              )}
            />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onOpenNotes}
            aria-label="Open notes panel"
            title="Notes"
          >
            <StickyNote className="w-4 h-4 text-muted-foreground" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onOpenDiscussion}
            aria-label="Open discussion panel"
            title="Discussion"
          >
            <MessageSquare className="w-4 h-4 text-muted-foreground" />
          </Button>
        </div>
      </div>

      {/* Right: Next */}
      <Button
        variant={hasNext ? "default" : "outline"}
        size="sm"
        onClick={onNext}
        disabled={!hasNext}
        className="text-xs gap-1"
      >
        {hasNext ? "Next" : "End"}
        <ChevronRight className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}
