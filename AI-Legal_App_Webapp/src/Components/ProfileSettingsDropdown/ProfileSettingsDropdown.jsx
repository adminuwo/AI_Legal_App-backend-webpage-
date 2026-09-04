import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Camera, Plus, Trash2, ShieldCheck, Mail, Phone, MapPin, 
    Calendar, Briefcase, Award, Info, Sparkles, Scale, Languages,
    Activity, GraduationCap, Building2, User
} from 'lucide-react';
import { useRecoilState } from 'recoil';
import toast from 'react-hot-toast';
import axios from 'axios';
import { API, apis } from '../../types';
import { usePersonalization } from '../../context/PersonalizationContext';
import { getUserData, setUserData, userData } from '../../userStore/userData';
import Cropper from 'react-easy-crop';
import { getCroppedImgBlob } from '../../utils/canvasUtils';

const PRACTICE_AREAS = [
    'Civil Law', 'Criminal Law', 'Corporate Law', 'Family Law', 
    'Property Law', 'Tax Law', 'Labour Law', 'Constitutional Law', 
    'Arbitration', 'IPR'
];

const ProfileSettingsDropdown = ({ onClose }) => {
    const fileInputRef = useRef(null);
    const [currentUserData, setUserRecoil] = useRecoilState(userData);
    const user = currentUserData.user || getUserData() || {};
    const { personalizations, updatePersonalization } = usePersonalization();

    const [isEditing, setIsEditing] = useState(false);
    
    // Advocate Profile Form State
    const [profileForm, setProfileForm] = useState({
        fullName: '',
        phoneNumber: '',
        dob: '',
        gender: '',
        address: '',
        city: '',
        state: '',
        country: '',
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
        achievements: ''
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
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    {icon}
                    <span>{label}</span>
                </span>
                <span className="text-xs font-bold text-slate-800 block break-words">
                    {value || <span className="text-slate-300 font-medium italic">Not provided</span>}
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
                    className="absolute sm:relative bottom-0 sm:top-0 left-0 h-[90vh] sm:h-[85vh] w-full sm:max-w-5xl bg-white flex flex-col shadow-[0_12px_40px_rgba(0,0,0,0.08)] sm:rounded-2xl border border-slate-100 pointer-events-auto overflow-hidden font-sans"
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
                    <div className="sticky top-0 z-20 px-6 sm:px-8 py-4 sm:py-5 flex justify-between items-center bg-white border-b border-slate-100 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-[#6D5DFC]/10 flex items-center justify-center text-[#6D5DFC]">
                                <Scale className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Advocate Profile</h2>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Litigation & Practice Credentials</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button 
                                onClick={() => {
                                    if (isEditing) {
                                        // Reset to saved state
                                        if (personalizations?.advocateProfile) {
                                            setProfileForm(personalizations.advocateProfile);
                                        }
                                        setIsEditing(false);
                                    } else {
                                        setIsEditing(true);
                                    }
                                }} 
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                                    isEditing 
                                        ? 'bg-slate-100 hover:bg-slate-200/80 text-slate-700 border-slate-200' 
                                        : 'hover:bg-slate-50 text-[#6D5DFC] border-[#6D5DFC]/20 hover:border-[#6D5DFC]/40'
                                }`}
                            >
                                {isEditing ? 'Cancel' : 'Edit Profile'}
                            </button>
                            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
                                <X size={20} className="text-slate-400" />
                            </button>
                        </div>
                    </div>

                    {/* Scrollable Dossier / Form Body */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 sm:p-8 bg-white">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                            
                            {/* Left Column: Dossier Cards */}
                            <div className="lg:col-span-2 space-y-8">
                                
                                {/* 1. Profile Header Identity Card */}
                                <div className="bg-white border border-slate-100 rounded-2xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.03)]">
                                    <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
                                        {/* Avatar Box */}
                                        <div className="relative group shrink-0">
                                            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-[#6D5DFC]/10 flex items-center justify-center text-[#6D5DFC] border border-[#6D5DFC]/15 shadow-sm overflow-hidden relative z-10">
                                                {user.avatar ? (
                                                    <img 
                                                        src={user.avatar} 
                                                        alt={user.name} 
                                                        className="w-full h-full object-cover transition-opacity" 
                                                        onError={(e) => { e.currentTarget.src = '/account.png'; }} 
                                                    />
                                                ) : (
                                                    <span className="text-4xl font-black">
                                                        {(profileForm.fullName || user.name || 'U').charAt(0).toUpperCase()}
                                                    </span>
                                                )}
                                                
                                                {isEditing && (
                                                    <div 
                                                        onClick={() => fileInputRef.current?.click()}
                                                        className="absolute inset-0 bg-black/45 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-20"
                                                    >
                                                        <Camera className="w-6 h-6 text-white" />
                                                    </div>
                                                )}
                                            </div>
                                            
                                            {/* Photo Management Plus Icon (Edit mode only) */}
                                            {isEditing && (
                                                <button
                                                    className="absolute -bottom-1 -right-1 w-8 h-8 bg-[#6D5DFC] hover:bg-[#5b4edb] text-white rounded-full flex items-center justify-center shadow-lg border-2 border-white z-20 hover:scale-105 transition-transform"
                                                    onClick={() => fileInputRef.current?.click()}
                                                    title="Upload Photo"
                                                >
                                                    <Plus className="w-5 h-5" />
                                                </button>
                                            )}
                                        </div>

                                        {/* Name & Basic Details */}
                                        <div className="flex-1 space-y-2">
                                            <div>
                                                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                                                    <h3 className="text-2xl font-extrabold text-slate-800 tracking-tight capitalize">
                                                        {profileForm.fullName || user.name || 'Anonymous Advocate'}
                                                    </h3>
                                                    {profileForm.barNumber && (
                                                        <div className="flex items-center gap-1 px-2.5 py-0.5 bg-[#4F8CFF]/10 border border-[#4F8CFF]/20 rounded-md text-[9px] font-black text-[#4F8CFF] uppercase tracking-widest">
                                                            <ShieldCheck size={11} /> Verified
                                                        </div>
                                                    )}
                                                </div>
                                                <p className="text-xs text-slate-500 font-bold mt-1 flex items-center justify-center sm:justify-start gap-1.5">
                                                    <Mail size={12} className="text-slate-400" />
                                                    {user.email}
                                                </p>
                                            </div>

                                            {/* Photo Action Buttons */}
                                            {isEditing && (
                                                <div className="flex items-center justify-center sm:justify-start gap-2 mt-2">
                                                    <button
                                                        onClick={() => fileInputRef.current?.click()}
                                                        className="inline-flex items-center gap-1 px-3 py-1 bg-[#6D5DFC]/10 hover:bg-[#6D5DFC]/15 text-[#6D5DFC] rounded-lg border border-[#6D5DFC]/20 text-[10px] font-black uppercase tracking-widest transition-colors"
                                                    >
                                                        Change Photo
                                                    </button>
                                                    {user.avatar && (
                                                        <button
                                                            onClick={handleRemoveAvatar}
                                                            className="inline-flex items-center gap-1 px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg border border-rose-100 text-[10px] font-black uppercase tracking-widest transition-colors"
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
                                <div className="bg-white border border-slate-100 rounded-2xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.03)] space-y-6">
                                    <h3 className="text-xs font-black uppercase tracking-widest text-[#6D5DFC] border-b border-slate-100 pb-3">Personal Information</h3>
                                    
                                    {isEditing ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            <div>
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Full Name</label>
                                                <input 
                                                    type="text" 
                                                    value={profileForm.fullName} 
                                                    onChange={e => setProfileForm({ ...profileForm, fullName: e.target.value })} 
                                                    placeholder="Advocate Full Name" 
                                                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-[#6D5DFC] transition-all"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Email Address (Account Linked)</label>
                                                <input 
                                                    type="text" 
                                                    disabled 
                                                    value={user.email} 
                                                    className="w-full bg-slate-50 border border-slate-200 text-slate-500 rounded-xl px-4 py-2.5 text-xs font-bold outline-none cursor-not-allowed"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Phone Number</label>
                                                <input 
                                                    type="text" 
                                                    value={profileForm.phoneNumber} 
                                                    onChange={e => setProfileForm({ ...profileForm, phoneNumber: e.target.value })} 
                                                    placeholder="+91 XXXXX XXXXX" 
                                                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-[#6D5DFC] transition-all"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Date of Birth (Optional)</label>
                                                <input 
                                                    type="date" 
                                                    value={profileForm.dob} 
                                                    onChange={e => setProfileForm({ ...profileForm, dob: e.target.value })} 
                                                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-[#6D5DFC] transition-all cursor-pointer"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Gender (Optional)</label>
                                                <select 
                                                    value={profileForm.gender} 
                                                    onChange={e => setProfileForm({ ...profileForm, gender: e.target.value })} 
                                                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-[#6D5DFC] transition-all cursor-pointer"
                                                >
                                                    <option value="">Select Gender</option>
                                                    <option value="Male">Male</option>
                                                    <option value="Female">Female</option>
                                                    <option value="Other">Other</option>
                                                    <option value="Prefer not to say">Prefer not to say</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">City</label>
                                                <input 
                                                    type="text" 
                                                    value={profileForm.city} 
                                                    onChange={e => setProfileForm({ ...profileForm, city: e.target.value })} 
                                                    placeholder="e.g. New Delhi" 
                                                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-[#6D5DFC] transition-all"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">State</label>
                                                <input 
                                                    type="text" 
                                                    value={profileForm.state} 
                                                    onChange={e => setProfileForm({ ...profileForm, state: e.target.value })} 
                                                    placeholder="e.g. Delhi" 
                                                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-[#6D5DFC] transition-all"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Country</label>
                                                <input 
                                                    type="text" 
                                                    value={profileForm.country} 
                                                    onChange={e => setProfileForm({ ...profileForm, country: e.target.value })} 
                                                    placeholder="e.g. India" 
                                                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-[#6D5DFC] transition-all"
                                                />
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Residential Address</label>
                                                <input 
                                                    type="text" 
                                                    value={profileForm.address} 
                                                    onChange={e => setProfileForm({ ...profileForm, address: e.target.value })} 
                                                    placeholder="Complete residential address" 
                                                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-[#6D5DFC] transition-all"
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

                                {/* 3. Professional Information Card */}
                                <div className="bg-white border border-slate-100 rounded-2xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.03)] space-y-8">
                                    <h3 className="text-xs font-black uppercase tracking-widest text-[#6D5DFC] border-b border-slate-100 pb-3">Professional Information</h3>
                                    
                                    {/* Bar Council Sub-Card */}
                                    <div className="bg-[#6D5DFC]/5 border border-[#6D5DFC]/10 rounded-2xl p-6">
                                        <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-[#6D5DFC] flex items-center gap-1.5"><Award size={14} /> State Bar Council Credentials</span>
                                            <div className={`flex items-center gap-1.5 px-3 py-1 border rounded-lg text-[10px] font-black uppercase tracking-widest ${
                                                profileForm.barNumber 
                                                    ? 'bg-[#4F8CFF]/10 border-[#4F8CFF]/20 text-[#4F8CFF]'
                                                    : 'bg-amber-50 border-amber-100 text-amber-600'
                                            }`}>
                                                <ShieldCheck size={12} />
                                                {profileForm.barNumber ? 'Verified Advocate' : 'Pending Verification'}
                                            </div>
                                        </div>

                                        {isEditing ? (
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                                <div>
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">State Bar Council</label>
                                                    <input 
                                                        type="text" 
                                                        value={profileForm.stateBarCouncil} 
                                                        onChange={e => setProfileForm({ ...profileForm, stateBarCouncil: e.target.value })} 
                                                        placeholder="e.g. Bar Council of Delhi" 
                                                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-[#6D5DFC] transition-all"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Bar Council Number</label>
                                                    <input 
                                                        type="text" 
                                                        value={profileForm.barNumber} 
                                                        onChange={e => setProfileForm({ ...profileForm, barNumber: e.target.value })} 
                                                        placeholder="e.g. D/1042/2018" 
                                                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-[#6D5DFC] transition-all font-mono"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Enrollment Date</label>
                                                    <input 
                                                        type="date" 
                                                        value={profileForm.enrollmentDate} 
                                                        onChange={e => setProfileForm({ ...profileForm, enrollmentDate: e.target.value })} 
                                                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-[#6D5DFC] transition-all cursor-pointer"
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                {renderField('State Bar Council', profileForm.stateBarCouncil, <Award size={13} className="text-slate-400" />)}
                                                {renderField('Bar Council Number', profileForm.barNumber, <Award size={13} className="text-slate-400" />)}
                                                {renderField('Enrollment Date', formatDate(profileForm.enrollmentDate), <Calendar size={13} className="text-slate-400" />)}
                                            </div>
                                        )}
                                    </div>

                                    {/* General Professional Fields */}
                                    {isEditing ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            <div>
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Enrollment Year</label>
                                                <input 
                                                    type="text" 
                                                    value={profileForm.enrollmentYear} 
                                                    onChange={e => setProfileForm({ ...profileForm, enrollmentYear: e.target.value })} 
                                                    placeholder="e.g. 2018" 
                                                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-[#6D5DFC] transition-all"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Practice Experience (Years)</label>
                                                <input 
                                                    type="text" 
                                                    value={profileForm.practiceExperience} 
                                                    onChange={e => setProfileForm({ ...profileForm, practiceExperience: e.target.value })} 
                                                    placeholder="e.g. 8" 
                                                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-[#6D5DFC] transition-all"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Primary Court of Practice</label>
                                                <input 
                                                    type="text" 
                                                    value={profileForm.primaryCourt} 
                                                    onChange={e => setProfileForm({ ...profileForm, primaryCourt: e.target.value })} 
                                                    placeholder="e.g. High Court of Delhi" 
                                                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-[#6D5DFC] transition-all"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Languages Known</label>
                                                <input 
                                                    type="text" 
                                                    value={profileForm.languagesKnown} 
                                                    onChange={e => setProfileForm({ ...profileForm, languagesKnown: e.target.value })} 
                                                    placeholder="e.g. English, Hindi" 
                                                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-[#6D5DFC] transition-all"
                                                />
                                            </div>
                                            
                                            {/* Office Details */}
                                            <div className="md:col-span-2 border-t border-slate-100 pt-6 mt-2">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-[#6D5DFC] block mb-4">Office Details</span>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Office Name</label>
                                                        <input 
                                                            type="text" 
                                                            value={profileForm.officeName} 
                                                            onChange={e => setProfileForm({ ...profileForm, officeName: e.target.value })} 
                                                            placeholder="e.g. Apex Legal Chambers" 
                                                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-[#6D5DFC] transition-all"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Office Address</label>
                                                        <input 
                                                            type="text" 
                                                            value={profileForm.officeAddress} 
                                                            onChange={e => setProfileForm({ ...profileForm, officeAddress: e.target.value })} 
                                                            placeholder="Complete office chambers address" 
                                                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-[#6D5DFC] transition-all"
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
                                            
                                            <div className="md:col-span-2 border-t border-slate-100 pt-6 mt-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="md:col-span-2 text-[10px] font-black uppercase tracking-widest text-[#6D5DFC]">Office Details</div>
                                                {renderField('Office Name', profileForm.officeName, <Building2 size={13} className="text-slate-400" />)}
                                                {renderField('Office Address', profileForm.officeAddress, <MapPin size={13} className="text-slate-400" />)}
                                            </div>
                                        </div>
                                    )}

                                    {/* Practice Areas Chips */}
                                    <div className="border-t border-slate-100 pt-6">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">Practice Areas</label>
                                        <div className="flex flex-wrap gap-2">
                                            {isEditing ? (
                                                PRACTICE_AREAS.map(area => {
                                                    const isSelected = profileForm.practiceAreas?.includes(area);
                                                    return (
                                                        <button
                                                            key={area}
                                                            type="button"
                                                            onClick={() => {
                                                                const list = profileForm.practiceAreas || [];
                                                                const newList = list.includes(area)
                                                                    ? list.filter(a => a !== area)
                                                                    : [...list, area];
                                                                setProfileForm({ ...profileForm, practiceAreas: newList });
                                                            }}
                                                            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                                                                isSelected 
                                                                    ? 'bg-[#6D5DFC] border-[#6D5DFC] text-white shadow-sm'
                                                                    : 'bg-white border-slate-200 text-slate-500 hover:text-slate-700'
                                                            }`}
                                                        >
                                                            {area}
                                                        </button>
                                                    );
                                                })
                                            ) : (
                                                profileForm.practiceAreas?.length > 0 ? (
                                                    profileForm.practiceAreas.map(area => (
                                                        <span
                                                            key={area}
                                                            className="px-3 py-1.5 rounded-full text-xs font-bold bg-[#6D5DFC]/10 border border-[#6D5DFC]/20 text-[#6D5DFC]"
                                                        >
                                                            {area}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-xs font-medium text-slate-400 italic">No practice areas selected</span>
                                                )
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* 4. About Advocate Card */}
                                <div className="bg-white border border-slate-100 rounded-2xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.03)] space-y-6">
                                    <h3 className="text-xs font-black uppercase tracking-widest text-[#6D5DFC] border-b border-slate-100 pb-3">About Advocate</h3>
                                    
                                    {isEditing ? (
                                        <div className="space-y-5">
                                            <div>
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Core Specialization</label>
                                                <input 
                                                    type="text" 
                                                    value={profileForm.specialization} 
                                                    onChange={e => setProfileForm({ ...profileForm, specialization: e.target.value })} 
                                                    placeholder="e.g. Criminal Trial Defense, Corporate M&A" 
                                                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-[#6D5DFC] transition-all"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Short Professional Bio</label>
                                                <textarea 
                                                    value={profileForm.bio} 
                                                    onChange={e => setProfileForm({ ...profileForm, bio: e.target.value })} 
                                                    rows={4}
                                                    placeholder="Advocate bio, court background, practice highlights..." 
                                                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-medium focus:outline-none focus:border-[#6D5DFC] transition-all resize-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Achievements / Landmark Citations (Optional)</label>
                                                <textarea 
                                                    value={profileForm.achievements} 
                                                    onChange={e => setProfileForm({ ...profileForm, achievements: e.target.value })} 
                                                    rows={3}
                                                    placeholder="Publications, landmark judgments argued, panel appointments..." 
                                                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-medium focus:outline-none focus:border-[#6D5DFC] transition-all resize-none"
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            {renderField('Core Specialization', profileForm.specialization, <Sparkles size={13} className="text-slate-400" />)}
                                            
                                            <div className="space-y-1">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                                    <Info size={13} className="text-slate-400" />
                                                    <span>Short Professional Bio</span>
                                                </span>
                                                <p className="text-xs font-medium text-slate-700 whitespace-pre-wrap leading-relaxed">
                                                    {profileForm.bio || <span className="text-slate-300 font-medium italic">No bio provided</span>}
                                                </p>
                                            </div>

                                            <div className="space-y-1">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                                    <Award size={13} className="text-slate-400" />
                                                    <span>Achievements / Landmark Citations</span>
                                                </span>
                                                <p className="text-xs font-medium text-slate-700 whitespace-pre-wrap leading-relaxed">
                                                    {profileForm.achievements || <span className="text-slate-300 font-medium italic">No achievements listed</span>}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            {/* Right Column: Dynamic Info Sidebar */}
                            <div className="space-y-6">
                                
                                {/* A. Profile Completion Card */}
                                <div className="bg-white border border-slate-100 rounded-2xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.03)] text-center">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-4">Profile Completion</span>
                                    
                                    {/* Circle Progress bar visual */}
                                    <div className="relative w-24 h-24 mx-auto flex items-center justify-center mb-4">
                                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                                            <path className="text-slate-100" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                            <path className="text-[#6D5DFC]" strokeDasharray={`${profileCompletion}, 100`} strokeWidth="3" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                        </svg>
                                        <div className="absolute text-xl font-extrabold text-slate-800">{profileCompletion}%</div>
                                    </div>
                                    
                                    <p className="text-xs text-slate-500 font-bold leading-relaxed px-2">
                                        Complete your profile to unlock a better AI Legal experience.
                                    </p>
                                </div>

                                {/* B. AI Integration Card */}
                                <div className="bg-white border border-slate-100 rounded-2xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.03)]">
                                    <div className="flex items-center gap-2 text-[#6D5DFC] mb-4">
                                        <Sparkles size={14} className="fill-[#6D5DFC]" />
                                        <span className="text-xs font-black uppercase tracking-widest">AI Customization</span>
                                    </div>
                                    <p className="text-xs text-slate-600 font-bold leading-relaxed mb-4">
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
                                            <li key={item} className="flex items-start gap-2.5 text-[11px] text-slate-500 font-semibold leading-normal">
                                                <span className="w-1.5 h-1.5 rounded-full bg-[#6D5DFC] mt-1.5 shrink-0" />
                                                <span>{item}</span>
                                            </li>
                                        ))}
                                    </ul>
                                    <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">
                                        <Info size={12} className="shrink-0" />
                                        <span>Informational Only</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Modal Sticky Footer (Only shown when editing) */}
                    {isEditing && (
                        <div className="sticky bottom-0 z-20 px-8 py-4 bg-white border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
                            <button
                                onClick={() => {
                                    if (personalizations?.advocateProfile) {
                                        setProfileForm(personalizations.advocateProfile);
                                    }
                                    setIsEditing(false);
                                }}
                                className="px-5 py-3 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-black uppercase tracking-wider transition-colors active:scale-95 animate-fade-in"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveProfile}
                                className="px-7 py-3 bg-[#6D5DFC] hover:bg-[#5b4edb] text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors shadow-lg shadow-[#6D5DFC]/10 active:scale-[0.98] animate-fade-in"
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
                        className="bg-white rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col" 
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="p-6 flex items-center justify-between border-b border-slate-100">
                            <div>
                                <h3 className="text-lg font-black text-slate-800 tracking-tight">Adjust Profile Photo</h3>
                                <p className="text-xs text-slate-400 font-semibold mt-1">Crop, rotate, and resize your photo</p>
                            </div>
                            <button onClick={() => setShowCropper(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                                <X size={20} className="text-slate-400" />
                            </button>
                        </div>

                        {/* Crop Area */}
                        <div className="relative h-[280px] bg-slate-100">
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
                        <div className="p-6 space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                {/* Zoom */}
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        <span>Zoom</span>
                                        <span className="text-[#6D5DFC]">{Math.round(zoom * 100)}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        value={zoom}
                                        min={1}
                                        max={3}
                                        step={0.1}
                                        aria-labelledby="Zoom Slider"
                                        onChange={(e) => setZoom(parseFloat(e.target.value))}
                                        className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#6D5DFC]"
                                    />
                                </div>

                                {/* Rotation */}
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        <span>Rotation</span>
                                        <span className="text-[#6D5DFC]">{rotation}°</span>
                                    </div>
                                    <input
                                        type="range"
                                        value={rotation}
                                        min={0}
                                        max={360}
                                        step={1}
                                        aria-labelledby="Rotation Slider"
                                        onChange={(e) => setRotation(parseInt(e.target.value))}
                                        className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#6D5DFC]"
                                    />
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-100">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mr-2">Aspect:</span>
                                    {[
                                        { label: 'Square', value: 1 / 1 },
                                        { label: 'Circle', value: 1 / 1 }
                                    ].map((opt, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setAspect(opt.value)}
                                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${
                                                aspect === opt.value 
                                                    ? 'bg-[#6D5DFC] border-[#6D5DFC] text-white shadow-sm'
                                                    : 'bg-white border-slate-200 text-slate-500 hover:text-slate-700'
                                            }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>

                                <div className="flex items-center gap-3 w-full sm:w-auto">
                                    <button
                                        onClick={() => setShowCropper(false)}
                                        className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-slate-500 hover:bg-slate-50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSaveCrop}
                                        disabled={uploadingCroppedImage}
                                        className="flex-1 sm:flex-none px-6 py-2.5 bg-[#6D5DFC] hover:bg-[#5b4edb] text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-[#6D5DFC]/10 transition-colors disabled:opacity-50"
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
