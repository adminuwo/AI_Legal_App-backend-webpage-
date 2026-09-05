import React, { useState, useEffect } from 'react';
import { Layers, Plus, BookOpen, ChevronRight, Edit, Trash2, Archive, CheckCircle2, X, PlusCircle } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const EnterpriseAcademic = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddCourseModal, setShowAddCourseModal] = useState(false);
  const [showAddSubjectModal, setShowAddSubjectModal] = useState(false);
  const [targetSemester, setTargetSemester] = useState(null); // { courseId, batchIndex, semesterIndex, semName }

  const [newCourseName, setNewCourseName] = useState('');
  const [newCourseCode, setNewCourseCode] = useState('');
  const [durationYears, setDurationYears] = useState(5);

  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectCode, setNewSubjectCode] = useState('');

  const getBackendUrl = () => {
    return window._env_?.VITE_AISA_BACKEND_API || import.meta.env.VITE_AISA_BACKEND_API || 'http://localhost:8080/api';
  };

  useEffect(() => {
    fetchAcademicTree();
  }, []);

  const fetchAcademicTree = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get(`${getBackendUrl()}/enterprise/academic`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success && res.data.courses) {
        setCourses(res.data.courses);
      }
    } catch (e) {
      setCourses([
        {
          _id: 'c1',
          name: 'BA LLB (Hons)',
          code: 'BALLB',
          durationYears: 5,
          status: 'Active',
          batches: [
            {
              name: '2025-2030',
              year: 'Year 1',
              semesters: [
                {
                  number: 1,
                  name: 'Semester 1',
                  subjects: [
                    { name: 'Constitutional Law I', code: 'CL101' },
                    { name: 'Law of Torts', code: 'LT102' },
                    { name: 'Legal Language & Writing', code: 'LL103' }
                  ]
                },
                {
                  number: 2,
                  name: 'Semester 2',
                  subjects: [
                    { name: 'Law of Contracts I', code: 'LC104' },
                    { name: 'Family Law I', code: 'FL105' }
                  ]
                }
              ]
            }
          ]
        },
        {
          _id: 'c2',
          name: 'LLM (Master of Laws)',
          code: 'LLM',
          durationYears: 2,
          status: 'Active',
          batches: [
            {
              name: '2025-2027',
              year: 'Year 1',
              semesters: [
                {
                  number: 1,
                  name: 'Semester 1',
                  subjects: [
                    { name: 'Advanced Constitutional Governance', code: 'ACG501' },
                    { name: 'International Trade Law', code: 'ITL502' }
                  ]
                }
              ]
            }
          ]
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCourse = () => {
    if (!newCourseName) {
      toast.error('Please enter Course Name');
      return;
    }
    const newCourseObj = {
      _id: String(Date.now()),
      name: newCourseName,
      code: newCourseCode || 'CRS',
      durationYears: Number(durationYears) || 3,
      status: 'Active',
      batches: [
        {
          name: '2025-2028',
          year: 'Year 1',
          semesters: [
            { number: 1, name: 'Semester 1', subjects: [{ name: 'Intro to Jurisprudence', code: 'JUR101' }] }
          ]
        }
      ]
    };
    setCourses(prev => [...prev, newCourseObj]);
    setShowAddCourseModal(false);
    toast.success(`Course "${newCourseName}" created successfully!`);
    setNewCourseName('');
    setNewCourseCode('');
  };

  const handleDeleteCourse = (courseId, courseName) => {
    if (window.confirm(`Are you sure you want to delete course "${courseName}"?`)) {
      setCourses(prev => prev.filter(c => c._id !== courseId));
      toast.success(`Course "${courseName}" deleted successfully!`);
    }
  };

  const openAddSubject = (courseId, batchIdx, semIdx, semName) => {
    setTargetSemester({ courseId, batchIdx, semIdx, semName });
    setNewSubjectName('');
    setNewSubjectCode('');
    setShowAddSubjectModal(true);
  };

  const handleAddSubjectSubmit = () => {
    if (!newSubjectName) {
      toast.error('Please enter Subject Name');
      return;
    }
    const code = newSubjectCode || `SUB-${Math.floor(100 + Math.random() * 900)}`;

    setCourses(prevCourses => {
      return prevCourses.map(course => {
        if (course._id === targetSemester.courseId) {
          const updatedBatches = [...course.batches];
          const targetBatch = { ...updatedBatches[targetSemester.batchIdx] };
          const updatedSemesters = [...targetBatch.semesters];
          const targetSem = { ...updatedSemesters[targetSemester.semIdx] };
          targetSem.subjects = [...(targetSem.subjects || []), { name: newSubjectName, code }];
          updatedSemesters[targetSemester.semIdx] = targetSem;
          targetBatch.semesters = updatedSemesters;
          updatedBatches[targetSemester.batchIdx] = targetBatch;
          return { ...course, batches: updatedBatches };
        }
        return course;
      });
    });

    setShowAddSubjectModal(false);
    toast.success(`Subject "${newSubjectName}" (${code}) added to ${targetSemester.semName}!`);
  };

  const handleDeleteSubject = (courseId, batchIdx, semIdx, subjectCode, subjectName) => {
    setCourses(prevCourses => {
      return prevCourses.map(course => {
        if (course._id === courseId) {
          const updatedBatches = [...course.batches];
          const targetBatch = { ...updatedBatches[batchIdx] };
          const updatedSemesters = [...targetBatch.semesters];
          const targetSem = { ...updatedSemesters[semIdx] };
          targetSem.subjects = targetSem.subjects.filter(s => s.code !== subjectCode && s.name !== subjectName);
          updatedSemesters[semIdx] = targetSem;
          targetBatch.semesters = updatedSemesters;
          updatedBatches[batchIdx] = targetBatch;
          return { ...course, batches: updatedBatches };
        }
        return course;
      });
    });
    toast.success(`Subject "${subjectName}" deleted!`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="text-[#C8A34D]" size={26} /> Academic Structure Hierarchy
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Configure Courses, Batches, Semesters, and Subject curriculum maps dynamically.
          </p>
        </div>

        <button
          onClick={() => setShowAddCourseModal(true)}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#C8A34D] to-[#B08D3E] text-slate-950 text-xs font-extrabold shadow-md hover:brightness-110 transition-all flex items-center gap-2"
        >
          <Plus size={16} /> Create New Course
        </button>
      </div>

      {/* Courses Tree List */}
      <div className="space-y-6">
        {courses.map(course => (
          <div key={course._id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#C8A34D]/10 text-[#C8A34D] font-extrabold text-sm flex items-center justify-center border border-[#C8A34D]/30">
                  <BookOpen size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                    {course.name} <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">{course.code}</span>
                  </h3>
                  <p className="text-xs text-slate-400 font-semibold">{course.durationYears} Years Academic Degree Program</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 text-xs font-bold">
                  ● {course.status || 'Active'}
                </span>
                
                <button
                  onClick={() => handleDeleteCourse(course._id, course.name)}
                  className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-all cursor-pointer flex items-center gap-1 text-xs font-bold"
                  title="Delete Course"
                >
                  <Trash2 size={15} /> Delete Course
                </button>
              </div>
            </div>

            {/* Batches & Semesters */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Batches & Semester Hierarchy</h4>
              {course.batches?.map((batch, bIdx) => (
                <div key={bIdx} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      <ChevronRight size={16} className="text-[#C8A34D]" /> Batch {batch.name} ({batch.year})
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-4">
                    {batch.semesters?.map((sem, sIdx) => (
                      <div key={sIdx} className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-slate-800 dark:text-slate-200">{sem.name}</span>
                          
                          <button
                            onClick={() => openAddSubject(course._id, bIdx, sIdx, sem.name)}
                            className="px-2.5 py-1 rounded-lg bg-[#C8A34D]/10 hover:bg-[#C8A34D]/20 text-[#C8A34D] border border-[#C8A34D]/30 text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <PlusCircle size={12} /> Add Subject
                          </button>
                        </div>

                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {sem.subjects?.length === 0 ? (
                            <span className="text-[11px] text-slate-400 italic">No subjects added yet</span>
                          ) : (
                            sem.subjects?.map((sub, subIdx) => (
                              <span key={subIdx} className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 group">
                                <span>{sub.name} <code className="text-[9px] opacity-70">({sub.code})</code></span>
                                <button
                                  onClick={() => handleDeleteSubject(course._id, bIdx, sIdx, sub.code, sub.name)}
                                  className="text-slate-400 hover:text-red-500 p-0.5 rounded-full hover:bg-red-500/10 transition-all cursor-pointer ml-1"
                                  title={`Delete ${sub.name}`}
                                >
                                  <X size={12} />
                                </button>
                              </span>
                            ))
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Modal 1: Create Course */}
      {showAddCourseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Plus size={20} className="text-[#C8A34D]" /> Add New Course
              </h3>
              <button onClick={() => setShowAddCourseModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1">Course Title *</label>
                <input
                  type="text"
                  value={newCourseName}
                  onChange={e => setNewCourseName(e.target.value)}
                  placeholder="e.g. BBA LLB (Hons) / B.Com LLB"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-semibold focus:outline-none focus:border-[#C8A34D]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1">Course Code</label>
                  <input
                    type="text"
                    value={newCourseCode}
                    onChange={e => setNewCourseCode(e.target.value)}
                    placeholder="BBALLB"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1">Duration (Years)</label>
                  <input
                    type="number"
                    value={durationYears}
                    onChange={e => setDurationYears(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-semibold"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-3">
                <button
                  onClick={() => setShowAddCourseModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 font-bold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateCourse}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#C8A34D] to-[#B08D3E] text-slate-950 font-black shadow-md"
                >
                  Create Course
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Add Subject to Semester */}
      {showAddSubjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <PlusCircle size={20} className="text-[#C8A34D]" /> Add Subject to {targetSemester?.semName}
              </h3>
              <button onClick={() => setShowAddSubjectModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1">Subject Name *</label>
                <input
                  type="text"
                  value={newSubjectName}
                  onChange={e => setNewSubjectName(e.target.value)}
                  placeholder="e.g. Administrative Law / Company Law"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-semibold focus:outline-none focus:border-[#C8A34D]"
                />
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1">Subject Code</label>
                <input
                  type="text"
                  value={newSubjectCode}
                  onChange={e => setNewSubjectCode(e.target.value)}
                  placeholder="e.g. ADM105"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-semibold"
                />
              </div>

              <div className="pt-3 flex justify-end gap-3">
                <button
                  onClick={() => setShowAddSubjectModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 font-bold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddSubjectSubmit}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#C8A34D] to-[#B08D3E] text-slate-950 font-black shadow-md"
                >
                  Add Subject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnterpriseAcademic;
