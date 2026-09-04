import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import dns from 'dns';

dns.setServers(['8.8.8.8', '8.8.4.4']);

const mongoUri = process.env.MONGODB_ATLAS_URI || process.env.MONGO_URI;
const targetDbName = process.env.DB_NAME || 'AISA';

if (!mongoUri) {
  console.error('❌ MONGODB_ATLAS_URI or MONGO_URI is missing in environment!');
  process.exit(1);
}

const runMigration = async () => {
  try {
    console.log(`📡 Connecting to MongoDB Atlas...`);
    
    // 1. Connect to target DB (AISA)
    const conn = await mongoose.connect(mongoUri, {
      dbName: targetDbName,
      serverSelectionTimeoutMS: 60000,
      socketTimeoutMS: 60000,
      connectTimeoutMS: 60000,
      family: 4,
    });

    const client = conn.connection.client;
    console.log(`✅ Connected to MongoDB Atlas. Target DB: ${conn.connection.name}`);

    // 2. Check source DB ('test') for documents to copy
    const testDb = client.db('test');
    const aisaDb = client.db(targetDbName);

    const testCollections = await testDb.listCollections().toArray();
    console.log(`🔍 Checking 'test' database collections (${testCollections.length} found)...`);

    for (const colInfo of testCollections) {
      const colName = colInfo.name;
      if (colName.startsWith('system.')) continue;

      const testCol = testDb.collection(colName);
      const docs = await testCol.find({}).toArray();

      if (docs.length > 0) {
        console.log(`📦 Found ${docs.length} documents in test.${colName}. Migrating to ${targetDbName}.${colName}...`);
        const targetCol = aisaDb.collection(colName);

        for (const doc of docs) {
          await targetCol.updateOne(
            { _id: doc._id },
            { $set: doc },
            { upsert: true }
          );
        }
        console.log(`✅ Migrated test.${colName} -> ${targetDbName}.${colName}`);
      }
    }

    // 3. Trigger Seeders for AISA DB
    console.log(`🌱 Initializing System Configs, Plans, and Admin Data into '${targetDbName}'...`);

    const { initializeConfigs } = await import('../services/configService.js');
    await initializeConfigs();

    const { seedAdminData } = await import('../utils/adminSeeder.js');
    await seedAdminData();

    const { seedDatabasePlans } = await import('../services/featureAccessManager.js');
    await seedDatabasePlans();

    // 4. Summarize Collections in AISA
    const aisaCollections = await aisaDb.listCollections().toArray();
    console.log(`\n📊 Collections inside database '${targetDbName}':`);
    for (const col of aisaCollections) {
      const count = await aisaDb.collection(col.name).countDocuments();
      console.log(`   • ${col.name}: ${count} document(s)`);
    }

    console.log(`\n🎉 Database setup and migration for '${targetDbName}' completed successfully!`);
    process.exit(0);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

runMigration();
