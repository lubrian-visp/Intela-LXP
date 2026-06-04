import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  useLearnerSkillProfile, useSkills, useContentRatings, useContentComments,
  useUserGeneratedContent, useLearningRecommendations, useExternalContentItems,
} from "@/hooks/useLxpData";
import { useEnrolments, useSubmissions } from "@/hooks/useCoreData";
import { FadeIn } from "@/components/animations/MotionWrappers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  BarChart3, TrendingUp, Users, Target, Sparkles, Eye, Star, MessageSquare,
  BookOpen, Upload, Activity,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, LineChart, Line,
} from "recharts";

const COLORS = ["hsl(210, 80%, 55%)", "hsl(38, 92%, 50%)", "hsl(142, 70%, 45%)", "hsl(0, 84%, 60%)", "hsl(280, 70%, 55%)"];

export default function LxpAnalytics() {
  const { user } = useAuth();
  const { data: skills = [] } = useSkills();
  const { data: allRatings = [] } = useContentRatings();
  const { data: allComments = [] } = useContentComments();
  const { data: publishedUGC = [] } = useUserGeneratedContent({ status: "published" });
  const { data: pendingUGC = [] } = useUserGeneratedContent({ status: "pending" });
  const { data: externalItems = [] } = useExternalContentItems();
  const { data: enrolments = [] } = useEnrolments();
  const { data: submissions = [] } = useSubmissions();

  // Skill category distribution
  const catCounts: Record<string, number> = {};
  skills.forEach((s: any) => {
    const cat = s.category || "general";
    catCounts[cat] = (catCounts[cat] || 0) + 1;
  });
  const skillCatData = Object.entries(catCounts).map(([name, value]) => ({
    name: name.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()),
    value,
  }));

  // UGC by type
  const ugcTypeCounts: Record<string, number> = {};
  publishedUGC.forEach((u: any) => {
    const t = u.content_type || "other";
    ugcTypeCounts[t] = (ugcTypeCounts[t] || 0) + 1;
  });
  const ugcTypeData = Object.entries(ugcTypeCounts).map(([name, value]) => ({
    name: name.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()),
    value,
  }));

  // Engagement metrics
  const totalRatings = allRatings.length;
  const totalComments = allComments.length;
  const avgRating = totalRatings > 0 ? (allRatings.reduce((a: number, r: any) => a + r.rating, 0) / totalRatings).toFixed(1) : "0";
  const activeEnrolments = enrolments.filter((e: any) => e.status === "active" || e.status === "enrolled").length;

  // Mock engagement trend data
  const engagementTrend = [
    { month: "Jan", ratings: 12, comments: 8, submissions: 15 },
    { month: "Feb", ratings: 18, comments: 12, submissions: 22 },
    { month: "Mar", ratings: 25, comments: 20, submissions: 28 },
    { month: "Apr", ratings: 30, comments: 25, submissions: 35 },
    { month: "May", ratings: 28, comments: 30, submissions: 40 },
    { month: "Jun", ratings: 35, comments: 32, submissions: 45 },
  ];

  const statCards = [
    { label: "Active Enrolments", value: activeEnrolments, icon: BookOpen, color: "text-primary" },
    { label: "Published Content", value: publishedUGC.length, icon: Upload, color: "text-success" },
    { label: "Total Ratings", value: totalRatings, icon: Star, color: "text-warning" },
    { label: "Avg Rating", value: avgRating, icon: Star, color: "text-warning" },
    { label: "Comments", value: totalComments, icon: MessageSquare, color: "text-primary" },
    { label: "External Content", value: externalItems.length, icon: Activity, color: "text-accent" },
    { label: "Skills Tracked", value: skills.length, icon: Target, color: "text-primary" },
    { label: "Pending UGC", value: pendingUGC.length, icon: Eye, color: "text-muted-foreground" },
  ];

  return (
    <div className="space-y-6">
      <FadeIn>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" /> LXP Analytics
        </h1>
        <p className="text-sm text-muted-foreground">Platform-wide learning experience metrics and insights.</p>
      </FadeIn>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {statCards.map(s => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <s.icon className={`w-5 h-5 ${s.color} shrink-0`} />
              <div>
                <div className="text-lg font-bold text-foreground">{s.value}</div>
                <div className="text-[10px] text-muted-foreground">{s.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Engagement Trend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" /> Engagement Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={engagementTrend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" className="text-[10px]" />
                <YAxis className="text-[10px]" />
                <Tooltip />
                <Line type="monotone" dataKey="ratings" stroke="hsl(38, 92%, 50%)" strokeWidth={2} name="Ratings" />
                <Line type="monotone" dataKey="comments" stroke="hsl(210, 80%, 55%)" strokeWidth={2} name="Comments" />
                <Line type="monotone" dataKey="submissions" stroke="hsl(142, 70%, 45%)" strokeWidth={2} name="Submissions" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Skill Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" /> Skills by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            {skillCatData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={skillCatData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name}: ${value}`}>
                    {skillCatData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-xs text-muted-foreground">No skill data yet</div>
            )}
          </CardContent>
        </Card>

        {/* UGC by Type */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Upload className="w-4 h-4 text-primary" /> Content by Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            {ugcTypeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={ugcTypeData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" className="text-[10px]" />
                  <YAxis className="text-[10px]" />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(210, 80%, 55%)" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-xs text-muted-foreground">No UGC data yet</div>
            )}
          </CardContent>
        </Card>

        {/* Content Moderation Summary */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" /> Content Moderation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-secondary/30 text-center">
                <div className="text-2xl font-bold text-foreground">{publishedUGC.length}</div>
                <div className="text-[10px] text-muted-foreground">Published</div>
              </div>
              <div className="p-3 rounded-lg bg-warning/10 text-center">
                <div className="text-2xl font-bold text-foreground">{pendingUGC.length}</div>
                <div className="text-[10px] text-muted-foreground">Pending Review</div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Approval Rate</span>
                <span className="font-medium text-foreground">
                  {publishedUGC.length + pendingUGC.length > 0
                    ? Math.round((publishedUGC.length / (publishedUGC.length + pendingUGC.length)) * 100)
                    : 0}%
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Avg Rating</span>
                <span className="font-medium text-foreground">{avgRating} / 5</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
