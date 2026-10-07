import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Bookmark,
  CheckCircle,
  ExternalLink,
  MapPin,
  BriefcaseBusiness,
  Clock3,
  Building2,
  GraduationCap,
  ListChecks,
  FileText,
  MessageSquareQuote,
  Share2,
  Send,
  Phone,
  Mail,
} from "lucide-react";
import { getJobById, saveJob, unsaveJob } from "../services/jobs";
import type { Job, JobDetails as JobDetailsType } from "../types/job";

interface JobDetailsProps {
  job: Job;
  onBack: () => void;
}

function JobDetails({ job, onBack }: JobDetailsProps) {
  const [jobDetails, setJobDetails] = useState<JobDetailsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isSaved, setIsSaved] = useState(job.isSaved);
  const [activeTab, setActiveTab] = useState<"overview" | "raw">("overview");

  useEffect(() => {
    const loadJobDetails = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await getJobById(job.id);
        setJobDetails(data);
        if (data.isSaved !== undefined) {
          setIsSaved(data.isSaved);
        }
      } catch (err) {
        console.error("Failed to load job details:", err);
        setError(err instanceof Error ? err.message : "Failed to load job details");
      } finally {
        setLoading(false);
      }
    };

    loadJobDetails();
  }, [job.id]);

  const details = jobDetails ?? job;
  const primarySource = details.sources?.[0];
  const sourceUrl = primarySource?.postUrl;
  const rawAnnouncement = primarySource?.rawText;

  const applicationUrl = jobDetails?.applyUrl;
  const applicationEmail = jobDetails?.applyEmail;
  const applicationPhone = jobDetails?.applyPhone;

  const handleToggleSave = async () => {
    try {
      if (isSaved) {
        await unsaveJob(job.id);
        setIsSaved(false);
      } else {
        await saveJob(job.id);
        setIsSaved(true);
      }
    } catch (err) {
      console.error("Failed to toggle save:", err);
    }
  };

  const handleApply = () => {
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
  };

  const getApplyButton = () => {
    if (applicationUrl) {
      return { label: "Apply Online", icon: <ExternalLink size={18} /> };
    }
    if (applicationEmail) {
      return { label: `Email CV (${applicationEmail})`, icon: <Mail size={18} /> };
    }
    if (applicationPhone) {
      return { label: `Call Employer (${applicationPhone})`, icon: <Phone size={18} /> };
    }
    if (sourceUrl) {
      return { label: "Apply via Telegram Channel", icon: <Send size={18} /> };
    }
    return { label: "View Telegram Post", icon: <ExternalLink size={18} /> };
  };

  // Convert comma or newline separated requirements into clear bullet points
  const parseRequirements = (reqStr?: string | null): string[] => {
    if (!reqStr || reqStr.trim() === "" || reqStr.toLowerCase() === "not specified") {
      return [];
    }
    return reqStr
      .split(/(?:\r\n|\r|\n|•|\*|,\s*(?=[A-Z0-9]))/)
      .map((item) => item.trim())
      .filter((item) => item.length > 2);
  };

  const requirementList = parseRequirements(jobDetails?.requirements);

  return (
    <div className="min-h-screen bg-slate-50 pb-32 text-slate-900">
      {/* Top Navigation */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-5 py-3.5 backdrop-blur">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 transition hover:bg-slate-200"
          >
            <ArrowLeft size={20} />
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleSave}
              className={`flex h-10 w-10 items-center justify-center rounded-xl transition ${
                isSaved
                  ? "bg-emerald-50 text-emerald-600"
                  : "bg-slate-100 text-slate-500 hover:text-slate-700"
              }`}
            >
              <Bookmark size={19} fill={isSaved ? "currentColor" : "none"} />
            </button>

            {sourceUrl && (
              <button
                type="button"
                onClick={() => window.open(sourceUrl, "_blank")}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition hover:bg-slate-200"
                title="View original Telegram posting"
              >
                <Share2 size={18} />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Job Banner */}
      <section className="border-b border-slate-200 bg-white px-5 pb-6 pt-5">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-md">
            <Building2 size={28} />
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold leading-tight text-slate-950">
              {job.title}
            </h1>

            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
              <span className="font-semibold text-slate-700">{job.company}</span>
              {job.sources.length > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 font-medium text-sky-700">
                  <CheckCircle size={12} className="text-sky-500" />
                  Verified Channel
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Structured Metric Grid */}
        <div className="mt-5 grid grid-cols-2 gap-2.5">
          <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <MapPin size={14} />
              <span>Location</span>
            </div>
            <p className="mt-1 text-sm font-semibold text-slate-900 truncate">
              {job.location || "Addis Ababa"}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <BriefcaseBusiness size={14} />
              <span>Job Type</span>
            </div>
            <p className="mt-1 text-sm font-semibold text-slate-900 truncate">
              {job.employmentType || "Full-time"}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Clock3 size={14} />
              <span>Deadline</span>
            </div>
            <p className="mt-1 text-sm font-semibold text-slate-900 truncate">
              {job.deadline
                ? new Date(job.deadline).toLocaleDateString()
                : "Open until filled"}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3">
            <div className="flex items-center gap-1.5 text-xs text-emerald-600">
              <span>Salary</span>
            </div>
            <p className="mt-1 text-sm font-bold text-emerald-700 truncate">
              {job.salary || "Negotiable"}
            </p>
          </div>
        </div>

        {/* View Mode Tabs (Structured vs Untouched Telegram Post) */}
        <div className="mt-6 flex rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`flex-1 rounded-lg py-2 text-xs font-bold transition ${
              activeTab === "overview"
                ? "bg-white text-blue-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Structured Overview
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("raw")}
            className={`flex-1 rounded-lg py-2 text-xs font-bold transition ${
              activeTab === "raw"
                ? "bg-white text-blue-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Untouched Scraped Post
          </button>
        </div>
      </section>

      {/* TAB 1: Structured Overview */}
      {activeTab === "overview" && (
        <main className="space-y-4 px-5 pt-4">
          {loading && (
            <div className="h-28 animate-pulse rounded-2xl bg-slate-200/70" />
          )}

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs text-red-600">
              {error}
            </div>
          )}

          {/* Detailed Job Summary */}
          <section className="rounded-2xl border border-slate-200/80 bg-white p-4.5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <FileText size={17} className="text-blue-600" />
              <span>Role Summary & Responsibilities</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-700 whitespace-pre-line">
              {jobDetails?.description || "No specific summary provided for this vacancy."}
            </p>
          </section>

          {/* Key Qualifications & Requirements */}
          {requirementList.length > 0 ? (
            <section className="rounded-2xl border border-slate-200/80 bg-white p-4.5 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <ListChecks size={17} className="text-blue-600" />
                <span>Key Requirements</span>
              </div>
              <ul className="mt-3 space-y-2.5">
                {requirementList.map((req, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs leading-relaxed text-slate-700">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" />
                    <span>{req}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : jobDetails?.requirements && (
            <section className="rounded-2xl border border-slate-200/80 bg-white p-4.5 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <ListChecks size={17} className="text-blue-600" />
                <span>Requirements</span>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-slate-700 whitespace-pre-line">
                {jobDetails.requirements}
              </p>
            </section>
          )}

          {/* Education Qualification */}
          {jobDetails?.education && jobDetails.education.toLowerCase() !== "not specified" && (
            <section className="rounded-2xl border border-slate-200/80 bg-white p-4.5 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <GraduationCap size={17} className="text-blue-600" />
                <span>Education & Qualifications</span>
              </div>
              <p className="mt-2 text-xs font-medium text-slate-700">
                {jobDetails.education}
              </p>
            </section>
          )}

          {/* Channel Attribution & Transparency Check */}
          {primarySource && (
            <section className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xs font-bold text-emerald-900">
                    Verified Job Source: {primarySource.sourceName}
                  </h3>
                  <p className="mt-1 text-[11px] text-emerald-700">
                    Posted on: {new Date(primarySource.postedAt).toLocaleDateString()}
                  </p>
                </div>
                {sourceUrl && (
                  <a
                    href={sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs font-semibold text-emerald-800 underline underline-offset-2"
                  >
                    Open Post
                    <ExternalLink size={12} />
                  </a>
                )}
              </div>
            </section>
          )}
        </main>
      )}

      {/* TAB 2: Untouched Scraped Announcement (Direct Channel Copy) */}
      {activeTab === "raw" && (
        <main className="px-5 pt-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4.5 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <MessageSquareQuote size={18} className="text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Telegram Channel Broadcast</h3>
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
                {primarySource?.sourceName || "Raw Post"}
              </span>
            </div>

            <p className="mt-2 text-xs text-slate-400">
              Unmodified message captured directly by the scraper:
            </p>

            <div className="mt-3 overflow-x-auto rounded-xl bg-slate-50 p-4 text-xs leading-relaxed text-slate-800 whitespace-pre-wrap select-text border border-slate-200/60 font-mono">
              {rawAnnouncement || jobDetails?.description || "No raw text available."}
            </div>

            {sourceUrl && (
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 flex items-center justify-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 py-2.5 text-xs font-bold text-blue-700 transition hover:bg-blue-100"
              >
                <span>View Live Telegram Message</span>
                <ExternalLink size={13} />
              </a>
            )}
          </div>
        </main>
      )}

      {/* Sticky Bottom Apply Action Bar */}
      <footer className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200/90 bg-white/95 px-5 py-3.5 backdrop-blur shadow-lg">
        <button
          type="button"
          onClick={handleApply}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3.5 text-sm font-bold text-white shadow-md transition active:scale-[0.99] hover:bg-blue-700"
        >
          <span>{getApplyButton().label}</span>
          {getApplyButton().icon}
        </button>
      </footer>
    </div>
  );
}

export default JobDetails;