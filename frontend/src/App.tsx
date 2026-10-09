import { useState, useEffect } from "react";
import { useTelegram } from "./hooks/useTelegram";
import { ai } from "./services/voxide";
import { getPreferences } from "./services/preferences";
import Onboarding from "./components/onboarding/Onboarding";

import Home from "./pages/Home";
import ForYou from "./pages/ForYou";
import Saved from "./pages/Saved";
import Settings from "./pages/Settings";
import Sources from "./pages/Sources";
import EditPreferences from "./pages/EditPreferences";

import BottomNav from "./components/navigation/BottomNav";
import type { Job } from "./types/job";
import JobDetails from "./pages/JobDetails";

function App() {
  useEffect(() => {
    ai.init().catch((error) => {
      console.error("Voxide initialization failed:", error);
    });
  }, []);

  const { loading: telegramLoading, isAuthenticated } = useTelegram();

  const [activeTab, setActiveTab] = useState("Home");
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [checkingPreferences, setCheckingPreferences] = useState(true);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showSources, setShowSources] = useState(false);
  const [showEditPreferences, setShowEditPreferences] = useState(false);

  useEffect(() => {
    const checkPreferences = async () => {
      // Wait until Telegram authentication has finished.
      if (telegramLoading) {
        return;
      }

      // If the user is not authenticated, we cannot check
      // their backend preferences.
      if (!isAuthenticated) {
        setCheckingPreferences(false);
        return;
      }

      try {
        const preferences = await getPreferences();

        const hasCompletedPreferences =
          preferences.categories?.length > 0 &&
          preferences.locations?.length > 0;

        setShowOnboarding(!hasCompletedPreferences);
      } catch (error) {
        console.error("Failed to load preferences:", error);

        // If we cannot determine the user's preferences,
        // keep onboarding visible.
        setShowOnboarding(true);
      } finally {
        setCheckingPreferences(false);
      }
    };

    checkPreferences();
  }, [telegramLoading, isAuthenticated]);

  // Wait for Telegram authentication and preference check.
  if (telegramLoading || checkingPreferences) {
    return (
      <div className="min-h-screen bg-blue-50 flex items-center justify-center">
        <p className="text-slate-600">Loading...</p>
      </div>
    );
  }

  if (showOnboarding) {
    return (
      <div className="min-h-screen bg-blue-50">
        <Onboarding
          onComplete={() => setShowOnboarding(false)}
        />
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
  if (showEditPreferences) {
  return (
    <EditPreferences
      onBack={() => setShowEditPreferences(false)}
    />
  );
}
if (showSources) {
  return (
    <Sources
      onBack={() => setShowSources(false)}
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
        return (
          <Settings
            onSourcesClick={() => setShowSources(true)}
            onPreferencesClick={() => setShowEditPreferences(true)}
          />
        );

      case "Home":
      default:
        return (
          <Home
            onJobSelect={(job) => setSelectedJob(job)}
          />
        );
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
