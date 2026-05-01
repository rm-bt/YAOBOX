import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import {
  Eye,
  EyeOff,
  ArrowRight,
  Pill,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { useRegister } from "../hooks/useRegister";

export default function RegisterPage() {
  const registerMutation = useRegister();

  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    terms: false,
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!formData.terms) {
      return;
    }

    registerMutation.mutate({
      full_name: formData.fullName,
      email: formData.email,
      password: formData.password,
    });
  }

  return (
    <div className="min-h-screen flex flex-col bg-brand-surface selection:bg-brand-primary/20">
      <header className="w-full max-w-7xl mx-auto px-6 py-8 flex justify-between items-center z-20">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#e1ecd6] rounded-full flex items-center justify-center">
            <Pill className="w-6 h-6 text-[#454d3d] -rotate-45" strokeWidth={2.5} />
          </div>
          <span className="text-2xl font-bold tracking-tight text-[#1a1c19]">
            Yaobox
          </span>
        </Link>

        <Link
          to="/login"
          className="text-sm font-semibold text-stone-500 hover:text-stone-900 transition-colors"
        >
          Log In
        </Link>
      </header>

      <main className="flex-grow flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute inset-0 z-0 flex justify-center items-center pointer-events-none">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.3 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="w-[800px] h-[800px] bg-brand-primary-container rounded-full blur-[120px]"
          />
        </div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-full max-w-md bg-white border border-stone-100/50 rounded-[3rem] shadow-ambient relative z-10 p-12 flex flex-col"
        >
          <div className="text-center mb-10 flex flex-col items-center">
            <div className="w-16 h-16 bg-[#e1ecd6] rounded-full flex items-center justify-center mb-6">
              <Pill className="w-8 h-8 text-[#454d3d] -rotate-45" strokeWidth={2.5} />
            </div>

            <h1 className="text-3xl font-bold text-stone-900 mb-2 leading-tight">
              Join Yaobox Today
            </h1>

            <p className="text-stone-500 leading-relaxed text-sm max-w-[280px] mx-auto text-center">
              Bridge the language gap in healthcare. Identify Chinese medicine
              packages and translate medical reports instantly.
            </p>

            <div className="mt-5 rounded-2xl bg-[#f8faf6] border border-[#d9e9c6] px-4 py-3 text-left w-full">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-[#556347] mt-0.5 shrink-0" />
                <p className="text-xs leading-relaxed text-stone-600">
                  YAOBOX helps users understand medicine information, store scan
                  history, and manage reminders. It does not provide diagnosis or
                  treatment decisions.
                </p>
              </div>
            </div>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-1.5 text-left">
              <label className="text-sm font-semibold text-stone-800 ml-1">
                Full Name
              </label>
              <input
                type="text"
                placeholder="Enter your full name"
                className="w-full bg-white border border-stone-200 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary transition-all text-stone-900 placeholder:text-stone-300"
                required
                value={formData.fullName}
                onChange={(e) =>
                  setFormData({ ...formData, fullName: e.target.value })
                }
              />
            </div>

            <div className="space-y-1.5 text-left">
              <label className="text-sm font-semibold text-stone-800 ml-1">
                Email Address
              </label>
              <input
                type="email"
                placeholder="you@example.com"
                className="w-full bg-white border border-stone-200 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary transition-all text-stone-900 placeholder:text-stone-300"
                required
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>

            <div className="space-y-1.5 text-left">
              <label className="text-sm font-semibold text-stone-800 ml-1">
                Password
              </label>

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a password"
                  className="w-full bg-white border border-stone-200 rounded-2xl px-5 py-4 pr-12 focus:outline-none focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary transition-all text-stone-900 placeholder:text-stone-300"
                  required
                  minLength={8}
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              <p className="text-xs text-stone-400 mt-1 ml-1">
                Must be at least 8 characters long.
              </p>
            </div>

            <div className="flex items-start gap-4 py-2 text-left">
              <div className="relative flex items-center h-5 mt-0.5">
                <input
                  type="checkbox"
                  className="w-5 h-5 rounded-full border-stone-300 text-brand-primary focus:ring-brand-primary/20 cursor-pointer appearance-none checked:bg-brand-primary checked:border-transparent ring-1 ring-stone-200 checked:ring-brand-primary"
                  required
                  checked={formData.terms}
                  onChange={(e) =>
                    setFormData({ ...formData, terms: e.target.checked })
                  }
                />
                {formData.terms && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-2 h-2 bg-white rounded-full" />
                  </div>
                )}
              </div>

              <label className="text-xs text-stone-500 leading-normal cursor-pointer">
                I agree to the{" "}
                <button
                  type="button"
                  className="text-brand-primary font-bold hover:underline"
                >
                  Terms of Service
                </button>{" "}
                and{" "}
                <button
                  type="button"
                  className="text-brand-primary font-bold hover:underline"
                >
                  Privacy Policy
                </button>
                .
              </label>
            </div>

            {registerMutation.isError ? (
  <div className="rounded-2xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700 leading-relaxed">
    {registerMutation.error instanceof Error
      ? registerMutation.error.message
      : "Registration failed. Check backend connection and submitted data."}
  </div>
) : null}

            {registerMutation.isSuccess ? (
              <div className="rounded-2xl bg-emerald-50 border border-emerald-100 px-4 py-3 text-sm text-emerald-700 leading-relaxed flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                <span>
                  Account created successfully. Continue to login and access your
                  scan, history, and reminder flows.
                </span>
              </div>
            ) : null}

            <button
              type="submit"
              disabled={registerMutation.isPending}
              className="w-full bg-[#635d5a] text-white font-bold rounded-full py-5 flex items-center justify-center gap-2 hover:bg-stone-800 transition-all shadow-xl shadow-stone-100 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {registerMutation.isPending ? "Creating Account..." : "Create Account"}
              <ArrowRight size={20} />
            </button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-stone-100" />
            </div>
            <div className="relative flex justify-center text-[11px] font-bold">
              <span className="bg-white px-6 text-stone-400 uppercase tracking-widest">
                Not enabled in this build
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              disabled
              className="flex items-center justify-center gap-3 w-full bg-white border border-stone-200 text-stone-400 text-sm font-bold rounded-full py-3.5 opacity-70 cursor-not-allowed"
            >
              <span className="w-5 h-5 rounded-full bg-stone-200 inline-block" />
              Google
            </button>

            <button
              type="button"
              disabled
              className="flex items-center justify-center gap-3 w-full bg-white border border-stone-200 text-stone-400 text-sm font-bold rounded-full py-3.5 opacity-70 cursor-not-allowed"
            >
              <span className="w-5 h-5 rounded-full bg-stone-200 inline-block" />
              Apple
            </button>
          </div>

          <p className="mt-10 text-center text-sm text-stone-500 font-medium">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-bold text-brand-primary hover:underline transition-all"
            >
              Login
            </Link>
          </p>
        </motion.div>
      </main>

      <footer className="w-full max-w-7xl mx-auto px-10 py-12 flex flex-col md:flex-row justify-between items-center gap-6 border-t border-stone-200/60 z-20">
        <p className="text-sm text-stone-500 font-medium">
          © 2024 Yaobox Healthcare. Precision meets wellness.
        </p>

        <div className="flex gap-10">
          <button
            type="button"
            className="text-sm text-stone-500 hover:text-stone-900 transition-colors font-medium underline underline-offset-4 decoration-stone-200"
          >
            Privacy Policy
          </button>
          <button
            type="button"
            className="text-sm text-stone-500 hover:text-stone-900 transition-colors font-medium underline underline-offset-4 decoration-stone-200"
          >
            Terms of Service
          </button>
          <button
            type="button"
            className="text-sm text-stone-500 hover:text-stone-900 transition-colors font-medium underline underline-offset-4 decoration-stone-200"
          >
            Help Center
          </button>
        </div>
      </footer>
    </div>
  );
}