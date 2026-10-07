import { useEffect, useState } from "react";
import { Sparkles, MapPin, BriefcaseBusiness, Clock3, Bookmark, CheckCircle, ArrowRight } from "lucide-react";
import { getForYouJobs, getJobs, saveJob, unsaveJob } from "../services/jobs";
import { getPreferences } from "../services/preferences";
import type { Job } from "../types/job";

interface ForYouProps {
  onJobSelect: (job: Job) => void;
}

function ForYou({ onJobSelect }: ForYouProps) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isPersonalized, setIsPersonalized] = useState(false);
  const [activePreferences, setActivePreferences] = useState<{
    categories?: string[];
    locations?: string[];
    experienceLevel?: string;
  } | null>(null);

  useEffect(() => {
    loadRecommendedJobs();
  }, []);

  const loadRecommendedJobs = async () => {
    try {
      setLoading(true);
      setError("");

      // 1. Retrieve user preferences (from backend or local cache)
      const prefs = await getPreferences();
      if (prefs) {
        setActivePreferences({
          categories: prefs.categories,
          locations: prefs.locations,
          experienceLevel: prefs.experienceLevel,
        });
      }

      // 2. Fetch jobs ranked against these preferences
      try {
        const response = await getForYouJobs(1, 20, {
          categories: prefs?.categories,
          locations: prefs?.locations,
          experienceLevel: prefs?.experienceLevel,
        });
        if (response.data && response.data.length > 0) {
          setJobs(response.data);
          setIsPersonalized(true);
          return;
        }
      } catch (authErr) {
        console.warn("Ranked feed fetch issue, falling back to top jobs:", authErr);
      }

      // Fallback: Show latest verified active jobs
      const fallbackResponse = await getJobs({ page: 1, limit: 15 });
      setJobs(fallbackResponse.data || []);
      setIsPersonalized(false);
    } catch (err) {
      console.error("Failed to load jobs:", err);
      setError("Unable to load recommendations. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSave = async (job: Job, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (job.isSaved) {
        await unsaveJob(job.id);
      } else {
        await saveJob(job.id);
      }

      setJobs((prev) =>
        prev.map((item) =>
          item.id === job.id ? { ...item, isSaved: !item.isSaved } : item
        )
      );
    } catch (err) {
      console.error("Failed to toggle save:", err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24 text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Sparkles size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">For You</h1>
            <p className="text-xs text-slate-500">
              {isPersonalized ? "Curated to your preferences" : "Featured opportunities in Ethiopia"}
            </p>
          </div>
        </div>

        {/* Active preference badges */}
        {activePreferences && activePreferences.categories && activePreferences.categories.length > 0 && (
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5 overflow-x-auto pt-1">
            <span className="text-[11px] font-semibold text-slate-400">Matched to:</span>
            {activePreferences.categories.slice(0, 3).map((cat) => (
              <span key={cat} className="rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                {cat}
              </span>
            ))}
            {activePreferences.locations && activePreferences.locations.length > 0 && (
              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                📍 {activePreferences.locations[0]}
              </span>
            )}
          </div>
        )}
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
            <button
              onClick={loadRecommendedJobs}
              className="mt-3 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white"
            >
              Try Again
            </button>
          </div>
        )}

        {!loading && !error && jobs.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <p className="text-sm font-medium text-slate-600">No recommended jobs yet.</p>
            <p className="mt-1 text-xs text-slate-400">
              Complete your profile preferences to receive matched jobs.
            </p>
          </div>
        )}

        {!loading && !error && (
          <div className="space-y-3">
            {jobs.map((job) => (
              <article
                key={job.id}
                onClick={() => onJobSelect(job)}
                className="cursor-pointer rounded-2xl border border-slate-200/90 bg-white p-4.5 shadow-sm transition active:scale-[0.99] hover:border-blue-300"
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
                    onClick={(e) => handleToggleSave(job, e)}
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition ${
                      job.isSaved
                        ? "bg-emerald-50 text-emerald-600"
                        : "bg-slate-100 text-slate-400 hover:text-slate-600"
                    }`}
                  >
                    <Bookmark size={18} fill={job.isSaved ? "currentColor" : "none"} />
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

export default ForYou;