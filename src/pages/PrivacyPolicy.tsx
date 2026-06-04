import { useState } from "react";
import { Shield, Mail, MapPin, Phone, FileText, User, Database, Lock, Globe, AlertTriangle, Clock, Scale, ChevronDown, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useBrandingLogos } from "@/hooks/useBrandingLogos";

interface PolicySection {
  icon: typeof Shield;
  title: string;
  anchor: string;
  content: React.ReactNode;
}

const sections: PolicySection[] = [
  {
    icon: User,
    anchor: "responsible-party",
    title: "Responsible Party",
    content: (
      <>
        <p>
          Intela SkillChain (Pty) Ltd is the responsible party as defined under PoPIA. Our Information Officer can be contacted at:
        </p>
        <div className="bg-primary/[0.03] border-l-2 border-accent p-5 my-4 space-y-3">
          <p className="text-sm text-foreground font-semibold">Adv. Priya Naidoo</p>
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Information Officer</p>
          <div className="pt-2 space-y-2">
            <a href="mailto:privacy@intelaskillchain.co.za" className="flex items-center gap-2.5 text-xs text-muted-foreground hover:text-accent transition-colors group">
              <Mail className="w-3.5 h-3.5 text-accent/60 group-hover:text-accent" /> privacy@intelaskillchain.co.za
            </a>
            <a href="tel:+27115550199" className="flex items-center gap-2.5 text-xs text-muted-foreground hover:text-accent transition-colors group">
              <Phone className="w-3.5 h-3.5 text-accent/60 group-hover:text-accent" /> +27 11 555 0199
            </a>
            <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
              <MapPin className="w-3.5 h-3.5 text-accent/60" /> 42 Innovation Drive, Sandton, Gauteng, 2196
            </div>
          </div>
        </div>
      </>
    ),
  },
  {
    icon: Database,
    anchor: "information-collected",
    title: "Personal Information We Collect",
    content: (
      <>
        <p>We collect the following categories of personal information:</p>
        <div className="grid sm:grid-cols-2 gap-3 mt-3">
          {[
            { label: "Identity", desc: "Full name, ID/passport number, date of birth, gender, race (for BBBEE reporting)" },
            { label: "Contact", desc: "Email address, phone number, physical address" },
            { label: "Education", desc: "Qualifications, assessment results, certificates, portfolio submissions" },
            { label: "Employment", desc: "Employer details, job title, skills profile (for talent management)" },
            { label: "Financial", desc: "Billing details, sponsorship records, BBBEE spend data" },
            { label: "Technical", desc: "IP address, browser type, usage analytics, cookies" },
          ].map((item) => (
            <div key={item.label} className="bg-secondary/30 p-3 border border-border/30">
              <p className="text-xs font-semibold text-foreground mb-0.5">{item.label}</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </>
    ),
  },
  {
    icon: FileText,
    anchor: "purpose",
    title: "Purpose of Processing",
    content: (
      <>
        <p>Your personal information is processed for the following purposes:</p>
        <ul>
          <li>Administering your learning programmes and assessments</li>
          <li>Issuing verifiable digital credentials upon programme completion</li>
          <li>Reporting to sponsors, SETAs, and government bodies as required</li>
          <li>BBBEE scorecard reporting and compliance</li>
          <li>Talent management and employment placement</li>
          <li>Communication about programme updates and opportunities</li>
          <li>Platform analytics and service improvement</li>
        </ul>
      </>
    ),
  },
  {
    icon: Scale,
    anchor: "lawful-basis",
    title: "Lawful Basis for Processing",
    content: (
      <p>
        We process your information based on one or more of the following grounds under Section 11 of PoPIA: consent,
        contractual necessity, compliance with legal obligations (SAQA, SETA regulations), and legitimate interest
        (platform improvement and security).
      </p>
    ),
  },
  {
    icon: Shield,
    anchor: "your-rights",
    title: "Your Rights as a Data Subject",
    content: (
      <>
        <p>Under PoPIA, you have the right to:</p>
        <div className="space-y-2 mt-3">
          {[
            { right: "Access", desc: "Request a copy of all personal information we hold about you" },
            { right: "Correction", desc: "Request correction of inaccurate or incomplete information" },
            { right: "Deletion", desc: "Request deletion of your personal information (right to be forgotten)" },
            { right: "Object", desc: "Object to the processing of your information for direct marketing" },
            { right: "Data Portability", desc: "Request your data in a structured, machine-readable format" },
            { right: "Withdraw Consent", desc: "Withdraw previously given consent at any time" },
          ].map((item) => (
            <div key={item.right} className="flex gap-3 items-start">
              <span className="shrink-0 mt-0.5 w-1.5 h-1.5 bg-accent rounded-full" />
              <div>
                <span className="text-xs font-semibold text-foreground">{item.right}:</span>
                <span className="text-xs text-muted-foreground ml-1">{item.desc}</span>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3">To exercise any of these rights, submit a Data Subject Access Request through the platform or contact our Information Officer.</p>
      </>
    ),
  },
  {
    icon: Clock,
    anchor: "retention",
    title: "Data Retention",
    content: (
      <>
        <p>We retain personal information only as long as necessary for the purposes stated above, or as required by law.</p>
        <div className="flex flex-wrap gap-3 mt-3">
          {[
            { period: "10 years", type: "Assessment records", basis: "SAQA requirements" },
            { period: "7 years", type: "Financial records", basis: "Tax legislation" },
            { period: "Active + 2 years", type: "All other data", basis: "Relationship duration" },
          ].map((item) => (
            <div key={item.type} className="flex-1 min-w-[140px] bg-secondary/30 border border-border/30 p-3 text-center">
              <p className="text-base font-bold text-accent">{item.period}</p>
              <p className="text-[11px] font-semibold text-foreground mt-1">{item.type}</p>
              <p className="text-[10px] text-muted-foreground">{item.basis}</p>
            </div>
          ))}
        </div>
      </>
    ),
  },
  {
    icon: Lock,
    anchor: "security",
    title: "Data Security",
    content: (
      <p>
        We implement appropriate technical and organisational measures to protect your personal information, including
        encryption at rest and in transit, role-based access controls, regular security audits, and incident response procedures.
      </p>
    ),
  },
  {
    icon: Globe,
    anchor: "cross-border",
    title: "Cross-Border Transfers",
    content: (
      <p>
        Your data may be processed in jurisdictions outside South Africa where our cloud infrastructure operates.
        In such cases, we ensure adequate safeguards are in place as required by Section 72 of PoPIA.
      </p>
    ),
  },
  {
    icon: AlertTriangle,
    anchor: "complaints",
    title: "Complaints",
    content: (
      <p>
        If you believe your personal information has been mishandled, you may lodge a complaint with our Information
        Officer or escalate to the Information Regulator of South Africa at{" "}
        <a href="mailto:inforeg@justice.gov.za" className="text-accent hover:underline inline-flex items-center gap-1">
          inforeg@justice.gov.za <ExternalLink className="w-3 h-3" />
        </a>.
      </p>
    ),
  },
];

function SectionAccordion({ section, index, isOpen, onToggle }: {
  section: PolicySection;
  index: number;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const Icon = section.icon;
  const num = String(index + 1).padStart(2, "0");

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.04 }}
      id={section.anchor}
      className="bg-card border border-border/50 shadow-card overflow-hidden group"
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-secondary/20 transition-colors"
      >
        <span className="text-[10px] font-bold text-muted-foreground/40 tabular-nums">{num}</span>
        <div className="flex items-center justify-center w-8 h-8 bg-accent/10 text-accent shrink-0">
          <Icon className="w-4 h-4" />
        </div>
        <h2 className="text-sm font-semibold text-foreground flex-1">{section.title}</h2>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pl-[4.25rem] prose prose-sm max-w-none text-foreground [&_p]:text-xs [&_p]:text-muted-foreground [&_p]:leading-relaxed [&_ul]:text-xs [&_ul]:text-muted-foreground [&_ul]:mt-2 [&_ul]:space-y-1.5 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:leading-relaxed [&_strong]:text-foreground">
              {section.content}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function LogoHeader() {
  const { headerLogo, headerLogoWidth } = useBrandingLogos();
  return (
    <div className="flex items-center gap-2">
      {headerLogo ? (
        <img src={headerLogo} alt="Intela SkillChain" className="h-8 object-contain" style={{ maxWidth: `${headerLogoWidth}px` }} />
      ) : (
        <span className="text-lg font-bold tracking-tight text-foreground flex items-baseline gap-0.5">
          <span className="text-accent italic font-extrabold">intela</span>
          <span className="text-foreground/80 font-semibold ml-1">SkillChain</span>
        </span>
      )}
    </div>
  );
}

export default function PrivacyPolicy() {
  const [openSections, setOpenSections] = useState<Set<number>>(new Set([0]));

  const toggleSection = (index: number) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const expandAll = () => setOpenSections(new Set(sections.map((_, i) => i)));
  const collapseAll = () => setOpenSections(new Set());

  return (
    <div className="animate-slide-up w-full flex justify-center">
      <div className="w-full max-w-3xl space-y-6 pb-8">
        {/* Logo */}
        <LogoHeader />
        {/* Header */}
        <div className="text-center space-y-3">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 bg-accent/10 text-accent px-4 py-1.5 text-[10px] font-bold tracking-[0.15em] uppercase"
          >
            <Shield className="w-3.5 h-3.5" />
            PoPIA Compliant
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-2xl sm:text-3xl font-bold text-foreground font-heading"
          >
            Privacy Policy
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="text-xs text-muted-foreground"
          >
            Last updated: 1 February 2026 &middot; Protection of Personal Information Act (PoPIA) Notice
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-xs text-muted-foreground max-w-xl mx-auto leading-relaxed"
          >
            This policy explains how Intela SkillChain collects, uses, and protects your personal information in accordance with South African data protection legislation.
          </motion.p>
        </div>

        {/* Quick nav + controls */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="flex items-center justify-between border-b border-border/50 pb-3"
        >
          <div className="flex flex-wrap gap-1.5">
            {sections.map((s, i) => {
              const Icon = s.icon;
              return (
                <a
                  key={s.anchor}
                  href={`#${s.anchor}`}
                  onClick={(e) => { e.preventDefault(); toggleSection(i); if (!openSections.has(i)) { setTimeout(() => document.getElementById(s.anchor)?.scrollIntoView({ behavior: "smooth", block: "center" }), 350); }}}
                  className="flex items-center gap-1 px-2 py-1 text-[10px] text-muted-foreground hover:text-accent hover:bg-accent/5 transition-colors"
                  title={s.title}
                >
                  <Icon className="w-3 h-3" />
                  <span className="hidden sm:inline">{String(i + 1).padStart(2, "0")}</span>
                </a>
              );
            })}
          </div>
          <div className="flex items-center gap-2 text-[10px]">
            <button onClick={expandAll} className="text-muted-foreground hover:text-accent transition-colors">Expand all</button>
            <span className="text-border">|</span>
            <button onClick={collapseAll} className="text-muted-foreground hover:text-accent transition-colors">Collapse all</button>
          </div>
        </motion.div>

        {/* Accordion sections */}
        <div className="space-y-2">
          {sections.map((section, i) => (
            <SectionAccordion
              key={section.anchor}
              section={section}
              index={i}
              isOpen={openSections.has(i)}
              onToggle={() => toggleSection(i)}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="text-center text-[11px] text-muted-foreground pt-4 border-t border-border/30 space-y-1">
          <p>&copy; {new Date().getFullYear()} Intela SkillChain (Pty) Ltd. All rights reserved.</p>
          <p>Registered in South Africa &middot; Company Reg. 2024/123456/07</p>
        </div>
      </div>
    </div>
  );
}
