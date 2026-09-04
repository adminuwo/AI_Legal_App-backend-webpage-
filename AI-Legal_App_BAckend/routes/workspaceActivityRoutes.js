import express from 'express';
import mongoose from 'mongoose';
import { verifyToken } from '../middleware/authorization.js';
import WorkspaceActivity from '../models/WorkspaceActivity.js';
import Project from '../models/Project.js';
import WorkspaceMembership from '../models/WorkspaceMembership.js';
import User from '../models/User.js';

const router = express.Router();

// Helper to determine if user is Firm Owner / Partner / Admin
const isSeniorRole = (membershipRole, userRole) => {
  const normMem = (membershipRole || '').toLowerCase();
  const normUser = (userRole || '').toLowerCase();
  return (
    normMem === 'owner' ||
    normMem === 'firm owner' ||
    normMem === 'managing partner' ||
    normMem === 'partner' ||
    normMem === 'administrator' ||
    normUser === 'super_admin' ||
    normUser === 'admin'
  );
};

// @desc    Get Workspace Activity Feed (Paginated, Searchable, Filterable with RBAC)
// @route   GET /api/workspace-activities/:workspaceId/activities
// @access  Private
router.get('/:workspaceId/activities', verifyToken, async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const {
      page = 1,
      limit = 20,
      caseId,
      category,
      actorId,
      search,
      sortBy = 'newest',
    } = req.query;

    const user = await User.findById(req.user.id);
    const membership = await WorkspaceMembership.findOne({ workspaceId, userId: req.user.id });

    const isOwner = isSeniorRole(membership?.role, user?.role);

    const query = { workspaceId };

    if (!isOwner) {
      // Junior Advocates & Interns: filter by cases they are assigned to or created
      const userCases = await Project.find({
        $or: [
          { userId: req.user.id },
          { assignedMembers: req.user.id },
          { assignedUserIds: req.user.id },
          { leadAdvocateUserId: req.user.id },
        ],
      }).select('_id');
      const caseIds = userCases.map((c) => c._id);
      query.$or = [{ caseId: { $in: caseIds } }, { actorId: req.user.id }];
    }

    if (caseId) query.caseId = caseId;
    if (category) query.activityCategory = category;
    if (actorId) query.actorId = actorId;

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { title: searchRegex },
          { action: searchRegex },
          { module: searchRegex },
          { caseName: searchRegex },
          { actorName: searchRegex },
          { description: searchRegex },
        ],
      });
    }

    const sortOrder = sortBy === 'oldest' ? 1 : -1;
    const skip = (Number(page) - 1) * Number(limit);

    const [activities, total] = await Promise.all([
      WorkspaceActivity.find(query)
        .sort({ createdAt: sortOrder })
        .skip(skip)
        .limit(Number(limit)),
      WorkspaceActivity.countDocuments(query),
    ]);

    res.json({
      success: true,
      activities,
      isOwner,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    console.error('[WORKSPACE ACTIVITY FEED ERROR]', err);
    res.status(500).json({ error: 'Failed to fetch workspace activity feed', details: err.message });
  }
});

// @desc    Get Case Specific Activity Feed
// @route   GET /api/workspace-activities/cases/:caseId/activities
// @access  Private
router.get('/cases/:caseId/activities', verifyToken, async (req, res) => {
  try {
    const { caseId } = req.params;
    const { page = 1, limit = 30, category, search } = req.query;

    const caseIdCond = [caseId];
    if (mongoose.Types.ObjectId.isValid(caseId)) {
      caseIdCond.push(new mongoose.Types.ObjectId(caseId));
    }

    const query = {
      caseId: { $in: caseIdCond },
      activityCategory: { $nin: ['CASE_CHAT', 'CHAT', 'TEAM_CHAT', 'CASE_TEAM_CHAT', 'chat'] },
      module: { $nin: ['CASE_CHAT', 'CHAT', 'TEAM_CHAT', 'CASE_TEAM_CHAT', 'case_chat', 'chat'] },
    };

    if (category && category !== 'All') {
      query.activityCategory = category;
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { title: searchRegex },
        { action: searchRegex },
        { module: searchRegex },
        { actorName: searchRegex },
        { description: searchRegex },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [activities, total] = await Promise.all([
      WorkspaceActivity.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      WorkspaceActivity.countDocuments(query),
    ]);

    const currentUserIdStr = String(req.user.id);
    const formattedActivities = activities.map(act => {
      const isRead = Array.isArray(act.readBy) && act.readBy.some(id => String(id) === currentUserIdStr);
      return {
        ...act,
        id: act._id.toString(),
        isRead
      };
    });

    res.json({
      success: true,
      activities: formattedActivities,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    console.error('[CASE ACTIVITY FEED ERROR]', err);
    res.status(500).json({ error: 'Failed to fetch case activities', details: err.message });
  }
});

// @desc    Get Unread Activity Count for a Case
// @route   GET /api/workspace-activities/cases/:caseId/unread-count
// @access  Private
router.get('/cases/:caseId/unread-count', verifyToken, async (req, res) => {
  try {
    const { caseId } = req.params;
    const caseIdCond = [caseId];
    if (mongoose.Types.ObjectId.isValid(caseId)) {
      caseIdCond.push(new mongoose.Types.ObjectId(caseId));
    }

    const userIdObj = mongoose.Types.ObjectId.isValid(req.user.id)
      ? new mongoose.Types.ObjectId(req.user.id)
      : req.user.id;

    const unreadCount = await WorkspaceActivity.countDocuments({
      caseId: { $in: caseIdCond },
      activityCategory: { $nin: ['CASE_CHAT', 'CHAT', 'TEAM_CHAT', 'CASE_TEAM_CHAT', 'chat'] },
      readBy: { $ne: userIdObj }
    });

    res.json({ success: true, unreadCount });
  } catch (err) {
    console.error('[CASE UNREAD COUNT ERROR]', err);
    res.status(500).json({ error: 'Failed to fetch unread count', details: err.message });
  }
});

// @desc    Mark All Activities as Read for a Case
// @route   PATCH /api/workspace-activities/cases/:caseId/mark-read
// @access  Private
router.patch('/cases/:caseId/mark-read', verifyToken, async (req, res) => {
  try {
    const { caseId } = req.params;
    const caseIdCond = [caseId];
    if (mongoose.Types.ObjectId.isValid(caseId)) {
      caseIdCond.push(new mongoose.Types.ObjectId(caseId));
    }

    const userIdObj = mongoose.Types.ObjectId.isValid(req.user.id)
      ? new mongoose.Types.ObjectId(req.user.id)
      : req.user.id;

    await WorkspaceActivity.updateMany(
      {
        caseId: { $in: caseIdCond },
        readBy: { $ne: userIdObj }
      },
      {
        $addToSet: { readBy: userIdObj }
      }
    );

    res.json({ success: true, message: 'Activities marked as read' });
  } catch (err) {
    console.error('[MARK CASE READ ERROR]', err);
    res.status(500).json({ error: 'Failed to mark activities read', details: err.message });
  }
});

// @desc    Get Single Activity Detail
// @route   GET /api/workspace-activities/detail/:id
// @access  Private
router.get('/detail/:id', verifyToken, async (req, res) => {
  try {
    const activity = await WorkspaceActivity.findById(req.params.id);
    if (!activity) {
      return res.status(404).json({ error: 'Activity record not found' });
    }

    const user = await User.findById(req.user.id);
    const membership = await WorkspaceMembership.findOne({
      workspaceId: activity.workspaceId,
      userId: req.user.id,
    });
    const isOwner = isSeniorRole(membership?.role, user?.role);

    res.json({ success: true, activity, isOwner });
  } catch (err) {
    console.error('[ACTIVITY DETAIL ERROR]', err);
    res.status(500).json({ error: 'Failed to fetch activity details', details: err.message });
  }
});

// @desc    Review Activity (Approve / Reject / Request Changes - Owner Only)
// @route   PATCH /api/workspace-activities/detail/:id/review
// @access  Private (Owner / Partner / Admin only)
router.patch('/detail/:id/review', verifyToken, async (req, res) => {
  try {
    const { reviewStatus, reviewNote } = req.body;
    if (!['Approved', 'Rejected', 'Changes Requested', 'Pending Review'].includes(reviewStatus)) {
      return res.status(400).json({ error: 'Invalid review status provided' });
    }

    const activity = await WorkspaceActivity.findById(req.params.id);
    if (!activity) {
      return res.status(404).json({ error: 'Activity record not found' });
    }

    const user = await User.findById(req.user.id);
    const membership = await WorkspaceMembership.findOne({
      workspaceId: activity.workspaceId,
      userId: req.user.id,
    });

    const isOwner = isSeniorRole(membership?.role, user?.role);
    if (!isOwner) {
      return res
        .status(403)
        .json({ error: 'Access denied: Only Firm Owner or Managing Partner can perform review actions.' });
    }

    activity.reviewStatus = reviewStatus;
    activity.reviewedBy = user ? user.fullName || user.name : 'Managing Partner';
    activity.reviewedByUserId = req.user.id;
    activity.reviewedAt = new Date();
    if (reviewNote !== undefined) activity.reviewNote = reviewNote;
    activity.status = reviewStatus === 'Approved' ? 'Approved' : reviewStatus === 'Rejected' ? 'Rejected' : 'Reviewed';

    await activity.save();

    res.json({ success: true, activity });
  } catch (err) {
    console.error('[REVIEW ACTIVITY ERROR]', err);
    res.status(500).json({ error: 'Failed to update review status', details: err.message });
  }
});

// @desc    Delete a single Workspace Activity record
// @route   DELETE /api/workspace-activities/detail/:id
// @access  Private
router.delete('/detail/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const idCond = [id];
    if (mongoose.Types.ObjectId.isValid(id)) {
      idCond.push(new mongoose.Types.ObjectId(id));
    }
    const result = await WorkspaceActivity.deleteMany({ _id: { $in: idCond } });
    res.json({ success: true, message: 'Activity deleted successfully', id, deletedCount: result.deletedCount });
  } catch (err) {
    console.error('[DELETE ACTIVITY ERROR]', err);
    res.status(500).json({ success: false, error: 'Failed to delete activity', details: err.message });
  }
});

// @desc    Clear all Workspace Activities for workspace/case
// @route   DELETE /api/workspace-activities/:workspaceId/clear-all
// @access  Private
router.delete('/:workspaceId/clear-all', verifyToken, async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { caseId } = req.query;

    const wsCond = [workspaceId];
    if (mongoose.Types.ObjectId.isValid(workspaceId)) {
      wsCond.push(new mongoose.Types.ObjectId(workspaceId));
    }

    let filter = {};
    if (caseId && caseId !== 'undefined' && caseId !== 'null') {
      const caseCond = [caseId];
      if (mongoose.Types.ObjectId.isValid(caseId)) {
        caseCond.push(new mongoose.Types.ObjectId(caseId));
      }
      filter = {
        $or: [
          { caseId: { $in: caseCond } },
          { workspaceId: { $in: wsCond } }
        ]
      };
    } else {
      filter = { workspaceId: { $in: wsCond } };
    }

    const result = await WorkspaceActivity.deleteMany(filter);
    console.log('[PERMANENT CLEAR ALL ACTIVITIES]', filter, 'Deleted count:', result.deletedCount);
    res.json({ success: true, message: 'All activities cleared successfully', deletedCount: result.deletedCount });
  } catch (err) {
    console.error('[CLEAR ALL ACTIVITIES ERROR]', err);
    res.status(500).json({ success: false, error: 'Failed to clear activities', details: err.message });
  }
});

export default router;
