import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Camera, Plus, Trash2, ShieldCheck, Mail, Phone, MapPin, 
    Calendar, Briefcase, Award, Info, Sparkles, Scale, Languages,
    Activity, GraduationCap, Building2, User, Users, FileText
} from 'lucide-react';
import { useRecoilState, useRecoilValue } from 'recoil';
import toast from 'react-hot-toast';
import axios from 'axios';
import { API, apis } from '../../types';
import { usePersonalization } from '../../context/PersonalizationContext';
import { getUserData, setUserData, userData, selectedRoleState } from '../../userStore/userData';
import Cropper from 'react-easy-crop';
import { getCroppedImgBlob } from '../../utils/canvasUtils';

const PRACTICE_AREAS = [
    'Civil Law', 'Criminal Law', 'Corporate Law', 'Family Law', 
    'Property Law', 'Tax Law', 'Labour Law', 'Constitutional Law', 
    'Arbitration', 'IPR'
];

const STUDENT_FOCUS_AREAS = [
    'Constitutional Law', 'Criminal Law', 'Corporate Law', 'Moot Court',
    'IPR', 'Human Rights', 'Cyber Law', 'International Law', 'Taxation'
];

const FIRM_PRACTICE_DOMAINS = [
    'Corporate M&A', 'Commercial Litigation', 'Banking & Finance', 'IPR',
    'Arbitration & ADR', 'Tax & Regulatory', 'Real Estate', 'Employment Law'
];

const ProfileSettingsDropdown = ({ onClose }) => {
    const fileInputRef = useRef(null);
    const [currentUserData, setUserRecoil] = useRecoilState(userData);
    const selectedRole = useRecoilValue(selectedRoleState) || 'advocate';
    const user = currentUserData.user || getUserData() || {};
    const { personalizations, updatePersonalization } = usePersonalization();

    const [isEditing, setIsEditing] = useState(false);
    
    // Role-specific Profile Form State
    const [profileForm, setProfileForm] = useState({
        fullName: '',
        phoneNumber: '',
        dob: '',
        gender: '',
        address: '',
        city: '',
        state: '',
        country: '',
        // Advocate Fields
        barNumber: '',
        stateBarCouncil: '',
        enrollmentYear: '',
        enrollmentDate: '',
        practiceExperience: '',
        practiceAreas: [],
        primaryCourt: '',
        languagesKnown: '',
        officeName: '',
        officeAddress: '',
        bio: '',
        specialization: '',
        achievements: '',
        // Student Fields
        collegeName: '',
        courseName: '',
        currentYear: '',
        studentId: '',
        expectedGraduation: '',
        careerInterest: '',
        academicInterests: [],
        // Law Firm Fields
        firmName: '',
        registrationNumber: '',
        establishedYear: '',
        managingPartner: '',
        teamSize: '',
        firmAddress: '',
        firmPhone: '',
        firmDomains: []
    });

    // Cropping States
    const [imageToCrop, setImageToCrop] = useState(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
    const [showCropper, setShowCropper] = useState(false);
    const [aspect, setAspect] = useState(1 / 1);
    const [uploadingCroppedImage, setUploadingCroppedImage] = useState(false);

    // Sync Form with Personalizations
    useEffect(() => {
        if (personalizations?.advocateProfile) {
            setProfileForm(prev => ({
                ...prev,
                ...personalizations.advocateProfile,
                fullName: personalizations.advocateProfile.fullName || user?.name || '',
                enrollmentDate: personalizations.advocateProfile.enrollmentDate || '',
                enrollmentYear: personalizations.advocateProfile.enrollmentYear || '',
                practiceAreas: personalizations.advocateProfile.practiceAreas || []
            }));
        } else {
            setProfileForm(prev => ({
                ...prev,
                fullName: user?.name || ''
            }));
        }
    }, [personalizations, user?.name]);

    // Format Date helper
    const formatDate = (dateString) => {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return dateString;
            return date.toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
        } catch (e) {
            return dateString;
        }
    };

    // Calculate profile completion percentage
    const profileCompletion = useMemo(() => {
        const fields = [
            profileForm.fullName,
            profileForm.phoneNumber,
            profileForm.dob,
            profileForm.gender,
            profileForm.address,
            profileForm.city,
            profileForm.state,
            profileForm.country,
            profileForm.barNumber,
            profileForm.stateBarCouncil,
            profileForm.enrollmentYear,
            profileForm.enrollmentDate,
            profileForm.practiceExperience,
            profileForm.practiceAreas?.length > 0 ? 'yes' : '',
            profileForm.primaryCourt,
            profileForm.languagesKnown,
            profileForm.officeName,
            profileForm.officeAddress,
            profileForm.bio,
            profileForm.specialization,
            user.avatar ? 'yes' : ''
        ];
        
        const filled = fields.filter(f => !!f).length;
        return Math.round((filled / fields.length) * 100);
    }, [profileForm, user.avatar]);

    // Form Handlers
    const handleSaveProfile = async () => {
        const loadingToast = toast.loading("Saving profile changes...");
        try {
            // Update name in standard user object
            if (profileForm.fullName && profileForm.fullName !== user.name) {
                const res = await axios.put(apis.profile, { name: profileForm.fullName }, {
                    headers: { 'Authorization': `Bearer ${user?.token}` }
                });
                if (res.data) {
                    const updatedUser = setUserData(res.data);
                    setUserRecoil(prev => ({ ...prev, user: updatedUser }));
                }
            }

            // Save advocate fields to custom advocateProfile sub-key in personalizations
            await updatePersonalization('advocateProfile', profileForm);

            toast.dismiss(loadingToast);
            toast.success("Advocate profile updated successfully! ⚖️");
            setIsEditing(false);
        } catch (error) {
            console.error("Failed to save advocate profile:", error);
            toast.dismiss(loadingToast);
            toast.error(error.response?.data?.error || "Failed to save changes. Please try again.");
        }
    };

    // Avatar Upload & Cropper Handlers
    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error("Please upload an image file.");
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            toast.error("Image size must be less than 5MB.");
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            setImageToCrop(reader.result);
            setShowCropper(true);
        };
        reader.readAsDataURL(file);
    };

    const handleCropComplete = (croppedArea, croppedAreaPixels) => {
        setCroppedAreaPixels(croppedAreaPixels);
    };

    const handleSaveCrop = async () => {
        if (!imageToCrop || !croppedAreaPixels) return;

        setUploadingCroppedImage(true);
        const loadingToast = toast.loading("Uploading photo...");

        try {
            const croppedBlob = await getCroppedImgBlob(imageToCrop, croppedAreaPixels, rotation);
            const truncatedName = (profileForm.fullName || 'avatar').substring(0, 10).replace(/\s+/g, '-');
            const file = new File([croppedBlob], `${truncatedName}-avatar.jpg`, { type: 'image/jpeg' });

            const formData = new FormData();
            formData.append('file', file);

            const res = await axios.post(apis.uploadAvatar, formData, {
                headers: {
                    'Authorization': `Bearer ${user?.token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });

            if (res.data.success && res.data.avatar) {
                const updatedUser = { ...user, avatar: res.data.avatar };
                setUserRecoil(prev => ({ ...prev, user: updatedUser }));
                setUserData(updatedUser);
                toast.success("Profile photo updated!");
                setShowCropper(false);
                setImageToCrop(null);
            }
        } catch (error) {
            console.error("Profile photo upload failed:", error);
            toast.error(error.response?.data?.error || "Upload failed. Please try again.");
        } finally {
            toast.dismiss(loadingToast);
            setUploadingCroppedImage(false);
        }
    };

    const handleRemoveAvatar = async () => {
        const loadingToast = toast.loading("Removing photo...");
        try {
            const res = await axios.delete(apis.removeAvatar, {
                headers: { 'Authorization': `Bearer ${user?.token}` }
            });

            if (res.data.success) {
                const updatedUser = { ...user, avatar: "" };
                setUserRecoil(prev => ({ ...prev, user: updatedUser }));
                setUserData(updatedUser);
                toast.success("Profile photo removed!");
            }
        } catch (error) {
            console.error("Removal failed:", error);
            toast.error(error.response?.data?.error || "Failed to remove photo.");
        } finally {
            toast.dismiss(loadingToast);
        }
    };

    // Helper to render read-only credentials beautifully
    const renderField = (label, value, icon) => {
        return (
            <div className="space-y-1">
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    {icon}
                    <span>{label}</span>
                </span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block break-words">
                    {value || <span className="text-slate-300 dark:text-slate-600 font-medium italic">Not provided</span>}
                </span>
            </div>
        );
    };

    return createPortal(
        <AnimatePresence>
            <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none p-0 sm:p-4 bg-transparent select-text">
                {/* Backdrop overlay */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-slate-900/60 backdrop-blur-md pointer-events-auto"
                />

                {/* Main Modal Panel */}
                <motion.div
                    initial={window.innerWidth < 640 ? { y: '100%' } : { opacity: 0, scale: 0.95, y: 20 }}
                    animate={window.innerWidth < 640 ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
                    exit={window.innerWidth < 640 ? { y: '100%' } : { opacity: 0, scale: 0.95, y: 20 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="absolute sm:relative bottom-0 sm:top-0 left-0 h-[90vh] sm:h-[85vh] w-full sm:max-w-5xl bg-white dark:bg-[#1E293B] text-slate-900 dark:text-white flex flex-col shadow-[0_12px_40px_rgba(0,0,0,0.2)] sm:rounded-2xl border border-slate-100 dark:border-slate-800 pointer-events-auto overflow-hidden font-sans"
                    onClick={e => e.stopPropagation()}
                >
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleImageUpload} 
                        accept="image/*" 
                        className="hidden" 
                    />

                    {/* Modal Sticky Header */}
                    <div className="sticky top-0 z-20 px-3.5 sm:px-8 py-3 sm:py-5 flex items-center justify-between gap-2.5 bg-white dark:bg-[#1E293B] border-b border-slate-100 dark:border-slate-800 shrink-0">
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl bg-[#111111] dark:bg-[#0F172A] flex items-center justify-center text-[#C8A34D] border border-[#C8A34D]/30 shrink-0">
                                {selectedRole === 'student' ? (
                                    <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400" />
                                ) : selectedRole === 'law_firm' ? (
                                    <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
                                ) : (
                                    <Scale className="w-4 h-4 sm:w-5 sm:h-5 text-[#C8A34D]" />
                                )}
                            </div>
                            <div className="min-w-0 flex-1">
                                <h2 className="text-sm sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight truncate">
                                    {selectedRole === 'student' ? 'Law Student Profile' : selectedRole === 'law_firm' ? 'Law Firm Profile' : 'Advocate Profile'}
                                </h2>
                                <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider truncate mt-0.5">
                                    {selectedRole === 'student' ? 'Academic Credentials' : selectedRole === 'law_firm' ? 'Corporate & Office Credentials' : 'State Bar Credentials'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
                            <button 
                                onClick={() => {
                                    if (isEditing) {
                                        if (personalizations?.advocateProfile) {
                                            setProfileForm(personalizations.advocateProfile);
                                        }
                                        setIsEditing(false);
                                    } else {
                                        setIsEditing(true);
                                    }
                                }} 
                                className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all border cursor-pointer whitespace-nowrap shrink-0 ${
                                    isEditing 
                                        ? 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700' 
                                        : 'bg-[#111111] dark:bg-[#C8A34D] text-[#C8A34D] dark:text-[#111111] border-[#C8A34D]/40 dark:border-transparent hover:bg-[#222222] dark:hover:bg-[#b08d3b]'
                                }`}
                            >
                                {isEditing ? 'Cancel' : 'Edit Profile'}
                            </button>
                            <button onClick={onClose} className="p-1 sm:p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer shrink-0">
                                <X size={18} className="text-slate-400 dark:text-slate-400" />
                            </button>
                        </div>
                    </div>

                    {/* Scrollable Dossier / Form Body */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-8 bg-[#F8FAFC] dark:bg-[#0F172A]">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                            
                            {/* Left Column: Dossier Cards */}
                            <div className="lg:col-span-2 space-y-8">
                                
                                {/* 1. Profile Header Identity Card */}
                                <div className="bg-white dark:bg-[#1E293B] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-8 shadow-[0_4px_20px_rgba(0,0,0,0.03)] dark:shadow-none">
                                    <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 text-center sm:text-left">
                                        {/* Avatar Box */}
                                        <div className="relative group shrink-0">
                                            <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-full bg-[#111111] dark:bg-[#0F172A] flex items-center justify-center text-[#C8A34D] border border-[#C8A34D]/30 shadow-sm overflow-hidden relative z-10">
                                                {user.avatar ? (
                                                    <img 
                                                        src={user.avatar} 
                                                        alt={user.name} 
                                                        className="w-full h-full object-cover transition-opacity" 
                                                        onError={(e) => { e.currentTarget.src = '/account.png'; }} 
                                                    />
                                                ) : (
                                                    <span className="text-2xl sm:text-4xl font-black">
                                                        {(profileForm.fullName || user.name || 'U').charAt(0).toUpperCase()}
                                                    </span>
                                                )}
                                                
                                                {isEditing && (
                                                    <div 
                                                        onClick={() => fileInputRef.current?.click()}
                                                        className="absolute inset-0 bg-black/45 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-20"
                                                    >
                                                        <Camera className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                                                    </div>
                                                )}
                                            </div>
                                            
                                            {/* Photo Management Plus Icon (Edit mode only) */}
                                            {isEditing && (
                                                <button
                                                    className="absolute -bottom-1 -right-1 w-7 h-7 sm:w-8 sm:h-8 bg-[#C8A34D] hover:bg-[#b08d3b] text-[#111111] rounded-full flex items-center justify-center shadow-lg border-2 border-white dark:border-slate-800 z-20 hover:scale-105 transition-transform cursor-pointer"
                                                    onClick={() => fileInputRef.current?.click()}
                                                    title="Upload Photo"
                                                >
                                                    <Plus className="w-4 h-4 sm:w-5 sm:h-5 font-black" />
                                                </button>
                                            )}
                                        </div>

                                        {/* Name & Basic Details */}
                                        <div className="flex-1 space-y-2">
                                            <div>
                                                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-2.5">
                                                    <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight capitalize">
                                                        {profileForm.fullName || user.name || (selectedRole === 'law_firm' ? 'Law Firm Entity' : 'Anonymous User')}
                                                    </h3>
                                                    <div className="flex items-center gap-1 px-2.5 py-0.5 bg-[#C8A34D]/15 border border-[#C8A34D]/30 rounded-md text-[9px] font-black text-[#C8A34D] uppercase tracking-widest">
                                                        <ShieldCheck size={11} /> 
                                                        {selectedRole === 'student' ? 'Verified Law Student' : selectedRole === 'law_firm' ? 'Verified Law Firm' : (profileForm.barNumber ? 'Verified Advocate' : 'Practicing Advocate')}
                                                    </div>
                                                </div>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mt-1 flex items-center justify-center sm:justify-start gap-1.5 truncate">
                                                    <Mail size={12} className="text-slate-400 dark:text-slate-500 shrink-0" />
                                                    <span className="truncate">{user.email}</span>
                                                </p>
                                            </div>

                                            {/* Photo Action Buttons */}
                                            {isEditing && (
                                                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-2">
                                                    <button
                                                        onClick={() => fileInputRef.current?.click()}
                                                        className="inline-flex items-center gap-1 px-3 py-1 bg-[#111111] dark:bg-[#C8A34D] hover:bg-[#222222] dark:hover:bg-[#b08d3b] text-[#C8A34D] dark:text-[#111111] rounded-lg border border-[#C8A34D]/30 dark:border-transparent text-[10px] font-black uppercase tracking-widest transition-colors cursor-pointer"
                                                    >
                                                        Change Photo
                                                    </button>
                                                    {user.avatar && (
                                                        <button
                                                            onClick={handleRemoveAvatar}
                                                            className="inline-flex items-center gap-1 px-3 py-1 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 rounded-lg border border-rose-100 dark:border-rose-900/50 text-[10px] font-black uppercase tracking-widest transition-colors"
                                                        >
                                                            Remove Photo
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* 2. Personal Information Card */}
                                <div className="bg-white dark:bg-[#1E293B] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-8 shadow-[0_4px_20px_rgba(0,0,0,0.03)] dark:shadow-none space-y-5 sm:space-y-6">
                                    <h3 className="text-xs font-black uppercase tracking-widest text-[#C8A34D] border-b border-slate-100 dark:border-slate-800 pb-3">Personal Information</h3>
                                    
                                    {isEditing ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            <div>
                                                <label className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest block mb-1">Full Name</label>
                                                <input 
                                                    type="text" 
                                                    value={profileForm.fullName} 
                                                    onChange={e => setProfileForm({ ...profileForm, fullName: e.target.value })} 
                                                    placeholder="Advocate Full Name" 
                                                    className="w-full bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-[#C8A34D] transition-all"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest block mb-1">Email Address (Account Linked)</label>
                                                <input 
                                                    type="text" 
                                                    disabled 
                                                    value={user.email} 
                                                    className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 rounded-xl px-4 py-2.5 text-xs font-bold outline-none cursor-not-allowed"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest block mb-1">Phone Number</label>
                                                <input 
                                                    type="text" 
                                                    value={profileForm.phoneNumber} 
                                                    onChange={e => setProfileForm({ ...profileForm, phoneNumber: e.target.value })} 
                                                    placeholder="+91 XXXXX XXXXX" 
                                                    className="w-full bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-[#C8A34D] transition-all"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest block mb-1">Date of Birth (Optional)</label>
                                                <input 
                                                    type="date" 
                                                    value={profileForm.dob} 
                                                    onChange={e => setProfileForm({ ...profileForm, dob: e.target.value })} 
                                                    className="w-full bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-[#C8A34D] transition-all cursor-pointer"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest block mb-1">Gender (Optional)</label>
                                                <select 
                                                    value={profileForm.gender} 
                                                    onChange={e => setProfileForm({ ...profileForm, gender: e.target.value })} 
                                                    className="w-full bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-[#C8A34D] transition-all cursor-pointer"
                                                >
                                                    <option value="">Select Gender</option>
                                                    <option value="Male">Male</option>
                                                    <option value="Female">Female</option>
                                                    <option value="Other">Other</option>
                                                    <option value="Prefer not to say">Prefer not to say</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest block mb-1">City</label>
                                                <input 
                                                    type="text" 
                                                    value={profileForm.city} 
                                                    onChange={e => setProfileForm({ ...profileForm, city: e.target.value })} 
                                                    placeholder="e.g. New Delhi" 
                                                    className="w-full bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-[#C8A34D] transition-all"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest block mb-1">State</label>
                                                <input 
                                                    type="text" 
                                                    value={profileForm.state} 
                                                    onChange={e => setProfileForm({ ...profileForm, state: e.target.value })} 
                                                    placeholder="e.g. Delhi" 
                                                    className="w-full bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-[#C8A34D] transition-all"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest block mb-1">Country</label>
                                                <input 
                                                    type="text" 
                                                    value={profileForm.country} 
                                                    onChange={e => setProfileForm({ ...profileForm, country: e.target.value })} 
                                                    placeholder="e.g. India" 
                                                    className="w-full bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-[#C8A34D] transition-all"
                                                />
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest block mb-1">Residential Address</label>
                                                <input 
                                                    type="text" 
                                                    value={profileForm.address} 
                                                    onChange={e => setProfileForm({ ...profileForm, address: e.target.value })} 
                                                    placeholder="Complete residential address" 
                                                    className="w-full bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-[#C8A34D] transition-all"
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {renderField('Full Name', profileForm.fullName, <User size={13} className="text-slate-400" />)}
                                            {renderField('Email Address', user.email, <Mail size={13} className="text-slate-400" />)}
                                            {renderField('Phone Number', profileForm.phoneNumber, <Phone size={13} className="text-slate-400" />)}
                                            {renderField('Date of Birth', formatDate(profileForm.dob), <Calendar size={13} className="text-slate-400" />)}
                                            {renderField('Gender', profileForm.gender, <User size={13} className="text-slate-400" />)}
                                            {renderField('City', profileForm.city, <MapPin size={13} className="text-slate-400" />)}
                                            {renderField('State', profileForm.state, <MapPin size={13} className="text-slate-400" />)}
                                            {renderField('Country', profileForm.country, <MapPin size={13} className="text-slate-400" />)}
                                            <div className="md:col-span-2">
                                                {renderField('Residential Address', profileForm.address, <MapPin size={13} className="text-slate-400" />)}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* 3. Professional / Academic / Law Firm Credentials Card */}
                                <div className="bg-white dark:bg-[#1E293B] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-8 shadow-[0_4px_20px_rgba(0,0,0,0.03)] dark:shadow-none space-y-6 sm:space-y-8">
                                    <h3 className="text-xs font-black uppercase tracking-widest text-[#C8A34D] border-b border-slate-100 dark:border-slate-800 pb-3">
                                        {selectedRole === 'student' ? 'Academic & Education Details' : selectedRole === 'law_firm' ? 'Firm Registration & Operations' : 'Professional & Practice Details'}
                                    </h3>
                                    
                                    {/* Role Sub-Card 1: Credentials */}
                                    {selectedRole === 'student' ? (
                                        <div className="bg-[#C8A34D]/8 dark:bg-[#C8A34D]/10 border border-[#C8A34D]/25 dark:border-[#C8A34D]/30 rounded-2xl p-3.5 sm:p-6">
                                            <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-[#B48A35] dark:text-[#C8A34D] flex items-center gap-1.5"><GraduationCap size={14} /> Law College Credentials</span>
                                                <div className="flex items-center gap-1.5 px-3 py-1 bg-[#C8A34D]/15 border border-[#C8A34D]/30 rounded-lg text-[10px] font-black text-[#B48A35] dark:text-[#C8A34D] uppercase tracking-widest">
                                                    <ShieldCheck size={12} /> Student ID Active
                                                </div>
                                            </div>

                                            {isEditing ? (
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                                    <div>
                                                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest block mb-1">Law College / University</label>
                                                        <input 
                                                            type="text" 
                                                            value={profileForm.collegeName || ''} 
                                                            onChange={e => setProfileForm({ ...profileForm, collegeName: e.target.value })} 
                                                            placeholder="e.g. NLU Delhi / Faculty of Law, DU" 
                                                            className="w-full bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-[#C8A34D] transition-all"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest block mb-1">Course Enrolled</label>
                                                        <input 
                                                            type="text" 
                                                            value={profileForm.courseEnrolled || ''} 
                                                            onChange={e => setProfileForm({ ...profileForm, courseEnrolled: e.target.value })} 
                                                            placeholder="e.g. BA LL.B (Hons)" 
                                                            className="w-full bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-[#C8A34D] transition-all"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest block mb-1">Student Roll / ID Number</label>
                                                        <input 
                                                            type="text" 
                                                            value={profileForm.studentRollNo || ''} 
                                                            onChange={e => setProfileForm({ ...profileForm, studentRollNo: e.target.value })} 
                                                            placeholder="e.g. 2021/LLB/104" 
                                                            className="w-full bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-[#C8A34D] transition-all font-mono"
                                                        />
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                    {renderField('Law College / University', profileForm.collegeName, <GraduationCap size={13} className="text-slate-400" />)}
                                                    {renderField('Course Enrolled', profileForm.courseEnrolled, <FileText size={13} className="text-slate-400" />)}
                                                    {renderField('Student Roll / ID', profileForm.studentRollNo, <ShieldCheck size={13} className="text-slate-400" />)}
                                                </div>
                                            )}
                                        </div>
                                    ) : selectedRole === 'law_firm' ? (
                                        <div className="bg-[#C8A34D]/8 dark:bg-[#C8A34D]/10 border border-[#C8A34D]/25 dark:border-[#C8A34D]/30 rounded-2xl p-3.5 sm:p-6">
                                            <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-[#B48A35] dark:text-[#C8A34D] flex items-center gap-1.5"><Building2 size={14} /> Corporate Law Firm Registration</span>
                                                <div className="flex items-center gap-1.5 px-3 py-1 bg-[#C8A34D]/15 border border-[#C8A34D]/30 rounded-lg text-[10px] font-black text-[#B48A35] dark:text-[#C8A34D] uppercase tracking-widest">
                                                    <ShieldCheck size={12} /> Firm Entity Verified
                                                </div>
                                            </div>

                                            {isEditing ? (
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                                    <div>
                                                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest block mb-1">Law Firm Legal Name</label>
                                                        <input 
                                                            type="text" 
                                                            value={profileForm.firmName || ''} 
                                                            onChange={e => setProfileForm({ ...profileForm, firmName: e.target.value })} 
                                                            placeholder="e.g. Apex Legal Associates LLP" 
                                                            className="w-full bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-[#C8A34D] transition-all"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest block mb-1">LLP / Registration Number</label>
                                                        <input 
                                                            type="text" 
                                                            value={profileForm.firmRegistrationNo || ''} 
                                                            onChange={e => setProfileForm({ ...profileForm, firmRegistrationNo: e.target.value })} 
                                                            placeholder="e.g. AAA-1234 / REG-2020-ND" 
                                                            className="w-full bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-[#C8A34D] transition-all font-mono"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest block mb-1">Establishment Year</label>
                                                        <input 
                                                            type="text" 
                                                            value={profileForm.establishmentYear || ''} 
                                                            onChange={e => setProfileForm({ ...profileForm, establishmentYear: e.target.value })} 
                                                            placeholder="e.g. 2012" 
                                                            className="w-full bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-[#C8A34D] transition-all"
                                                        />
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                    {renderField('Law Firm Legal Name', profileForm.firmName, <Building2 size={13} className="text-slate-400" />)}
                                                    {renderField('Registration / LLP No.', profileForm.firmRegistrationNo, <ShieldCheck size={13} className="text-slate-400" />)}
                                                    {renderField('Establishment Year', profileForm.establishmentYear, <Calendar size={13} className="text-slate-400" />)}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="bg-[#C8A34D]/8 dark:bg-[#C8A34D]/10 border border-[#C8A34D]/20 dark:border-[#C8A34D]/30 rounded-2xl p-3.5 sm:p-6">
                                            <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-[#B48A35] dark:text-[#C8A34D] flex items-center gap-1.5"><Award size={14} /> State Bar Council Credentials</span>
                                                <div className={`flex items-center gap-1.5 px-3 py-1 border rounded-lg text-[10px] font-black uppercase tracking-widest ${
                                                    profileForm.barNumber 
                                                        ? 'bg-[#C8A34D]/15 border-[#C8A34D]/30 text-[#B48A35] dark:text-[#C8A34D]'
                                                        : 'bg-amber-50 dark:bg-amber-950/40 border-amber-100 dark:border-amber-900/50 text-amber-600 dark:text-amber-400'
                                                }`}>
                                                    <ShieldCheck size={12} />
                                                    {profileForm.barNumber ? 'Verified Advocate' : 'Pending Verification'}
                                                </div>
                                            </div>

                                            {isEditing ? (
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                                    <div>
                                                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest block mb-1">State Bar Council</label>
                                                        <input 
                                                            type="text" 
                                                            value={profileForm.stateBarCouncil || ''} 
                                                            onChange={e => setProfileForm({ ...profileForm, stateBarCouncil: e.target.value })} 
                                                            placeholder="e.g. Bar Council of Delhi" 
                                                            className="w-full bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-[#C8A34D] transition-all"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest block mb-1">Bar Enrollment Number</label>
                                                        <input 
                                                            type="text" 
                                                            value={profileForm.barNumber || ''} 
                                                            onChange={e => setProfileForm({ ...profileForm, barNumber: e.target.value })} 
                                                            placeholder="e.g. D/1234/2018" 
                                                            className="w-full bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-[#C8A34D] transition-all font-mono"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest block mb-1">Designation Type</label>
                                                        <select 
                                                            value={profileForm.advocateType || 'Practicing Advocate'} 
                                                            onChange={e => setProfileForm({ ...profileForm, advocateType: e.target.value })} 
                                                            className="w-full bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-[#C8A34D] transition-all cursor-pointer"
                                                        >
                                                            <option value="Practicing Advocate">Practicing Advocate</option>
                                                            <option value="Senior Counsel">Senior Counsel</option>
                                                            <option value="Advocate on Record (AOR)">Advocate on Record (AOR)</option>
                                                            <option value="Legal Consultant">Legal Consultant</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                    {renderField('State Bar Council', profileForm.stateBarCouncil, <Building2 size={13} className="text-slate-400" />)}
                                                    {renderField('Bar Enrollment Number', profileForm.barNumber, <Award size={13} className="text-slate-400" />)}
                                                    {renderField('Designation', profileForm.advocateType || 'Practicing Advocate', <Briefcase size={13} className="text-slate-400" />)}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Role Sub-Card 2: Role Details */}
                                    {selectedRole === 'student' ? (
                                        isEditing ? (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                                <div>
                                                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest block mb-1">Current Year / Semester</label>
                                                    <input 
                                                        type="text" 
                                                        value={profileForm.currentYear || ''} 
                                                        onChange={e => setProfileForm({ ...profileForm, currentYear: e.target.value })} 
                                                        placeholder="e.g. 4th Year / 7th Semester" 
                                                        className="w-full bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-[#C8A34D] transition-all"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest block mb-1">Expected Graduation Year</label>
                                                    <input 
                                                        type="text" 
                                                        value={profileForm.expectedGraduationYear || ''} 
                                                        onChange={e => setProfileForm({ ...profileForm, expectedGraduationYear: e.target.value })} 
                                                        placeholder="e.g. 2025" 
                                                        className="w-full bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-[#C8A34D] transition-all"
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                {renderField('Current Year / Sem', profileForm.currentYear, <Calendar size={13} className="text-slate-400" />)}
                                                {renderField('Expected Graduation Year', profileForm.expectedGraduationYear, <Award size={13} className="text-slate-400" />)}
                                            </div>
                                        )
                                    ) : selectedRole === 'law_firm' ? (
                                        isEditing ? (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                                <div>
                                                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest block mb-1">Managing Partner Name</label>
                                                    <input 
                                                        type="text" 
                                                        value={profileForm.managingPartnerName || ''} 
                                                        onChange={e => setProfileForm({ ...profileForm, managingPartnerName: e.target.value })} 
                                                        placeholder="e.g. Senior Adv. Rajesh Sharma" 
                                                        className="w-full bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-[#C8A34D] transition-all"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest block mb-1">Total Active Advocates / Team Size</label>
                                                    <input 
                                                        type="text" 
                                                        value={profileForm.totalAdvocatesCount || ''} 
                                                        onChange={e => setProfileForm({ ...profileForm, totalAdvocatesCount: e.target.value })} 
                                                        placeholder="e.g. 24 Advocates" 
                                                        className="w-full bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-[#C8A34D] transition-all"
                                                    />
                                                </div>
                                                <div className="md:col-span-2">
                                                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest block mb-1">Headquarters Office Address</label>
                                                    <input 
                                                        type="text" 
                                                        value={profileForm.hqAddress || ''} 
                                                        onChange={e => setProfileForm({ ...profileForm, hqAddress: e.target.value })} 
                                                        placeholder="Complete corporate office address" 
                                                        className="w-full bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-[#C8A34D] transition-all"
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                {renderField('Managing Partner Name', profileForm.managingPartnerName, <User size={13} className="text-slate-400" />)}
                                                {renderField('Active Advocates & Team Size', profileForm.totalAdvocatesCount, <Users size={13} className="text-slate-400" />)}
                                                <div className="md:col-span-2">
                                                    {renderField('Headquarters Address', profileForm.hqAddress, <MapPin size={13} className="text-slate-400" />)}
                                                </div>
                                            </div>
                                        )
                                    ) : (
                                        isEditing ? (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                                <div>
                                                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest block mb-1">Enrollment Year</label>
                                                    <input 
                                                        type="text" 
                                                        value={profileForm.enrollmentYear || ''} 
                                                        onChange={e => setProfileForm({ ...profileForm, enrollmentYear: e.target.value })} 
                                                        placeholder="e.g. 2018" 
                                                        className="w-full bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-[#6D5DFC] dark:focus:border-[#C8A34D] transition-all"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest block mb-1">Practice Experience (Years)</label>
                                                    <input 
                                                        type="text" 
                                                        value={profileForm.practiceExperience || ''} 
                                                        onChange={e => setProfileForm({ ...profileForm, practiceExperience: e.target.value })} 
                                                        placeholder="e.g. 6 Years" 
                                                        className="w-full bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-[#6D5DFC] dark:focus:border-[#C8A34D] transition-all"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest block mb-1">Primary Court of Practice</label>
                                                    <input 
                                                        type="text" 
                                                        value={profileForm.primaryCourt || ''} 
                                                        onChange={e => setProfileForm({ ...profileForm, primaryCourt: e.target.value })} 
                                                        placeholder="e.g. Delhi High Court / District Courts" 
                                                        className="w-full bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-[#6D5DFC] dark:focus:border-[#C8A34D] transition-all"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest block mb-1">Languages Known</label>
                                                    <input 
                                                        type="text" 
                                                        value={profileForm.languagesKnown || ''} 
                                                        onChange={e => setProfileForm({ ...profileForm, languagesKnown: e.target.value })} 
                                                        placeholder="e.g. English, Hindi, Punjabi" 
                                                        className="w-full bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-[#6D5DFC] dark:focus:border-[#C8A34D] transition-all"
                                                    />
                                                </div>

                                                <div className="md:col-span-2 border-t border-slate-100 dark:border-slate-800 pt-6 mt-2 space-y-4">
                                                    <div className="text-[10px] font-black uppercase tracking-widest text-[#6D5DFC] dark:text-[#C8A34D]">Office Details</div>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                                        <div>
                                                            <label className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest block mb-1">Office Name</label>
                                                            <input 
                                                                type="text" 
                                                                value={profileForm.officeName || ''} 
                                                                onChange={e => setProfileForm({ ...profileForm, officeName: e.target.value })} 
                                                                placeholder="e.g. Apex Legal Chambers" 
                                                                className="w-full bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-[#6D5DFC] dark:focus:border-[#C8A34D] transition-all"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest block mb-1">Office Address</label>
                                                            <input 
                                                                type="text" 
                                                                value={profileForm.officeAddress || ''} 
                                                                onChange={e => setProfileForm({ ...profileForm, officeAddress: e.target.value })} 
                                                                placeholder="Complete office chambers address" 
                                                                className="w-full bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-[#6D5DFC] dark:focus:border-[#C8A34D] transition-all"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                {renderField('Enrollment Year', profileForm.enrollmentYear, <Calendar size={13} className="text-slate-400" />)}
                                                {renderField('Practice Experience (Years)', profileForm.practiceExperience, <Briefcase size={13} className="text-slate-400" />)}
                                                {renderField('Primary Court of Practice', profileForm.primaryCourt, <Scale size={13} className="text-slate-400" />)}
                                                {renderField('Languages Known', profileForm.languagesKnown, <Languages size={13} className="text-slate-400" />)}
                                                
                                                <div className="md:col-span-2 border-t border-slate-100 dark:border-slate-800 pt-6 mt-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <div className="md:col-span-2 text-[10px] font-black uppercase tracking-widest text-[#6D5DFC] dark:text-[#C8A34D]">Office Details</div>
                                                    {renderField('Office Name', profileForm.officeName, <Building2 size={13} className="text-slate-400" />)}
                                                    {renderField('Office Address', profileForm.officeAddress, <MapPin size={13} className="text-slate-400" />)}
                                                </div>
                                            </div>
                                        )
                                    )}

                                    {/* Practice / Focus Areas Chips */}
                                    <div className="border-t border-slate-100 dark:border-slate-800 pt-6">
                                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest block mb-3">
                                            {selectedRole === 'student' ? 'Academic Focus & Interests' : selectedRole === 'law_firm' ? 'Firm Practice Domains' : 'Practice Areas'}
                                        </label>
                                        <div className="flex flex-wrap gap-2">
                                            {(() => {
                                                const chipList = selectedRole === 'student' ? STUDENT_FOCUS_AREAS : selectedRole === 'law_firm' ? FIRM_PRACTICE_DOMAINS : PRACTICE_AREAS;
                                                const activeArray = profileForm.practiceAreas || [];

                                                return isEditing ? (
                                                    chipList.map(area => {
                                                        const isSelected = activeArray.includes(area);
                                                        return (
                                                            <button
                                                                key={area}
                                                                type="button"
                                                                onClick={() => {
                                                                    const newList = activeArray.includes(area)
                                                                        ? activeArray.filter(a => a !== area)
                                                                        : [...activeArray, area];
                                                                    setProfileForm({ ...profileForm, practiceAreas: newList });
                                                                }}
                                                                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                                                                    isSelected 
                                                                        ? 'bg-[#C8A34D] border-[#C8A34D] text-[#111111] font-black shadow-xs'
                                                                        : 'bg-white dark:bg-[#0F172A] border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-[#C8A34D]/50'
                                                                }`}
                                                            >
                                                                {area}
                                                            </button>
                                                        );
                                                    })
                                                ) : (
                                                    activeArray.length > 0 ? (
                                                        activeArray.map(area => (
                                                            <span
                                                                key={area}
                                                                className="px-3 py-1.5 rounded-full text-xs font-bold bg-[#C8A34D]/10 border border-[#C8A34D]/30 text-[#B48A35] dark:text-[#C8A34D]"
                                                            >
                                                                {area}
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <span className="text-xs font-medium text-slate-400 dark:text-slate-500 italic">No focus areas selected</span>
                                                    )
                                                );
                                            })()}
                                        </div>
                                    </div>
                                </div>

                                {/* 4. About Card (Role-Specific) */}
                                <div className="bg-white dark:bg-[#1E293B] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-8 shadow-[0_4px_20px_rgba(0,0,0,0.03)] dark:shadow-none space-y-5 sm:space-y-6">
                                    <h3 className="text-xs font-black uppercase tracking-widest text-[#C8A34D] border-b border-slate-100 dark:border-slate-800 pb-3">
                                        {selectedRole === 'student' ? 'About Law Student' : selectedRole === 'law_firm' ? 'About Law Firm' : 'About Advocate'}
                                    </h3>
                                    
                                    {isEditing ? (
                                        <div className="space-y-5">
                                            <div>
                                                <label className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest block mb-1">Core Specialization / Focus</label>
                                                <input 
                                                    type="text" 
                                                    value={profileForm.specialization || ''} 
                                                    onChange={e => setProfileForm({ ...profileForm, specialization: e.target.value })} 
                                                    placeholder={selectedRole === 'student' ? "e.g. Constitutional Law, Moot Court Specialization" : selectedRole === 'law_firm' ? "e.g. Cross-Border M&A, Commercial Arbitration" : "e.g. Criminal Trial Defense, Corporate Law"} 
                                                    className="w-full bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-[#C8A34D] transition-all"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest block mb-1">Short Profile Bio</label>
                                                <textarea 
                                                    value={profileForm.bio || ''} 
                                                    onChange={e => setProfileForm({ ...profileForm, bio: e.target.value })} 
                                                    rows={4}
                                                    placeholder="Profile bio, legal background, highlights..." 
                                                    className="w-full bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-4 py-3 text-xs font-medium focus:outline-none focus:border-[#C8A34D] transition-all resize-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest block mb-1">Achievements / Citations / Honors</label>
                                                <textarea 
                                                    value={profileForm.achievements || ''} 
                                                    onChange={e => setProfileForm({ ...profileForm, achievements: e.target.value })} 
                                                    rows={3}
                                                    placeholder="Moots won, landmark judgments, publications..." 
                                                    className="w-full bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-4 py-3 text-xs font-medium focus:outline-none focus:border-[#C8A34D] transition-all resize-none"
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            {renderField('Core Specialization / Focus', profileForm.specialization, <Sparkles size={13} className="text-slate-400" />)}
                                            
                                            <div className="space-y-1">
                                                <span className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                                    <Info size={13} className="text-slate-400" />
                                                    <span>Short Profile Bio</span>
                                                </span>
                                                <p className="text-xs font-medium text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                                                    {profileForm.bio || <span className="text-slate-300 dark:text-slate-600 font-medium italic">No bio provided</span>}
                                                </p>
                                            </div>

                                            <div className="space-y-1">
                                                <span className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                                    <Award size={13} className="text-slate-400" />
                                                    <span>Achievements / Citations / Honors</span>
                                                </span>
                                                <p className="text-xs font-medium text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                                                    {profileForm.achievements || <span className="text-slate-300 dark:text-slate-600 font-medium italic">No achievements listed</span>}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            {/* Right Column: Dynamic Info Sidebar */}
                            <div className="space-y-6">
                                
                                {/* A. Profile Completion Card */}
                                <div className="bg-white dark:bg-[#1E293B] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-8 shadow-[0_4px_20px_rgba(0,0,0,0.03)] dark:shadow-none text-center">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-400 block mb-4">Profile Completion</span>
                                    
                                    {/* Circle Progress bar visual */}
                                    <div className="relative w-24 h-24 mx-auto flex items-center justify-center mb-4">
                                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                                            <path className="text-slate-100 dark:text-slate-800" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                            <path className="text-[#C8A34D]" strokeDasharray={`${profileCompletion}, 100`} strokeWidth="3" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                        </svg>
                                        <div className="absolute text-xl font-extrabold text-slate-800 dark:text-white">{profileCompletion}%</div>
                                    </div>
                                    
                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-bold leading-relaxed px-2">
                                        Complete your profile to unlock a better AI Legal experience.
                                    </p>
                                </div>

                                {/* B. AI Integration Card */}
                                <div className="bg-white dark:bg-[#1E293B] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-8 shadow-[0_4px_20px_rgba(0,0,0,0.03)] dark:shadow-none">
                                    <div className="flex items-center gap-2 text-[#C8A34D] mb-4">
                                        <Sparkles size={14} className="fill-[#C8A34D]" />
                                        <span className="text-xs font-black uppercase tracking-widest">AI Customization</span>
                                    </div>
                                    <p className="text-xs text-slate-600 dark:text-slate-300 font-bold leading-relaxed mb-4">
                                        AI LEGAL uses your professional profile details to personalize:
                                    </p>
                                    <ul className="space-y-3">
                                        {[
                                            'Legal Notice & Agreement Drafts',
                                            'Precedent Research & Law Searches',
                                            'Citation Formatting Styles',
                                            'Relevant Court Jurisdiction Suggestions',
                                            'Strategic Case Recommendations'
                                        ].map(item => (
                                            <li key={item} className="flex items-start gap-2.5 text-[11px] text-slate-500 dark:text-slate-400 font-semibold leading-normal">
                                                <span className="w-1.5 h-1.5 rounded-full bg-[#C8A34D] mt-1.5 shrink-0" />
                                                <span>{item}</span>
                                            </li>
                                        ))}
                                    </ul>
                                    <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest leading-none">
                                        <Info size={12} className="shrink-0" />
                                        <span>Informational Only</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Modal Sticky Footer (Only shown when editing) */}
                    {isEditing && (
                        <div className="sticky bottom-0 z-20 px-4 sm:px-8 py-3 sm:py-4 bg-white dark:bg-[#1E293B] border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3 shrink-0">
                            <button
                                onClick={() => {
                                    if (personalizations?.advocateProfile) {
                                        setProfileForm(personalizations.advocateProfile);
                                    }
                                    setIsEditing(false);
                                }}
                                className="px-4 sm:px-5 py-2.5 sm:py-3 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-black uppercase tracking-wider transition-colors active:scale-95 animate-fade-in cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveProfile}
                                className="px-5 sm:px-7 py-2.5 sm:py-3 bg-[#C8A34D] hover:bg-[#b08d3b] text-[#111111] font-black rounded-xl text-xs uppercase tracking-wider transition-colors shadow-md active:scale-[0.98] animate-fade-in cursor-pointer"
                            >
                                Save Changes
                            </button>
                        </div>
                    )}
                </motion.div>
            </div>

            {/* Avatar Cropping Panel */}
            {showCropper && (
                <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 pointer-events-auto" onClick={() => setShowCropper(false)}>
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }} 
                        animate={{ opacity: 1, scale: 1 }} 
                        className="bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col" 
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="p-6 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
                            <div>
                                <h3 className="text-lg font-black text-slate-800 dark:text-white tracking-tight">Adjust Profile Photo</h3>
                                <p className="text-xs text-slate-400 dark:text-slate-400 font-semibold mt-1">Crop, rotate, and resize your photo</p>
                            </div>
                            <button onClick={() => setShowCropper(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                                <X size={20} className="text-slate-400 dark:text-slate-400" />
                            </button>
                        </div>

                        {/* Crop Area */}
                        <div className="relative h-[280px] bg-slate-100 dark:bg-slate-900">
                            <Cropper
                                image={imageToCrop}
                                crop={crop}
                                zoom={zoom}
                                rotation={rotation}
                                aspect={aspect}
                                onCropChange={setCrop}
                                onCropComplete={handleCropComplete}
                                onZoomChange={setZoom}
                                onRotationChange={setRotation}
                                cropShape="round"
                                showGrid={true}
                            />
                        </div>

                        {/* Controls Panel */}
                        <div className="p-6 space-y-6 bg-white dark:bg-[#1E293B]">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                {/* Zoom */}
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">
                                        <span>Zoom</span>
                                        <span className="text-[#6D5DFC] dark:text-[#C8A34D]">{Math.round(zoom * 100)}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        value={zoom}
                                        min={1}
                                        max={3}
                                        step={0.1}
                                        aria-labelledby="Zoom Slider"
                                        onChange={(e) => setZoom(parseFloat(e.target.value))}
                                        className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#6D5DFC] dark:accent-[#C8A34D]"
                                    />
                                </div>

                                {/* Rotation */}
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">
                                        <span>Rotation</span>
                                        <span className="text-[#6D5DFC] dark:text-[#C8A34D]">{rotation}°</span>
                                    </div>
                                    <input
                                        type="range"
                                        value={rotation}
                                        min={0}
                                        max={360}
                                        step={1}
                                        aria-labelledby="Rotation Slider"
                                        onChange={(e) => setRotation(parseInt(e.target.value))}
                                        className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#6D5DFC] dark:accent-[#C8A34D]"
                                    />
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-400 mr-2">Aspect:</span>
                                    {[
                                        { label: 'Square', value: 1 / 1 },
                                        { label: 'Circle', value: 1 / 1 }
                                    ].map((opt, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setAspect(opt.value)}
                                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${
                                                aspect === opt.value 
                                                    ? 'bg-[#6D5DFC] dark:bg-[#C8A34D] border-[#6D5DFC] dark:border-[#C8A34D] text-white dark:text-[#111111] shadow-sm'
                                                    : 'bg-white dark:bg-[#1E293B] border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white'
                                            }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>

                                <div className="flex items-center gap-3 w-full sm:w-auto">
                                    <button
                                        onClick={() => setShowCropper(false)}
                                        className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSaveCrop}
                                        disabled={uploadingCroppedImage}
                                        className="flex-1 sm:flex-none px-6 py-2.5 bg-[#6D5DFC] dark:bg-[#C8A34D] hover:bg-[#5b4edb] dark:hover:bg-[#b08d3b] text-white dark:text-[#111111] font-black rounded-xl text-xs uppercase tracking-wider shadow-lg transition-colors disabled:opacity-50"
                                    >
                                        {uploadingCroppedImage ? 'Uploading...' : 'Save & Update'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
};

export default ProfileSettingsDropdown;
