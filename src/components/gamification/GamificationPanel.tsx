import { useLearnerBadges, useLearnerPoints, useLeaderboard } from "@/hooks/useGamification";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  Award, Star, Trophy, Flame, Zap, Medal,
  Crown, Target,
} from "lucide-react";
import { useMemo } from "react";

const iconMap: Record<string, any> = {
  award: Award, star: Star, trophy: Trophy, flame: Flame,
  zap: Zap, medal: Medal, crown: Crown, target: Target,
};

const categoryColors: Record<string, string> = {
  achievement: "bg-warning/10 text-warning",
  milestone: "bg-primary/10 text-primary",
  streak: "bg-destructive/10 text-destructive",
  special: "bg-accent/10 text-accent-foreground",
};

export default function GamificationPanel() {
  const { user } = useAuth();
  const { data: earnedBadges = [] } = useLearnerBadges(user?.id);
  const { data: pointsHistory = [] } = useLearnerPoints(user?.id);
  const { data: leaderboard = [] } = useLeaderboard(10);

  const totalPoints = useMemo(
    () => pointsHistory.reduce((sum, p) => sum + p.points, 0),
    [pointsHistory]
  );

  const myRank = useMemo(
    () => leaderboard.findIndex((l) => l.learner_id === user?.id) + 1,
    [leaderboard, user?.id]
  );

  // Level calculation (every 100 points = 1 level)
  const level = Math.floor(totalPoints / 100) + 1;
  const levelProgress = totalPoints % 100;

  return (
    <div className="space-y-6">
      {/* Points & Level Card */}
      <div className="bg-card rounded-xl p-5 border border-border/50 shadow-card">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-warning to-warning/60 flex items-center justify-center shadow-lg">
            <Star className="w-7 h-7 text-white" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{totalPoints.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Total Points</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-lg font-bold text-foreground">Level {level}</p>
            <p className="text-[10px] text-muted-foreground">{100 - levelProgress} pts to next level</p>
          </div>
        </div>
        <Progress value={levelProgress} className="h-2" />
      </div>

      <Tabs defaultValue="badges">
        <TabsList className="bg-secondary">
          <TabsTrigger value="badges" className="text-xs gap-1"><Award className="w-3 h-3" /> Badges ({earnedBadges.length})</TabsTrigger>
          <TabsTrigger value="leaderboard" className="text-xs gap-1"><Trophy className="w-3 h-3" /> Leaderboard</TabsTrigger>
          <TabsTrigger value="history" className="text-xs gap-1"><Zap className="w-3 h-3" /> Points Log</TabsTrigger>
        </TabsList>

        {/* Badges */}
        <TabsContent value="badges" className="mt-4">
          {earnedBadges.length === 0 ? (
            <div className="bg-card rounded-xl p-10 border border-border/50 text-center">
              <Award className="w-10 h-10 mx-auto text-muted-foreground/20 mb-2" />
              <p className="text-sm font-medium text-foreground mb-1">No Badges Yet</p>
              <p className="text-xs text-muted-foreground">Complete activities and assessments to earn badges.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {earnedBadges.map((lb) => {
                const badge = lb.badges;
                if (!badge) return null;
                const Icon = iconMap[badge.icon] || Award;
                return (
                  <div key={lb.id} className="bg-card rounded-xl p-4 border border-border/50 text-center hover:shadow-card transition-shadow">
                    <div
                      className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center"
                      style={{ backgroundColor: `${badge.color}20` }}
                    >
                      <Icon className="w-6 h-6" style={{ color: badge.color }} />
                    </div>
                    <p className="text-xs font-semibold text-foreground">{badge.name}</p>
                    <p className="text-[9px] text-muted-foreground mt-0.5">{badge.description}</p>
                    <Badge variant="outline" className={cn("text-[8px] mt-2", categoryColors[badge.category])}>
                      {badge.category}
                    </Badge>
                    <p className="text-[9px] text-muted-foreground mt-1">
                      +{badge.points_value} pts
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Leaderboard */}
        <TabsContent value="leaderboard" className="mt-4">
          {leaderboard.length === 0 ? (
            <div className="bg-card rounded-xl p-10 border border-border/50 text-center">
              <Trophy className="w-10 h-10 mx-auto text-muted-foreground/20 mb-2" />
              <p className="text-xs text-muted-foreground">No leaderboard data yet.</p>
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
              {myRank > 0 && (
                <div className="px-4 py-2.5 bg-primary/5 border-b border-border/30 text-xs">
                  Your rank: <span className="font-bold text-primary">#{myRank}</span>
                </div>
              )}
              <div className="divide-y divide-border/30">
                {leaderboard.map((entry) => {
                  const isMe = entry.learner_id === user?.id;
                  const rankIcon = entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : entry.rank === 3 ? "🥉" : null;
                  return (
                    <div key={entry.learner_id} className={cn("flex items-center gap-3 px-4 py-2.5", isMe && "bg-primary/5")}>
                      <span className="text-sm font-bold text-muted-foreground w-8 text-center">
                        {rankIcon || `#${entry.rank}`}
                      </span>
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={entry.avatar_url || undefined} />
                        <AvatarFallback className="text-[10px]">{entry.full_name?.charAt(0) || "?"}</AvatarFallback>
                      </Avatar>
                      <span className={cn("text-xs flex-1", isMe ? "font-bold text-foreground" : "text-foreground")}>
                        {entry.full_name} {isMe && "(You)"}
                      </span>
                      <span className="text-xs font-bold text-warning">{entry.total_points.toLocaleString()} pts</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </TabsContent>

        {/* Points History */}
        <TabsContent value="history" className="mt-4">
          {pointsHistory.length === 0 ? (
            <div className="bg-card rounded-xl p-10 border border-border/50 text-center">
              <Zap className="w-10 h-10 mx-auto text-muted-foreground/20 mb-2" />
              <p className="text-xs text-muted-foreground">No points earned yet.</p>
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-border/50 divide-y divide-border/30 max-h-[400px] overflow-y-auto">
              {pointsHistory.slice(0, 50).map((p) => (
                <div key={p.id} className="flex items-center gap-3 px-4 py-2.5">
                  <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold", p.points > 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive")}>
                    {p.points > 0 ? "+" : ""}{p.points}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground truncate">{p.reason}</p>
                    <p className="text-[9px] text-muted-foreground">
                      {new Date(p.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
