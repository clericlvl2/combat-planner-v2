import { EVENT_SOURCE_CLOSED } from '../src/hono-client.ts';
import type {
  EventSourceConstructor,
  EventSourceLike,
  MessageEventLike,
} from '../src/hono-client.ts';
import type { Browser } from './helpers.ts';
import { env } from './helpers.ts';
import { parseSseBlock } from './sse.ts';

const OPEN = 1;

const addresses = new WeakMap<Browser, string>();
let browsers = 0;

const addressOf = (browser: Browser): string => {
  const known = addresses.get(browser);
  if (known !== undefined) return known;
  browsers += 1;
  const address = `10.${(browsers >> 16) & 255}.${(browsers >> 8) & 255}.${browsers & 255}`;
  addresses.set(browser, address);
  return address;
};

const browserHeaders = (browser: Browser, source: HeadersInit | undefined): Headers => {
  const headers = new Headers(source);
  if (env.betterAuthUrl !== undefined) headers.set('origin', env.betterAuthUrl);
  headers.set('x-forwarded-for', addressOf(browser));
  return headers;
};

export const inProcessFetch =
  (browser: Browser): typeof fetch =>
  async (input, init) => {
    const request = new Request(input, init);
    const url = new URL(request.url);
    const body = (await request.text()) || undefined;
    return browser.request(url.pathname + url.search, {
      method: request.method,
      headers: browserHeaders(browser, request.headers),
      body,
      signal: request.signal,
    });
  };

type Listener = (event: MessageEventLike) => void;

export const inProcessEventSource = (browser: Browser): EventSourceConstructor =>
  class InProcessEventSource implements EventSourceLike {
    readyState = 0;
    private readonly listeners = new Map<string, Set<Listener>>();
    private readonly controller = new AbortController();
    private reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    private closed = false;

    constructor(url: string) {
      const target = new URL(url);
      void this.run(target.pathname + target.search);
    }

    addEventListener(type: string, listener: Listener): void {
      const set = this.listeners.get(type) ?? new Set<Listener>();
      set.add(listener);
      this.listeners.set(type, set);
    }

    close(): void {
      if (this.closed) return;
      this.closed = true;
      this.readyState = EVENT_SOURCE_CLOSED;
      this.controller.abort();
      void this.reader?.cancel().catch(() => undefined);
    }

    private emit(type: string, data?: string): void {
      if (this.closed) return;
      for (const listener of this.listeners.get(type) ?? []) {
        listener(data === undefined ? { type } : { type, data });
      }
    }

    private end(): void {
      if (this.closed) return;
      this.readyState = EVENT_SOURCE_CLOSED;
      this.emit('error');
    }

    private async run(path: string): Promise<void> {
      let response: Response;
      try {
        response = await browser.request(path, {
          headers: browserHeaders(browser, undefined),
          signal: this.controller.signal,
        });
      } catch {
        this.end();
        return;
      }
      if (this.closed) {
        await response.body?.cancel().catch(() => undefined);
        return;
      }
      if (response.status !== 200 || !response.body) {
        await response.body?.cancel().catch(() => undefined);
        this.end();
        return;
      }
      this.readyState = OPEN;
      this.emit('open');
      const reader = response.body.getReader();
      this.reader = reader;
      const decoder = new TextDecoder();
      let buffer = '';
      try {
        for (;;) {
          const chunk = await reader.read();
          if (chunk.done) break;
          buffer += decoder.decode(chunk.value, { stream: true });
          for (;;) {
            const boundary = buffer.indexOf('\n\n');
            if (boundary === -1) break;
            const block = parseSseBlock(buffer.slice(0, boundary));
            buffer = buffer.slice(boundary + 2);
            if (!block.comment) this.emit(block.event ?? 'message', block.data);
          }
        }
      } catch {
        this.end();
        return;
      }
      this.end();
    }
  };
