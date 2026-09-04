export interface PolicySection {
  id: string;
  title: string;
  content: string;
}

export interface PolicyDocument {
  id: string;
  title: string;
  lastUpdated: string;
  version: string;
  intro: string;
  sections: PolicySection[];
}

export const POLICY_DOCUMENTS: PolicyDocument[] = [
  {
    id: 'terms',
    title: 'Terms of Service',
    lastUpdated: 'July 17, 2026',
    version: 'v1.5.0',
    intro: 'Welcome to AI LEGAL™. These Terms of Service govern your license, account setup, and legal responsibilities when accessing our AI legal analytics application, web portal, and cloud strategy services.',
    sections: [
      {
        id: 'acceptance',
        title: '1. Acceptance of Terms',
        content: 'By accessing or using the AI LEGAL™ platform, creating an account, or purchasing subscription plans, you agree to be bound by these Terms of Service. If you do not agree to these terms, you are prohibited from using the platform and must immediately delete your account and uninstall the mobile application.'
      },
      {
        id: 'eligibility',
        title: '2. User Eligibility',
        content: 'AI LEGAL™ is built for registered advocates, legal firms, corporate legal departments, and individual litigants. By registering, you warrant that you possess the legal authority to enter into this agreement and will comply with all local, state, and international bar associations, judicial orders, and code ordinances.'
      },
      {
        id: 'registration',
        title: '3. Account Security & Registration',
        content: 'You must provide accurate, verified information during signup, including your preferred jurisdiction. You are solely responsible for maintaining the confidentiality of your credentials and restrict access to unauthorized parties. Any security breaches or suspect activity must be reported to support immediately.'
      },
      {
        id: 'ai_services',
        title: '4. AI Legal Services & Limitations',
        content: 'AI LEGAL™ utilizes advanced natural language processing, machine learning models, and document intelligence tools to offer case summaries, precedent research, contract analysis, and litigation strategies. You acknowledge that AI is a tool designed to assist human lawyers, not replace them. AI outputs may contain errors, incomplete precedents, or structural anomalies.'
      },
      {
        id: 'no_attorney_relationship',
        title: '5. No Attorney-Client Relationship',
        content: 'Your use of AI LEGAL™ does not establish an attorney-client relationship between you and AI LEGAL™, its developers, or its parent entity. The platform is not a licensed law firm, does not practice law, and does not provide legal representation. All materials generated are for informational and educational workflow assistance.'
      },
      {
        id: 'uploaded_docs',
        title: '6. User Content & Uploaded Documents',
        content: 'You retain all ownership and intellectual property rights in the documents, pleading briefs, and evidence matrices you upload to the platform. You grant AI LEGAL™ a limited, non-exclusive, secure license to host and process these files solely to generate the requested analysis. No uploaded documents are used for training public open-source models.'
      },
      {
        id: 'subscriptions',
        title: '7. Subscriptions, Renewals, & Billing',
        content: 'Access to premium features requires a paid subscription (monthly or yearly cycles). Subscriptions automatically renew at the end of the billing period using the payment method on file. You may cancel your subscription at any time; however, cancellations will only apply to the subsequent billing cycle.'
      },
      {
        id: 'conduct',
        title: '8. Prohibited Activities',
        content: 'You agree not to: (a) reverse-engineer or attempt to extract the source code of the platform or the underlying AI weights; (b) upload state-restricted, highly classified, or illegally compiled materials; (c) use the AI to generate documents for illegal tax evasion, harassment, or extortion; (d) deploy automated scraping bots that degrade system performance.'
      },
      {
        id: 'liability',
        title: '9. Limitation of Liability',
        content: 'To the maximum extent permitted by applicable law, AI LEGAL™ and its parent operators, affiliates, and developers shall not be liable for any direct, indirect, incidental, or consequential damages, legal malpractice claims, professional sanctions, or lost cases resulting from your reliance on AI-generated suggestions. Practicing advocates are solely responsible for verifying all filings.'
      },
      {
        id: 'governing_law',
        title: '10. Governing Law & Jurisdiction',
        content: 'These Terms of Service shall be governed by and construed in accordance with the laws of India. Any litigation, dispute, or claim arising out of these terms shall be subject to the exclusive jurisdiction of the competent courts of New Delhi, India. If any provision is found invalid, the remaining terms shall continue in full force.'
      }
    ]
  },
  {
    id: 'privacy',
    title: 'Privacy Policy',
    lastUpdated: 'July 17, 2026',
    version: 'v1.5.0',
    intro: 'AI LEGAL™ takes client confidentiality and data security with absolute seriousness. This Privacy Policy details how we compile, process, safeguard, and delete your professional case information.',
    sections: [
      {
        id: 'collection',
        title: '1. Information We Collect',
        content: 'To provide secure AI processing, we collect: (a) Account Information: name, email address, phone number, and billing logs; (b) Workspace Data: legal documents, PDF case files, evidence images, and chat logs; (c) Telemetry Data: device identification, crash details, OS versions, and application performance metrics.'
      },
      {
        id: 'usage',
        title: '2. How We Use Data',
        content: 'Data is processed strictly to execute requested features: (a) Optical Character Recognition (OCR) text extraction; (b) Semantic indexing of precedent files and contract risk audits; (c) Personalizing response language preferences; (d) Platform security, billing compliance, and active threat detection.'
      },
      {
        id: 'non_sale',
        title: '3. Data Sharing & Non-Sale Policy',
        content: 'We enforce a strict data protection policy: we NEVER sell, trade, rent, or monetize your personal files, evidence briefs, or workspace logs to advertising networks, brokers, or third parties. Data is processed exclusively inside encrypted cloud services required to execute the platform features.'
      },
      {
        id: 'ai_processing',
        title: '4. AI Data Processing & Third-Party AI Services',
        content: 'AI LEGAL™ utilizes secure enterprise AI API providers (such as Google Gemini) to process user queries for legal research, drafting, and analysis. Data transmitted to AI processing infrastructure is encrypted via HTTPS and strictly used to return immediate real-time outputs requested by the user. User input data is never sold, shared with unauthorized third parties, or utilized to train public AI models.'
      },
      {
        id: 'transfers',
        title: '4. International Data Transfers',
        content: 'AI LEGAL™ serves global legal workspaces. Your data may be processed in secure database regions closest to your selected jurisdiction. Any transfers across international borders are protected under standard contractual clauses, ensuring uniform data security guidelines.'
      },
      {
        id: 'security_practices',
        title: '5. Security & Encryption Standards',
        content: 'We apply top-tier security controls: (a) End-to-end TLS 1.3 encryption for all data in transit; (b) AES-256 block encryption at rest for databases and file servers; (c) Isolated tenant sandboxing to prevent cross-account leaks; (d) Continuous intrusion monitoring and vulnerability scans.'
      },
      {
        id: 'retention_rules',
        title: '6. Data Retention & Permanent Deletion',
        content: 'Case files and chat transcripts are stored only for as long as you maintain your account. Toggling deletion on a file immediately flags it for purge. Permanent account deletions remove all corresponding database collections, document buffers, and billing logs from active nodes within 48 hours.'
      },
      {
        id: 'user_rights',
        title: '7. User Rights & Data Portability',
        content: 'You maintain absolute ownership of your data. You have the right to inspect, download a copy of your chat history and case metadata, correct account information, restrict processing, or permanently delete your entire profile directly from the Settings panel.'
      },
      {
        id: 'updates',
        title: '8. Privacy Policy Updates',
        content: 'We may modify this document as technology or compliance mandates evolve. For significant updates, we notify users via in-app alerts or email registered accounts at least 15 days before amendments take effect.'
      }
    ]
  },
  {
    id: 'disclaimer',
    title: 'AI Legal Disclaimer',
    lastUpdated: 'July 17, 2026',
    version: 'v1.5.0',
    intro: 'This AI Legal Disclaimer clarifies the operational scope, algorithmic limits, and professional exclusions of the AI LEGAL™ platform.',
    sections: [
      {
        id: 'nature_of_ai',
        title: '1. Automated Advisory Status',
        content: 'AI LEGAL™ is a software application leveraging artificial intelligence, natural language models, and semantic databases. All case predictors, citation reviews, roadmap strategies, and drafting advice are generated algorithmically. The software does not think like a human practitioner and does not hold a license to practice law.'
      },
      {
        id: 'educational_only',
        title: '2. Informational Purpose Only',
        content: 'The information and suggestions provided by the AI are for informational and educational research purposes. They must not be construed as official legal opinions, binding representations, or licensed legal advice. The platform serves to accelerate case preparations, not replace professional legal assessment.'
      },
      {
        id: 'precedent_verification',
        title: '3. Precedent Citation Warning',
        content: 'AI models can occasionally hallucinate or output out-of-date, overruled, or incorrect case precedent links. Advocates are under an absolute professional duty under local bar regulations to manually cross-verify all case names, citations, and statutory acts before referencing them in active courts.'
      },
      {
        id: 'malpractice_exclusion',
        title: '4. Assumption of Risk & Liability',
        content: 'By using this app, you assume all risk. Neither AI LEGAL™ nor its developers assume liability for legal errors, dismissed claims, missed filing deadlines, or professional malpractice complaints resulting from reliance on AI suggestions. Advocates are solely responsible for their final filings.'
      }
    ]
  },
  {
    id: 'refunds',
    title: 'Refund & Subscription Policy',
    lastUpdated: 'July 17, 2026',
    version: 'v1.5.0',
    intro: 'This Subscription Policy details billing cycles, cancellation terms, and grace periods for all AI LEGAL™ tiers.',
    sections: [
      {
        id: 'cycles',
        title: '1. Billing & Subscription Cycles',
        content: 'AI LEGAL™ offers Monthly and Yearly subscription packages. By subscribing, you authorize our platform payment processors to charge your registered payment card in advance. Subscriptions renew automatically on the same calendar day unless cancelled before the renewal date.'
      },
      {
        id: 'cancellation',
        title: '2. Subscription Cancellation',
        content: 'You may cancel your premium plan at any time through the Billing panel inside Settings or through your corresponding app store (Apple App Store / Google Play). Upon cancellation, your premium features remain active until the end of the current paid billing cycle.'
      },
      {
        id: 'failures',
        title: '3. Failed Payments & Grace Periods',
        content: 'If an automatic renewal charge fails, the platform will attempt to retarget payment for up to 3 times over a 7-day grace period. During this period, premium features may be restricted. If payment continues to fail, the account is downgraded to the Free Basic tier.'
      }
    ]
  },
  {
    id: 'cookies',
    title: 'Cookie Policy',
    lastUpdated: 'July 17, 2026',
    version: 'v1.5.0',
    intro: 'This Cookie Policy explains how AI LEGAL™ uses cookies and local device storage to authenticate sessions and monitor app health.',
    sections: [
      {
        id: 'essential',
        title: '1. Essential Authentication Cookies',
        content: 'These cookies and local storage tokens are strictly necessary to operate the application. They store encrypted user session keys, authenticate API requests, preserve secure socket connections, and prevent unauthorized account hijacking.'
      },
      {
        id: 'preferences',
        title: '2. Preference & Customization Storage',
        content: 'We use local storage keys to remember your selected theme (Light/Dark mode), preferred legal jurisdiction, selected interface language, and font size choices so that you do not need to re-configure them on every app launch.'
      },
      {
        id: 'analytics',
        title: '3. Telemetry & Analytics Storage',
        content: 'These telemetry hooks collect de-identified metadata on screen rendering times, network latency, and crash logs. This data is used solely to audit server load, find interface bottlenecks, and fix bugs.'
      }
    ]
  },
  {
    id: 'retention',
    title: 'Data Retention & Deletion Policy',
    lastUpdated: 'July 17, 2026',
    version: 'v1.5.0',
    intro: 'This Policy outlines the timelines, procedures, and safety parameters followed when users request data deletion or account purging.',
    sections: [
      {
        id: 'trash_flows',
        title: '1. Case & File Deletion Flows',
        content: 'Tapping delete on a case workspace or document immediately removes it from your UI and cuts active reference links. The raw file in secure cloud storage is moved to a temporary buffer and permanently purged within 30 days.'
      },
      {
        id: 'account_purge',
        title: '2. Permanent Account Purging',
        content: 'When you trigger "Delete Account" in settings, a deep database purge begins. We permanently delete your profile, case histories, timeline databases, AI chat archives, and extracted OCR data from all cloud storage nodes. This process takes up to 48 hours and is irreversible.'
      },
      {
        id: 'backups',
        title: '3. Backup Purple Retention',
        content: 'De-identified account logs and secure server backups are rotated automatically. Backups contain snapshots of files for emergency disaster recovery and are overwritten/cleared entirely within a 30-day cycle.'
      }
    ]
  },
  {
    id: 'community',
    title: 'Community & Acceptable Use Guidelines',
    lastUpdated: 'July 17, 2026',
    version: 'v1.5.0',
    intro: 'These Guidelines outline standard community expectations and unacceptable activities when interacting with AI LEGAL™ workflows.',
    sections: [
      {
        id: 'legal_use',
        title: '1. Compliance with Case Merits',
        content: 'You must ensure all files uploaded to the platform correspond to legitimate client files or legal research cases. Uploading fake documents or forged evidence with intent to validate them using AI is strictly prohibited.'
      },
      {
        id: 'malicious_input',
        title: '2. Security & Malware Controls',
        content: 'You are prohibited from uploading files designed to breach server sandboxes. No viruses, ransomware, corrupted PDFs, zip bombs, or automated scripts designed to overload AI server endpoints are permitted.'
      },
      {
        id: 'respectful_conduct',
        title: '3. Professional Conduct & Abuse',
        content: 'You agree to treat all integrated helper networks, customer advocates, and support channels with respect. Spamming API ports, brute-forcing accounts, sharing credentials, or utilizing AI outputs to conduct criminal fraud will result in immediate termination and referral to law enforcement.'
      }
    ]
  }
];
