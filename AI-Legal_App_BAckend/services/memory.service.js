import { GoogleAuth } from 'google-auth-library';
import axios from 'axios';
import ConversationMessage from '../models/ConversationMessage.js';
import logger from '../utils/logger.js';
import dotenv from 'dotenv';
import { existsSync } from 'fs';
import * as configService from './configService.js';
dotenv.config();

if (process.env.GOOGLE_APPLICATION_CREDENTIALS && !existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
}

const auth = new GoogleAuth({
    scopes: 'https://www.googleapis.com/auth/cloud-platform'
});

// Helper: Calculate Cosine Similarity
function cosineSimilarity(vectorA, vectorB) {
    if (!vectorA || !vectorB || vectorA.length !== vectorB.length || vectorA.length === 0) return 0;
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vectorA.length; i++) {
        dotProduct += vectorA[i] * vectorB[i];
        normA += vectorA[i] * vectorA[i];
        normB += vectorB[i] * vectorB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Memory Service
class MemoryService {
    
    // Generate Embeddings utilizing Google Vertex AI Endpoint
    async generateEmbedding(text) {
        try {
            const projectId = process.env.GCP_PROJECT_ID;
            const location = process.env.GCP_LOCATION || 'asia-south1'; // Vertex Location
            
            if (!projectId) {
                logger.error("[Memory Service] GCP_PROJECT_ID not set in environment.");
                return null;
            }
            
            const client = await auth.getClient();
            const token = await client.getAccessToken();

            const apiUrl = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/text-embedding-004:predict`;

            // Truncate text to avoid token limit errors (text-embedding-004 limit is ~2048 tokens)
            const truncatedText = text.length > 6000 ? text.substring(0, 6000) : text;
            
            const payload = {
                instances: [
                    { content: truncatedText }
                ]
            };

            const response = await axios.post(apiUrl, payload, {
                headers: {
                    Authorization: `Bearer ${token.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.data && response.data.predictions && response.data.predictions[0]) {
                return response.data.predictions[0].embeddings.values;
            }
            return null;
        } catch (error) {
            logger.error(`[Memory Service] Failed to generate embedding: ${error.message}`);
            return null;
        }
    }

    // Step 1: Save the message along with its embedding to DB
    async saveMessageWithEmbedding(conversationId, userId, role, content) {
        try {
            // Generate embedding for message
            const embedding = await this.generateEmbedding(content);

            const record = new ConversationMessage({
                conversation_id: conversationId,
                user_id: userId,
                role: role,
                content: content,
                embedding: embedding
            });

            await record.save();
            return record;
        } catch (error) {
            logger.error(`[Memory Service] Save Error: ${error.message}`);
            return null;
        }
    }

    // Step 2 & 3: Retrieve top K similar messages from the same conversation
    async retrieveMemory(conversationId, userQuery, topK = 5) {
        try {
            // Get user query embedding
            const queryEmbedding = await this.generateEmbedding(userQuery);
            if (!queryEmbedding) return [];

            // Get all records for this conversation
            const allMessages = await ConversationMessage.find({ conversation_id: conversationId }).lean();
            if (!allMessages || allMessages.length === 0) return [];

            // Calculate similarity score & filter out those without embeddings
            const scoredMessages = allMessages
                .filter(msg => msg.embedding && msg.embedding.length > 0)
                .map(msg => ({
                    ...msg,
                    similarity: cosineSimilarity(queryEmbedding, msg.embedding)
                }));

            // Sort by similarity descending
            scoredMessages.sort((a, b) => b.similarity - a.similarity);

            // Return top K
            return scoredMessages.slice(0, topK);
        } catch (error) {
            logger.error(`[Memory Service] Retrieval Error: ${error.message}`);
            return [];
        }
    }

    // Context Builder Feature
    buildContext(systemPrompt, retrievedMemory, userQuery) {
        // Build the text representation of retrieved memory
        const memoryContext = retrievedMemory
            .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
            .join('\n');

        const template = configService.getConfig('CONVERSATION_MEMORY_PROMPT');
        const contextBuilder = template
            .replace('{memory_context}', memoryContext || "No prior relevant history")
            .replace('{user_query}', userQuery);

        return systemPrompt ? `${systemPrompt}\n\n${contextBuilder}` : contextBuilder;
    }
}

export default new MemoryService();
