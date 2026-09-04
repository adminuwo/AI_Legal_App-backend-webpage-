import jwt from 'jsonwebtoken';

async function testMasterHearingSystem() {
    console.log('--- Testing Master Hearing Management System Endpoints ---');
    const baseUrl = 'http://127.0.0.1:8080/api';
    const JWT_SECRET = 'e3e2160ee7a687af7c08e0d4408ea3b56ef3eba604a34687fa50d424c07a1356';

    const token = jwt.sign(
        { id: '65f123456789012345678901', email: 'test@ailegal.com', role: 'Advocate', name: 'Adv. Rajesh Sharma' },
        JWT_SECRET,
        { expiresIn: '7d' }
    );
    console.log('[AUTH JWT] Generated valid signed token.');

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-workspace-id': '6a61b418420da20cb1cbae81',
        'x-workspace-type': 'law_firm'
    };

    const caseId = '6a61c6ef82b45c69bfb69066';

    // 1. Fetch Workspace Hearings
    const fetchRes1 = await fetch(`${baseUrl}/projects/workspace-hearings?workspaceId=6a61b418420da20cb1cbae81`, { headers });
    const fetch1Data = await fetchRes1.json();
    console.log('[STATUS ' + fetchRes1.status + '] GET /api/projects/workspace-hearings =>', fetch1Data);

    // 2. Schedule New Hearing for Case
    const scheduleRes = await fetch(`${baseUrl}/projects/${caseId}/hearings`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            title: 'Master Evidence Hearing',
            courtName: 'Delhi High Court',
            courtroom: 'Courtroom 5',
            judge: 'Justice R. Sharma',
            date: '2026-07-28',
            time: '11:00 AM',
            purpose: 'Cross examination of witness',
            notes: 'Adv. Rajesh Sharma to appear.',
            appearingAdvocateUserId: '65f123456789012345678901',
            appearingAdvocateName: 'Adv. Rajesh Sharma'
        })
    });
    const scheduleData = await scheduleRes.json();
    console.log('[STATUS ' + scheduleRes.status + '] POST /api/projects/' + caseId + '/hearings =>', scheduleData.success, 'Hearing ID:', scheduleData.hearing?.id);

    const hearingId = scheduleData.hearing?.id || scheduleData.hearing?._id;

    // 3. Update Preparation Checklist Items Persistently
    const checklistRes = await fetch(`${baseUrl}/projects/${caseId}/hearings/${hearingId}/checklist`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
            argumentsReady: true,
            evidenceReady: true,
            witnessReady: true,
            documentsReady: true,
            courtFeesPaid: true,
            courtCopiesFiled: true,
            researchCompleted: true
        })
    });
    const checklistData = await checklistRes.json();
    console.log('[STATUS ' + checklistRes.status + '] PUT /api/projects/' + caseId + '/hearings/' + hearingId + '/checklist =>', checklistData.success, 'Status:', checklistData.hearing?.preparationStatus);

    // 4. Record Hearing Outcome & Schedule Next Hearing
    const outcomeRes = await fetch(`${baseUrl}/projects/${caseId}/hearings/${hearingId}/outcome`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            outcome: 'Arguments heard. Interim stay granted.',
            courtDirections: 'Respondent directed to file reply within 7 days.',
            orderStatus: 'Completed',
            nextHearingDate: '2026-08-12',
            nextHearingTime: '11:00 AM',
            nextHearingPurpose: 'Reply Arguments & Final Orders'
        })
    });
    const outcomeData = await outcomeRes.json();
    console.log('[STATUS ' + outcomeRes.status + '] POST /api/projects/' + caseId + '/hearings/' + hearingId + '/outcome =>', outcomeData.success, 'Created Next Hearing Date:', outcomeData.nextHearing?.date);

    // 5. Verify Workspace Hearings updated counts
    const fetchRes2 = await fetch(`${baseUrl}/projects/workspace-hearings?workspaceId=6a61b418420da20cb1cbae81`, { headers });
    const fetch2Data = await fetchRes2.json();
    console.log('[STATUS ' + fetchRes2.status + '] GET /api/projects/workspace-hearings (Updated) =>', fetch2Data.success, 'Counts:', fetch2Data.counts);
}

testMasterHearingSystem().catch(console.error);
