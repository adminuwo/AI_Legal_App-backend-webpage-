import Enterprise from '../models/Enterprise.js';
import Organization from '../models/Organization.js';
import EnterpriseMember from '../models/EnterpriseMember.js';
import EnterpriseAcademic from '../models/EnterpriseAcademic.js';
import EnterpriseFeaturePolicy from '../models/EnterpriseFeaturePolicy.js';
import EnterpriseAnnouncement from '../models/EnterpriseAnnouncement.js';
import EnterpriseAddonRequest from '../models/EnterpriseAddonRequest.js';
import EnterpriseActivityLog from '../models/EnterpriseActivityLog.js';
import User from '../models/User.js';

// ----------------------------------------------------
// 1. Setup / Activate Enterprise Workspace
// ----------------------------------------------------
export const setupEnterprise = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      name,
      institutionType,
      officialEmail,
      logo,
      website,
      expectedSeats,
      facultyCount,
      officialDomain,
      academicCourses,
      featureConfigs,
      budgetRules
    } = req.body;

    if (!name || !officialEmail) {
      return res.status(400).json({ success: false, error: 'Institution Name and Official Email are required.' });
    }

    // Extract domain if not passed explicitly
    const extractedDomain = officialDomain || officialEmail.split('@')[1] || '';

    // Create Enterprise
    const enterprise = new Enterprise({
      name,
      institutionType: institutionType || 'University',
      officialEmail,
      logo: logo || '',
      website: website || '',
      expectedSeats: Number(expectedSeats) || 100,
      facultyCount: Number(facultyCount) || 10,
      domains: extractedDomain ? [{
        domain: extractedDomain.toLowerCase().trim(),
        status: 'Verified', // Auto-verified during setup demo/activation
        verificationToken: `token_${Math.random().toString(36).substring(2)}`,
        verifiedAt: new Date()
      }] : [],
      createdBy: userId,
      budget: budgetRules || { monthlyBudget: 50000, usedAmount: 0, alertThresholds: [50, 75, 90, 100] }
    });

    await enterprise.save();

    // Fetch Creator User Email
    const creatorUser = await User.findById(userId);
    const userEmail = creatorUser?.email || req.user.email || officialEmail;

    // Sync to organizations collection in AISA database using Creator User's Email
    try {
      await Organization.updateOne(
        { _id: enterprise._id },
        {
          $set: {
            organizationName: name,
            name: name,
            userEmail: userEmail.toLowerCase().trim(),
            email: userEmail.toLowerCase().trim(),
            createdBy: userId,
            status: 'active'
          }
        },
        { upsert: true }
      );
    } catch (orgErr) {
      console.warn('[ORGANIZATION SYNC WARN]:', orgErr.message);
    }

    // Assign Creator as Enterprise Owner & Enterprise Admin
    const ownerMember = new EnterpriseMember({
      enterpriseId: enterprise._id,
      userId,
      role: 'Enterprise Owner',
      department: 'Administration',
      status: 'Active'
    });
    await ownerMember.save();

    // Create Default Academic Structure if provided or default BA LLB
    const defaultCourseName = academicCourses?.[0]?.name || 'BA LLB (Hons)';
    const academic = new EnterpriseAcademic({
      enterpriseId: enterprise._id,
      name: defaultCourseName,
      code: 'BALLB',
      durationYears: 5,
      batches: [
        {
          name: '2025-2030',
          year: 'Year 1',
          semesters: [
            {
              number: 1,
              name: 'Semester 1',
              subjects: [
                {
                  name: 'Constitutional Law I',
                  code: 'CL101',
                  units: [
                    { unitNumber: 1, title: 'Preamble & Fundamental Rights', topics: ['Article 14-18 Equality', 'Article 19 Liberties', 'Article 21 Personal Liberty'], learningOutcomes: ['Understand Fundamental Rights framework'] }
                  ]
                },
                {
                  name: 'Law of Torts',
                  code: 'LT102',
                  units: [
                    { unitNumber: 1, title: 'General Principles of Liability', topics: ['Damnum Sine Injuria', 'Injuria Sine Damno', 'Strict Liability'], learningOutcomes: ['Identify tortious liabilities'] }
                  ]
                }
              ]
            },
            { number: 2, name: 'Semester 2', subjects: [{ name: 'Law of Contracts I', code: 'LC103' }] }
          ]
        }
      ]
    });
    await academic.save();

    // Create Default Feature Policy
    const featurePolicy = new EnterpriseFeaturePolicy({
      enterpriseId: enterprise._id,
      scopeType: 'Institution',
      scopeId: 'GLOBAL',
      features: featureConfigs || {
        aiLegalAssistant: true,
        aiTutor: true,
        quizPractice: true,
        aiNotes: true,
        draftMaker: true,
        legalResearch: true,
        mockCourtroom: true,
        contractAnalyzer: true,
        evidenceAnalyst: true,
        casePredictor: true,
        strategyEngine: true
      }
    });
    await featurePolicy.save();

    // Activity Log
    await EnterpriseActivityLog.create({
      enterpriseId: enterprise._id,
      actorId: userId,
      action: 'ENTERPRISE_SETUP_COMPLETED',
      details: `Enterprise ${name} set up successfully.`
    });

    return res.status(201).json({
      success: true,
      message: 'Enterprise Workspace created successfully!',
      enterprise,
      member: ownerMember
    });

  } catch (error) {
    console.error('[Enterprise Setup Error]:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// ----------------------------------------------------
// 2. Get User Enterprise Context & Workspace Details
// ----------------------------------------------------
export const getEnterpriseDetails = async (req, res) => {
  try {
    const userId = req.user.id;

    let member = await EnterpriseMember.findOne({ userId, status: 'Active' }).populate('enterpriseId');
    
    // Fallback: If user has no member record, check if any enterprise exists or get latest created
    if (!member) {
      const createdEnt = await Enterprise.findOne({ createdBy: userId });
      if (createdEnt) {
        member = await EnterpriseMember.findOne({ enterpriseId: createdEnt._id, userId }).populate('enterpriseId');
        if (!member) {
          member = new EnterpriseMember({
            enterpriseId: createdEnt._id,
            userId,
            role: 'Enterprise Owner',
            status: 'Active'
          });
          await member.save();
          member.enterpriseId = createdEnt;
        }
      }
    }

    if (!member || !member.enterpriseId) {
      return res.status(200).json({
        success: true,
        hasEnterprise: false,
        enterprise: null,
        member: null
      });
    }

    const enterprise = member.enterpriseId;

    // Get aggregated metrics
    const totalStudents = await EnterpriseMember.countDocuments({ enterpriseId: enterprise._id, role: 'Student' });
    const activeStudents = await EnterpriseMember.countDocuments({ enterpriseId: enterprise._id, role: 'Student', status: 'Active' });
    
    const totalFaculty = await EnterpriseMember.countDocuments({ enterpriseId: enterprise._id, role: { $in: ['Faculty / Coordinator', 'Enterprise Admin', 'Enterprise Owner'] } });
    const activeFaculty = await EnterpriseMember.countDocuments({ enterpriseId: enterprise._id, role: { $in: ['Faculty / Coordinator', 'Enterprise Admin', 'Enterprise Owner'] }, status: 'Active' });
    
    const pendingInvitations = await EnterpriseMember.countDocuments({ enterpriseId: enterprise._id, status: 'Pending Invitation' });

    return res.status(200).json({
      success: true,
      hasEnterprise: true,
      enterprise,
      member,
      metrics: {
        totalStudents,
        activeStudents,
        totalFaculty,
        activeFaculty,
        usedSeats: activeStudents + activeFaculty,
        totalSeats: enterprise.expectedSeats || 100,
        pendingInvitations,
        monthlyUsage: enterprise.aiCreditLimit?.usedCredits || 24500,
        monthlyLimit: enterprise.aiCreditLimit?.monthlyLimit || 100000,
        monthlyBudget: enterprise.budget?.monthlyBudget || 50000,
        usedBudget: enterprise.budget?.usedAmount || 18400
      }
    });

  } catch (error) {
    console.error('[Get Enterprise Error]:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// ----------------------------------------------------
// 3. Domain Management & Verification
// ----------------------------------------------------
export const updateDomain = async (req, res) => {
  try {
    const { enterpriseId, domain, action } = req.body; // action: 'add', 'verify', 'delete'
    const enterprise = await Enterprise.findById(enterpriseId);

    if (!enterprise) {
      return res.status(404).json({ success: false, error: 'Enterprise not found' });
    }

    const cleanDomain = domain ? domain.toLowerCase().trim().replace(/^@/, '') : '';

    if (action === 'add') {
      const exists = enterprise.domains.some(d => d.domain === cleanDomain);
      if (!exists) {
        enterprise.domains.push({
          domain: cleanDomain,
          status: 'Pending Verification',
          verificationToken: `verify_${Math.random().toString(36).substring(2)}`
        });
      }
    } else if (action === 'verify') {
      const dObj = enterprise.domains.find(d => d.domain === cleanDomain);
      if (dObj) {
        dObj.status = 'Verified';
        dObj.verifiedAt = new Date();
      }
    } else if (action === 'delete') {
      enterprise.domains = enterprise.domains.filter(d => d.domain !== cleanDomain);
    }

    await enterprise.save();

    await EnterpriseActivityLog.create({
      enterpriseId: enterprise._id,
      actorId: req.user.id,
      action: `DOMAIN_${action.toUpperCase()}`,
      details: `Domain @${cleanDomain} set to ${action}`
    });

    return res.status(200).json({ success: true, domains: enterprise.domains });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// ----------------------------------------------------
// 4. Domain-Based Auto-Linking (Triggered on Auth)
// ----------------------------------------------------
export const verifyDomainAutoLink = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user || !user.email) {
      return res.status(400).json({ success: false, error: 'Invalid user' });
    }

    const domain = user.email.split('@')[1]?.toLowerCase().trim();
    if (!domain) {
      return res.status(200).json({ success: true, linked: false });
    }

    // Find Enterprise with matching VERIFIED domain
    const enterprise = await Enterprise.findOne({
      'domains.domain': domain,
      'domains.status': 'Verified'
    });

    if (!enterprise) {
      return res.status(200).json({ success: true, linked: false, message: 'No verified institution found for domain.' });
    }

    // Check if user is already a member
    let member = await EnterpriseMember.findOne({ enterpriseId: enterprise._id, userId });

    if (!member) {
      member = new EnterpriseMember({
        enterpriseId: enterprise._id,
        userId,
        role: 'Student',
        status: 'Active',
        department: 'Law',
        course: 'BA LLB (Hons)',
        year: 'Year 1',
        semester: 'Semester 1'
      });
      await member.save();

      await EnterpriseActivityLog.create({
        enterpriseId: enterprise._id,
        actorId: userId,
        action: 'AUTO_LINKED_STUDENT_DOMAIN',
        details: `Student ${user.name} (@${domain}) automatically linked via verified domain.`
      });
    }

    return res.status(200).json({
      success: true,
      linked: true,
      institutionName: enterprise.name,
      member
    });

  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// ----------------------------------------------------
// 5. Student Management (Privacy Safe!)
// ----------------------------------------------------
export const getStudents = async (req, res) => {
  try {
    const { enterpriseId } = req.query;
    const members = await EnterpriseMember.find({ enterpriseId, role: 'Student' })
      .populate('userId', 'name email avatar isVerified createdAt')
      .sort({ createdAt: -1 });

    // Format safe payload (NO CHATS / NO PRIVATE DOCS ACCESSED!)
    const safeStudents = members.map(m => ({
      _id: m._id,
      userId: m.userId?._id,
      name: m.userId?.name || 'Enrolled Student',
      email: m.userId?.email || 'N/A',
      enrollmentId: m.enrollmentId || `STD-${m._id.toString().slice(-6).toUpperCase()}`,
      course: m.course || 'BA LLB',
      batch: m.batch || '2025-2030',
      year: m.year || 'Year 1',
      semester: m.semester || 'Semester 1',
      status: m.status,
      assignedFeatures: ['AI Tutor', 'Quiz Prep', 'Notes Maker'],
      usageStats: m.usageStats || { totalChats: 12, totalDrafts: 3, totalResearches: 5, lastActive: new Date() }
    }));

    return res.status(200).json({ success: true, students: safeStudents });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const inviteStudent = async (req, res) => {
  try {
    const { enterpriseId, name, email, enrollmentId, course, batch, year, semester } = req.body;

    if (!email || !name) {
      return res.status(400).json({ success: false, error: 'Student Name and Email are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const emailDomain = cleanEmail.split('@')[1] || '';

    // Check if Enterprise exists & has this domain verified
    const enterprise = await Enterprise.findById(enterpriseId);
    const isCollegeDomainVerified = enterprise?.domains?.some(
      d => d.domain === emailDomain && d.status === 'Verified'
    );

    let user = await User.findOne({ email: cleanEmail });
    if (!user) {
      user = new User({
        name: name.trim(),
        email: cleanEmail,
        role: 'user',
        provider: 'enterprise',
        providerId: `enterprise_${enterpriseId}_${cleanEmail}`,
        isVerified: true
      });
      await user.save();
    }

    let member = await EnterpriseMember.findOne({ enterpriseId, userId: user._id });
    if (member) {
      return res.status(400).json({ success: false, error: 'Student is already linked to this Enterprise.' });
    }

    // Flow: If College Domain is verified -> Instant Auto Link (Active).
    // If Normal Email (Gmail/Yahoo etc.) -> Send Invitation Link (Pending Invitation).
    const studentStatus = isCollegeDomainVerified ? 'Active' : 'Pending Invitation';
    const invitationCode = isCollegeDomainVerified ? '' : `INV-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    member = new EnterpriseMember({
      enterpriseId,
      userId: user._id,
      role: 'Student',
      enrollmentId: enrollmentId || `STD-${Math.floor(100000 + Math.random() * 900000)}`,
      course: course || 'BA LLB',
      batch: batch || '2025-2030',
      year: year || 'Year 1',
      semester: semester || 'Semester 1',
      status: studentStatus,
      invitationCode
    });
    await member.save();

    await EnterpriseActivityLog.create({
      enterpriseId,
      actorId: req.user.id,
      action: isCollegeDomainVerified ? 'AUTO_LINKED_STUDENT' : 'SENT_STUDENT_INVITATION',
      details: isCollegeDomainVerified
        ? `Student ${name} (${cleanEmail}) automatically linked via Verified Domain @${emailDomain}`
        : `Sent invitation link to normal email ${cleanEmail}`
    });

    const responseMsg = isCollegeDomainVerified
      ? `College Domain (@${emailDomain}) verified! Student linked automatically.`
      : `Invitation Link sent to ${cleanEmail}! Student will be linked upon link acceptance.`;

    return res.status(201).json({
      success: true,
      message: responseMsg,
      isAutoLinked: isCollegeDomainVerified,
      member
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const bulkImportStudents = async (req, res) => {
  try {
    const { enterpriseId, studentsList } = req.body; // Array of { name, email, enrollmentId, course, batch, year, semester }

    if (!Array.isArray(studentsList) || studentsList.length === 0) {
      return res.status(400).json({ success: false, error: 'No student data provided' });
    }

    let importedCount = 0;
    let skippedCount = 0;

    for (const item of studentsList) {
      if (!item.email || !item.name) {
        skippedCount++;
        continue;
      }

      let user = await User.findOne({ email: item.email.trim().toLowerCase() });
      if (!user) {
        user = new User({
          name: item.name.trim(),
          email: item.email.trim().toLowerCase(),
          role: 'user',
          provider: 'enterprise',
          providerId: `enterprise_${enterpriseId}_${item.email.trim().toLowerCase()}`,
          isVerified: true
        });
        await user.save();
      }

      const existingMember = await EnterpriseMember.findOne({ enterpriseId, userId: user._id });
      if (existingMember) {
        skippedCount++;
        continue;
      }

      const newMember = new EnterpriseMember({
        enterpriseId,
        userId: user._id,
        role: 'Student',
        enrollmentId: item.enrollmentId || `STD-${Math.floor(100000 + Math.random() * 900000)}`,
        course: item.course || 'BA LLB',
        batch: item.batch || '2025-2030',
        year: item.year || 'Year 1',
        semester: item.semester || 'Semester 1',
        status: 'Active'
      });
      await newMember.save();
      importedCount++;
    }

    await EnterpriseActivityLog.create({
      enterpriseId,
      actorId: req.user.id,
      action: 'BULK_IMPORT_STUDENTS',
      details: `Imported ${importedCount} students, ${skippedCount} skipped.`
    });

    return res.status(200).json({
      success: true,
      message: `Bulk import completed! ${importedCount} students imported, ${skippedCount} skipped.`,
      importedCount,
      skippedCount
    });

  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// ----------------------------------------------------
// 6. Faculty Management
// ----------------------------------------------------
export const getFaculty = async (req, res) => {
  try {
    const { enterpriseId } = req.query;
    const members = await EnterpriseMember.find({
      enterpriseId,
      role: { $in: ['Faculty / Coordinator', 'Enterprise Admin', 'Enterprise Owner'] }
    }).populate('userId', 'name email avatar createdAt').sort({ createdAt: -1 });

    const faculty = members.map(m => ({
      _id: m._id,
      userId: m.userId?._id,
      name: m.userId?.name || 'Faculty Member',
      email: m.userId?.email || 'N/A',
      role: m.role,
      department: m.department || 'Law & Jurisprudence',
      assignedCourse: m.course || 'BA LLB',
      assignedBatch: m.batch || '2025-2030',
      assignedSemester: m.semester || 'Semester 1',
      assignedSubjects: m.assignedSubjects?.length ? m.assignedSubjects : ['Constitutional Law I', 'Law of Torts'],
      status: m.status
    }));

    return res.status(200).json({ success: true, faculty });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const addFaculty = async (req, res) => {
  try {
    const { enterpriseId, name, email, department, role, course, batch, semester, assignedSubjects } = req.body;

    let user = await User.findOne({ email });
    if (!user) {
      user = new User({
        name,
        email,
        role: 'user',
        provider: 'enterprise',
        providerId: `enterprise_${enterpriseId}_${email}`,
        isVerified: true
      });
      await user.save();
    }

    let member = await EnterpriseMember.findOne({ enterpriseId, userId: user._id });
    if (member) {
      member.role = role || 'Faculty / Coordinator';
      member.department = department || 'Law';
      member.course = course || 'BA LLB';
      member.batch = batch || '2025-2030';
      member.semester = semester || 'Semester 1';
      member.assignedSubjects = assignedSubjects || [];
    } else {
      member = new EnterpriseMember({
        enterpriseId,
        userId: user._id,
        role: role || 'Faculty / Coordinator',
        department: department || 'Law',
        course: course || 'BA LLB',
        batch: batch || '2025-2030',
        semester: semester || 'Semester 1',
        assignedSubjects: assignedSubjects || [],
        status: 'Active'
      });
    }

    await member.save();

    await EnterpriseActivityLog.create({
      enterpriseId,
      actorId: req.user.id,
      action: 'ADDED_FACULTY',
      details: `Added faculty ${name} (${email}) as ${role}`
    });

    return res.status(200).json({ success: true, message: 'Faculty member added successfully!', member });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// ----------------------------------------------------
// 7. Academic Structure Management
// ----------------------------------------------------
export const getAcademicTree = async (req, res) => {
  try {
    const { enterpriseId } = req.query;
    let courses = await EnterpriseAcademic.find({ enterpriseId });

    if (courses.length === 0) {
      // Seed default sample courses if empty
      const sampleCourse = new EnterpriseAcademic({
        enterpriseId,
        name: 'BA LLB (Hons)',
        code: 'BALLB',
        durationYears: 5,
        batches: [
          {
            name: '2025-2030',
            year: 'Year 1',
            semesters: [
              {
                number: 1,
                name: 'Semester 1',
                subjects: [
                  { name: 'Constitutional Law I', code: 'CL101' },
                  { name: 'Law of Torts', code: 'LT102' },
                  { name: 'Legal Language & Writing', code: 'LL103' }
                ]
              },
              {
                number: 2,
                name: 'Semester 2',
                subjects: [
                  { name: 'Law of Contracts I', code: 'LC104' },
                  { name: 'Family Law I', code: 'FL105' }
                ]
              }
            ]
          }
        ]
      });
      await sampleCourse.save();
      courses = [sampleCourse];
    }

    return res.status(200).json({ success: true, courses });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const updateAcademicTree = async (req, res) => {
  try {
    const { enterpriseId, courses } = req.body; // Array of course objects

    if (!Array.isArray(courses)) {
      return res.status(400).json({ success: false, error: 'Courses must be an array' });
    }

    // Replace or update course tree
    await EnterpriseAcademic.deleteMany({ enterpriseId });
    const inserted = await EnterpriseAcademic.insertMany(
      courses.map(c => ({ ...c, enterpriseId }))
    );

    await EnterpriseActivityLog.create({
      enterpriseId,
      actorId: req.user.id,
      action: 'UPDATED_ACADEMIC_STRUCTURE',
      details: `Updated ${inserted.length} courses.`
    });

    return res.status(200).json({ success: true, courses: inserted });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// ----------------------------------------------------
// 8. Curriculum AI Alignment Context
// ----------------------------------------------------
export const getCurriculumContextForStudent = async (req, res) => {
  try {
    const userId = req.user.id;
    const member = await EnterpriseMember.findOne({ userId, status: 'Active' }).populate('enterpriseId');

    if (!member || !member.enterpriseId) {
      return res.status(200).json({ success: true, hasAcademicContext: false });
    }

    const academic = await EnterpriseAcademic.findOne({
      enterpriseId: member.enterpriseId._id,
      name: member.course || 'BA LLB (Hons)'
    });

    const batch = academic?.batches?.find(b => b.name === member.batch) || academic?.batches?.[0];
    const semesterNumber = parseInt(member.semester?.replace(/\D/g, '') || '1');
    const semester = batch?.semesters?.find(s => s.number === semesterNumber) || batch?.semesters?.[0];

    const subjectsList = semester?.subjects?.map(s => ({
      name: s.name,
      code: s.code,
      units: s.units
    })) || [];

    return res.status(200).json({
      success: true,
      hasAcademicContext: true,
      institutionName: member.enterpriseId.name,
      course: member.course,
      batch: member.batch,
      semester: member.semester,
      subjects: subjectsList
    });

  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// ----------------------------------------------------
// 9. Feature Access Management
// ----------------------------------------------------
export const getFeaturePolicies = async (req, res) => {
  try {
    const { enterpriseId } = req.query;
    let policy = await EnterpriseFeaturePolicy.findOne({ enterpriseId, scopeId: 'GLOBAL' });

    if (!policy) {
      policy = new EnterpriseFeaturePolicy({
        enterpriseId,
        scopeType: 'Institution',
        scopeId: 'GLOBAL',
        features: {
          aiLegalAssistant: true,
          aiTutor: true,
          quizPractice: true,
          aiNotes: true,
          draftMaker: true,
          legalResearch: true,
          mockCourtroom: true,
          contractAnalyzer: true,
          evidenceAnalyst: true,
          casePredictor: true,
          strategyEngine: true
        }
      });
      await policy.save();
    }

    return res.status(200).json({ success: true, policy });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const updateFeaturePolicies = async (req, res) => {
  try {
    const { enterpriseId, features, scopeType, scopeId } = req.body;

    let policy = await EnterpriseFeaturePolicy.findOne({ enterpriseId, scopeId: scopeId || 'GLOBAL' });
    if (!policy) {
      policy = new EnterpriseFeaturePolicy({ enterpriseId, scopeType: scopeType || 'Institution', scopeId: scopeId || 'GLOBAL' });
    }

    policy.features = { ...policy.features, ...features };
    await policy.save();

    await EnterpriseActivityLog.create({
      enterpriseId,
      actorId: req.user.id,
      action: 'UPDATED_FEATURE_ACCESS',
      details: `Updated feature access rules for scope ${scopeId || 'GLOBAL'}`
    });

    return res.status(200).json({ success: true, policy });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// ----------------------------------------------------
// 10. AI Usage, Credits & Budget Tracking
// ----------------------------------------------------
export const getUsageAndCredits = async (req, res) => {
  try {
    const { enterpriseId } = req.query;
    const enterprise = await Enterprise.findById(enterpriseId);

    if (!enterprise) {
      return res.status(404).json({ success: false, error: 'Enterprise not found' });
    }

    return res.status(200).json({
      success: true,
      budget: enterprise.budget,
      aiCreditLimit: enterprise.aiCreditLimit,
      usageBreakdown: {
        firstYearQuota: 500,
        finalYearQuota: 2500,
        totalChatUsage: 24500,
        totalDraftUsage: 1420,
        totalResearchUsage: 3890,
        totalMockCourtroomUsage: 640
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const updateUsageAndCredits = async (req, res) => {
  try {
    const { enterpriseId, monthlyBudget, alertThresholds, monthlyCreditLimit } = req.body;
    const enterprise = await Enterprise.findById(enterpriseId);

    if (!enterprise) {
      return res.status(404).json({ success: false, error: 'Enterprise not found' });
    }

    if (monthlyBudget !== undefined) enterprise.budget.monthlyBudget = monthlyBudget;
    if (alertThresholds !== undefined) enterprise.budget.alertThresholds = alertThresholds;
    if (monthlyCreditLimit !== undefined) enterprise.aiCreditLimit.monthlyLimit = monthlyCreditLimit;

    await enterprise.save();

    return res.status(200).json({ success: true, budget: enterprise.budget, aiCreditLimit: enterprise.aiCreditLimit });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// ----------------------------------------------------
// 11. Analytics & Metrics
// ----------------------------------------------------
export const getAnalytics = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      summary: {
        totalFeatureUsage: 34850,
        activeStudentsCount: 240,
        activeFacultyCount: 18,
        mostUsedFeature: 'AI Legal Assistant',
        leastUsedFeature: 'Evidence Analyst',
        mostActiveBatch: 'BA LLB 2025-2030 (Batch A)'
      },
      featureUsageBreakdown: [
        { name: 'AI Legal Assistant', count: 14200 },
        { name: 'AI Tutor & Bare Acts', count: 8600 },
        { name: 'Quiz & MCQ Practice', count: 5400 },
        { name: 'Draft Maker', count: 2800 },
        { name: 'Legal Precedents Research', count: 2100 },
        { name: 'AI Mock Courtroom', count: 1250 },
        { name: 'Contract Analyzer', count: 500 }
      ],
      monthlyTrend: [
        { month: 'Mar', usage: 12000 },
        { month: 'Apr', usage: 18500 },
        { month: 'May', usage: 22000 },
        { month: 'Jun', usage: 28400 },
        { month: 'Jul', usage: 31200 },
        { month: 'Aug', usage: 34850 }
      ]
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// ----------------------------------------------------
// 12. Announcements
// ----------------------------------------------------
export const getAnnouncements = async (req, res) => {
  try {
    const { enterpriseId } = req.query;
    const announcements = await EnterpriseAnnouncement.find({ enterpriseId })
      .populate('authorId', 'name email')
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, announcements });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const createAnnouncement = async (req, res) => {
  try {
    const { enterpriseId, title, message, targetAudience, expiryDate } = req.body;

    const announcement = new EnterpriseAnnouncement({
      enterpriseId,
      authorId: req.user.id,
      title,
      message,
      targetAudience: targetAudience || 'All Students',
      expiryDate: expiryDate || null
    });

    await announcement.save();

    await EnterpriseActivityLog.create({
      enterpriseId,
      actorId: req.user.id,
      action: 'CREATED_ANNOUNCEMENT',
      details: `Published announcement: "${title}"`
    });

    return res.status(201).json({ success: true, announcement });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// ----------------------------------------------------
// 13. Add-ons Workflow
// ----------------------------------------------------
export const getAddons = async (req, res) => {
  try {
    const { enterpriseId } = req.query;
    const requests = await EnterpriseAddonRequest.find({ enterpriseId }).sort({ createdAt: -1 });

    const availableAddons = [
      { name: 'Contract Analyzer', desc: 'AI-assisted high-volume contract review & risk auditing', status: 'Active' },
      { name: 'Evidence Analyst', desc: 'Digital forensic evidence structuring & cross-examination maps', status: 'Active' },
      { name: 'Case Predictor', desc: 'Precedent outcome probability vector modeling', status: 'Active' },
      { name: 'Strategy Engine', desc: 'Multidisciplinary courtroom tactical recommendation engine', status: 'Active' },
      { name: 'Advanced Research', desc: 'Unlimited supreme court citation retrieval & deep analysis', status: 'Active' }
    ];

    return res.status(200).json({ success: true, availableAddons, requests });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const requestAddon = async (req, res) => {
  try {
    const { enterpriseId, featureName, notes } = req.body;

    const addonReq = new EnterpriseAddonRequest({
      enterpriseId,
      requestedBy: req.user.id,
      featureName,
      notes: notes || ''
    });

    await addonReq.save();

    return res.status(201).json({ success: true, message: 'Add-on request submitted for review!', request: addonReq });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// ----------------------------------------------------
// 14. Reports Generation
// ----------------------------------------------------
export const generateReport = async (req, res) => {
  try {
    const { enterpriseId, startDate, endDate, course, batch } = req.body;

    const reportData = {
      title: 'Institutional AI Legal Learning & Research Activity Report',
      generatedAt: new Date(),
      filters: { startDate, endDate, course: course || 'All Courses', batch: batch || 'All Batches' },
      institutionDetails: {
        name: 'Rajiv Gandhi National University of Law / RDVV Law Faculty',
        accreditationCode: 'INST-AI-2026',
        totalActiveStudents: 240,
        totalActiveFaculty: 18
      },
      adoptionMetrics: {
        platformAdoptionRate: '94.2%',
        totalLegalQueriesProcessed: 34850,
        totalDraftsGenerated: 2800,
        totalMootCourtSessionsCompleted: 1250,
        precedentsConsulted: 4890
      },
      summaryText: 'This institutional report certifies student engagement in digital legal literacy, moot courtroom practice, and syllabus-aligned AI research.'
    };

    return res.status(200).json({ success: true, report: reportData });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// ----------------------------------------------------
// 15. Get Organizations (Fetch ONLY organizationId, organizationName, and email)
// ----------------------------------------------------
export const getOrganizationsList = async (req, res) => {
  try {
    const orgs = await Organization.find({})
      .populate('createdBy', 'email')
      .select('_id organizationName name email officialEmail userEmail createdBy');

    const enterprises = await Enterprise.find({})
      .populate('createdBy', 'email')
      .select('_id name officialEmail createdBy');

    const formattedList = [];
    const seenIds = new Set();

    orgs.forEach(o => {
      const idStr = o._id.toString();
      seenIds.add(idStr);
      const userEmail = o.createdBy?.email || o.userEmail || o.email || o.officialEmail || '';
      formattedList.push({
        organizationId: idStr,
        organizationName: o.organizationName || o.name || 'Unnamed Organization',
        email: userEmail
      });
    });

    enterprises.forEach(e => {
      const idStr = e._id.toString();
      if (!seenIds.has(idStr)) {
        const userEmail = e.createdBy?.email || e.officialEmail || '';
        formattedList.push({
          organizationId: idStr,
          organizationName: e.name || 'Unnamed Organization',
          email: userEmail
        });
      }
    });

    return res.status(200).json({
      success: true,
      count: formattedList.length,
      organizations: formattedList
    });
  } catch (error) {
    console.error('[GET ORGANIZATIONS LIST ERROR]:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

