"use client";

import { useState } from "react";
import Sidebar from "../components/dashboard/Sidebar";
import ComingSoon from "../components/dashboard/ComingSoon";
import Overview from "../components/dashboard/Overview";
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

  return (
    <div className="dash-shell">
      <Sidebar activeTab={activeTab} onSelectTab={setActiveTab} />
      <main className="dash-content">
        {TAB_CONTENT[activeTab] ?? TAB_CONTENT.overview}
      </main>
    </div>
  );
}