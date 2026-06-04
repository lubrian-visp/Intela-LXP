import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  GraduationCap, Shield, BarChart3, Users, Globe, Award,
  ArrowRight, CheckCircle2, Zap, BookOpen, ChevronRight,
  Lock, Layers, Target, Sparkles, Mail, Phone, Clock,
  ClipboardCheck, UserCheck, Briefcase, Building2, Monitor, Settings
} from "lucide-react";
import { Button } from "@/components/ui/button";
import heroImage from "@/assets/hero-classroom.jpg";
import LoginDialog from "@/components/auth/LoginDialog";
import { useBrandingLogos } from "@/hooks/useBrandingLogos";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.6, delay: i * 0.1, ease: "easeOut" as const },
  }),
};

const stats = [
  { value: "50K+", label: "Learners Empowered" },
  { value: "200+", label: "Programmes Delivered" },
  { value: "98%", label: "Compliance Rate" },
  { value: "15+", label: "Countries Served" },
];

const features = [
  {
    icon: BookOpen,
    title: "Programme Builder",
    desc: "Design curricula. Structure programmes into modules with 15+ content block types including rich text, video, rubrics, logbooks, and peer reviews.",
  },
  {
    icon: Users,
    title: "Learner Onboarding & Cohorts",
    desc: "Register learners via self-service, sponsor nomination, or bulk import. Verify documents automatically, manage SLA deadlines, and organise learners into facilitator-led cohorts.",
  },
  {
    icon: ClipboardCheck,
    title: "Assessment & Moderation",
    desc: "Create weighted assessments tied to modules. Assessors grade submissions while moderators review decisions through structured moderation queues with full audit trails.",
  },
  {
    icon: Award,
    title: "Digital Credentials",
    desc: "Issue blockchain-verified certificates and digital badges upon programme completion. Learners maintain a credential wallet with publicly verifiable links.",
  },
  {
    icon: Shield,
    title: "Governance & Compliance",
    desc: "Built-in PoPIA/GDPR compliance, country-specific regulatory frameworks, approval routing rules, delegated authority management, and automated audit logging.",
  },
  {
    icon: BarChart3,
    title: "Analytics & Reporting",
    desc: "Real-time dashboards for every stakeholder. Track learner progress, cohort performance, sponsor compliance, assessment outcomes, and system health.",
  },
  {
    icon: Monitor,
    title: "Virtual Training Sessions",
    desc: "Host live collaborative sessions with meeting rooms, agendas, participant management, screen sharing, reactions, shared notes, and attendance tracking.",
  },
];

const roles = [
  { icon: Zap, name: "Super Admin", desc: "Full platform configuration, user provisioning, and system health monitoring" },
  { icon: Monitor, name: "Systems Admin", desc: "Technical settings, integrations, feature flags, and database management" },
  { icon: Briefcase, name: "Programme Manager", desc: "Design programmes, manage cohorts, configure assessments, and oversee delivery" },
  { icon: Building2, name: "Operations", desc: "Learner pipeline oversight, approval queues, and operational reporting" },
  { icon: Target, name: "Talent Manager", desc: "Workforce development tracking, pathways, and talent pipeline management" },
  { icon: Sparkles, name: "Sponsor", desc: "Fund learners, monitor compliance, view progress reports, and manage linking" },
  { icon: Users, name: "Facilitator", desc: "Run training sessions, track learner engagement, and manage cohort delivery" },
  { icon: ClipboardCheck, name: "Assessor", desc: "Grade submissions, provide feedback, and review assessment evidence" },
  { icon: Layers, name: "Moderator", desc: "Quality-assure assessment decisions through moderation queues and reports" },
  { icon: UserCheck, name: "Mentor", desc: "Guide mentees, review evidence portfolios, and sign off on workplace learning" },
  { icon: GraduationCap, name: "Learner", desc: "Access courses, submit assessments, track progress, and earn digital credentials" },
  { icon: Settings, name: "Custom", desc: "Create bespoke roles with tailored permissions, dashboards, and navigation scoped to your organisation" },
];

const navSections = [
  { id: "features", label: "Platform" },
  { id: "how-it-works", label: "How It Works" },
  { id: "roles", label: "Portals" },
  { id: "compliance", label: "Compliance" },
  { id: "contact", label: "Contact" },
];

export default function LandingPage() {
  const [loginOpen, setLoginOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const { headerLogo, footerLogo, headerLogoWidth, footerLogoWidth } = useBrandingLogos();

  const handleScroll = useCallback(() => {
    const offsets = navSections.map(({ id }) => {
      const el = document.getElementById(id);
      if (!el) return { id, top: Infinity };
      return { id, top: el.getBoundingClientRect().top };
    });
    // Pick the section closest to top but already scrolled into view (top <= 120)
    const visible = offsets.filter((o) => o.top <= 120);
    setActiveSection(visible.length > 0 ? visible[visible.length - 1].id : null);
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);
  return (
    <div className="min-h-screen overflow-x-hidden">
      {/* ── Navbar ── */}
      <div className="fixed top-0 inset-x-0 z-50">
        <div className="h-[3px] bg-[hsl(27,90%,52%)]" />
        <nav className="bg-[hsl(209,50%,18%)] border-b border-white/10">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between px-6 h-12">
          <Link to="/" className="flex items-center gap-2">
            {headerLogo ? (
              <img src={headerLogo} alt="Intela SkillChain" className="h-7 object-contain" style={{ maxWidth: `${headerLogoWidth}px` }} />
            ) : (
              <span className="text-base font-bold tracking-tight text-white flex items-baseline gap-0.5">
                <span className="text-[hsl(27,90%,52%)] italic font-extrabold">intela</span>
                <span className="text-white/90 font-semibold ml-1">SkillChain</span>
              </span>
            )}
          </Link>

          <div className="hidden md:flex items-center gap-10 text-[11px] font-semibold uppercase tracking-[0.15em] text-white/60">
            {navSections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className={`transition-colors ${activeSection === s.id ? "text-[hsl(27,90%,52%)]" : "hover:text-white"}`}
              >
                {s.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <button onClick={() => setLoginOpen(true)} className="text-[11px] font-semibold uppercase tracking-[0.15em] text-white/70 hover:text-white transition-colors">
              Login
            </button>
            <Button size="sm" onClick={() => setLoginOpen(true)} className="bg-transparent border border-[hsl(27,90%,52%)] text-[hsl(27,90%,52%)] hover:bg-[hsl(27,90%,52%)] hover:text-white text-[11px] font-bold uppercase tracking-[0.15em] h-8 px-4 rounded-sm transition-all">
              Get Started <ArrowRight className="ml-1.5 h-3 w-3" />
            </Button>
          </div>
        </div>
        </nav>
      </div>


      {/* ── Hero — Photo split layout ── */}
      <section className="relative min-h-[75vh] flex items-center overflow-hidden">
        {/* Full background photo */}
        <div className="absolute inset-0 z-0">
          <img src={heroImage} alt="" className="w-full h-full object-cover" />
          {/* Dark overlay — heavier on left for text readability */}
          <div className="absolute inset-0 bg-gradient-to-r from-[hsl(209,69%,6%)] to-[hsl(209,69%,8%)]/70" />
          {/* Bottom edge fade */}
          <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-[hsl(209,69%,6%)] to-transparent" />
        </div>

        <div className="relative z-10 max-w-[1400px] mx-auto px-6 pt-28 pb-24 w-full">
          <div className="max-w-2xl">
            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-sm font-bold uppercase tracking-[0.25em] text-[hsl(27,90%,52%)] mb-5"
            >
              Intela SkillChain
            </motion.p>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="text-4xl sm:text-5xl md:text-6xl lg:text-[4rem] font-extrabold leading-[1.06] tracking-tight text-white"
            >
              Skills Development.{" "}
              <br />
              <span className="bg-gradient-to-r from-[hsl(27,90%,52%)] to-[hsl(38,95%,60%)] bg-clip-text text-transparent">
                Simplified.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.25 }}
              className="mt-6 text-base md:text-lg text-white/70 leading-relaxed max-w-lg"
            >
              An enterprise-grade platform to design programmes, onboard learners,
              deliver training, and issue verified credentials — all in one place.
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.35 }}
              className="mt-4 text-sm md:text-base text-white/50 leading-relaxed max-w-lg"
            >
              Streamline your entire learning lifecycle with built-in compliance,
              governance, and real-time analytics.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.45 }}
              className="mt-10 flex flex-col sm:flex-row gap-4"
            >
              <Button size="lg" className="bg-gradient-to-r from-[hsl(27,90%,52%)] to-[hsl(20,90%,45%)] text-white hover:opacity-90 shadow-xl shadow-[hsl(27,90%,52%)]/20 text-sm font-bold uppercase tracking-wider px-8 h-12 border-0 rounded-md" asChild>
                <Link to="/auth">
                  Get Started <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="bg-white text-primary border-white hover:bg-white/90 text-sm font-bold uppercase tracking-wider px-8 h-12 rounded-md" asChild>
                <a href="#features">
                  Explore the Platform
                </a>
              </Button>
            </motion.div>
          </div>
        </div>

        {/* Bottom accent line */}
        <div className="absolute bottom-0 inset-x-0 h-1 bg-gradient-to-r from-[hsl(27,90%,52%)] via-[hsl(27,90%,52%)]/60 to-transparent z-20" />
      </section>




      {/* ── Features — Warm light section ── */}
      <section id="features" className="py-24 md:py-32 bg-[hsl(30,20%,97%)] relative">
        {/* Subtle texture */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, hsl(209,69%,18%) 1px, transparent 0)`,
          backgroundSize: "24px 24px",
        }} />

        <div className="relative max-w-[1400px] mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="text-center mb-16"
          >
            <motion.p variants={fadeUp} custom={0} className="text-sm font-semibold uppercase tracking-widest text-[hsl(27,90%,52%)]">
              Platform Capabilities
            </motion.p>
            <motion.h2 variants={fadeUp} custom={1} className="mt-3 text-3xl md:text-4xl font-bold text-[hsl(209,69%,18%)]">
              End-to-End Skills Development Infrastructure
            </motion.h2>
            <motion.p variants={fadeUp} custom={2} className="mt-4 text-[hsl(209,20%,46%)] max-w-2xl mx-auto text-lg">
              From curriculum design to blockchain-verified credentials, Intela SkillChain covers the entire learning lifecycle with built-in compliance and governance.
            </motion.p>
          </motion.div>

          {/* Hero Feature — Programme Builder gets spotlight */}
          {(() => {
            const HeroIcon = features[0].icon;
            return (
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-50px" }}
                variants={fadeUp}
                custom={0}
                className="mb-10"
              >
                <div className="group relative overflow-hidden bg-gradient-to-br from-[hsl(209,69%,18%)] to-[hsl(209,69%,28%)] p-10 md:p-14 flex flex-col md:flex-row items-start gap-8 hover:shadow-2xl transition-all duration-500">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-[hsl(27,90%,52%)]/10 rounded-full translate-x-1/3 -translate-y-1/3 blur-2xl" />
                  <div className="absolute bottom-0 left-0 w-48 h-48 bg-[hsl(27,90%,52%)]/5 rounded-full -translate-x-1/4 translate-y-1/4 blur-xl" />
                  
                  <div className="relative shrink-0">
                    <div className="h-16 w-16 bg-[hsl(27,90%,52%)] flex items-center justify-center">
                      <HeroIcon className="h-8 w-8 text-white" />
                    </div>
                    <span className="absolute -top-2 -left-2 text-[64px] font-black text-white/[0.06] leading-none select-none">01</span>
                  </div>
                  
                  <div className="relative flex-1">
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[hsl(27,90%,52%)] mb-2 block">Core Module</span>
                    <h3 className="text-2xl md:text-3xl font-bold text-white mb-3">{features[0].title}</h3>
                    <p className="text-white/70 text-base leading-relaxed max-w-xl">{features[0].desc}</p>
                  </div>
                </div>
              </motion.div>
            );
          })()}

          {/* Remaining features in creative grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-[hsl(209,69%,18%)]/8">
            {features.slice(1).map((f, i) => {
              const num = String(i + 2).padStart(2, "0");
              const Icon = f.icon;
              return (
                <motion.div
                  key={f.title}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-50px" }}
                  variants={fadeUp}
                  custom={i + 1}
                  className="group relative bg-white p-8 hover:bg-[hsl(27,90%,52%)]/[0.02] transition-all duration-500 overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-[hsl(27,90%,52%)] to-[hsl(27,90%,52%)]/0 scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-500" />
                  
                  <span className="absolute -right-2 -top-4 text-[80px] font-black text-[hsl(209,69%,18%)]/[0.03] leading-none select-none group-hover:text-[hsl(27,90%,52%)]/[0.06] transition-colors duration-500">
                    {num}
                  </span>

                  <div className="relative">
                    <div className="h-11 w-11 bg-gradient-to-br from-[hsl(27,90%,52%)]/10 to-[hsl(27,90%,52%)]/5 flex items-center justify-center mb-5 group-hover:from-[hsl(27,90%,52%)]/20 group-hover:to-[hsl(27,90%,52%)]/10 transition-all duration-300">
                      <Icon className="h-5 w-5 text-[hsl(27,90%,52%)]" />
                    </div>
                    
                    <h3 className="text-base font-bold text-[hsl(209,69%,18%)] mb-2 group-hover:text-[hsl(209,69%,14%)] transition-colors">
                      {f.title}
                    </h3>
                    <p className="text-[hsl(209,20%,46%)] text-sm leading-relaxed">
                      {f.desc}
                    </p>
                  </div>

                  <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all duration-300">
                    <ArrowRight className="h-4 w-4 text-[hsl(27,90%,52%)]" />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── How It Works — Creative light section ── */}
      <section id="how-it-works" className="py-24 md:py-32 bg-[hsl(0,0%,90%)] relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-0 left-0 w-72 h-72 bg-[hsl(27,90%,52%)]/[0.04] rounded-full -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-[hsl(209,69%,18%)]/[0.03] rounded-full translate-x-1/3 translate-y-1/3" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] opacity-[0.015]" style={{
          backgroundImage: `conic-gradient(from 0deg, hsl(27,90%,52%), hsl(209,69%,18%), hsl(27,90%,52%))`,
          borderRadius: "50%",
          filter: "blur(80px)",
        }} />

        <div className="relative max-w-[1400px] mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <motion.p variants={fadeUp} custom={0} className="text-sm font-semibold uppercase tracking-widest text-[hsl(27,90%,52%)]">
              Simple Process
            </motion.p>
            <motion.h2 variants={fadeUp} custom={1} className="mt-3 text-3xl md:text-4xl font-bold text-[hsl(209,69%,18%)]">
              From Setup to Certification in 4 Steps
            </motion.h2>
          </motion.div>

          <div className="grid md:grid-cols-4 gap-0 relative">
            {/* Connector line */}
            <div className="hidden md:block absolute top-12 left-[12.5%] right-[12.5%] h-[2px]">
              <div className="w-full h-full bg-gradient-to-r from-[hsl(27,90%,52%)]/20 via-[hsl(27,90%,52%)]/40 to-[hsl(27,90%,52%)]/20" />
              <motion.div
                className="absolute top-[-3px] left-0 w-2 h-2 rounded-full bg-[hsl(27,90%,52%)]"
                animate={{ left: ["0%", "100%"] }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              />
            </div>

            {[
              { step: "01", title: "Build & Configure", desc: "Use the Programme Builder to create SAQA-aligned curricula with modules, content blocks, and assessment rules.", icon: BookOpen },
              { step: "02", title: "Onboard & Enrol", desc: "Register learners via self-service, sponsor linking, or bulk import. Verify documents and assign to cohorts.", icon: Users },
              { step: "03", title: "Deliver & Assess", desc: "Facilitators run sessions, assessors grade submissions, and moderators quality-assure through structured workflows.", icon: ClipboardCheck },
              { step: "04", title: "Certify & Report", desc: "Issue blockchain-verified digital credentials and generate compliance reports for SETAs, sponsors, and stakeholders.", icon: Award },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i + 1}
                className="text-center relative px-4 group"
              >
                <div className="relative z-10 mx-auto mb-6">
                  <div className="h-24 w-24 mx-auto rounded-2xl bg-gradient-to-br from-[hsl(30,20%,97%)] to-white border border-[hsl(209,69%,18%)]/8 flex flex-col items-center justify-center shadow-lg shadow-[hsl(209,69%,18%)]/5 group-hover:shadow-xl group-hover:shadow-[hsl(27,90%,52%)]/10 group-hover:border-[hsl(27,90%,52%)]/30 transition-all duration-500 group-hover:-translate-y-1">
                    <item.icon className="h-7 w-7 text-[hsl(27,90%,52%)] mb-1" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[hsl(209,69%,18%)]/40">Step {item.step}</span>
                  </div>
                  <div className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-gradient-to-br from-[hsl(27,90%,52%)] to-[hsl(20,90%,45%)] flex items-center justify-center text-[10px] font-bold text-white shadow-md">
                    {item.step}
                  </div>
                </div>
                <h3 className="font-bold text-[hsl(209,69%,18%)] mb-2 text-base">{item.title}</h3>
                <p className="text-sm text-[hsl(209,20%,46%)] leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Who It's For — Light warm ── */}
      <section id="roles" className="py-24 md:py-32 bg-[hsl(30,20%,97%)] relative">
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, hsl(209,69%,18%) 1px, transparent 0)`,
          backgroundSize: "24px 24px",
        }} />

        <div className="relative max-w-[1400px] mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <motion.p variants={fadeUp} custom={0} className="text-sm font-semibold uppercase tracking-widest text-[hsl(27,90%,52%)]">
              11+ Role-Based Portals
            </motion.p>
            <motion.h2 variants={fadeUp} custom={1} className="mt-3 text-3xl md:text-4xl font-bold text-[hsl(209,69%,18%)]">
              A Dedicated Portal for Every Stakeholder
            </motion.h2>
            <motion.p variants={fadeUp} custom={2} className="mt-4 text-[hsl(209,20%,46%)] max-w-2xl mx-auto text-lg">
              Each role gets a tailored dashboard, navigation, and toolset. From super admins configuring the platform to learners earning credentials.
            </motion.p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {roles.map((r, i) => (
              <motion.div
                key={r.name}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i}
                className="flex items-start gap-4 rounded-xl border border-[hsl(209,69%,18%)]/8 bg-white p-5 hover:border-[hsl(27,90%,52%)]/30 hover:shadow-lg hover:shadow-[hsl(27,90%,52%)]/5 transition-all duration-300"
              >
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-[hsl(27,90%,52%)]/10 to-[hsl(27,90%,52%)]/5 flex items-center justify-center flex-shrink-0">
                  <r.icon className="h-5 w-5 text-[hsl(27,90%,52%)]" />
                </div>
                <div>
                  <h3 className="font-semibold text-[hsl(209,69%,18%)]">{r.name}</h3>
                  <p className="text-sm text-[hsl(209,20%,46%)] mt-0.5">{r.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trust / Compliance Strip — Dark accent ── */}
      <section id="compliance" className="py-16 bg-[hsl(209,69%,10%)] border-y border-white/5">
        <div className="max-w-[1400px] mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16 text-sm font-medium text-white/50">
            {[
              "PoPIA & GDPR Compliant",
              "SAQA & QCTO Aligned",
              "Blockchain-Verified Credentials",
              "Multi-Tenant Isolation",
              "Full Audit Trail",
            ].map((t) => (
              <div key={t} className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[hsl(27,90%,52%)]" />
                <span>{t}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Contact Section ── */}
      <section id="contact" className="py-20 md:py-28 bg-[hsl(220,20%,96%)]">
        <div className="max-w-[1400px] mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <motion.h2 variants={fadeUp} custom={0} className="text-3xl md:text-4xl font-bold text-[hsl(209,69%,18%)]">
              Intela doesn't just{" "}
              <br className="hidden sm:block" />
              <span className="text-[hsl(27,90%,52%)]">deliver training.</span>
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="mt-4 text-[hsl(209,20%,46%)] max-w-xl mx-auto">
              We simulate work, validate skills, and ensure compliance. The result? Faster
              employment outcomes at national scale.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={2}
            className="grid lg:grid-cols-[1fr_340px] gap-0 rounded-xl overflow-hidden shadow-xl shadow-[hsl(209,69%,18%)]/8"
          >
            {/* Contact Form */}
            <div className="bg-white p-8 flex flex-col">
              <h3 className="text-lg font-bold text-[hsl(209,69%,18%)] mb-1">Send Us a Message</h3>
              <p className="text-sm text-[hsl(27,90%,52%)] mb-6">We'll get back to you within 24 hours.</p>

              <form className="flex-1 flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
                <div className="grid grid-cols-2 gap-4">
                  <input type="text" placeholder="First Name" className="w-full px-4 py-3 text-sm rounded-lg border border-[hsl(209,69%,18%)]/10 bg-white text-[hsl(209,69%,18%)] placeholder:text-[hsl(209,20%,46%)]/50 focus:outline-none focus:ring-2 focus:ring-[hsl(27,90%,52%)]/30 focus:border-[hsl(27,90%,52%)]/50 transition-all" />
                  <input type="text" placeholder="Last Name" className="w-full px-4 py-3 text-sm rounded-lg border border-[hsl(209,69%,18%)]/10 bg-white text-[hsl(209,69%,18%)] placeholder:text-[hsl(209,20%,46%)]/50 focus:outline-none focus:ring-2 focus:ring-[hsl(27,90%,52%)]/30 focus:border-[hsl(27,90%,52%)]/50 transition-all" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <input type="email" placeholder="Email Address" className="w-full px-4 py-3 text-sm rounded-lg border border-[hsl(209,69%,18%)]/10 bg-white text-[hsl(209,69%,18%)] placeholder:text-[hsl(209,20%,46%)]/50 focus:outline-none focus:ring-2 focus:ring-[hsl(27,90%,52%)]/30 focus:border-[hsl(27,90%,52%)]/50 transition-all" />
                  <input type="text" placeholder="Organisation / Company" className="w-full px-4 py-3 text-sm rounded-lg border border-[hsl(209,69%,18%)]/10 bg-white text-[hsl(209,69%,18%)] placeholder:text-[hsl(209,20%,46%)]/50 focus:outline-none focus:ring-2 focus:ring-[hsl(27,90%,52%)]/30 focus:border-[hsl(27,90%,52%)]/50 transition-all" />
                </div>
                <select className="w-full px-4 py-3 text-sm rounded-lg border border-[hsl(209,69%,18%)]/10 bg-white text-[hsl(209,20%,46%)]/50 focus:outline-none focus:ring-2 focus:ring-[hsl(27,90%,52%)]/30 focus:border-[hsl(27,90%,52%)]/50 transition-all">
                  <option value="">Select Inquiry Type</option>
                  <option>General Inquiry</option>
                  <option>Demo Request</option>
                  <option>Partnership</option>
                  <option>Support</option>
                </select>
                <textarea placeholder="Your Message" className="w-full px-4 py-3 text-sm rounded-lg border border-[hsl(209,69%,18%)]/10 bg-white text-[hsl(209,69%,18%)] placeholder:text-[hsl(209,20%,46%)]/50 focus:outline-none focus:ring-2 focus:ring-[hsl(27,90%,52%)]/30 focus:border-[hsl(27,90%,52%)]/50 transition-all resize-none flex-1 min-h-[100px]" />
                <Button className="w-full bg-[hsl(209,50%,18%)] hover:bg-[hsl(209,50%,22%)] text-white h-12 text-sm font-semibold rounded-lg mt-auto">
                  Send Message <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </form>
            </div>

            {/* Contact Info Card — stretches to match form */}
            <div className="bg-[hsl(209,50%,18%)] p-8 text-white flex flex-col justify-center border-l-4 border-[hsl(27,90%,52%)]">
              <h3 className="text-base font-bold mb-10">Contact Information</h3>

              <div className="space-y-8">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                    <Mail className="h-4 w-4 text-[hsl(27,90%,52%)]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Email Us</p>
                    <p className="text-xs text-white/50 mt-0.5">info@intelaskillchain.co.za</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                    <Phone className="h-4 w-4 text-[hsl(27,90%,52%)]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Call Us</p>
                    <p className="text-xs text-white/50 mt-0.5">+27 11 559 1234</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                    <Clock className="h-4 w-4 text-[hsl(27,90%,52%)]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Support Hours</p>
                    <p className="text-xs text-white/50 mt-0.5">Monday – Friday, 08:00 – 17:00 SAST</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Footer — Deep dark ── */}
      <footer className="bg-[hsl(209,69%,6%)] border-t border-white/5">
        <div className="max-w-[1400px] mx-auto px-6 py-12">
          <div className="grid md:grid-cols-4 gap-10">
            <div className="md:col-span-1">
              <div className="flex items-center gap-2.5 mb-4">
                {footerLogo ? (
                  <img src={footerLogo} alt="Intela SkillChain logo" className="h-8 object-contain" style={{ maxWidth: `${footerLogoWidth}px` }} />
                ) : (
                  <>
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[hsl(27,90%,52%)] to-[hsl(20,90%,45%)] flex items-center justify-center">
                      <GraduationCap className="h-4 w-4 text-white" />
                    </div>
                    <span className="font-bold text-white">Intela SkillChain</span>
                  </>
                )}
              </div>
              <p className="text-sm text-white/40 leading-relaxed">
                End-to-end skills development and compliance management for Africa and beyond.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-white/80 text-sm mb-3">Platform</h4>
              <ul className="space-y-2 text-sm text-white/40">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a></li>
                <li><a href="#roles" className="hover:text-white transition-colors">Who It's For</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white/80 text-sm mb-3">Legal</h4>
              <ul className="space-y-2 text-sm text-white/40">
                <li><Link to="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><a href="mailto:privacy@intelaskillchain.co.za" className="hover:text-white transition-colors">Data Requests</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white/80 text-sm mb-3">Contact</h4>
              <ul className="space-y-2 text-sm text-white/40">
                <li><a href="mailto:info@intelaskillchain.co.za" className="hover:text-white transition-colors">info@intelaskillchain.co.za</a></li>
                <li><a href="https://intelaskillchain.co.za" className="hover:text-white transition-colors">intelaskillchain.co.za</a></li>
              </ul>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/30">
            <p>© {new Date().getFullYear()} Intela SkillChain (Pty) Ltd. All rights reserved.</p>
            <p>Built in South Africa 🇿🇦</p>
          </div>
        </div>
      </footer>
      <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
    </div>
  );
}
