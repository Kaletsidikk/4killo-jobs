import { useEffect, useState } from "react";
import { useVoxideVoice } from "@voxide/react";
import { ai } from "../services/voxide";

import {
  Search,
  Mic,
  ChevronDown,
  SlidersHorizontal,
  Bookmark,
  MapPin,
  BriefcaseBusiness,
  Clock3,
  CheckCircle,
  ArrowRight,
  UserRound,
} from "lucide-react";

import { 
  getJobs, 
  getJobCategories,
  saveJob,
  unsaveJob, } from "../services/jobs";
import type { Job } from "../types/job";
interface HomeProps {
  onJobSelect: (job: Job) => void;
}


function Home({ onJobSelect }: HomeProps) {

  const { status, messages, sendText } = useVoxideVoice(ai);
 
console.log("Voxide voice status:", status);
console.log("Voxide voice messages:", messages);
  
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [selectedExperienceLevel, setSelectedExperienceLevel] = useState("");
  const [selectedEmploymentType, setSelectedEmploymentType] = useState("");
  const [voiceActive, setVoiceActive] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);

    ai.register({
  searchJobs: {
    description:
      "Search, filter, and discover job vacancies in Ethiopia. Use whenever the user asks for jobs by role, company, sector, location, or experience level in Amharic, English, or Amglish.",

    params: {
      keyword: {
        type: "string",
        description:
          "Target job title or role in English or standard Amharic.",
      },

      category: {
        type: "string",
        description: "Normalized Ethiopian job category.",
      },

      location: {
        type: "string",
        description:
          "Target city or region in Ethiopia, such as Addis Ababa, Hawassa, Bahir Dar, or Remote.",
      },

      experienceLevel: {
        type: "string",
        enum: [
          "ENTRY",
          "JUNIOR",
          "MID",
          "SENIOR",
          "NOT_SPECIFIED",
        ],
        description:
          "Seniority tier. Use ENTRY for fresh graduates or users with no experience.",
      },

      employmentType: {
        type: "string",
        enum: [
          "Full-time",
          "Part-time",
          "Internship",
          "Contract",
        ],
        description: "Work arrangement type.",
      },
    },

    handler: async ({
      keyword,
      category,
      location,
      experienceLevel,
      employmentType,
    }) => {
      console.log("Voxide searchJobs called:", {
        keyword,
        category,
        location,
        experienceLevel,
        employmentType,
      });

      // Inject all voice parameters into search state
      setSearch(keyword ?? "");
      setSearchInput(keyword ?? "");
      setSelectedCategory(category ?? "");
      setSelectedLocation(location ?? "");
      setSelectedExperienceLevel(experienceLevel ?? "");
      setSelectedEmploymentType(employmentType ?? "");
      setVoiceActive(true);

      return {
        status: "success",
        count: 0,
        appliedFilters: {
          keyword,
          category,
          location,
          experienceLevel,
          employmentType,
        },
      };
    },
  },
});
  console.log("Voxide searchJobs capability registered");

  const handleToggleSave = async (job: Job) => {
  try {
    if (job.isSaved) {
      await unsaveJob(job.id);
    } else {
      await saveJob(job.id);
    }

    setJobs((currentJobs) =>
      currentJobs.map((currentJob) =>
        currentJob.id === job.id
          ? { ...currentJob, isSaved: !currentJob.isSaved }
          : currentJob
      )
    );
  } catch (err) {
    console.error("Failed to update saved job:", err);
  }
};

  useEffect(() => {
  const loadCategories = async () => {
    try {
      const response = await getJobCategories();

      setCategories(response.data.map((item) => item.category));
    } catch (err) {
      console.error("Failed to load categories:", err);
    }
  };

  loadCategories();
}, []);

useEffect(() => {
  const timer = setTimeout(() => {
    setSearch(searchInput.trim());
  }, 500);

  return () => clearTimeout(timer);
}, [searchInput]);
  
  useEffect(() => {
  const loadJobs = async () => {
    try {
      setLoading(true);
      setPage(1);

      const response = await getJobs({
        search: search || undefined,
        category:
          selectedCategory === "All Jobs" || !selectedCategory
            ? undefined
            : selectedCategory,
        location: selectedLocation || undefined,
        experienceLevel: selectedExperienceLevel || undefined,
        employmentType: selectedEmploymentType || undefined,
        page: 1,
        limit: 10,
      });

      setJobs(response.data);
      setTotalPages(response.pagination.totalPages);
    } catch (err) {
      console.error("Failed to load jobs:", err);

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
}, [search, selectedCategory, selectedLocation, selectedExperienceLevel, selectedEmploymentType]);

const clearVoiceFilters = () => {
  setSearch("");
  setSearchInput("");
  setSelectedCategory("");
  setSelectedLocation("");
  setSelectedExperienceLevel("");
  setSelectedEmploymentType("");
  setVoiceActive(false);
};

const loadMoreJobs = async () => {
  if (page >= totalPages || loadingMore) {
    return;
  }

  try {
    setLoadingMore(true);

    const nextPage = page + 1;

    const response = await getJobs({
      search: search || undefined,
      category:
        selectedCategory === "All Jobs" || !selectedCategory
          ? undefined
          : selectedCategory,
      location: selectedLocation || undefined,
      experienceLevel: selectedExperienceLevel || undefined,
      employmentType: selectedEmploymentType || undefined,
      page: nextPage,
      limit: 10,
    });

    setJobs((currentJobs) => [
      ...currentJobs,
      ...response.data,
    ]);

    setPage(nextPage);
    setTotalPages(response.pagination.totalPages);
  } catch (err) {
    console.error("Failed to load more jobs:", err);
  } finally {
    setLoadingMore(false);
  }
};
  return (
    <div className="min-h-screen bg-slate-50 pb-24 text-slate-900">

      {/* ================= HEADER ================= */}
      <header className="border-b border-slate-200 bg-white">

        <div className="flex items-center justify-between px-5 py-4">

          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-lg text-white">
              4
            </div>

            <span className="text-lg font-bold tracking-tight">
              4KILLO
            </span>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-4">

            <button
              type="button"
              className="flex items-center gap-1 text-sm font-medium text-slate-700"
            >
              አማ
              <ChevronDown size={14} />
            </button>

            <div className="relative">
              <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-sky-100">
                <UserRound
                  size={21}
                  className="text-sky-600"
                />
              </div>

              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
            </div>

          </div>
        </div>
      </header>

      {/* ================= GREETING ================= */}
      <section className="px-5 pb-4 pt-5">

        <div className="flex items-start justify-between">

          <div>
            <h1 className="text-xl font-bold">
              እንኳን ደህና መጡ!
            </h1>

            <p className="mt-1 text-xs text-slate-500">
              የሚፈልጉትን ስራ ይፈልጉ እና ያመልክቱ።
            </p>
          </div>

          <div className="flex items-center gap-1.5 pt-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />

            <span className="text-xs font-medium text-emerald-600">
              New jobs
            </span>
          </div>

        </div>
      </section>

      {/* ================= SEARCH ================= */}
      <section className="px-5">

        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">

          <Search
            size={20}
            className="shrink-0 text-slate-400"
          />

          <input
  type="text"
  value={searchInput}
  onChange={(e) => setSearchInput(e.target.value)}
  placeholder="Search title, company, or skills..."
  className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
/>

          <button
            type="button"
            //onClick={() => connect()}
            onClick={() => sendText("Find banking jobs")}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white"
          >
            <Mic size={18} />
          </button>

        </div>

      </section>

      {/* ================= VOICE ACTIVE FILTER BANNER ================= */}
      {voiceActive && (
        <section className="px-5 pt-3">
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
              <Mic size={13} />
              Voice Filters:
            </span>

            {search && (
              <span className="rounded-full bg-emerald-600 px-2.5 py-1 text-[11px] font-medium text-white">
                {search}
              </span>
            )}
            {selectedCategory && (
              <span className="rounded-full bg-emerald-600 px-2.5 py-1 text-[11px] font-medium text-white">
                {selectedCategory}
              </span>
            )}
            {selectedLocation && (
              <span className="rounded-full bg-sky-600 px-2.5 py-1 text-[11px] font-medium text-white">
                📍 {selectedLocation}
              </span>
            )}
            {selectedExperienceLevel && (
              <span className="rounded-full bg-violet-600 px-2.5 py-1 text-[11px] font-medium text-white">
                {selectedExperienceLevel}
              </span>
            )}
            {selectedEmploymentType && (
              <span className="rounded-full bg-orange-500 px-2.5 py-1 text-[11px] font-medium text-white">
                {selectedEmploymentType}
              </span>
            )}

            <button
              type="button"
              onClick={clearVoiceFilters}
              className="ml-auto text-[11px] font-medium text-emerald-700 underline underline-offset-2"
            >
              Clear all
            </button>
          </div>
        </section>
      )}

      {/* ================= CATEGORY FILTERS ================= */}
      <section className="overflow-x-auto px-5 py-4">
        <div className="flex min-w-max gap-2">
{["All Jobs", ...categories].map((category) => {
  const isAllJobs = category === "All Jobs";

  const categoryValue = isAllJobs
    ? ""
    : category;

  const isSelected =
    selectedCategory === categoryValue;

  return (
    <button
      key={category}
      type="button"
      onClick={() => { setSelectedCategory(categoryValue); setVoiceActive(false); }}
      className={`rounded-lg border px-4 py-2 text-xs font-medium transition ${
        isSelected
          ? "border-emerald-600 bg-emerald-600 text-white"
          : "border-slate-200 bg-white text-slate-600"
      }`}
    >
      {category}
    </button>
  );
})}

        </div>
      </section>

      {/* ================= JOB HEADER ================= */}
      <section className="px-5 pb-3">

        <div className="flex items-center justify-between">

          <div className="flex items-baseline gap-2">

            <h2 className="text-sm font-medium text-slate-900">
              All Jobs
            </h2>

            <span className="text-xs text-slate-400">
              {jobs.length} opportunities
            </span>

          </div>

          <button
            type="button"
            className="flex items-center gap-1.5 text-xs text-slate-500"
          >
            <SlidersHorizontal size={14} />
            Sort: Recent
          </button>

        </div>

      </section>

      {/* ================= LOADING ================= */}
      {loading && (
        <div className="px-5">

          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center">

            <p className="text-sm text-slate-500">
              Loading jobs...
            </p>

          </div>

        </div>
      )}

      {/* ================= ERROR ================= */}
      {!loading && error && (
        <div className="px-5">

          <div className="rounded-2xl border border-red-100 bg-red-50 p-5">

            <p className="text-sm text-red-600">
              {error}
            </p>

          </div>

        </div>
      )}

      {/* ================= JOB CARDS ================= */}
      {!loading && !error && (
        <main className="space-y-3 px-5">

          {jobs.map((job) => (

            <article
              key={job.id}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >

              {/* Company + bookmark */}
              <div className="flex items-start justify-between">

                <div className="flex items-center gap-3">

                  {/* Temporary logo */}
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-lg">
                    🏢
                  </div>

                  <div>

                    <div className="flex items-center gap-1">

                      <h3 className="text-xs font-semibold text-slate-900">
                        {job.company}
                      </h3>

                      {job.sources.length > 0 && (
                        <>
                          <CheckCircle
                            size={13}
                            fill="currentColor"
                            className="text-sky-500"
                          />

                          <span className="text-[10px] font-medium text-sky-600">
                            Verified
                          </span>
                        </>
                      )}

                    </div>

                  </div>

                </div>

                <button
                  type="button"
                  onClick={() => handleToggleSave(job)}
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                    job.isSaved
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-slate-50 text-slate-500"
                  }`}
                >
                  <Bookmark
                    size={19}
                    fill={job.isSaved ? "currentColor" : "none"}
                  />
                </button>

              </div>

              {/* Job title */}
              <h2 className="mt-4 text-base font-medium text-slate-950">
                {job.title}
              </h2>

              {/* Job information */}
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] text-slate-500">

                <span className="flex items-center gap-1">
                  <MapPin size={13} />
                  {job.location}
                </span>

                {job.salary && (
                  <span className="flex items-center gap-1">
                    <BriefcaseBusiness size={13} />
                    {job.salary}
                  </span>
                )}

                {job.deadline && (
                  <span className="flex items-center gap-1 text-orange-500">
                    <Clock3 size={13} />
                    {new Date(job.deadline).toLocaleDateString()}
                  </span>
                )}

              </div>

              {/* Divider */}
              <div className="my-3 border-t border-slate-100" />

              {/* Apply */}
              <button
                type="button"
                onClick={() => onJobSelect(job)}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
              >
                Apply Now
                <ArrowRight size={17} />
              </button>

            </article>

          ))}

          {page < totalPages && (
  <div className="px-5 pb-6 pt-4">
    <button
      type="button"
      onClick={loadMoreJobs}
      disabled={loadingMore}
      className="w-full rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loadingMore ? "Loading..." : "Load More Jobs"}
    </button>
  </div>
)}

          {jobs.length === 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center">

              <p className="text-sm text-slate-500">
                No jobs found.
              </p>

            </div>
          )}

        </main>
      )}

    </div>
  );
}

export default Home;