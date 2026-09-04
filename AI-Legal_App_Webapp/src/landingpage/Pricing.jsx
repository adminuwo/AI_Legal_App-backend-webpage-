import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPlans, getCreditPackages, purchasePlan, buyCredits, createSubscriptionOrder, getSubscriptionDetails } from '../services/pricingService';
import './Pricing.css';
import { Check, X, ShieldAlert, Sparkles, Zap, Image as ImageIcon, Video, Search, Users, ChevronRight, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { useRecoilState } from 'recoil';
import { userData, updateUser } from '../userStore/userData';
import { useLanguage } from '../context/LanguageContext';
import GooglePayButton from '../Components/GooglePayButton';
import ApplePayButton from '../Components/ApplePayButton';

const Pricing = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [packages, setPackages] = useState([]);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [loading, setLoading] = useState(true);
  const [showUpsell, setShowUpsell] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [currentPlanName, setCurrentPlanName] = useState('');
  const [userState, setUserState] = useRecoilState(userData);
  const [activeCard, setActiveCard] = useState(0);
  const gridRef = useRef(null);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth <= 1024);
  const [isTabletCarousel, setIsTabletCarousel] = useState(typeof window !== 'undefined' && window.innerWidth > 768 && window.innerWidth <= 1024);

  useEffect(() => {
    fetchPricingData();
    fetchCurrentPlan();

    const handleResize = () => {
      setIsMobile(window.innerWidth <= 1024);
      setIsTabletCarousel(window.innerWidth > 768 && window.innerWidth <= 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ── Tablet: track active card via scroll position ──
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid || !isTabletCarousel) return;
    const handleScroll = () => {
      const cardWidth = grid.clientWidth * 0.42;
      const idx = Math.round(grid.scrollLeft / (cardWidth + 12));
      setActiveCard(Math.max(0, Math.min(idx, plans.length - 1)));
    };
    grid.addEventListener('scroll', handleScroll, { passive: true });
    return () => grid.removeEventListener('scroll', handleScroll);
  }, [plans.length, isTabletCarousel]);

  const scrollToCard = (idx) => {
    const grid = gridRef.current;
    if (!grid) return;
    const cardWidth = grid.clientWidth * 0.42;
    grid.scrollTo({ left: idx * (cardWidth + 12), behavior: 'smooth' });
  };

  const fetchCurrentPlan = async () => {
    const user = localStorage.getItem('token') || localStorage.getItem('auth_token');
    if (!user) {
      setCurrentPlanName('');
      return;
    }
    try {
      const data = await getSubscriptionDetails();
      if (data?.founderStatus) {
        setCurrentPlanName('founder');
      } else if (data?.subscription?.planId?.planName) {
        setCurrentPlanName(data.subscription.planId.planName.toLowerCase());
      } else {
        setCurrentPlanName('free');
      }
    } catch (e) {
      setCurrentPlanName('free');
    }
  };

  const fetchPricingData = async () => {
    try {
      setLoading(true);
      const [plansData, packagesData] = await Promise.all([
        getPlans(),
        getCreditPackages()
      ]);
      setPlans(plansData.plans || []);
      setPackages(packagesData.packages || []);
    } catch (error) {
      toast.error(t('failedToLoadPricingInfo') || 'Failed to load pricing information');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = () => {
    setBillingCycle(prev => prev === 'monthly' ? 'yearly' : 'monthly');
  };

  const calculateEstimations = (credits, isFree = false) => {
    if (isFree) {
      // Free tier: only chat is available
      return [
        { text: `≈ ${credits} ${t('chatEstimation')}`, icon: <Zap size={14} /> },
        { text: `${t('paidPlansOnly')}`, icon: <ImageIcon size={14} />, locked: true },
        { text: `${t('paidPlansOnly')}`, icon: <Video size={14} />, locked: true }
      ];
    }
    return [
      { text: `≈ ${credits} ${t('chatEstimation')}`, icon: <Zap size={14} /> },
      { text: `≈ ${Math.floor(credits / 45)} ${t('imagesEstimation')}`, icon: <ImageIcon size={14} /> },
      { text: `≈ ${Math.floor(credits / 225)} ${t('secVideoEstimation')}`, icon: <Video size={14} /> }
    ];
  };

  const handleUpgrade = async (plan) => {
    const user = localStorage.getItem('token') || localStorage.getItem('auth_token');
    if (!user) {
      toast.error(t('pleaseLoginToUpgrade') || 'Please login to upgrade your plan');
      navigate('/login');
      return;
    }
    try {
      setProcessing(true);
      const orderRes = await createSubscriptionOrder({ planId: plan._id, billingCycle });
      if (orderRes.isFree) {
        const res = await purchasePlan(plan._id, billingCycle);
        toast.success(`Successfully upgraded to ${plan.planName}!`);
        const updatedUser = updateUser({
          credits: res.credits,
          founderStatus: plan.planName.toLowerCase() === 'founder plan' ? true : userState.user.founderStatus
        });
        setUserState({ user: updatedUser });
        setProcessing(false);
        return;
      }

      const options = {
        key: orderRes.key,
        amount: orderRes.order.amount,
        currency: "INR",
        name: "AI LEGAL™",
        description: `Upgrade to ${plan.planName}`,
        order_id: orderRes.order.id,
        handler: async function (response) {
          try {
            const res = await purchasePlan(plan._id, billingCycle);
            toast.success(`Successfully upgraded to ${plan.planName}!`);
            const updatedUser = updateUser({
              credits: res.credits,
              founderStatus: plan.planName.toLowerCase() === 'founder plan' ? true : userState.user.founderStatus
            });
            setUserState({ user: updatedUser });
          } catch (e) {
            toast.error('Failed to complete upgrade after payment.');
          }
        },
        prefill: {
          name: userState?.user?.name || "User",
          email: userState?.user?.email || ""
        },
        theme: { color: "var(--color-primary)" }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response) {
        toast.error('Payment failed: ' + response.error.description);
      });
      rzp.open();

    } catch (err) {
      toast.error(err.response?.data?.message || 'Upgrade failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleBuyCredits = async (pkg) => {
    const user = localStorage.getItem('token') || localStorage.getItem('auth_token');
    if (!user) {
      toast.error(t('pleaseLoginToPurchaseCredits') || 'Please login to purchase credits');
      navigate('/login');
      return;
    }
    try {
      setProcessing(true);
      const orderRes = await createSubscriptionOrder({ packageId: pkg._id });

      if (orderRes.isFree) {
        const res = await buyCredits(pkg._id);
        toast.success(`Purchased ${pkg.credits} credits!`);
        const updatedUser = updateUser({ credits: res.credits });
        setUserState({ user: updatedUser });
        setShowUpsell(false);
        setProcessing(false);
        return;
      }

      const options = {
        key: orderRes.key,
        amount: orderRes.order.amount,
        currency: "INR",
        name: "AI LEGAL™",
        description: `Buy ${pkg.credits} Credits`,
        order_id: orderRes.order.id,
        handler: async function (response) {
          try {
            const res = await buyCredits(pkg._id);
            toast.success(`Purchased ${pkg.credits} credits!`);
            const updatedUser = updateUser({ credits: res.credits });
            setUserState({ user: updatedUser });
            setShowUpsell(false);
          } catch (e) {
            toast.error('Failed to complete purchase after payment.');
          }
        },
        prefill: {
          name: userState?.user?.name || "User",
          email: userState?.user?.email || ""
        },
        theme: { color: "var(--color-primary)" }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response) {
        toast.error('Payment failed: ' + response.error.description);
      });
      rzp.open();

    } catch (err) {
      toast.error('Purchase failed.');
    } finally {
      setProcessing(false);
    }
  };

  const renderComparisonTable = () => {
    if (!plans.length) return null;

    const comparisonData = [
      {
        feature: 'AI LEGAL™ Chat',
        free: <span className="flex items-center justify-center"><Check size={20} className="check-icon" /></span>,
        creator: <span className="feature-badge">✓ {t('priority')}</span>,
        startuppro: <span className="feature-badge">✓ {t('priority')}</span>,
        agency: <span className="feature-badge">✓ {t('priority')}</span>,
        enterprise: <span className="feature-badge">✓ {t('priority')}</span>,
      },
      {
        feature: 'AI LEGAL™-Powered Legal Research',
        free: <span className="flex items-center justify-center"><X size={20} className="cross-icon" /></span>,
        creator: <span className="flex items-center justify-center"><Check size={20} className="check-icon" /></span>,
        startuppro: <span className="feature-badge">✓ {t('ultraHD')}</span>,
        agency: <span className="feature-badge">✓ {t('ultraHD')}</span>,
        enterprise: <span className="feature-badge">✓ {t('ultraHD')}</span>,
      },
      {
        feature: 'AI LEGAL™ Edit Image',
        free: <span className="flex items-center justify-center"><X size={20} className="cross-icon" /></span>,
        creator: <span className="flex items-center justify-center"><Check size={20} className="check-icon" /></span>,
        startuppro: <span className="flex items-center justify-center"><Check size={20} className="check-icon" /></span>,
        agency: <span className="flex items-center justify-center"><Check size={20} className="check-icon" /></span>,
        enterprise: <span className="flex items-center justify-center"><Check size={20} className="check-icon" /></span>,
      },
      {
        feature: 'AI LEGAL™ Generate Video',
        free: <span className="flex items-center justify-center"><X size={20} className="cross-icon" /></span>,
        creator: <span className="feature-badge">✓ 1080p</span>,
        startuppro: <span className="feature-badge">✓ {t('fourKUltra')}</span>,
        agency: <span className="feature-badge">✓ {t('fourKUltra')}</span>,
        enterprise: <span className="feature-badge">✓ {t('fourKUltra')}</span>,
      },
      {
        feature: 'AI LEGAL™ Image -> Case Prediction Card',
        free: <span className="flex items-center justify-center"><X size={20} className="cross-icon" /></span>,
        creator: <span className="flex items-center justify-center"><X size={20} className="cross-icon" /></span>,
        startuppro: <span className="flex items-center justify-center"><Check size={20} className="check-icon" /></span>,
        agency: <span className="flex items-center justify-center"><Check size={20} className="check-icon" /></span>,
        enterprise: <span className="flex items-center justify-center"><Check size={20} className="check-icon" /></span>,
      },
      {
        feature: 'AI LEGAL™ Web Search',
        free: <span className="flex items-center justify-center"><X size={20} className="cross-icon" /></span>,
        creator: <span className="flex items-center justify-center"><Check size={20} className="check-icon" /></span>,
        startuppro: <span className="flex items-center justify-center"><Check size={20} className="check-icon" /></span>,
        agency: <span className="flex items-center justify-center"><Check size={20} className="check-icon" /></span>,
        enterprise: <span className="flex items-center justify-center"><Check size={20} className="check-icon" /></span>,
      },
      {
        feature: 'AI LEGAL™ Precedents Search & Citations',
        free: <span className="flex items-center justify-center"><X size={20} className="cross-icon" /></span>,
        creator: <span className="flex items-center justify-center"><Check size={20} className="check-icon" /></span>,
        startuppro: <span className="flex items-center justify-center"><Check size={20} className="check-icon" /></span>,
        agency: <span className="flex items-center justify-center"><Check size={20} className="check-icon" /></span>,
        enterprise: <span className="flex items-center justify-center"><Check size={20} className="check-icon" /></span>,
      },
      {
        feature: 'AI LEGAL™ Draft Maker',
        free: <span className="flex items-center justify-center"><X size={20} className="cross-icon" /></span>,
        creator: <span className="flex items-center justify-center"><Check size={20} className="check-icon" /></span>,
        startuppro: <span className="flex items-center justify-center"><Check size={20} className="check-icon" /></span>,
        agency: <span className="flex items-center justify-center"><Check size={20} className="check-icon" /></span>,
        enterprise: <span className="flex items-center justify-center"><Check size={20} className="check-icon" /></span>,
      },
      {
        feature: 'AI LEGAL™ Convert to Audio',
        free: <span className="flex items-center justify-center"><X size={20} className="cross-icon" /></span>,
        creator: <span className="flex items-center justify-center"><Check size={20} className="check-icon" /></span>,
        startuppro: <span className="flex items-center justify-center"><Check size={20} className="check-icon" /></span>,
        agency: <span className="flex items-center justify-center"><Check size={20} className="check-icon" /></span>,
        enterprise: <span className="flex items-center justify-center"><Check size={20} className="check-icon" /></span>,
      },
      {
        feature: 'AI LEGAL™ Convert Documents',
        free: <span className="flex items-center justify-center"><X size={20} className="cross-icon" /></span>,
        creator: <span className="feature-badge">{t('advanced')}</span>,
        startuppro: <span className="feature-badge">{t('advanced')}</span>,
        agency: <span className="feature-badge" style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}>{t('expert')}</span>,
        enterprise: <span className="feature-badge" style={{ background: 'linear-gradient(135deg,#2563eb,#1d4ed8)' }}>{t('pro')} + {t('team')}</span>,
      }
    ];

    const getPlanKey = (planName) => {
      const name = planName.toLowerCase();
      if (name.includes('free')) return 'free';
      if (name.includes('starter') || name.includes('creator')) return 'creator';
      if (name.includes('founder') || name.includes('startup pro') || name.includes('startup')) return 'startuppro';
      if (name.includes('pro') || name.includes('agency')) return 'agency';
      if (name.includes('business') || name.includes('enterprise')) return 'enterprise';
      return 'free'; // fallback
    };

    return (
      <div className="comparison-section">
        <h2>Compare Plans Details</h2>
        <div className="comparison-table-wrapper">
          <table className="comparison-table">
            <thead>
              <tr>
                <th>{t('feature')}</th>
                {plans.map(p => (
                  <th key={p._id}>{getDisplayPlanName(p.planName).toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {comparisonData.map((row, idx) => (
                <tr key={idx}>
                  <td className="font-bold flex items-center gap-2">
                    <span className="aisa-badge-small">AI LEGAL™</span>
                    {row.feature.replace('AI LEGAL™ ', '')}
                  </td>
                  {plans.map(plan => (
                    <td key={`${plan._id}-${row.feature}`}>
                      {row[getPlanKey(plan.planName)]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="comparison-swipe-hint">
          ← Swipe to explore plans details →
        </div>
      </div>
    );
  };

  if (loading) {
    return <div className="flex h-screen items-center justify-center text-white">Loading incredible pricing...</div>;
  }

  // Map old DB plan names to new display names
  const PLAN_NAME_MAP = {
    'starter plan': 'Creator',
    'starter': 'Creator',
    'founder plan': 'Startup Pro',
    'founder': 'Startup Pro',
    'pro': 'Agency',
    'pro plan': 'Agency',
    'business': 'Enterprise',
    'business plan': 'Enterprise',
  };

  const getDisplayPlanName = (planName) => {
    return PLAN_NAME_MAP[planName.toLowerCase()] || planName;
  };

  // Detect the "Startup Pro" (formerly Founder) plan
  const isStartupProPlan = (plan) => {
    const name = plan.planName.toLowerCase();
    return name.includes('founder') || name.includes('startup pro') || name.includes('startup');
  };

  return (
    <div className="pricing-page">
      <button onClick={() => navigate(-1)} className="back-button">
        <ArrowLeft size={18} />
        <span>{t('back')}</span>
      </button>

      <div className="pricing-header">
        <h1>{t('unlockAIPotential')}</h1>
        <p>{t('choosePerfectPlan')}</p>

        <div className="billing-toggle">
          <span className={`billing-label ${billingCycle === 'monthly' ? 'active' : ''}`}>{t('monthly')}</span>
          <div className={`toggle-switch ${billingCycle}`} onClick={handleToggle}></div>
          <span className={`billing-label ${billingCycle === 'yearly' ? 'active' : ''}`}>{t('yearly')}</span>
          {billingCycle === 'yearly' && <span className="save-badge">{t('saveBadge')}</span>}
        </div>
      </div>

      {/* ── Mobile swipe hint ── */}
      {isTabletCarousel && (
        <div className="pricing-swipe-hint" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5l7 7-7 7"/></svg>
          <span>Swipe to explore plans</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5l7 7-7 7"/></svg>
        </div>
      )}

      <div className="pricing-grid" ref={gridRef}>
        {plans.map((plan) => {
          const isFounder = plan.planName.toLowerCase().includes('startup pro') || plan.planName.toLowerCase().includes('startup');
          const isFree = plan.priceMonthly === 0 && plan.priceYearly === 0;
          const isCurrentPlan = (() => {
            if (!currentPlanName) return false;
            const pn = plan.planName.toLowerCase();
            if (currentPlanName === 'startup pro' || currentPlanName === 'startup') return pn.includes('startup');
            if (currentPlanName === 'free' || currentPlanName === 'free tier') return isFree;
            return pn.includes(currentPlanName) || currentPlanName.includes(pn.split(' ')[0]);
          })();


          // Fetch ALL values directly from the Database (no frontend math)
          const displayPrice = billingCycle === 'yearly' ? (plan.priceYearlyPerMonth || plan.priceMonthly) : plan.priceMonthly;
          const displayCredits = billingCycle === 'yearly' ? (plan.creditsYearly || plan.credits) : plan.credits;
          const totalYearlyAmount = plan.priceYearly || 0;
          const displayValidity = billingCycle === 'yearly' ? (plan.validityYearly || 12) + ' Months' : (plan.validityMonthly || 1) + ' Month';

          return (
            <div key={plan._id} className={`pricing-card ${plan.isPopular ? 'popular' : ''} ${isFree ? 'free-tier-card' : ''} ${isCurrentPlan ? 'current-plan-card' : ''}`}>
              {isCurrentPlan && (
                <div className="current-plan-badge">
                  ✓ {t('currentPlan')}
                </div>
              )}
              {!isCurrentPlan && plan.badge && (
                <div className={`popular-badge ${isFounder ? 'launch-badge' : ''}`}>
                  {plan.badge}
                </div>
              )}
              {isFree && (
                <div className="free-tier-badge">💬 {t('chatOnly')}</div>
              )}

              <h3 className="plan-name">{getDisplayPlanName(plan.planName)}</h3>

              <div className="plan-price">
                {billingCycle === 'yearly' && !isFree && (
                  <div className="original-price-container">
                    <span className="original-price">₹{plan.priceMonthly}</span>
                    <span className="discount-tag">30% OFF</span>
                  </div>
                )}
                <div className="current-price">
                  <span className="currency">₹</span>
                  {displayPrice}
                  <span className="billing-period">
                    {billingCycle === 'yearly' ? (isFounder ? '/mo (lifetime)' : '/mo') : (isFounder ? '/mo (lifetime)' : '/mo')}
                  </span>
                </div>
                
                {!isFree && (
                  <div className="validity-badge">
                    <ShieldAlert size={12} /> {t('validityLabel')} {displayValidity}
                  </div>
                )}
                
                {billingCycle === 'yearly' && !isFree && (
                  <div className="billed-yearly-label">
                    {t('billedYearlyLabel')} ₹{totalYearlyAmount}{t('billedYearlySuffix')}
                  </div>
                )}
              </div>

              <div className="plan-credits">
                <Sparkles size={18} />
                {(() => {
                  const pn = plan.planName.toLowerCase();
                  if (pn.includes('founder') || pn.includes('startup pro') || pn.includes('startup')) {
                    return <span>3000 {t('credits')} <span style={{ color: 'var(--color-primary)', fontWeight: 900 }}>+ AI Action</span></span>;
                  }
                  if (pn.includes('starter') || pn.includes('creator')) {
                    return <span>3000 {t('credits')}</span>;
                  }
                  if (pn.includes('pro') || pn.includes('agency')) {
                    return <span>Creator <span style={{ color: 'var(--color-primary)', fontWeight: 900 }}>Workflow Pack</span></span>;
                  }
                  if (pn.includes('business') || pn.includes('enterprise')) {
                    return <span>Business <span style={{ color: 'var(--color-primary)', fontWeight: 900 }}>Automation Access</span></span>;
                  }
                  return <span>{displayCredits} {t('credits')}</span>;
                })()}
              </div>

              <div className="credit-details">
                {calculateEstimations(displayCredits, isFree).map((est, i) => (
                  <p key={i} className={est.locked ? 'locked-estimation' : ''}>
                    <span style={{ opacity: est.locked ? 0.4 : 1 }}>{est.icon}</span>
                    <span style={{ opacity: est.locked ? 0.4 : 1 }}>{est.text}</span>
                    {est.locked && <span className="lock-icon">🔒</span>}
                  </p>
                ))}
              </div>

              <ul className="feature-list">
                {plan.features.map((feature, i) => (
                  <li key={i}>
                    <Check size={16} />
                    <span className="flex items-center gap-1.5">
                      <span className="aisa-badge-small" style={{ fontSize: '0.6rem', padding: '1px 4px', minWidth: '30px' }}>AI LEGAL™</span>
                      {feature.replace(/^AISA\s+/i, '')}
                    </span>
                  </li>
                ))}
              </ul>


              {isCurrentPlan ? (
                <button className="cta-button current-plan-btn" disabled>
                  ✓ {t('currentPlan')}
                </button>
              ) : (
                <div className="payment-buttons-stack">
                  {/* ── Razorpay Button ── */}
                  <button
                    className="cta-button"
                    onClick={() => handleUpgrade(plan)}
                    disabled={processing}
                  >
                    {displayPrice === 0
                      ? t('startForFree')
                      : (billingCycle === 'yearly')
                        ? `${t('upgradeFor')} ₹${totalYearlyAmount}${t('billedYearlySuffix')}`
                        : t('upgradeTo') + getDisplayPlanName(plan.planName)}
                  </button>

                  {/* ── Wallet Pay Buttons (Google Pay / Apple Pay) ── */}
                  {!isFree && (() => {
                    const isIOSDevice = /iPhone|iPad|iPod/.test(navigator.userAgent);
                    return (
                      <>
                        <div className="payment-divider">
                          <span>or pay with</span>
                        </div>

                        {/* Google Pay — shown on Android & Desktop (not iOS) */}
                        {!isIOSDevice && (
                          <GooglePayButton
                            planId={plan._id}
                            billingCycle={billingCycle}
                            amount={billingCycle === 'yearly' ? totalYearlyAmount : displayPrice}
                            currency="INR"
                            onSuccess={(data) => {
                              if (data.isTest) {
                                toast.success(data.message || "Test Payment Successful – No credits or subscription have been applied because the system is running in test mode.");
                                return;
                              }
                              toast.success(`✅ Google Pay successful! ${getDisplayPlanName(plan.planName)} activated.`);
                              if (data.credits !== undefined) {
                                const updatedUser = updateUser({
                                  credits: data.credits,
                                  founderStatus: isStartupProPlan(plan) ? true : userState.user?.founderStatus
                                });
                                setUserState({ user: updatedUser });
                              }
                            }}
                            onError={(err) => {
                              toast.error(err.message || 'Google Pay failed. Please try Razorpay.');
                            }}
                            disabled={processing}
                          />
                        )}

                        {/* Apple Pay — shown on iOS/macOS devices */}
                        {isIOSDevice && (
                          <ApplePayButton
                            planId={plan._id}
                            billingCycle={billingCycle}
                            amount={billingCycle === 'yearly' ? totalYearlyAmount : displayPrice}
                            currency="INR"
                            onSuccess={(data) => {
                              if (data.isTest) {
                                toast.success(data.message || "Test Payment Successful – No credits or subscription have been applied because the system is running in test mode.");
                                return;
                              }
                              toast.success(`✅ Apple Pay successful! ${getDisplayPlanName(plan.planName)} activated.`);
                              if (data.credits !== undefined) {
                                const updatedUser = updateUser({
                                  credits: data.credits,
                                  founderStatus: isStartupProPlan(plan) ? true : userState.user?.founderStatus
                                });
                                setUserState({ user: updatedUser });
                              }
                            }}
                            onError={(err) => {
                              toast.error(err.message || 'Apple Pay failed.');
                            }}
                            disabled={processing}
                          />
                        )}
                      </>
                    );
                  })()}

                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Mobile dot indicators ── */}
      {plans.length > 0 && isTabletCarousel && (
        <div className="pricing-dots" role="tablist" aria-label="Plan selector">
          {plans.map((_, i) => (
            <button
              key={i}
              className={`pricing-dot${activeCard === i ? ' active' : ''}`}
              onClick={() => scrollToCard(i)}
              role="tab"
              aria-selected={activeCard === i}
              aria-label={`Plan ${i + 1}`}
            />
          ))}
        </div>
      )}

      {renderComparisonTable()}

      <div className="text-center mt-24 mb-10 px-4">
        <button
          onClick={() => setShowUpsell(true)}
          className="bg-primary/10 hover:bg-primary text-primary hover:text-white border border-primary/30 px-6 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all shadow-lg hover:shadow-primary/20 flex items-center gap-2 mx-auto"
        >
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
          Developer Utility: Test Upsell Popup
        </button>
      </div>

      {showUpsell && (
        <div className="credit-modal-overlay">
          <div className="credit-modal">
            <div className="modal-header">
              <h3 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary-dark bg-clip-text text-transparent">{t('instantCreditBoost')}</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{t('extraCreditsRoll')}</p>
            </div>

            <div className="package-list">
              {packages.map((pkg) => (
                <div key={pkg._id} className="package-item group" onClick={() => handleBuyCredits(pkg)}>
                  <div className="flex flex-col">
                    <span className="package-credits text-lg font-bold group-hover:text-primary transition-colors">+{pkg.credits} Credits</span>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">One-time purchase</span>
                  </div>
                  <div className="bg-primary text-white px-4 py-2 rounded-xl font-bold text-sm shadow-sm group-hover:bg-primary-dark group-hover:scale-105 transition-all">
                    ₹{pkg.price}
                  </div>
                </div>
              ))}
            </div>

            <button className="close-modal" onClick={() => setShowUpsell(false)}>
              {t('maybeLater')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Pricing;
