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

const ONBOARDING_KEY = "4killo_onboarding_done";

function App() {
  useEffect(() => {
    ai.init().catch((error) => {
      console.error("Voxide initialization failed:", error);
    });
  }, []);

  useTelegram();

  const [activeTab, setActiveTab] = useState("Home");

  // Persisted onboarding — only show if user hasn't completed it before
  const [showOnboarding, setShowOnboarding] = useState(
    () => localStorage.getItem(ONBOARDING_KEY) !== "true"
  );

  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  const handleOnboardingComplete = () => {
    localStorage.setItem(ONBOARDING_KEY, "true");
    setShowOnboarding(false);
  };

  const handleJobSelect = (job: Job) => {
    setSelectedJob(job);
  };

  const handleJobBack = () => {
    setSelectedJob(null);
  };

  if (showOnboarding) {
    return (
      <div className="min-h-screen bg-blue-50">
        <Onboarding onComplete={handleOnboardingComplete} />
      </div>
    );
  }

  if (selectedJob) {
    return (
      <JobDetails
        job={selectedJob}
        onBack={handleJobBack}
      />
    );
  }

  const renderPage = () => {
    switch (activeTab) {
      case "For You":
        return <ForYou onJobSelect={handleJobSelect} />;

      case "Saved":
        return <Saved onJobSelect={handleJobSelect} />;

      case "Settings":
        return <Settings />;

      case "Home":
      default:
        return <Home onJobSelect={handleJobSelect} />;
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