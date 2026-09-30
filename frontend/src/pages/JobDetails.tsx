import {
  ArrowLeft,
  Bookmark,
  CheckCircle,
  ExternalLink,
  MapPin,
  BriefcaseBusiness,
  Clock3,
} from "lucide-react";

import type { Job } from "../types/job";

interface JobDetailsProps {
  job: Job;
  onBack: () => void;
}

function JobDetails({
  job,
  onBack,
}: JobDetailsProps) {
  const sourceUrl = job.sources[0]?.postUrl;

  return (
    <div className="min-h-screen bg-slate-50 pb-28 text-slate-900">

      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between px-5 py-4">

          <button
            type="button"
            onClick={onBack}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100"
          >
            <ArrowLeft size={20} />
          </button>

          <div className="flex items-center gap-2">

            <button
              type="button"
              className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                job.isSaved
                  ? "bg-emerald-50 text-emerald-600"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              <Bookmark
                size={19}
                fill={job.isSaved ? "currentColor" : "none"}
              />
            </button>

            {sourceUrl && (
              <button
                type="button"
                onClick={() => window.open(sourceUrl, "_blank")}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500"
              >
                <ExternalLink size={18} />
              </button>
            )}

          </div>

        </div>
      </header>

      {/* Job header */}
      <section className="bg-white px-5 pb-6 pt-6">

        <div className="flex items-start gap-4">

          {/* Company logo placeholder */}
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-2xl shadow-sm">
            🏢
          </div>

          <div className="min-w-0">

            <h1 className="text-xl font-bold text-slate-950">
              {job.title}
            </h1>

            <div className="mt-1 flex items-center gap-1.5">

              <p className="text-sm text-slate-500">
                {job.company}
              </p>

              {job.sources.length > 0 && (
                <>
                  <CheckCircle
                    size={14}
                    fill="currentColor"
                    className="text-sky-500"
                  />

                  <span className="text-xs font-medium text-sky-600">
                    Verified
                  </span>
                </>
              )}

            </div>

          </div>

        </div>

        {/* Job metadata */}
        <div className="mt-5 grid grid-cols-2 gap-3">

          <div className="rounded-xl bg-slate-50 p-3">
            <MapPin
              size={17}
              className="text-slate-400"
            />

            <p className="mt-2 text-[11px] text-slate-400">
              Location
            </p>

            <p className="mt-0.5 text-xs font-medium">
              {job.location}
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-3">
            <BriefcaseBusiness
              size={17}
              className="text-slate-400"
            />

            <p className="mt-2 text-[11px] text-slate-400">
              Employment
            </p>

            <p className="mt-0.5 text-xs font-medium">
              {job.employmentType}
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-3">
            <Clock3
              size={17}
              className="text-slate-400"
            />

            <p className="mt-2 text-[11px] text-slate-400">
              Deadline
            </p>

            <p className="mt-0.5 text-xs font-medium">
              {job.deadline
                ? new Date(job.deadline).toLocaleDateString()
                : "Not specified"}
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-3">

            <p className="text-[11px] text-slate-400">
              Salary
            </p>

            <p className="mt-1 text-xs font-medium">
              {job.salary || "Not specified"}
            </p>

          </div>

        </div>

      </section>

      {/* Transparency check */}
      <section className="mx-5 mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">

        <div className="flex items-start gap-3">

          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle
              size={19}
              className="text-emerald-600"
            />
          </div>

          <div>

            <h2 className="text-sm font-semibold text-emerald-900">
              Transparency Check
            </h2>

            <p className="mt-1 text-xs leading-5 text-emerald-700">
              This job was collected from a known job source.
              Review the original posting before applying.
            </p>

          </div>

        </div>

      </section>

      {/* Description */}
      <section className="px-5 pt-6">

        <h2 className="text-base font-bold">
          Job Description
        </h2>

        <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-600">
          Job details are available from the original job posting.
        </p>

      </section>

      {/* Source */}
      {sourceUrl && (
        <section className="px-5 pt-6">

          <h2 className="text-base font-bold">
            Original Posting
          </h2>

          <p className="mt-2 text-xs leading-5 text-slate-500">
            This job was collected from:
          </p>

          <p className="mt-1 text-sm font-medium text-slate-800">
            {job.sources[0].sourceName}
          </p>

        </section>
      )}

      {/* Fixed Apply button */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white p-4">

        <button
          type="button"
          onClick={() => {
            if (sourceUrl) {
              window.open(sourceUrl, "_blank");
            }
          }}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
        >
          Apply via Form
          <ExternalLink size={17} />
        </button>

      </div>

    </div>
  );
}

export default JobDetails;