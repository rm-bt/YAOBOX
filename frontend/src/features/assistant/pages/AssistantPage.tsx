import { useState, type FormEvent } from "react";
import { motion } from "motion/react";
import {
  AlertTriangle,
  Bot,
  Brain,
  HeartPulse,
  Loader2,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { askAssistant } from "../../../api/assistant.api";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const quickQuestions = [
  "What habits should I avoid when I have a cold?",
  "How can I remember my medicine safely?",
  "What should I ask a pharmacist before taking a new medicine?",
  "How do I reduce stomach irritation when taking medicine?",
];

export default function AssistantPage() {
  const [question, setQuestion] = useState("");
  const [context, setContext] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hi, I am the YAOBOX wellness assistant. Ask me general questions about medicine understanding, safer habits, reminders, and when to seek professional help.",
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function submitQuestion(customQuestion?: string) {
    const finalQuestion = (customQuestion ?? question).trim();

    if (!finalQuestion || isLoading) {
      return;
    }

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: finalQuestion,
    };

    setMessages((current) => [...current, userMessage]);
    setQuestion("");
    setErrorMessage("");
    setIsLoading(true);

    try {
      const response = await askAssistant({
        question: finalQuestion,
        context: context.trim() || undefined,
      });

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `${response.answer}\n\nSafety note: ${response.safety_note}`,
      };

      setMessages((current) => [...current, assistantMessage]);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Assistant failed. Please try again.";

      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitQuestion();
  }

  return (
    <div className="max-w-6xl mx-auto pb-8 space-y-8">
      <header className="space-y-4">
        <p className="text-brand-primary font-bold tracking-[0.12em] text-xs uppercase">
          AI Assistant
        </p>

        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div>
            <h1 className="text-4xl lg:text-5xl font-bold text-on-surface tracking-tight">
              Medicine & Wellness Assistant
            </h1>

            <p className="text-lg text-on-surface-variant mt-4 max-w-3xl leading-relaxed">
              Ask simple questions about medicine understanding, healthy habits,
              safer routines, and when to contact a doctor or pharmacist.
            </p>
          </div>

          <div className="rounded-[24px] bg-yaobox-primary-container px-5 py-4 text-yaobox-on-primary-container max-w-sm">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 mt-0.5 shrink-0" />
              <p className="text-sm font-semibold leading-relaxed">
                This assistant does not diagnose, prescribe, or replace medical
                advice.
              </p>
            </div>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-1 lg:grid-cols-[0.8fr_1.2fr] gap-6">
        <div className="space-y-6">
          <div className="rounded-[32px] border border-outline-variant/30 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-12 w-12 rounded-full bg-yaobox-primary-container text-yaobox-primary flex items-center justify-center">
                <Brain className="w-6 h-6" />
              </div>

              <div>
                <h2 className="text-xl font-bold text-on-surface">
                  User context
                </h2>
                <p className="text-sm text-on-surface-variant">
                  Optional. Helps the assistant answer more clearly.
                </p>
              </div>
            </div>

            <textarea
              value={context}
              onChange={(event) => setContext(event.target.value)}
              placeholder="Example: I scanned a cold medicine. I want to understand safe habits and what to avoid."
              className="min-h-36 w-full rounded-[24px] border border-outline-variant/30 bg-surface-container-lowest px-5 py-4 text-sm text-on-surface outline-none focus:border-yaobox-primary focus:ring-4 focus:ring-yaobox-primary/10"
            />

            <div className="mt-5 rounded-[22px] bg-surface-container-low p-4">
              <div className="flex gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs leading-relaxed text-on-surface-variant">
                  Do not enter emergency symptoms here. If there is chest pain,
                  breathing trouble, severe allergic reaction, fainting, or
                  dangerous symptoms, seek urgent medical help.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[32px] border border-outline-variant/30 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-12 w-12 rounded-full bg-surface-container-low text-yaobox-primary flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>

              <div>
                <h2 className="text-xl font-bold text-on-surface">
                  Quick questions
                </h2>
                <p className="text-sm text-on-surface-variant">
                  Tap one to test the assistant fast.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {quickQuestions.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => void submitQuestion(item)}
                  disabled={isLoading}
                  className="w-full rounded-[20px] border border-outline-variant/30 bg-surface-container-lowest px-4 py-4 text-left text-sm font-semibold text-on-surface hover:bg-surface-container-low transition-all disabled:opacity-60"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-[32px] border border-outline-variant/30 bg-white shadow-sm overflow-hidden flex flex-col min-h-[680px]">
          <div className="border-b border-outline-variant/20 px-6 py-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-yaobox-primary-container text-yaobox-primary flex items-center justify-center">
                <Bot className="w-6 h-6" />
              </div>

              <div>
                <h2 className="text-xl font-bold text-on-surface">
                  Assistant chat
                </h2>
                <p className="text-sm text-on-surface-variant">
                  General guidance only.
                </p>
              </div>
            </div>

            <HeartPulse className="w-6 h-6 text-yaobox-primary" />
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-surface-container-lowest/60">
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={[
                  "max-w-[85%] rounded-[24px] px-5 py-4 text-sm leading-relaxed whitespace-pre-wrap",
                  message.role === "user"
                    ? "ml-auto bg-yaobox-primary text-white"
                    : "mr-auto bg-white border border-outline-variant/20 text-on-surface",
                ].join(" ")}
              >
                {message.content}
              </motion.div>
            ))}

            {isLoading ? (
              <div className="mr-auto inline-flex items-center gap-3 rounded-[24px] bg-white border border-outline-variant/20 px-5 py-4 text-sm text-on-surface-variant">
                <Loader2 className="w-4 h-4 animate-spin" />
                Thinking...
              </div>
            ) : null}

            {errorMessage ? (
              <div className="rounded-[24px] bg-red-50 border border-red-100 p-4 text-sm text-red-700">
                {errorMessage}
              </div>
            ) : null}
          </div>

          <form
            onSubmit={handleSubmit}
            className="border-t border-outline-variant/20 p-5 bg-white"
          >
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="Ask a wellness or medicine-understanding question..."
                className="min-h-14 flex-1 rounded-full border border-outline-variant/30 bg-surface-container-lowest px-5 text-sm text-on-surface outline-none focus:border-yaobox-primary focus:ring-4 focus:ring-yaobox-primary/10"
              />

              <button
                type="submit"
                disabled={!question.trim() || isLoading}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-yaobox-primary px-6 py-4 text-sm font-bold text-white shadow-lg shadow-yaobox-primary/20 hover:brightness-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Send
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}