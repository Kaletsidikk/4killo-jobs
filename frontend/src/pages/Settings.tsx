import { Bell, ChevronRight, Database, Globe, Info, SlidersHorizontal } from "lucide-react";

interface SettingsProps {
  onSourcesClick: () => void;
  onPreferencesClick: () => void;
}

function Settings({ onSourcesClick, onPreferencesClick }: SettingsProps) {
  return (
    <div className="min-h-screen bg-slate-50 pb-24 text-slate-900">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white px-5 py-5">
        <h1 className="text-xl font-bold">
          Settings
        </h1>

        <p className="mt-1 text-xs text-slate-500">
          Manage your preferences and app settings
        </p>
      </header>

      <main className="space-y-6 px-5 py-5">
        {/* Preferences */}
        <section>
          <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Preferences
          </h2>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <button
              type="button"
              onClick={onPreferencesClick}
              className="flex w-full items-center justify-between border-b border-slate-100 px-4 py-4 text-left"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <SlidersHorizontal size={18} />
                </div>

                <div>
                  <p className="text-sm font-medium">
                    Job Preferences
                  </p>

                  <p className="mt-0.5 text-xs text-slate-500">
                    Categories, experience and locations
                  </p>
                </div>
              </div>

              <ChevronRight
                size={18}
                className="text-slate-400"
              />
            </button>

            <button
              type="button"
              className="flex w-full items-center justify-between px-4 py-4 text-left"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <Bell size={18} />
                </div>

                <div>
                  <p className="text-sm font-medium">
                    Notifications
                  </p>

                  <p className="mt-0.5 text-xs text-slate-500">
                    Manage job alerts
                  </p>
                </div>
              </div>

              <ChevronRight
                size={18}
                className="text-slate-400"
              />
            </button>
          </div>
        </section>

        {/* Sources */}
        <section>
          <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Job Sources
          </h2>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <button
              type="button"
              onClick={onSourcesClick}
              className="flex w-full items-center justify-between px-4 py-4 text-left"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <Database size={18} />
                </div>

                <div>
                  <p className="text-sm font-medium">
                    Sources
                  </p>

                  <p className="mt-0.5 text-xs text-slate-500">
                    View where our jobs come from
                  </p>
                </div>
              </div>

              <ChevronRight
                size={18}
                className="text-slate-400"
              />
            </button>
          </div>
        </section>

        {/* App */}
        <section>
          <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
            App
          </h2>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <button
              type="button"
              className="flex w-full items-center justify-between border-b border-slate-100 px-4 py-4 text-left"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                  <Globe size={18} />
                </div>

                <div>
                  <p className="text-sm font-medium">
                    Language
                  </p>

                  <p className="mt-0.5 text-xs text-slate-500">
                    English
                  </p>
                </div>
              </div>

              <ChevronRight
                size={18}
                className="text-slate-400"
              />
            </button>

            <button
              type="button"
              className="flex w-full items-center justify-between px-4 py-4 text-left"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                  <Info size={18} />
                </div>

                <div>
                  <p className="text-sm font-medium">
                    About 4 kilo
                  </p>

                  <p className="mt-0.5 text-xs text-slate-500">
                    App information
                  </p>
                </div>
              </div>

              <ChevronRight
                size={18}
                className="text-slate-400"
              />
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

export default Settings;