import mongoose from 'mongoose';
import Project from '../models/Project.js';
import Workspace from '../models/Workspace.js';
import WorkspaceMembership from '../models/WorkspaceMembership.js';
import User from '../models/User.js';

/**
 * MASTER WORKSPACE-AWARE ISOLATED AI CONTEXT SERVICE
 * 
 * Strict Isolation Principle:
 * Each assistant knows EVERYTHING it is authorized to know about its CURRENT ACTIVE WORKSPACE,
 * but NOTHING from another workspace. WORKSPACE CONTEXT MUST NEVER LEAK.
 * 
 * Assistant Types:
 * 1. STUDENT -> AI LEGAL TUTOR (Educational, bare acts, concepts, exam prep)
 * 2. ADVOCATE / PERSONAL -> AI LEGAL ASSISTANT (Personal practice litigation co-pilot)
 * 3. LAW FIRM -> AI FIRM ASSISTANT (Enterprise law firm OS, team management, firm cases)
 */
export class WorkspaceAIContextService {

  /**
   * Resolve Assistant Metadata based on active workspace type
   */
  static getAssistantMetadata(workspaceType = 'personal', workspaceName = '') {
    const type = String(workspaceType || '').toLowerCase();
    if (type === 'student') {
      return {
        assistantName: 'AI LEGAL TUTOR',
        assistantTitle: 'AI LEGAL TUTOR',
        assistantSubtitle: 'Interactive Student Legal Tutor & Concept Helper',
        assistantType: 'tutor',
        avatarIcon: 'school-outline',
        systemPersona: 'You are AI LEGAL TUTOR, an expert legal educator and tutor dedicated to helping law students master legal concepts, bare acts, case laws, sections, exam preparation, and study doubts. You have ZERO access to private litigation cases or law firm client data.'
      };
    } else if (type === 'law_firm' || type === 'enterprise') {
      return {
        assistantName: 'AI FIRM ASSISTANT',
        assistantTitle: 'AI FIRM ASSISTANT',
        assistantSubtitle: `Enterprise AI Managing Partner & Law Firm OS${workspaceName ? ' • ' + workspaceName : ''}`,
        assistantType: 'firm_assistant',
        avatarIcon: 'business-outline',
        systemPersona: `You are AI FIRM ASSISTANT, the enterprise AI Managing Partner for the law firm workspace "${workspaceName || 'Firm Workspace'}". You manage firm cases, advocate assignments, workload, upcoming hearings, team tasks, client communications, and strategic firm intelligence.`
      };
    } else {
      return {
        assistantName: 'AI LEGAL ASSISTANT',
        assistantTitle: 'AI LEGAL ASSISTANT',
        assistantSubtitle: 'Litigation Co-pilot for Personal Practice',
        assistantType: 'assistant',
        avatarIcon: 'briefcase-outline',
        systemPersona: 'You are AI LEGAL ASSISTANT, an intelligent litigation co-pilot for personal legal practice. You assist advocates with their personal active cases, client updates, court preparation, evidence analysis, legal research, and daily litigation workflows.'
      };
    }
  }

  /**
   * Build Authorized Workspace-Scoped AI Prompt Context
   */
  static async buildWorkspaceContext({
    userId,
    workspaceId = 'personal_practice',
    workspaceType = 'personal',
    prompt = '',
    activeCaseId = null
  }) {
    const rawWsType = String(workspaceType || '').toLowerCase();
    const isStudent = rawWsType === 'student';
    const isLawFirm = rawWsType === 'law_firm' || rawWsType === 'enterprise' || (mongoose.Types.ObjectId.isValid(workspaceId) && workspaceId !== 'personal_practice');

    const meta = this.getAssistantMetadata(isStudent ? 'student' : (isLawFirm ? 'law_firm' : 'personal'));
    const lowerPrompt = String(prompt || '').toLowerCase().trim();

    let contextHeader = `\n=== ${meta.assistantName} CONTEXT (STRICTLY WORKSPACE ISOLATED) ===\n`;
    contextHeader += `Persona: ${meta.systemPersona}\n`;
    contextHeader += `Active Workspace ID: ${workspaceId}\n`;
    contextHeader += `Active Workspace Type: ${isStudent ? 'STUDENT' : (isLawFirm ? 'LAW FIRM' : 'PERSONAL PRACTICE')}\n\n`;

    // ------------------------------------------------------------------------
    // 1. STUDENT WORKSPACE — AI LEGAL TUTOR
    // ------------------------------------------------------------------------
    if (isStudent) {
      contextHeader += `### STUDENT EDUCATIONAL ENVIRONMENT:
- Purpose: Education, Legal Learning & Exam Preparation.
- Authorized Knowledge: Bare Acts (IPC/BNS, CrPC/BNSS, CPC, Evidence Act/BSA, Constitution of India), Landmark High Court & Supreme Court Judgments, Legal Maxims, Doctrines, Exam Practice Questions, Essay Writing & Memorial Drafting.
- STRICT ISOLATION RESTRICTION: ZERO access to private litigation cases, law firm client data, firm documents, or advocate private practice files.

### AVAILABLE STUDENT AI TOOLS & CAPABILITIES:
1. Bare Act & Section Explainer: Explains legal provisions, clauses, and key definitions in clear language.
2. Exam Prep & Mock Quiz Generator: Generates practice questions, problem-based scenarios, and solution guides.
3. Legal Concept & Precedent Search: Provides authoritative summaries of legal doctrines, landmark rulings, and maxims.
4. Academic Research Assistant: Assists in drafting moot court memorials, academic essays, and study notes.
`;

      return {
        contextText: contextHeader,
        meta,
        authorized: true,
        workspaceId: 'student_workspace',
        workspaceType: 'student'
      };
    }

    // ------------------------------------------------------------------------
    // 2. LAW FIRM WORKSPACE — AI FIRM ASSISTANT
    // ------------------------------------------------------------------------
    if (isLawFirm) {
      let isMember = false;
      let userRoleInFirm = 'Junior Advocate';
      let firmName = 'Law Firm Workspace';
      let permissions = 'Standard';

      try {
        const wsDoc = await Workspace.findById(workspaceId).lean();
        if (wsDoc) {
          firmName = wsDoc.name;
          if (String(wsDoc.ownerId) === String(userId)) {
            isMember = true;
            userRoleInFirm = 'Firm Owner';
            permissions = 'Full Admin';
          }
        }

        const userDoc = userId && mongoose.Types.ObjectId.isValid(userId) ? await User.findById(userId).select('email').lean() : null;
        const memberOrConditions = [{ userId: userId }];
        if (userDoc?.email) {
          memberOrConditions.push({ email: userDoc.email });
        }
        const membership = await WorkspaceMembership.findOne({
          workspaceId: String(workspaceId),
          $or: memberOrConditions
        }).lean();

        if (membership) {
          isMember = true;
          userRoleInFirm = membership.role || userRoleInFirm;
          permissions = membership.permission || permissions;
        }
      } catch (e) {
        console.warn('[WorkspaceAIContextService] Law firm authorization check failed:', e.message);
      }

      // Security check: Deny firm context if user is not a member of this firm workspace
      if (!isMember) {
        return {
          contextText: contextHeader + `\n[SECURITY DENIAL] User is NOT an authorized member of Law Firm Workspace "${workspaceId}". Access to firm data is strictly denied.`,
          meta,
          authorized: false,
          workspaceId: String(workspaceId),
          workspaceType: 'law_firm'
        };
      }

      // Respect permissions inside Law Firm
      const isOwnerOrPartner = ['Firm Owner', 'Managing Partner', 'Senior Advocate', 'Partner', 'Administrator', 'Advocate / Owner'].includes(userRoleInFirm) || permissions === 'Full Admin';

      const wsIdStr = String(workspaceId);
      const wsIdCondition = [wsIdStr];
      if (mongoose.Types.ObjectId.isValid(wsIdStr)) {
        wsIdCondition.push(new mongoose.Types.ObjectId(wsIdStr));
      }

      const caseQuery = isOwnerOrPartner
        ? { workspaceId: { $in: wsIdCondition } }
        : {
            workspaceId: { $in: wsIdCondition },
            $or: [
              { userId: userId },
              { assignedMembers: userId },
              { assignedUserIds: userId },
              { leadAdvocateUserId: userId }
            ]
          };

      const firmCases = await Project.find(caseQuery)
        .select('name caseType clientName status stage nextHearingDate leadAdvocate hearings tasks teamMembers summary caseSummary timeline witnesses evidence contracts')
        .sort({ updatedAt: -1 })
        .lean();

      console.log(`[WORKSPACE DIAGNOSTIC] authenticatedUserId: ${userId} | requestedWorkspaceId: ${workspaceId} | workspaceType: law_firm | assistantType: AI FIRM ASSISTANT | numberOfCasesLoaded: ${firmCases.length} | caseIdsLoaded: ${firmCases.map(c => c._id).join(', ')} | caseNames: ${firmCases.map(c => c.name).join(', ')}`);

      // Fetch Firm Team Roster
      const firmMemberships = await WorkspaceMembership.find({ workspaceId: String(workspaceId), status: 'Active' })
        .populate('userId', 'fullName name email role')
        .lean();

      const teamRosterText = firmMemberships.map(m => {
        const uName = m.userId?.fullName || m.userId?.name || m.email || 'Advocate';
        return `- ${uName} | Role: ${m.role || 'Member'} | Permission: ${m.permission || 'Standard'}`;
      }).join('\n') || '- No other team members in this firm workspace.';

      // Extract Firm Hearings & Tasks
      const allUpcomingHearings = [];
      const allPendingTasks = [];

      firmCases.forEach(c => {
        if (Array.isArray(c.hearings)) {
          c.hearings.forEach(h => {
            if (h.status === 'Scheduled' || h.status === 'Upcoming' || h.status === 'Pending') {
              allUpcomingHearings.push(`- Case "${c.name}": ${h.title || 'Hearing'} on ${h.date || 'Scheduled Date'} (${h.courtroom || 'Court'})`);
            }
          });
        }
        if (Array.isArray(c.tasks)) {
          c.tasks.forEach(t => {
            if (t.status !== 'Completed' && t.status !== 'Rejected') {
              allPendingTasks.push(`- Case "${c.name}": Task "${t.title}" (Assigned: ${t.assignedTo || 'Unassigned'}, Priority: ${t.priority || 'Medium'}, Status: ${t.status || 'Pending'})`);
            }
          });
        }
      });

      contextHeader += `### LAW FIRM WORKSPACE OPERATIONAL CONTEXT ("${firmName}"):
- Active Firm Workspace ID: ${workspaceId}
- User Role in Firm: ${userRoleInFirm} (Access Level: ${isOwnerOrPartner ? 'Full Firm Operations' : 'Assigned Cases & Tasks Only'})
- Authorized Active Firm Cases Count: ${firmCases.length}

### FIRM CASES SUMMARY:
${firmCases.slice(0, 15).map(c => `- Case "${c.name}" | Client: ${c.clientName || 'N/A'} | Status: ${c.status || 'Active'} | Lead: ${c.leadAdvocate || 'N/A'}`).join('\n') || '- No active cases in this firm workspace.'}

### FIRM TEAM ROSTER & MEMBERS (${firmMemberships.length}):
${teamRosterText}

### UPCOMING FIRM HEARINGS (${allUpcomingHearings.length}):
${allUpcomingHearings.slice(0, 10).join('\n') || '- No upcoming hearings.'}

### PENDING FIRM TASKS & WORKLOAD (${allPendingTasks.length}):
${allPendingTasks.slice(0, 15).join('\n') || '- No pending firm tasks.'}

### AVAILABLE LAW FIRM AI TOOLS & CAPABILITIES:
1. AI Team Communication: Broadcast WhatsApp, Email, & Call updates to clients and firm members.
2. AI Task Workflow Manager: Assign, delegate, track, approve, or reject firm advocate case tasks.
3. Case Team Chat & AI Copilot: Collaborative case room with embedded AI assistant for document reviews.
4. Firm Litigation Strategy Engine: Strategic roadmaps, argument preparation, and defense rebuttals.
5. Evidence & Contract Analysis: Comprehensive exhibit evaluation, missing document checklists, and risk scoring.

ISOLATION GUARANTEE: AI Firm Assistant has access to "${firmName}" ONLY. It CANNOT access Personal Practice cases of any member or data from other law firm workspaces.
`;

      // Dynamic Intent-Based Retrieval for Case-Specific Queries inside Law Firm
      let focusedCase = null;
      if (activeCaseId && mongoose.Types.ObjectId.isValid(activeCaseId)) {
        focusedCase = firmCases.find(c => String(c._id) === String(activeCaseId));
      }

      if (!focusedCase && (lowerPrompt.includes('case') || lowerPrompt.includes('summarize') || lowerPrompt.includes('detail'))) {
        // Try matching case name from prompt
        firmCases.forEach(c => {
          if (c.name && lowerPrompt.includes(c.name.toLowerCase())) {
            focusedCase = c;
          }
        });
      }

      if (focusedCase) {
        contextHeader += `\n### FOCUSED CASE DETAIL ("${focusedCase.name}"):
- Case Name: ${focusedCase.name}
- Client: ${focusedCase.clientName || 'N/A'} | Lead Advocate: ${focusedCase.leadAdvocate || 'N/A'}
- Stage: ${focusedCase.stage || 'Pre-litigation'} | Status: ${focusedCase.status || 'Active'}
- Case Summary: ${focusedCase.summary || focusedCase.caseSummary || 'No summary recorded.'}
- Timeline & Events: ${(focusedCase.timeline || []).map(t => `  * [${t.date || 'N/A'}] ${t.title}: ${t.description || ''}`).join('\n') || '  * None'}
- Evidence Items: ${(focusedCase.evidence || []).map(e => `  * ${e.name} (${e.type || 'Doc'})`).join('\n') || '  * None'}
- Pending Tasks: ${(focusedCase.tasks || []).filter(t => t.status !== 'Completed').map(t => `  * ${t.title} (${t.assignedTo || 'Unassigned'})`).join('\n') || '  * None'}
`;
      }

      return {
        contextText: contextHeader,
        meta,
        authorized: true,
        workspaceId: String(workspaceId),
        workspaceType: 'law_firm'
      };
    }

    // ------------------------------------------------------------------------
    // 3. ADVOCATE / PERSONAL WORKSPACE — AI LEGAL ASSISTANT
    // ------------------------------------------------------------------------
    const userDoc = await User.findById(userId).select('email').lean();
    const memberships = await WorkspaceMembership.find({
      $or: [{ userId }, { email: userDoc?.email }]
    }).lean();
    const firmWsIds = memberships.map(m => String(m.workspaceId)).filter(id => mongoose.Types.ObjectId.isValid(id));

    const personalCasesQuery = {
      userId,
      $or: [
        { workspaceId: 'personal_practice' },
        { workspaceId: `personal_${userId}` },
        { workspaceType: 'personal' },
        { workspaceId: { $exists: false } },
        { workspaceId: null },
        { workspaceId: '' }
      ]
    };

    if (firmWsIds.length > 0) {
      personalCasesQuery.workspaceId = { $nin: firmWsIds };
    }

    const personalCases = await Project.find(personalCasesQuery)
      .select('name caseType clientName clientMobileNumber opponentName court courtName judge status stage summary caseSummary nextHearingDate hearings tasks timeline evidence witnesses contracts')
      .sort({ updatedAt: -1 })
      .lean();

    const upcomingPersonalHearings = [];
    const pendingPersonalTasks = [];

    personalCases.forEach(c => {
      if (Array.isArray(c.hearings)) {
        c.hearings.forEach(h => {
          if (h.status === 'Scheduled' || h.status === 'Upcoming' || h.status === 'Pending') {
            upcomingPersonalHearings.push(`- Case "${c.name}": ${h.title || 'Hearing'} on ${h.date || 'Scheduled Date'}`);
          }
        });
      }
      if (Array.isArray(c.tasks)) {
        c.tasks.forEach(t => {
          if (t.status !== 'Completed' && t.status !== 'Rejected') {
            pendingPersonalTasks.push(`- Case "${c.name}": Task "${t.title}" (Priority: ${t.priority || 'Medium'})`);
          }
        });
      }
    });

    contextHeader += `### PERSONAL PRACTICE WORKSPACE CONTEXT:
- Active Workspace ID: ${workspaceId} (Personal Practice)
- Active Personal Cases Count: ${personalCases.length}

### PERSONAL CASES SUMMARY:
${personalCases.slice(0, 15).map(c => `- Case "${c.name}" | Client: ${c.clientName || 'N/A'} vs ${c.opponentName || 'N/A'} | Status: ${c.status || 'Active'} | Stage: ${c.stage || 'N/A'}`).join('\n') || '- No active personal practice cases.'}

### UPCOMING PERSONAL HEARINGS (${upcomingPersonalHearings.length}):
${upcomingPersonalHearings.slice(0, 10).join('\n') || '- No upcoming hearings.'}

### PENDING PERSONAL TASKS (${pendingPersonalTasks.length}):
${pendingPersonalTasks.slice(0, 10).join('\n') || '- No pending tasks.'}

### AVAILABLE PERSONAL PRACTICE AI TOOLS & CAPABILITIES:
1. AI Draft Maker: Draft court notices, petitions, affidavits, legal contracts, and written statements.
2. AI Evidence Checker: Evaluate exhibit strength, proof admissibility, and missing evidence.
3. AI Strategy Engine: Formulate winning litigation strategies, argument points, and counter-arguments.
4. AI Case Predictor: Evaluate trial risk factors, win/loss likelihood, and settlement ranges.
5. AI Precedent Finder: Search landmark Supreme Court & High Court judgments and citations.

ISOLATION GUARANTEE: AI Legal™ Assistant contains ONLY your Personal Practice data. It CANNOT access any Law Firm workspace cases, firm members, or firm tasks.
`;

    // Dynamic Intent-Based Retrieval for Case-Specific Queries inside Personal Practice
    let focusedPersonalCase = null;
    if (activeCaseId && mongoose.Types.ObjectId.isValid(activeCaseId)) {
      focusedPersonalCase = personalCases.find(c => String(c._id) === String(activeCaseId));
    }

    if (!focusedPersonalCase && (lowerPrompt.includes('case') || lowerPrompt.includes('summarize') || lowerPrompt.includes('detail'))) {
      personalCases.forEach(c => {
        if (c.name && lowerPrompt.includes(c.name.toLowerCase())) {
          focusedPersonalCase = c;
        }
      });
    }

    if (focusedPersonalCase) {
      contextHeader += `\n### FOCUSED PERSONAL CASE DETAIL ("${focusedPersonalCase.name}"):
- Case Name: ${focusedPersonalCase.name}
- Client: ${focusedPersonalCase.clientName || 'N/A'} (Mobile: ${focusedPersonalCase.clientMobileNumber || 'N/A'})
- Opponent: ${focusedPersonalCase.opponentName || 'N/A'} | Court: ${focusedPersonalCase.courtName || focusedPersonalCase.court || 'N/A'}
- Summary: ${focusedPersonalCase.summary || focusedPersonalCase.caseSummary || 'No summary recorded.'}
- Stage: ${focusedPersonalCase.stage || 'Pre-litigation'} | Priority: ${focusedPersonalCase.priority || 'Medium'}
- Timeline: ${(focusedPersonalCase.timeline || []).map(t => `  * [${t.date || 'N/A'}] ${t.title}: ${t.description || ''}`).join('\n') || '  * None'}
- Evidence: ${(focusedPersonalCase.evidence || []).map(e => `  * ${e.name} (${e.type || 'Doc'})`).join('\n') || '  * None'}
- Witnesses: ${(focusedPersonalCase.witnesses || []).map(w => `  * ${w.name} (${w.role || 'Witness'})`).join('\n') || '  * None'}
`;
    }

    return {
      contextText: contextHeader,
      meta,
      authorized: true,
      workspaceId: 'personal_practice',
      workspaceType: 'personal'
    };
  }
}

export default WorkspaceAIContextService;
