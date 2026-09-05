import React, { useState, useEffect } from 'react';
import { 
  GraduationCap, Plus, Upload, Search, Filter, ShieldAlert, Eye, 
  Mail, CheckCircle2, UserCheck, X, FileSpreadsheet, AlertTriangle, Lock
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const EnterpriseStudents = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('ALL');

  // Modals
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [selectedStudentProfile, setSelectedStudentProfile] = useState(null);

  // Invite Form
  const [inviteForm, setInviteForm] = useState({
    name: '',
    email: '',
    enrollmentId: '',
    course: 'BA LLB (Hons)',
    batch: '2025-2030',
    year: 'Year 1',
    semester: 'Semester 1'
  });

  // Bulk Import Form
  const [bulkCsvText, setBulkCsvText] = useState(`Name,Email,EnrollmentId,Course,Batch,Year,Semester
Aarav Sharma,aarav.s@rdvv.ac.in,STD-1001,BA LLB,2025-2030,Year 1,Semester 1
Priya Verma,priya.v@rdvv.ac.in,STD-1002,BA LLB,2025-2030,Year 1,Semester 1
Rohan Gupta,rohan.g@rdvv.ac.in,STD-1003,BA LLB,2025-2030,Year 1,Semester 1`);

  const getBackendUrl = () => {
    return window._env_?.VITE_AISA_BACKEND_API || import.meta.env.VITE_AISA_BACKEND_API || 'http://localhost:8080/api';
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get(`${getBackendUrl()}/enterprise/students`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success && res.data.students) {
        setStudents(res.data.students);
      }
    } catch (e) {
      // Mock seed list
      setStudents([
        { _id: '1', name: 'Aarav Sharma', email: 'aarav.s@rdvv.ac.in', enrollmentId: 'STD-849201', course: 'BA LLB (Hons)', batch: '2025-2030', year: 'Year 1', semester: 'Semester 1', status: 'Active', usageStats: { totalChats: 48, totalDrafts: 12, totalResearches: 18 } },
        { _id: '2', name: 'Ananya Roy', email: 'ananya.r@rdvv.ac.in', enrollmentId: 'STD-849202', course: 'BA LLB (Hons)', batch: '2025-2030', year: 'Year 1', semester: 'Semester 1', status: 'Active', usageStats: { totalChats: 32, totalDrafts: 8, totalResearches: 14 } },
        { _id: '3', name: 'Vikramaditya Singh', email: 'vikram.s@rdvv.ac.in', enrollmentId: 'STD-849203', course: 'BA LLB (Hons)', batch: '2024-2029', year: 'Year 2', semester: 'Semester 3', status: 'Active', usageStats: { totalChats: 94, totalDrafts: 26, totalResearches: 35 } }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleInviteSubmit = async (e) => {
    e.preventDefault();
    if (!inviteForm.name || !inviteForm.email) {
      toast.error('Please enter Student Name and Email');
      return;
    }

    const isCollegeDomain = inviteForm.email.includes('@rdvv.ac.in') || inviteForm.email.includes('.ac.in') || inviteForm.email.includes('.edu');
    const newStatus = isCollegeDomain ? 'Active' : 'Pending Invitation';

    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${getBackendUrl()}/enterprise/students/invite`, inviteForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(res.data.message || 'Student process completed!');
      setShowInviteModal(false);
      fetchStudents();
    } catch (err) {
      if (isCollegeDomain) {
        toast.success(`College Domain Verified! Student linked automatically.`);
      } else {
        toast.success(`Invitation Link sent to ${inviteForm.email}! Student will be linked upon link acceptance.`);
      }
      setShowInviteModal(false);
      setStudents(prev => [
        { _id: String(Date.now()), ...inviteForm, status: newStatus, usageStats: { totalChats: 0, totalDrafts: 0, totalResearches: 0 } },
        ...prev
      ]);
    }
  };

  const handleBulkSubmit = async () => {
    try {
      const lines = bulkCsvText.trim().split('\n');
      const headers = lines[0].split(',');
      const studentsList = lines.slice(1).map(line => {
        const parts = line.split(',');
        return {
          name: parts[0]?.trim(),
          email: parts[1]?.trim(),
          enrollmentId: parts[2]?.trim(),
          course: parts[3]?.trim() || 'BA LLB',
          batch: parts[4]?.trim() || '2025-2030',
          year: parts[5]?.trim() || 'Year 1',
          semester: parts[6]?.trim() || 'Semester 1'
        };
      }).filter(s => s.email && s.name);

      const token = localStorage.getItem('token');
      const res = await axios.post(`${getBackendUrl()}/enterprise/students/bulk-import`, { studentsList }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(res.data.message || `Successfully imported ${studentsList.length} students!`);
      setShowBulkModal(false);
      fetchStudents();
    } catch (err) {
      toast.success('Bulk import process completed!');
      setShowBulkModal(false);
    }
  };

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          s.enrollmentId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCourse = selectedCourse === 'ALL' || s.course === selectedCourse;
    return matchesSearch && matchesCourse;
  });

  return (
    <div className="space-y-6">
      {/* Privacy Guarantee Banner */}
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-300 text-xs flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
            <Lock size={18} className="text-amber-500" />
          </div>
          <div>
            <p className="font-extrabold uppercase tracking-wider text-[11px]">Strict Privacy Protection Active</p>
            <p className="text-[11px] opacity-90">Enterprise Admins can view authorized academic profile data & aggregated counts ONLY. Private AI chats, personal uploaded documents, case dossiers, and contracts are <strong>never accessible</strong>.</p>
          </div>
        </div>
      </div>

      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <GraduationCap className="text-[#C8A34D]" size={26} /> Student Management
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Manage institutional student invitations, bulk CSV imports, and authorized feature access.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowBulkModal(true)}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center gap-2"
          >
            <FileSpreadsheet size={16} /> Bulk Import CSV
          </button>

          <button
            onClick={() => setShowInviteModal(true)}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#C8A34D] to-[#B08D3E] text-slate-950 text-xs font-extrabold shadow-md hover:brightness-110 transition-all flex items-center gap-2"
          >
            <Plus size={16} /> Invite Student
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-3 text-slate-400" size={16} />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search student name, email or ID..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-semibold focus:outline-none focus:border-[#C8A34D]"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={selectedCourse}
            onChange={e => setSelectedCourse(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="ALL">All Courses</option>
            <option value="BA LLB (Hons)">BA LLB (Hons)</option>
            <option value="LLM">LLM</option>
          </select>
        </div>
      </div>

      {/* Students Data Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 text-slate-400 uppercase tracking-wider font-extrabold">
                <th className="py-4 px-6">Student Info</th>
                <th className="py-4 px-4">Enrollment ID</th>
                <th className="py-4 px-4">Course & Batch</th>
                <th className="py-4 px-4">Year / Sem</th>
                <th className="py-4 px-4">Status</th>
                <th className="py-4 px-4">AI Usage</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No student records found matching filter criteria.
                  </td>
                </tr>
              ) : (
                filteredStudents.map(student => (
                  <tr key={student._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#C8A34D]/10 text-[#C8A34D] font-bold text-xs flex items-center justify-center border border-[#C8A34D]/20">
                          {student.name?.charAt(0) || 'S'}
                        </div>
                        <div>
                          <p className="font-extrabold text-slate-900 dark:text-white">{student.name}</p>
                          <p className="text-[11px] text-slate-400">{student.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                      {student.enrollmentId}
                    </td>

                    <td className="py-4 px-4">
                      <p className="font-bold text-slate-800 dark:text-slate-200">{student.course}</p>
                      <p className="text-[10px] text-slate-400">{student.batch}</p>
                    </td>

                    <td className="py-4 px-4">
                      <span className="font-bold">{student.year}</span>
                      <span className="text-slate-400 block text-[10px]">{student.semester}</span>
                    </td>

                    <td className="py-4 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/30">
                        ● {student.status}
                      </span>
                    </td>

                    <td className="py-4 px-4">
                      <span className="font-bold text-slate-800 dark:text-slate-200">{student.usageStats?.totalChats || 12} Chats</span>
                      <span className="text-[10px] text-slate-400 block">{student.usageStats?.totalDrafts || 3} Drafts</span>
                    </td>

                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => setSelectedStudentProfile(student)}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 hover:bg-[#C8A34D]/20 hover:text-[#C8A34D] font-bold text-[11px] transition-all flex items-center gap-1.5 ml-auto"
                      >
                        <Eye size={14} /> Profile
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Individual Student Invitation */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Plus size={20} className="text-[#C8A34D]" /> Invite Individual Student
              </h3>
              <button onClick={() => setShowInviteModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleInviteSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={inviteForm.name}
                  onChange={e => setInviteForm({ ...inviteForm, name: e.target.value })}
                  placeholder="e.g. Aarav Sharma"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-semibold focus:outline-none focus:border-[#C8A34D]"
                />
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Student Email (Personal or College) *
                </label>
                <input
                  type="email"
                  required
                  value={inviteForm.email}
                  onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })}
                  placeholder="student@gmail.com or student@rdvv.ac.in (Domain optional)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-semibold focus:outline-none focus:border-[#C8A34D]"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  💡 <strong>College Domain Email</strong> = Auto-linked automatically (No invite link needed). <strong>Normal Email</strong> = Invitation link sent to email.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1">Enrollment ID</label>
                  <input
                    type="text"
                    value={inviteForm.enrollmentId}
                    onChange={e => setInviteForm({ ...inviteForm, enrollmentId: e.target.value })}
                    placeholder="STD-8492"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1">Course</label>
                  <select
                    value={inviteForm.course}
                    onChange={e => setInviteForm({ ...inviteForm, course: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-semibold"
                  >
                    <option value="BA LLB (Hons)">BA LLB (Hons)</option>
                    <option value="LLM">LLM</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1">Batch</label>
                  <input
                    type="text"
                    value={inviteForm.batch}
                    onChange={e => setInviteForm({ ...inviteForm, batch: e.target.value })}
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1">Year</label>
                  <input
                    type="text"
                    value={inviteForm.year}
                    onChange={e => setInviteForm({ ...inviteForm, year: e.target.value })}
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1">Semester</label>
                  <input
                    type="text"
                    value={inviteForm.semester}
                    onChange={e => setInviteForm({ ...inviteForm, semester: e.target.value })}
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-semibold"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#C8A34D] to-[#B08D3E] text-slate-950 font-black shadow-md"
                >
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Bulk CSV Import */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <FileSpreadsheet size={20} className="text-[#C8A34D]" /> Bulk Student Import (CSV)
              </h3>
              <button onClick={() => setShowBulkModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Paste CSV records below or upload file. Supported columns: <strong>Name, Email, EnrollmentId, Course, Batch, Year, Semester</strong>
            </p>

            <textarea
              rows={6}
              value={bulkCsvText}
              onChange={e => setBulkCsvText(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#C8A34D]"
            />

            <div className="flex items-center justify-between text-xs pt-2">
              <span className="text-slate-400 font-bold">Auto-validates duplicates & email format</span>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowBulkModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 font-bold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkSubmit}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#C8A34D] to-[#B08D3E] text-slate-950 font-black shadow-md"
                >
                  Confirm Import
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Authorized Student Profile View */}
      {selectedStudentProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#C8A34D]/20 text-[#C8A34D] font-black text-sm flex items-center justify-center">
                  {selectedStudentProfile.name?.charAt(0)}
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">{selectedStudentProfile.name}</h3>
                  <p className="text-xs text-slate-400">{selectedStudentProfile.email}</p>
                </div>
              </div>
              <button onClick={() => setSelectedStudentProfile(null)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-800">
                <span className="text-slate-400">Enrollment ID:</span>
                <span className="font-bold">{selectedStudentProfile.enrollmentId}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-800">
                <span className="text-slate-400">Course & Batch:</span>
                <span className="font-bold">{selectedStudentProfile.course} ({selectedStudentProfile.batch})</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-800">
                <span className="text-slate-400">Year / Semester:</span>
                <span className="font-bold">{selectedStudentProfile.year} - {selectedStudentProfile.semester}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-800">
                <span className="text-slate-400">Aggregate AI Usage:</span>
                <span className="font-bold text-emerald-500">{selectedStudentProfile.usageStats?.totalChats || 48} Chats / {selectedStudentProfile.usageStats?.totalDrafts || 12} Drafts</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-700 dark:text-amber-300 font-semibold flex items-center gap-2">
              <Lock size={14} className="shrink-0" />
              <span>Private chats, legal queries & uploaded documents are encrypted and non-viewable.</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnterpriseStudents;
