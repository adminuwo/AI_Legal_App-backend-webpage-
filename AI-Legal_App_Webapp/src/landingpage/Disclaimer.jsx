import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Scale, Shield, AlertTriangle, CheckCircle2, FileText, ArrowLeft,
  BookOpen, AlertOctagon, UserCheck, Info, ExternalLink, HelpCircle
} from 'lucide-react';
import { apiService } from '../services/apiService';
import { name, logo } from '../constants';
import PublicFooter from '../Components/PublicFooter';

export default function Disclaimer() {
  const navigate = useNavigate();
  const [lastUpdated, setLastUpdated] = useState('March 7, 2026');
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);

  const getDynamicIcon = (index) => {
    const icons = [Scale, AlertTriangle, BookOpen, AlertOctagon, UserCheck, Shield, FileText];
    return icons[index % icons.length] || FileText;
  };

  const DEFAULT_DISCLAIMER_SECTIONS = [
    {
      title: "1. Nature of the AI Platform & Advisory Limitations",
      icon: Scale,
      content: [
        {
          subtitle: "Informational & Research Assistance Only",
          text: "AI LEGAL™ is a specialized legal technology and artificial intelligence software platform operated by UNIFIED WEB OPTIONS & SERVICES PRIVATE LIMITED. The platform delivers automated legal research, draft suggestions, statutory cross-referencing (including transitions under Bharatiya Nyaya Sanhita - BNS, Bharatiya Nagarik Suraksha Sanhita - BNSS, and Bharatiya Sakshya Adhiniyam - BSA), and case analytics. None of the AI-generated outputs, analyses, roadmaps, or predictive metrics constitute formal legal opinions, binding legal advice, or professional advocacy."
        },
        {
          subtitle: "No Licensing or Firm Representation",
          text: "AI LEGAL™ is not a licensed law firm, does not employ attorneys to represent users in judicial proceedings, and is not authorized to practice law in India or any other jurisdiction. The platform functions strictly as an augmentative productivity tool for legal practitioners, scholars, and litigants."
        }
      ]
    },
    {
      title: "2. Absolute Absence of Advocate-Client Relationship",
      icon: UserCheck,
      content: [
        {
          subtitle: "No Attorney-Client Privilege Created",
          text: "Transmitting queries, uploading evidence or contracts, or receiving algorithmic responses through AI LEGAL™ does not establish an advocate-client relationship under the Advocates Act, 1961, Bar Council of India (BCI) Rules, or common law legal privilege doctrine."
        },
        {
          subtitle: "Independent Retainer Mandate",
          text: "If you require formal legal representation, statutory notices issued on advocate letterhead, or courtroom representation, you must consult and formally retain a qualified, practicing advocate enrolled with a state bar council."
        }
      ]
    },
    {
      title: "3. Mandatory Verification of Judicial Citations & Hallucination Caution",
      icon: AlertTriangle,
      content: [
        {
          subtitle: "Potential for AI Hallucinations & Overruled Precedents",
          text: "While AI LEGAL™ utilizes enterprise-grade large language models and semantic retrieval, generative artificial intelligence systems are susceptible to hallucinations, incomplete statutory text, and occasionally out-of-date or overruled judicial citations."
        },
        {
          subtitle: "Advocate's Duty of Independent Verification",
          text: "Practicing advocates, legal counsels, and law students bear an absolute professional duty under Bar Council ethics to manually cross-verify all case names, equivalent citations (AIR, SCC, SCR, DLT, etc.), bench compositions, and operative paragraphs against official law reporters or court registries before citing them in pleadings, petitions, or oral arguments."
        }
      ]
    },
    {
      title: "4. New Criminal Laws Transition (BNS, BNSS, BSA vs. IPC, CrPC, IEA)",
      icon: BookOpen,
      content: [
        {
          subtitle: "Statutory Temporal Application",
          text: "Our models provide dual-mapping between legacy codes (IPC 1860, CrPC 1973, Indian Evidence Act 1872) and new statutory enactments (Bharatiya Nyaya Sanhita 2023, Bharatiya Nagarik Suraksha Sanhita 2023, Bharatiya Sakshya Adhiniyam 2023). Users must independently determine the date of offense and procedural applicability under Section 531 BNSS / Section 358 BNS before invoking specific sections in formal court submissions."
        }
      ]
    },
    {
      title: "5. Case Outcome Predictions & Algorithmic Probability",
      icon: AlertOctagon,
      content: [
        {
          subtitle: "Probabilistic Estimations, Not Guaranteed Outcomes",
          text: "Our Case Predictor and litigation risk models estimate win probabilities and settlement ranges based on historical judicial data trends. Judicial discretion, individual bench tendencies, oral examination nuances, and court evidentiary rulings cannot be predicted with mathematical certainty. AI LEGAL™ expressly disclaims any warranty regarding actual trial, appellate, or tribunal outcomes."
        }
      ]
    },
    {
      title: "6. Non-Solicitation & Bar Council of India Compliance",
      icon: Shield,
      content: [
        {
          subtitle: "Rule 36, Part VI, Chapter II BCI Rules",
          text: "AI LEGAL™ strictly adheres to the non-solicitation guidelines mandated by the Bar Council of India. The platform is not an advertisement or solicitation of legal practice. It does not solicit clients or offer fee-splitting arrangements with advocates."
        }
      ]
    },
    {
      title: "7. Comprehensive Limitation of Liability & Indemnity",
      icon: FileText,
      content: [
        {
          subtitle: "Exclusion of Damages",
          text: "To the maximum extent permitted by applicable Indian and international law, UNIFIED WEB OPTIONS & SERVICES PRIVATE LIMITED, its directors, employees, affiliates, and AI model providers shall not be held liable for any direct, indirect, incidental, punitive, or consequential damages—including lost cases, dismissed petitions, disciplinary bar sanctions, or legal malpractice claims—arising out of reliance on AI-generated information."
        },
        {
          subtitle: "Final Vetting Obligation",
          text: "By using the platform, users affirm that all final legal pleadings, agreements, notices, and documents remain the sole creation and responsibility of the human author who executes and submits them."
        }
      ]
    }
  ];

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const data = await apiService.getLegalPage('disclaimer');
        if (data && data.sections && data.sections.length > 0) {
          const mapped = data.sections.map((s, i) => ({
            ...s,
            icon: getDynamicIcon(i)
          }));
          setSections(mapped);
          if (data.lastUpdated) {
            setLastUpdated(new Date(data.lastUpdated).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }));
          }
        } else {
          setSections(DEFAULT_DISCLAIMER_SECTIONS);
        }
      } catch (err) {
        console.warn('Using fallback AI Legal disclaimer defaults:', err);
        setSections(DEFAULT_DISCLAIMER_SECTIONS);
      } finally {
        setLoading(false);
      }
    };
    fetchContent();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-amber-500/20 font-sans">
      {/* Top Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-slate-200 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => window.history.state && window.history.state.idx > 0 ? navigate(-1) : navigate('/')}
            className="flex items-center gap-2 text-slate-600 hover:text-amber-600 transition-colors group font-semibold text-sm cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span>Back</span>
          </button>
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
            <img
              src={logo || '/favicon.png'}
              alt="AI LEGAL™"
              className="w-8 h-8 rounded-lg object-contain"
            />
            <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
              AI LEGAL<sup className="text-[10px] font-bold text-amber-600 ml-0.5">TM</sup>
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-14">
        
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8 sm:mb-12"
        >
          <div className="inline-flex items-center justify-center w-14 h-14 sm:w-18 sm:h-18 rounded-2xl bg-amber-500/10 text-amber-600 mb-4 border border-amber-500/20 shadow-xs">
            <Scale className="w-7 h-7 sm:w-9 sm:h-9" />
          </div>
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-slate-900 mb-3 tracking-tight">
            AI Legal™ Disclaimer
          </h1>
          <p className="text-sm sm:text-lg text-slate-600 max-w-2xl mx-auto font-medium leading-relaxed">
            Statutory limitations, algorithmic scope, and professional verification requirements for using the AI LEGAL™ platform.
          </p>
          <div className="inline-flex items-center gap-2 mt-4 px-3 py-1 bg-amber-50 border border-amber-200 rounded-full text-xs text-amber-800 font-semibold">
            <Info size={14} className="text-amber-600" />
            <span>Last Updated: {lastUpdated}</span>
          </div>
        </motion.div>

        {/* Primary Callout Box */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent rounded-2xl sm:rounded-3xl p-5 sm:p-7 mb-8 sm:mb-10 border border-amber-500/30 shadow-xs"
        >
          <div className="flex items-start gap-3.5">
            <div className="p-2 rounded-xl bg-amber-500 text-slate-950 shrink-0 mt-0.5">
              <AlertTriangle size={20} />
            </div>
            <div className="space-y-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Important Regulatory Notice for Practicing Advocates & Legal Users
              </h2>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
                AI LEGAL™ outputs are generated algorithmically for research, drafting assistance, and workflow efficiency. <strong>AI is not a licensed advocate, does not provide legal representation, and does not establish an advocate-client relationship.</strong> All citations, statutory provisions, and generated drafts must be independently verified by a licensed advocate prior to court filing or client dissemination.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Structured Sections */}
        <div className="space-y-4 sm:space-y-6">
          {sections.map((section, index) => {
            const IconComp = section.icon || FileText;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * (index + 2) }}
                className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 border border-slate-200/80 shadow-xs hover:border-amber-500/30 transition-all group"
              >
                <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0 border border-amber-500/20 text-amber-600">
                    <IconComp className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <h2 className="text-base sm:text-xl font-bold text-slate-900 tracking-tight">
                    {section.title}
                  </h2>
                </div>

                <div className="space-y-4 sm:space-y-5 ml-0 sm:ml-16">
                  {section.content?.map((item, idx) => (
                    <div key={idx} className="space-y-1 sm:space-y-1.5">
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                        {item.subtitle}
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pl-3.5">
                        {item.text}
                      </p>
                    </div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Corporate Legal Registration & Contact Details */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-8 sm:mt-12 bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-4"
        >
          <h2 className="text-base sm:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-amber-600" />
            Compliance & Grievance Contact
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            If you have questions regarding this AI Legal Disclaimer, regulatory compliance, or ethical concerns under Bar Council guidelines, please direct correspondence to our compliance desk:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm text-slate-700 pt-2">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
              <span className="font-bold block text-slate-900 text-xs uppercase tracking-wider mb-1">Corporate Entity</span>
              <p className="font-semibold text-slate-800">UNIFIED WEB OPTIONS & SERVICES PRIVATE LIMITED</p>
              <p className="text-slate-500 text-xs mt-0.5">DPIIT Recognized | Incubated at IIT Ropar – TBIF</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
              <span className="font-bold block text-slate-900 text-xs uppercase tracking-wider mb-1">Contact Details</span>
              <p><strong>Email:</strong> <a href="mailto:admin@uwo24.com" className="text-amber-600 hover:underline">admin@uwo24.com</a></p>
              <p className="mt-0.5"><strong>Helpline:</strong> <a href="tel:+918359890909" className="text-amber-600 hover:underline">+91 83589 90909</a></p>
            </div>
          </div>
        </motion.div>

      </main>

      {/* Standardized Public Footer */}
      <div className="mt-16">
        <PublicFooter />
      </div>
    </div>
  );
}
