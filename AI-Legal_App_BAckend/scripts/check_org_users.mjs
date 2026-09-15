import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const uri = process.env.MONGODB_ATLAS_URI || process.env.MONGO_URI;
  const conn = await mongoose.connect(uri);
  const db = conn.connection.db;

  const orgs = await db.collection('organizations').find({}).toArray();
  console.log('Total org records:', orgs.length);
  const emails = orgs.map(o => o.studentEmail).filter(Boolean);
  console.log('Emails in organizations:', emails);

  const matchedUsers = await db.collection('users').find({ email: { $in: emails } }).toArray();
  console.log('Matched users count:', matchedUsers.length);
  console.log('Matched users:', JSON.stringify(matchedUsers.map(u => ({
    _id: u._id,
    email: u.email,
    name: u.name,
    role: u.role,
    credits: u.credits,
    subscription: u.subscription
  })), null, 2));

  // Also check all distinct org names and their stats
  const orgMap = {};
  for (const o of orgs) {
    const name = o.organizationName || 'Unknown';
    if (!orgMap[name]) {
      orgMap[name] = {
        name,
        slug: o.organizationSlug,
        plan: o.plan,
        studentsCount: 0,
        classes: new Set(),
        totalCredits: 0,
        students: []
      };
    }
    orgMap[name].studentsCount += 1;
    if (o.className) orgMap[name].classes.add(o.className);
    if (o.credits) orgMap[name].totalCredits += o.credits;
    orgMap[name].students.push({
      _id: o._id,
      studentName: o.studentName,
      studentEmail: o.studentEmail,
      studentId: o.studentId,
      className: o.className,
      credits: o.credits,
      plan: o.plan,
      status: o.status,
      syncedAt: o.syncedAt
    });
  }

  console.log('\n--- ORGANIZATIONS SUMMARY ---');
  for (const [k, v] of Object.entries(orgMap)) {
    console.log(`Org: "${k}" | Slug: "${v.slug}" | Plan: "${v.plan}" | Students: ${v.studentsCount} | Classes: ${[...v.classes].join(', ')}`);
  }

  await mongoose.disconnect();
}

run().catch(console.error);
