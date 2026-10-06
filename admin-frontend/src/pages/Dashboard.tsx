import { useEffect, useState } from "react";

import { adminRequest } from "../services/adminApi";
import type { SourcesResponse } from "../types/source";

const Dashboard = () => {
  const [data, setData] = useState<SourcesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError("");

        const result = await adminRequest<SourcesResponse>(
          "/api/admin/sources"
        );

        setData(result);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load dashboard"
        );
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  if (loading) {
    return <p>Loading dashboard...</p>;
  }

  if (error) {
    return <p className="error-message">{error}</p>;
  }

  if (!data) {
    return <p>No dashboard data available.</p>;
  }

  return (
    <div className="dashboard">
      <div className="dashboard-intro">
        <h2>Welcome to 4Killo Admin</h2>

        <p>
          Manage jobs, sources, and the job aggregation system.
        </p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <span>Total Jobs Linked</span>
          <strong>{data.stats.totalJobsLinked}</strong>
        </div>

        <div className="stat-card">
          <span>Total Sources</span>
          <strong>{data.stats.totalSources}</strong>
        </div>

        <div className="stat-card">
          <span>Active Sources</span>
          <strong>{data.stats.activeSources}</strong>
        </div>

        <div className="stat-card">
          <span>Source Errors</span>
          <strong>{data.stats.errorSources}</strong>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;