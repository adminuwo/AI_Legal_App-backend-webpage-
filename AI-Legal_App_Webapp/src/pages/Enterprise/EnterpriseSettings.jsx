import React, { useState } from 'react';
import { Settings, Building2, Globe, ShieldCheck, CreditCard, Bell, Lock, Save, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

const EnterpriseSettings = () => {
  const [activeTab, setActiveTab] = useState('profile');

  const [profile, setProfile] = useState({
    name: 'Rani Durgavati Vishwavidyalaya (RDVV)',
    institutionType: 'University',
    officialEmail: 'admin@rdvv.ac.in',
    domain: 'rdvv.ac.in',
    domainStatus: 'Verified',
    website: 'https://rdvv.ac.in',
    seats: 500
  });

  const handleSave = () => {
    toast.success('Enterprise Settings saved successfully!');
  };

  const tabs = [
    { id: 'profile', label: 'Institution Profile', icon: Building2 },
    { id: 'domain', label: 'Domain Management', icon: Globe },
    { id: 'roles', label: 'Roles & Permissions', icon: ShieldCheck },
    { id: 'budget', label: 'Usage & Budget Rules', icon: CreditCard },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'privacy', label: 'Data & Privacy', icon: Lock }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Settings className="text-[#C8A34D]" size={26} /> Enterprise Workspace Settings
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Configure institutional profile, verified email domains, role permissions, and privacy controls.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#C8A34D] to-[#B08D3E] text-slate-950 text-xs font-extrabold shadow-md hover:brightness-110 transition-all flex items-center gap-2"
        >
          <Save size={16} /> Save Settings
        </button>
      </div>

      {/* Tabs Layout */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Navigation Tabs */}
        <div className="w-full lg:w-64 space-y-1 shrink-0">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all text-left cursor-pointer ${
                  active
                    ? 'bg-[#C8A34D] text-slate-950 shadow-md font-black'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
                }`}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Box */}
        <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
          {/* TAB 1: Profile */}
          {activeTab === 'profile' && (
            <div className="space-y-5 text-xs">
              <h3 className="text-base font-black text-slate-900 dark:text-white">Institution Profile</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1">Institution Name</label>
                  <input
                    type="text"
                    value={profile.name}
                    onChange={e => setProfile({ ...profile, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1">Institution Type</label>
                  <select
                    value={profile.institutionType}
                    onChange={e => setProfile({ ...profile, institutionType: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-semibold"
                  >
                    <option value="University">University</option>
                    <option value="Law College">Law College</option>
                    <option value="Educational Institution">Educational Institution</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1">Official Email</label>
                  <input
                    type="email"
                    value={profile.officialEmail}
                    onChange={e => setProfile({ ...profile, officialEmail: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1">Website URL</label>
                  <input
                    type="text"
                    value={profile.website}
                    onChange={e => setProfile({ ...profile, website: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-semibold"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Domain Management */}
          {activeTab === 'domain' && (
            <div className="space-y-5 text-xs">
              <h3 className="text-base font-black text-slate-900 dark:text-white">Domain Management & Auto-Linking</h3>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-800 dark:text-slate-200">Verified Domain: @{profile.domain}</p>
                    <p className="text-[11px] text-slate-400">Students signing up with @{profile.domain} are automatically linked to Enterprise entitlement.</p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-bold">
                    ● VERIFIED
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Roles & Permissions */}
          {activeTab === 'roles' && (
            <div className="space-y-4 text-xs">
              <h3 className="text-base font-black text-slate-900 dark:text-white">Roles & Access Hierarchy</h3>
              <div className="space-y-2">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <span className="font-extrabold text-slate-900 dark:text-white">Enterprise Owner:</span> Full access to management, budgets, faculty, and security settings.
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <span className="font-extrabold text-slate-900 dark:text-white">University Admin:</span> Management of students, faculty, feature toggles, and reports.
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <span className="font-extrabold text-slate-900 dark:text-white">Faculty / Coordinator:</span> Access limited to assigned academic groups and curriculum alignment.
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <span className="font-extrabold text-slate-900 dark:text-white">Student:</span> No Enterprise management access. Receives entitled AI tools & syllabus context only.
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Budget */}
          {activeTab === 'budget' && (
            <div className="space-y-4 text-xs">
              <h3 className="text-base font-black text-slate-900 dark:text-white">Usage & Budget Rules</h3>
              <p className="text-slate-500">Configured budget allocation is ₹50,000 / month with alert notifications at 50%, 75%, 90%, 100% threshold.</p>
            </div>
          )}

          {/* TAB 5: Notifications */}
          {activeTab === 'notifications' && (
            <div className="space-y-4 text-xs">
              <h3 className="text-base font-black text-slate-900 dark:text-white">Admin Notifications</h3>
              <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <input type="checkbox" defaultChecked className="accent-[#C8A34D]" />
                <span>Receive email alert when student joins via auto-domain link</span>
              </label>
              <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <input type="checkbox" defaultChecked className="accent-[#C8A34D]" />
                <span>Receive budget alert when 75% threshold is reached</span>
              </label>
            </div>
          )}

          {/* TAB 6: Privacy */}
          {activeTab === 'privacy' && (
            <div className="space-y-4 text-xs">
              <h3 className="text-base font-black text-slate-900 dark:text-white">Data & Privacy Safeguards</h3>
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-300">
                <p className="font-bold">Strict Privacy Boundary Active:</p>
                <p className="mt-1 opacity-90">Enterprise Owner & Admins are strictly prohibited from viewing private student AI conversations, legal questions, or personal uploaded documents. Only aggregate statistics and authorized academic profile info are exposed.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnterpriseSettings;
