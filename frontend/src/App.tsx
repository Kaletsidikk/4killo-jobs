import { useState } from "react";
import { useTelegram } from "./hooks/useTelegram";

import Onboarding from "./components/onboarding/Onboarding";

import Home from "./pages/Home";
import ForYou from "./pages/ForYou";
import Saved from "./pages/Saved";
import Settings from "./pages/Settings";

import BottomNav from "./components/navigation/BottomNav";

function App() {
  useTelegram();

  const [activeTab, setActiveTab] = useState("Home");

  const [showOnboarding, setShowOnboarding] = useState(true);

  // Show onboarding for now
  if (showOnboarding) {
    return (
      <div className="min-h-screen bg-blue-50">
        <Onboarding onComplete={() => setShowOnboarding(false)}/>
      </div>
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
        return <Home />;
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