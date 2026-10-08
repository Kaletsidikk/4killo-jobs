import { useEffect, useState } from "react";
import { getForYouJobs, getJobs } from "../services/jobs";
import type { ForYouJob, Job } from "../types/job";

function ForYou() {
  const [jobs, setJobs] = useState<ForYouJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadJobs = async () => {
      try {
        setLoading(true);
        setError(null);

        try {
          // Real personalised feed.
          const response = await getForYouJobs();

          setJobs(response.data);
          return;
        } catch (authError) {
          console.log(
            "For You API unavailable. Using development fallback.",
            authError
          );
        }

        // Development fallback.
        // GET /jobs is public and does not require Telegram authentication.
        const response = await getJobs({ limit: 10 });

        const fallbackJobs: ForYouJob[] = response.data.map(
          (job: Job) => ({
            ...job,
            score: 0,
            matchLabel: "Available",
            matchReasons: [],
            applyLink: job.sources[0]?.postUrl ?? null,
            applyLinkType: "SOURCE",
          })
        );

        setJobs(fallbackJobs);
      } catch (err) {
        console.error("Failed to load For You jobs:", err);

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load jobs"
        );
      } finally {
        setLoading(false);
      }
    };

    loadJobs();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-blue-50 p-6">
        <h1 className="text-2xl font-bold text-gray-900">
          For You
        </h1>

        <p className="mt-4 text-gray-600">
          Loading jobs...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-blue-50 p-6">
        <h1 className="text-2xl font-bold text-gray-900">
          For You
        </h1>

        <p className="mt-4 text-red-600">
          {error}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blue-50 p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          For You
        </h1>

        <p className="mt-1 text-gray-600">
          Jobs selected based on your preferences.
        </p>
      </div>

      {jobs.length === 0 ? (
        <div className="rounded-xl bg-white p-6 text-center">
          <p className="text-gray-600">
            No jobs available right now.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="rounded-xl bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-semibold text-gray-900">
                    {job.title}
                  </h2>

                  <p className="mt-1 text-sm text-gray-600">
                    {job.company}
                  </p>
                </div>

                {job.matchLabel && (
                  <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                    {job.matchLabel}
                  </span>
                )}
              </div>

              <div className="mt-3 space-y-1 text-sm text-gray-600">
                <p>📍 {job.location}</p>
                <p>💼 {job.category}</p>

                {job.employmentType && (
                  <p>🕒 {job.employmentType}</p>
                )}

                {job.experienceLevel && (
                  <p>🎓 {job.experienceLevel}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ForYou;