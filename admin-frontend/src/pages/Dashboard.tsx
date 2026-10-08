import { useEffect, useState } from "react";

import { adminRequest } from "../services/adminApi";
import type { SourcesResponse } from "../types/source";
import type { AdminMetrics } from "../types/metrics";

interface DashboardProps {
  onNavigate: (page: string) => void;
}

const Dashboard = ({ onNavigate }: DashboardProps) => {
  const [data, setData] = useState<SourcesResponse | null>(null);
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadDashboard = async () => {
  try {
    setLoading(true);
    setError("");

    const [sourcesResult, metricsResult] = await Promise.all([
      adminRequest<SourcesResponse>("/api/admin/sources"),
      adminRequest<AdminMetrics>("/api/admin/metrics"),
    ]);

    setData(sourcesResult);
    setMetrics(metricsResult);
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

 if (loading && (!data || !metrics)) {
    return (
      <div className="dashboard-state">
        <div className="loading-spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

 if (error && (!data || !metrics)) {
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

  if (!data || !metrics) {
    return (
      <div className="dashboard-state">
        <p>No dashboard data available.</p>
      </div>
    );
  }

  const totalSources = metrics.summary.sources.total || 1;

  const activePercentage =
  (metrics.summary.sources.active / totalSources) * 100;

  const pausedPercentage =
  (metrics.summary.sources.paused / totalSources) * 100;

  const errorPercentage =
  (metrics.summary.sources.error / totalSources) * 100;
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
    <span>Total Jobs</span>
    <strong>{metrics.summary.jobs.total}</strong>
    <small>
      {metrics.summary.jobs.active} active jobs
    </small>
  </div>

  <div className="stat-card">
    <span>Jobs Added (7d)</span>
    <strong>{metrics.summary.jobs.addedLast7d}</strong>
    <small>
      {metrics.summary.jobs.addedLast24h} added in the last 24 hours
    </small>
  </div>

  <div className="stat-card">
    <span>Total Users</span>
    <strong>{metrics.summary.users.total}</strong>
    <small>
      {metrics.summary.users.newLast7d} new users this week
    </small>
  </div>

  <div className="stat-card">
    <span>Saved Jobs</span>
    <strong>{metrics.summary.engagement.totalBookmarks}</strong>
    <small>
      Total bookmarked jobs
    </small>
  </div>

  <div className="stat-card">
    <span>Total Sources</span>
    <strong>{metrics.summary.sources.total}</strong>
    <small>
      {metrics.summary.sources.active} active sources
    </small>
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
              <strong>{metrics.summary.sources.active}</strong>
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
              <strong>{metrics.summary.sources.paused}</strong>
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
              <strong>{metrics.summary.sources.error}</strong>
            </div>

            <div className="health-bar">
              <div
                className="health-bar-fill error"
                style={{ width: `${errorPercentage}%` }}
              />
            </div>
          </div>
        <div className="scraped-total">
          <span>Total Jobs Scraped</span>
          <strong>
            {metrics.summary.sources.totalScrapedAllTime}
          </strong>
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
      {/* Platform Overview */}

<div className="dashboard-sections">

  {/* Job Overview */}

  <section className="dashboard-panel">

    <div className="panel-header">
      <div>
        <h3>Job Overview</h3>
        <p>
          Current job activity across the platform.
        </p>
      </div>
    </div>

    <div className="metrics-grid">

      <div>
        <strong>Active Jobs</strong>
        <p>{metrics.summary.jobs.active}</p>
      </div>

      <div>
        <strong>Inactive Jobs</strong>
        <p>{metrics.summary.jobs.inactive}</p>
      </div>

      <div>
        <strong>Added Last 24 Hours</strong>
        <p>{metrics.summary.jobs.addedLast24h}</p>
      </div>

      <div>
        <strong>Added Last 7 Days</strong>
        <p>{metrics.summary.jobs.addedLast7d}</p>
      </div>

    </div>

  </section>

  {/* User Engagement */}

  <section className="dashboard-panel">

    <div className="panel-header">
      <div>
        <h3>User Engagement</h3>
        <p>
          User activity and notification preferences.
        </p>
      </div>
    </div>

    <div className="metrics-grid">

      <div>
        <strong>Total Users</strong>
        <p>{metrics.summary.users.total}</p>
      </div>

      <div>
        <strong>New Users (7d)</strong>
        <p>{metrics.summary.users.newLast7d}</p>
      </div>

      <div>
        <strong>Users With Alerts</strong>
        <p>{metrics.summary.users.withAlertsEnabled}</p>
      </div>

      <div>
        <strong>Saved Jobs</strong>
        <p>{metrics.summary.engagement.totalBookmarks}</p>
      </div>

    </div>

  </section>

</div>
{/* Job Breakdowns */}

<div className="dashboard-sections">

  {/* Job Categories */}

  <section className="dashboard-panel">

    <div className="panel-header">
      <div>
        <h3>Top Job Categories</h3>
        <p>
          Categories with the most collected jobs.
        </p>
      </div>
    </div>

    {metrics.breakdowns.categories.length === 0 ? (
      <p className="empty-text">
        No category data available.
      </p>
    ) : (
      <div className="breakdown-list">
        {metrics.breakdowns.categories.map((item) => (
          <div
            className="breakdown-item"
            key={item.category ?? "unknown"}
          >
            <span>
              {item.category || "Unknown"}
            </span>

            <strong>{item.count}</strong>
          </div>
        ))}
      </div>
    )}

  </section>

  {/* Job Locations */}

  <section className="dashboard-panel">

    <div className="panel-header">
      <div>
        <h3>Top Job Locations</h3>
        <p>
          Locations with the most collected jobs.
        </p>
      </div>
    </div>

    {metrics.breakdowns.locations.length === 0 ? (
      <p className="empty-text">
        No location data available.
      </p>
    ) : (
      <div className="breakdown-list">
        {metrics.breakdowns.locations.map((item) => (
          <div
            className="breakdown-item"
            key={item.location ?? "unknown"}
          >
            <span>
              {item.location || "Unknown"}
            </span>

            <strong>{item.count}</strong>
          </div>
        ))}
      </div>
    )}

  </section>

</div>
{/* Source Types */}

<section className="dashboard-panel source-types-panel">

  <div className="panel-header">
    <div>
      <h3>Source Types</h3>
      <p>
        Distribution of configured job sources by type.
      </p>
    </div>
  </div>

  {metrics.breakdowns.sourceTypes.length === 0 ? (
    <p className="empty-text">
      No source type data available.
    </p>
  ) : (
    <div className="breakdown-list">
      {metrics.breakdowns.sourceTypes.map((item) => (
        <div
          className="breakdown-item"
          key={item.type}
        >
          <span>
            {item.type.replaceAll("_", " ")}
          </span>

          <strong>{item.count}</strong>
        </div>
      ))}
    </div>
  )}

</section>

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