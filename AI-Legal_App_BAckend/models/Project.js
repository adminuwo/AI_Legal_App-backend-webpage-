import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    role: {
        type: String,
        enum: ['advocate', 'student', 'law_firm'],
        default: 'advocate',
        index: true
    },
    workspaceId: {
        type: String,
        default: 'personal_practice',
        index: true
    },
    workspaceType: {
        type: String,
        enum: ['personal', 'advocate', 'law_firm', 'student', 'other'],
        default: 'advocate',
        index: true
    },
    assignedMembers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    leadAdvocate: {
        type: String,
        default: ''
    },
    leadAdvocateUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    teamMembers: [{
        type: String
    }],
    assignedUserIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    caseAssignments: [{
        userId: { type: String, default: '' },
        name: { type: String, default: '' },
        caseRole: { type: String, default: 'Assigned Advocate' },
        assignedAt: { type: Date, default: Date.now }
    }],
    // --- Basic Case Info ---
    clientName: {
        type: String,
        trim: true,
        default: ''
    },
    clientMobileNumber: {
        type: String,
        trim: true,
        default: ''
    },
    clientWhatsAppNumber: {
        type: String,
        trim: true,
        default: ''
    },
    clientEmail: {
        type: String,
        trim: true,
        default: ''
    },
    summary: {
        type: String,
        trim: true,
        default: ''
    },
    // Backward compatibility for existing data
    caseSummary: {
        type: String,
        trim: true
    },
    caseType: {
        type: String,
        trim: true,
        default: ''
    },
    status: {
        type: String,
        enum: ['Active', 'Closed', 'Archived'],
        default: 'Active'
    },
    stage: {
        type: String,
        enum: ['Pre-litigation', 'Notice', 'Court', 'Judgment', 'Settled'],
        default: 'Pre-litigation'
    },
    priority: {
        type: String,
        enum: ['Low', 'Medium', 'High', 'Urgent'],
        default: 'Medium'
    },
    courtroomLanguage: {
        type: String,
        enum: ['English', 'Hindi', 'Auto Detect'],
        default: 'Auto Detect'
    },
    // --- Parties ---
    opponentName: {
        type: String,
        trim: true,
        default: ''
    },
    lawyers: [{
        name: String,
        role: String,
        contact: String
    }],
    // --- Case Content ---
    facts: [{
        id: { type: String },
        title: { type: String, trim: true, default: '' },
        description: { type: String, trim: true, default: '' },
        date: { type: String, default: '' },
        displayDate: { type: String, default: '' },
        isApproximate: { type: Boolean, default: false },
        category: { type: String, default: 'Other' },
        importance: { type: String, enum: ['High', 'Medium', 'Low'], default: 'Medium' },
        source: { type: String, default: '' },
        confidence: { type: String, default: 'High' },
        createdBy: { type: String, enum: ['AI', 'User'], default: 'AI' }
    }],
    limitationWarnings: [{
        title: { type: String, trim: true },
        description: { type: String, trim: true },
        date: { type: String }
    }],
    upcomingDeadlines: [{
        title: { type: String, trim: true },
        description: { type: String, trim: true },
        date: { type: String }
    }],
    missingDocuments: [{
        title: { type: String, trim: true },
        description: { type: String, trim: true },
        date: { type: String }
    }],
    legalIssues: [{
        type: String,
        trim: true
    }],
    reliefGoals: {
        type: String,
        trim: true,
        default: ''
    },
    // --- Evidence & Documents ---
    documents: [{
        _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
        id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
        name: { type: String, required: true },
        type: { type: String, enum: ['Notice', 'Agreement', 'Proof', 'Filing', 'Other'], default: 'Other' },
        url: String,
        tags: [String],
        extractedData: mongoose.Schema.Types.Mixed,
        hash: String,
        fileSize: { type: String, default: '0 KB' },
        mimeType: { type: String, default: '' },
        uploadDate: { type: Date, default: Date.now },
        uploadedBy: {
            userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            name: { type: String, default: 'Advocate' },
            role: { type: String, default: 'Team Member' }
        },
        sharedBy: {
            userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            name: String,
            role: String
        },
        visibility: { type: String, enum: ['TEAM', 'OWNER_ONLY', 'SELECTED', 'PRIVATE'], default: 'TEAM' },
        sharedWith: [{
            userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            name: String,
            role: String,
            permissions: {
                view: { type: Boolean, default: true },
                download: { type: Boolean, default: false },
                comment: { type: Boolean, default: false },
                review: { type: Boolean, default: false },
                edit: { type: Boolean, default: false },
                approve: { type: Boolean, default: false },
                reject: { type: Boolean, default: false }
            }
        }],
        defaultPermissions: {
            view: { type: Boolean, default: true },
            download: { type: Boolean, default: true },
            comment: { type: Boolean, default: true },
            review: { type: Boolean, default: true },
            edit: { type: Boolean, default: false },
            approve: { type: Boolean, default: false },
            reject: { type: Boolean, default: false }
        },
        reviewStatus: { type: String, enum: ['Pending Review', 'Under Review', 'Approved', 'Rejected', 'Changes Requested'], default: 'Pending Review' },
        reviewComments: [{
            userId: String,
            userName: String,
            userRole: String,
            comment: String,
            status: String,
            createdAt: { type: Date, default: Date.now }
        }],
        version: { type: Number, default: 1 }
    }],
    evidence: [{
        _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
        id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
        name: { type: String, required: true },
        type: { type: String, default: 'Document' },
        description: { type: String, default: '' },
        notes: { type: String, default: '' },
        exhibitNumber: { type: String, default: '' },
        status: { type: String, enum: ['Verified', 'Pending', 'Rejected', 'Disputed', 'Not Verified', 'Under Review', 'Approved', 'Changes Requested'], default: 'Not Verified' },
        tags: [String],
        url: { type: String, default: '' },
        fileSize: { type: String, default: '0 KB' },
        uploadedBy: {
            userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            name: { type: String, default: 'Advocate' },
            role: { type: String, default: 'Team Member' }
        },
        sharedBy: {
            userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            name: String,
            role: String
        },
        visibility: { type: String, enum: ['TEAM', 'OWNER_ONLY', 'SELECTED', 'PRIVATE'], default: 'TEAM' },
        sharedWith: [{
            userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            name: String,
            role: String,
            permissions: {
                view: { type: Boolean, default: true },
                download: { type: Boolean, default: false },
                comment: { type: Boolean, default: false },
                review: { type: Boolean, default: false },
                edit: { type: Boolean, default: false },
                approve: { type: Boolean, default: false },
                reject: { type: Boolean, default: false }
            }
        }],
        defaultPermissions: {
            view: { type: Boolean, default: true },
            download: { type: Boolean, default: true },
            comment: { type: Boolean, default: true },
            review: { type: Boolean, default: true },
            edit: { type: Boolean, default: false },
            approve: { type: Boolean, default: false },
            reject: { type: Boolean, default: false }
        },
        reviewStatus: { type: String, enum: ['Pending Review', 'Under Review', 'Approved', 'Rejected', 'Changes Requested'], default: 'Pending Review' },
        reviewComments: [{
            userId: String,
            userName: String,
            userRole: String,
            comment: String,
            status: String,
            createdAt: { type: Date, default: Date.now }
        }],
        uploadedDate: { type: Date, default: Date.now },
        ocrData: { type: mongoose.Schema.Types.Mixed, default: {} },
        aiAnalysis: { type: mongoose.Schema.Types.Mixed, default: {} },
        relatedLinks: { type: mongoose.Schema.Types.Mixed, default: {} },
        hash: { type: String, default: '' },
        storedName: { type: String, default: '' },
        mimeType: { type: String, default: '' },
        version: { type: Number, default: 1 }
    }],
    savedPrecedents: [],
    contracts: [{ type: mongoose.Schema.Types.Mixed }],
    // --- Structured AI Case Intelligence ---
    caseIntelligence: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    // --- AI Intelligence & Risk ---
    intelligence: {
        strengthScore: { type: Number, default: 0 }, // 0-100
        winProbability: { type: Number, default: 0 }, // 0-100
        riskLevel: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'], default: 'Medium' },
        weakPoints: [String],
        missingEvidence: [String],
        opponentStrategies: [String],
        strategyRecommendations: [String]
    },
    // --- Strategy & Arguments ---
    arguments: {
        petitionerArguments: [{ type: mongoose.Schema.Types.Mixed }],
        respondentArguments: [{ type: mongoose.Schema.Types.Mixed }]
    },
    strategy: { type: mongoose.Schema.Types.Mixed, default: {} },
    tasks: [{
        _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
        id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
        title: { type: String, required: true },
        description: { type: String, default: '' },
        status: {
            type: String,
            enum: ['Pending Acceptance', 'Accepted', 'In Progress', 'Completed', 'Rejected', 'Closed', 'Overdue', 'Pending', 'Draft', 'AI Suggested', 'To Do', 'Awaiting Acceptance'],
            default: 'Pending Acceptance'
        },
        source: { type: String, enum: ['AI', 'MANUAL', 'AI Suggestion', 'Voice Command'], default: 'MANUAL' },
        taskType: { type: String, default: 'Task' },
        deadline: { type: String, default: '' },
        dueTime: { type: String, default: '' },
        dueDate: { type: Date },
        priority: { type: String, enum: ['Low', 'Medium', 'High', 'Urgent', 'Critical', 'LOW', 'MEDIUM', 'HIGH', 'URGENT', 'CRITICAL'], default: 'Medium' },
        assignedBy: {
            userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            name: { type: String, default: '' },
            role: { type: String, default: '' }
        },
        assignedTo: {
            userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            name: { type: String, default: '' },
            role: { type: String, default: '' }
        },
        acceptedAt: { type: Date },
        rejectedAt: { type: Date },
        rejectionReason: { type: String, default: '' },
        startedAt: { type: Date },
        completedAt: { type: Date },
        completionNote: { type: String, default: '' },
        reviewedAt: { type: Date },
        reviewedBy: {
            userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            name: { type: String, default: '' },
            role: { type: String, default: '' }
        },
        reassignmentHistory: [{
            previousAssignee: {
                userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
                name: String,
                role: String
            },
            reassignedBy: {
                userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
                name: String,
                role: String
            },
            reassignedAt: { type: Date, default: Date.now },
            reason: String
        }],
        progressUpdates: [{
            comment: { type: String, required: true },
            createdBy: {
                userId: String,
                name: String,
                role: String
            },
            createdAt: { type: Date, default: Date.now }
        }],
        relatedHearing: String,
        relatedEvidence: String,
        relatedDocument: String,
        notes: String,
        reminder: String,
        checklist: [{
            title: String,
            checked: { type: Boolean, default: false }
        }],
        attachments: [{
            name: String,
            uri: String,
            type: String
        }],
        createdAt: { type: Date, default: Date.now }
    }],
    // --- Communication Logs ---
    communicationLogs: [{
        type: { type: String, enum: ['Phone Call', 'WhatsApp', 'Email', 'Call', 'WhatsApp Draft', 'Email Draft'] },
        reason: { type: String, default: '' },
        mode: { type: String, default: '' },
        subject: { type: String, default: '' },
        body: { type: String, default: '' },
        editedDraft: { type: String, default: '' },
        senderId: { type: String, default: '' },
        senderName: { type: String, default: '' },
        recipientPhone: { type: String, default: '' },
        recipientEmail: { type: String, default: '' },
        status: { type: String, default: 'Sent' },
        summary: String,
        timestamp: { type: Date, default: Date.now }
    }],
    // --- Legal Research ---
    research: [{
        lawName: String,
        section: String,
        description: String,
        referenceUrl: String
    }],
    // --- Compatibility/Legacy ---
    isLegalCase: {
        type: Boolean,
        default: false
    },
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client',
        default: null
    },
    accused: { // Kept for backward compatibility
        type: String,
        trim: true,
        default: ''
    },
    keyIssue: { // Kept for backward compatibility
        type: String,
        trim: true,
        default: ''
    },
    importantDates: [{ // Kept for backward compatibility
        label: String,
        date: Date
    }],
    hearings: [{
        _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
        id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
        title: { type: String, trim: true, default: '' },
        date: { type: String, default: '' },
        time: { type: String, default: '' },
        courtName: { type: String, default: '' },
        courtroom: { type: String, default: '' },
        judge: { type: String, default: '' },
        purpose: { type: String, default: '' },
        notes: { type: String, default: '' },
        status: { 
            type: String, 
            enum: ['Scheduled', 'Completed', 'Adjourned', 'Orders Reserved', 'Cancelled', 'Ongoing', 'Rescheduled', 'Upcoming'], 
            default: 'Scheduled' 
        },
        priority: { type: String, enum: ['Low', 'Medium', 'High', 'Urgent'], default: 'Medium' },
        appearingAdvocateUserId: { type: String, default: '' },
        appearingAdvocateName: { type: String, default: '' },
        supportingAdvocateUserIds: [{ type: String }],
        supportingAdvocateNames: [{ type: String }],
        createdByUserId: { type: String, default: '' },
        createdByName: { type: String, default: '' },
        preparationStatus: { type: String, enum: ['Pending', 'Prepared'], default: 'Pending' },
        preparationChecklist: {
            argumentsReady: { type: Boolean, default: false },
            evidenceReady: { type: Boolean, default: false },
            witnessReady: { type: Boolean, default: false },
            documentsReady: { type: Boolean, default: false },
            courtFeesPaid: { type: Boolean, default: false },
            courtCopiesFiled: { type: Boolean, default: false },
            researchCompleted: { type: Boolean, default: false },
            updatedByUserId: { type: String, default: '' },
            updatedByName: { type: String, default: '' },
            updatedAt: { type: Date }
        },
        outcomeRecord: {
            outcome: { type: String, default: '' },
            courtDirections: { type: String, default: '' },
            orderStatus: { type: String, default: '' },
            nextHearingDate: { type: String, default: '' },
            nextHearingTime: { type: String, default: '' },
            nextHearingPurpose: { type: String, default: '' },
            actionItems: [{ type: String }],
            attachedCourtOrderUrl: { type: String, default: '' },
            recordedByUserId: { type: String, default: '' },
            recordedByName: { type: String, default: '' },
            recordedAt: { type: Date }
        },
        caseStage: { type: String, default: '' },
        reminder: { type: String, default: '' },
        reminderId: { type: String, default: '' },
        voiceNotes: [{
            text: { type: String, default: '' },
            audioUrl: { type: String, default: '' },
            date: { type: Date, default: Date.now }
        }],
        aiPrep: { type: mongoose.Schema.Types.Mixed, default: {} },
        timeline: [{
            date: { type: String, default: '' },
            title: { type: String, default: '' },
            description: { type: String, default: '' },
            type: { type: String, default: '' }
        }],
        linkedDocuments: [{ type: String }],
        orderSummary: { type: String, default: '' },
        isAiEnriched: { type: Boolean, default: false },
        nextHearingDate: { type: String, default: '' },
        checklist: {
            documents: [{ title: String, checked: { type: Boolean, default: false } }],
            evidence: [{ title: String, checked: { type: Boolean, default: false } }],
            witnesses: [{ title: String, checked: { type: Boolean, default: false } }],
            compliance: [{ title: String, checked: { type: Boolean, default: false }, status: { type: String, default: 'Pending' } }]
        }
    }],
    drafts: [{
        _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
        id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
        name: { type: String, required: true },
        type: { type: String, default: 'Miscellaneous' },
        content: { type: String, default: '' },
        versions: [{
            version: { type: Number, required: true },
            content: { type: String, default: '' },
            createdAt: { type: Date, default: Date.now },
            changes: { type: String, default: 'Initial draft created' }
        }],
        createdBy: { type: String, default: 'Advocate' },
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now },
        status: { type: String, enum: ['Draft', 'In Progress', 'Completed', 'Reviewed'], default: 'Draft' },
        aiSuggestions: [String],
        exportHistory: [String]
    }],
    notes: [{
        _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
        id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
        workspaceId: { type: String, default: '' },
        caseId: { type: String, default: '' },
        userId: { type: String, default: '' },
        title: { type: String, required: true },
        content: { type: String, default: '' },
        formattedContent: { type: String, default: '' },
        author: { type: String, default: '' },
        transcript: { type: String, default: '' },
        audioUrl: { type: String, default: '' },
        category: { type: String, default: 'Personal' },
        tags: [String],
        priority: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'], default: 'Medium' },
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now },
        attachments: [{
            name: String,
            url: String,
            type: { type: String }
        }],
        voiceRecordingUrl: { type: String, default: '' },
        relatedHearing: { type: String, default: '' },
        relatedContract: { type: String, default: '' },
        relatedTimelineEvent: { type: String, default: '' },
        relatedEvidence: { type: String, default: '' },
        relatedArgument: { type: String, default: '' },
        relatedResearch: { type: String, default: '' },
        favorite: { type: Boolean, default: false },
        pinned: { type: Boolean, default: false },
        archived: { type: Boolean, default: false },
        aiSummary: {
            shortSummary: { type: String, default: '' },
            keyPoints: [String],
            importantFacts: [String],
            actionItems: [String]
        },
        aiEntities: [{
            text: String,
            type: { type: String }
        }],
        aiSuggestedLinks: [{
            type: { type: String },
            targetId: String,
            targetName: String,
            confirmed: { type: Boolean, default: false }
        }],
        aiSuggestedActions: [{
            type: { type: String },
            description: String,
            accepted: { type: Boolean, default: false }
        }],
        versions: [{
            version: Number,
            content: String,
            createdAt: { type: Date, default: Date.now }
        }]
    }],
    courtOrders: [{
        _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
        id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
        name: { type: String, required: true },
        url: { type: String, default: '' },
        fileSize: { type: String, default: '0 KB' },
        ocrText: { type: String, default: '' },
        status: { type: String, enum: ['Pending', 'Completed', 'Compliance Pending', 'AI Analyzed'], default: 'Pending' },
        uploadedBy: { type: String, default: 'Advocate' },
        metadata: {
            courtName: { type: String, default: '' },
            judgeName: { type: String, default: '' },
            bench: { type: String, default: '' },
            courtNumber: { type: String, default: '' },
            caseNumber: { type: String, default: '' },
            orderDate: { type: String, default: '' },
            nextHearingDate: { type: String, default: '' },
            orderType: { type: String, default: 'Interim Order' },
            stageOfCase: { type: String, default: '' },
            petitioner: { type: String, default: '' },
            respondent: { type: String, default: '' },
            advocates: { type: String, default: '' },
            caseStatus: { type: String, default: '' }
        },
        aiSummary: {
            shortSummary: { type: String, default: '' },
            keyPoints: [String]
        },
        complianceItems: [{
            description: String,
            status: { type: String, enum: ['Pending', 'Completed', 'Overdue'], default: 'Pending' },
            dueDate: String,
            priority: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'], default: 'Medium' },
            responsiblePerson: { type: String, default: 'Advocate' }
        }],
        suggestedTasks: [{
            title: String,
            description: String,
            priority: { type: String, default: 'Medium' },
            accepted: { type: Boolean, default: false }
        }],
        suggestedTimeline: [{
            title: String,
            description: String,
            date: String,
            accepted: { type: Boolean, default: false }
        }],
        suggestedHearings: [{
            title: String,
            date: String,
            courtroom: String,
            judge: String,
            purpose: String,
            accepted: { type: Boolean, default: false }
        }],
        suggestedArguments: [{
            title: String,
            logic: String,
            precedents: String,
            accepted: { type: Boolean, default: false }
        }],
        suggestedResearch: [{
            act: String,
            section: String,
            description: String,
            accepted: { type: Boolean, default: false }
        }],
        suggestedEvidence: [{
            title: String,
            description: String,
            status: { type: String, default: 'Required' },
            accepted: { type: Boolean, default: false }
        }],
        riskAnalysis: {
            proceduralDefects: [String],
            weaknessDetails: [String],
            limitationRisk: { type: String, default: 'Low' },
            jurisdictionIssue: { type: Boolean, default: false },
            objectionsProbability: { type: Number, default: 20 }
        },
        linkedRecords: {
            hearingsCount: { type: Number, default: 0 },
            tasksCount: { type: Number, default: 0 },
            evidenceCount: { type: Number, default: 0 }
        },
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now }
    }]
}, { 
    timestamps: true,
    strict: false 
});

projectSchema.pre('save', function () {
    if (this.tasks && Array.isArray(this.tasks)) {
        this.tasks.forEach(t => {
            if (t.deadline && (isNaN(new Date(t.deadline).getTime()) || t.deadline.toString() === 'Invalid Date')) {
                t.deadline = undefined;
            }
        });
    }
});

const Project = mongoose.model('Project', projectSchema);
export default Project;
