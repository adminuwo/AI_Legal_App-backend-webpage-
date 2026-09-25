import fs from 'fs';
import path from 'path';

const filePath = 'd:/AI Legal/AI_Legal_App-backend-webpage-/AI-Legal_App_Webapp/src/pages/HomeDashboard.jsx';
let content = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');

// 1. Add import
if (!content.includes('AdvocateRegistrationModal')) {
  content = content.replace(
    "import NotificationCenter from '../Components/NotificationBar/NotificationCenter';",
    "import NotificationCenter from '../Components/NotificationBar/NotificationCenter';\nimport AdvocateRegistrationModal from '../Components/AdvocateRegistrationModal';"
  );
}

// 2. Add state and fetch logic
const oldStateBlock = `  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [advocateUnreadCount, setAdvocateUnreadCount] = useState(0);

  useEffect(() => {
    if (selectedRole === 'advocate') {
      consultationService.getAdvocateUnreadCount().then(res => {
        if (res && res.unreadCount != null) {
          setAdvocateUnreadCount(res.unreadCount);
        }
      }).catch(() => {});
    }
  }, [selectedRole]);`;

const newStateBlock = `  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [advocateUnreadCount, setAdvocateUnreadCount] = useState(0);
  const [advocateVerificationStatus, setAdvocateVerificationStatus] = useState('not_registered');
  const [advocateListingConsent, setAdvocateListingConsent] = useState('none');
  const [isAdvocateRegModalOpen, setIsAdvocateRegModalOpen] = useState(false);
  const [isVerificationLoading, setIsVerificationLoading] = useState(false);

  const fetchAdvocateVerification = async () => {
    if (selectedRole !== 'advocate') return;
    try {
      setIsVerificationLoading(true);
      const res = await consultationService.getAdvocateStatus();
      if (res && res.success) {
        setAdvocateVerificationStatus(res.verificationStatus || 'not_registered');
        setAdvocateListingConsent(res.listingConsent || 'none');
      }
    } catch (err) {
      console.warn('[HomeDashboard] Failed to fetch advocate verification:', err);
    } finally {
      setIsVerificationLoading(false);
    }
  };

  useEffect(() => {
    if (selectedRole === 'advocate') {
      fetchAdvocateVerification();
      consultationService.getAdvocateUnreadCount().then(res => {
        if (res && res.unreadCount != null) {
          setAdvocateUnreadCount(res.unreadCount);
        }
      }).catch(() => {});
    }
  }, [selectedRole]);`;

if (content.includes(oldStateBlock)) {
  content = content.replace(oldStateBlock, newStateBlock);
}

// 3. Add Advocate Verification Card after Quick Actions
const oldQuickActions = `                  <button 
                    onClick={() => navigate('/dashboard/guide')}
                    className="p-3.5 sm:p-4 border border-slate-200/80 dark:border-slate-800 rounded-xl bg-white dark:bg-[#1E293B] hover:border-[#B88B2A] hover:shadow-xs transition-all flex items-center gap-3 group cursor-pointer text-left"
                  >
                    <div className="w-9 h-9 rounded-lg bg-[#B88B2A]/10 text-[#B88B2A] border border-[#B88B2A]/25 flex items-center justify-center font-black text-base group-hover:scale-105 transition-transform shrink-0">
                      ✨
                    </div>
                    <div>
                      <h4 className="font-extrabold text-xs sm:text-sm text-[#111111] dark:text-white group-hover:text-[#B88B2A] transition-colors">Product Guide</h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">Interactive AI feature walkthrough</p>
                    </div>
                  </button>
                </div>
              </div>`;

const newQuickActionsWithCard = `                  <button 
                    onClick={() => navigate('/dashboard/guide')}
                    className="p-3.5 sm:p-4 border border-slate-200/80 dark:border-slate-800 rounded-xl bg-white dark:bg-[#1E293B] hover:border-[#B88B2A] hover:shadow-xs transition-all flex items-center gap-3 group cursor-pointer text-left"
                  >
                    <div className="w-9 h-9 rounded-lg bg-[#B88B2A]/10 text-[#B88B2A] border border-[#B88B2A]/25 flex items-center justify-center font-black text-base group-hover:scale-105 transition-transform shrink-0">
                      ✨
                    </div>
                    <div>
                      <h4 className="font-extrabold text-xs sm:text-sm text-[#111111] dark:text-white group-hover:text-[#B88B2A] transition-colors">Product Guide</h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">Interactive AI feature walkthrough</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* 3.1 ADVOCATE VERIFICATION STATUS / REGISTRATION CTA */}
              {selectedRole === 'advocate' && (
                <div className="mt-1">
                  {advocateVerificationStatus === 'verified' ? (
                    <div 
                      onClick={() => navigate('/dashboard/advocates')}
                      className="p-4 sm:p-5 rounded-2xl border-1.5 border-[#10B981] bg-[#F0FDF4] dark:bg-[#141E15] flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-11 h-11 rounded-full bg-[#DCFCE7] dark:bg-[#19331E] border border-[#10B981] flex items-center justify-center text-[#10B981] shrink-0 group-hover:scale-105 transition-transform shadow-2xs">
                          <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-sm sm:text-[15px] text-slate-900 dark:text-white flex items-center gap-1">
                              <span>✓</span> Verified Advocate
                            </span>
                            <span className="bg-[#10B98125] text-[#10B981] text-[10px] font-extrabold px-2 py-0.5 rounded-md tracking-wider">
                              LISTED
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mt-0.5 leading-snug">
                            Your profile is visible to users seeking legal consultation in the Advocates directory.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 self-end sm:self-center shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate('/dashboard/consultations');
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm shadow-emerald-600/20 cursor-pointer"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Client Consultations</span>
                          {advocateUnreadCount > 0 && (
                            <span className="ml-1 px-1.5 py-0.2 bg-white text-emerald-700 rounded-full text-[10px] font-black">
                              {advocateUnreadCount}
                            </span>
                          )}
                        </button>
                        <ChevronRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  ) : (advocateVerificationStatus === 'pending' && advocateListingConsent === 'accepted') ? (
                    <div className="p-4 sm:p-5 rounded-2xl border-1.5 border-[#F59E0B] bg-[#FFFBEB] dark:bg-[#261F14] flex items-center justify-between gap-3.5 shadow-xs">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-11 h-11 rounded-full bg-[#FEF3C7] dark:bg-[#3D2F16] border border-[#F59E0B] flex items-center justify-center text-[#F59E0B] shrink-0 shadow-2xs">
                          <Clock className="w-6 h-6 stroke-[2.2]" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-sm sm:text-[15px] text-slate-900 dark:text-white">
                              Verification Pending
                            </span>
                            <span className="bg-[#F59E0B25] text-[#D97706] dark:text-[#FBBF24] text-[10px] font-extrabold px-2 py-0.5 rounded-md tracking-wider">
                              IN REVIEW
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mt-0.5 leading-snug">
                            Your verification is under review. Once approved, your profile will become visible to users looking for verified advocates.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : advocateVerificationStatus === 'rejected' ? (
                    <div className="p-4 sm:p-5 rounded-2xl border-1.5 border-[#EF4444] bg-[#FEF2F2] dark:bg-[#261414] flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 shadow-xs">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-11 h-11 rounded-full bg-red-100 dark:bg-red-950/60 border border-[#EF4444] flex items-center justify-center text-[#EF4444] shrink-0 shadow-2xs">
                          <AlertTriangle className="w-6 h-6 stroke-[2.2]" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-sm sm:text-[15px] text-slate-900 dark:text-white">
                              Verification Needs Attention
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mt-0.5 leading-snug">
                            Please review and resubmit the required professional information and credentials.
                          </p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setIsAdvocateRegModalOpen(true)}
                        className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors shrink-0 self-start sm:self-center cursor-pointer shadow-xs"
                      >
                        Re-submit Details
                      </button>
                    </div>
                  ) : (
                    /* Default: not_registered -> Register as a Verified Advocate CTA */
                    <div className="p-4 sm:p-5 rounded-2xl border-1.5 border-[#C8A34D] bg-[#FFFDF5] dark:bg-[#1A1824] flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 shadow-xs hover:border-[#B88B2A] transition-all">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-11 h-11 rounded-full bg-[#FEF3C7] dark:bg-[#2C220E] border border-[#C8A34D] flex items-center justify-center text-[#C8A34D] shrink-0 shadow-2xs">
                          <ShieldCheck className="w-6 h-6 stroke-[2.2]" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-extrabold text-sm sm:text-[15px] text-slate-900 dark:text-white">
                            Register as a Verified Advocate
                          </h3>
                          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mt-0.5 leading-snug">
                            Get verified and become discoverable to users looking for legal consultation in the Advocates directory.
                          </p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setIsAdvocateRegModalOpen(true)}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#B88B2A] to-[#B38628] hover:opacity-95 text-white text-xs font-extrabold transition-all shadow-md shadow-[#B88B2A]/20 shrink-0 self-start sm:self-center cursor-pointer flex items-center gap-1.5"
                      >
                        <span>Register Now</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              )}`;

if (content.includes(oldQuickActions)) {
  content = content.replace(oldQuickActions, newQuickActionsWithCard);
}

// 4. Add modal dialog before closing tag
const oldModalClose = `        </>
      )}

    </div>`;

const newModalClose = `          {/* H. MODAL Dialog: Advocate Registration */}
          <AdvocateRegistrationModal 
            isOpen={isAdvocateRegModalOpen}
            onClose={() => setIsAdvocateRegModalOpen(false)}
            onSuccess={fetchAdvocateVerification}
          />
        </>
      )}

    </div>`;

if (content.includes(oldModalClose)) {
  content = content.replace(oldModalClose, newModalClose);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated HomeDashboard.jsx!');
