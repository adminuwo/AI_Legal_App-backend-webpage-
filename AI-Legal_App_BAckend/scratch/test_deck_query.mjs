import * as vertexService from '../services/vertex.service.js';
import dotenv from 'dotenv';
dotenv.config();

async function testQuery() {
    const res = await vertexService.retrieveContextFromRag("What does UWO company deck say about services or mission?", 5, 'GENERAL');
    console.log("RAG Context:", res ? { sources: res.sources, snippet: res.text?.substring(0, 300) } : "NULL");
}

testQuery();
