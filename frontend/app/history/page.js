import AppPage from "../../components/AppPage";
import HistoryContent from "./HistoryContent";

export default function HistoryPage() {
  return (
    <AppPage
      description="Saved analyses are private to your signed-in account."
      eyebrow="YOUR REPORTS"
      title="History"
    >
      <HistoryContent />
    </AppPage>
  );
}
