import { useState } from "react";
import { Search, BookOpen, GraduationCap, Users, Shield, Settings, BarChart3, ChevronDown, ChevronRight, ExternalLink, MessageCircle, Lightbulb, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface FAQItem {
  question: string;
  answer: string;
}

interface HelpCategory {
  title: string;
  icon: any;
  description: string;
  color: string;
  faqs: FAQItem[];
}

const helpCategories: HelpCategory[] = [
  {
    title: "Getting Started",
    icon: Zap,
    description: "Learn the basics of navigating the platform",
    color: "hsl(var(--accent))",
    faqs: [
      { question: "How do I navigate the platform?", answer: "Use the sidebar on the left to navigate between different sections. The sidebar is organized by domain: Technical/Admin, Operations, Programmes & Design, Talent & Sponsors, and Learning & Development. Click on any item to navigate to that page." },
      { question: "How do I switch between roles?", answer: "If you have multiple roles assigned, the platform automatically adapts the navigation and available features based on your roles. Contact your administrator if you need additional role access." },
      { question: "How do I update my profile?", answer: "Navigate to 'My Profile' in the Account section of the sidebar, or click your avatar in the top-right corner and select 'My Settings'. Here you can update your personal information, avatar, and preferences." },
      { question: "What do the different status badges mean?", answer: "Items across the platform use color-coded status badges: Draft (yellow) — work in progress; Pending Approval (blue) — awaiting review; Approved (green) — ready for use; Published (purple) — live and accessible; Suspended (red) — temporarily disabled; Archived (grey) — no longer active." },
    ],
  },
  {
    title: "Programme Management",
    icon: GraduationCap,
    description: "Creating, managing, and publishing programmes",
    color: "hsl(38, 92%, 50%)",
    faqs: [
      { question: "How do I create a new programme?", answer: "Go to the Programme Hub and click 'New Programme'. Select a Programme Type (which determines the DNA/rules), fill in the metadata, and save. Your programme starts in Draft status." },
      { question: "What is the Programme Builder?", answer: "The Programme Builder is a visual editor for structuring your programme's content. You can add tracks, modules, and content blocks. Access it by clicking 'Build' on any programme card in the Programme Hub." },
      { question: "How does the approval workflow work?", answer: "Programmes follow a lifecycle: Draft → Pending Approval → Approved → Published. The four-eyes principle applies — the person who creates a programme cannot approve it. An Operations or Super Admin user must approve before publishing." },
      { question: "What are Programme Types?", answer: "Programme Types are the 'DNA' of your programmes. They define mandatory fields, assessment rules, compliance requirements, and structural constraints. Each programme inherits its type's configuration." },
      { question: "Can I edit a published programme?", answer: "No. Once published, structural modifications are locked to protect active learners. To make changes, use 'Clone as New Draft' to create an editable copy, then follow the approval workflow again." },
    ],
  },
  {
    title: "Learner Management",
    icon: Users,
    description: "Onboarding, enrolment, and learner progress",
    color: "hsl(210, 80%, 55%)",
    faqs: [
      { question: "How do I onboard new learners?", answer: "Navigate to Learner Onboarding. You can register learners individually via the form, allow self-registration, or bulk import via CSV. Each registration goes through a verification checklist before approval." },
      { question: "How does enrolment work?", answer: "After a learner's registration is approved, they can be enrolled into a cohort. Enrolment must be enabled by Operations Control via the global enrolment toggle. Learners are then assigned to specific cohorts within programmes." },
      { question: "How do I track learner progress?", answer: "Use the Analytics section for aggregate progress data, or navigate to individual learner profiles. Facilitators can track progress via their dashboard. Progress is automatically calculated based on completed content blocks and assessments." },
      { question: "What documents are required for registration?", answer: "The verification checklist includes: ID document, qualification certificate, proof of residence, data consent, and regulatory clearance (if applicable). Document requirements may vary based on programme type and country." },
    ],
  },
  {
    title: "Assessments & Credentials",
    icon: BookOpen,
    description: "Assessment management, grading, and credential issuance",
    color: "hsl(152, 60%, 40%)",
    faqs: [
      { question: "How are assessments managed?", answer: "Assessments are created within the Programme Builder and linked to modules. Types include formative, summative, workplace, and portfolio-based assessments. Assessors grade submissions, and automatic moderation sampling ensures quality." },
      { question: "What is the moderation process?", answer: "When an assessment is graded, the system automatically samples submissions for moderation based on configurable rules. Below the learner threshold, all submissions require moderation. Above it, a percentage is randomly sampled." },
      { question: "How are credentials issued?", answer: "Once a learner completes all programme requirements, credentials can be issued. Each credential receives a unique verification hash and QR code. Credentials can be verified via the public verification URL." },
    ],
  },
  {
    title: "Security & Compliance",
    icon: Shield,
    description: "Data protection, roles, and audit trails",
    color: "hsl(0, 70%, 55%)",
    faqs: [
      { question: "What security measures are in place?", answer: "The platform uses role-based access control (RBAC), row-level security (RLS), encrypted data storage, and comprehensive audit logging. All actions are tracked and attributable to specific users." },
      { question: "How does PoPIA/GDPR compliance work?", answer: "The PoPIA Compliance module provides cookie consent management, data processing agreements, and privacy policy management. Users must consent to data processing, and all consent records are stored with timestamps." },
      { question: "How do I manage user roles?", answer: "Navigate to Roles & Permissions. The platform supports roles including Super Admin, Systems Admin, Programme Manager, Operations, Facilitator, Assessor, Moderator, Mentor, Learner, and Sponsor. Each role has specific permissions." },
    ],
  },
  {
    title: "Platform Settings",
    icon: Settings,
    description: "Configuration, branding, and system settings",
    color: "hsl(var(--muted-foreground))",
    faqs: [
      { question: "How do I customize branding?", answer: "Go to Platform Settings → Branding. You can upload logos (header, footer, favicon), set primary and accent colors, and configure the login page background. Changes apply platform-wide immediately." },
      { question: "How do I manage typography?", answer: "Navigate to Admin → Typography Manager. You can browse Google Fonts or upload custom fonts, then assign them to specific elements (headings, body, navigation, buttons, forms, brand, special)." },
      { question: "How do I configure multi-tenancy?", answer: "Super Admins can manage tenants via the Multi-Tenancy section. Each tenant gets its own domain, branding, and user management. Users can belong to multiple tenants." },
      { question: "How do I configure email notifications?", answer: "Go to Platform Settings → Notifications. You can configure SMTP settings for email delivery and manage notification templates. Users can control their notification preferences in My Settings." },
    ],
  },
];

export default function HelpCenter() {
  const [search, setSearch] = useState("");
  const [expandedCategory, setExpandedCategory] = useState<string | null>("Getting Started");
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);

  const filteredCategories = helpCategories.map(cat => ({
    ...cat,
    faqs: cat.faqs.filter(
      faq =>
        !search ||
        faq.question.toLowerCase().includes(search.toLowerCase()) ||
        faq.answer.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter(cat => cat.faqs.length > 0);

  const totalResults = filteredCategories.reduce((sum, cat) => sum + cat.faqs.length, 0);

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-accent/10 mb-4">
          <Lightbulb className="w-7 h-7 text-accent" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Help Centre</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Find answers, learn features, and get the most out of the platform.
        </p>
      </div>

      {/* Search */}
      <div className="max-w-lg mx-auto relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search for help topics..."
          className="w-full pl-11 pr-4 py-3 text-sm bg-card rounded-xl border border-border outline-none focus:ring-2 focus:ring-accent text-foreground placeholder:text-muted-foreground shadow-card"
        />
        {search && (
          <p className="text-xs text-muted-foreground mt-2 text-center">
            {totalResults} result{totalResults !== 1 ? "s" : ""} found
          </p>
        )}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {helpCategories.map(cat => (
          <button
            key={cat.title}
            onClick={() => { setExpandedCategory(cat.title); setSearch(""); }}
            className={cn(
              "flex flex-col items-center gap-2 p-4 rounded-xl border transition-all duration-200 text-center",
              expandedCategory === cat.title
                ? "bg-accent/10 border-accent/30 shadow-sm"
                : "bg-card border-border/50 hover:border-accent/20 hover:shadow-card"
            )}
          >
            <cat.icon className="w-5 h-5" style={{ color: cat.color }} />
            <span className="text-xs font-medium text-foreground">{cat.title}</span>
          </button>
        ))}
      </div>

      {/* FAQ Sections */}
      <div className="max-w-3xl mx-auto space-y-4">
        {filteredCategories.map(cat => (
          <div key={cat.title} className="bg-card rounded-xl border border-border/50 overflow-hidden shadow-card">
            <button
              onClick={() => setExpandedCategory(expandedCategory === cat.title ? null : cat.title)}
              className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-secondary/30 transition-colors"
            >
              <cat.icon className="w-5 h-5 shrink-0" style={{ color: cat.color }} />
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-semibold text-foreground">{cat.title}</h2>
                <p className="text-xs text-muted-foreground">{cat.description}</p>
              </div>
              <span className="text-[10px] font-medium text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">{cat.faqs.length}</span>
              {expandedCategory === cat.title ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              )}
            </button>

            {expandedCategory === cat.title && (
              <div className="border-t border-border/50">
                {cat.faqs.map((faq, idx) => {
                  const faqKey = `${cat.title}-${idx}`;
                  const isOpen = expandedFaq === faqKey;
                  return (
                    <div key={idx} className={cn("border-b border-border/30 last:border-b-0", isOpen && "bg-secondary/20")}>
                      <button
                        onClick={() => setExpandedFaq(isOpen ? null : faqKey)}
                        className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-secondary/20 transition-colors"
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-accent shrink-0" />
                        <span className="text-sm text-foreground flex-1">{faq.question}</span>
                        {isOpen ? (
                          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        )}
                      </button>
                      {isOpen && (
                        <div className="px-5 pb-4 pl-12 animate-fade-in">
                          <p className="text-sm text-muted-foreground leading-relaxed">{faq.answer}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Still need help */}
      <div className="max-w-3xl mx-auto bg-accent/5 rounded-xl border border-accent/20 p-6 text-center">
        <h3 className="text-sm font-semibold text-foreground mb-1">Still need help?</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Can't find what you're looking for? Reach out to your platform administrator for assistance.
        </p>
        <div className="flex items-center justify-center gap-3">
          <a href="mailto:support@example.com" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-accent-foreground text-xs font-semibold hover:opacity-90 transition-opacity">
            <ExternalLink className="w-3.5 h-3.5" />
            Contact Support
          </a>
        </div>
      </div>
    </div>
  );
}
