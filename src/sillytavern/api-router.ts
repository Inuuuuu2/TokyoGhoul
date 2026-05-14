import type { ApiSettings, ApiTarget, Task } from './types';
import { callGemini } from './providers/gemini';
import type { GeminiConfig } from './providers/gemini';

interface ChatRequest {
  messages: Array<{ role: string; content: string }>;
  [key: string]: any;
}

interface CallResult {
  targetUsed: ApiTarget;
  response: Response;
}

interface RouterDeps {
  fetch?: typeof fetch;
}

export function createApiRouter(settings: ApiSettings, deps: RouterDeps = {}) {
  const fetchImpl = deps.fetch ?? globalThis.fetch;
  const useSecondary = !!settings.secondary?.enabled;

  function targetFor(task: Task): ApiTarget {
    if (!useSecondary) return 'primary';
    return task === 'story' ? 'primary' : 'secondary';
  }

  function endpointFor(target: ApiTarget) {
    if (target === 'secondary' && settings.secondary) {
      return {
        baseUrl: settings.secondary.baseUrl,
        apiKey: settings.secondary.apiKey,
        model: settings.secondary.model,
      };
    }
    return { baseUrl: settings.baseUrl, apiKey: settings.apiKey, model: settings.model };
  }

  async function callOnce(target: ApiTarget, body: ChatRequest): Promise<Response> {
    const ep = endpointFor(target);
    
    // Check if we should use Gemini SDK instead of standard OpenAI format
    // A simple heuristic is if the model name contains "gemini" and baseUrl is not a proxy that handles Gemini
    const isGeminiModel = ep.model.toLowerCase().includes('gemini');
    const isGeminiNativeUrl = !ep.baseUrl || ep.baseUrl.includes('generativelanguage.googleapis.com');
    
    if (isGeminiModel && isGeminiNativeUrl) {
      try {
        const config: GeminiConfig = {
          apiKey: ep.apiKey,
          model: ep.model,
          temperature: body.temperature ?? 1.0,
          maxOutputTokens: body.max_tokens,
          topP: body.top_p,
        };
        
        const textResponse = await callGemini(body.messages, config);
        
        // Mock a fetch Response object to keep compatibility
        return new Response(JSON.stringify({
          id: 'chatcmpl-' + Math.random().toString(36).substr(2, 9),
          object: 'chat.completion',
          created: Math.floor(Date.now() / 1000),
          model: ep.model,
          choices: [{
            index: 0,
            message: {
              role: 'assistant',
              content: textResponse,
            },
            finish_reason: 'stop'
          }],
          usage: {
            prompt_tokens: 0,
            completion_tokens: 0,
            total_tokens: 0
          }
        }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json'
          }
        });
      } catch (err: any) {
        return new Response(JSON.stringify({
          error: {
            message: err.message || 'Gemini API Error',
            type: 'gemini_error'
          }
        }), {
          status: 500,
          headers: {
            'Content-Type': 'application/json'
          }
        });
      }
    }

    // Standard OpenAI compatible request
    return await fetchImpl(`${ep.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ep.apiKey}`,
      },
      body: JSON.stringify({ ...body, model: ep.model }),
    });
  }

  async function call(task: Task, payload: ChatRequest): Promise<CallResult> {
    const target = targetFor(task);
    if (target === 'secondary') {
      try {
        const res = await callOnce('secondary', payload);
        if (!res.ok) throw new Error(`secondary HTTP ${res.status}`);
        return { targetUsed: 'secondary', response: res };
      } catch {
        const res = await callOnce('primary', payload);
        return { targetUsed: 'primary', response: res };
      }
    }
    const res = await callOnce('primary', payload);
    return { targetUsed: 'primary', response: res };
  }

  return { targetFor, call };
}

export type ApiRouter = ReturnType<typeof createApiRouter>;
