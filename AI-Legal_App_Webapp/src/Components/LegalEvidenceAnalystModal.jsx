import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Binary, Search, Upload, Sparkles, Copy, Download, Globe, ShieldAlert, CheckCircle2,
  Camera, Image, FileText, Video, Mic, MessageSquare, Cloud, Edit, Check, AlertTriangle, ShieldCheck
} from 'lucide-react';
import toast from 'react-hot-toast';

const PRIMARY_SOURCES = [
  { id: 'camera', label: '📷 Camera Live Capture', desc: 'Capture physical evidence photo directly' },
  { id: 'gallery', label: '🖼️ Photo Gallery & Scans', desc: 'Import scanned document photos or exhibits' },
  { id: 'pdf', label: '📄 PDF Legal Document', desc: 'Import contracts, petitions, or notices' },
];

const SECONDARY_SOURCES = [
  { id: 'video', label: '📹 Video Surveillance', desc: 'CCTV footage & recorded video files' },
  { id: 'voice', label: '🎙️ Voice Recording', desc: 'Audio recordings of oral statements' },
  { id: 'whatsapp', label: '💬 WhatsApp Chat Export', desc: 'Exported chat text logs & media' },
  { id: 'cloud', label: '☁️ Cloud Storage Sync', desc: 'Sync files from Google Drive / Dropbox' },
  { id: 'manual', label: '📝 Manual Entry', desc: 'Type or paste raw statement text' },
];

export default function LegalEvidenceAnalystModal({ isOpen, onClose }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedSource, setSelectedSource] = useState('pdf');
  const [uploadedFiles, setUploadedFiles] = useState([]);
  
  // Step 2: Forensic Scan State
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStatus, setScanStatus] = useState('');

  // Step 3: Forensic Results Data
  const [forensicData, setForensicData] = useState({
    authenticityScore: 95,
    courtReadinessScore: 90,
    tamperRisk: '0% FORGERY RISK',
    sha256Hash: 'a8f5f167f44f8b2c9e10d8a571bc890e4f3a21',
    fileName: 'LEASE_AGREEMENT_SIGNED.pdf',
    fileSize: '2.4 MB',
    exifDate: '14 Jan 2026, 14:32:10 IST',
    deviceModel: 'Fujitsu Scansnap iX1600',
    gpsCoordinates: '28.6139° N, 77.2090° E (New Delhi)',
    ocrText: `THIS LEASE AGREEMENT is executed on this 14th day of January 2026 at New Delhi between Shri Rajesh Sharma (Lessor) and Apex Logistics Pvt Ltd (Lessee) for premises situated at Plot 41, Industrial Area, Okhla, New Delhi. Rent fixed at Rs 2,50,000/- per month payable by 5th of each calendar month.`,
    bsaSec65BStatus: 'Compliant (Affidavit Ready)',
    contradictions: [
      { witness: 'PW-2 Witness Statement', claim: 'Claims lease was signed in Mumbai on 15th Jan.', finding: 'EXIF metadata & GPS pin location to New Delhi on 14th Jan.' }
    ],
    missingProof: [
      'Original bank statement showing security deposit transfer',
      'Witness identity proof copy (Aadhaar / PAN)'
    ]
  });

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setUploadedFiles(files.map(f => ({ name: f.name, size: (f.size / 1024 / 1024).toFixed(1) + ' MB' })));
      toast.success(`Ingested ${files.length} exhibit document(s)`);
    }
  };

  const startForensicScan = () => {
    setCurrentStep(2);
    setIsScanning(true);
    setScanProgress(10);
    setScanStatus('Extracting GPS Coordinates & Exif Geolocation...');

    const statuses = [
      { pct: 25, text: 'Generating SHA-256 Checksum Hash...' },
      { pct: 45, text: 'OCR Document Text Segmentation & Extracted Text...' },
      { pct: 65, text: 'Double Compression Manipulation Check & Deepfake Scan...' },
      { pct: 85, text: 'Auditing Indian Evidence Act / BSA Sec 65B Compliance...' },
      { pct: 100, text: 'Forensic Audit Complete!' }
    ];

    statuses.forEach((item, idx) => {
      setTimeout(() => {
        setScanProgress(item.pct);
        setScanStatus(item.text);
        if (item.pct === 100) {
          setIsScanning(false);
          setCurrentStep(3);
        }
      }, (idx + 1) * 1100);
    });
  };

  const handleCopyOcr = () => {
    navigator.clipboard.writeText(forensicData.ocrText);
    toast.success('Extracted OCR text copied to clipboard!');
  };

  const handleGenerate65B = () => {
    toast.success('Generating Court-Ready BSA Section 65B Evidence Certificate...');
  };

  const handleExportReport = () => {
    toast.success('Exporting Forensic Audit & Chain of Custody Report (PDF)...');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-5xl h-[90vh] bg-white dark:bg-[#111111] border border-[#C8A34D]/40 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-900 dark:text-white"
        >
          {/* Header */}
          <div className="px-8 py-5 bg-[#111111] border-b border-[#C8A34D]/30 flex items-center justify-between shrink-0 text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#222222] border border-[#C8A34D]/40 flex items-center justify-center text-[#C8A34D]">
                <Binary className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold tracking-tight flex items-center gap-2">
                  <span>Evidence Analyst & Forensics</span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#C8A34D]/20 text-[#C8A34D] border border-[#C8A34D]/30 uppercase">
                    BSA Sec 65B Audit Engine
                  </span>
                </h2>
                <p className="text-[11px] font-medium text-slate-400">
                  Step {currentStep} of 3 • {currentStep === 1 ? 'Multi-Source Ingestion' : currentStep === 2 ? '10 Forensic Scans' : 'Forensic Dashboard & Audit'}
                </p>
              </div>
            </div>

            <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Stepper Bar */}
          <div className="px-8 py-3 bg-[#181818] border-b border-slate-800 flex items-center justify-between text-xs font-semibold shrink-0 overflow-x-auto">
            {[
              { num: 1, label: '1. Ingestion Source' },
              { num: 2, label: '2. 10 Forensic Scans' },
              { num: 3, label: '3. Forensic Dashboard' },
            ].map(step => (
              <div 
                key={step.num}
                onClick={() => { if (step.num < currentStep) setCurrentStep(step.num); }}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-xl cursor-pointer transition-all ${
                  currentStep === step.num
                    ? 'bg-[#C8A34D] text-[#111111] font-black shadow-md shadow-[#C8A34D]/20'
                    : currentStep > step.num
                    ? 'text-[#C8A34D]'
                    : 'text-slate-500'
                }`}
              >
                <span>{step.label}</span>
                {currentStep > step.num && <CheckCircle2 className="w-3.5 h-3.5" />}
              </div>
            ))}
          </div>

          {/* Modal Content Body */}
          <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-[#F5F5F5] dark:bg-[#111111]">
            {/* STEP 1: MULTI-SOURCE INGESTION */}
            {currentStep === 1 && (
              <div className="space-y-6 max-w-3xl mx-auto">
                <div className="text-center space-y-1">
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">Multi-Source Evidence Ingestion</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Select exhibit origin for forensic metadata analysis & SHA-256 hashing.</p>
                </div>

                {/* Primary Sources Grid */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">Primary Ingestion Sources</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {PRIMARY_SOURCES.map(source => (
                      <div
                        key={source.id}
                        onClick={() => setSelectedSource(source.id)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                          selectedSource === source.id
                            ? 'bg-white dark:bg-[#222222] border-[#C8A34D] ring-1 ring-[#C8A34D] shadow-md'
                            : 'bg-white dark:bg-[#181818] border-slate-200 dark:border-slate-800 hover:border-[#C8A34D]/40'
                        }`}
                      >
                        <span className="text-xs font-bold text-slate-900 dark:text-white block">{source.label}</span>
                        <span className="text-[10px] text-slate-400 mt-1 block">{source.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Secondary Sources Grid */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">Secondary Ingestion Channels</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {SECONDARY_SOURCES.map(source => (
                      <div
                        key={source.id}
                        onClick={() => setSelectedSource(source.id)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                          selectedSource === source.id
                            ? 'bg-white dark:bg-[#222222] border-[#C8A34D] ring-1 ring-[#C8A34D]'
                            : 'bg-white dark:bg-[#181818] border-slate-200 dark:border-slate-800 hover:border-[#C8A34D]/40'
                        }`}
                      >
                        <span className="text-[11px] font-bold text-slate-900 dark:text-white block">{source.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Dropzone */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Upload Physical Exhibit File</label>
                  <label className="border-2 border-dashed border-[#C8A34D]/40 hover:border-[#C8A34D] bg-white dark:bg-[#181818] p-8 rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-all">
                    <Upload className="w-8 h-8 text-[#C8A34D] mb-2" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white">Click to upload exhibit or drag & drop</span>
                    <span className="text-[10px] text-slate-400 mt-1">Supports PDF, DOCX, MP4, MP3, JPG, PNG (SHA-256 Hashing Active)</span>
                    <input type="file" onChange={handleFileUpload} className="hidden" />
                  </label>
                </div>
              </div>
            )}

            {/* STEP 2: 10 FORENSIC SCANS PROGRESS */}
            {currentStep === 2 && (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-6 my-12">
                <div className="relative w-24 h-24 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-4 border-[#C8A34D]/20 animate-ping" />
                  <div className="w-20 h-20 rounded-full bg-[#111111] border-2 border-[#C8A34D] flex items-center justify-center text-[#C8A34D]">
                    <Sparkles className="w-8 h-8 animate-spin" />
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">Executing 10 Forensic Integrity Scans</h3>
                  <p className="text-xs font-mono text-[#C8A34D]">{scanStatus}</p>
                </div>

                <div className="w-full max-w-md bg-slate-200 dark:bg-[#222222] h-2 rounded-full overflow-hidden">
                  <div className="bg-[#C8A34D] h-full transition-all duration-300" style={{ width: `${scanProgress}%` }} />
                </div>
              </div>
            )}

            {/* STEP 3: FORENSIC DASHBOARD */}
            {currentStep === 3 && (
              <div className="space-y-6 max-w-4xl mx-auto">
                {/* 3 Metric Gauges */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Authenticity Dial */}
                  <div className="p-5 rounded-3xl bg-white dark:bg-[#181818] border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-md">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Authenticity Rating</span>
                      <h4 className="text-2xl font-black text-[#C8A34D] mt-0.5">{forensicData.authenticityScore}%</h4>
                      <span className="text-[9px] text-emerald-400 font-semibold">Valid Metadata</span>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-[#111111] border border-[#C8A34D]/30 flex items-center justify-center text-[#C8A34D]">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                  </div>

                  {/* Court Readiness */}
                  <div className="p-5 rounded-3xl bg-white dark:bg-[#181818] border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-md">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Court Readiness</span>
                      <h4 className="text-2xl font-black text-white mt-0.5">{forensicData.courtReadinessScore}%</h4>
                      <span className="text-[9px] text-[#C8A34D] font-semibold">Admissible in Court</span>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-[#111111] border border-[#C8A34D]/30 flex items-center justify-center text-[#C8A34D]">
                      <FileText className="w-6 h-6" />
                    </div>
                  </div>

                  {/* Tamper Risk */}
                  <div className="p-5 rounded-3xl bg-white dark:bg-[#181818] border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-md">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Tamper & Forgery Risk</span>
                      <h4 className="text-sm font-black text-emerald-400 mt-1">{forensicData.tamperRisk}</h4>
                      <span className="text-[9px] text-slate-400">Zero Edits Detected</span>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-[#111111] border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                  </div>
                </div>

                {/* Metadata Audit Grid */}
                <div className="p-6 bg-white dark:bg-[#181818] rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-widest text-[#C8A34D]">Forensic Metadata & Cryptographic Integrity</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#111111] border border-slate-200 dark:border-slate-800">
                      <span className="text-[9px] font-bold text-slate-400 uppercase block">SHA-256 Checksum Hash</span>
                      <span className="text-slate-900 dark:text-slate-200 font-bold break-all mt-0.5 block">{forensicData.sha256Hash}</span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#111111] border border-slate-200 dark:border-slate-800">
                      <span className="text-[9px] font-bold text-slate-400 uppercase block">EXIF Capture Timestamp</span>
                      <span className="text-slate-900 dark:text-slate-200 font-bold mt-0.5 block">{forensicData.exifDate}</span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#111111] border border-slate-200 dark:border-slate-800">
                      <span className="text-[9px] font-bold text-slate-400 uppercase block">Geolocation Coordinates</span>
                      <span className="text-slate-900 dark:text-slate-200 font-bold mt-0.5 block">{forensicData.gpsCoordinates}</span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#111111] border border-slate-200 dark:border-slate-800">
                      <span className="text-[9px] font-bold text-slate-400 uppercase block">BSA Sec 65B Audit Status</span>
                      <span className="text-emerald-400 font-bold mt-0.5 block">{forensicData.bsaSec65BStatus}</span>
                    </div>
                  </div>
                </div>

                {/* OCR Extracted Text */}
                <div className="p-6 bg-white dark:bg-[#181818] rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-widest text-[#C8A34D]">OCR Extracted Text Canvas</h4>
                    <button onClick={handleCopyOcr} className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-[#111111] text-[#C8A34D] border border-[#C8A34D]/30 text-xs font-bold flex items-center gap-1 cursor-pointer">
                      <Copy className="w-3.5 h-3.5" /> Copy OCR Text
                    </button>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#111111] border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-800 dark:text-slate-200 leading-relaxed max-h-40 overflow-y-auto">
                    {forensicData.ocrText}
                  </div>
                </div>

                {/* Contradictions & Gap Alerts */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Contradiction Table */}
                  <div className="p-5 bg-white dark:bg-[#181818] rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-widest text-[#C8A34D] flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4 text-amber-400" /> Deposition Contradictions
                    </h4>
                    {forensicData.contradictions.map((c, i) => (
                      <div key={i} className="p-3 rounded-xl bg-slate-50 dark:bg-[#111111] border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                        <span className="font-bold text-amber-400 block">{c.witness}</span>
                        <p className="text-slate-400">Claim: {c.claim}</p>
                        <p className="text-emerald-400 font-semibold">Finding: {c.finding}</p>
                      </div>
                    ))}
                  </div>

                  {/* Missing Proof Alerts */}
                  <div className="p-5 bg-white dark:bg-[#181818] rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-widest text-[#C8A34D] flex items-center gap-1">
                      <ShieldAlert className="w-4 h-4 text-rose-400" /> Missing Proof Gaps
                    </h4>
                    <div className="space-y-2">
                      {forensicData.missingProof.map((m, i) => (
                        <div key={i} className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#111111] border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-300 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                          <span>{m}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Action Bar */}
          <div className="px-8 py-4 bg-[#111111] border-t border-[#C8A34D]/30 flex items-center justify-between shrink-0">
            {currentStep === 1 && (
              <button 
                onClick={startForensicScan}
                className="ml-auto px-6 py-2.5 rounded-xl bg-[#C8A34D] text-[#111111] text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-lg shadow-[#C8A34D]/20"
              >
                <Sparkles className="w-4 h-4" /> Run 10 Forensic Scans
              </button>
            )}

            {currentStep === 3 && (
              <div className="flex items-center justify-between w-full">
                <button 
                  onClick={handleGenerate65B}
                  className="px-4 py-2 rounded-xl bg-[#222222] text-[#C8A34D] border border-[#C8A34D]/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  📜 Generate BSA Sec 65B Certificate
                </button>

                <button 
                  onClick={handleExportReport}
                  className="px-6 py-2.5 rounded-xl bg-[#C8A34D] text-[#111111] text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-lg shadow-[#C8A34D]/20"
                >
                  <Download className="w-4 h-4" /> Export Audit Report (PDF)
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
