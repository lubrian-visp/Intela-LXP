import {
  Users, Hand, Mic, MicOff, Video, VideoOff,
  Monitor, MoreHorizontal, ShieldCheck, Crown
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Participant {
  id: string;
  user_id: string;
  display_name?: string;
  role: string;
  is_hand_raised: boolean;
  is_muted: boolean;
  is_video_on: boolean;
  is_screen_sharing: boolean;
  status: string;
}

interface MeetingParticipantsPanelProps {
  participants: Participant[];
  currentUserId?: string;
  isFacilitator: boolean;
  onAdmit?: (userId: string) => void;
  onRemove?: (userId: string) => void;
  onMuteParticipant?: (userId: string) => void;
}

export default function MeetingParticipantsPanel({
  participants,
  currentUserId,
  isFacilitator,
  onAdmit,
  onRemove,
  onMuteParticipant,
}: MeetingParticipantsPanelProps) {
  const inLobby = participants.filter((p) => p.status === "in_lobby");
  const inMeeting = participants.filter((p) => p.status === "joined");
  const handRaised = inMeeting.filter((p) => p.is_hand_raised);

  return (
    <div className="bg-card rounded-xl shadow-card border border-border/50 flex flex-col overflow-hidden h-full">
      <div className="px-4 py-3 border-b border-border flex items-center gap-1.5">
        <Users className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Participants</h3>
        <span className="ml-auto text-[10px] text-muted-foreground">{inMeeting.length} in meeting</span>
      </div>

      <div className="flex-1 overflow-y-auto max-h-[460px]">
        {/* Lobby */}
        {inLobby.length > 0 && isFacilitator && (
          <div className="p-3 border-b border-border">
            <p className="text-[10px] font-semibold text-warning uppercase mb-2">
              Waiting in lobby ({inLobby.length})
            </p>
            {inLobby.map((p) => (
              <div key={p.id} className="flex items-center gap-2 py-1.5">
                <div className="w-7 h-7 rounded-full bg-warning/10 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-warning">
                    {(p.display_name || "?").charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-xs text-foreground flex-1 truncate">
                  {p.display_name || p.user_id.slice(0, 8)}
                </span>
                {onAdmit && (
                  <button
                    onClick={() => onAdmit(p.user_id)}
                    className="text-[10px] px-2 py-0.5 rounded bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    Admit
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Raised Hands */}
        {handRaised.length > 0 && (
          <div className="p-3 border-b border-border">
            <p className="text-[10px] font-semibold text-warning uppercase mb-2 flex items-center gap-1">
              <Hand className="w-3 h-3" /> Raised Hands ({handRaised.length})
            </p>
            {handRaised.map((p) => (
              <ParticipantRow
                key={p.id}
                participant={p}
                currentUserId={currentUserId}
                isFacilitator={isFacilitator}
                onRemove={onRemove}
                onMuteParticipant={onMuteParticipant}
              />
            ))}
          </div>
        )}

        {/* In Meeting */}
        <div className="p-3">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-2">
            In this meeting ({inMeeting.length})
          </p>
          <div className="space-y-0.5">
            {inMeeting.map((p) => (
              <ParticipantRow
                key={p.id}
                participant={p}
                currentUserId={currentUserId}
                isFacilitator={isFacilitator}
                onRemove={onRemove}
                onMuteParticipant={onMuteParticipant}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ParticipantRow({
  participant: p,
  currentUserId,
  isFacilitator,
  onRemove,
  onMuteParticipant,
}: {
  participant: Participant;
  currentUserId?: string;
  isFacilitator: boolean;
  onRemove?: (userId: string) => void;
  onMuteParticipant?: (userId: string) => void;
}) {
  const isMe = p.user_id === currentUserId;
  const roleIcon =
    p.role === "facilitator" ? (
      <Crown className="w-3 h-3 text-warning" />
    ) : p.role === "presenter" ? (
      <ShieldCheck className="w-3 h-3 text-primary" />
    ) : null;

  return (
    <div className="flex items-center gap-2 py-1.5 px-1 rounded-lg hover:bg-muted/50 group">
      <div
        className={cn(
          "w-7 h-7 rounded-full flex items-center justify-center shrink-0",
          p.is_screen_sharing ? "bg-primary/10 ring-2 ring-primary/40" : "bg-secondary"
        )}
      >
        <span className="text-[10px] font-bold text-foreground">
          {(p.display_name || "?").charAt(0).toUpperCase()}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span className="text-xs font-medium text-foreground truncate">
            {p.display_name || p.user_id.slice(0, 8)}
          </span>
          {isMe && <span className="text-[9px] text-muted-foreground">(You)</span>}
          {roleIcon}
        </div>
      </div>

      {/* Status indicators */}
      <div className="flex items-center gap-1">
        {p.is_hand_raised && <Hand className="w-3 h-3 text-warning animate-bounce" />}
        {p.is_screen_sharing && <Monitor className="w-3 h-3 text-primary" />}
        {p.is_muted ? (
          <MicOff className="w-3 h-3 text-destructive/60" />
        ) : (
          <Mic className="w-3 h-3 text-success/60" />
        )}
        {!p.is_video_on && <VideoOff className="w-3 h-3 text-muted-foreground/50" />}
      </div>

      {/* Facilitator actions */}
      {isFacilitator && !isMe && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted">
              <MoreHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="text-xs">
            {onMuteParticipant && (
              <DropdownMenuItem onClick={() => onMuteParticipant(p.user_id)}>
                Mute participant
              </DropdownMenuItem>
            )}
            {onRemove && (
              <DropdownMenuItem
                onClick={() => onRemove(p.user_id)}
                className="text-destructive focus:text-destructive"
              >
                Remove from meeting
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
