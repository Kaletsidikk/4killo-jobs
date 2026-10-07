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
  Sparkles,
  Share2,
  Send,
  Phone,
  Mail,
  Layers,
  FileCheck2,
  CalendarDays,
  ShieldCheck,
} from "lucide-react";
import { getJobById, saveJob, unsaveJob } from "../services/jobs";
import { isLocalJobSaved } from "../services/savedStorage";
import { useAppLanguage } from "../services/language";
import { ShareModal } from "../components/share/ShareModal";
import type { Job, JobDetails as JobDetailsType } from "../types/job";

interface JobDetailsProps {
  job: Job;
  onBack: () => void;
}

function JobDetails({ job, onBack }: JobDetailsProps) {
  const [jobDetails, setJobDetails] = useState<JobDetailsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isSaved, setIsSaved] = useState(() => job.isSaved || isLocalJobSaved(job.id));
  const [showShareModal, setShowShareModal] = useState(false);

  const { t } = useAppLanguage();

  useEffect(() => {
    const loadJobDetails = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await getJobById(job.id);
        setJobDetails(data);
        if (data.isSaved !== undefined) {
          setIsSaved(data.isSaved || isLocalJobSaved(job.id));
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

  const applicationUrl = jobDetails?.applyUrl;
  const applicationEmail = jobDetails?.applyEmail;
  const applicationPhone = jobDetails?.applyPhone;

  // Clean silent bookmark toggle: instantaneous visual flip with no intrusive popup toasts
  const handleToggleSave = async () => {
    const nextSaved = !isSaved;
    setIsSaved(nextSaved);

    try {
      if (!nextSaved) {
        await unsaveJob(job.id);
      } else {
        await saveJob(jobDetails || job);
      }
    } catch (err) {
      console.error("Failed to toggle save:", err);
      // Revert on error
      setIsSaved(!nextSaved);
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
      return { label: t.applyNow, sub: "Official Portal", icon: <ExternalLink size={18} /> };
    }
    if (applicationEmail) {
      return { label: `${t.applyNow} (Email)`, sub: applicationEmail, icon: <Mail size={18} /> };
    }
    if (applicationPhone) {
      return { label: `${t.applyNow} (Phone)`, sub: applicationPhone, icon: <Phone size={18} /> };
    }
    if (sourceUrl) {
      return { label: `${t.applyNow} (Telegram)`, sub: primarySource?.sourceName || "Direct Channel", icon: <Send size={18} /> };
    }
    return { label: t.openOriginal, sub: "Original Posting", icon: <ExternalLink size={18} /> };
  };

  // Convert comma or newline separated requirements into clear, distinct badge pills
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
    <div className="min-h-screen bg-slate-50 pb-36 text-slate-900">
      {/* Top Navigation */}
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 px-5 py-3.5 backdrop-blur shadow-xs">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 transition hover:bg-slate-200"
          >
            <ArrowLeft size={20} />
          </button>

          <div className="flex items-center gap-2">
            {/* Silent instant bookmark toggle */}
            <button
              type="button"
              onClick={handleToggleSave}
              className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-150 active:scale-90 ${
                isSaved
                  ? "bg-emerald-500 text-white shadow-sm shadow-emerald-500/25"
                  : "bg-slate-100 text-slate-400 hover:text-slate-600"
              }`}
              title={isSaved ? "Saved" : "Save"}
            >
              <Bookmark
                size={19}
                fill={isSaved ? "currentColor" : "none"}
                className={isSaved ? "scale-105" : ""}
              />
            </button>

            {/* Share action button triggering glassomorphic modal */}
            <button
              type="button"
              onClick={() => setShowShareModal(true)}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition hover:bg-slate-200 active:scale-90"
              title="Share job"
            >
              <Share2 size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Header Card */}
      <section className="border-b border-slate-200 bg-white px-5 pb-6 pt-5">
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20">
            <Building2 size={32} />
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold leading-snug text-slate-950">
              {job.title}
            </h1>

            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <span className="font-semibold text-sm text-slate-700">{job.company}</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                <CheckCircle size={12} className="text-blue-600" />
                {t.verifiedListing}
              </span>
            </div>

            <div className="mt-2.5 flex items-center gap-2 text-xs text-slate-500">
              <span className="rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
                {job.category}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-slate-600">
                <MapPin size={12} className="text-slate-400" />
                {job.location}
              </span>
            </div>
          </div>
        </div>

        {/* 4-Item Key Parameters Grid */}
        <div className="mt-6 grid grid-cols-2 gap-2.5">
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3.5">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <BriefcaseBusiness size={14} className="text-slate-500" />
              <span>{t.employmentType}</span>
            </div>
            <p className="mt-1 text-sm font-bold text-slate-900">
              {job.employmentType || "Full-time"}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3.5">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <Layers size={14} className="text-slate-500" />
              <span>{t.experienceTier}</span>
            </div>
            <p className="mt-1 text-sm font-bold text-slate-900">
              {job.experienceLevel && job.experienceLevel !== "NOT_SPECIFIED"
                ? job.experienceLevel.charAt(0) + job.experienceLevel.slice(1).toLowerCase()
                : "Open to all levels"}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3.5">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <CalendarDays size={14} className="text-slate-500" />
              <span>{t.deadline}</span>
            </div>
            <p className="mt-1 text-sm font-bold text-slate-900">
              {job.deadline
                ? new Date(job.deadline).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                : "Not specified"}
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-3.5">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">
              <Clock3 size={14} />
              <span>{t.offeredSalary}</span>
            </div>
            <p className="mt-1 text-sm font-bold text-emerald-800">
              {job.salary || t.negotiable}
            </p>
          </div>
        </div>
      </section>

      {/* Main Body Content Sections */}
      <main className="space-y-4 px-5 pt-4">
        {loading && (
          <div className="space-y-3">
            <div className="h-28 animate-pulse rounded-2xl bg-slate-200/70" />
            <div className="h-28 animate-pulse rounded-2xl bg-slate-200/70" />
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-600">
            {error}
          </div>
        )}

        {/* 1. Job Description & Responsibilities */}
        {jobDetails?.description && (
          <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3 text-sm font-bold text-slate-950">
              <FileCheck2 size={18} className="text-blue-600" />
              <span>{t.roleSummary}</span>
            </div>
            <div className="mt-3.5 text-sm leading-relaxed text-slate-700 whitespace-pre-line select-text">
              {jobDetails.description}
            </div>
          </section>
        )}

        {/* 2. Key Qualifications & Requirements */}
        {requirementList.length > 0 ? (
          <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3 text-sm font-bold text-slate-950">
              <Sparkles size={18} className="text-blue-600" />
              <span>{t.candidateRequirements}</span>
            </div>
            <ul className="mt-3.5 space-y-2.5">
              {requirementList.map((req, idx) => (
                <li key={idx} className="flex items-start gap-3 text-xs leading-relaxed text-slate-700">
                  <div className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 font-bold text-[10px]">
                    ✓
                  </div>
                  <span>{req}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : jobDetails?.requirements && (
          <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3 text-sm font-bold text-slate-950">
              <Sparkles size={18} className="text-blue-600" />
              <span>{t.candidateRequirements}</span>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-slate-700 whitespace-pre-line select-text">
              {jobDetails.requirements}
            </p>
          </section>
        )}

        {/* 3. Education / Academic Background */}
        {jobDetails?.education && jobDetails.education.toLowerCase() !== "not specified" && (
          <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3 text-sm font-bold text-slate-950">
              <GraduationCap size={18} className="text-blue-600" />
              <span>{t.educationTitle}</span>
            </div>
            <p className="mt-3 text-xs font-semibold text-slate-800">
              {jobDetails.education}
            </p>
          </section>
        )}

        {/* 4. Verified Source Card */}
        {primarySource && (
          <section className="rounded-2xl border border-slate-200/80 bg-white p-4.5 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">
                    Source: {primarySource.sourceName}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Published on {new Date(primarySource.postedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
              </div>

              {sourceUrl && (
                <a
                  href={sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-blue-600 transition hover:bg-blue-50"
                >
                  <span>Telegram</span>
                  <ExternalLink size={12} />
                </a>
              )}
            </div>
          </section>
        )}
      </main>

      {/* Sticky Bottom Direct CTA Bar */}
      <footer className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 px-5 py-3.5 backdrop-blur shadow-lg">
        <button
          type="button"
          onClick={handleApply}
          className="flex w-full items-center justify-between rounded-2xl bg-blue-600 px-5 py-3.5 text-white shadow-md shadow-blue-600/25 transition active:scale-[0.99] hover:bg-blue-700"
        >
          <div className="text-left">
            <p className="text-sm font-bold leading-tight">{getApplyButton().label}</p>
            <p className="text-[11px] font-medium text-blue-100">{getApplyButton().sub}</p>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20">
            {getApplyButton().icon}
          </div>
        </button>
      </footer>

      {/* Glassmorphic Share Modal */}
      {showShareModal && (
        <ShareModal
          job={jobDetails || job}
          sourceUrl={sourceUrl}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
}

export default JobDetails;