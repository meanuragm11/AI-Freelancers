import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    // text-embedding-004 outputs exactly 768 dimensions
    const model = genAI.getGenerativeModel({ model: "text-embedding-004" });

    const result = await model.embedContent(text);
    const embedding = result.embedding.values;

    return NextResponse.json({ embedding });
  } catch (error) {
    console.error("Embedding Error:", error);
    return NextResponse.json({ error: 'Failed to generate embedding' }, { status: 500 });
  }
}