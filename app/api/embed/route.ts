import { NextResponse } from 'next/server';

const DEFAULT_EMBEDDING_MODEL = 'gemini-embedding-001';
const DEFAULT_OUTPUT_DIMENSIONS = 768;

type GeminiEmbeddingResponse = {
  embedding?: {
    values?: number[];
  };
  error?: {
    message?: string;
  };
};

export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    if (typeof text !== 'string' || !text.trim()) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key is not configured' }, { status: 503 });
    }

    const model = process.env.GEMINI_EMBEDDING_MODEL || DEFAULT_EMBEDDING_MODEL;
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${apiKey}`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: `models/${model}`,
        content: {
          parts: [{ text: text.trim().slice(0, 12000) }],
        },
        taskType: 'RETRIEVAL_DOCUMENT',
        outputDimensionality: DEFAULT_OUTPUT_DIMENSIONS,
      }),
    });

    const payload = (await response.json()) as GeminiEmbeddingResponse;

    if (!response.ok) {
      console.error('Embedding API Error:', payload.error?.message || response.statusText);
      return NextResponse.json(
        { error: 'Failed to generate embedding' },
        { status: response.status === 404 ? 502 : response.status }
      );
    }

    const embedding = payload.embedding?.values;
    if (!Array.isArray(embedding) || embedding.length === 0) {
      return NextResponse.json({ error: 'Embedding response was empty' }, { status: 502 });
    }

    return NextResponse.json({ embedding });
  } catch (error) {
    console.error("Embedding Error:", error);
    return NextResponse.json({ error: 'Failed to generate embedding' }, { status: 500 });
  }
}