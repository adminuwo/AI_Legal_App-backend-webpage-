import React, { useState, useRef, useEffect } from 'react';
import { X, Sparkles, AlertCircle, CheckCircle, Loader2, ChevronDown, Check } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import PricingConfigModal from './PricingConfigModal';
import { API } from '../../types.js';

// Custom Dropdown Component
const CustomSelect = ({ label, name, value, options, onChange, placeholder = "Select option" }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (optionValue) => {
        onChange({ target: { name, value: optionValue } });
        setIsOpen(false);
    };

    const selectedLabel = options.find(opt => opt.value === value)?.label || value || placeholder;

    return (
        <div className="space-y-2" ref={containerRef}>
            <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                {label}
            </label>
            <div className="relative">
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className={`w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-left flex items-center justify-between transition-all ${isOpen ? 'ring-2 ring-blue-500 border-transparent bg-white' : 'hover:bg-white hover:border-gray-300'}`}
                >
                    <span className={`block truncate ${!value ? 'text-gray-400' : 'text-gray-900 font-medium'}`}>
                        {selectedLabel}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {isOpen && (
                    <div className="absolute z-10 w-full mt-2 bg-white border border-gray-100 rounded-xl shadow-2xl max-h-60 overflow-auto animate-in fade-in zoom-in-95 duration-100">
                        <div className="p-1 space-y-0.5">
                            {options.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => handleSelect(option.value)}
                                    className={`w-full flex items-center justify-between px-4 py-2.5 text-sm rounded-lg transition-colors ${value === option.value
                                        ? 'bg-blue-50 text-blue-700 font-bold'
                                        : 'text-gray-700 hover:bg-gray-50'
                                        }`}
                                >
                                    <span>{option.label}</span>
                                    {value === option.value && <Check className="w-4 h-4" />}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const NewAppModal = ({ isOpen, onClose, onAppCreated }) => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        agentName: '',
        description: '',
        url: '',
        category: 'Business OS',
        pricingModel: 'free'
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [error, setError] = useState(false);
    const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
    const [pricingConfig, setPricingConfig] = useState(null);

    const categories = [
        { value: 'Business OS', label: 'Business OS' },
        { value: 'Data & Intelligence', label: 'Data & Intelligence' },
        { value: 'Sales & Marketing', label: 'Sales & Marketing' },
        { value: 'HR & Finance', label: 'HR & Finance' },
        { value: 'Design & Creative', label: 'Design & Creative' },
        { value: 'Medical & Health AI', label: 'Medical & Health AI' }
    ];

    const pricingModels = [
        { value: 'free', label: 'Free' },
        { value: 'freemium', label: 'Freemium' },
        { value: 'paid', label: 'Paid Only' }
    ];

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        console.log("Submit button clicked! formData:", formData);
        setMessage('');
        setError(false);
        setLoading(true);

        try {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const token = localStorage.getItem('token');
            const storedUserId = localStorage.getItem('userId');

            // Robust ID retrieval: check user.id, user._id, or separate userId
            const userId = user.id || user._id || storedUserId;

            if (!userId) {
                throw new Error("User ID not found in localStorage. Please log out and log in again.");
            }

            const payload = {
                ...formData,
                vendorId: userId,
                status: 'Draft',
                health: 'All Good',
                pricingConfig: pricingConfig
            };

            const response = await axios.post(`${API}/agents`, payload, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            setError(false);
            setMessage('App created successfully!');

            // Call parent callback to refresh app list
            if (onAppCreated) {
                onAppCreated(response.data);
            }

            // Redirect to App Detail page immediately
            setTimeout(() => {
                onClose();
                navigate(`/vendor/apps/${response.data._id}`);
                // Reset form
                setFormData({
                    agentName: '',
                    description: '',
                    url: '',
                    category: 'Business OS',
                    pricingModel: 'free'
                });
                setMessage(null);
            }, 500);

        } catch (err) {
            console.error('App Creation Error:', err);
            setError(true);

            let errorMessage = 'Failed to create app. Please try again.';
            if (err.response) {
                // Server responded with a status code outside 2xx
                const detailedError = err.response.data?.details || '';
                const mainError = err.response.data?.error || errorMessage;
                errorMessage = detailedError ? `${mainError} (${detailedError})` : mainError;
            } else if (err.request) {
                // Request was made but no response received
                errorMessage = "Network Error: No response from server. Check if backend is running.";
            } else {
                // Error setting up the request
                errorMessage = err.message;
            }

            setMessage(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200 scrollbar-hide">

                {/* Header */}
                <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-20">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-50 rounded-lg">
                            <Sparkles className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-gray-900">Create New App</h2>
                            <p className="text-sm text-gray-500 mt-0.5">Add a new AI agent to your marketplace</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                {/* Body */}
                <div className="px-8 py-6">

                    {/* Success/Error Message */}
                    {message && (
                        <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${error
                            ? 'bg-red-50 border border-red-100 text-red-600'
                            : 'bg-green-50 border border-green-100 text-green-600'
                            }`}>
                            {error ? <AlertCircle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                            <span className="font-medium">{message}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">

                        {/* App Name */}
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                                App Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="agentName"
                                value={formData.agentName}
                                onChange={handleChange}
                                placeholder="e.g., AI Content Writer"
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                                required
                            />
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                                Description <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                placeholder="Describe what your AI agent does..."
                                rows={4}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none font-medium"
                                required
                            />
                        </div>

                        {/* App URL */}
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                                App Live URL
                            </label>
                            <input
                                type="url"
                                name="url"
                                value={formData.url}
                                onChange={handleChange}
                                placeholder="https://yourapp.com"
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                            />
                        </div>

                        {/* Category & Pricing Model */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                            {/* Category */}
                            <CustomSelect
                                label="Category"
                                name="category"
                                value={formData.category}
                                options={categories}
                                onChange={handleChange}
                                placeholder="Select Category"
                            />

                            {/* New Pricing Configuration Trigger */}
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                                    Pricing Model
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setIsPricingModalOpen(true)}
                                    className={`w-full relative overflow-hidden rounded-xl transition-all duration-300 group ${pricingConfig
                                        ? 'bg-white border-2 border-blue-600 shadow-md shadow-blue-100'
                                        : 'bg-blue-600 bg-gradient-to-br from-blue-600 to-indigo-600 border border-transparent shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-[1.02]'
                                        }`}
                                >
                                    {/* Decorative Background Elements for Unconfigured State */}
                                    {!pricingConfig && (
                                        <>
                                            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
                                            <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-20 h-20 bg-indigo-500/20 rounded-full blur-xl"></div>
                                        </>
                                    )}

                                    <div className="relative p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className={`p-2.5 rounded-lg ${pricingConfig ? 'bg-blue-100 text-blue-600' : 'bg-white/20 text-white backdrop-blur-sm'}`}>
                                                {pricingConfig ? <CheckCircle size={24} strokeWidth={2.5} /> : <Sparkles size={24} />}
                                            </div>
                                            <div className="text-left">
                                                <span className={`block text-base font-black tracking-tight ${pricingConfig ? 'text-gray-900' : 'text-white'}`}>
                                                    {pricingConfig ? 'Subscription Configured' : 'Set Subscription Pricing'}
                                                </span>
                                                <span className={`text-xs font-medium mt-0.5 block ${pricingConfig ? 'text-gray-500' : 'text-blue-100'}`}>
                                                    {pricingConfig
                                                        ? `${pricingConfig.selectedPlans.length} Plan(s) Active • ${pricingConfig.currency}`
                                                        : 'Monetize with monthly/yearly plans'
                                                    }
                                                </span>
                                            </div>
                                        </div>

                                        <div className={`p-1.5 rounded-lg transition-colors ${pricingConfig ? 'text-gray-400' : 'text-white/70 group-hover:text-white group-hover:bg-white/10'}`}>
                                            {pricingConfig ? <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md uppercase tracking-wider">Edit</span> : <ChevronDown size={20} className="-rotate-90 group-hover:translate-x-1 transition-transform" />}
                                        </div>
                                    </div>
                                </button>
                            </div>
                        </div>

                        {/* Info Note - Draft Status */}
                        <div className="bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-xl p-4 flex items-start space-x-3">
                            <AlertCircle className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <h4 className="text-sm font-bold text-gray-900 mb-0.5">Draft Status</h4>
                                <p className="text-xs text-gray-500 font-medium leading-relaxed">
                                    Your app will be created as a Draft and won't be visible on the marketplace until you publish it from the dashboard.
                                </p>
                            </div>
                        </div>

                        <PricingConfigModal
                            isOpen={isPricingModalOpen}
                            onClose={() => setIsPricingModalOpen(false)}
                            onSave={(data) => {
                                setPricingConfig(data);
                                setFormData({ ...formData, pricingModel: 'subscription' }); // Update formData to match backend expectations roughly
                            }}
                            initialData={pricingConfig}
                        />

                        {/* Action Buttons */}
                        <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-6 py-3 text-sm font-bold text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading || !formData.agentName || !formData.description}
                                className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all transform active:scale-95"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    'Create App'
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default NewAppModal;
