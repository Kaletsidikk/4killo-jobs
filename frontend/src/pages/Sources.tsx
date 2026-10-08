import { useEffect, useState } from "react";
import { ArrowLeft, ExternalLink, Database } from "lucide-react";
import { getSources } from "../services/sources";
import type { JobSource } from "../services/sources";

interface SourcesProps {
  onBack: () => void;
}

function Sources({ onBack }: SourcesProps) {
  const [sources, setSources] = useState<JobSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadSources = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await getSources();

        setSources(response.data);
      } catch (err) {
        console.error("Failed to load sources:", err);

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load job sources"
        );
      } finally {
        setLoading(false);
      }
    };

    loadSources();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 pb-24 text-slate-900">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="flex items-center gap-3 px-5 py-4">
          <button
            type="button"
            onClick={onBack}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100"
            aria-label="Go back"
          >
            <ArrowLeft size={20} />
          </button>

          <div>
            <h1 className="text-lg font-bold">
              Job Sources
            </h1>

            <p className="text-xs text-slate-500">
              Sources we collect jobs from
            </p>
          </div>
        </div>
      </header>

      {/* Loading */}
      {loading && (
        <div className="px-5 pt-5">
          <div className="rounded-2xl bg-white p-5 text-sm text-slate-500">
            Loading sources...
          </div>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="px-5 pt-5">
          <div className="rounded-2xl border border-red-100 bg-red-50 p-5 text-sm text-red-600">
            {error}
          </div>
        </div>
      )}

      {/* Sources */}
      {!loading && !error && (
        <main className="space-y-3 px-5 py-5">
          {sources.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
              <Database
                size={28}
                className="mx-auto text-slate-400"
              />

              <h2 className="mt-3 text-sm font-semibold">
                No active sources
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                There are currently no active job sources.
              </p>
            </div>
          ) : (
            sources.map((source) => (
              <article
                key={source.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                      <Database size={20} />
                    </div>

                    <div className="min-w-0">
                      <h2 className="text-sm font-semibold text-slate-900">
                        {source.name}
                      </h2>

                      <p className="mt-1 text-xs text-slate-500">
                        {source.type}
                      </p>
                    </div>
                  </div>

                  <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-medium text-emerald-600">
                    Active
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-[10px] text-slate-400">
                      Jobs
                    </p>

                    <p className="mt-1 text-sm font-semibold">
                      {source.totalJobs}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-[10px] text-slate-400">
                      Last synced
                    </p>

                    <p className="mt-1 text-xs font-medium">
                      {source.lastSyncAt
                        ? new Date(
                            source.lastSyncAt
                          ).toLocaleDateString()
                        : "Not available"}
                    </p>
                  </div>
                </div>

                {source.identifier && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                    <ExternalLink size={13} />
                    <span className="truncate">
                      {source.identifier}
                    </span>
                  </div>
                )}
              </article>
            ))
          )}
        </main>
      )}
    </div>
  );
}

export default Sources;