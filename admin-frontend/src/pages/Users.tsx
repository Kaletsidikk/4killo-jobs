import { useEffect, useState } from "react";
import { adminRequest } from "../services/adminApi";

interface AdminUser {
  id: string;
  telegramId: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  createdAt: string;
  updatedAt: string;

  preference?: {
    language: string;
    categories: string[];
    locations: string[];
    experienceLevel: string;
    instantAlerts: boolean;
    digestAlerts: boolean;
  } | null;

  savedJobs?: {
    id: string;
    createdAt: string;
    job: {
      id: string;
      title: string;
      company: string;
      location: string | null;
      category: string | null;
      isActive: boolean;
      createdAt: string;
    };
  }[];

  _count?: {
    savedJobs: number;
  };
}

interface AdminUsersResponse {
  users: AdminUser[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

function Users() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [languageFilter, setLanguageFilter] = useState("");
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

const limit = 20;
  const loadUsers = async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString(),
            });
            if (debouncedSearch.trim()) {
                params.set("search", debouncedSearch.trim());
            }
            if (languageFilter) {
                params.set("language", languageFilter);
            }

            const data = await adminRequest<AdminUsersResponse>(
            `/api/admin/users?${params.toString()}`
            );

      setUsers(data.users);
      setTotalPages(data.pagination.totalPages);
      setTotalUsers(data.pagination.total);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load users"
      );
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  };
  const handleViewDetails = async (user: AdminUser) => {
  try {
    setDetailsLoading(true);
    setError("");
    setSelectedUser(null);

    const data = await adminRequest<{ user: AdminUser }>(
      `/api/admin/users/${user.id}`
    );

    setSelectedUser(data.user);
  } catch (err) {
    setError(
      err instanceof Error
        ? err.message
        : "Failed to load user details"
    );
  } finally {
    setDetailsLoading(false);
  }
};

  useEffect(() => {
    loadUsers();
  }, [page, debouncedSearch, languageFilter]);
  
  useEffect(() => {
  const timer = window.setTimeout(() => {
    setDebouncedSearch(search);
    setPage(1);
  }, 400);

  return () => window.clearTimeout(timer);
}, [search]);

  if (error && initialLoading) {
  return (
    <div className="dashboard-state">
      <p>{error}</p>

      <button
        className="primary-button"
        onClick={loadUsers}
      >
        Try Again
      </button>
    </div>
  );
}

  return (
    <div className="users-page">
      
<div className="users-header">
  <div>
    <h2>Users</h2>
    <span>Total Users: {totalUsers}</span>
  </div>
<div className="users-actions">
  <div className="users-filters">
    <input
      type="text"
      placeholder="Search users..."
      value={search}
      onChange={(e) => setSearch(e.target.value)}
    />

    <select
      value={languageFilter}
      onChange={(e) => {
        setLanguageFilter(e.target.value);
        setPage(1);
      }}
    >
      <option value="">All Languages</option>
      <option value="EN">English</option>
      <option value="AM">Amharic</option>
    </select>
  </div>
  <button
      className="primary-button"
      onClick={loadUsers}
      disabled={loading}
    >
       {loading ? "Refreshing..." : "↻ Refresh"}
    </button>
</div>
</div>
{initialLoading ? (
  <div className="dashboard-state">
    <div className="loading-spinner"></div>
    <p>Loading users...</p>
  </div>
) : users.length === 0 ? (
  <p>No users found.</p>
) : (
  <div className="users-table-container">
    {selectedUser && (
  <div className="user-details-panel">
    <div className="user-details-header">
      <div>
        <h2>User Details</h2>
        <p>
          {selectedUser.firstName || "Unknown"}{" "}
          {selectedUser.lastName || ""}
        </p>
      </div>

      <button
        className="secondary-button"
        onClick={() => setSelectedUser(null)}
      >
        Close
      </button>
    </div>

    {detailsLoading ? (
      <p>Loading user details...</p>
    ) : (
      <>
        <div className="user-details-section">
          <h3>Basic Information</h3>

          <div className="user-details-grid">
            <div>
              <strong>First Name</strong>
              <p>{selectedUser.firstName || "Not provided"}</p>
            </div>

            <div>
              <strong>Last Name</strong>
              <p>{selectedUser.lastName || "Not provided"}</p>
            </div>

            <div>
              <strong>Username</strong>
              <p>
                {selectedUser.username
                  ? `@${selectedUser.username}`
                  : "No username"}
              </p>
            </div>

            <div>
              <strong>Telegram ID</strong>
              <p>{selectedUser.telegramId}</p>
            </div>

            <div>
              <strong>Joined</strong>
              <p>
                {new Date(
                  selectedUser.createdAt
                ).toLocaleDateString()}
              </p>
            </div>

            <div>
              <strong>Saved Jobs</strong>
              <p>
                {selectedUser._count?.savedJobs ?? 0}
              </p>
            </div>
          </div>
        </div>
<div className="user-details-section">
  <h3>Saved Jobs</h3>

  {selectedUser.savedJobs &&
  selectedUser.savedJobs.length > 0 ? (
    <div className="saved-jobs-list">
      {selectedUser.savedJobs.map((savedJob) => (
        <div
          key={savedJob.id}
          className="saved-job-card"
        >
          <div className="saved-job-info">
            <h4>{savedJob.job.title}</h4>

            <p>
              {savedJob.job.company}
              {savedJob.job.location
                ? ` • ${savedJob.job.location}`
                : ""}
            </p>

            {savedJob.job.category && (
              <span className="saved-job-category">
                {savedJob.job.category}
              </span>
            )}
          </div>

          <div className="saved-job-meta">
            <span
              className={
                savedJob.job.isActive
                  ? "job-status active"
                  : "job-status inactive"
              }
            >
              {savedJob.job.isActive
                ? "Active"
                : "Inactive"}
            </span>

            <small>
              Saved{" "}
              {new Date(
                savedJob.createdAt
              ).toLocaleDateString()}
            </small>
          </div>
        </div>
      ))}
    </div>
  ) : (
    <p>This user has not saved any jobs.</p>
  )}
</div>
        <div className="user-details-section">
          <h3>Preferences</h3>

          {selectedUser.preference ? (
            <div className="user-details-grid">
              <div>
                <strong>Language</strong>
                <p>{selectedUser.preference.language}</p>
              </div>

              <div>
                <strong>Experience Level</strong>
                <p>
                  {selectedUser.preference.experienceLevel}
                </p>
              </div>

              <div>
                <strong>Categories</strong>
                <p>
                  {selectedUser.preference.categories?.length
                    ? selectedUser.preference.categories.join(", ")
                    : "None"}
                </p>
              </div>

              <div>
                <strong>Locations</strong>
                <p>
                  {selectedUser.preference.locations?.length
                    ? selectedUser.preference.locations.join(", ")
                    : "None"}
                </p>
              </div>

              <div>
                <strong>Instant Alerts</strong>
                <p>
                  {selectedUser.preference.instantAlerts
                    ? "Enabled"
                    : "Disabled"}
                </p>
              </div>

              <div>
                <strong>Digest Alerts</strong>
                <p>
                  {selectedUser.preference.digestAlerts
                    ? "Enabled"
                    : "Disabled"}
                </p>
              </div>
            </div>
          ) : (
            <p>No preferences configured.</p>
          )}
        </div>
      </>
    )}
  </div>
)}


    <table className="users-table">
      <thead>
        <tr>
          <th>User</th>
          <th>Username</th>
          <th>Telegram ID</th>
          <th>Joined</th>
          <th>Actions</th>
        </tr>
      </thead>

      <tbody>
        {users.map((user) => (
          <tr key={user.id}>
            <td>
              {user.firstName || "Unknown"}{" "}
              {user.lastName || ""}
            </td>

            <td>
              {user.username
                ? `@${user.username}`
                : "No username"}
            </td>

            <td>{user.telegramId}</td>

            <td>
              {new Date(user.createdAt).toLocaleDateString()}
            </td>
            <td>
                <button
                    className="table-action-button"
                    onClick={() => handleViewDetails(user)}
                >
                    View
                </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
     {/* Pagination goes here */}
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
{/* //details goes here */}

  </div>
)}
     
    </div>
  );
}

export default Users;