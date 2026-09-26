import Sidebar from "../components/dashboard/Sidebar";
import "./dashboard.css";

export const metadata = {
  title: "Dashboard / raided.cc",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="dash-shell">
      <Sidebar />
      <main className="dash-content">{children}</main>
    </div>
  );
}
