import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Cpu, Mail, Lock, User, ArrowLeft } from 'lucide-react';
import { AppRoute } from '../types';
import { logo } from '../constants';

const INDIAN_EXAMPLES = [
  { name: 'Aditi Sharma', email: 'aditi.sharma@gmail.com' },
  { name: 'Rahul Verma', email: 'rahul.verma@gmail.com' },
  { name: 'Amit Patel', email: 'amit.patel@gmail.com' },
  { name: 'Priya Singh', email: 'priya.singh@gmail.com' },
  { name: 'Vikram Malhotra', email: 'vikram.malhotra@gmail.com' }
];

const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isSignup = location.pathname === AppRoute.SIGNUP;

  const [placeholderExample] = useState(() => {
    return INDIAN_EXAMPLES[Math.floor(Math.random() * INDIAN_EXAMPLES.length)];
  });

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    navigate(AppRoute.DASHBOARD);
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden px-4">

      {/* Background */}
      <div className="absolute inset-0 bg-[#0f0c29]">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-[#24243e] to-[#0f0c29] opacity-80" />
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-violet-600/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-fuchsia-600/20 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-md">

        {/* Logo + Title */}
        <div className="mb-8 text-center">
          <div className="inline-block p-1 rounded-full bg-white/10 backdrop-blur-xl shadow-xl shadow-purple-900/40 mb-4 overflow-hidden border border-white/20">
            <img src={logo} alt="AI LEGAL™" className="w-10 h-10 object-contain" />
          </div>

          <h2 className="text-3xl font-bold text-white mb-2">
            {isSignup ? 'Create Account' : 'Welcome Back'}
          </h2>

          <p className="text-gray-400">
            {isSignup ? <>Join AI LEGAL™ to unlock full access</> : <>Sign in to continue to AI LEGAL™</>}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">

            {isSignup && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300 ml-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-3.5 w-5 h-5 text-gray-500" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={`e.g. ${placeholderExample.name}`}
                    className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                    required
                  />
                </div>
              </div>
            )}

            {/* Email */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300 ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-3.5 w-5 h-5 text-gray-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={`e.g. ${placeholderExample.email}`}
                  className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300 ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-3.5 w-5 h-5 text-gray-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                  required
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-xl font-bold text-white shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transform hover:scale-[1.02] transition-all duration-200"
            >
              {isSignup ? 'Sign Up' : 'Sign In'}
            </button>
          </form>

          {/* Switch link */}
          <div className="mt-8 text-center text-sm text-gray-400">
            {isSignup ? (
              <>
                Already have an account?{' '}
                <Link to={AppRoute.LOGIN} className="text-violet-400 hover:text-violet-300 font-medium">
                  Sign In
                </Link>
              </>
            ) : (
              <>
                Don't have an account?{' '}
                <Link to={AppRoute.SIGNUP} className="text-violet-400 hover:text-violet-300 font-medium">
                  Create Account
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Back Button */}
        <Link
          to={AppRoute.LANDING}
          className="mt-8 flex items-center justify-center gap-2 text-gray-500 hover:text-gray-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>

      </div>
    </div>
  );
};

export default Auth;