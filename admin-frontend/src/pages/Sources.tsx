import { useEffect, useState } from "react";

import { adminRequest } from "../services/adminApi";
import type {
  Source,
  SourcesResponse,
  SourceType,
  SourceStatus,
} from "../types/source";

const Sources = () => {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingSource, setEditingSource] =
  useState<Source | null>(null);
  const [selectedSource, setSelectedSource] =
  useState<Source | null>(null);

const [sourceDetails, setSourceDetails] =
  useState<any>(null);

const [detailsLoading, setDetailsLoading] =
  useState(false);

  const [name, setName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [type, setType] =
    useState<SourceType>("TELEGRAM_CHANNEL");

  useEffect(() => {
  const timer = window.setTimeout(() => {
    setDebouncedSearch(search);
  }, 400);

  return () => {
    window.clearTimeout(timer);
  };
}, [search]);
 

  const loadSources = async () => {
    try {
      setLoading(true);
      setError("");

    //   const data = await adminRequest<SourcesResponse>(
    //     "/api/admin/sources"
    //   );
    const params = new URLSearchParams();

if (debouncedSearch.trim()) {
  params.set("search", debouncedSearch.trim());
}

if (typeFilter) {
  params.set("type", typeFilter);
}

if (statusFilter) {
  params.set("status", statusFilter);
}

const queryString = params.toString();

const data = await adminRequest<SourcesResponse>(
  `/api/admin/sources${
    queryString ? `?${queryString}` : ""
  }`
);

      setSources(data.sources);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load sources"
      );
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  };
  

  useEffect(() => {
    loadSources();
  }, [debouncedSearch, typeFilter, statusFilter]);

  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !identifier.trim()) {
      setError("Name and identifier are required.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      await adminRequest<Source>("/api/admin/sources", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          identifier: identifier.trim(),
          type,
          status: "ACTIVE" as SourceStatus,
        }),
      });

      setName("");
      setIdentifier("");
      setType("TELEGRAM_CHANNEL");
      setShowAddForm(false);

      await loadSources();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to add source"
      );
    } finally {
      setSaving(false);
    }
  };
  const handleEditSource = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!editingSource) {
    return;
  }

  if (!name.trim() || !identifier.trim()) {
    setError("Name and identifier are required.");
    return;
  }

  try {
    setSaving(true);
    setError("");

    await adminRequest<Source>(
      `/api/admin/sources/${editingSource.id}`,
      {
        method: "PUT",
        body: JSON.stringify({
          name: name.trim(),
          identifier: identifier.trim(),
          type,
          status: editingSource.status,
        }),
      }
    );

    setEditingSource(null);
    setName("");
    setIdentifier("");
    setType("TELEGRAM_CHANNEL");

    await loadSources();
  } catch (err) {
    setError(
      err instanceof Error
        ? err.message
        : "Failed to update source"
    );
  } finally {
    setSaving(false);
  }
};

const handleToggleStatus = async (source: Source) => {
  const newStatus: SourceStatus =
    source.status === "ACTIVE" ? "PAUSED" : "ACTIVE";

  try {
    setError("");

    await adminRequest<Source>(
      `/api/admin/sources/${source.id}/status`,
      {
        method: "PATCH",
        body: JSON.stringify({
          status: newStatus,
        }),
      }
    );

    await loadSources();
  } catch (err) {
    setError(
      err instanceof Error
        ? err.message
        : "Failed to update source status"
    );
  }
};

const handleSyncSource = async (source: Source) => {
  try {
    setError("");

    await adminRequest<Source>(
      `/api/admin/sources/${source.id}/sync`,
      {
        method: "POST",
      }
    );

    await loadSources();
  } catch (err) {
    setError(
      err instanceof Error
        ? err.message
        : "Failed to sync source"
    );
  }
};

const handleDeleteSource = async (source: Source) => {
  const confirmed = window.confirm(
    `Are you sure you want to delete "${source.name}"?`
  );

  if (!confirmed) {
    return;
  }

  try {
    setError("");

    await adminRequest(
      `/api/admin/sources/${source.id}`,
      {
        method: "DELETE",
      }
    );

    await loadSources();
  } catch (err) {
    setError(
      err instanceof Error
        ? err.message
        : "Failed to delete source"
    );
  }
};

const handleViewDetails = async (source: Source) => {
  try {
    setDetailsLoading(true);
    setError("");

    setSelectedSource(source);

    const data = await adminRequest(
      `/api/admin/sources/${source.id}`
    );

    setSourceDetails(data);
  } catch (err) {
    setError(
      err instanceof Error
        ? err.message
        : "Failed to load source details"
    );
  } finally {
    setDetailsLoading(false);
  }
};

//error handling
if (error && initialLoading) {
  return (
    <div className="dashboard-state">
      <p>{error}</p>

      <button
        className="primary-button"
        onClick={loadSources}
      >
        Try Again
      </button>
    </div>
  );
}
  return (
    <div className="sources-page">
      <div className="page-header">
        <div>
          <h2>Sources</h2>
          <p>
            Manage the sources used to collect job postings.
          </p>
        </div>
         <div className="sources-actions">
         <button
            className="secondary-button"
            onClick={loadSources}
            disabled={loading}
          >
            {loading ? "Refreshing..." : "↻ Refresh"}
          </button>
        <button
          className="primary-button"
          onClick={() => {
            setError("");
            setShowAddForm(true);
          }}
        >
          Add Source
        </button>
      </div>
      </div>
      {/* //add the filter controls */}
     <div className="source-filters">
  <input
    type="text"
    placeholder="Search sources..."
    value={search}
    onChange={(e) => setSearch(e.target.value)}
  />

  <select
    value={typeFilter}
    onChange={(e) => setTypeFilter(e.target.value)}
  >
    <option value="">All Types</option>
    <option value="TELEGRAM_CHANNEL">
      Telegram Channel
    </option>
    <option value="TELEGRAM_GROUP">
      Telegram Group
    </option>
    <option value="WEBSITE">
      Website
    </option>
  </select>

  <select
    value={statusFilter}
    onChange={(e) => setStatusFilter(e.target.value)}
  >
    <option value="">All Statuses</option>
    <option value="ACTIVE">Active</option>
    <option value="PAUSED">Paused</option>
    <option value="ERROR">Error</option>
  </select>
</div>
      {error && (
        <p className="error-message">
          {error}
        </p>
      )}

      {(showAddForm || editingSource) && (
        <div className="source-form-card">
          <h3>{editingSource ? "Edit Source" : "Add Source"}</h3>

          <form 
            onSubmit={
                editingSource
                ? handleEditSource
                : handleAddSource
            }>
            <div className="form-group">
              <label htmlFor="source-name">
                Source Name
              </label>

              <input
                id="source-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ethio Jobs Telegram"
              />
            </div>

            <div className="form-group">
              <label htmlFor="source-identifier">
                Identifier
              </label>

              <input
                id="source-identifier"
                type="text"
                value={identifier}
                onChange={(e) =>
                  setIdentifier(e.target.value)
                }
                placeholder="e.g. @ethiojobs"
              />
            </div>

            <div className="form-group">
              <label htmlFor="source-type">
                Source Type
              </label>

              <select
                id="source-type"
                value={type}
                onChange={(e) =>
                  setType(e.target.value as SourceType)
                }
              >
                <option value="TELEGRAM_CHANNEL">
                  Telegram Channel
                </option>

                <option value="TELEGRAM_GROUP">
                  Telegram Group
                </option>

                <option value="WEBSITE">
                  Website
                </option>
              </select>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                    setShowAddForm(false);
                    setEditingSource(null);
                    setName("");
                    setIdentifier("");
                    setType("TELEGRAM_CHANNEL");
                }}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="primary-button"
                disabled={saving}
              >
                {saving
                    ? editingSource
                        ? "Saving..."
                        : "Adding..."
                    : editingSource
                    ? "Save Changes"
                    : "Add Source"}
              </button>
            </div>
          </form>
        </div>
      )}

      {selectedSource && (
  <div className="source-details-card">
    <div className="source-details-header">
      <div>
        <h3>
          {selectedSource.name}
        </h3>

        <p>
          {selectedSource.identifier}
        </p>
      </div>

      <button
        className="secondary-button"
        onClick={() => {
          setSelectedSource(null);
          setSourceDetails(null);
        }}
      >
        Close
      </button>
    </div>

    {detailsLoading ? (
      <p>Loading source details...</p>
    ) : sourceDetails ? (
      <div className="source-details-content">
        <div className="source-detail-item">
          <span>Type</span>
          <strong>
            {sourceDetails.source?.type ??
              selectedSource.type}
          </strong>
        </div>

        <div className="source-detail-item">
          <span>Status</span>
          <strong>
            {sourceDetails.source?.status ??
              selectedSource.status}
          </strong>
        </div>

        <div className="source-detail-item">
          <span>Total Jobs Scraped</span>
          <strong>
            {sourceDetails.source
              ?.totalJobsScraped ??
              selectedSource.totalJobsScraped}
          </strong>
        </div>

        <div className="source-detail-item">
          <span>Last Sync</span>
          <strong>
            {sourceDetails.source?.lastSyncAt
              ? new Date(
                  sourceDetails.source.lastSyncAt
                ).toLocaleString()
              : "Never"}
          </strong>
        </div>

        {sourceDetails.jobs && (
          <div className="source-jobs">
            <h4>Recent Jobs</h4>

            {sourceDetails.jobs.length === 0 ? (
              <p>No jobs linked to this source.</p>
            ) : (
              <div>
                {sourceDetails.jobs.map(
                  (job: any) => (
                    <div
                      className="source-job-item"
                      key={job.id}
                    >
                      <strong>
                        {job.title}
                      </strong>

                      <span>
                        {job.company}
                      </span>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        )}
      </div>
    ) : null}
  </div>
)}

      <div className="sources-table-container">
            {initialLoading ? (
              <div className="dashboard-state">
                <div className="loading-spinner"></div>
                <p>Loading sources...</p>
              </div>
            ) : sources.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">⌕</div>
                <h3>No sources found</h3>
                <p>
                  No sources match your current search or filter.
                </p>
              </div>
            ) : (
          <table className="sources-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Identifier</th>
                <th>Type</th>
                <th>Status</th>
                <th>Jobs</th>
                <th>Last Sync</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {sources.map((source) => (
                <tr key={source.id}>
                  <td>{source.name}</td>
                  <td>{source.identifier}</td>
                  <td>{source.type}</td>

                  <td>
                    <span
                      className={`status-badge status-${source.status.toLowerCase()}`}
                    >
                      {source.status}
                    </span>
                  </td>

                  <td>{source.totalJobsScraped}</td>

                  <td>
                    {source.lastSyncAt
                      ? new Date(
                          source.lastSyncAt
                        ).toLocaleString()
                      : "Never"}
                  </td>
                  <td>
                    <button
                        className="table-action-button"
                        onClick={() => handleViewDetails(source)}
                        >
                        Details
                    </button>
                      <button
                        className="table-action-button"
                        onClick={() => {
                        setError("");
                        setShowAddForm(false);

                        setEditingSource(source);
                        setName(source.name);
                        setIdentifier(source.identifier);
                        setType(source.type);
                              }}
                         >
                               Edit
                      </button>
                      <button
                        className="table-action-button"
                        onClick={() => handleToggleStatus(source)}
                        disabled={source.status === "ERROR"}
                        >
                        {source.status === "ACTIVE" ? "Pause" : "Activate"}
                      </button>
                      <button
                        className="table-action-button"
                        onClick={() => handleSyncSource(source)}
                        >
                        Sync
                      </button>
                      <button
                        className="delete-button"
                        onClick={() => handleDeleteSource(source)}
                        >
                        Delete
                     </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Sources;