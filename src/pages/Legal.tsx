import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import BrandLogo from "@/components/BrandLogo";

const Logo = () => (
  <Link to="/" className="flex items-center gap-2">
    <BrandLogo inverse markClassName="h-7 w-7" textClassName="text-lg" />
  </Link>
);

const Shell = ({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) => (
  <div className="min-h-screen" style={{ background: "#07080f" }}>
    <header className="sticky top-0 z-30 border-b" style={{ background: "rgba(7,8,15,0.85)", backdropFilter: "blur(20px)", borderColor: "#1a2035" }}>
      <div className="max-w-4xl mx-auto h-16 px-6 flex items-center justify-between">
        <Logo />
        <Link to="/" className="text-sm flex items-center gap-2 hover:text-[#00e5a0]" style={{ color: "#8892a4" }}>
          <ArrowLeft className="w-4 h-4" /> Back to home
        </Link>
      </div>
    </header>
    <motion.main initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
      className="max-w-4xl mx-auto px-6 py-16">
      <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">{title}</h1>
      <div className="mt-2 text-sm" style={{ color: "#8892a4" }}>Last updated: {updated}</div>
      <div className="mt-10 space-y-8 text-[15px] leading-relaxed" style={{ color: "#cbd5e1" }}>
        {children}
      </div>
    </motion.main>
  </div>
);

const H = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-xl font-bold text-white mt-8 mb-3">{children}</h2>
);

export const PrivacyPolicy = () => (
  <Shell title="Privacy Policy" updated="June 25, 2026">
    <p>HireZap ("we", "us") provides AI-powered recruitment tooling for companies and candidates. This policy explains what we collect, how we use it, and your rights.</p>
    <H>What data we collect</H>
    <p>Account information (name, email, phone), resume content, assessment responses, video introductions, technical and group-discussion recordings, application status, and basic device/usage telemetry.</p>
    <H>How we store and protect it</H>
    <p>Data is stored on managed cloud infrastructure with encryption in transit and at rest. Access is restricted to authorized roles via row-level security and audited service accounts.</p>
    <H>Who we share it with</H>
    <p>We do not sell your data. Company-side staff in your applied company see your application data per role permissions. We use a small set of subprocessors (cloud hosting, AI inference) bound by data-protection terms.</p>
    <H>Candidate right to delete data</H>
    <p>You may request deletion of your account and associated assessment media at any time by emailing privacy@hirezap.com. Hiring records may be retained in anonymized form for legal compliance.</p>
    <H>Contact us</H>
    <p>Questions? Email privacy@hirezap.com.</p>
  </Shell>
);

export const TermsOfService = () => (
  <Shell title="Terms of Service" updated="June 25, 2026">
    <H>Acceptable use</H>
    <p>You agree not to misuse the platform, attempt to bypass anti-cheat systems, scrape data, or impersonate others. Companies must obtain candidate consent before assessing them.</p>
    <H>Company subscription terms</H>
    <p>Paid plans are billed monthly or annually in advance. Subscriptions auto-renew until cancelled from your billing settings.</p>
    <H>Refund conditions</H>
    <p>See our Refund Policy.</p>
    <H>Liability limitations</H>
    <p>HireZap provides decision-support tooling. Hiring decisions are made by your team. To the maximum extent permitted by law, our aggregate liability is limited to the fees you paid in the prior 12 months.</p>
    <H>Governing law</H>
    <p>These terms are governed by the laws of India. Disputes are subject to the courts of Bengaluru, Karnataka.</p>
  </Shell>
);

export const CookiePolicy = () => (
  <Shell title="Cookie Policy" updated="June 25, 2026">
    <H>What cookies we use</H>
    <p>We use essential cookies for authentication and session management, and limited analytics cookies to understand platform usage in aggregate. No third-party advertising cookies are used.</p>
    <H>How to disable them</H>
    <p>You can clear or block cookies in your browser settings. Note that essential cookies are required for sign-in and platform functionality.</p>
  </Shell>
);

export const RefundPolicy = () => (
  <Shell title="Refund Policy" updated="June 25, 2026">
    <H>30 day refund for annual plans</H>
    <p>Annual subscriptions are eligible for a full refund within 30 days of purchase.</p>
    <H>No refund for monthly after 7 days</H>
    <p>Monthly subscriptions are refundable within the first 7 days; after that they are non-refundable but you can cancel anytime to stop the next renewal.</p>
    <H>How to request a refund</H>
    <p>Email billing@hirezap.com from your account email with your invoice ID. Refunds are processed to the original payment method within 7–10 business days.</p>
  </Shell>
);
