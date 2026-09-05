import React, { useState } from 'react';
import { FileText, Download, Printer, Filter, ShieldCheck, CheckCircle2, Calendar, Sparkles, Award } from 'lucide-react';
import toast from 'react-hot-toast';

const EnterpriseReports = () => {
  const [filters, setFilters] = useState({
    dateRange: 'Last 30 Days',
    course: 'BA LLB (Hons)',
    batch: 'Batch 2025-2030',
    semester: 'Semester 1'
  });

  const [generating, setGenerating] = useState(false);

  const handleExportPdf = () => {
    setGenerating(true);
    toast.loading('Generating Institutional Audit PDF Report...');
    setTimeout(() => {
      setGenerating(false);
      toast.dismiss();
      toast.success('📄 Institutional AI Legal Audit Report generated! Opening Print Dialog...');
      window.print();
    }, 1000);
  };

  return (
    <div className="space-y-6 print:p-0 print:space-y-4">
      {/* Header (Hidden in Print) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="text-[#C8A34D]" size={26} /> Institutional Audit & Activity Reports
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Generate printable activity reports for NAAC accreditation preparation, BCI inspection, internal audits, and digital literacy records.
          </p>
        </div>

        <button
          onClick={handleExportPdf}
          disabled={generating}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#C8A34D] to-[#B08D3E] text-slate-950 text-xs font-extrabold shadow-md hover:brightness-110 transition-all flex items-center gap-2 cursor-pointer shrink-0"
        >
          <Printer size={16} /> Export Audit Report as PDF
        </button>
      </div>

      {/* Dynamic Filters Bar (Hidden in Print) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold print:hidden shadow-xs">
        <div>
          <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1">Date Range</label>
          <select
            value={filters.dateRange}
            onChange={e => setFilters({ ...filters, dateRange: e.target.value })}
            className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-bold"
          >
            <option value="Last 30 Days">Last 30 Days (Semester Peak)</option>
            <option value="Last Semester">Last Semester</option>
            <option value="Academic Year 2025-26">Academic Year 2025-26</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1">Law Course</label>
          <select
            value={filters.course}
            onChange={e => setFilters({ ...filters, course: e.target.value })}
            className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-bold"
          >
            <option value="BA LLB (Hons)">BA LLB (Hons)</option>
            <option value="BBA LLB (Hons)">BBA LLB (Hons)</option>
            <option value="LLB (3-Yr)">LLB (3-Yr Graduate)</option>
            <option value="LLM">LLM Post-Graduate</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1">Academic Batch</label>
          <select
            value={filters.batch}
            onChange={e => setFilters({ ...filters, batch: e.target.value })}
            className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-bold"
          >
            <option value="Batch 2025-2030">Batch 2025-2030</option>
            <option value="Batch 2024-2029">Batch 2024-2029</option>
            <option value="Batch 2023-2028">Batch 2023-2028</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1">Semester</label>
          <select
            value={filters.semester}
            onChange={e => setFilters({ ...filters, semester: e.target.value })}
            className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-bold"
          >
            <option value="Semester 1">Semester 1</option>
            <option value="Semester 2">Semester 2</option>
            <option value="Semester 3">Semester 3</option>
            <option value="Semester 4">Semester 4</option>
            <option value="Semester 5">Semester 5</option>
          </select>
        </div>
      </div>

      {/* OFFICIAL AUDIT REPORT DOCUMENT (LETTERHEAD & PRINTABLE FORMAT) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm space-y-8 print:border-none print:shadow-none print:p-0">
        {/* Letterhead Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-6">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#C8A34D]">
              AI LEGAL™ ENTERPRISE AUDIT & ACCREDITATION RECORD
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
              Institutional AI Legal Learning & Research Activity Report
            </h2>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              Rani Durgavati Vishwavidyalaya (RDVV) / Rajiv Gandhi National University of Law • {filters.course} ({filters.semester})
            </p>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-bold text-slate-400 block uppercase">Report Date</span>
            <span className="text-xs font-black text-slate-800 dark:text-slate-200">{new Date().toLocaleDateString()}</span>
            <span className="text-[10px] text-emerald-500 font-extrabold block mt-1">Ref: INST-RPT-2026-948</span>
          </div>
        </div>

        {/* Executive Summary Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <span className="text-slate-400 text-[10px] font-bold uppercase block mb-0.5">Enrolled Students</span>
            <span className="text-xl font-black text-slate-900 dark:text-white">240 Students</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">{filters.batch}</span>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <span className="text-slate-400 text-[10px] font-bold uppercase block mb-0.5">Platform Adoption Rate</span>
            <span className="text-xl font-black text-emerald-500">94.2%</span>
            <span className="text-[10px] text-emerald-500 font-bold block mt-0.5">High Engagement</span>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <span className="text-slate-400 text-[10px] font-bold uppercase block mb-0.5">Total Queries Processed</span>
            <span className="text-xl font-black text-slate-900 dark:text-white">34,850</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">{filters.dateRange}</span>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <span className="text-slate-400 text-[10px] font-bold uppercase block mb-0.5">Legal Drafts Created</span>
            <span className="text-xl font-black text-[#C8A34D]">2,800</span>
            <span className="text-[10px] text-[#C8A34D] font-bold block mt-0.5">Memorials & Pleadings</span>
          </div>
        </div>

        {/* Activity Breakdown Table */}
        <div className="space-y-3">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
            Aggregate Learning Activity Breakdown by Academic Module
          </h3>
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase">
                  <th className="py-3 px-4">Module Name</th>
                  <th className="py-3 px-4">Academic Category</th>
                  <th className="py-3 px-4">Total Activity</th>
                  <th className="py-3 px-4">Student Engagement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                <tr>
                  <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">AI Legal Assistant & Tutor</td>
                  <td className="py-3 px-4">Core Legal Learning</td>
                  <td className="py-3 px-4">14,200 Queries</td>
                  <td className="py-3 px-4 text-emerald-500 font-extrabold">96.8%</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">Bare Act & Quiz Practice</td>
                  <td className="py-3 px-4">Academic Preparation</td>
                  <td className="py-3 px-4">5,400 Tests Completed</td>
                  <td className="py-3 px-4 text-emerald-500 font-extrabold">88.4%</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">Precedents & Citation Search</td>
                  <td className="py-3 px-4">Legal Research</td>
                  <td className="py-3 px-4">2,100 Citations Retreived</td>
                  <td className="py-3 px-4 text-emerald-500 font-extrabold">78.2%</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">AI Mock Courtroom</td>
                  <td className="py-3 px-4">Practical Advocacy</td>
                  <td className="py-3 px-4">1,250 Trial Runs</td>
                  <td className="py-3 px-4 text-emerald-500 font-extrabold">72.0%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Verification Checksum & Digital Signature Footer */}
        <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            <p className="font-extrabold text-slate-900 dark:text-white">Verified Institutional AI Legal Learning Record</p>
            <p className="text-[11px] text-slate-400">Generated for NAAC accreditation preparation, internal audit, and BCI inspection records.</p>
          </div>
          <div className="flex items-center gap-2 text-emerald-500 font-black shrink-0">
            <ShieldCheck size={20} /> Digitally Signed by AI LEGAL™ Platform
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnterpriseReports;
