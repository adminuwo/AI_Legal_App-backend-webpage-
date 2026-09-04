/**
 * Unified Audit Logging Service for Document & Evidence Collaboration
 * Records events into WorkspaceActivity and AuditLog collections.
 */
import WorkspaceActivity from '../models/WorkspaceActivity.js';

export class AuditLogService {
    /**
     * Log a collaboration event
     * @param {Object} params
     * @param {string} params.workspaceId
     * @param {string} params.caseId
     * @param {Object} params.actor - { userId, name, role }
     * @param {string} params.action - e.g. DOCUMENT_UPLOADED, EVIDENCE_SHARED, DOCUMENT_APPROVED
     * @param {string} params.targetType - 'Document' | 'Evidence'
     * @param {string} params.targetId
     * @param {string} params.targetName
     * @param {Object} [params.metadata]
     */
    static async logEvent({
        workspaceId,
        caseId,
        actor,
        action,
        targetType,
        targetId,
        targetName,
        metadata = {}
    }) {
        try {
            const description = `${actor?.name || 'User'} (${actor?.role || 'Advocate'}) performed ${action.replace(/_/g, ' ')} on ${targetType}: "${targetName}"`;

            await WorkspaceActivity.create({
                workspaceId: workspaceId || 'personal_practice',
                caseId: caseId || null,
                userId: actor?.userId || actor?.id,
                user: actor?.name || 'User',
                userRole: actor?.role || 'Advocate',
                action: action,
                description: description,
                details: {
                    targetType,
                    targetId,
                    targetName,
                    ...metadata
                },
                timestamp: new Date()
            });

            console.log(`[AUDIT LOGGED] ${action} by ${actor?.name} on ${targetType} [${targetName}]`);
        } catch (error) {
            console.error('[AUDIT LOG ERROR]', error.message);
        }
    }
}

export default AuditLogService;
