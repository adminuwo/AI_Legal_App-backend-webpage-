/**
 * AI Legal Mobile - Case & Workspace Type Definitions
 * Maps directly to backend Project models.
 */

export interface CaseLawyer {
  _id?: string;
  name: string;
  role: string;
  contact: string;
  email?: string;
  notes?: string;
}

export interface CaseFact {
  id?: string;
  title?: string;
  event?: string;
  description?: string;
  date: string;
  displayDate?: string;
  isApproximate?: boolean;
  category?: string;
  importance?: string;
  source?: string;
  confidence?: string;
  createdBy?: 'AI' | 'User';
}

export interface ItemPermissions {
  view: boolean;
  download: boolean;
  comment: boolean;
  review: boolean;
  edit: boolean;
  approve: boolean;
  reject: boolean;
}

export interface SharedMemberPermission {
  userId: string;
  name: string;
  role: string;
  permissions: ItemPermissions;
}

export interface UserItemPermissions {
  canView: boolean;
  canDownload: boolean;
  canComment: boolean;
  canReview: boolean;
  canEdit: boolean;
  canApprove: boolean;
  canReject: boolean;
  canManagePermissions: boolean;
}

export interface UploaderInfo {
  userId?: string;
  name: string;
  role?: string;
}

export interface ReviewComment {
  userId: string;
  userName: string;
  userRole?: string;
  comment: string;
  status: string;
  createdAt: string;
}

export interface CaseDocument {
  _id: string;
  id?: string;
  name: string;
  type: 'Notice' | 'Agreement' | 'Proof' | 'Filing' | 'Other';
  url: string;
  tags: string[];
  extractedData?: Record<string, any>;
  fileSize?: string;
  mimeType?: string;
  uploadDate: string;
  uploadedBy?: UploaderInfo | string;
  sharedBy?: UploaderInfo;
  visibility?: 'TEAM' | 'OWNER_ONLY' | 'SELECTED' | 'PRIVATE';
  sharedWith?: SharedMemberPermission[];
  currentUserPermissions?: UserItemPermissions;
  userAccessBadge?: string;
  reviewStatus?: 'Pending Review' | 'Under Review' | 'Approved' | 'Rejected' | 'Changes Requested';
  reviewComments?: ReviewComment[];
  version?: number;
}

export interface CaseContract {
  _id: string;
  id?: string;
  name: string;
  url: string;
  storedName?: string;
  hash?: string;
  uploadedDate: string;
  fileSize: string;
  fileType: string;
  ocrStatus: 'Complete' | 'Pending' | 'Failed';
  aiStatus: 'Analyzed' | 'Not Analyzed';
  analysisReport?: {
    summary: string;
    parties: string[];
    clauses: Array<{ title: string; risk: string; explanation: string }>;
    rights: string[];
    obligations: string[];
    risks: Array<{ title: string; severity: string; reason: string }>;
    missingClauses: string[];
    legalIssues: string[];
    compliance: string[];
    redFlags: string[];
    recommendations: string[];
    improvements: string[];
    riskScore: 'Low' | 'Medium' | 'High';
  };
}

export interface CaseEvidence {
  _id?: string;
  id?: string;
  name: string;
  type: string;
  description: string;
  notes?: string;
  exhibitNumber?: string;
  status?: 'Verified' | 'Pending' | 'Rejected' | 'Disputed' | 'Not Verified' | 'Under Review' | 'Approved' | 'Changes Requested';
  tags?: string[];
  url?: string;
  fileSize?: string;
  uploadedBy?: UploaderInfo | string;
  sharedBy?: UploaderInfo;
  visibility?: 'TEAM' | 'OWNER_ONLY' | 'SELECTED' | 'PRIVATE';
  sharedWith?: SharedMemberPermission[];
  currentUserPermissions?: UserItemPermissions;
  userAccessBadge?: string;
  reviewStatus?: 'Pending Review' | 'Under Review' | 'Approved' | 'Rejected' | 'Changes Requested';
  reviewComments?: ReviewComment[];
  uploadedDate?: string;
  createdAt?: string;
  updatedAt?: string;
  ocrData?: {
    text?: string;
    datesDetected?: string[];
    namesDetected?: string[];
    addressesDetected?: string[];
    signaturesDetected?: string[];
    amountsDetected?: string[];
    registrationNumbers?: string[];
    caseNumbers?: string[];
    courtNames?: string[];
    judges?: string[];
  };
  aiAnalysis?: {
    summary?: string;
    relevance?: string;
    extractedText?: string;
    entities?: {
      people?: string[];
      dates?: string[];
      addresses?: string[];
      amounts?: string[];
    };
    caseRelevance?: string;
    suggestedTimelineEvents?: string[];
    suggestedHearingLinks?: string[];
    suggestedArguments?: string[];
    applicableLaws?: string[];
    possibleWeaknesses?: string[];
    confidenceScore?: number;
  };
  relatedLinks?: {
    timelineEvents?: string[];
    hearings?: string[];
    research?: string[];
    arguments?: string[];
    drafts?: string[];
    contracts?: string[];
  };
  hash?: string;
}

export interface CasePrecedent {
  _id?: string;
  title: string;
  citation: string;
  summary: string;
  url?: string;
}

export interface CaseIntelligence {
  strengthScore: number;
  winProbability: number;
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  weakPoints: string[];
  missingEvidence: string[];
  opponentStrategies: string[];
  strategyRecommendations: string[];
}

export interface CaseTask {
  _id?: string;
  id?: string;
  title: string;
  description: string;
  status: 'Pending Acceptance' | 'Awaiting Acceptance' | 'Accepted' | 'In Progress' | 'Completed' | 'Rejected' | 'Closed' | 'Overdue' | 'Pending' | 'Draft';
  deadline?: string;
  dueDate?: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent' | 'Critical';
  checklist?: { title: string; checked: boolean }[];
  reminder?: string;
  assignTo?: string;
  assignedBy?: { userId?: string; name?: string; role?: string } | string;
  assignedTo?: { userId?: string; name?: string; role?: string } | string;
  acceptedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  startedAt?: string;
  completedAt?: string;
  completionNote?: string;
  relatedHearing?: string;
  linkedHearing?: string;
  relatedTimelineEvent?: string;
  relatedEvidence?: string;
  relatedDocument?: string;
  notes?: string;
  dueTime?: string;
  reminderId?: string;
  attachments?: { name: string; uri: string; type: string }[];
  source?: 'AI' | 'MANUAL' | 'AI Suggestion' | 'Voice Command' | string;
  createdAt?: string;
}

export interface CaseCommunicationLog {
  _id?: string;
  type: 'Call' | 'Email' | 'Note' | 'Meeting';
  summary: string;
  timestamp: string;
}

export interface CaseResearch {
  _id?: string;
  lawName: string;
  section: string;
  description: string;
  referenceUrl?: string;
}

export interface CaseHearingChecklistItem {
  title: string;
  checked: boolean;
  status?: string; // only for compliance checklist items
}

export interface CaseHearingTimelineEntry {
  date: string;
  title: string;
  description: string;
  type: 'created' | 'update' | 'complete' | 'rescheduled' | 'document' | 'voice' | string;
}

export interface CaseHearingVoiceNote {
  text: string;
  audioUrl: string;
  date: Date | string;
}

export interface CaseHearingAiPrep {
  summary?: string;
  keyArguments?: string[];
  legalPoints?: string[];
  suggestedQuestions?: string[];
  riskFactors?: string[];
  preparationTips?: string[];
  generatedAt?: string;
  // Extended AI Prep fields from backend analysis
  preparationScore?: number;
  timelineSummary?: string;
  strongArguments?: string[];
  crossExaminationQuestions?: string[];
  weaknesses?: string[];
  judgeStrategy?: string;
  relevantCaseLaws?: string[];
  missingDocuments?: string[];
}

export interface CaseHearing {
  id?: string;
  _id?: string;
  title?: string;
  date?: string;
  time?: string;
  courtName?: string;
  courtroom?: string;
  judge?: string;
  purpose?: string;
  hearingStage?: string;
  caseStage?: string;
  notes?: string;
  status?: 'Scheduled' | 'Completed' | 'Adjourned' | 'Orders Reserved' | 'Cancelled' | 'Ongoing' | 'Upcoming' | 'Rescheduled' | string;
  linkedDocuments?: string[];
  orderSummary?: string;
  isAiEnriched?: boolean;
  nextHearingDate?: string;
  appearingAdvocateUserId?: string;
  appearingAdvocateName?: string;
  supportingAdvocateUserIds?: string[];
  supportingAdvocateNames?: string[];
  preparationStatus?: string;
  preparationChecklist?: Record<string, boolean>;
  outcomeRecord?: Record<string, any>;
  priority?: 'Low' | 'Medium' | 'High' | 'Urgent' | string;
  reminder?: string;
  reminderId?: string;
  timeline?: CaseHearingTimelineEntry[];
  voiceNotes?: CaseHearingVoiceNote[];
  aiPrep?: CaseHearingAiPrep;
  checklist?: {
    documents: CaseHearingChecklistItem[];
    evidence: CaseHearingChecklistItem[];
    witnesses: CaseHearingChecklistItem[];
    compliance: CaseHearingChecklistItem[];
  };
}

export interface CaseWorkspace {
  _id: string;
  id?: string;
  name: string;
  userId: string;
  workspaceType?: string;
  clientName?: string;
  opponentName?: string;
  summary?: string;
  caseSummary?: string; // Backward compatibility
  caseType?: string;
  courtName?: string;
  caseNumber?: string;
  status: 'Active' | 'Closed' | 'Archived';
  stage: 'Pre-litigation' | 'Notice' | 'Court' | 'Judgment' | 'Settled';
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  lawyers: CaseLawyer[];
  ownerInfo?: { userId?: string; name?: string; role?: string };
  ownerName?: string;
  leadAdvocate?: string;
  facts: CaseFact[];
  legalIssues: string[];
  reliefGoals?: string;
  documents: CaseDocument[];
  evidence: CaseEvidence[];
  savedPrecedents: CasePrecedent[];
  intelligence: CaseIntelligence;
  tasks: CaseTask[];
  communicationLogs: CaseCommunicationLog[];
  research: CaseResearch[];
  hearings: CaseHearing[];
  limitationWarnings?: Array<{ title: string; description: string; date?: string }>;
  upcomingDeadlines?: Array<{ title: string; description: string; date?: string }>;
  missingDocuments?: Array<{ title: string; description: string; date?: string }>;
  isLegalCase?: boolean;
  accused?: string;
  drafts?: CaseDraft[];
  notes?: CaseNote[];
  contracts?: CaseContract[];
  courtOrders?: CourtOrder[];
  opposingLawyer?: string;
  assignedMembers?: any[];
  teamMembers?: any[];
  workspaceId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CaseDraftVersion {
  version: number;
  content: string;
  createdAt: string;
  changes: string;
}

export interface CaseDraft {
  id: string;
  name: string;
  type: string;
  content: string;
  versions: CaseDraftVersion[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  status: 'Draft' | 'In Progress' | 'Completed' | 'Reviewed';
  aiSuggestions: string[];
  exportHistory: string[];
}

export interface CaseSummary {
  _id: string;
  name: string;
  clientName?: string;
  opponentName?: string;
  caseType?: string;
  status: 'Active' | 'Closed' | 'Archived';
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  documentCount: number;
  taskCount: number;
  hearingCount: number;
  updatedAt: string;
}

export interface CaseNote {
  _id?: string;
  id?: string;
  title: string;
  content: string;
  formattedContent?: string;
  author?: string;
  category: string;
  tags?: string[];
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  attachments?: Array<{ name: string; url: string; type: string }>;
  voiceRecordingUrl?: string;
  relatedHearing?: string;
  relatedTimelineEvent?: string;
  relatedEvidence?: string;
  relatedArgument?: string;
  relatedResearch?: string;
  favorite?: boolean;
  pinned?: boolean;
  archived?: boolean;
  aiSummary?: {
    shortSummary?: string;
    keyPoints?: string[];
    importantFacts?: string[];
    actionItems?: string[];
  };
  aiEntities?: Array<{ text: string; type: string }>;
  aiSuggestedLinks?: Array<{ type: string; targetId: string; targetName: string; confirmed?: boolean }>;
  aiSuggestedActions?: Array<{ type: string; description: string; accepted?: boolean }>;
  versions?: Array<{ version: number; content: string; createdAt: string }>;
  createdAt?: string;
  updatedAt?: string;
}

export interface CourtOrder {
  _id?: string;
  id?: string;
  name: string;
  url?: string;
  fileSize?: string;
  ocrText?: string;
  status: 'Pending' | 'Completed' | 'Compliance Pending' | 'AI Analyzed' | 'In Progress';
  uploadedBy?: string;
  metadata?: {
    courtName?: string;
    judgeName?: string;
    bench?: string;
    courtNumber?: string;
    caseNumber?: string;
    orderDate?: string;
    nextHearingDate?: string;
    orderType?: string;
    stageOfCase?: string;
    petitioner?: string;
    respondent?: string;
    advocates?: string;
    caseStatus?: string;
  };
  aiSummary?: {
    shortSummary?: string;
    keyPoints?: string[];
  };
  complianceItems?: Array<{
    _id?: string;
    description: string;
    status: 'Pending' | 'Completed' | 'Overdue';
    dueDate?: string;
    priority: 'Low' | 'Medium' | 'High' | 'Critical';
    responsiblePerson?: string;
  }>;
  suggestedTasks?: Array<{
    _id?: string;
    title: string;
    description: string;
    priority?: string;
    accepted?: boolean;
  }>;
  suggestedTimeline?: Array<{
    _id?: string;
    title: string;
    description: string;
    date: string;
    accepted?: boolean;
  }>;
  suggestedHearings?: Array<{
    _id?: string;
    title: string;
    date: string;
    courtroom?: string;
    judge?: string;
    purpose?: string;
    accepted?: boolean;
  }>;
  suggestedArguments?: Array<{
    _id?: string;
    title: string;
    logic: string;
    precedents?: string;
    accepted?: boolean;
  }>;
  suggestedResearch?: Array<{
    _id?: string;
    act: string;
    section: string;
    description: string;
    accepted?: boolean;
  }>;
  suggestedEvidence?: Array<{
    _id?: string;
    title: string;
    description: string;
    status?: string;
    accepted?: boolean;
  }>;
  riskAnalysis?: {
    proceduralDefects?: string[];
    weaknessDetails?: string[];
    limitationRisk?: string;
    jurisdictionIssue?: boolean;
    objectionsProbability?: number;
  };
  linkedRecords?: {
    hearingsCount?: number;
    tasksCount?: number;
    evidenceCount?: number;
    notesCount?: number;
    linkedNotesId?: string;
  };
  priority?: 'Low' | 'Medium' | 'High' | 'Critical';
  archived?: boolean;
  attachments?: Array<{
    name: string;
    uri: string;
    type: string;
  }>;
  createdAt?: string;
  updatedAt?: string;
}
