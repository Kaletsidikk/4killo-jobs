import { useEffect, useState } from "react";

import { adminRequest } from "../services/adminApi";
import type {
  AdminJob,
  AdminJobsResponse,
} from "../types/job";

const Jobs = () => {
  const [jobs, setJobs] = useState<AdminJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
const [debouncedSearch, setDebouncedSearch] = useState("");
const [selectedJob, setSelectedJob] = useState<AdminJob | null>(null);
const [detailsLoading, setDetailsLoading] = useState(false);

const [statusFilter, setStatusFilter] = useState("");
const [experienceFilter, setExperienceFilter] = useState("");

const [editingJob, setEditingJob] = useState<AdminJob | null>(null);
const [editLoading, setEditLoading] = useState(false);

const [page, setPage] = useState(1);
const [totalPages, setTotalPages] = useState(1);
const [totalJobs, setTotalJobs] = useState(0);

const limit = 20;

  const loadJobs = async () => {
  try {
    setLoading(true);
    setError("");

    const params = new URLSearchParams();

    params.set("page", String(page));
    params.set("limit", String(limit));

    if (debouncedSearch.trim()) {
      params.set("search", debouncedSearch.trim());
    }

    if (statusFilter) {
      params.set("status", statusFilter);
    }

    if (experienceFilter) {
      params.set("experienceLevel", experienceFilter);
    }

    const data = await adminRequest<AdminJobsResponse>(
      `/api/admin/jobs?${params.toString()}`
    );

    setJobs(data.jobs);
    setTotalPages(data.pagination.totalPages);
    setTotalJobs(data.pagination.total);
  } catch (err) {
    setError(
      err instanceof Error
        ? err.message
        : "Failed to load jobs"
    );
  } finally {
    setLoading(false);
  }
};

const handleViewDetails = async (job: AdminJob) => {
  try {
    setDetailsLoading(true);
    setError("");
    setSelectedJob(job);

    const data = await adminRequest<{ job: AdminJob }>(
      `/api/admin/jobs/${job.id}`
    );

    setSelectedJob(data.job);
  } catch (err) {
    setError(
      err instanceof Error
        ? err.message
        : "Failed to load job details"
    );
  } finally {
    setDetailsLoading(false);
  }
};

const handleToggleStatus = async (job: AdminJob) => {
  const newStatus = !job.isActive;

  try {
    setError("");

    await adminRequest(
      `/api/admin/jobs/${job.id}/status`,
      {
        method: "PATCH",
        body: JSON.stringify({
          isActive: newStatus,
        }),
      }
    );

    await loadJobs();

    if (selectedJob?.id === job.id) {
      setSelectedJob({
        ...selectedJob,
        isActive: newStatus,
      });
    }
  } catch (err) {
    setError(
      err instanceof Error
        ? err.message
        : "Failed to update job status"
    );
  }
};

useEffect(() => {
  const timer = window.setTimeout(() => {
    setDebouncedSearch(search);
    setPage(1);
  }, 400);

  return () => {
    window.clearTimeout(timer);
  };
}, [search]);

 useEffect(() => {
  loadJobs();
}, [
  page,
  debouncedSearch,
  statusFilter,
  experienceFilter,
]);

  if (loading) {
    return <p>Loading jobs...</p>;
  }

  if (error) {
    return (
      <div>
        <p className="error-message">{error}</p>

        <button
          className="primary-button"
          onClick={loadJobs}
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="jobs-page">
      <div className="page-header">
        <div className="job-filters">
  <input
    type="text"
    placeholder="Search jobs..."
    value={search}
    onChange={(e) => setSearch(e.target.value)}
  />

  <select
    value={statusFilter}
    onChange={(e) => {
      setStatusFilter(e.target.value);
      setPage(1);
    }}
  >
    <option value="">All Statuses</option>
    <option value="active">Active</option>
    <option value="inactive">Inactive</option>
    <option value="all">All</option>
  </select>

  <select
    value={experienceFilter}
    onChange={(e) => {
      setExperienceFilter(e.target.value);
      setPage(1);
    }}
  >
    <option value="">All Experience Levels</option>
    <option value="ENTRY">Entry</option>
    <option value="JUNIOR">Junior</option>
    <option value="MID">Mid</option>
    <option value="SENIOR">Senior</option>
    <option value="NOT_SPECIFIED">
      Not Specified
    </option>
  </select>
</div>
        <div>
          <h2>Jobs</h2>
          <p>
            Manage and moderate job listings on 4Killo.
          </p>
        </div>

        <button
          className="primary-button"
          onClick={loadJobs}
        >
          ↻ Refresh
        </button>
      </div>
      {selectedJob && (
  <div className="job-details-card">
    <div className="job-details-header">
      <div>
        <h3>{selectedJob.title}</h3>
        <p>{selectedJob.company}</p>
      </div>

      <button
        className="secondary-button"
        onClick={() => setSelectedJob(null)}
      >
        Close
      </button>
    </div>

    {detailsLoading ? (
      <p>Loading job details...</p>
    ) : (
      <div className="job-details-content">
        <div className="job-detail-grid">

          <div className="job-detail-item">
            <span>Location</span>
            <strong>
              {selectedJob.location || "Not specified"}
            </strong>
          </div>

          <div className="job-detail-item">
            <span>Category</span>
            <strong>
              {selectedJob.category || "Not specified"}
            </strong>
          </div>

          <div className="job-detail-item">
            <span>Employment Type</span>
            <strong>
              {selectedJob.employmentType || "Not specified"}
            </strong>
          </div>

          <div className="job-detail-item">
            <span>Experience Level</span>
            <strong>
              {selectedJob.experienceLevel}
            </strong>
          </div>

          <div className="job-detail-item">
            <span>Education</span>
            <strong>
              {selectedJob.education || "Not specified"}
            </strong>
          </div>

          <div className="job-detail-item">
            <span>Salary</span>
            <strong>
              {selectedJob.salary || "Not specified"}
            </strong>
          </div>

          <div className="job-detail-item">
            <span>Deadline</span>
            <strong>
              {selectedJob.deadline
                ? new Date(
                    selectedJob.deadline
                  ).toLocaleDateString()
                : "No deadline"}
            </strong>
          </div>

          <div className="job-detail-item">
            <span>Status</span>
            <strong>
              {selectedJob.isActive
                ? "ACTIVE"
                : "INACTIVE"}
            </strong>
          </div>

          <div className="job-detail-item">
            <span>Saved By Users</span>
            <strong>
              {selectedJob._count?.savedBy ?? 0}
            </strong>
          </div>

          <div className="job-detail-item">
            <span>Direct Contact</span>
            <strong>
              {selectedJob.isDirectContact
                ? "Yes"
                : "No"}
            </strong>
          </div>

        </div>

        <div className="job-detail-section">
          <h4>Description</h4>
          <p>
            {selectedJob.description ||
              "No description provided."}
          </p>
        </div>

        <div className="job-detail-section">
          <h4>Requirements</h4>
          <p>
            {selectedJob.requirements ||
              "No requirements provided."}
          </p>
        </div>

        <div className="job-detail-section">
          <h4>Application Information</h4>

          {selectedJob.applyUrl && (
            <p>
              <strong>URL:</strong>{" "}
              <a
                href={selectedJob.applyUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {selectedJob.applyUrl}
              </a>
            </p>
          )}

          {selectedJob.applyEmail && (
            <p>
              <strong>Email:</strong>{" "}
              {selectedJob.applyEmail}
            </p>
          )}

          {selectedJob.applyPhone && (
            <p>
              <strong>Phone:</strong>{" "}
              {selectedJob.applyPhone}
            </p>
          )}

          {!selectedJob.applyUrl &&
            !selectedJob.applyEmail &&
            !selectedJob.applyPhone && (
              <p>No application information provided.</p>
            )}
        </div>

        <div className="job-detail-section">
          <h4>Sources</h4>

          {selectedJob.sources.length === 0 ? (
            <p>No sources linked to this job.</p>
          ) : (
            <div className="job-source-list">
              {selectedJob.sources.map(
                (source, index) => (
                  <div
                    className="job-source-item"
                    key={`${source.source.id}-${index}`}
                  >
                    <strong>
                      {source.source.name}
                    </strong>

                    <span>
                      {source.source.type}
                    </span>

                    {source.postUrl && (
                      <a
                        href={source.postUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View Original Post
                      </a>
                    )}
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </div>
    )}
  </div>
)}
      <div className="jobs-table-header">
            <span>
                {totalJobs} {totalJobs === 1 ? "job" : "jobs"} found
            </span>
            </div>

      {jobs.length === 0 ? (
        <div className="empty-state">
          <strong>No jobs found</strong>
          <p>
            There are currently no jobs available.
          </p>
        </div>
      ) : (
        
        <div className="sources-table-container">
          <table className="sources-table">
            <thead>
              <tr>
                <th>Job</th>
                <th>Company</th>
                <th>Location</th>
                <th>Category</th>
                <th>Experience</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {jobs.map((job) => (
                <tr key={job.id}>
                  <td>
                    <strong>{job.title}</strong>
                  </td>

                  <td>{job.company}</td>

                  <td>
                    {job.location || "Not specified"}
                  </td>

                  <td>
                    {job.category || "Not specified"}
                  </td>

                  <td>
                    {job.experienceLevel}
                  </td>

                  <td>
                    <span
                      className={`status-badge ${
                        job.isActive

                          ? "status-active"
                          : "status-paused"
                      }`}
                    >
                      {job.isActive
                        ? "ACTIVE"
                        : "INACTIVE"}
                    </span>
                  </td>
                  <td>
                    <button
                        className="table-action-button"
                        onClick={() => handleViewDetails(job)}
                    >
                        Details
                    </button>
                    <button
                        className="table-action-button"
                        onClick={() => handleToggleStatus(job)}
                        >
                        {job.isActive ? "Deactivate" : "Activate"}
                    </button>
                    </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        
      )}
      {totalPages > 1 && (
  <div className="pagination">
    <button
      className="secondary-button"
      disabled={page === 1 || loading}
      onClick={() => setPage((current) => current - 1)}
    >
      ← Previous
    </button>

    <span>
      Page {page} of {totalPages}
    </span>

    <button
      className="secondary-button"
      disabled={page === totalPages || loading}
      onClick={() => setPage((current) => current + 1)}
    >
      Next →
    </button>
  </div>
)}
    </div>
  );
};

export default Jobs;