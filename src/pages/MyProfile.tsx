import { User, Pencil, Shield, Monitor } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProfilePersonalTab from "@/components/settings/ProfilePersonalTab";
import ProfileLearningTab from "@/components/settings/ProfileLearningTab";
import ProfileSecurityTab from "@/components/settings/ProfileSecurityTab";
import ProfileAuditTab from "@/components/settings/ProfileAuditTab";

export default function MyProfile() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole("super_admin") || hasRole("systems_admin");

  const profileSubTabs = isAdmin
    ? [
        { id: "personal", label: "Personal", icon: User },
        { id: "learning", label: "Learning", icon: Pencil },
        { id: "security", label: "Security", icon: Shield },
        { id: "audit", label: "Audit", icon: Monitor },
      ]
    : [
        { id: "personal", label: "Personal", icon: User },
        { id: "security", label: "Security", icon: Shield },
      ];

  return (
    <div className="animate-slide-up">
      <div className="flex items-center gap-2.5 mb-5">
        <User className="w-5 h-5 text-accent" />
        <h1 className="text-2xl font-bold text-foreground">My Profile</h1>
      </div>

      <Tabs defaultValue="personal">
        <TabsList className="bg-transparent p-0 h-auto gap-0 border-b border-border/30 rounded-none w-full justify-start overflow-x-auto flex-nowrap">
          {profileSubTabs.map((st) => (
            <TabsTrigger
              key={st.id}
              value={st.id}
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-accent data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-xs font-medium gap-1.5"
            >
              <st.icon className="w-3.5 h-3.5" />
              {st.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="mt-5">
          <TabsContent value="personal"><ProfilePersonalTab /></TabsContent>
          {isAdmin && <TabsContent value="learning"><ProfileLearningTab /></TabsContent>}
          <TabsContent value="security"><ProfileSecurityTab /></TabsContent>
          {isAdmin && <TabsContent value="audit"><ProfileAuditTab /></TabsContent>}
        </div>
      </Tabs>
    </div>
  );
}
