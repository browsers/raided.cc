import TopBar from "../components/dashboard/TopBar";
import OverviewRow from "../components/dashboard/OverviewRow";
import StatCards from "../components/dashboard/StatCards";
import ViewsChart from "../components/dashboard/ViewsChart";
import ChecklistCard from "../components/dashboard/ChecklistCard";
import { ImageIcon, BioIcon, LinkIcon, ContainerIcon } from "../components/dashboard/icons";

// TODO: replace every block below with real reads from Supabase
// (profile row, invite_codes/views table, etc). Kept as flat mock
// data for now so the layout can be wired up and styled first.

const PROFILE = {
  displayName: "vvs",
  handle: "x",
  alias: "ky",
  totalViews: 552,
  accountAgeLabel: "26 years",
  accountAgeDate: "Dec 31, 1999",
  completionPct: 75,
  essentialsDone: 3,
  essentialsTotal: 4,
};

const VIEWS_LAST_7_DAYS = [
  { label: "04-20", value: 4 },
  { label: "04-21", value: 3 },
  { label: "04-22", value: 2 },
  { label: "04-23", value: 5 },
  { label: "04-24", value: 14 },
  { label: "04-25", value: 22 },
  { label: "04-26", value: 6 },
];

const CHECKLIST_ITEMS = [
  { label: "Add a profile picture", icon: ImageIcon, done: true },
  { label: "Write a bio", icon: BioIcon, done: true },
  { label: "Add social links", icon: LinkIcon, done: true },
  { label: "Customize your container", icon: ContainerIcon, done: false },
];

export default function DashboardOverviewPage() {
  return (
    <>
      <TopBar
        breadcrumb={`${PROFILE.handle.toUpperCase()}.CH / EDIT`}
        title="Overview"
        saved
      />

      <OverviewRow
        displayName={PROFILE.displayName}
        handle={PROFILE.handle}
        completionPct={PROFILE.completionPct}
        essentialsDone={PROFILE.essentialsDone}
        essentialsTotal={PROFILE.essentialsTotal}
      />

      <StatCards
        totalViews={PROFILE.totalViews}
        alias={PROFILE.alias}
        accountAgeLabel={PROFILE.accountAgeLabel}
        accountAgeDate={PROFILE.accountAgeDate}
      />

      <div className="dash-bottom-row">
        <ViewsChart data={VIEWS_LAST_7_DAYS} />
        <ChecklistCard
          title="Complete Your Profile"
          subtitle="Casual Encouragement"
          items={CHECKLIST_ITEMS}
        />
      </div>
    </>
  );
}
