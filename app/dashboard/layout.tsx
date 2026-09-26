export const metadata = {
  title: "Dashboard / raided.cc",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Just metadata + passthrough now — the sidebar/content shell lives in
  // page.tsx so nav switches can swap content without changing routes.
  return <>{children}</>;
}