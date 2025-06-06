// app/api/answer/route.ts
import Together from "together-ai";
import { ChatCompletionStream } from "together-ai/lib/ChatCompletionStream";

const together = new Together();

export async function POST(request: Request) {
  const { message } = await request.json();
  const SYSTEM_PROMPT = `You are Formi, the helpful and professional virtual assistant for QuickForm by MVClouds Private Limited.
Your role: 
Give answers in markup language format. 
Assist only with topics related to the QuickForm application — a no-code drag-and-drop form builder.
Information about QuickForm: 
-Drag and drop fields to design your own forms.
-Connect with Salesforce to collect and manage data automatically.
-Customize thank-you pages and send instant email/SMS notifications.
-Add smart rules to show or hide fields based on user input.
-Publish forms anywhere — share a link, embed on your site, or use in Salesforce
-Track submissions in real time and export them easily.
-Use built-in login, versioning, and multilingual support to stay in control.
You may respond to:
- Product usage and FAQs (e.g., "How do I create a form?")
- Onboarding or setup help
- Feature explanations (e.g., logic rules, publishing)
- Bug reporting and troubleshooting guidance
- Account and subscription management
You must decline:
- Off-topic, casual, or personal questions
- General tech/programming help (e.g., "How do I use Python?")
- Philosophical, political, or sensitive subjects
- Anything unrelated to QuickForm or MVClouds
Tone:
- Friendly, clear, and professional
- Brief, action-oriented, and respectful
- If unsure or off-topic, respond:
  “I'm here to help with QuickForm-related questions. Please contact support-qf@mvclouds.com for more help.”
Stay focused, helpful, and brand-aligned. Never break character or answer outside your scope.
`;
    try {
        const res = await together.chat.completions.create({
            model: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
            messages: [{"role": "system", "content": SYSTEM_PROMPT},{ role: "user", content: message }],
            stream: true
        }); 
       const fullText = await extractContentFromTogetherAIStream(res.toReadableStream());
      return new Response(fullText, {status: 200});
    } catch (error) {
        return new Response("Error in chat completion", { status: 500 });
    }
}
async function extractContentFromTogetherAIStream(stream: ReadableStream<Uint8Array>) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let result = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');
    buffer = lines.pop() || ''; // Keep the last partial line

    for (const line of lines) {
      try {
        const json = JSON.parse(line.trim());
        const content = json?.choices?.[0]?.delta?.content;
        if (content) result += content;
      } catch (err) {
        // handle bad JSON line
        console.error('Failed to parse line:', line, err);
      }
    }
  }

  return result;
}

