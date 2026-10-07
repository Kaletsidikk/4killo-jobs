import { useEffect, useState } from "react";

import { adminRequest } from "../services/adminApi";
import type { SourcesResponse } from "../types/source";

interface DashboardProps {
  onNavigate: (page: string) => void;
}

const Dashboard = ({ onNavigate }: DashboardProps) => {
  const [data, setData] = useState<SourcesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError("");

      const result = await adminRequest<SourcesResponse>(
        "/api/admin/sources"
      );

      setData(result);
      setLastUpdated(new Date());
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

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading && !data) {
    return (
      <div className="dashboard-state">
        <div className="loading-spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="dashboard-state">
        <p className="error-message">{error}</p>

        <button
          className="primary-button"
          onClick={loadDashboard}
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="dashboard-state">
        <p>No dashboard data available.</p>
      </div>
    );
  }

  const totalSources = data.stats.totalSources || 1;

  const activePercentage =
    (data.stats.activeSources / totalSources) * 100;

  const pausedPercentage =
    (data.stats.pausedSources / totalSources) * 100;

  const errorPercentage =
    (data.stats.errorSources / totalSources) * 100;
  const overviewSources = [...data.sources]
  .sort((a, b) => {
    const priority: Record<string, number> = {
      ERROR: 1,
      PAUSED: 2,
      ACTIVE: 3,
    };

    return (
      (priority[a.status] || 4) -
      (priority[b.status] || 4)
    );
  })
  .slice(0, 5);

  return (
    <div className="dashboard">

      {/* Dashboard Header */}

      <div className="page-header">
        <div>
          <h2>Dashboard</h2>

          <p>
            Overview of your 4Killo job aggregation system.
          </p>

          {lastUpdated && (
            <span className="last-updated">
              Last updated:{" "}
              {lastUpdated.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
        </div>

        <button
          className="primary-button refresh-button"
          onClick={loadDashboard}
          disabled={loading}
        >
          {loading ? "Refreshing..." : "↻ Refresh"}
        </button>
      </div>

      {/* Error while refreshing */}

      {error && (
        <p className="error-message dashboard-error">
          {error}
        </p>
      )}

      {/* Statistics */}

      <div className="stats-grid">

        <div className="stat-card">
          <span>Total Jobs Linked</span>
          <strong>{data.stats.totalJobsLinked}</strong>
          <small>Jobs connected to sources</small>
        </div>

        <div className="stat-card">
          <span>Total Sources</span>
          <strong>{data.stats.totalSources}</strong>
          <small>Configured job sources</small>
        </div>

        <div className="stat-card">
          <span>Active Sources</span>
          <strong>{data.stats.activeSources}</strong>
          <small>Currently active</small>
        </div>

        <div className="stat-card">
          <span>Paused Sources</span>
          <strong>{data.stats.pausedSources}</strong>
          <small>Currently paused</small>
        </div>

        <div className="stat-card">
          <span>Source Errors</span>
          <strong>{data.stats.errorSources}</strong>
          <small>Sources requiring attention</small>
        </div>

      </div>

      {/* Dashboard Sections */}

      <div className="dashboard-sections">

        {/* Source Health */}

        <section className="dashboard-panel">

          <div className="panel-header">
            <div>
              <h3>Source Health</h3>
              <p>
                Current status of configured job sources.
              </p>
            </div>
          </div>

          <div className="health-item">
            <div className="health-label">
              <span>Active</span>
              <strong>{data.stats.activeSources}</strong>
            </div>

            <div className="health-bar">
              <div
                className="health-bar-fill active"
                style={{ width: `${activePercentage}%` }}
              />
            </div>
          </div>

          <div className="health-item">
            <div className="health-label">
              <span>Paused</span>
              <strong>{data.stats.pausedSources}</strong>
            </div>

            <div className="health-bar">
              <div
                className="health-bar-fill paused"
                style={{ width: `${pausedPercentage}%` }}
              />
            </div>
          </div>

          <div className="health-item">
            <div className="health-label">
              <span>Errors</span>
              <strong>{data.stats.errorSources}</strong>
            </div>

            <div className="health-bar">
              <div
                className="health-bar-fill error"
                style={{ width: `${errorPercentage}%` }}
              />
            </div>
          </div>

        </section>

        {/* Quick Actions */}

        <section className="dashboard-panel">

          <div className="panel-header">
            <div>
              <h3>Quick Actions</h3>

              <p>
                Common administrative actions.
              </p>
            </div>
          </div>

          <div className="quick-actions">

            <button
              className="quick-action"
              onClick={() => onNavigate("sources")}
            >
              <div>
                <strong>Manage Sources</strong>

                <span>
                  Add, edit, pause, or remove sources.
                </span>
              </div>

              <span className="action-arrow">→</span>
            </button>

            <button
              className="quick-action"
              onClick={loadDashboard}
              disabled={loading}
            >
              <div>
                <strong>Refresh Dashboard</strong>

                <span>
                  Get the latest source statistics.
                </span>
              </div>

              <span className="action-arrow">↻</span>
            </button>

            <button
              className="quick-action"
              onClick={() => onNavigate("jobs")}
            >
              <div>
                <strong>View Jobs</strong>

                <span>
                  Open the job management section.
                </span>
              </div>

              <span className="action-arrow">→</span>
            </button>

          </div>

        </section>

      </div>
      {/* Source Overview */}

<section className="dashboard-panel source-overview">

  <div className="panel-header source-overview-header">
    <div>
      <h3>Source Overview</h3>

      <p>
        Sources that may require attention.
      </p>
    </div>

    <button
      className="secondary-button"
      onClick={() => onNavigate("sources")}
    >
      View All
    </button>
  </div>

  {overviewSources.length === 0 ? (
  <div className="empty-state">
    <div className="empty-state-icon">+</div>

    <strong>No sources available</strong>

    <p>
      Add a job source to start collecting jobs.
    </p>

    <button
      className="secondary-button"
      onClick={() => onNavigate("sources")}
    >
      Add Source
    </button>
  </div>
) : (
    <div className="source-overview-table">

      <div className="source-overview-header-row">
        <span>Source</span>
        <span>Type</span>
        <span>Status</span>
        <span>Jobs</span>
        <span>Last Sync</span>
      </div>

      {overviewSources.map((source) => (
        <div
  className={`source-overview-row ${
    source.status === "ERROR"
      ? "source-row-error"
      : ""
  }`}
  key={source.id}
>
          <div className="source-name">
            <strong>{source.name}</strong>
            <small>{source.identifier}</small>
          </div>

          <span className="source-type">
            {source.type.replace(
              "TELEGRAM_",
              "Telegram "
            )}
          </span>

          <span
            className={`status-badge status-${source.status.toLowerCase()}`}
          >
            {source.status}
          </span>

          <span>
            {source.totalJobsScraped}
          </span>

          <span className="last-sync">
            {source.lastSyncAt
              ? new Date(
                  source.lastSyncAt
                ).toLocaleString()
              : "Never"}
          </span>
        </div>
      ))}

    </div>
  )}

</section>

    </div>
  );
};

export default Dashboard;