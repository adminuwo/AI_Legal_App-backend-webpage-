import 'dotenv/config';
import { askVertex } from './services/vertex.service.js';
import { langStorage } from './middleware/langContext.js';
import logger from './utils/logger.js';

async function runTest() {
    logger.info("Starting Language Intelligence Layer test...");

    // Test Case 1: Hindi selected via context storage
    await langStorage.run('Hindi', async () => {
        logger.info("\n--- TEST CASE 1: App language set to Hindi via Context ---");
        try {
            // We pass a dummy prompt. Vertex won't run full API call if GCP credentials aren't set,
            // but we can check if it initializes the prompt correctly or inspect systemInstruction logic.
            const response = await askVertex("Explain Section 138 of NI Act", null, {
                // Dry run/check by throwing dummy error inside askVertex or printing
            });
            logger.info("Response received: " + JSON.stringify(response));
        } catch (e) {
            logger.error("Error expected/received: " + e.message);
        }
    });

    // Test Case 2: Hindi prompt overrides English settings
    await langStorage.run('English', async () => {
        logger.info("\n--- TEST CASE 2: App language set to English, but user prompt asks in Hindi ---");
        try {
            const response = await askVertex("Explain Section 420 IPC in Hindi please", null, {});
            logger.info("Response received: " + JSON.stringify(response));
        } catch (e) {
            logger.error("Error expected/received: " + e.message);
        }
    });

    // Test Case 3: Bilingual (English + Marathi) via context storage
    await langStorage.run('English + Marathi', async () => {
        logger.info("\n--- TEST CASE 3: App language set to English + Marathi via Context ---");
        try {
            const response = await askVertex("Explain Section 138 of NI Act", null, {});
            logger.info("Response received: " + JSON.stringify(response));
        } catch (e) {
            logger.error("Error expected/received: " + e.message);
        }
    });
}

runTest();
