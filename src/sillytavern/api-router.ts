import type { ApiSettings, ApiTarget, Task } from './types';
import { callGeminiStream } from './providers/gemini';
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

  async function callOnce(target: ApiTarget, body: ChatRequest, signal?: AbortSignal): Promise<Response> {
    const ep = endpointFor(target);

    // Check if we should use Gemini SDK instead of standard OpenAI format
    // A simple heuristic is if the model name contains "gemini" and baseUrl is not a proxy that handles Gemini
    const isGeminiModel = ep.model.toLowerCase().includes('gemini');
    const isGeminiNativeUrl = !ep.baseUrl || ep.baseUrl.includes('generativelanguage.googleapis.com');
    
    if (isGeminiModel && isGeminiNativeUrl) {
      const config: GeminiConfig = {
        apiKey: ep.apiKey,
        model: ep.model,
        temperature: body.temperature ?? 1.0,
        maxOutputTokens: body.max_tokens,
        topP: body.top_p,
      };

      // Wrap Gemini's native streaming as an OpenAI-compatible SSE Response,
      // so the rest of the pipeline (useApiRouter.sendStream → parser) works unchanged.
      const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
          const encoder = new TextEncoder();
          try {
            await callGeminiStream(body.messages, config, (text) => {
              const payload = JSON.stringify({
                choices: [{ index: 0, delta: { content: text } }],
              });
              controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
            });
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          } catch (err: any) {
            const errPayload = JSON.stringify({
              error: { message: err?.message || 'Gemini stream error', type: 'gemini_error' },
            });
            controller.enqueue(encoder.encode(`data: ${errPayload}\n\n`));
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          } finally {
            controller.close();
          }
        },
      });

      return new Response(stream, {
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
      });
    }

    // Standard OpenAI compatible request
    return await fetchImpl(`${ep.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        Authorization: `Bearer ${ep.apiKey}`,
      },
      body: JSON.stringify({ ...body, model: ep.model }),
      signal,
    });
  }

  async function call(task: Task, payload: ChatRequest, signal?: AbortSignal): Promise<CallResult> {
    const target = targetFor(task);
    if (target === 'secondary') {
      try {
        const res = await callOnce('secondary', payload, signal);
        if (!res.ok) throw new Error(`secondary HTTP ${res.status}`);
        return { targetUsed: 'secondary', response: res };
      } catch {
        const res = await callOnce('primary', payload, signal);
        return { targetUsed: 'primary', response: res };
      }
    }
    const res = await callOnce('primary', payload, signal);
    return { targetUsed: 'primary', response: res };
  }

  return { targetFor, call };
}

export type ApiRouter = ReturnType<typeof createApiRouter>;
