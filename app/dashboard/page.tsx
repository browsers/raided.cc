"use client";

import { useEffect, useState } from "react";
import Sidebar from "../components/dashboard/Sidebar";
import ComingSoon from "../components/dashboard/ComingSoon";
import Overview from "../components/dashboard/Overview";
import NoAccessCard from "../components/NoAccessCard";
import { supabase } from "../lib/supabaseClient";
import "./dashboard.css";

// Sidebar items are tabs, not routes — switching one just swaps what
// renders here, the URL always stays at /dashboard.
const TAB_CONTENT: Record<string, React.ReactNode> = {
  overview: <Overview />,
  profile: <ComingSoon label="Coming soon" />,
  appearance: <ComingSoon label="Coming soon" />,
  links: <ComingSoon label="Coming soon" />,
  embed: <ComingSoon label="Coming soon" />,
  badges: <ComingSoon label="Coming soon" />,
  settings: <ComingSoon label="Coming soon" />,
};

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState("overview");
  // null = still checking, true = signed in, false = no session -> gate them out
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(Boolean(data.session));
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setHasSession(Boolean(session));
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  // Still checking — render nothing rather than flashing the dashboard
  // (or the gate screen) while we wait on Supabase.
  if (hasSession === null) return null;

  if (!hasSession) {
    return (
      <main>
        <div className="bg-video-wrap">
          <video
            className="bg-video"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
          >
            <source src="/videos/grass-bg.mp4" type="video/mp4" />
          </video>
        </div>
        <div className="center-content">
          <NoAccessCard />
        </div>
      </main>
    );
  }

  return (
    <div className="dash-shell">
      <Sidebar activeTab={activeTab} onSelectTab={setActiveTab} />
      <main className="dash-content">
        {TAB_CONTENT[activeTab] ?? TAB_CONTENT.overview}
      </main>
    </div>
  );
}