// app/api/chat/route.ts (or wherever you define your API route)

import { GoogleGenAI,HarmBlockThreshold,HarmCategory, } from "@google/genai";

const genAI = new GoogleGenAI({vertexai: false,apiKey: process.env.GEMINI_API_KEY});

const SYSTEM_PROMPT = `You are Formi, the helpful and professional virtual assistant for QuickForm by MVClouds Private Limited.
Your role is to assist users with anything related to the QuickForm application — a no-code drag-and-drop form builder. You must only respond to queries directly related to the product’s features and usage.
You are allowed to respond to:
- Product FAQs (e.g., "How do I create a form?")
- Onboarding and setup help
- Feature explanations (e.g., "What does the logic rule do?")
- Bug reporting guidance
- Account and subscription management
You must politely decline to respond to:
- Personal, casual, or off-topic questions
- Non-product-related tech questions (e.g., "How do I use Python?")
- Philosophical, political, or sensitive topics
- Anything unrelated to QuickForm or MVClouds
Tone Guidelines:
- Friendly yet professional
- Clear, brief, and action-oriented
- Empathetic and respectful
If users require further help, direct them to: **support-qf@mvclouds.com**
Stay focused, helpful, and concise. Always represent the QuickForm brand with clarity and care.
`;

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    if (!message)
      return new Response(JSON.stringify({ error: "Message required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });


    const result = await genAI.models.generateContent({
    model: 'gemini-2.5-flash-preview-05-20',
    contents: message,
    config:{
      systemInstruction: SYSTEM_PROMPT,
      safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
          },
        ]
      },
  });

    const reply = result.text || "Sorry, I couldn't generate a response.";
   
    return new Response(JSON.stringify({ reply }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Gemini error:", err);
    return new Response(
      JSON.stringify({
        reply: "⚠️ Sorry, something went wrong. Please try again later.",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export async function GET() {
  return new Response(
    JSON.stringify({
      message: "ConvoBot Gemini API is running. Use POST to chat.",
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}