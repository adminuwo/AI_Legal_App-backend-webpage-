#!/usr/bin/env node

/**
 * CLI Tool: Sync Google Analytics (GA4) Mobile App Uninstalls
 *
 * Usage:
 *   node scripts/syncGaUninstalls.js --test-connection
 *   node scripts/syncGaUninstalls.js --days 30
 *   node scripts/syncGaUninstalls.js --property 412345678 --days 7
 *   node scripts/syncGaUninstalls.js --dry-run
 */

import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import {
    testGa4Connection,
    fetchAppRemoveMetrics,
    syncUninstallsToDatabase,
    getPropertyId
} from '../services/googleAnalytics.service.js';

const parseArgs = () => {
    const args = process.argv.slice(2);
    const parsed = {
        testConnection: false,
        dryRun: false,
        days: 30,
        propertyId: null
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg === '--test-connection' || arg === '-t') {
            parsed.testConnection = true;
        } else if (arg === '--dry-run' || arg === '-d') {
            parsed.dryRun = true;
        } else if ((arg === '--days' || arg === '-n') && args[i + 1]) {
            parsed.days = parseInt(args[++i], 10) || 30;
        } else if ((arg === '--property' || arg === '-p') && args[i + 1]) {
            parsed.propertyId = args[++i];
        }
    }
    return parsed;
};

async function runCli() {
    const options = parseArgs();
    console.log('\n======================================================');
    console.log('📊 AI LEGAL — Google Analytics (GA4) Uninstalls CLI');
    console.log('======================================================\n');

    const effectivePropertyId = options.propertyId || getPropertyId();
    console.log(`GA4 Property ID : ${effectivePropertyId || '(Not set - add GA4_PROPERTY_ID in .env)'}`);
    console.log(`Sync Scope      : Last ${options.days} days`);
    console.log(`Dry Run Mode    : ${options.dryRun ? 'YES (No DB updates)' : 'NO'}\n`);

    // 1. Connection Test Mode
    if (options.testConnection) {
        console.log('🔍 Testing connection to Google Analytics Data API...');
        const testResult = await testGa4Connection(effectivePropertyId);
        if (testResult.connected) {
            console.log(`\n✅ CONNECTION SUCCESSFUL!`);
            console.log(`   Property ID: ${testResult.propertyId}`);
            console.log(`   Status: Connected & Authenticated.`);
        } else {
            console.log(`\n⚠️ CONNECTION NOTICE:`);
            console.log(`   Message: ${testResult.message}`);
            if (testResult.error) console.log(`   Error: ${testResult.error}`);
            if (testResult.instructions) {
                console.log('\n📌 Required Setup Steps:');
                testResult.instructions.forEach(step => console.log(`   • ${step}`));
            }
        }
        process.exit(testResult.connected ? 0 : 1);
    }

    // 2. Data Sync Mode
    try {
        console.log('🔌 Connecting to MongoDB...');
        await connectDB();
        console.log('✅ Connected to MongoDB.');

        console.log(`\n📥 Fetching 'app_remove' telemetry from GA4 for the last ${options.days} days...`);
        const result = await syncUninstallsToDatabase({
            days: options.days,
            propertyIdOverride: effectivePropertyId,
            dryRun: options.dryRun
        });

        if (result.needsConfig) {
            console.log('\n⚠️ Setup Required:');
            console.log('   GA4_PROPERTY_ID is missing in .env.');
            console.log('   Add your GA4 Property ID to .env or pass it with --property <ID>');
            console.log("   Example: node scripts/syncGaUninstalls.js --property 412345678");
        } else if (result.success) {
            console.log(`\n🎉 SYNC COMPLETE!`);
            console.log(`   Total Uninstalls Synced : ${result.totalUninstallsSynced || 0}`);
            console.log(`   Daily Records Processed : ${result.recordsCount || 0}`);
            console.log(`   Message                 : ${result.message || 'Done'}`);
        } else {
            console.log(`\n❌ Sync failed:`, result.message);
        }
    } catch (err) {
        console.error('\n❌ Error during GA4 sync execution:', err.message);
        if (err.message.includes('403') || err.message.includes('permission')) {
            console.log('\n📌 Permission Tip:');
            console.log("   Make sure '743928421487-compute@developer.gserviceaccount.com' has 'Viewer' permission in GA4 Property Access Management.");
        }
    } finally {
        await mongoose.disconnect();
        console.log('\n🔒 Database connection closed.\n');
    }
}

runCli();
