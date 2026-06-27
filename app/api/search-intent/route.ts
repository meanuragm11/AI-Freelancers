import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: Request) {
  try {
    const { query } = await req.json();

    if (!query) {
      return NextResponse.json({ intent: 'experts' });
    }

    // Initialize the AI securely on the server
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    
    // UPDATED: Switched to the ultra-fast 2.5 Flash-Lite model
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

    const prompt = `You are an ultra-fast search intent router for an AI marketplace. 
    The marketplace has two sections:
    1. 'components': Software, pre-built code, APIs, RAG architectures, scripts, prompts, databases, and bots.
    2. 'experts': Human freelancers, AI engineers, developers, consultants, and makers.
    
    Classify the following user search query into either 'components' or 'experts'. 
    Respond with ONLY ONE WORD: either "components" or "experts". Do not include any punctuation or other text.
    
    User Query: "${query}"`;

    const result = await model.generateContent(prompt);
    const response = result.response.text().trim().toLowerCase();

    // Route based on the AI's decision
    if (response.includes('components')) {
      return NextResponse.json({ intent: 'components' });
    } else {
      return NextResponse.json({ intent: 'experts' });
    }

  } catch (error) {
    console.error("AI Intent Classification Error:", error);
    // If the API fails (rate limits, network issue), return a 500 error 
    // so the frontend knows to instantly trigger the Failsafe.
    return NextResponse.json({ error: 'Classification failed' }, { status: 500 });
  }
}