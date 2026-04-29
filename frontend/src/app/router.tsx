import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./guards/ProtectedRoute";
import { AuthLayout } from "./layouts/AuthLayout";
import { AppShell } from "./layouts/AppShell";

import LandingPage from "../features/landing/pages/LandingPage";
import LoginPage from "../features/auth/pages/LoginPage";
import RegisterPage from "../features/auth/pages/RegisterPage";

import DashboardPage from "../features/dashboard/pages/DashboardPage";

import ScanPage from "../features/scan/pages/ScanPage";
import ProcessingPage from "../features/scan/pages/ProcessingPage";
import ScanResultPage from "../features/scan/pages/ScanResultPage";

import HistoryPage from "../features/history/pages/HistoryPage";
import ProfilePage from "../features/profile/pages/ProfilePage";
import RemindersPage from "../features/reminders/pages/RemindersPage";
import CreateReminderPage from "../features/reminders/pages/CreateReminderPage";

function PlaceholderPage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <section className="rounded-[2rem] border border-brand-primary/10 bg-white p-8 shadow-sm">
      <h1 className="mb-3 text-3xl font-bold text-brand-ink">{title}</h1>
      <p className="m-0 max-w-2xl leading-relaxed text-brand-muted">
        {description}
      </p>
    </section>
  );
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />

      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<DashboardPage />} />

          <Route path="/scan" element={<ScanPage />} />
          <Route path="/scan/processing" element={<ProcessingPage />} />
          <Route path="/scan/result" element={<ScanResultPage />} />

          <Route path="/history" element={<HistoryPage />} />

          <Route path="/reminders" element={<RemindersPage />} />
          <Route path="/reminders/create" element={<CreateReminderPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route
            path="/profile"
            element={
              <PlaceholderPage
                title="Profile"
                description="Profile stays simple until the backend exposes more profile data."
              />
            }
          />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}