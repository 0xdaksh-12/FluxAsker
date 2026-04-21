import { pipeline, env } from '@xenova/transformers';
// Removed MemoryVectorStore due to Vite export compatibility issues in MV3
// Custom semantic chunking used below instead of splitters
import { ChatGroq } from '@langchain/groq';
import { Embeddings } from '@langchain/core/embeddings';
import { Document } from '@langchain/core/documents';

// Setup Transformers.js for browser
env.allowLocalModels = false;
env.useBrowserCache = true;

class TransformersEmbeddings extends Embeddings {
  constructor() {
    super({});
    this.extractor = null;
  }
  
  async init() {
    if (!this.extractor) {
      this.extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    }
  }

  async embedDocuments(texts) {
    await this.init();
    const embeddings = [];
    for (const text of texts) {
      const output = await this.extractor(text, { pooling: 'mean', normalize: true });
      embeddings.push(Array.from(output.data));
    }
    return embeddings;
  }

  async embedQuery(text) {
    await this.init();
    const output = await this.extractor(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data);
  }
}

export class RAGPipeline {
  constructor() {
    this.vectorStore = null;
    this.embeddings = new TransformersEmbeddings();
    // Using import.meta.env since we're using Vite
    this.groqKey = import.meta.env.GROQ_API_KEY;
    if (!this.groqKey) {
      console.error("GROQ_API_KEY is missing from environment variables.");
    }
    this.llm = new ChatGroq({
      apiKey: this.groqKey,
      modelName: "llama-3.1-8b-instant",
      temperature: 0,
    });
  }

  async processTranscript(segments) {
    // 1. Group very short segments into larger blocks if needed, 
    // or just pass them as flat text and let langchain chunk it.
    // For RAG grounding, we want to map text to timestamps.
    const docs = [];
    let currentText = '';
    let currentStart = segments[0]?.start || 0;
    
    // Naively combine segments to ~500 chars for meaningful semantic blocks
    for (const seg of segments) {
      if (currentText.length + seg.text.length > 600) {
        docs.push(new Document({
          pageContent: currentText,
          metadata: { start: currentStart }
        }));
        currentText = seg.text;
        currentStart = seg.start;
      } else {
        currentText += ' ' + seg.text;
      }
    }
    if (currentText.length > 0) {
      docs.push(new Document({
        pageContent: currentText,
        metadata: { start: currentStart }
      }));
    }

    // 2. Initialize Embedder and VectorStore
    // Warning: The first time, this downloads the ~80MB model to browser cache.
    await this.embeddings.init();
    
    // Custom In-Memory Vector Store implementation
    const embeddedDocs = [];
    for (const doc of docs) {
      const embedding = await this.embeddings.embedQuery(doc.pageContent);
      embeddedDocs.push({
        ...doc,
        embedding
      });
    }
    
    this.vectorStore = {
      docs: embeddedDocs,
      similaritySearch: async (query, k = 4) => {
        const queryEmbedding = await this.embeddings.embedQuery(query);
        
        // Compute cosine similarity
        const dotProduct = (a, b) => a.reduce((sum, val, i) => sum + val * b[i], 0);
        const magnitude = (v) => Math.sqrt(v.reduce((sum, val) => sum + val * val, 0));
        const computeCosine = (a, b) => dotProduct(a, b) / (magnitude(a) * magnitude(b));
        
        const scoredDocs = this.vectorStore.docs.map(doc => ({
          ...doc,
          score: computeCosine(queryEmbedding, doc.embedding)
        }));
        
        scoredDocs.sort((a, b) => b.score - a.score);
        return scoredDocs.slice(0, k);
      }
    };
  }

  async askQuestion(query) {
    if (!this.vectorStore) throw new Error("VectorStore not initialized. Process a video first.");
    
    // Retrieve top 4 most relevant chunks
    const results = await this.vectorStore.similaritySearch(query, 4);
    
    // Construct Context
    const contextStr = results.map(doc => {
      // Format time roughly to [MM:SS]
      const mins = Math.floor(doc.metadata.start / 60);
      const secs = Math.floor(doc.metadata.start % 60).toString().padStart(2, '0');
      return `[${mins}:${secs}] ${doc.pageContent}`;
    }).join('\n\n');

    const systemPrompt = `You are an AI assistant that answers questions based ONLY on the provided YouTube video transcript context.
When giving your answer, you MUST cite the timestamps from the context in this exact format: [MM:SS].
If the context does not contain the answer, say "I cannot answer this based on the video context." Do not use outside knowledge.

<CONTEXT>
${contextStr}
</CONTEXT>`;

    const response = await this.llm.invoke([
      { role: "system", content: systemPrompt },
      { role: "user", content: query }
    ]);

    return response.content;
  }
}
