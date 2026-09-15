import Organization from '../models/Organization.js';
import User from '../models/User.js';

/**
 * 🏛️ Fetch all linked organizations and their enrolled students synced via Convee-Education
 */
export const getLinkedOrganizations = async (req, res) => {
  try {
    const orgRecords = await Organization.find({}).sort({ createdAt: -1 }).lean();

    // Collect all student emails to cross-reference with AI-Legal Users collection
    const studentEmails = orgRecords
      .map(r => (r.studentEmail || r.email || r.userEmail || '').toLowerCase().trim())
      .filter(Boolean);

    const registeredUsers = await User.find({
      email: { $in: studentEmails }
    }).select('_id name email role credits lastLogin accountStatus subscription createdAt').lean();

    const registeredUserMap = new Map();
    registeredUsers.forEach(u => {
      if (u.email) registeredUserMap.set(u.email.toLowerCase().trim(), u);
    });

    const now = new Date();
    const orgMap = new Map();

    for (const record of orgRecords) {
      const orgName = record.organizationName || record.name || 'Unnamed Institution';
      const orgSlug = record.organizationSlug || orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'partner-org';

      if (!orgMap.has(orgSlug)) {
        // Plan & Subscription determination
        const planObj = record.plan || {};
        const expiryDate = planObj.expiryDate || record.subscriptionExpiry || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
        const isExpired = new Date(expiryDate) < now;
        const isSubscribed = planObj.subscribed !== false && record.status !== 'suspended' && record.status !== 'inactive' && !isExpired;

        orgMap.set(orgSlug, {
          organizationName: orgName,
          organizationSlug: orgSlug,
          plan: {
            planId: planObj.planId || 'convee_institutional',
            planName: planObj.planName || 'Convee Institutional Academic Plan',
            subscribed: isSubscribed,
            status: isExpired ? 'expired' : (record.status || 'active'),
            startDate: planObj.startDate || record.createdAt || now,
            expiryDate,
            credits: planObj.credits || record.credits || 5000
          },
          isSubscribed,
          status: isExpired ? 'expired' : (record.status || 'active'),
          expiryDate,
          daysRemaining: Math.ceil((new Date(expiryDate) - now) / (1000 * 60 * 60 * 24)),
          source: record.source || 'convee-education',
          classes: new Set(),
          students: [],
          totalCreditsAllocated: 0,
          registeredUsersCount: 0
        });
      }

      const orgData = orgMap.get(orgSlug);

      if (record.className) {
        orgData.classes.add(record.className);
      }

      const emailKey = (record.studentEmail || record.email || record.userEmail || '').toLowerCase().trim();
      const matchedUser = emailKey ? registeredUserMap.get(emailKey) : null;

      if (matchedUser) {
        orgData.registeredUsersCount += 1;
      }

      const studentCredits = record.credits || (record.plan && record.plan.credits) || 5000;
      orgData.totalCreditsAllocated += studentCredits;

      // Only add to student list if student details or email exist
      if (record.studentName || record.studentEmail || record.studentId) {
        orgData.students.push({
          _id: record._id,
          studentName: record.studentName || (matchedUser ? matchedUser.name : 'Enrolled Student'),
          studentEmail: record.studentEmail || record.email || '',
          studentId: record.studentId || 'N/A',
          className: record.className || 'General Law',
          department: record.department || 'Faculty of Law',
          credits: studentCredits,
          status: record.status || 'active',
          syncedAt: record.syncedAt || record.createdAt || now,
          isRegisteredInAiLegal: !!matchedUser,
          aiLegalUserId: matchedUser?._id || null,
          aiLegalRole: matchedUser?.role || 'student',
          lastLogin: matchedUser?.lastLogin || null
        });
      }
    }

    // Format list for response
    const organizationsList = Array.from(orgMap.values()).map(org => ({
      ...org,
      classes: Array.from(org.classes),
      studentsCount: org.students.length
    }));

    // Summary Analytics
    const stats = {
      totalOrganizations: organizationsList.length,
      totalStudents: organizationsList.reduce((acc, curr) => acc + curr.studentsCount, 0),
      activeSubscriptions: organizationsList.filter(o => o.isSubscribed).length,
      totalCreditsAllocated: organizationsList.reduce((acc, curr) => acc + curr.totalCreditsAllocated, 0),
      totalRegisteredStudents: organizationsList.reduce((acc, curr) => acc + curr.registeredUsersCount, 0)
    };

    return res.status(200).json({
      success: true,
      stats,
      organizations: organizationsList
    });
  } catch (error) {
    console.error('[GET LINKED ORGANIZATIONS ERROR]:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch linked organizations', error: error.message });
  }
};

/**
 * 🔄 Toggle or update subscription status & validity for a linked organization
 */
export const toggleOrgSubscription = async (req, res) => {
  try {
    const { orgSlug } = req.params;
    const { subscribed, status, extendMonths } = req.body;

    if (!orgSlug) {
      return res.status(400).json({ success: false, message: 'Organization slug is required' });
    }

    const updateFields = {};

    if (subscribed !== undefined) {
      updateFields['plan.subscribed'] = Boolean(subscribed);
    }

    if (status) {
      updateFields['status'] = status;
      updateFields['plan.status'] = status;
    }

    if (extendMonths && Number(extendMonths) > 0) {
      const now = new Date();
      const newExpiry = new Date(now.setMonth(now.getMonth() + Number(extendMonths)));
      updateFields['plan.expiryDate'] = newExpiry;
      updateFields['subscriptionExpiry'] = newExpiry;
      updateFields['plan.subscribed'] = true;
      updateFields['status'] = 'active';
      updateFields['plan.status'] = 'active';
    }

    const result = await Organization.updateMany(
      { 
        $or: [
          { organizationSlug: orgSlug },
          { organizationSlug: orgSlug.toLowerCase() }
        ]
      },
      { $set: updateFields }
    );

    return res.status(200).json({
      success: true,
      message: `Organization subscription updated successfully. (${result.modifiedCount} records synced)`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('[TOGGLE ORG SUBSCRIPTION ERROR]:', error);
    return res.status(500).json({ success: false, message: 'Failed to update organization subscription', error: error.message });
  }
};

/**
 * 🌱 Seed sample Convee-Education partner institutions and students (if empty or on manual trigger)
 */
export const seedSampleConveeOrgs = async (req, res) => {
  try {
    const count = await Organization.countDocuments({ source: 'convee-education' });
    const { force } = req.query;

    if (count > 0 && force !== 'true') {
      return res.status(200).json({
        success: true,
        message: 'Convee organizations already exist in database',
        existingCount: count
      });
    }

    const sampleBatches = [
      // Institution 1: National Law University, Delhi
      {
        orgName: 'National Law University, Delhi',
        orgSlug: 'nlu-delhi',
        expiryDate: new Date(Date.now() + 320 * 24 * 60 * 60 * 1000), // ~11 months remaining
        students: [
          { name: 'Aarav Sharma', email: 'aarav.sharma@nludelhi.ac.in', id: 'NLU2024-041', class: 'BA.LLB (Hons) - 3rd Year' },
          { name: 'Priya Iyer', email: 'priya.iyer@nludelhi.ac.in', id: 'NLU2024-078', class: 'BA.LLB (Hons) - 3rd Year' },
          { name: 'Rohan Mehra', email: 'rohan.mehra@nludelhi.ac.in', id: 'NLU2023-012', class: 'LL.M (Corporate Law)' },
          { name: 'Ananya Verma', email: 'ananya.verma@nludelhi.ac.in', id: 'NLU2025-102', class: 'BA.LLB (Hons) - 1st Year' }
        ]
      },
      // Institution 2: Dharmashastra National Law University (DNLU), Jabalpur
      {
        orgName: 'Dharmashastra National Law University',
        orgSlug: 'dnlu-jabalpur',
        expiryDate: new Date(Date.now() + 270 * 24 * 60 * 60 * 1000), // ~9 months remaining
        students: [
          { name: 'Devendra Patel', email: 'devendra.patel@mpdnlu.ac.in', id: 'DNLU2023-022', class: 'BA.LLB - 4th Year' },
          { name: 'Kavita Singh', email: 'kavita.singh@mpdnlu.ac.in', id: 'DNLU2024-055', class: 'BA.LLB - 2nd Year' },
          { name: 'Sameer Khan', email: 'sameer.khan@mpdnlu.ac.in', id: 'DNLU2024-089', class: 'BA.LLB - 2nd Year' }
        ]
      },
      // Institution 3: Symbiosis Law School, Pune
      {
        orgName: 'Symbiosis Law School',
        orgSlug: 'sls-pune',
        expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // ~6 months remaining
        students: [
          { name: 'Ishita Kapoor', email: 'ishita.kapoor@symlaw.ac.in', id: 'SLS2022-114', class: 'BBA.LLB (Hons) - 5th Year' },
          { name: 'Nikhil Nair', email: 'nikhil.nair@symlaw.ac.in', id: 'SLS2023-044', class: 'BA.LLB - 3rd Year' },
          { name: 'Aditi Lakhera', email: 'aditi.lakhera@symlaw.ac.in', id: 'SLS2024-001', class: 'BA.LLB - 2nd Year' }
        ]
      }
    ];

    const recordsToInsert = [];
    for (const batch of sampleBatches) {
      for (const s of batch.students) {
        recordsToInsert.push({
          organizationName: batch.orgName,
          organizationSlug: batch.orgSlug,
          name: batch.orgName,
          studentName: s.name,
          studentEmail: s.email.toLowerCase().trim(),
          studentId: s.id,
          className: s.class,
          department: 'Department of Jurisprudence',
          plan: {
            planId: 'convee_institutional',
            planName: 'Convee Institutional Academic Plan',
            subscribed: true,
            status: 'active',
            startDate: new Date(),
            expiryDate: batch.expiryDate,
            credits: 5000
          },
          credits: 5000,
          status: 'active',
          subscriptionExpiry: batch.expiryDate,
          syncedAt: new Date(),
          source: 'convee-education',
          email: s.email.toLowerCase().trim(),
          userEmail: s.email.toLowerCase().trim()
        });
      }
    }

    const inserted = await Organization.insertMany(recordsToInsert);

    return res.status(201).json({
      success: true,
      message: `Successfully seeded ${inserted.length} students across ${sampleBatches.length} Convee partner organizations`,
      count: inserted.length
    });
  } catch (error) {
    console.error('[SEED CONVEE ORGS ERROR]:', error);
    return res.status(500).json({ success: false, message: 'Failed to seed sample Convee organizations', error: error.message });
  }
};
