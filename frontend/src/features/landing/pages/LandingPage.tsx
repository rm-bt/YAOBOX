import {
  Camera,
  Languages,
  CheckCircle2,
  Brain,
  Bell,
  History,
  ShieldCheck,
  ArrowRight,
  X,
  Menu,
  ChevronRight,
  Globe,
  Share2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useState } from "react";
import { Link } from "react-router-dom";

const Logo = ({
  className = "h-10",
  showTagline = false
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
        Scan, Translate, and Track Your Medicine
      </span>
    ) : null}
  </div>
);

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  const navItems = ["Features", "How it Works", "Pricing", "Support"];

  return (
    <nav className="fixed top-0 z-50 w-full border-b border-brand-primary/5 bg-brand-surface/80 backdrop-blur-md">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
        <Link to="/">
          <Logo className="h-10 origin-left scale-75 transform md:scale-90" />
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {navItems.map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase().replace(/\s+/g, "-")}`}
              className="text-sm font-medium text-brand-muted transition-colors hover:text-brand-primary"
            >
              {item}
            </a>
          ))}

          <Link
            to="/register"
            className="pill-button bg-brand-secondary text-white shadow-md hover:bg-brand-secondary/90"
          >
            Get Started
          </Link>
        </div>

        <button className="md:hidden" onClick={() => setIsOpen(!isOpen)}>
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
              {navItems.map((item) => (
                <a
                  key={item}
                  href={`#${item.toLowerCase().replace(/\s+/g, "-")}`}
                  className="text-lg font-medium text-brand-muted"
                >
                  {item}
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
};

const Hero = () => {
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
            Trusted by 10k+ healthcare providers
          </div>

          <h1 className="mb-6 max-w-4xl text-5xl font-bold leading-[1.05] tracking-tight text-brand-ink lg:text-7xl">
            Bridging the Language Gap in{" "}
            <span className="text-brand-primary">Healthcare</span>
          </h1>

          <p className="mx-auto mb-10 max-w-2xl text-xl leading-relaxed text-brand-muted lg:mx-0">
            Instant AI translation and smart scanning for medicine packages and
            medical reports. Keep your family informed and safe with
            medically-trained intelligence.
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
              Watch Demo
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
                  AI Analysis in Progress...
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
};

const Steps = () => {
  const steps = [
    {
      icon: <Camera className="h-8 w-8" />,
      title: "1. Scan",
      desc: "Point your camera at any medicine packaging, instruction leaflet, or medical report."
    },
    {
      icon: <Languages className="h-8 w-8" />,
      title: "2. Translate",
      desc: "Our specialized AI deciphers complex medical terminology and dosage instructions instantly."
    },
    {
      icon: <CheckCircle2 className="h-8 w-8" />,
      title: "3. Manage",
      desc: "Save translations, set smart reminders, and keep a digital history for your doctor visits."
    }
  ];

  return (
    <section id="how-it-works" className="bg-white py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-20 text-center">
          <h2 className="mb-4 text-4xl font-bold text-brand-ink">
            Three Steps to Clarity
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-brand-muted">
            Simple, fast, and medically precise translation at your fingertips.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-12 md:grid-cols-3">
          {steps.map((step, idx) => (
            <motion.div
              key={idx}
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
};

const Features = () => {
  return (
    <section id="features" className="px-6 py-24">
      <div className="mx-auto max-w-7xl">
        <div className="mb-16 flex flex-col items-end justify-between gap-6 md:flex-row">
          <div className="max-w-2xl">
            <h2 className="mb-4 text-4xl font-bold tracking-tight text-brand-ink">
              Designed for Your Wellbeing
            </h2>
            <p className="text-lg text-brand-muted">
              Beyond translation, Yaobox is your intelligent pharmaceutical
              companion.
            </p>
          </div>

          <button className="group flex items-center gap-2 font-semibold text-brand-primary">
            View All Features
            <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
          <div className="group overflow-hidden rounded-[2rem] border border-brand-primary/5 bg-white p-12 md:col-span-8">
            <div className="flex flex-col items-center gap-12 lg:flex-row">
              <div className="z-10 flex-1">
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-light/40 text-brand-primary">
                  <Brain className="h-6 w-6" />
                </div>
                <h3 className="mb-6 text-3xl font-bold text-brand-ink">
                  AI Precision Medical Engine
                </h3>
                <p className="text-lg leading-relaxed text-brand-muted">
                  Unlike generic translators, our AI is trained specifically on
                  medical databases and pharmaceutical glossaries, ensuring zero
                  misinterpretation of ingredients or dosages.
                </p>
              </div>

              <div className="relative aspect-square w-full overflow-hidden rounded-2xl shadow-xl lg:w-72">
                <img
                  src="https://images.unsplash.com/photo-1559757175-5700dde675bc?auto=format&fit=crop&q=80&w=1000"
                  alt="Neural Network"
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-brand-primary/10 mix-blend-multiply" />
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[2rem] bg-brand-light/30 p-10 md:col-span-4">
            <div>
              <Bell className="mb-6 h-10 w-10 text-brand-primary" />
              <h3 className="mb-4 text-2xl font-bold text-brand-ink">
                Smart Reminders
              </h3>
              <p className="leading-relaxed text-brand-muted">
                Automatic schedule generation based on scanned dosages. Never
                miss a vital dose again.
              </p>
            </div>

            <div className="mt-8 translate-y-2 rounded-2xl border border-brand-primary/5 border-white/50 bg-white/60 p-6 shadow-sm backdrop-blur-md">
              <div className="mb-3 flex items-center gap-3">
                <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
                <span className="text-sm font-bold uppercase tracking-wider text-brand-ink">
                  Upcoming: 09:00 AM
                </span>
              </div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-brand-primary/60">
                Panax Ginseng - 2 Capsules
              </p>
            </div>
          </div>

          <div className="flex min-h-[300px] flex-col justify-end rounded-[2rem] bg-brand-secondary p-10 text-white md:col-span-4">
            <History className="mb-8 h-12 w-12 opacity-80" />
            <h3 className="mb-4 text-2xl font-bold">Medical History</h3>
            <p className="leading-relaxed text-brand-surface/80">
              Keep a complete digital archive of all scanned medications and
              reports to share with your healthcare provider securely.
            </p>
          </div>

          <div className="group overflow-hidden rounded-[2rem] border border-brand-primary/5 bg-white p-12 md:col-span-8">
            <div className="flex flex-col items-center gap-12 lg:flex-row-reverse">
              <div className="flex-1 text-center lg:text-right">
                <ShieldCheck className="mb-6 h-12 w-12 text-brand-primary lg:ml-auto" />
                <h3 className="mb-6 text-3xl font-bold text-brand-ink">
                  Privacy First
                </h3>
                <p className="text-lg leading-relaxed text-brand-muted">
                  Your medical data is encrypted and stored locally. We respect
                  your confidentiality and never share your data with third
                  parties.
                </p>
              </div>

              <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-brand-primary/5 bg-brand-surface lg:w-72">
                <img
                  src="https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&q=80&w=1000"
                  alt="Security Shield"
                  className="h-full w-full object-cover opacity-50 transition-transform duration-700 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
                <ShieldCheck className="absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 text-brand-primary" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const CTA = () => {
  return (
    <section id="pricing" className="px-6 py-24">
      <div className="mx-auto max-w-7xl">
        <motion.div
          whileInView={{ scale: [0.95, 1], opacity: [0, 1] }}
          className="relative overflow-hidden rounded-[3rem] bg-brand-primary p-16 text-center shadow-2xl shadow-brand-primary/20"
        >
          <div className="relative z-10">
            <h2 className="mx-auto mb-8 max-w-3xl text-4xl font-bold leading-tight text-white lg:text-5xl">
              Ready to take control of your medication safety?
            </h2>
            <p className="mx-auto mb-12 max-w-2xl text-xl text-brand-light/80">
              Join thousands of users who trust Yaobox for accurate healthcare
              translations every day.
            </p>
            <Link
              to="/register"
              className="pill-button px-10 py-5 text-xl font-bold text-brand-primary bg-white shadow-2xl shadow-white/10 transition-transform hover:scale-105"
            >
              Start Your First Scan Now
            </Link>
            <p className="mt-8 text-sm font-medium tracking-wide text-brand-light/50">
              NO CREDIT CARD REQUIRED. FREE FOR UP TO 5 SCANS PER MONTH.
            </p>
          </div>

          <div className="absolute right-0 top-0 h-64 w-64 translate-x-1/2 -translate-y-1/2 rounded-full bg-white/5 blur-2xl" />
          <div className="absolute bottom-0 left-0 h-96 w-96 -translate-x-1/2 translate-y-1/2 rounded-full bg-black/5 blur-3xl" />
        </motion.div>
      </div>
    </section>
  );
};

const Footer = () => {
  return (
    <footer className="border-t border-brand-primary/5 bg-white px-6 py-16">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 flex flex-col items-center justify-between gap-12 md:flex-row">
          <Logo
            className="origin-center scale-90 transform md:origin-left md:scale-100"
            showTagline={true}
          />

          <div className="flex flex-wrap justify-center gap-8">
            {["Privacy Policy", "Terms of Service", "Cookie Policy", "Contact Us"].map(
              (item) => (
                <a
                  key={item}
                  href="#"
                  className="border-b border-transparent pb-1 text-xs font-bold uppercase tracking-widest text-brand-muted transition-colors hover:border-brand-primary/20 hover:text-brand-primary"
                >
                  {item}
                </a>
              )
            )}
          </div>

          <div className="flex items-center gap-6">
            <button className="p-2 text-brand-muted transition-colors hover:scale-110 hover:text-brand-primary active:scale-95">
              <Globe className="h-5 w-5" />
            </button>
            <button className="p-2 text-brand-muted transition-colors hover:scale-110 hover:text-brand-primary active:scale-95">
              <Share2 className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="border-t border-brand-primary/5 pt-12 text-center text-[10px] font-medium uppercase tracking-[0.5em] text-brand-muted/40">
          Designed for absolute clarity and human wellness.
        </div>
      </div>
    </footer>
  );
};

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden font-sans selection:bg-brand-light">
      <Navbar />
      <Hero />
      <Steps />
      <Features />
      <CTA />
      <Footer />
    </div>
  );
}