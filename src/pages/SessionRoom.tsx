import { useEffect, useRef, useState, useCallback } from "react";
import type { Json } from "@/integrations/supabase/types";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Video, Radio } from "lucide-react";
import SessionQrCode from "@/components/attendance/SessionQrCode";
import { FadeIn } from "@/components/animations/MotionWrappers";
import { useAuth } from "@/hooks/useAuth";
import {
  useTrainingSessions, useUpdateTrainingSession,
  useSessionAttendance, useUpsertAttendance, useEnrolments
} from "@/hooks/useCoreData";
import {
  useMeetingParticipants, useJoinMeeting, useLeaveMeeting,
  useUpdateParticipant, useMeetingReactions, useSendReaction
} from "@/hooks/useMeetingRoom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import MeetingLobby from "@/components/meeting/MeetingLobby";
import MeetingToolbar from "@/components/meeting/MeetingToolbar";
import MeetingParticipantsPanel from "@/components/meeting/MeetingParticipantsPanel";
import MeetingReactionOverlay from "@/components/meeting/MeetingReactionOverlay";
import MeetingAgendaPanel from "@/components/meeting/MeetingAgendaPanel";
import SessionChatPanel from "@/components/collaboration/SessionChatPanel";
import SessionNotesPanel from "@/components/collaboration/SessionNotesPanel";

type MeetingPhase = "lobby" | "in-meeting" | "post-meeting";

export default function SessionRoom() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  const jitsiRef = useRef<HTMLDivElement>(null);
  const jitsiApiRef = useRef<any>(null);

  const { data: sessions = [], isLoading: sessLoading } = useTrainingSessions();
  const session = sessions.find((s: any) => s.id === sessionId);

  const { data: attendance = [] } = useSessionAttendance(sessionId);
  const { data: enrolments = [] } = useEnrolments({ cohortId: session?.cohort_id });
  const { data: participants = [] } = useMeetingParticipants(sessionId);
  const { data: reactions = [] } = useMeetingReactions(sessionId);
  const updateSession = useUpdateTrainingSession();
  const upsertAttendance = useUpsertAttendance();
  const joinMeeting = useJoinMeeting();
  const leaveMeeting = useLeaveMeeting();
  const updateParticipant = useUpdateParticipant();
  const sendReaction = useSendReaction();

  const isFacilitator = hasRole("facilitator") || hasRole("super_admin") || hasRole("programme_manager");
  const isLive = session?.status === "live";

  const [phase, setPhase] = useState<MeetingPhase>("lobby");
  const [displayName, setDisplayName] = useState("");
  const [activePanel, setActivePanel] = useState("chat");
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [elapsed, setElapsed] = useState("");

  // Set display name from profile
  useEffect(() => {
    if (user?.user_metadata?.full_name) setDisplayName(user.user_metadata.full_name);
    else if (user?.email) setDisplayName(user.email.split("@")[0]);
  }, [user]);

  // Track elapsed time
  useEffect(() => {
    if (phase !== "in-meeting" || !session) return;
    const start = session.actual_start ? new Date(session.actual_start) : new Date();
    const interval = setInterval(() => {
      const diff = Math.floor((Date.now() - start.getTime()) / 1000);
      const h = Math.floor(diff / 3600);
      const m = Math.floor((diff % 3600) / 60);
      const s = diff % 60;
      setElapsed(h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, session]);

  // Load Jitsi when in meeting
  useEffect(() => {
    if (!session || !isLive || phase !== "in-meeting" || !jitsiRef.current) return;
    const domain = "meet.jit.si";
    const roomName = session.jitsi_room_id || sessionId;
    const script = document.createElement("script");
    script.src = "https://meet.jit.si/external_api.js";
    script.async = true;
    script.onload = () => {
      if (!(window as any).JitsiMeetExternalAPI || !jitsiRef.current) return;
      const api = new (window as any).JitsiMeetExternalAPI(domain, {
        roomName: `IntelaSkillChain-${roomName}`,
        parentNode: jitsiRef.current,
        width: "100%",
        height: "100%",
        userInfo: { displayName: displayName || "Participant" },
        configOverwrite: {
          startWithAudioMuted: isMuted,
          startWithVideoMuted: !isVideoOn,
          prejoinPageEnabled: false,
          toolboxButtons: [],
          disableDeepLinking: true,
          hideConferenceSubject: true,
          hideConferenceTimer: true,
          disableThirdPartyRequests: true,
        },
        interfaceConfigOverwrite: {
          SHOW_JITSI_WATERMARK: false,
          SHOW_BRAND_WATERMARK: false,
          SHOW_POWERED_BY: false,
          FILM_STRIP_MAX_HEIGHT: 120,
          TOOLBAR_BUTTONS: [],
          HIDE_INVITE_MORE_HEADER: true,
          DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
          DEFAULT_BACKGROUND: "hsl(var(--background))",
        },
      });
      jitsiApiRef.current = api;

      api.addEventListener("audioMuteStatusChanged", (e: any) => setIsMuted(e.muted));
      api.addEventListener("videoMuteStatusChanged", (e: any) => setIsVideoOn(!e.muted));
      api.addEventListener("screenSharingStatusChanged", (e: any) => setIsScreenSharing(e.on));
    };
    document.head.appendChild(script);
    return () => {
      if (jitsiApiRef.current) {
        jitsiApiRef.current.dispose();
        jitsiApiRef.current = null;
      }
      if (script.parentNode) script.parentNode.removeChild(script);
    };
  }, [session, isLive, sessionId, phase, displayName]);

  // Realtime attendance
  useEffect(() => {
    if (!sessionId) return;
    const channel = supabase
      .channel(`attendance-${sessionId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "session_attendance", filter: `session_id=eq.${sessionId}` }, () => {})
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [sessionId]);

  const handleJoinMeeting = useCallback(async (opts: { audioOn: boolean; videoOn: boolean }) => {
    if (!user?.id || !sessionId) return;
    setIsMuted(!opts.audioOn);
    setIsVideoOn(opts.videoOn);

    // Join as participant
    await joinMeeting.mutateAsync({
      session_id: sessionId,
      user_id: user.id,
      display_name: displayName,
      role: isFacilitator ? "facilitator" : "attendee",
      status: "joined",
    });

    // Self check-in
    upsertAttendance.mutate({
      session_id: sessionId,
      learner_id: user.id,
      status: "present",
      check_in_method: "self",
      checked_in_at: new Date().toISOString(),
    });

    setPhase("in-meeting");
    toast.success("Joined the meeting!");
  }, [user, sessionId, displayName, isFacilitator, joinMeeting, upsertAttendance]);

  const handleLeaveMeeting = useCallback(async () => {
    if (!user?.id || !sessionId) return;
    await leaveMeeting.mutateAsync({ sessionId, userId: user.id });
    if (jitsiApiRef.current) {
      jitsiApiRef.current.dispose();
      jitsiApiRef.current = null;
    }
    setPhase("post-meeting");
    toast.info("You left the meeting");
  }, [user, sessionId, leaveMeeting]);

  const handleEndForAll = useCallback(() => {
    if (!session) return;
    updateSession.mutate(
      { id: session.id, status: "completed", actual_end: new Date().toISOString() },
      { onSuccess: () => toast.success("Meeting ended for everyone") }
    );
  }, [session, updateSession]);

  const handleToggleMute = () => {
    if (jitsiApiRef.current) jitsiApiRef.current.executeCommand("toggleAudio");
    else setIsMuted(!isMuted);
    if (user?.id && sessionId) {
      updateParticipant.mutate({ sessionId, userId: user.id, is_muted: !isMuted });
    }
  };

  const handleToggleVideo = () => {
    if (jitsiApiRef.current) jitsiApiRef.current.executeCommand("toggleVideo");
    else setIsVideoOn(!isVideoOn);
    if (user?.id && sessionId) {
      updateParticipant.mutate({ sessionId, userId: user.id, is_video_on: !isVideoOn });
    }
  };

  const handleToggleScreenShare = () => {
    if (jitsiApiRef.current) jitsiApiRef.current.executeCommand("toggleShareScreen");
    if (user?.id && sessionId) {
      updateParticipant.mutate({ sessionId, userId: user.id, is_screen_sharing: !isScreenSharing });
    }
  };

  const handleToggleHandRaise = () => {
    const newState = !isHandRaised;
    setIsHandRaised(newState);
    if (jitsiApiRef.current) jitsiApiRef.current.executeCommand("toggleRaiseHand");
    if (user?.id && sessionId) {
      updateParticipant.mutate({ sessionId, userId: user.id, is_hand_raised: newState });
    }
  };

  const handleReaction = (type: string) => {
    if (!user?.id || !sessionId) return;
    sendReaction.mutate({ session_id: sessionId, user_id: user.id, reaction_type: type });
  };

  const handleStartSession = () => {
    if (!session) return;
    updateSession.mutate(
      { id: session.id, status: "live", actual_start: new Date().toISOString() },
      { onSuccess: () => toast.success("Session started!") }
    );
  };

  // --- RENDER ---
  if (sessLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-[500px] rounded-xl" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="p-12 text-center">
        <Video className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
        <p className="text-sm text-muted-foreground">Session not found</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/sessions")}>
          Back to Sessions
        </Button>
      </div>
    );
  }

  // Post-meeting
  if (phase === "post-meeting" || session.status === "completed") {
    return (
      <div className="space-y-6">
        <FadeIn>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/sessions")}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            <h1 className="text-xl font-bold text-foreground">{session.title}</h1>
          </div>
        </FadeIn>
        <div className="max-w-xl mx-auto text-center py-16">
          <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
            <Video className="w-8 h-8 text-success" />
          </div>
          <h2 className="text-lg font-bold text-foreground mb-1">Meeting has ended</h2>
          <p className="text-sm text-muted-foreground mb-6">
            {session.title} · {format(new Date(session.scheduled_start), "MMM dd, yyyy")}
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button variant="outline" onClick={() => navigate("/sessions")}>
              Back to Sessions
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Pre-session (not yet live)
  if (session.status === "scheduled" && phase === "lobby") {
    return (
      <div className="space-y-6">
        <FadeIn>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/sessions")}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-foreground">{session.title}</h1>
              <p className="text-xs text-muted-foreground">
                Scheduled for {format(new Date(session.scheduled_start), "MMM dd 'at' HH:mm")}
              </p>
            </div>
            {isFacilitator && (
              <div className="flex items-center gap-2">
                <SessionQrCode session={session} />
                <Button size="sm" onClick={handleStartSession} className="gap-1.5">
                  <Radio className="w-4 h-4" /> Start Session
                </Button>
              </div>
            )}
          </div>
        </FadeIn>
        <MeetingLobby
          session={session}
          displayName={displayName}
          onDisplayNameChange={setDisplayName}
          onJoin={() => toast.info("Session hasn't started yet. Wait for the facilitator to start it.")}
          isJoining={false}
          participantCount={0}
        />
      </div>
    );
  }

  // Lobby phase for live session
  if (phase === "lobby" && isLive) {
    return (
      <div className="space-y-6">
        <FadeIn>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/sessions")}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-foreground">{session.title}</h1>
                <span className="flex items-center gap-1 text-xs font-medium text-success bg-success/10 px-2 py-0.5 rounded-full">
                  <Radio className="w-3 h-3 animate-pulse" /> Live
                </span>
              </div>
            </div>
          </div>
        </FadeIn>
        <MeetingLobby
          session={session}
          displayName={displayName}
          onDisplayNameChange={setDisplayName}
          onJoin={handleJoinMeeting}
          isJoining={joinMeeting.isPending}
          participantCount={participants.filter((p: any) => p.status === "joined").length}
        />
      </div>
    );
  }

  // In-meeting phase
  const rawAgenda = Array.isArray(session.agenda) ? session.agenda : [];
  const agenda = rawAgenda.map((item: any) => ({
    title: typeof item === "string" ? item : (item?.title || ""),
    duration: typeof item === "object" ? item?.duration : undefined,
    completed: typeof item === "object" ? !!item?.completed : false,
  }));
  const showPanel = !!activePanel;

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] gap-3">
      {/* Header bar */}
      <div className="flex items-center gap-3 px-1 shrink-0">
        <Button variant="ghost" size="sm" onClick={() => navigate("/sessions")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <h1 className="text-sm font-bold text-foreground truncate">{session.title}</h1>
          <span className="flex items-center gap-1 text-[10px] font-medium text-success bg-success/10 px-1.5 py-0.5 rounded-full shrink-0">
            <Radio className="w-2.5 h-2.5 animate-pulse" /> Live
          </span>
        </div>
        {isFacilitator && <SessionQrCode session={session} />}
        <p className="text-[10px] text-muted-foreground shrink-0">
          {(session as any).cohorts?.name}
        </p>
      </div>

      {/* Main content */}
      {/* Cast agenda from Json to typed array */}
      <div className="flex-1 flex gap-3 min-h-0">
        {/* Video area */}
        <div className="flex-1 relative rounded-2xl overflow-hidden border border-border bg-background">
          <div ref={jitsiRef} className="w-full h-full" />
          <MeetingReactionOverlay reactions={reactions} />
        </div>

        {/* Side panel */}
        {showPanel && (
          <div className="w-80 shrink-0 flex flex-col gap-3 overflow-y-auto">
            {activePanel === "participants" && (
              <MeetingParticipantsPanel
                participants={participants as any}
                currentUserId={user?.id}
                isFacilitator={isFacilitator}
                onAdmit={(userId) =>
                  updateParticipant.mutate({ sessionId: sessionId!, userId, status: "joined" })
                }
                onRemove={(userId) =>
                  leaveMeeting.mutate({ sessionId: sessionId!, userId })
                }
                onMuteParticipant={(userId) =>
                  updateParticipant.mutate({ sessionId: sessionId!, userId, is_muted: true })
                }
              />
            )}
            {activePanel === "chat" && sessionId && (
              <SessionChatPanel sessionId={sessionId} isLive={isLive} />
            )}
            {activePanel === "notes" && sessionId && (
              <SessionNotesPanel sessionId={sessionId} isLive={isLive} />
            )}
            {agenda.length > 0 && activePanel === "participants" && (
              <MeetingAgendaPanel
                agenda={agenda}
                isFacilitator={isFacilitator}
                onToggleComplete={(idx) => {
                  const newAgenda = [...agenda];
                  newAgenda[idx] = { ...newAgenda[idx], completed: !newAgenda[idx].completed };
                  updateSession.mutate({ id: session.id, agenda: newAgenda });
                }}
              />
            )}
          </div>
        )}
      </div>

      {/* Bottom toolbar */}
      <div className="shrink-0 flex justify-center pb-2">
        <MeetingToolbar
          isMuted={isMuted}
          isVideoOn={isVideoOn}
          isScreenSharing={isScreenSharing}
          isHandRaised={isHandRaised}
          onToggleMute={handleToggleMute}
          onToggleVideo={handleToggleVideo}
          onToggleScreenShare={handleToggleScreenShare}
          onToggleHandRaise={handleToggleHandRaise}
          onReaction={handleReaction}
          onLeave={handleLeaveMeeting}
          onEndForAll={isFacilitator ? handleEndForAll : undefined}
          isFacilitator={isFacilitator}
          activePanel={activePanel}
          onPanelChange={setActivePanel}
          duration={elapsed}
        />
      </div>
    </div>
  );
}
