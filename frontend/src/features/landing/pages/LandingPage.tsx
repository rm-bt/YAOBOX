import {
  ArrowRight,
  Bell,
  Brain,
  Camera,
  CheckCircle2,
  ChevronRight,
  FileText,
  History,
  Languages,
  Menu,
  ShieldCheck,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { ThemeToggle } from "../../../components/ThemeToggle";

const Logo = ({
  className = "h-10",
  showTagline = false,
}: {
  className?: string;
  showTagline?: boolean;
}) => (
  <div className={`flex flex-col ${className}`}>
    <div className="flex items-center gap-3">
      <div className="relative flex h-10 w-10 items-center justify-center">
        <div className="absolute left-0 top-0 h-3 w-3 rounded-tl-sm border-l-4 border-t-4 border-[#3D4B31]" />
        <div className="absolute right-0 top-0 h-3 w-3 rounded-tr-sm border-r-4 border-t-4 border-[#3D4B31]" />
        <div className="absolute bottom-0 left-0 h-3 w-3 rounded-bl-sm border-b-4 border-l-4 border-[#3D4B31]" />
        <div className="absolute bottom-0 right-0 h-3 w-3 rounded-br-sm border-b-4 border-r-4 border-[#3D4B31]" />

        <div className="relative flex h-6 w-6 rotate-[-45deg] flex-col items-center justify-center">
          <div className="h-3 w-4 rounded-t-full bg-[#B72119] shadow-sm" />
          <div className="h-3 w-4 rounded-b-full border-t border-black/5 bg-white" />
        </div>
      </div>

      <span className="text-4xl font-bold lowercase tracking-tighter text-[#191C1A]">
        yaobox
      </span>
    </div>

    {showTagline ? (
      <span className="ml-[52px] mt-1 whitespace-nowrap text-[11px] font-medium tracking-tight text-[#3D4B31]">
        Scan, translate, save, and manage medicine information
      </span>
    ) : null}
  </div>
);

const NAV_ITEMS = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Safety", href: "#safety" },
  { label: "Support", href: "#support" },
];

function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed top-0 z-50 w-full border-b border-brand-primary/5 bg-brand-surface/80 backdrop-blur-md">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
        <Link to="/" aria-label="Go to Yaobox landing page">
          <Logo className="h-10 origin-left scale-75 transform md:scale-90" />
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-brand-muted transition-colors hover:text-brand-primary"
            >
              {item.label}
            </a>
          ))}

          <ThemeToggle compact />

          <Link
            to="/register"
            className="pill-button bg-brand-secondary text-white shadow-md hover:bg-brand-secondary/90"
          >
            Get Started
          </Link>
        </div>

        <button
          type="button"
          className="md:hidden"
          onClick={() => setIsOpen((value) => !value)}
          aria-label="Toggle navigation menu"
        >
          {isOpen ? <X /> : <Menu />}
        </button>
      </div>

      <AnimatePresence>
        {isOpen ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden border-b border-brand-primary/5 bg-white md:hidden"
          >
            <div className="flex flex-col gap-6 px-6 py-8">
              {NAV_ITEMS.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className="text-lg font-medium text-brand-muted"
                >
                  {item.label}
                </a>
              ))}

              <Link
                to="/register"
                className="pill-button w-full bg-brand-secondary text-center text-white"
              >
                Get Started
              </Link>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </nav>
  );
}

function Hero() {
  return (
    <section className="overflow-hidden px-6 pb-20 pt-32">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-16 lg:flex-row">
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex-1 text-center lg:text-left"
        >
          <div className="mb-8 inline-flex items-center gap-2 rounded-full bg-brand-light/50 px-4 py-1.5 text-sm font-medium text-brand-primary">
            <CheckCircle2 className="h-4 w-4" />
            Built for medicine understanding, not diagnosis
          </div>

          <h1 className="mb-6 max-w-4xl text-5xl font-bold leading-[1.05] tracking-tight text-brand-ink lg:text-7xl">
            Understand Chinese medicine information with{" "}
            <span className="text-brand-primary">clear English support</span>
          </h1>

          <p className="mx-auto mb-10 max-w-2xl text-xl leading-relaxed text-brand-muted lg:mx-0">
            Scan medicine packages, prescriptions, or reports. YAOBOX extracts
            text, translates key information, explains it simply, saves scan
            history, and helps create medication reminders.
          </p>

          <div className="flex flex-col justify-center gap-4 sm:flex-row lg:justify-start">
            <Link
              to="/register"
              className="pill-button group flex items-center justify-center gap-2 bg-brand-primary text-lg text-white shadow-xl shadow-brand-primary/20"
            >
              <Camera className="h-5 w-5" />
              Start Your First Scan
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>

            <a
              href="#how-it-works"
              className="pill-button border-2 border-brand-secondary text-center text-lg font-semibold text-brand-secondary hover:bg-brand-secondary/5"
            >
              See how it works
            </a>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.8, rotate: 5 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="group relative flex-1"
        >
          <div className="relative overflow-hidden rounded-[3rem] border-8 border-white shadow-2xl transition-transform duration-500 group-hover:scale-[1.02]">
            <img
              src="/landing-hero.jpg"
              alt="YAOBOX medicine scanning preview"
              className="aspect-square w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-brand-primary/40 via-transparent to-transparent" />
            <div className="absolute bottom-8 left-8 right-8 rounded-2xl border border-white/20 bg-white/30 p-6 backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
                <span className="text-sm font-medium text-white">
                  OCR and AI explanation require user review
                </span>
              </div>
            </div>
          </div>

          <div className="absolute -right-10 -top-10 -z-10 h-40 w-40 rounded-full bg-brand-light opacity-50 blur-3xl" />
          <div className="absolute -bottom-10 -left-10 -z-10 h-64 w-64 rounded-full bg-brand-primary/10 opacity-50 blur-3xl" />
        </motion.div>
      </div>
    </section>
  );
}

function Steps() {
  const steps = [
    {
      icon: <Camera className="h-8 w-8" />,
      title: "1. Scan or upload",
      desc: "Upload a medicine package, prescription, or report image for OCR processing.",
    },
    {
      icon: <Languages className="h-8 w-8" />,
      title: "2. Translate and explain",
      desc: "The system extracts text and provides a simple English explanation while keeping OCR uncertainty visible.",
    },
    {
      icon: <History className="h-8 w-8" />,
      title: "3. Save and manage",
      desc: "Review scan history, create reminders, and revisit saved medicine information later.",
    },
  ];

  return (
    <section id="how-it-works" className="bg-white py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-20 text-center">
          <h2 className="mb-4 text-4xl font-bold text-brand-ink">
            Three steps to safer understanding
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-brand-muted">
            YAOBOX keeps the flow simple while avoiding fake medical certainty.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-12 md:grid-cols-3">
          {steps.map((step) => (
            <motion.div
              key={step.title}
              whileHover={{ y: -10 }}
              className="group relative"
            >
              <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-light/50 text-brand-primary transition-all duration-300 group-hover:scale-110 group-hover:bg-brand-primary group-hover:text-white">
                {step.icon}
              </div>
              <h3 className="mb-4 text-2xl font-bold text-brand-ink">
                {step.title}
              </h3>
              <p className="text-lg leading-relaxed text-brand-muted">
                {step.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Features() {
  const featureCards = [
    {
      icon: <Brain className="h-7 w-7" />,
      title: "Trust-aware AI explanation",
      desc: "AI helps explain extracted medicine information, but the app does not claim diagnosis, treatment decisions, or guaranteed accuracy.",
    },
    {
      icon: <Bell className="h-7 w-7" />,
      title: "Medication reminders",
      desc: "Create reminders from scan results or manually. Browser notifications can alert users while the app is open and permission is enabled.",
    },
    {
      icon: <History className="h-7 w-7" />,
      title: "Scan history",
      desc: "Saved scans keep medicine name, source type, OCR text, AI explanation, warnings, confidence, and trust notes visible.",
    },
    {
      icon: <FileText className="h-7 w-7" />,
      title: "Prescription and report OCR",
      desc: "Prescription/report uploads are processed as OCR records, with extracted text and explanation available for review.",
    },
  ];

  return (
    <section id="features" className="px-6 py-24">
      <div className="mx-auto max-w-7xl">
        <div className="mb-16 flex flex-col items-end justify-between gap-6 md:flex-row">
          <div className="max-w-2xl">
            <h2 className="mb-4 text-4xl font-bold tracking-tight text-brand-ink">
              Features that match the actual system
            </h2>
            <p className="text-lg text-brand-muted">
              No fake healthcare-provider claims. No fake perfect translation.
              No fake clinical guarantees.
            </p>
          </div>

          <Link
            to="/register"
            className="group flex items-center gap-2 font-semibold text-brand-primary"
          >
            Try the app
            <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {featureCards.map((feature) => (
            <motion.div
              key={feature.title}
              whileHover={{ y: -4 }}
              className="rounded-[2rem] border border-brand-primary/5 bg-white p-10 shadow-sm"
            >
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-brand-light/40 text-brand-primary">
                {feature.icon}
              </div>
              <h3 className="mb-4 text-2xl font-bold text-brand-ink">
                {feature.title}
              </h3>
              <p className="text-lg leading-relaxed text-brand-muted">
                {feature.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Safety() {
  return (
    <section id="safety" className="bg-white px-6 py-24">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-[3rem] border border-brand-primary/10 bg-brand-light/20 p-10 lg:p-16">
          <div className="flex flex-col gap-10 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-brand-primary">
                <ShieldCheck className="h-4 w-4" />
                Safety boundary
              </div>

              <h2 className="mb-6 text-4xl font-bold text-brand-ink">
                YAOBOX explains medicine information. It does not replace a
                professional.
              </h2>

              <p className="text-lg leading-relaxed text-brand-muted">
                OCR can be incomplete. AI can be wrong. Verified catalog data,
                extracted OCR text, and AI explanation must stay visibly separate
                so users know what they are looking at.
              </p>
            </div>

            <div className="rounded-[2rem] bg-white p-6 shadow-sm lg:w-[340px]">
              <p className="mb-4 text-sm font-bold uppercase tracking-[0.18em] text-brand-primary">
                Use YAOBOX for
              </p>
              <ul className="space-y-3 text-sm font-medium text-brand-muted">
                <li>• Understanding labels and scan text</li>
                <li>• Saving medicine-related records</li>
                <li>• Creating reminders</li>
                <li>• Preparing questions for a pharmacist or doctor</li>
              </ul>
              <p className="mt-6 text-sm font-bold text-brand-ink">
                Do not use it for emergency decisions, diagnosis, or changing
                prescribed treatment.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section id="support" className="px-6 py-24">
      <div className="mx-auto max-w-7xl">
        <motion.div
          whileInView={{ scale: [0.95, 1], opacity: [0, 1] }}
          className="relative overflow-hidden rounded-[3rem] bg-brand-primary p-16 text-center shadow-2xl shadow-brand-primary/20"
        >
          <div className="relative z-10">
            <h2 className="mx-auto mb-8 max-w-3xl text-4xl font-bold leading-tight text-white lg:text-5xl">
              Start with one scan and review the result carefully.
            </h2>
            <p className="mx-auto mb-12 max-w-2xl text-xl text-brand-light/80">
              Use YAOBOX to understand and organize medicine information. Confirm
              important health decisions with a doctor or pharmacist.
            </p>
            <Link
              to="/register"
              className="pill-button bg-white px-10 py-5 text-xl font-bold text-brand-primary shadow-2xl shadow-white/10 transition-transform hover:scale-105"
            >
              Create Account
            </Link>
          </div>

          <div className="absolute right-0 top-0 h-64 w-64 translate-x-1/2 -translate-y-1/2 rounded-full bg-white/5 blur-2xl" />
          <div className="absolute bottom-0 left-0 h-96 w-96 -translate-x-1/2 translate-y-1/2 rounded-full bg-black/5 blur-3xl" />
        </motion.div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-brand-primary/5 bg-white px-6 py-16">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 flex flex-col items-center justify-between gap-12 md:flex-row">
          <Logo
            className="origin-center scale-90 transform md:origin-left md:scale-100"
            showTagline
          />

          <div className="flex flex-wrap justify-center gap-8 text-xs font-bold uppercase tracking-widest text-brand-muted">
            <span>OCR requires review</span>
            <span>AI explanation is not medical advice</span>
            <span>Confirm with professionals</span>
          </div>
        </div>

        <div className="border-t border-brand-primary/5 pt-12 text-center text-[10px] font-medium uppercase tracking-[0.5em] text-brand-muted/40">
          Designed for medicine understanding and safer information review.
        </div>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden font-sans selection:bg-brand-light">
      <Navbar />
      <Hero />
      <Steps />
      <Features />
      <Safety />
      <CTA />
      <Footer />
    </div>
  );
}