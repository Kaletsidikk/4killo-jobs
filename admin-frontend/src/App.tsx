import { useState } from "react";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Jobs from "./pages/Jobs";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import Sources from "./pages/Sources";
import Users from "./pages/Users";
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
    users: "Users",
    sources: "Sources",
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
          {activePage === "dashboard" && (
  <Dashboard onNavigate={setActivePage} />
)}

          {activePage === "jobs" && <Jobs />}

         {activePage === "sources" && <Sources />}

          {activePage === "users" && <Users />}

        </main>
      </div>
    </div>
  );
}

export default App;