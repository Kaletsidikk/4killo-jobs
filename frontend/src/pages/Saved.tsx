import { useEffect, useState } from "react";
import {
  Bookmark,
  MapPin,
  BriefcaseBusiness,
} from "lucide-react";
import type { Job } from "../types/job";
import {
  getSavedJobs,
  unsaveJob,
} from "../services/jobs";

function Saved() {
  const [savedJobs, setSavedJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingJobId, setRemovingJobId] = useState<string | null>(null);

  useEffect(() => {
    const loadSavedJobs = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await getSavedJobs();

        setSavedJobs(response.data);
      } catch (err) {
        console.error("Failed to load saved jobs:", err);

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load saved jobs"
        );
      } finally {
        setLoading(false);
      }
    };

    loadSavedJobs();
  }, []);

  const handleRemove = async (jobId: string) => {
    try {
      setRemovingJobId(jobId);
      setError(null);

      await unsaveJob(jobId);

      setSavedJobs((currentJobs) =>
        currentJobs.filter((job) => job.id !== jobId)
      );
    } catch (err) {
      console.error("Failed to remove saved job:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to remove saved job"
      );
    } finally {
      setRemovingJobId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24 text-slate-900">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white px-5 py-4">
        <h1 className="text-xl font-bold">
          Saved Jobs
        </h1>

        <p className="mt-1 text-xs text-slate-500">
          Jobs you've bookmarked
        </p>
      </header>

      {/* Jobs */}
      <main className="space-y-3 px-5 py-5">
        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <p className="text-sm text-slate-500">
              Loading saved jobs...
            </p>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-white p-8 text-center">
            <h2 className="text-sm font-semibold text-red-600">
              Failed to load saved jobs
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              {error}
            </p>
          </div>
        ) : savedJobs.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
              <Bookmark
                size={22}
                className="text-slate-400"
              />
            </div>

            <h2 className="mt-4 text-sm font-semibold text-slate-900">
              No saved jobs
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Bookmark jobs you are interested in and they
              will appear here.
            </p>
          </div>
        ) : (
          savedJobs.map((job) => (
            <article
              key={job.id}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              {/* Company + bookmark */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-xs font-semibold text-slate-900">
                    {job.company}
                  </h3>

                  <h2 className="mt-2 text-base font-medium text-slate-950">
                    {job.title}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemove(job.id)}
                  disabled={removingJobId === job.id}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label={`Remove ${job.title} from saved jobs`}
                >
                  <Bookmark
                    size={19}
                    fill="currentColor"
                  />
                </button>
              </div>

              {/* Job information */}
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] text-slate-500">
                <span className="flex items-center gap-1">
                  <MapPin size={13} />
                  {job.location}
                </span>

                <span className="flex items-center gap-1">
                  <BriefcaseBusiness size={13} />
                  {job.category}
                </span>

                {job.employmentType && (
                  <span>
                    {job.employmentType}
                  </span>
                )}
              </div>
            </article>
          ))
        )}
      </main>
    </div>
  );
}

export default Saved;

