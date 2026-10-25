import { expect } from 'vite-plus/test';
import type { ApiEvent } from '../src/client.ts';
import { apiEventSchema } from '../src/client.ts';

export interface SseBlock {
  comment: boolean;
  event?: string;
  id?: string;
  data: string;
}

export interface SseReader {
  next(): Promise<SseBlock | null>;
  event(): Promise<{ id?: string; event: ApiEvent }>;
  comment(): Promise<string>;
  closed(): Promise<boolean>;
  cancel(): Promise<void>;
}

export const parseSseBlock = (raw: string): SseBlock => {
  const block: SseBlock = { comment: false, data: '' };
  const dataLines: string[] = [];
  for (const line of raw.split('\n')) {
    if (line.startsWith(':')) {
      block.comment = true;
      dataLines.push(line.slice(1));
      continue;
    }
    const separator = line.indexOf(':');
    const field = separator === -1 ? line : line.slice(0, separator);
    const value = separator === -1 ? '' : line.slice(separator + 1).replace(/^ /, '');
    if (field === 'event') block.event = value;
    else if (field === 'id') block.id = value;
    else if (field === 'data') dataLines.push(value);
  }
  block.data = dataLines.join('\n');
  return block;
};

export const openSse = (response: Response): SseReader => {
  expect(response.status).toBe(200);
  expect(response.headers.get('content-type')).toBe('text/event-stream');
  const body = response.body;
  if (!body) throw new Error('SSE response has no body');
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let done = false;

  const next = async (): Promise<SseBlock | null> => {
    for (;;) {
      const boundary = buffer.indexOf('\n\n');
      if (boundary !== -1) {
        const raw = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        return parseSseBlock(raw);
      }
      if (done) return null;
      const chunk = await reader.read();
      if (chunk.done) {
        done = true;
        continue;
      }
      buffer += decoder.decode(chunk.value, { stream: true });
    }
  };

  return {
    next,
    event: async () => {
      const block = await next();
      if (!block || block.comment)
        throw new Error(`expected an event, got ${JSON.stringify(block)}`);
      return { id: block.id, event: apiEventSchema.parse(JSON.parse(block.data)) };
    },
    comment: async () => {
      const block = await next();
      if (!block || !block.comment) {
        throw new Error(`expected a comment, got ${JSON.stringify(block)}`);
      }
      return block.data;
    },
    closed: async () => (await next()) === null,
    cancel: () => reader.cancel(),
  };
};
