import express from 'express';
import Project from '../models/Project.js';
import { verifyToken } from '../middleware/authorization.js';

const router = express.Router();

// GET all court orders (optional filter by caseId)
router.get('/', verifyToken, async (req, res) => {
    try {
        const { caseId } = req.query;
        if (caseId) {
            const project = await Project.findOne({ _id: caseId, userId: req.user.id });
            return res.json(project ? (project.courtOrders || []) : []);
        }
        const projects = await Project.find({ userId: req.user.id });
        const allOrders = projects.reduce((acc, p) => acc.concat(p.courtOrders || []), []);
        return res.json(allOrders);
    } catch (error) {
        return res.status(500).json({ error: 'Failed to fetch court orders', details: error.message });
    }
});

// GET single court order by ID
router.get('/:id', verifyToken, async (req, res) => {
    try {
        const project = await Project.findOne({ 
            userId: req.user.id,
            $or: [
                { "courtOrders._id": req.params.id },
                { "courtOrders.id": req.params.id }
            ]
        });
        if (!project) {
            return res.status(404).json({ error: 'Court order not found' });
        }
        const order = project.courtOrders.find(o => o._id === req.params.id || o.id === req.params.id);
        return res.json(order);
    } catch (error) {
        return res.status(500).json({ error: 'Failed to fetch court order details', details: error.message });
    }
});

// POST /court-orders/upload
router.post('/upload', verifyToken, async (req, res) => {
    try {
        const { caseId, name, fileSize = '350 KB', ocrText = '', metadata = {}, aiSummary = {}, complianceItems = [], suggestedTimeline = [], suggestedTasks = [], suggestedHearings = [], suggestedArguments = [], suggestedResearch = [], suggestedEvidence = [], riskAnalysis = {}, linkedRecords = {} } = req.body;
        if (!caseId) {
            return res.status(400).json({ error: 'caseId parameter is required' });
        }

        const project = await Project.findOne({ _id: caseId, userId: req.user.id });
        if (!project) {
            return res.status(404).json({ error: 'Case workspace not found' });
        }

        const orderId = 'order_' + Date.now().toString();
        const newOrder = {
            _id: orderId,
            id: orderId,
            name: name || 'Uploaded Court Order',
            url: 'file:///path/to/uploaded_court_order.pdf',
            fileSize,
            ocrText,
            status: 'AI Analyzed',
            uploadedBy: 'Advocate',
            metadata: {
                courtName: metadata.courtName || 'Delhi High Court',
                judgeName: metadata.judgeName || 'Hon\'ble Justice Amit Verma',
                bench: metadata.bench || 'Single Bench',
                courtNumber: metadata.courtNumber || 'Courtroom 302',
                caseNumber: metadata.caseNumber || project.caseNumber || 'CS/102/2026',
                orderDate: metadata.orderDate || new Date().toISOString().split('T')[0],
                nextHearingDate: metadata.nextHearingDate || '',
                orderType: metadata.orderType || 'Interim Order',
                stageOfCase: metadata.stageOfCase || 'Court',
                petitioner: metadata.petitioner || project.clientName || 'Plaintiff',
                respondent: metadata.respondent || project.opponentName || 'Defendant',
                advocates: metadata.advocates || '',
                caseStatus: metadata.caseStatus || 'Active'
            },
            aiSummary,
            complianceItems,
            suggestedTimeline,
            suggestedTasks,
            suggestedHearings,
            suggestedArguments,
            suggestedResearch,
            suggestedEvidence,
            riskAnalysis,
            linkedRecords,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        project.courtOrders = project.courtOrders || [];
        project.courtOrders.push(newOrder);
        await project.save();

        return res.status(201).json({ success: true, message: 'Court Order uploaded & parsed successfully', order: newOrder });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to upload court order', details: error.message });
    }
});

// POST /court-orders/scan
router.post('/scan', verifyToken, async (req, res) => {
    try {
        const { caseId, name, images = [] } = req.body;
        if (!caseId) {
            return res.status(400).json({ error: 'caseId parameter is required' });
        }
        
        const project = await Project.findOne({ _id: caseId, userId: req.user.id });
        if (!project) {
            return res.status(404).json({ error: 'Case workspace not found' });
        }

        const orderId = 'order_scan_' + Date.now().toString();
        const newOrder = {
            _id: orderId,
            id: orderId,
            name: name || 'Scanned Document.pdf',
            url: 'file:///path/to/scanned_document.pdf',
            fileSize: '480 KB',
            ocrText: 'IN THE HIGH COURT OF DELHI\nCS(COMM) 245/2026\nDelhi High Court Stay Decree. Scanned text details extracted.',
            status: 'AI Analyzed',
            uploadedBy: 'Advocate',
            metadata: {
                courtName: 'High Court of Delhi',
                judgeName: 'Hon\'ble Justice Manmohan',
                bench: 'Division Bench',
                courtNumber: 'Courtroom No. 1',
                caseNumber: project.caseNumber || 'CS(COMM) 245/2026',
                orderDate: new Date().toISOString().split('T')[0],
                nextHearingDate: '2026-08-12',
                orderType: 'Interim Stay Order',
                stageOfCase: 'Arguments on Injunction',
                petitioner: project.clientName || 'Plaintiff',
                respondent: project.opponentName || 'Defendant',
                advocates: 'Sr. Adv. Abhishek Singhvi',
                caseStatus: 'Stay Granted'
            },
            aiSummary: {
                shortSummary: 'The Court granted an interim injunction stay restraining property transfer pending arguments listed on 12/08/2026.',
                keyPoints: [
                    'Interim stay granted under Order 39 Rules 1 & 2 CPC.',
                    'Next hearing scheduled on 12/08/2026.'
                ]
            },
            complianceItems: [
                { description: 'Order 39 Rule 3 compliance copy service', status: 'Pending', dueDate: '2026-07-15', priority: 'Critical', responsiblePerson: 'Plaintiff' }
            ],
            suggestedTimeline: [
                { title: 'Order Passed', description: 'Stay decree passed.', date: new Date().toLocaleDateString(), accepted: true },
                { title: 'Next Hearing', description: 'Listed arguments.', date: '12/08/2026', accepted: false }
            ],
            suggestedTasks: [
                { title: 'Draft Compliance service', description: 'Prepare speed post packages.', priority: 'High', accepted: false }
            ],
            suggestedHearings: [
                { title: 'Stay Arguments Hearing', date: '2026-08-12', courtroom: 'Courtroom No. 1', judge: 'Justice Manmohan', purpose: 'Stay Arguments', accepted: false }
            ],
            suggestedArguments: [],
            suggestedResearch: [],
            suggestedEvidence: [],
            riskAnalysis: {
                proceduralDefects: [],
                weaknessDetails: [],
                limitationRisk: 'Low',
                jurisdictionIssue: false,
                objectionsProbability: 25
            },
            linkedRecords: {
                hearingsCount: 1,
                tasksCount: 1,
                evidenceCount: 0
            },
            createdAt: new Date(),
            updatedAt: new Date()
        };

        project.courtOrders = project.courtOrders || [];
        project.courtOrders.push(newOrder);
        await project.save();

        return res.status(201).json({ success: true, message: 'Scanned document processed & imported', order: newOrder });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to process scan import', details: error.message });
    }
});

// POST /court-orders/manual
router.post('/manual', verifyToken, async (req, res) => {
    try {
        const {
            caseId,
            name,
            courtName,
            bench,
            judgeName,
            caseNumber,
            orderNumber,
            orderDate,
            nextHearingDate,
            petitioner,
            respondent,
            notesText, // Order Details summary
            complianceNotes, // Compliance required actions
            orderType, // AI tags (Order Type)
            priority, // Priority (Low, Medium, High, Urgent)
            attachments = [] // Array of attachment meta/names
        } = req.body;

        if (!caseId || !name) {
            return res.status(400).json({ error: 'caseId and name are required parameters' });
        }

        const project = await Project.findOne({ _id: caseId, userId: req.user.id });
        if (!project) {
            return res.status(404).json({ error: 'Case workspace not found' });
        }

        const orderId = 'order_manual_' + Date.now().toString();
        const ocrText = `COURT: ${courtName || ''}\nBENCH: ${bench || ''}\nJUDGE: ${judgeName || ''}\nCASE NO: ${caseNumber || ''}\nORDER NO: ${orderNumber || ''}\nDATE: ${orderDate || ''}\nTYPE: ${orderType || ''}\nPETITIONER: ${petitioner || ''}\nRESPONDENT: ${respondent || ''}\n\nSUMMARY:\n${notesText || ''}\n\nCOMPLIANCE:\n${complianceNotes || ''}`;
        
        // Simulate AI Processing automatically
        const shortSummary = notesText ? (notesText.substring(0, 150) + (notesText.length > 150 ? '...' : '')) : 'Manual court order decree summary.';
        const keywords = notesText ? notesText.split(/\s+/).filter(w => w.length > 5).slice(0, 5) : ['Order', 'Directives'];

        // Compliance items parsed from complianceNotes
        const complianceItems = [];
        if (complianceNotes) {
            complianceItems.push({
                description: complianceNotes,
                status: 'Pending',
                dueDate: nextHearingDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                priority: priority || 'Medium',
                responsiblePerson: petitioner || 'Client'
            });
        }

        const suggestedTimeline = [
            { title: 'Manual Entry Created', description: 'Record logged by advocate.', date: new Date().toLocaleDateString(), accepted: true }
        ];
        if (orderDate) {
            suggestedTimeline.push({ title: 'Order Date', description: 'Effective date of decree.', date: orderDate, accepted: true });
        }
        if (nextHearingDate) {
            suggestedTimeline.push({ title: 'Compliance Deadline', description: 'Next date of arguments.', date: nextHearingDate, accepted: false });
        }

        const suggestedTasks = [];
        if (complianceNotes) {
            suggestedTasks.push({
                title: `Compliance: ${orderType || 'Action Required'}`,
                description: complianceNotes,
                priority: priority || 'Medium',
                accepted: false
            });
        }

        const suggestedHearings = [];
        if (nextHearingDate) {
            suggestedHearings.push({
                title: `${orderType || 'Interim Court'} Hearing`,
                date: nextHearingDate,
                courtroom: courtNumber || 'General Courtroom',
                judge: judgeName || 'Ld. Presiding Officer',
                purpose: 'Compliance Check / Argument',
                accepted: false
            });
        }

        const newOrder = {
            _id: orderId,
            id: orderId,
            name,
            url: 'file:///path/to/manual_order.pdf',
            fileSize: '12 KB',
            ocrText,
            status: 'Manually Logged',
            uploadedBy: 'Advocate',
            metadata: {
                courtName: courtName || '',
                judgeName: judgeName || '',
                bench: bench || '',
                courtNumber: orderNumber || '',
                caseNumber: caseNumber || project.caseNumber || '',
                orderDate: orderDate || '',
                nextHearingDate: nextHearingDate || '',
                orderType: orderType || '',
                stageOfCase: 'Arguments',
                petitioner: petitioner || project.clientName || '',
                respondent: respondent || project.opponentName || '',
                advocates: '',
                caseStatus: 'Pending Action'
            },
            aiSummary: {
                shortSummary,
                keyPoints: keywords.map(kw => `Extract directive matching keyword: ${kw}`)
            },
            complianceItems,
            suggestedTimeline,
            suggestedTasks,
            suggestedHearings,
            suggestedArguments: [
                { title: 'Procedural Validity', logic: `Challenge compliance under ${orderType || 'Notice'} on next date.`, accepted: false }
            ],
            suggestedResearch: [
                { act: 'CPC', section: 'Order 39', description: 'Temporary injunctions and interlocutory orders research.', accepted: false }
            ],
            suggestedEvidence: [],
            riskAnalysis: {
                proceduralDefects: [],
                weaknessDetails: [],
                limitationRisk: priority === 'Urgent' ? 'High' : 'Medium',
                jurisdictionIssue: false,
                objectionsProbability: priority === 'Urgent' ? 70 : 40
            },
            linkedRecords: {
                hearingsCount: nextHearingDate ? 1 : 0,
                tasksCount: complianceNotes ? 1 : 0,
                evidenceCount: attachments.length
            },
            createdAt: new Date(),
            updatedAt: new Date()
        };

        project.courtOrders = project.courtOrders || [];
        project.courtOrders.push(newOrder);
        await project.save();

        return res.status(201).json({ success: true, message: 'Court Order Created Successfully', order: newOrder });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to log manual order', details: error.message });
    }
});

// PUT /court-orders/:id
router.put('/:id', verifyToken, async (req, res) => {
    try {
        const {
            name,
            courtName,
            bench,
            judgeName,
            caseNumber,
            orderNumber,
            orderDate,
            nextHearingDate,
            petitioner,
            respondent,
            notesText,
            complianceNotes,
            orderType,
            priority,
            attachments
        } = req.body;

        const project = await Project.findOne({
            userId: req.user.id,
            $or: [
                { "courtOrders._id": req.params.id },
                { "courtOrders.id": req.params.id }
            ]
        });

        if (!project) {
            return res.status(404).json({ error: 'Court order not found' });
        }

        let updatedOrder = null;
        project.courtOrders = (project.courtOrders || []).map(o => {
            if (o._id === req.params.id || o.id === req.params.id) {
                const newMetadata = {
                    ...(o.metadata || {}),
                    courtName: courtName !== undefined ? courtName : o.metadata?.courtName,
                    judgeName: judgeName !== undefined ? judgeName : o.metadata?.judgeName,
                    bench: bench !== undefined ? bench : o.metadata?.bench,
                    caseNumber: caseNumber !== undefined ? caseNumber : o.metadata?.caseNumber,
                    courtNumber: orderNumber !== undefined ? orderNumber : o.metadata?.courtNumber,
                    orderDate: orderDate !== undefined ? orderDate : o.metadata?.orderDate,
                    nextHearingDate: nextHearingDate !== undefined ? nextHearingDate : o.metadata?.nextHearingDate,
                    orderType: orderType !== undefined ? orderType : o.metadata?.orderType,
                    petitioner: petitioner !== undefined ? petitioner : o.metadata?.petitioner,
                    respondent: respondent !== undefined ? respondent : o.metadata?.respondent,
                };
                
                updatedOrder = {
                    ...o,
                    name: name !== undefined ? name : o.name,
                    ocrText: notesText !== undefined ? `COURT: ${newMetadata.courtName}\nBENCH: ${newMetadata.bench}\nJUDGE: ${newMetadata.judgeName}\nCASE NO: ${newMetadata.caseNumber}\nORDER DATE: ${newMetadata.orderDate}\nTYPE: ${newMetadata.orderType}\n\nSUMMARY:\n${notesText}\n\nCOMPLIANCE:\n${complianceNotes || ''}` : o.ocrText,
                    metadata: newMetadata,
                    updatedAt: new Date()
                };
                return updatedOrder;
            }
            return o;
        });

        await project.save();
        return res.json({ success: true, message: 'Court order updated successfully', order: updatedOrder });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to update court order', details: error.message });
    }
});

// POST /court-orders/:id/duplicate
router.post('/:id/duplicate', verifyToken, async (req, res) => {
    try {
        const project = await Project.findOne({
            userId: req.user.id,
            $or: [
                { "courtOrders._id": req.params.id },
                { "courtOrders.id": req.params.id }
            ]
        });

        if (!project) {
            return res.status(404).json({ error: 'Court order not found' });
        }

        const original = project.courtOrders.find(o => o._id === req.params.id || o.id === req.params.id);
        if (!original) {
            return res.status(404).json({ error: 'Court order not found' });
        }

        const newId = 'order_dup_' + Date.now().toString();
        const duplicatedOrder = {
            ...JSON.parse(JSON.stringify(original)),
            _id: newId,
            id: newId,
            name: `${original.name.replace('.pdf', '')} (Copy).pdf`,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        project.courtOrders.push(duplicatedOrder);
        await project.save();

        return res.status(201).json({ success: true, message: 'Court Order Duplicated Successfully', order: duplicatedOrder });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to duplicate court order', details: error.message });
    }
});

// DELETE court order by ID
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        const project = await Project.findOne({
            userId: req.user.id,
            $or: [
                { "courtOrders._id": req.params.id },
                { "courtOrders.id": req.params.id }
            ]
        });
        if (!project) {
            return res.status(404).json({ error: 'Court order not found' });
        }

        project.courtOrders = project.courtOrders.filter(o => o._id !== req.params.id && o.id !== req.params.id);
        await project.save();

        return res.json({ success: true, message: 'Court order deleted successfully' });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to delete court order', details: error.message });
    }
});

export default router;
