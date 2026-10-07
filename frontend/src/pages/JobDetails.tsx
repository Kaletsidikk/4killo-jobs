import { useEffect, useState } from "react";

import {
  ArrowLeft,
  Bookmark,
  CheckCircle,
  ExternalLink,
  MapPin,
  BriefcaseBusiness,
  Clock3,
} from "lucide-react";

import { getJobById } from "../services/jobs";
import type { Job, JobDetails as JobDetailsType } from "../types/job";

interface JobDetailsProps {
  job: Job;
  onBack: () => void;
}

function JobDetails({
  job,
  onBack,
}: JobDetailsProps) {
  const [jobDetails, setJobDetails] = useState<JobDetailsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadJobDetails = async () => {
      try {
        setLoading(true);
        setError("");

        const data = await getJobById(job.id);

        setJobDetails(data);
      } catch (err) {
        console.error("Failed to load job details:", err);

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load job details"
        );
      } finally {
        setLoading(false);
      }
    };

    loadJobDetails();
  }, [job.id]);

const details = jobDetails ?? job;
const sourceUrl = details.sources[0]?.postUrl;

const applicationUrl = jobDetails?.applyUrl;
const applicationEmail = jobDetails?.applyEmail;
const applicationPhone = jobDetails?.applyPhone;

const getApplyLabel = () => {
  if (applicationUrl) return "Apply Now";
  if (applicationEmail) return "Apply via Email";
  if (applicationPhone) return "Contact";
  if (sourceUrl) return "View Original Posting";

  return "View Job Source";
};

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
      {loading && (
  <div className="px-5 pt-4">
    <div className="rounded-xl bg-blue-50 p-3 text-sm text-blue-700">
      Loading full job details...
    </div>
  </div>
)}

{error && (
  <div className="px-5 pt-4">
    <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600">
      {error}
    </div>
  </div>
)}

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
          {jobDetails?.description || "No description provided."}
        </p>

      </section>
      {jobDetails?.requirements && (
  <section className="px-5 pt-6">
    <h2 className="text-base font-bold">
      Requirements
    </h2>

    <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-600">
      {jobDetails.requirements}
    </p>
  </section>
)}

{jobDetails?.education && (
  <section className="px-5 pt-6">
    <h2 className="text-base font-bold">
      Education
    </h2>

    <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-600">
      {jobDetails.education}
    </p>
  </section>
)}

      {/* Original Source and Untouched Raw Post */}
      {jobDetails?.sources && jobDetails.sources.length > 0 && (
        <section className="px-5 pt-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">
                Untouched Announcement
              </h2>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
                {jobDetails.sources[0].sourceName}
              </span>
            </div>

            <p className="mt-1 text-xs text-slate-400">
              Direct raw message collected from Telegram channel
            </p>

            {jobDetails.sources[0].rawText ? (
              <div className="mt-3 max-h-96 overflow-y-auto rounded-xl bg-slate-50 p-3.5 text-xs font-mono leading-relaxed text-slate-700 whitespace-pre-wrap select-text border border-slate-200/60">
                {jobDetails.sources[0].rawText}
              </div>
            ) : (
              <p className="mt-2 text-xs text-slate-500 italic">
                Raw message text not captured for this source.
              </p>
            )}

            {sourceUrl && (
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700"
              >
                <span>View original Telegram post</span>
                <ExternalLink size={13} />
              </a>
            )}
          </div>
        </section>
      )}

      {/* Fixed Apply button */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white p-4">

        <button
  type="button"
  onClick={() => {
    if (applicationUrl) {
      window.open(applicationUrl, "_blank", "noopener,noreferrer");
      return;
    }

    if (applicationEmail) {
      window.location.href = `mailto:${applicationEmail}`;
      return;
    }

    if (applicationPhone) {
      window.location.href = `tel:${applicationPhone}`;
      return;
    }

    if (sourceUrl) {
      window.open(sourceUrl, "_blank", "noopener,noreferrer");
    }
  }}
  disabled={!applicationUrl && !applicationEmail && !applicationPhone && !sourceUrl}
  className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
>
  {getApplyLabel()}
  <ExternalLink size={17} />
</button>

      </div>

    </div>
  );
}

export default JobDetails;