import { useEffect, useState } from "react";

import { adminRequest } from "../services/adminApi";
import type {
  AdminJob,
  AdminJobsResponse,
} from "../types/job";

const Jobs = () => {
  const [jobs, setJobs] = useState<AdminJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
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
    if (data.jobs.length === 0 && page > 1) {
        setPage((current) => current - 1);
      }
  } catch (err) {
    setError(
      err instanceof Error
        ? err.message
        : "Failed to load jobs"
    );
  } finally {
    setLoading(false);
    setInitialLoading(false);
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

const handleEdit = (job: AdminJob) => {
  setEditingJob(job);
  setSelectedJob(null);
};
const handleCancelEdit = () => {
  setEditingJob(null);
};
const handleSaveEdit = async () => {
  if (!editingJob) return;

  try {
    setEditLoading(true);
    setError("");

    await adminRequest(
      `/api/admin/jobs/${editingJob.id}`,
      {
        method: "PUT",
        body: JSON.stringify({
          title: editingJob.title,
          company: editingJob.company,
          location: editingJob.location,
          category: editingJob.category,
          employmentType: editingJob.employmentType,
          experienceLevel: editingJob.experienceLevel,
          education: editingJob.education,
          salary: editingJob.salary,
          description: editingJob.description,
          requirements: editingJob.requirements,
          applyUrl: editingJob.applyUrl,
          applyEmail: editingJob.applyEmail,
          applyPhone: editingJob.applyPhone,
          isDirectContact: editingJob.isDirectContact,
        }),
      }
    );

    // Refresh the jobs list
    await loadJobs();

    // Close edit form
    setEditingJob(null);
  } catch (err) {
    setError(
      err instanceof Error
        ? err.message
        : "Failed to update job"
    );
  } finally {
    setEditLoading(false);
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
const handleDeleteJob = async (job: AdminJob) => {
  const confirmed = window.confirm(
    `Are you sure you want to delete "${job.title}"?`
  );

  if (!confirmed) return;

  try {
    setError("");

    await adminRequest(
      `/api/admin/jobs/${job.id}`,
      {
        method: "DELETE",
      }
    );

    // If the deleted job is currently selected
    if (selectedJob?.id === job.id) {
      setSelectedJob(null);
    }

    // Refresh the jobs list
    await loadJobs();
  } catch (err) {
    setError(
      err instanceof Error
        ? err.message
        : "Failed to delete job"
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

{editingJob && (
  <div className="job-edit-panel">
    <div className="job-edit-header">
      <div>
        <h2>Edit Job</h2>
        <p>Update the job information below.</p>
      </div>

      <button
        className="secondary-button"
        onClick={handleCancelEdit}
      >
        Cancel
      </button>
    </div>

    <div className="job-edit-form">
      <div className="form-group">
        <label>Title</label>
        <input
          type="text"
          value={editingJob.title}
          onChange={(e) =>
            setEditingJob({
              ...editingJob,
              title: e.target.value,
            })
          }
        />
      </div>

      <div className="form-group">
        <label>Company</label>
        <input
          type="text"
          value={editingJob.company}
          onChange={(e) =>
            setEditingJob({
              ...editingJob,
              company: e.target.value,
            })
          }
        />
      </div>

      <div className="form-group">
        <label>Location</label>
        <input
          type="text"
          value={editingJob.location || ""}
          onChange={(e) =>
            setEditingJob({
              ...editingJob,
              location: e.target.value,
            })
          }
        />
      </div>

      <div className="form-group">
        <label>Category</label>
        <input
          type="text"
          value={editingJob.category || ""}
          onChange={(e) =>
            setEditingJob({
              ...editingJob,
              category: e.target.value,
            })
          }
        />
      </div>

      <div className="form-group">
        <label>Employment Type</label>
        <input
          type="text"
          value={editingJob.employmentType || ""}
          onChange={(e) =>
            setEditingJob({
              ...editingJob,
              employmentType: e.target.value,
            })
          }
        />
      </div>

      <div className="form-group">
        <label>Experience Level</label>
        <select
          value={editingJob.experienceLevel}
          onChange={(e) =>
            setEditingJob({
              ...editingJob,
              experienceLevel: e.target.value,
            })
          }
        >
          <option value="ENTRY">Entry</option>
          <option value="JUNIOR">Junior</option>
          <option value="MID">Mid</option>
          <option value="SENIOR">Senior</option>
          <option value="NOT_SPECIFIED">Not Specified</option>
        </select>
      </div>

      <div className="form-group">
        <label>Education</label>
        <input
          type="text"
          value={editingJob.education || ""}
          onChange={(e) =>
            setEditingJob({
              ...editingJob,
              education: e.target.value,
            })
          }
        />
      </div>

      <div className="form-group">
        <label>Salary</label>
        <input
          type="text"
          value={editingJob.salary || ""}
          onChange={(e) =>
            setEditingJob({
              ...editingJob,
              salary: e.target.value,
            })
          }
        />
      </div>

      <div className="form-group">
        <label>Description</label>
        <textarea
          value={editingJob.description || ""}
          onChange={(e) =>
            setEditingJob({
              ...editingJob,
              description: e.target.value,
            })
          }
          rows={6}
        />
      </div>

      <div className="form-group">
        <label>Requirements</label>
        <textarea
          value={editingJob.requirements || ""}
          onChange={(e) =>
            setEditingJob({
              ...editingJob,
              requirements: e.target.value,
            })
          }
          rows={6}
        />
      </div>

      <div className="form-group">
        <label>Application URL</label>
        <input
          type="text"
          value={editingJob.applyUrl || ""}
          onChange={(e) =>
            setEditingJob({
              ...editingJob,
              applyUrl: e.target.value,
            })
          }
        />
      </div>

      <div className="form-group">
        <label>Application Email</label>
        <input
          type="email"
          value={editingJob.applyEmail || ""}
          onChange={(e) =>
            setEditingJob({
              ...editingJob,
              applyEmail: e.target.value,
            })
          }
        />
      </div>

      <div className="form-group">
        <label>Application Phone</label>
        <input
          type="text"
          value={editingJob.applyPhone || ""}
          onChange={(e) =>
            setEditingJob({
              ...editingJob,
              applyPhone: e.target.value,
            })
          }
        />
      </div>

      <div className="form-group checkbox-group">
        <label>
          <input
            type="checkbox"
            checked={editingJob.isDirectContact}
            onChange={(e) =>
              setEditingJob({
                ...editingJob,
                isDirectContact: e.target.checked,
              })
            }
          />
          Direct contact
        </label>
      </div>
      <div className="edit-form-actions">
          <button
            className="secondary-button"
            onClick={handleCancelEdit}
            disabled={editLoading}
          >
            Cancel
          </button>

          <button
            className="primary-button"
            onClick={handleSaveEdit}
            disabled={editLoading}
          >
            {editLoading ? "Saving..." : "Save Changes"}
          </button>
        </div>
    </div>
  </div>
)}
      <div className="jobs-table-header">
            <span>
                {totalJobs} {totalJobs === 1 ? "job" : "jobs"} found
            </span>
            </div>

      {initialLoading ? (
  <div className="dashboard-state">
    <div className="loading-spinner"></div>
    <p>Loading jobs...</p>
  </div>
) : jobs.length === 0 ? (
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
                        onClick={() => handleEdit(job)}
                      >
                        Edit
                    </button>
                    <button
                        className="table-action-button"
                        onClick={() => handleToggleStatus(job)}
                        >
                        {job.isActive ? "Deactivate" : "Activate"}
                    </button>
                    <button
                        className="table-action-button delete-button"
                        onClick={() => handleDeleteJob(job)}
                      >
                        Delete
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