import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Target, Briefcase, User, ArrowRight, Brain } from 'lucide-react';
import axios from 'axios';
import { apis } from '../types';
import toast from 'react-hot-toast';

const OnboardingModal = ({ isOpen, onClose, onComplete }) => {
    const [step, setStep] = useState(1);
    const [form, setForm] = useState({
        name: '',
        businessType: '',
        goal: ''
    });

    const handleNext = () => {
        if (step < 3) setStep(step + 1);
        else handleSubmit();
    };

    const handleSubmit = async () => {
        try {
            const token = localStorage.getItem('token');
            await axios.put(`${apis.baseUrl}/memory`, {
                name: form.name,
                businessType: form.businessType,
                goals: [form.goal]
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("Identity synchronized!");
            onComplete();
            onClose();
        } catch (error) {
            toast.error("Failed to save profile");
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="bg-zinc-900 border border-white/10 w-full max-w-lg rounded-[32px] overflow-hidden shadow-2xl shadow-purple-500/10"
                    >
                        {/* Progress Bar */}
                        <div className="h-1.5 w-full bg-white/5">
                            <motion.div
                                className="h-full bg-gradient-to-r from-purple-500 to-blue-500"
                                initial={{ width: "33%" }}
                                animate={{ width: `${(step / 3) * 100}%` }}
                            />
                        </div>

                        <div className="p-8 md:p-10">
                            <div className="flex justify-center mb-8">
                                <div className="p-4 bg-purple-500/10 rounded-2xl border border-purple-500/20">
                                    <Brain className="w-10 h-10 text-purple-400" />
                                </div>
                            </div>

                            <AnimatePresence mode="wait">
                                {step === 1 && (
                                    <motion.div
                                        key="step1"
                                        initial={{ x: 20, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        exit={{ x: -20, opacity: 0 }}
                                        className="space-y-6 text-center"
                                    >
                                        <div>
                                            <h2 className="text-2xl font-black text-white mb-2">Initialize Your Neural Link</h2>
                                            <p className="text-white/50">How should AI LEGAL™ address you in our sessions?</p>
                                        </div>
                                        <div className="relative">
                                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-400" />
                                            <input
                                                autoFocus
                                                type="text"
                                                placeholder="Enter your name"
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white outline-none focus:border-purple-500/50 transition-all text-lg"
                                                value={form.name}
                                                onChange={e => setForm({ ...form, name: e.target.value })}
                                            />
                                        </div>
                                    </motion.div>
                                )}

                                {step === 2 && (
                                    <motion.div
                                        key="step2"
                                        initial={{ x: 20, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        exit={{ x: -20, opacity: 0 }}
                                        className="space-y-6 text-center"
                                    >
                                        <div>
                                            <h2 className="text-2xl font-black text-white mb-2">Define Your Domain</h2>
                                            <p className="text-white/50">What is your primary focus or profession?</p>
                                        </div>
                                        <div className="relative">
                                            <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-400" />
                                            <input
                                                autoFocus
                                                type="text"
                                                placeholder="e.g. Marketing Lead, Content Creator"
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white outline-none focus:border-purple-500/50 transition-all text-lg"
                                                value={form.businessType}
                                                onChange={e => setForm({ ...form, businessType: e.target.value })}
                                            />
                                        </div>
                                    </motion.div>
                                )}

                                {step === 3 && (
                                    <motion.div
                                        key="step3"
                                        initial={{ x: 20, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        exit={{ x: -20, opacity: 0 }}
                                        className="space-y-6 text-center"
                                    >
                                        <div>
                                            <h2 className="text-2xl font-black text-white mb-2">Set Your Core Objective</h2>
                                            <p className="text-white/50">What are you currently trying to achieve with AI?</p>
                                        </div>
                                        <div className="relative">
                                            <Target className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-400" />
                                            <input
                                                autoFocus
                                                type="text"
                                                placeholder="e.g. Scaling my business operations"
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white outline-none focus:border-purple-500/50 transition-all text-lg"
                                                value={form.goal}
                                                onChange={e => setForm({ ...form, goal: e.target.value })}
                                            />
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="flex gap-4 mt-12">
                                {step > 1 && (
                                    <button
                                        onClick={() => setStep(step - 1)}
                                        className="px-6 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-bold hover:bg-white/10 transition-all"
                                    >
                                        Back
                                    </button>
                                )}
                                <button
                                    onClick={handleNext}
                                    disabled={!form.name && step === 1 || !form.businessType && step === 2 || !form.goal && step === 3}
                                    className="flex-1 py-4 bg-white text-black rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-white/90 disabled:opacity-50 transition-all shadow-xl shadow-white/5"
                                >
                                    {step === 3 ? "Initialize AI LEGAL™" : "Next Phase"}
                                    <ArrowRight className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default OnboardingModal;
