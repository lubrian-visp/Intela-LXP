import { useState } from "react";
import { Video, VideoOff, Mic, MicOff, Monitor, Users, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface MeetingLobbyProps {
  session: any;
  displayName: string;
  onDisplayNameChange: (name: string) => void;
  onJoin: (options: { audioOn: boolean; videoOn: boolean }) => void;
  isJoining: boolean;
  participantCount: number;
}

export default function MeetingLobby({
  session,
  displayName,
  onDisplayNameChange,
  onJoin,
  isJoining,
  participantCount,
}: MeetingLobbyProps) {
  const [audioOn, setAudioOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);

  return (
    <div className="min-h-[600px] flex items-center justify-center">
      <div className="w-full max-w-2xl mx-auto">
        {/* Meeting Info */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-1">{session.title}</h1>
          <p className="text-sm text-muted-foreground">
            {format(new Date(session.scheduled_start), "EEEE, MMM dd · HH:mm")} –{" "}
            {format(new Date(session.scheduled_end), "HH:mm")}
          </p>
          {participantCount > 0 && (
            <p className="text-xs text-muted-foreground mt-2 flex items-center justify-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {participantCount} participant{participantCount !== 1 ? "s" : ""} already in the meeting
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Camera Preview */}
          <div className="relative rounded-2xl overflow-hidden bg-card border border-border aspect-video flex items-center justify-center">
            {videoOn ? (
              <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center border-2 border-primary/30">
                  <span className="text-2xl font-bold text-primary">
                    {displayName?.charAt(0)?.toUpperCase() || "?"}
                  </span>
                </div>
                <p className="absolute bottom-3 left-3 text-[10px] bg-background/80 backdrop-blur-sm px-2 py-0.5 rounded text-foreground">
                  Camera preview
                </p>
              </div>
            ) : (
              <div className="w-full h-full bg-muted flex flex-col items-center justify-center gap-2">
                <VideoOff className="w-8 h-8 text-muted-foreground/50" />
                <p className="text-xs text-muted-foreground">Camera is off</p>
              </div>
            )}
          </div>

          {/* Join Controls */}
          <div className="flex flex-col justify-center gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Your display name</label>
              <Input
                value={displayName}
                onChange={(e) => onDisplayNameChange(e.target.value)}
                placeholder="Enter your name"
                className="h-10"
              />
            </div>

            {/* Device toggles */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setAudioOn(!audioOn)}
                className={cn(
                  "p-3 rounded-full transition-colors",
                  audioOn
                    ? "bg-secondary text-foreground hover:bg-secondary/80"
                    : "bg-destructive/10 text-destructive hover:bg-destructive/20"
                )}
                title={audioOn ? "Mute microphone" : "Unmute microphone"}
              >
                {audioOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              </button>
              <button
                onClick={() => setVideoOn(!videoOn)}
                className={cn(
                  "p-3 rounded-full transition-colors",
                  videoOn
                    ? "bg-secondary text-foreground hover:bg-secondary/80"
                    : "bg-destructive/10 text-destructive hover:bg-destructive/20"
                )}
                title={videoOn ? "Turn off camera" : "Turn on camera"}
              >
                {videoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
              </button>
            </div>

            {/* Agenda preview */}
            {session.agenda && Array.isArray(session.agenda) && session.agenda.length > 0 && (
              <div className="bg-muted/50 rounded-lg p-3 border border-border/50">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-2">Meeting Agenda</p>
                <ul className="space-y-1">
                  {session.agenda.slice(0, 4).map((item: any, i: number) => (
                    <li key={i} className="text-xs text-foreground flex gap-2">
                      <span className="text-muted-foreground">{i + 1}.</span>
                      <span className="truncate">{item.title || item}</span>
                      {item.duration && (
                        <span className="ml-auto text-[10px] text-muted-foreground shrink-0">{item.duration}m</span>
                      )}
                    </li>
                  ))}
                  {session.agenda.length > 4 && (
                    <li className="text-[10px] text-muted-foreground">+{session.agenda.length - 4} more items</li>
                  )}
                </ul>
              </div>
            )}

            <Button
              size="lg"
              onClick={() => onJoin({ audioOn, videoOn })}
              disabled={isJoining || !displayName.trim()}
              className="w-full gap-2 h-12 text-sm font-semibold"
            >
              {isJoining ? "Joining..." : "Join Meeting"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
