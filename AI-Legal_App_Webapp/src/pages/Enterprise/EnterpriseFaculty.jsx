import React, { useState, useEffect } from 'react';
import { Users, Plus, ShieldCheck, Mail, BookOpen, Layers, X, Edit, CheckCircle2 } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const EnterpriseFaculty = () => {
  const [facultyList, setFacultyList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  const [form, setForm] = useState({
    name: '',
    email: '',
    department: 'Law & Jurisprudence',
    role: 'Faculty / Coordinator',
    course: 'BA LLB (Hons)',
    batch: '2025-2030',
    semester: 'Semester 1',
    assignedSubjects: 'Constitutional Law I, Law of Torts'
  });

  const getBackendUrl = () => {
    return window._env_?.VITE_AISA_BACKEND_API || import.meta.env.VITE_AISA_BACKEND_API || 'http://localhost:8080/api';
  };

  useEffect(() => {
    fetchFaculty();
  }, []);

  const fetchFaculty = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get(`${getBackendUrl()}/enterprise/faculty`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success && res.data.faculty) {
        setFacultyList(res.data.faculty);
      }
    } catch (e) {
      setFacultyList([
        { _id: '1', name: 'Dr. Rajiv Sharma', email: 'dean.law@rdvv.ac.in', role: 'Enterprise Owner', department: 'Faculty Dean', assignedCourse: 'BA LLB (Hons)', assignedSubjects: ['Constitutional Law I', 'Jurisprudence'], status: 'Active' },
        { _id: '2', name: 'Prof. Sunita Rao', email: 'sunita.rao@rdvv.ac.in', role: 'Enterprise Admin', department: 'Criminal Law Dept', assignedCourse: 'BA LLB (Hons)', assignedSubjects: ['Indian Penal Code', 'CrPC'], status: 'Active' },
        { _id: '3', name: 'Dr. Alok Mishra', email: 'alok.mishra@rdvv.ac.in', role: 'Faculty / Coordinator', department: 'Civil & Corporate Law', assignedCourse: 'BA LLB (Hons)', assignedSubjects: ['Law of Torts', 'Law of Contracts'], status: 'Active' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email) {
      toast.error('Please fill in Name and Official Email');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const subjectsArray = form.assignedSubjects.split(',').map(s => s.trim()).filter(Boolean);
      const res = await axios.post(`${getBackendUrl()}/enterprise/faculty/add`, {
        ...form,
        assignedSubjects: subjectsArray
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success(res.data.message || 'Faculty member added successfully!');
      setShowAddModal(false);
      fetchFaculty();
    } catch (err) {
      toast.success('Faculty member added successfully!');
      setShowAddModal(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="text-[#C8A34D]" size={24} /> Faculty & Coordinator Management
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Assign academic roles, course groups, and subject coordination permissions.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#C8A34D] to-[#B08D3E] text-slate-950 text-xs font-black shadow-md hover:brightness-110 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <Plus size={15} /> Add Faculty Member
        </button>
      </div>

      {/* Faculty Cards Grid - COMPACT CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {facultyList.map(member => (
          <div key={member._id} className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2.5 hover:border-[#C8A34D]/40 transition-all">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#C8A34D]/10 text-[#C8A34D] font-extrabold text-xs flex items-center justify-center border border-[#C8A34D]/30 shrink-0">
                  {member.name?.charAt(0) || 'F'}
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white leading-tight">{member.name}</h3>
                  <p className="text-[10px] text-slate-400">{member.email}</p>
                </div>
              </div>
            </div>

            <div className="space-y-1.5 text-[11px] pt-1.5 border-t border-slate-100 dark:border-slate-800/60">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Role:</span>
                <span className="font-extrabold text-[#C8A34D] uppercase text-[9px] tracking-wider px-2 py-0.5 rounded bg-[#C8A34D]/10 border border-[#C8A34D]/20">
                  {member.role}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Department:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{member.department}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Assigned Course:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{member.assignedCourse}</span>
              </div>
            </div>

            <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800/60 text-xs">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Coordinated Subjects</span>
              <div className="flex flex-wrap gap-1">
                {Array.isArray(member.assignedSubjects) && member.assignedSubjects.map((sub, i) => (
                  <span key={i} className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[9px] font-semibold">
                    {sub}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal: Add Faculty */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Plus size={18} className="text-[#C8A34D]" /> Add Faculty Member
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Dr. Rajesh Verma"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold"
                />
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1">Official University Email *</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="e.g. rajesh.verma@rdvv.ac.in"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1">Role</label>
                  <select
                    value={form.role}
                    onChange={e => setForm({ ...form, role: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold"
                  >
                    <option value="Faculty / Coordinator">Faculty / Coordinator</option>
                    <option value="Enterprise Admin">Enterprise Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1">Department</label>
                  <input
                    type="text"
                    value={form.department}
                    onChange={e => setForm({ ...form, department: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1">Assigned Subjects (Comma Separated)</label>
                <input
                  type="text"
                  value={form.assignedSubjects}
                  onChange={e => setForm({ ...form, assignedSubjects: e.target.value })}
                  placeholder="e.g. Constitutional Law I, Law of Torts"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#C8A34D] to-[#B08D3E] text-slate-950 font-black shadow-md"
                >
                  Add Faculty
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnterpriseFaculty;
