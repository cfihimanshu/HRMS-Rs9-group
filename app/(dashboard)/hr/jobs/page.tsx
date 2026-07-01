"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface Company {
  id: string;
  name: string;
}

interface Department {
  id: string;
  name: string;
}

interface Job {
  id: string;
  title: string;
  company: Company;
  department: Department;
  location: string;
  category: string;
  salaryRange: string;
  shareableLink?: string;
  status: string;
  postingDuration?: number;
  createdAt?: string;
}

export default function HrJobsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  // Pagination & Search States
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchTrigger, setSearchTrigger] = useState(0);

  // Form States
  const [title, setTitle] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState("Staff");
  const [qualification, setQualification] = useState("");
  const [experience, setExperience] = useState("");
  const [salaryRange, setSalaryRange] = useState("");
  const [description, setDescription] = useState("");
  const [source, setSource] = useState("Indeed");

  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Authenticate and load metadata
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  const fetchData = async () => {
    try {
      const [jobsRes, companiesRes, departmentsRes] = await Promise.all([
        fetch(`/api/jobs?page=${page}&limit=${limit}&search=${encodeURIComponent(searchQuery)}`),
        fetch("/api/companies"),
        fetch("/api/departments"),
      ]);

      const jobsData = await jobsRes.json();
      const companiesData = await companiesRes.json();
      const departmentsData = await departmentsRes.json();

      if (jobsData.success) {
        setJobs(jobsData.data);
        if (jobsData.pagination) {
          setTotalPages(jobsData.pagination.totalPages);
        }
      }
      if (companiesData.success) setCompanies(companiesData.data);
      if (departmentsData.success) setDepartments(departmentsData.data);
    } catch (error) {
      console.error("Error loading jobs data:", error);
    }
  };

  useEffect(() => {
    if (status === "authenticated") {
      fetchData();
    }
  }, [status, page, limit, searchTrigger]);

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSubmitError("");

    if (!companyId || !departmentId) {
      setSubmitError("Please select a company and department");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          companyId,
          departmentId,
          location,
          category,
          qualification,
          experience,
          salaryRange,
          description,
          source,
        }),
      });

      const data = await res.json();
      if (data.success) {
        // Reset form
        setTitle("");
        setLocation("");
        setQualification("");
        setExperience("");
        setSalaryRange("");
        setDescription("");
        alert("Job successfully posted!");
        fetchData();
      } else {
        setSubmitError(data.error || "Failed to create job");
      }
    } catch (err) {
      setSubmitError("Server error occurred while posting job");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = (link: string, id: string) => {
    navigator.clipboard.writeText(link);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
        <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4 md:px-8 relative overflow-hidden">
      {/* Decorative glows */}
      <div className="absolute top-[-10%] right-[-10%] w-[35rem] h-[35rem] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[35rem] h-[35rem] rounded-full bg-violet-600/5 blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Breadcrumb / Top Bar */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-10 border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent font-sans">
              Job Openings & Sourcing
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Create, distribute, and manage shareable application listings
            </p>
          </div>
          <button
            onClick={() => router.push("/hr")}
            className="self-start md:self-auto bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-semibold px-4 py-2.5 rounded-xl transition-all"
          >
            ← Back to Dashboard
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Create Job Form (Left Column) */}
          <div className="bg-slate-900/40 border border-slate-800 backdrop-blur-xl rounded-3xl p-6 shadow-xl h-fit">
            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-pulse" />
              Post a New Requirement
            </h2>

            {submitError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-300 text-xs p-3.5 rounded-xl mb-4">
                {submitError}
              </div>
            )}

            <form onSubmit={handleCreateJob} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Job Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sales Manager"
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Company</label>
                  <select
                    required
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                    value={companyId}
                    onChange={(e) => setCompanyId(e.target.value)}
                  >
                    <option value="">Select Company</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Department</label>
                  <select
                    required
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                  >
                    <option value="">Select Dept</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Category</label>
                  <select
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="Staff">Staff</option>
                    <option value="Associate">Associate</option>
                    <option value="Vendor">Vendor</option>
                    <option value="Franchise">Franchise</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Location</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. New Delhi"
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Qualification</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MBA / Graduate"
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                    value={qualification}
                    onChange={(e) => setQualification(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Experience</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 2-5 Years"
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                    value={experience}
                    onChange={(e) => setExperience(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Salary Range</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 30k - 45k PM"
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                    value={salaryRange}
                    onChange={(e) => setSalaryRange(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Primary Source</label>
                  <select
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                  >
                    <option value="Indeed">Indeed</option>
                    <option value="Naukri">Naukri</option>
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Walk-in">Walk-in</option>
                    <option value="Referral">Referral</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Job Description & KRA</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Key Responsibilities, daily targets, and expected qualifications..."
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white rounded-xl py-3 text-sm font-semibold transition-all shadow-lg shadow-indigo-500/20 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  "Post Active Vacancy"
                )}
              </button>
            </form>
          </div>

          {/* Active Jobs List (Right 2 Columns) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-slate-900/40 border border-slate-800 backdrop-blur-xl rounded-3xl p-6 shadow-xl flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-white">Active Openings</h2>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Search jobs..."
                    className="bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && setSearchTrigger(prev => prev + 1)}
                  />
                  <button 
                    onClick={() => setSearchTrigger(prev => prev + 1)}
                    className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 rounded-xl text-sm"
                  >
                    Search
                  </button>
                </div>
              </div>

              {jobs.length === 0 ? (
                <div className="text-center py-16 text-slate-500 border border-dashed border-slate-800 rounded-2xl">
                  No active job postings found. Post a vacancy to get started.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-medium">
                        <th className="pb-4 pr-4">Title</th>
                        <th className="pb-4 px-4">Company / Dept</th>
                        <th className="pb-4 px-4">Category</th>
                        <th className="pb-4 px-4">Location</th>
                        <th className="pb-4 pl-4 text-right">Share Link</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {jobs.map((job) => {
                        const isExpired = !!(job.postingDuration && job.createdAt && (new Date().getTime() - new Date(job.createdAt).getTime()) > job.postingDuration * 24 * 60 * 60 * 1000);
                        return (
                          <tr key={job.id} className={`text-slate-300 hover:bg-slate-900/20 transition-all ${isExpired ? "opacity-40 bg-slate-950/20 select-none pointer-events-none" : ""}`}>
                            <td className="py-4 pr-4 font-semibold text-white">
                              {job.title}
                              {isExpired && (
                                <span className="ml-2 inline-block px-1.5 py-0.5 bg-rose-500/10 text-rose-400 text-[8px] rounded border border-rose-500/20 font-mono font-bold uppercase">
                                  Expired
                                </span>
                              )}
                            </td>
                            <td className="py-4 px-4 text-xs">
                              <div className="font-semibold text-slate-200">{job.company?.name}</div>
                              <div className="text-slate-400">{job.department?.name}</div>
                            </td>
                            <td className="py-4 px-4 text-xs font-semibold text-indigo-400">
                              {job.category}
                            </td>
                            <td className="py-4 px-4 text-xs text-slate-400">{job.location}</td>
                            <td className="py-4 pl-4 text-right">
                              {job.shareableLink ? (
                                <button
                                  onClick={() => handleCopyLink(job.shareableLink!, job.id)}
                                  className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-all ${
                                    copiedId === job.id
                                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                      : "bg-slate-950 hover:bg-indigo-600 hover:text-white border-slate-800 text-slate-400"
                                  }`}
                                  disabled={isExpired}
                                >
                                  {copiedId === job.id ? "Copied! ✓" : "Copy Link"}
                                </button>
                              ) : (
                                <span className="text-xs text-slate-500">Not Generated</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              
              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between border-t border-slate-800 pt-4">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage(p => p - 1)}
                    className="text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="text-slate-400 text-sm">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    disabled={page === totalPages}
                    onClick={() => setPage(p => p + 1)}
                    className="text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
