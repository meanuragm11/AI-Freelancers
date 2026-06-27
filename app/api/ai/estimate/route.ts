import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  try {
    const { prompt, budget } = await req.json();

    if (!prompt || !budget) {
      return NextResponse.json({ error: 'Missing prompt or budget' }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

    const systemPrompt = `
      You are an expert Enterprise Project Manager for an AI Freelance Marketplace.
      The client has a budget of $${budget} USD.
      Their project brief is: "${prompt}"
      
      Break this project down into exactly 3 to 5 logical escrow milestones.
      Return ONLY a raw JSON array of objects. Do not use markdown blocks like \`\`\`json.
      
      Format:
      [
        {
          "title": "Phase 1: Clear Title",
          "desc": "Detailed technical description of deliverables.",
          "amount": 500
        }
      ]
      
      Ensure the sum of all "amount" fields equals exactly ${budget}.
    `;

    const result = await model.generateContent(systemPrompt);
    const text = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
    
    const milestones = JSON.parse(text);

    return NextResponse.json({ milestones });

  } catch (error: any) {
    console.error('AI Estimator Error:', error);
    return NextResponse.json({ error: 'Failed to generate milestones' }, { status: 500 });
  }
}