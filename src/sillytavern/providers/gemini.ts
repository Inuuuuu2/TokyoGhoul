import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

export interface GeminiConfig {
  apiKey: string;
  model?: string; // e.g. gemini-1.5-pro
  temperature?: number;
  topP?: number;
  topK?: number;
  maxOutputTokens?: number;
}

/**
 * Maps SillyTavern standard messages (OpenAI format) to Gemini content format.
 */
export function formatGeminiMessages(messages: { role: string; content: string }[]) {
  // Gemini expects system instructions separately in initialization
  // and the chat history must strictly alternate user/model
  const history: { role: string; parts: { text: string }[] }[] = [];
  let systemInstruction = '';

  for (const msg of messages) {
    if (msg.role === 'system') {
      systemInstruction += (systemInstruction ? '\n' : '') + msg.content;
      continue;
    }

    const role = msg.role === 'assistant' ? 'model' : 'user';
    history.push({
      role,
      parts: [{ text: msg.content }]
    });
  }

  // Gemini requires the first message in history to be from the user.
  // If we have history starting with a model response, we must handle it (or let the API complain).
  // Often SillyTavern might send arbitrary roles, so we should clean them.

  return { systemInstruction, history };
}

export async function callGemini(messages: { role: string; content: string }[], config: GeminiConfig) {
  const genAI = new GoogleGenerativeAI(config.apiKey);
  const modelName = config.model || 'gemini-1.5-pro';
  
  const { systemInstruction, history } = formatGeminiMessages(messages);
  
  // Extract the last message as the current prompt
  let currentPrompt = '';
  if (history.length > 0 && history[history.length - 1].role === 'user') {
    currentPrompt = history.pop()!.parts[0].text;
  } else if (history.length > 0) {
    // If the last message is from the model, we can just send "Continue" or handle it specially
    currentPrompt = 'Continue.';
  }

  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: systemInstruction || undefined,
    safetySettings: [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
    ]
  });

  const chatSession = model.startChat({
    generationConfig: {
      temperature: config.temperature ?? 1.0,
      topP: config.topP,
      topK: config.topK,
      maxOutputTokens: config.maxOutputTokens,
    },
    history: history,
  });

  const result = await chatSession.sendMessage(currentPrompt);
  return result.response.text();
}
