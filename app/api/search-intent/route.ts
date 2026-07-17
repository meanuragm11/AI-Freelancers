import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { checkRateLimit, getClientIp, rateLimitHeaders, rateLimitResponse } from '@/lib/server/rateLimit';

export async function POST(req: Request) {
  try {
    const limit = checkRateLimit(`search-intent:${getClientIp(req)}`, 30, 60_000);
    if (!limit.allowed) return rateLimitResponse(limit);

    const { query } = await req.json();

    if (!query) {
      return NextResponse.json({ intent: 'experts' }, { headers: rateLimitHeaders(limit) });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

    const prompt = `You are an ultra-fast search intent router for an AI marketplace. 
    The marketplace has two sections:
    1. 'components': Software, pre-built code, APIs, RAG architectures, scripts, prompts, databases, and bots.
    2. 'experts': Human freelancers, AI engineers, developers, consultants, and makers.
    
    Classify the following user search query into either 'components' or 'experts'. 
    Respond with ONLY ONE WORD: either "components" or "experts". Do not include any punctuation or other text.
    
    User Query: "${query}"`;

    const result = await model.generateContent(prompt);
    const response = result.response.text().trim().toLowerCase();

    const intent = response.includes('components') ? 'components' : 'experts';
    return NextResponse.json({ intent }, { headers: rateLimitHeaders(limit) });
  } catch (error) {
    console.error('AI Intent Classification Error:', error);
    return NextResponse.json({ error: 'Classification failed' }, { status: 500 });
  }
}
