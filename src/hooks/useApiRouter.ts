import { useCallback, useMemo, useRef } from 'react';
import { createApiRouter, type ApiRouter } from '../sillytavern/api-router';
import type { ApiSettings, Task } from '../sillytavern/types';

export interface SendStreamArgs {
  task: Task;
  messages: Array<{ role: string; content: string }>;
  onChunk: (text: string) => void;
}

export function useApiRouter(api: ApiSettings) {
  const abortRef = useRef<AbortController | null>(null);
  const router: ApiRouter = useMemo(() => createApiRouter(api), [api]);

  const sendStream = useCallback(async (args: SendStreamArgs) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;
    const { task, messages, onChunk } = args;
    const { response } = await router.call(task, { messages, stream: true }, signal);
    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`HTTP ${response.status}${errText ? ` — ${errText.slice(0, 300)}` : ''}`);
    }

    const contentType = response.headers.get('content-type') ?? '';
    const isSSE = contentType.includes('text/event-stream');

    // Non-SSE response (proxy ignored `stream: true` and returned a regular JSON body).
    // Read the whole body, extract message.content, feed it in one shot so the UI still progresses.
    if (!isSSE) {
      const text = await response.text();
      let content = '';
      try {
        const json = JSON.parse(text);
        content =
          json?.choices?.[0]?.message?.content ??
          json?.choices?.[0]?.delta?.content ??
          json?.message?.content ??
          '';
        if (!content && json?.error) {
          throw new Error(json.error.message || JSON.stringify(json.error));
        }
      } catch (e) {
        // If it's not parseable JSON either, treat the raw body as the content so
        // the user at least sees what came back instead of an empty bubble.
        if (e instanceof SyntaxError) content = text;
        else throw e;
      }
      if (content) onChunk(content);
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No body');
    const decoder = new TextDecoder();
    let buf = '';
    while (true) {
      if (signal.aborted) {
        await reader.cancel();
        throw new Error('aborted');
      }
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      // SSE frames are separated by `\n\n` or `\r\n\r\n` — normalize CRLF first.
      const normalized = buf.replace(/\r\n/g, '\n');
      const parts = normalized.split('\n\n');
      buf = parts.pop() ?? '';
      for (const part of parts) {
        const lines = part.split('\n').filter(l => l.startsWith('data:'));
        for (const line of lines) {
          // tolerate both `data: ...` and `data:...`
          const data = line.replace(/^data:\s?/, '').trim();
          if (!data) continue;
          if (data === '[DONE]') return;
          try {
            const json = JSON.parse(data);
            const delta: string =
              json?.choices?.[0]?.delta?.content ??
              json?.choices?.[0]?.message?.content ??
              '';
            if (delta) onChunk(delta);
          } catch {
            // ignore bad line
          }
        }
      }
    }
  }, [router]);

  const abort = useCallback(() => abortRef.current?.abort(), []);

  return { sendStream, abort, targetFor: router.targetFor };
}
