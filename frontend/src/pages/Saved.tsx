import { useEffect, useState } from "react";
import { Bookmark, MapPin, BriefcaseBusiness, Clock3, CheckCircle, ArrowRight } from "lucide-react";
import { getSavedJobs, unsaveJob } from "../services/jobs";
import type { Job } from "../types/job";

interface SavedProps {
  onJobSelect: (job: Job) => void;
}

function Saved({ onJobSelect }: SavedProps) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadSaved();
  }, []);

  const loadSaved = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await getSavedJobs();
      setJobs(response.data || []);
    } catch (err) {
      console.error("Failed to load saved jobs:", err);
      // If unauthenticated, show empty state instead of crash
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUnsave = async (jobId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await unsaveJob(jobId);
      setJobs((prev) => prev.filter((j) => j.id !== jobId));
    } catch (err) {
      console.error("Failed to unsave job:", err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24 text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <Bookmark size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Saved Jobs</h1>
            <p className="text-xs text-slate-500">
              {jobs.length} {jobs.length === 1 ? "position" : "positions"} bookmarked
            </p>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="px-5 pt-4">
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-32 animate-pulse rounded-2xl bg-slate-200/70" />
            ))}
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-center">
            <p className="text-sm font-medium text-red-600">{error}</p>
          </div>
        )}

        {!loading && !error && jobs.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <Bookmark size={22} />
            </div>
            <h2 className="mt-3 text-sm font-bold text-slate-700">No saved jobs yet</h2>
            <p className="mt-1 text-xs text-slate-400">
              Tap the bookmark icon on any job card in Home or For You to save it for later.
            </p>
          </div>
        )}

        {!loading && !error && jobs.length > 0 && (
          <div className="space-y-3">
            {jobs.map((job) => (
              <article
                key={job.id}
                onClick={() => onJobSelect(job)}
                className="cursor-pointer rounded-2xl border border-slate-200/90 bg-white p-4.5 shadow-sm transition active:scale-[0.99] hover:border-emerald-300"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-base font-bold text-slate-950 truncate">
                      {job.title}
                    </h2>
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                      <span className="font-medium text-slate-700">{job.company}</span>
                      {job.sources.length > 0 && (
                        <CheckCircle size={13} className="text-sky-500" />
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => handleUnsave(job.id, e)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 transition hover:bg-red-50 hover:text-red-600"
                    title="Remove from saved"
                  >
                    <Bookmark size={18} fill="currentColor" />
                  </button>
                </div>

                {/* Metadata Tags */}
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                  <span className="flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1">
                    <MapPin size={12} className="text-slate-400" />
                    {job.location}
                  </span>
                  <span className="flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1">
                    <BriefcaseBusiness size={12} className="text-slate-400" />
                    {job.employmentType || "Full-time"}
                  </span>
                  {job.deadline && (
                    <span className="flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1">
                      <Clock3 size={12} className="text-slate-400" />
                      {new Date(job.deadline).toLocaleDateString()}
                    </span>
                  )}
                </div>

                {/* Footer */}
                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                  <span className="font-semibold text-emerald-700">
                    {job.salary || "Negotiable"}
                  </span>
                  <span className="flex items-center gap-1 font-semibold text-blue-600">
                    View Details
                    <ArrowRight size={13} />
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default Saved;