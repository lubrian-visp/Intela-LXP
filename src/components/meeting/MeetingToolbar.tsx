import { useState } from "react";
import {
  Mic, MicOff, Video, VideoOff, Monitor, MonitorOff,
  Hand, PhoneOff, SmilePlus, MoreHorizontal, MessageSquare,
  Users, StickyNote, ListTodo
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface MeetingToolbarProps {
  isMuted: boolean;
  isVideoOn: boolean;
  isScreenSharing: boolean;
  isHandRaised: boolean;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onToggleHandRaise: () => void;
  onReaction: (type: string) => void;
  onLeave: () => void;
  onEndForAll?: () => void;
  isFacilitator: boolean;
  activePanel: string;
  onPanelChange: (panel: string) => void;
  duration?: string;
}

const reactions = [
  { type: "like", emoji: "👍" },
  { type: "love", emoji: "❤️" },
  { type: "laugh", emoji: "😂" },
  { type: "surprise", emoji: "😮" },
  { type: "clap", emoji: "👏" },
  { type: "celebrate", emoji: "🎉" },
];

export default function MeetingToolbar({
  isMuted,
  isVideoOn,
  isScreenSharing,
  isHandRaised,
  onToggleMute,
  onToggleVideo,
  onToggleScreenShare,
  onToggleHandRaise,
  onReaction,
  onLeave,
  onEndForAll,
  isFacilitator,
  activePanel,
  onPanelChange,
  duration,
}: MeetingToolbarProps) {
  return (
    <div className="bg-card border border-border rounded-2xl px-4 py-2.5 flex items-center justify-between gap-2 shadow-lg">
      {/* Left: Duration */}
      <div className="flex items-center gap-2 min-w-[80px]">
        {duration && (
          <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
            {duration}
          </span>
        )}
      </div>

      {/* Center: Main controls */}
      <div className="flex items-center gap-1.5">
        {/* Mic */}
        <button
          onClick={onToggleMute}
          className={cn(
            "p-2.5 rounded-full transition-all",
            isMuted
              ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
              : "bg-secondary text-foreground hover:bg-secondary/80"
          )}
          title={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        {/* Camera */}
        <button
          onClick={onToggleVideo}
          className={cn(
            "p-2.5 rounded-full transition-all",
            !isVideoOn
              ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
              : "bg-secondary text-foreground hover:bg-secondary/80"
          )}
          title={isVideoOn ? "Turn off camera" : "Turn on camera"}
        >
          {isVideoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
        </button>

        {/* Screen share */}
        <button
          onClick={onToggleScreenShare}
          className={cn(
            "p-2.5 rounded-full transition-all",
            isScreenSharing
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-foreground hover:bg-secondary/80"
          )}
          title={isScreenSharing ? "Stop sharing" : "Share screen"}
        >
          {isScreenSharing ? <MonitorOff className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
        </button>

        {/* Hand raise */}
        <button
          onClick={onToggleHandRaise}
          className={cn(
            "p-2.5 rounded-full transition-all",
            isHandRaised
              ? "bg-warning/20 text-warning"
              : "bg-secondary text-foreground hover:bg-secondary/80"
          )}
          title={isHandRaised ? "Lower hand" : "Raise hand"}
        >
          <Hand className="w-5 h-5" />
        </button>

        {/* Reactions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="p-2.5 rounded-full bg-secondary text-foreground hover:bg-secondary/80 transition-all"
              title="Send a reaction"
            >
              <SmilePlus className="w-5 h-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="flex gap-1 p-2 min-w-0">
            {reactions.map((r) => (
              <button
                key={r.type}
                onClick={() => onReaction(r.type)}
                className="text-xl hover:scale-125 transition-transform p-1"
                title={r.type}
              >
                {r.emoji}
              </button>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="w-px h-8 bg-border mx-1" />

        {/* Leave */}
        <button
          onClick={onLeave}
          className="px-4 py-2 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-all text-sm font-medium flex items-center gap-1.5"
        >
          <PhoneOff className="w-4 h-4" />
          Leave
        </button>

        {isFacilitator && onEndForAll && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 rounded-full bg-secondary text-foreground hover:bg-secondary/80">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEndForAll} className="text-destructive focus:text-destructive">
                End meeting for everyone
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Right: Panel toggles */}
      <div className="flex items-center gap-1 min-w-[80px] justify-end">
        <button
          onClick={() => onPanelChange(activePanel === "participants" ? "" : "participants")}
          className={cn(
            "p-2 rounded-lg transition-colors",
            activePanel === "participants" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
          )}
          title="Participants"
        >
          <Users className="w-4 h-4" />
        </button>
        <button
          onClick={() => onPanelChange(activePanel === "chat" ? "" : "chat")}
          className={cn(
            "p-2 rounded-lg transition-colors",
            activePanel === "chat" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
          )}
          title="Chat"
        >
          <MessageSquare className="w-4 h-4" />
        </button>
        <button
          onClick={() => onPanelChange(activePanel === "notes" ? "" : "notes")}
          className={cn(
            "p-2 rounded-lg transition-colors",
            activePanel === "notes" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
          )}
          title="Notes"
        >
          <StickyNote className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
