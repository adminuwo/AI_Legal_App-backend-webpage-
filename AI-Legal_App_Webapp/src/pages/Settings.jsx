import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Settings2, Palette, Sparkles, Bell, Shield, Database, HelpCircle, 
  Search, Sliders, Moon, Sun, Monitor, Type, Info, Key, LogOut, Trash2, 
  ShieldAlert, Cloud, HelpCircle as HelpIcon, FileText, Check, AlertTriangle, 
  ChevronRight, Volume2, Globe, Calendar, Clock, Laptop, Eye, Heart, Download,
  Bug, MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePersonalization } from '../context/PersonalizationContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { getUserData, userData } from '../userStore/userData';
import { useRecoilState } from 'recoil';
import toast from 'react-hot-toast';
import axios from 'axios';
import { API, apis } from '../types';

const CATEGORIES = [
  { id: 'general', label: 'General', icon: Sliders, description: 'Basic application preferences.' },
  { id: 'appearance', label: 'Appearance', icon: Palette, description: 'Customize UI appearance.' },
  { id: 'notifications', label: 'Notifications', icon: Bell, description: 'Manage reminders and updates.' },
  { id: 'security', label: 'Security', icon: Shield, description: 'Protect your account.' },
  { id: 'data', label: 'Data & Backup', icon: Database, description: 'Manage user data and cloud backups.' },
  { id: 'help', label: 'Help & About', icon: HelpCircle, description: 'Support information and legal policies.' }
];

const SettingsPage = () => {
  const navigate = useNavigate();
  const [currentUserData] = useRecoilState(userData);
  const user = currentUserData.user || getUserData() || { name: 'Advocate', email: 'aditi@uwo24.com' };
  const { personalizations, updatePersonalization, resetPersonalizations } = usePersonalization();
  const { theme, setTheme } = useTheme();
  
  // Local States
  const [activeCategory, setActiveCategory] = useState('general');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  // Dialog States
  const [dialogConfig, setDialogConfig] = useState({ show: false, type: '', title: '', desc: '', action: null });

  // Collapsible Details States
  const [showReleaseNotes, setShowReleaseNotes] = useState(false);
  const [showLicenses, setShowLicenses] = useState(false);

  // Security Form States
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [twoFactor, setTwoFactor] = useState(false);

  // General Settings State bindings
  const generalSettings = useMemo(() => personalizations?.general || {}, [personalizations]);
  const aiPrefs = useMemo(() => personalizations?.aiPreferences || {}, [personalizations]);
  const notifPrefs = useMemo(() => personalizations?.notifications || {}, [personalizations]);
  const dataPrefs = useMemo(() => personalizations?.dataControls || {}, [personalizations]);

  // Sync state values on load
  useEffect(() => {
    if (personalizations?.security) {
      setRecoveryEmail(personalizations.security.recoveryEmail || '');
      setTwoFactor(personalizations.security.twoFactor || false);
    }
  }, [personalizations]);

  // Filter Categories based on Search Query
  const filteredCategories = useMemo(() => {
    if (!searchQuery) return CATEGORIES;
    return CATEGORIES.filter(cat => 
      cat.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cat.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  // Helper for instant toggles
  const handleToggle = async (section, key, currentValue) => {
    try {
      const targetValue = !currentValue;
      await updatePersonalization(section, { [key]: targetValue });
      toast.success('Setting updated instantly! ⚡');
    } catch (e) {
      toast.error('Failed to update setting. Please try again.');
    }
  };

  // Helper for selector changes
  const handleSelectChange = async (section, key, value) => {
    try {
      await updatePersonalization(section, { [key]: value });
      toast.success('Preferences saved successfully!');
    } catch (e) {
      toast.error('Failed to save preferences.');
    }
  };

  // Confirm dialog trigger
  const triggerConfirm = (type, title, desc, action) => {
    setDialogConfig({ show: true, type, title, desc, action });
  };

  // Password Update logic
  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast.error('Please fill in all password fields.');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }
    const loadingToast = toast.loading('Updating password...');
    try {
      // Stub request for change-password to simulate backend interaction (Backend API is not modified)
      await axios.put(`${API}/user/change-password`, {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      }, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      toast.dismiss(loadingToast);
      toast.success('Password updated successfully!');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error(err.response?.data?.error || 'Failed to change password. Please check current password.');
    }
  };

  // Security Toggles
  const handleSecuritySave = async (key, val) => {
    try {
      await updatePersonalization('security', { [key]: val });
      toast.success('Security settings saved.');
    } catch (err) {
      toast.error('Failed to update security setting.');
    }
  };

  // Storage calculation placeholder
  const storageUsagePercent = 4.2;

  const handleFileRestore = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const restored = JSON.parse(event.target.result);
        for (const key of Object.keys(restored)) {
          if (typeof restored[key] === 'object' && restored[key] !== null) {
            await updatePersonalization(key, restored[key]);
          }
        }
        toast.success('Workspace restored successfully! 🔄');
      } catch (err) {
        toast.error('Failed to restore backup. Invalid JSON schema.');
      }
    };
    reader.readAsText(file);
  };

  // Actions
  const handleResetAll = async () => {
    await resetPersonalizations();
    toast.success('All settings reset to defaults.');
    setDialogConfig({ show: false, type: '', title: '', desc: '', action: null });
  };

  const handleDeleteAccount = async () => {
    const loadingToast = toast.loading('Deleting account...');
    try {
      await axios.delete(apis.deleteAccount, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      toast.dismiss(loadingToast);
      toast.success('Account permanently deleted.');
      localStorage.clear();
      window.location.href = '/';
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error('Account deletion failed.');
    }
    setDialogConfig({ show: false, type: '', title: '', desc: '', action: null });
  };

  const handleLogoutAllDevices = () => {
    toast.success('Logged out of all other devices.');
    setDialogConfig({ show: false, type: '', title: '', desc: '', action: null });
  };

  return (
    <div className="min-h-full bg-white flex flex-col font-sans select-text p-6 lg:p-8">
      {/* Search Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 shrink-0">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">AI Legal™ Settings</h1>
          <p className="text-xs font-semibold text-slate-400 mt-1">Configure workspace parameters, styling, and AI agent triggers.</p>
        </div>
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search settings category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-xs font-bold bg-[#F9FAFB] focus:bg-white focus:outline-none focus:border-[#6D5DFC] focus:ring-1 focus:ring-[#6D5DFC] transition-all placeholder-slate-400"
          />
        </div>
      </div>

      {/* Main Settings Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-8 pt-8 items-start">
        {/* Left Sidebar Categories */}
        <div className={`lg:col-span-1 space-y-1.5 transition-all ${isSidebarCollapsed ? 'hidden lg:block lg:w-16' : 'w-full'}`}>
          <div className="flex items-center justify-between px-2 mb-2 lg:mb-4">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Settings Console</span>
            <button 
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="hidden lg:block text-[9px] font-extrabold text-[#6D5DFC] hover:underline"
            >
              {isSidebarCollapsed ? 'Expand' : 'Collapse'}
            </button>
          </div>
          {filteredCategories.map(cat => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`w-full h-12 flex items-center gap-3.5 px-4 rounded-xl text-left transition-all ${
                  isActive 
                    ? 'bg-[#6D5DFC]/10 text-[#6D5DFC] font-bold border border-[#6D5DFC]/20 shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50 border border-transparent font-semibold'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#6D5DFC]' : 'text-slate-400'}`} />
                {!isSidebarCollapsed && (
                  <div className="min-w-0">
                    <p className="text-xs truncate leading-none mb-0.5">{cat.label}</p>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Right Content Panel */}
        <div className="lg:col-span-3 bg-white border border-slate-100 rounded-2xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.03)] space-y-8 min-h-[500px]">
          {activeCategory === 'general' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-[#6D5DFC] border-b border-slate-100 pb-3">General Settings</h3>
                <p className="text-[11px] font-semibold text-slate-400 mt-2">Adjust core application and scheduling behaviors.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                {/* Default Dashboard */}
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Default Dashboard</label>
                  <select
                    value={generalSettings.defaultDashboard || '/dashboard'}
                    onChange={(e) => handleSelectChange('general', 'defaultDashboard', e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-[#6D5DFC] transition-all cursor-pointer"
                  >
                    <option value="/dashboard">Main Dashboard</option>
                    <option value="/dashboard/chat/new">AI Legal Assistant</option>
                    <option value="/dashboard/cases">My Matters</option>
                  </select>
                </div>

                {/* Language Select */}
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Language</label>
                  <select
                    value={generalSettings.language || 'English'}
                    onChange={(e) => handleSelectChange('general', 'language', e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-[#6D5DFC] transition-all cursor-pointer"
                  >
                    <option value="English">English</option>
                    <option value="Hindi">Hindi</option>
                    <option value="Bilingual">Bilingual (English & Hindi)</option>
                  </select>
                </div>

                {/* Time Zone */}
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Time Zone</label>
                  <select
                    value={generalSettings.timeZone || 'IST'}
                    onChange={(e) => handleSelectChange('general', 'timeZone', e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-[#6D5DFC] transition-all cursor-pointer"
                  >
                    <option value="IST">India Standard Time (IST) - GMT+5:30</option>
                    <option value="UTC">Coordinated Universal Time (UTC)</option>
                    <option value="EST">Eastern Standard Time (EST) - GMT-5:00</option>
                  </select>
                </div>

                {/* Date Format */}
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Date Format</label>
                  <select
                    value={generalSettings.dateFormat || 'DD/MM/YYYY'}
                    onChange={(e) => handleSelectChange('general', 'dateFormat', e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-[#6D5DFC] transition-all cursor-pointer"
                  >
                    <option value="DD/MM/YYYY">DD / MM / YYYY (e.g. 16/06/2026)</option>
                    <option value="MM/DD/YYYY">MM / DD / YYYY (e.g. 06/16/2026)</option>
                    <option value="YYYY-MM-DD">YYYY - MM - DD (e.g. 2026-06-16)</option>
                  </select>
                </div>

                {/* Time Format */}
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Time Format</label>
                  <select
                    value={generalSettings.timeFormat || '12-hour'}
                    onChange={(e) => handleSelectChange('general', 'timeFormat', e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-[#6D5DFC] transition-all cursor-pointer"
                  >
                    <option value="12-hour">12-Hour (e.g. 05:46 PM)</option>
                    <option value="24-hour">24-Hour (e.g. 17:46)</option>
                  </select>
                </div>

              </div>

              {/* Reset Section */}
              <div className="border-t border-slate-100 pt-6 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-rose-500">Reset System Settings</h4>
                  <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Restore all system configurations to the default clean state.</p>
                </div>
                <button
                  onClick={() => triggerConfirm('reset', 'Reset All Settings', 'Are you sure you want to restore all general, appearance, and notifications configurations to default?', handleResetAll)}
                  className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-black uppercase tracking-wider border border-rose-100 transition-colors"
                >
                  Restore Defaults
                </button>
              </div>
            </div>
          )}

          {activeCategory === 'appearance' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-[#6D5DFC] border-b border-slate-100 pb-3">Appearance Settings</h3>
                <p className="text-[11px] font-semibold text-slate-400 mt-2">Adjust styling parameters and animation speed.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                {/* Theme Mode */}
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Theme Mode</label>
                  <select
                    value={theme}
                    onChange={(e) => {
                      setTheme(e.target.value);
                      handleSelectChange('general', 'theme', e.target.value);
                    }}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-[#6D5DFC] transition-all cursor-pointer"
                  >
                    <option value="light">Light Mode</option>
                    <option value="dark">Dark Mode</option>
                    <option value="system">System Default</option>
                  </select>
                </div>

                {/* Font Size */}
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Font Size Scale</label>
                  <select
                    value={personalizations?.personalization?.fontSize || 'Medium'}
                    onChange={(e) => handleSelectChange('personalization', 'fontSize', e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-[#6D5DFC] transition-all cursor-pointer"
                  >
                    <option value="Small">Small (14px)</option>
                    <option value="Medium">Medium (16px)</option>
                    <option value="Large">Large (20px)</option>
                  </select>
                </div>
              </div>

              {/* Toggles */}
              <div className="border-t border-slate-100 pt-6 space-y-4">
                {/* Compact Mode */}
                <div className="flex items-center justify-between py-1">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Compact Mode</h4>
                    <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Reduces list items spacing and padding to fit more information on-screen.</p>
                  </div>
                  <button 
                    onClick={() => handleToggle('general', 'compactMode', generalSettings.compactMode === true)}
                    className={`w-10 h-5 rounded-full p-0.5 transition-all duration-300 ${generalSettings.compactMode === true ? 'bg-[#6D5DFC]' : 'bg-slate-200'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform duration-300 ${generalSettings.compactMode === true ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>


              </div>

              {/* Accent Color Preview */}
              <div className="border-t border-slate-100 pt-6">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">Accent Color Preference</label>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#6D5DFC] border border-[#6D5DFC]/20 shadow-sm" title="Primary Purple" />
                  <div className="w-8 h-8 rounded-lg bg-[#4F8CFF] border border-[#4F8CFF]/20 shadow-sm" title="Accent Blue" />
                  <p className="text-[11px] font-semibold text-slate-400">AI LEGAL default color theme is optimized for court-ready litigation.</p>
                </div>
              </div>
            </div>
          )}



          {activeCategory === 'notifications' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-[#6D5DFC] border-b border-slate-100 pb-3">Notification Preferences</h3>
                <p className="text-[11px] font-semibold text-slate-400 mt-2">Choose how you wish to receive upcoming hearings and strategic briefings reminders.</p>
              </div>

              <div className="space-y-4 pt-2">
                {/* Push Notifications */}
                <div className="flex items-center justify-between py-1">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Push Notifications</h4>
                    <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Receive alert notifications inside the browser workspace.</p>
                  </div>
                  <button 
                    onClick={() => handleToggle('notifications', 'pushNotif', notifPrefs.pushNotif !== false)}
                    className={`w-10 h-5 rounded-full p-0.5 transition-all duration-300 ${notifPrefs.pushNotif !== false ? 'bg-[#6D5DFC]' : 'bg-slate-200'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform duration-300 ${notifPrefs.pushNotif !== false ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>

                {/* Email Notifications */}
                <div className="flex items-center justify-between py-1">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Email Notifications</h4>
                    <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Receive reminders and briefs sent directly to your linked account inbox.</p>
                  </div>
                  <button 
                    onClick={() => handleToggle('notifications', 'emailNotif', notifPrefs.emailNotif !== false)}
                    className={`w-10 h-5 rounded-full p-0.5 transition-all duration-300 ${notifPrefs.emailNotif !== false ? 'bg-[#6D5DFC]' : 'bg-slate-200'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform duration-300 ${notifPrefs.emailNotif !== false ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>

                {/* Court Hearing Reminders */}
                <div className="flex items-center justify-between py-1 border-t border-slate-100 pt-4">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Court Hearing Reminder</h4>
                    <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Remind me of upcoming hearing schedules in the Court Diary (24 hours prior).</p>
                  </div>
                  <button 
                    onClick={() => handleToggle('notifications', 'hearingReminder', notifPrefs.hearingReminder !== false)}
                    className={`w-10 h-5 rounded-full p-0.5 transition-all duration-300 ${notifPrefs.hearingReminder !== false ? 'bg-[#6D5DFC]' : 'bg-slate-200'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform duration-300 ${notifPrefs.hearingReminder !== false ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>

                {/* Upcoming Deadlines */}
                <div className="flex items-center justify-between py-1">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Upcoming Deadlines</h4>
                    <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Notify me when strategic deadlines or notice reply windows are closing.</p>
                  </div>
                  <button 
                    onClick={() => handleToggle('notifications', 'deadlineReminder', notifPrefs.deadlineReminder !== false)}
                    className={`w-10 h-5 rounded-full p-0.5 transition-all duration-300 ${notifPrefs.deadlineReminder !== false ? 'bg-[#6D5DFC]' : 'bg-slate-200'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform duration-300 ${notifPrefs.deadlineReminder !== false ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>

                {/* Draft Completed */}
                <div className="flex items-center justify-between py-1">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Draft Completed</h4>
                    <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Notify me when background AI document template generation is finalized.</p>
                  </div>
                  <button 
                    onClick={() => handleToggle('notifications', 'draftCompleted', notifPrefs.draftCompleted !== false)}
                    className={`w-10 h-5 rounded-full p-0.5 transition-all duration-300 ${notifPrefs.draftCompleted !== false ? 'bg-[#6D5DFC]' : 'bg-slate-200'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform duration-300 ${notifPrefs.draftCompleted !== false ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>

                {/* Research Completed */}
                <div className="flex items-center justify-between py-1">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Research Completed</h4>
                    <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Notify me when background AI legal search logs and case citations check are finalized.</p>
                  </div>
                  <button 
                    onClick={() => handleToggle('notifications', 'researchCompleted', notifPrefs.researchCompleted !== false)}
                    className={`w-10 h-5 rounded-full p-0.5 transition-all duration-300 ${notifPrefs.researchCompleted !== false ? 'bg-[#6D5DFC]' : 'bg-slate-200'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform duration-300 ${notifPrefs.researchCompleted !== false ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>

                {/* Case Updates */}
                <div className="flex items-center justify-between py-1">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Case Updates</h4>
                    <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Get instant alerts when there are active modifications or updates to your folders.</p>
                  </div>
                  <button 
                    onClick={() => handleToggle('notifications', 'caseUpdates', notifPrefs.caseUpdates !== false)}
                    className={`w-10 h-5 rounded-full p-0.5 transition-all duration-300 ${notifPrefs.caseUpdates !== false ? 'bg-[#6D5DFC]' : 'bg-slate-200'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform duration-300 ${notifPrefs.caseUpdates !== false ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>

                {/* Daily Briefing */}
                <div className="flex items-center justify-between py-1 border-t border-slate-100 pt-4">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Daily Briefing</h4>
                    <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Get an early morning summary of your diary hearings and scheduled checklists.</p>
                  </div>
                  <button 
                    onClick={() => handleToggle('notifications', 'dailyBriefing', notifPrefs.dailyBriefing === true)}
                    className={`w-10 h-5 rounded-full p-0.5 transition-all duration-300 ${notifPrefs.dailyBriefing === true ? 'bg-[#6D5DFC]' : 'bg-slate-200'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform duration-300 ${notifPrefs.dailyBriefing === true ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeCategory === 'security' && (
            <div className="space-y-8">
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-[#6D5DFC] border-b border-slate-100 pb-3">Security & Account Access</h3>
                <p className="text-[11px] font-semibold text-slate-400 mt-2">Manage your verification credentials, passwords, and trusted devices.</p>
              </div>

              {/* Password change form */}
              <form onSubmit={handleUpdatePassword} className="space-y-4 bg-slate-55/40 border border-slate-100 rounded-2xl p-6">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#6D5DFC] block mb-2">Change Password</span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Current Password</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold focus:outline-none focus:border-[#6D5DFC]"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">New Password</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold focus:outline-none focus:border-[#6D5DFC]"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Confirm New Password</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold focus:outline-none focus:border-[#6D5DFC]"
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#6D5DFC] hover:bg-[#5b4edb] text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors shadow-lg shadow-[#6D5DFC]/10"
                  >
                    Update Password
                  </button>
                </div>
              </form>

              {/* Toggles */}
              <div className="space-y-4">
                {/* 2FA */}
                <div className="flex items-center justify-between py-1">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Two-Factor Authentication</h4>
                    <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Use 2FA protocols to guarantee account integrity.</p>
                  </div>
                  <button 
                    onClick={() => {
                      const next = !twoFactor;
                      setTwoFactor(next);
                      handleSecuritySave('twoFactor', next);
                    }}
                    className={`w-10 h-5 rounded-full p-0.5 transition-all duration-300 ${twoFactor ? 'bg-[#6D5DFC]' : 'bg-slate-200'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform duration-300 ${twoFactor ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>

                {/* Sessions & Trusted Devices */}
                <div className="border-t border-slate-100 pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#6D5DFC] block">Active Sessions</span>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-4 border border-slate-100 rounded-xl bg-slate-50/30">
                        <div className="flex items-center gap-3">
                          <Laptop className="w-5 h-5 text-slate-400" />
                          <div>
                            <p className="text-xs font-bold text-slate-800">Chrome on Windows</p>
                            <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Active now • New Delhi, India</p>
                          </div>
                        </div>
                        <span className="px-2.5 py-0.5 bg-indigo-50 border border-indigo-100 text-[#6D5DFC] rounded-md text-[9px] font-black uppercase tracking-widest">Current Device</span>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <button
                        onClick={() => triggerConfirm('logout-devices', 'Logout All Devices', 'Are you sure you want to log out from all other active sessions and browsers?', handleLogoutAllDevices)}
                        className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 rounded-xl text-xs font-black uppercase tracking-wider transition-colors"
                      >
                        Logout All Devices
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#6D5DFC] block">Trusted Devices</span>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 border border-slate-100 rounded-xl bg-slate-50/30">
                        <div>
                          <p className="text-xs font-bold text-slate-800">iPhone</p>
                          <p className="text-[9px] font-semibold text-slate-400">Delhi, India • Authorized App</p>
                        </div>
                        <button 
                          type="button"
                          onClick={() => toast.success('Revoked trust for iPhone.')}
                          className="text-[9px] font-black text-rose-500 uppercase tracking-wider hover:underline"
                        >
                          Remove Device
                        </button>
                      </div>
                      <div className="flex items-center justify-between p-3 border border-slate-100 rounded-xl bg-slate-50/30">
                        <div>
                          <p className="text-xs font-bold text-slate-800">MacBook</p>
                          <p className="text-[9px] font-semibold text-slate-400">Mumbai, India • Safari Browser</p>
                        </div>
                        <button 
                          type="button"
                          onClick={() => toast.success('Revoked trust for MacBook.')}
                          className="text-[9px] font-black text-rose-500 uppercase tracking-wider hover:underline"
                        >
                          Remove Device
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Last Login */}
                <div className="border-t border-slate-100 pt-6 space-y-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#6D5DFC] block">Last Login</span>
                  <div className="p-4 border border-slate-100 rounded-xl bg-slate-50/30 max-w-md flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-800">Today 10:45 AM</p>
                      <p className="text-[10px] font-semibold text-slate-400 mt-0.5">New Delhi, India</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeCategory === 'data' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-[#6D5DFC] border-b border-slate-100 pb-3">Data & Storage Management</h3>
                <p className="text-[11px] font-semibold text-slate-400 mt-2">Download legal logs, manage storage, and configure data consent metrics.</p>
              </div>



              {/* Danger Zone Account deletion */}
              <div className="border-t border-slate-100 pt-6 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-rose-500">Permanently Delete Account</h4>
                  <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Irreversibly delete all cases, files, profile data, and AI records.</p>
                </div>
                <button
                  onClick={() => triggerConfirm('delete-account', 'Permanently Delete Account', 'This action is irreversible. All advocate files, documents, and credentials will be deleted forever.', handleDeleteAccount)}
                  className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors shadow-md shadow-rose-500/10 animate-pulse"
                >
                  Delete Account
                </button>
              </div>
            </div>
          )}

          {activeCategory === 'help' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-[#6D5DFC] border-b border-slate-100 pb-3">Support & About AI LEGAL</h3>
                <p className="text-[11px] font-semibold text-slate-400 mt-2">Access help resources, documentation, and licensing specs.</p>
              </div>

              {/* Info grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                <a href="https://support.ai-legal.in" target="_blank" rel="noopener noreferrer" className="p-4 border border-slate-100 rounded-xl hover:bg-slate-50/50 transition-colors flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <HelpIcon className="w-5 h-5 text-[#6D5DFC] shrink-0" />
                    <div>
                      <span className="text-xs font-bold text-slate-700 block">Help Center & FAQ</span>
                      <span className="text-[9px] text-slate-400 font-semibold">Search support queries and guides</span>
                    </div>
                  </div>
                  <ChevronRight size={14} className="text-slate-300 group-hover:text-[#6D5DFC] transition-colors" />
                </a>

                <button 
                  onClick={() => toast.success("Support ticket opened! We'll reply within 1 hour. 📞")}
                  className="p-4 border border-slate-100 rounded-xl hover:bg-slate-50/50 transition-colors flex items-center justify-between group text-left"
                >
                  <div className="flex items-center gap-3">
                    <MessageSquare className="w-5 h-5 text-[#6D5DFC] shrink-0" />
                    <div>
                      <span className="text-xs font-bold text-slate-700 block">Contact Support</span>
                      <span className="text-[9px] text-slate-400 font-semibold">Instant advocate assistance line</span>
                    </div>
                  </div>
                  <ChevronRight size={14} className="text-slate-300 group-hover:text-[#6D5DFC] transition-colors" />
                </button>

                <button 
                  onClick={() => toast.success("Bug report logged. Thank you for making AI Legal™ better! 🐞")}
                  className="p-4 border border-slate-100 rounded-xl hover:bg-slate-50/50 transition-colors flex items-center justify-between group text-left"
                >
                  <div className="flex items-center gap-3">
                    <Bug className="w-5 h-5 text-[#6D5DFC] shrink-0" />
                    <div>
                      <span className="text-xs font-bold text-slate-700 block">Report Bug</span>
                      <span className="text-[9px] text-slate-400 font-semibold">Submit a litigation tool error report</span>
                    </div>
                  </div>
                  <ChevronRight size={14} className="text-slate-300 group-hover:text-[#6D5DFC] transition-colors" />
                </button>
              </div>

              {/* Legal & Privacy Policies */}
              <div className="border-t border-slate-100 pt-6 space-y-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#6D5DFC] block">Legal & Privacy Policies</span>
                <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-[#6D5DFC]">
                  <Link to="/privacy-policy" className="hover:underline">Privacy Policy</Link>
                  <span className="text-slate-300">•</span>
                  <Link to="/terms-of-service" className="hover:underline">Terms & Conditions</Link>
                  <span className="text-slate-300">•</span>
                  <a href="https://support.ai-legal.in/cookies" target="_blank" rel="noopener noreferrer" className="hover:underline">Cookie Policy</a>
                </div>
              </div>

              {/* Licensing & versioning */}
              <div className="border-t border-slate-100 pt-6 space-y-4 bg-[#F9FAFB]/50 p-6 rounded-2xl border border-slate-100">
                <div className="flex justify-between items-center flex-wrap gap-2 text-xs font-bold text-slate-700">
                  <span>AI Legal™ (Advocate Edition)</span>
                  <span className="text-[#6D5DFC]">v1.2.0</span>
                </div>
                <div className="text-[10px] font-semibold text-slate-400 space-y-2">
                  <p>License: Licensed exclusively to registered Advocates of State Bar Councils.</p>
                  <p className="flex items-center gap-1">Made with <Heart size={10} className="fill-rose-500 text-rose-500 inline" /> for the Indian Judiciary.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Overlay Dialog */}
      <AnimatePresence>
        {dialogConfig.show && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center pointer-events-auto p-4 bg-transparent">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDialogConfig({ show: false, type: '', title: '', desc: '', action: null })}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.12)] border border-slate-100 p-6 z-10 text-center font-sans space-y-5"
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto ${
                dialogConfig.type === 'delete-account' ? 'bg-rose-50 text-rose-500' : 'bg-amber-50 text-amber-500'
              }`}>
                <AlertTriangle size={22} />
              </div>
              <div className="space-y-2">
                <h3 className="text-base font-extrabold text-slate-800 tracking-tight">{dialogConfig.title}</h3>
                <p className="text-xs font-semibold text-slate-500 leading-relaxed px-2">
                  {dialogConfig.desc}
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setDialogConfig({ show: false, type: '', title: '', desc: '', action: null })}
                  className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={dialogConfig.action}
                  className={`flex-1 py-2.5 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md ${
                    dialogConfig.type === 'delete-account' 
                      ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/10' 
                      : 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/10'
                  }`}
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SettingsPage;
