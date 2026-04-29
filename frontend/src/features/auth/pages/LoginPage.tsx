import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Mail, Lock, ArrowRight, ShieldCheck, Pill, ScanLine } from "lucide-react";
import { motion } from "motion/react";
import { useLogin } from "../hooks/useLogin";

export default function LoginPage() {
  const loginMutation = useLogin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    loginMutation.mutate({ email, password });
  }

  return (
    <div className="min-h-screen flex flex-col bg-surface-bright selection:bg-yaobox-primary-container selection:text-yaobox-on-primary-container">
      <nav className="absolute top-0 w-full px-6 py-6 flex justify-between items-center z-50">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-10 h-10 bg-yaobox-primary-container rounded-xl flex items-center justify-center brand-glow">
            <Pill className="w-6 h-6 text-yaobox-primary" />
          </div>
          <span className="text-xl font-bold text-on-surface tracking-tighter">
            Yaobox
          </span>
        </Link>

        <div className="flex items-center gap-6">
          <button
            type="button"
            className="text-sm font-semibold text-on-surface-variant hover:text-on-surface transition-colors"
          >
            Language
          </button>
          <button
            type="button"
            className="hidden md:block text-sm font-semibold text-on-surface-variant hover:text-on-surface transition-colors"
          >
            Help Center
          </button>
        </div>
      </nav>

      <div className="flex-grow flex flex-col lg:flex-row">
        <div className="hidden lg:flex lg:w-1/2 relative bg-surface-container-low flex-col justify-center px-24 overflow-hidden border-r border-yaobox-primary-container/10">
          <div className="absolute inset-0 z-0">
            <img
              src="/hero-mockup.png"
              alt="Healthcare background"
              className="w-full h-full object-cover opacity-[0.03] grayscale"
            />
          </div>

          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="relative z-10"
          >
            <h2 className="text-5xl font-bold text-on-surface leading-[1.1] mb-8 max-w-lg">
              Bridging the <span className="text-yaobox-primary">Language Gap</span> in Healthcare
            </h2>

            <div className="space-y-12">
              <div className="flex items-start gap-6 group">
                <div className="w-14 h-14 rounded-2xl bg-white shadow-xl flex items-center justify-center shrink-0 border border-white group-hover:scale-110 transition-transform">
                  <ScanLine className="w-7 h-7 text-yaobox-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-on-surface mb-2">
                    Smart Scan Technology
                  </h3>
                  <p className="text-on-surface-variant leading-relaxed opacity-80">
                    Scan Chinese medicine labels, prescriptions, or reports and
                    translate key information into readable English.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-6 group">
                <div className="w-14 h-14 rounded-2xl bg-white shadow-xl flex items-center justify-center shrink-0 border border-white group-hover:scale-110 transition-transform">
                  <ShieldCheck className="w-7 h-7 text-yaobox-tertiary" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-on-surface mb-2">
                    Trust-Aware Support
                  </h3>
                  <p className="text-on-surface-variant leading-relaxed opacity-80">
                    YAOBOX helps explain medicine information clearly, but it
                    does not diagnose conditions or replace doctor or pharmacist
                    advice.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            animate={{ y: [0, -20, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute bottom-20 right-20 p-5 glass-card bg-white/80 backdrop-blur-xl border-white rounded-3xl brand-glow max-w-[240px]"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest leading-none">
                  Security
                </div>
                <div className="text-sm font-bold text-on-surface">
                  Protected Records
                </div>
              </div>
            </div>
            <div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
              <div className="h-full w-3/4 bg-emerald-500 rounded-full" />
            </div>
          </motion.div>
        </div>

        <div className="w-full lg:w-1/2 flex flex-col justify-center items-center px-6 md:px-12 py-24 relative">
          <div className="lg:hidden absolute inset-0 z-0 opacity-10">
            <img
              src="/hero-mockup.png"
              alt="Healthcare background"
              className="w-full h-full object-cover grayscale"
            />
          </div>

          <motion.main
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="w-full max-w-[440px] z-10"
          >
            <div className="bg-white lg:bg-white/40 lg:backdrop-blur-sm rounded-[2.5rem] p-8 md:p-10 shadow-[0_32px_64px_-16px_rgba(85,99,71,0.1)] border border-yaobox-primary-container/20">
              <div className="mb-10 text-center lg:text-left">
                <h1 className="text-3xl font-bold text-on-surface mb-2 tracking-tight">
                  Sign In
                </h1>
                <p className="text-sm text-on-surface-variant font-medium">
                  Access your scans, reminders, and saved medicine history.
                </p>
                <p className="mt-4 text-xs leading-relaxed text-outline">
                  YAOBOX is a medicine understanding and management tool. It
                  supports OCR extraction, AI translation, history, and
                  reminders. It is not a diagnosis system.
                </p>
              </div>

              <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label
                      className="text-xs font-bold text-on-surface-variant/70 uppercase tracking-widest ml-1"
                      htmlFor="email"
                    >
                      Email Address
                    </label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-outline group-focus-within:text-yaobox-primary transition-colors" />
                      <input
                        className="w-full pl-12 pr-6 py-4 bg-surface-container-low border border-outline-variant/30 rounded-2xl focus:ring-4 focus:ring-yaobox-primary/10 focus:border-yaobox-primary transition-all outline-none text-base text-on-surface placeholder:text-outline/50 shadow-sm"
                        id="email"
                        placeholder="name@example.com"
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center px-1">
                      <label
                        className="text-xs font-bold text-on-surface-variant/70 uppercase tracking-widest"
                        htmlFor="password"
                      >
                        Password
                      </label>
                      <button
                        type="button"
                        className="text-xs font-bold text-yaobox-primary hover:text-on-surface transition-colors"
                      >
                        Forgot?
                      </button>
                    </div>

                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-outline group-focus-within:text-yaobox-primary transition-colors" />
                      <input
                        className="w-full pl-12 pr-6 py-4 bg-surface-container-low border border-outline-variant/30 rounded-2xl focus:ring-4 focus:ring-yaobox-primary/10 focus:border-yaobox-primary transition-all outline-none text-base text-on-surface placeholder:text-outline/50 shadow-sm"
                        id="password"
                        placeholder="••••••••"
                        type="password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        required
                      />
                    </div>
                  </div>
                </div>

                {loginMutation.isError ? (
                  <div className="rounded-2xl bg-yaobox-tertiary-container text-yaobox-tertiary px-4 py-3 text-sm font-semibold leading-relaxed">
                    Login failed. Check your email and password, and make sure
                    the backend is running.
                  </div>
                ) : null}

                <div className="flex items-center justify-between px-1">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <div className="relative flex items-center justify-center w-5 h-5 bg-surface-container border border-outline-variant rounded-md group-hover:border-yaobox-primary transition-all">
                      <input
                        type="checkbox"
                        className="peer absolute opacity-0 cursor-pointer w-full h-full"
                      />
                      <div className="w-3 h-3 bg-yaobox-primary rounded-sm opacity-0 peer-checked:opacity-100 transition-opacity" />
                    </div>
                    <span className="text-sm font-medium text-on-surface-variant group-hover:text-on-surface transition-colors">
                      Remember device
                    </span>
                  </label>
                </div>

                <button
                  className="w-full bg-yaobox-primary text-white font-bold py-4 rounded-2xl hover:bg-yaobox-on-primary-container transition-all flex items-center justify-center gap-2 active:scale-[0.98] duration-200 shadow-xl shadow-yaobox-primary/20 disabled:opacity-70 disabled:cursor-not-allowed"
                  type="submit"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? "Signing in..." : "Sign In"}
                  <ArrowRight className="w-5 h-5" />
                </button>
              </form>
            </div>

            <div className="mt-8 text-center">
              <p className="text-sm font-medium text-on-surface-variant">
                Need an account later?
                <button
                  type="button"
                  className="font-bold text-yaobox-primary hover:underline ml-1"
                >
                  Register design comes next
                </button>
              </p>
            </div>
          </motion.main>

          <footer className="mt-auto pt-8 flex flex-col items-center gap-2 z-10 opacity-40">
            <div className="flex items-center gap-3 text-outline uppercase tracking-[0.3em] font-bold text-[8px]">
              <span className="w-6 h-px bg-current" />
              Yaobox Holistic
              <span className="w-6 h-px bg-current" />
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}