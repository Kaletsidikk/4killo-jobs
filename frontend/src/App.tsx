import { useState, useEffect } from "react";
import { useTelegram } from "./hooks/useTelegram";
import { ai } from "./services/voxide";
import Onboarding from "./components/onboarding/Onboarding";

import Home from "./pages/Home";
import ForYou from "./pages/ForYou";
import Saved from "./pages/Saved";
import Settings from "./pages/Settings";

import BottomNav from "./components/navigation/BottomNav";
import type { Job } from "./types/job";
import JobDetails from "./pages/JobDetails";

function App() {
  useEffect(() => {
  ai.init().catch((error) => {
    console.error("Voxide initialization failed:", error);
  });
}, []);
  useTelegram();

  const [activeTab, setActiveTab] = useState("Home");

  const [showOnboarding, setShowOnboarding] = useState(true);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  // Show onboarding for now
  if (showOnboarding) {
    return (
      <div className="min-h-screen bg-blue-50">
        <Onboarding onComplete={() => setShowOnboarding(false)}/>
      </div>
    );
  }
  if (selectedJob) {
  return (
    <JobDetails
      job={selectedJob}
      onBack={() => setSelectedJob(null)}
    />
  );
}

  const renderPage = () => {
    switch (activeTab) {
      case "For You":
        return <ForYou />;

      case "Saved":
        return <Saved />;

      case "Settings":
        return <Settings />;

      case "Home":
      default:
        return (<Home 
        onJobSelect={(job) => setSelectedJob(job)}/>);
    }
  };

  return (
    <div className="min-h-screen pb-20">
      {renderPage()}

      <BottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
    </div>
  );
}

export default App;