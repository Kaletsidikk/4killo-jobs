import { useState } from "react";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";

import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import Sources from "./pages/Sources";
import {
  getAdminToken,
  removeAdminToken,
} from "./services/adminAuth";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    !!getAdminToken()
  );

  const [activePage, setActivePage] = useState("dashboard");

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    removeAdminToken();
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  const pageTitles: Record<string, string> = {
    dashboard: "Dashboard",
    jobs: "Jobs",
    sources: "Sources",
    scraping: "Scraping",
    settings: "Settings",
  };

  return (
    <div className="admin-layout">
      <Sidebar
        activePage={activePage}
        onNavigate={setActivePage}
      />

      <div className="admin-main">
        <Header
          title={pageTitles[activePage]}
          onLogout={handleLogout}
        />

        <main className="admin-content">
          {activePage === "dashboard" && <Dashboard />}

          {activePage === "jobs" && (
            <h2>Jobs page coming next</h2>
          )}

         {activePage === "sources" && <Sources />}

          {activePage === "scraping" && (
            <h2>Scraping page coming next</h2>
          )}

          {activePage === "settings" && (
            <h2>Settings page coming next</h2>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;