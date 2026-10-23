import type { Action } from '@combat-planner/domain';
import { project } from '@combat-planner/domain';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import type { ConnectionState, DmCombat, EndListener, PlayerCredentials } from '../src/client.ts';
import {
  createHonoApiClient,
  memoryPlayerKeys,
  EVENT_SOURCE_CLOSED,
  PROBE_TIMEOUT_MS,
  RECONNECTING_AFTER_MS,
  REOPEN_DELAYS_MS,
  REPAIR_TIMEOUT_MS,
} from '../src/hono-client.ts';
import type { EventSourceLike, MessageEventLike } from '../src/hono-client.ts';

const baseUrl = 'http://combat-planner.test/api';
const combatId = '01ARZ3NDEKTSV4RRFFQ69G5FAV';
const playerId = '01ARZ3NDEKTSV4RRFFQ69G5FAW';
const playerKey = 'player-key-signature';
const credentials: PlayerCredentials = { playerId, playerKey };

const seededKeys = () => {
  const keys = memoryPlayerKeys();
  keys.set(combatId, credentials);
  return keys;
};
const now = '2026-10-16T12:00:00.000Z';

const action: Action = {
  id: '01ARZ3NDEKTSV4RRFFQ69G5FAX',
  version: 2,
  type: 'setEscalation',
  escalation: 1,
};

const combatAt = (version: number): DmCombat => ({
  id: combatId,
  title: 'Goblin ambush',
  description: '',
  color: 7,
  status: 'setup',
  round: 1,
  escalation: 0,
  activeUnitId: null,
  lastPlayedAt: null,
  linkGeneration: 0,
  version,
  players: {},
  createdAt: now,
  updatedAt: now,
  units: [],
  undo: null,
});

interface Seen {
  method: string;
  url: URL;
  headers: Headers;
  body: unknown;
}

function stubFetch(status: number, body: unknown) {
  const seen: Seen[] = [];
  const fetch = async (input: string | URL | Request, init?: RequestInit) => {
    const request = new Request(input, init);
    seen.push({
      method: request.method,
      url: new URL(request.url),
      headers: request.headers,
      body: request.body === null ? null : await request.json(),
    });
    return new Response(body === null ? null : JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    });
  };
  return { fetch: fetch as typeof globalThis.fetch, seen };
}

function hangingFetch({ honorAbort }: { honorAbort: boolean }) {
  const signals: AbortSignal[] = [];
  const fetch = ((input: string | URL | Request, init?: RequestInit) => {
    const { signal } = new Request(input, init);
    signals.push(signal);
    return new Promise<Response>((_resolve, reject) => {
      if (honorAbort) signal.addEventListener('abort', () => reject(signal.reason));
    });
  }) as typeof globalThis.fetch;
  return { fetch, signals };
}

interface HeldRequest {
  signal: AbortSignal;
  answer: (version: number) => void;
}

function heldFetch() {
  const requests: HeldRequest[] = [];
  const fetch = ((input: string | URL | Request, init?: RequestInit) => {
    const { signal } = new Request(input, init);
    return new Promise<Response>((resolve, reject) => {
      requests.push({ signal, answer: (version) => resolve(Response.json(combatAt(version))) });
      signal.addEventListener('abort', () => reject(signal.reason));
    });
  }) as typeof globalThis.fetch;
  return { fetch, requests };
}

const failingFetch = (async () => {
  throw new TypeError('fetch failed');
}) as typeof globalThis.fetch;

class StubEventSource implements EventSourceLike {
  static instances: StubEventSource[] = [];
  readonly url: string;
  readonly listeners = new Map<string, Array<(event: MessageEventLike) => void>>();
  closed = false;
  readyState = 0;

  constructor(url: string) {
    this.url = url;
    StubEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: (event: MessageEventLike) => void) {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }

  close() {
    this.closed = true;
    this.readyState = EVENT_SOURCE_CLOSED;
  }

  open() {
    this.readyState = 1;
    this.emit('open');
  }

  refuse() {
    this.readyState = EVENT_SOURCE_CLOSED;
    this.emit('error');
  }

  emit(type: string, data?: unknown) {
    const event: MessageEventLike = data === undefined ? { type } : { type, data };
    for (const listener of this.listeners.get(type) ?? []) listener(event);
  }
}

afterEach(() => {
  StubEventSource.instances = [];
  vi.useRealTimers();
});

describe('createHonoApiClient error mapping', () => {
  it.each([
    [401, 'unauthorized'],
    [403, 'forbidden'],
    [404, 'notFound'],
    [409, 'version'],
    [422, 'invalid'],
    [400, 'invalid'],
    [413, 'limit'],
    [429, 'rateLimited'],
  ] as const)('maps %i to %s with the body message', async (status, code) => {
    const { fetch } = stubFetch(status, { message: `status ${status}` });
    const client = createHonoApiClient({ baseUrl, playerKeys: seededKeys(), fetch });
    await expect(client.combats.get(combatId)).rejects.toMatchObject({
      name: 'ApiError',
      status,
      code,
      message: `status ${status}`,
      retryable: false,
    });
  });

  it('maps 410 to linkRevoked', async () => {
    const { fetch } = stubFetch(410, { message: 'gone' });
    const client = createHonoApiClient({ baseUrl, playerKeys: seededKeys(), fetch });
    await expect(client.play.get(`${combatId}.0.signature`)).rejects.toMatchObject({
      status: 410,
      code: 'linkRevoked',
      message: 'gone',
    });
  });

  it.each([
    [409, { code: 'invalid', message: 'A tag with this name already exists' }, 'invalid'],
    [404, { code: 'linkRevoked', message: 'This link was reissued' }, 'linkRevoked'],
    [422, { code: 'limit', message: 'limit reached' }, 'limit'],
    [
      422,
      { code: 'emailTaken', message: 'An account with this email already exists' },
      'emailTaken',
    ],
    [403, { code: 'FORBIDDEN', message: 'nope' }, 'forbidden'],
    [410, { code: 'linkRevoked', message: 'This link was reissued' }, 'linkRevoked'],
  ] as const)('prefers a known body code over status %i', async (status, body, code) => {
    const { fetch } = stubFetch(status, body);
    const client = createHonoApiClient({ baseUrl, playerKeys: seededKeys(), fetch });
    await expect(client.tags.list()).rejects.toMatchObject({
      status,
      code,
      message: body.message,
    });
  });

  it('maps a failed fetch to a retryable network error', async () => {
    const client = createHonoApiClient({ baseUrl, playerKeys: seededKeys(), fetch: failingFetch });
    await expect(client.combats.list()).rejects.toMatchObject({
      name: 'ApiError',
      status: 0,
      code: 'network',
      message: 'fetch failed',
      retryable: true,
    });
  });
});

describe('createHonoApiClient player key', () => {
  const token = `${combatId}.0.signature`;
  const joined: PlayerCredentials = {
    playerId: '01ARZ3NDEKTSV4RRFFQ69G5FAY',
    playerKey: 'joined-key-signature',
  };
  const view = {
    combatId,
    playerId: joined.playerId,
    language: 'en',
    combat: project(combatAt(1), { kind: 'player', playerId: joined.playerId }),
  };

  function playServer(refusals = 0) {
    const seen: Seen[] = [];
    let refused = 0;
    const fetch = (async (input: string | URL | Request, init?: RequestInit) => {
      const request = new Request(input, init);
      const url = new URL(request.url);
      seen.push({ method: request.method, url, headers: request.headers, body: null });
      if (url.pathname.endsWith('/join')) return Response.json(joined);
      if (refused < refusals) {
        refused += 1;
        return Response.json({ code: 'unauthorized', message: 'no key' }, { status: 401 });
      }
      return Response.json(url.pathname.endsWith('/actions') ? { version: 3 } : view);
    }) as typeof globalThis.fetch;
    return { fetch, seen };
  }

  it('joins once before the first request and stores the issued id and key', async () => {
    const { fetch, seen } = playServer();
    const playerKeys = memoryPlayerKeys();
    const client = createHonoApiClient({ baseUrl, fetch, playerKeys });
    await Promise.all([client.play.get(token), client.play.get(token)]);
    expect(seen.map((request) => `${request.method} ${request.url.pathname}`)).toEqual([
      `POST /api/play/${combatId}/join`,
      `GET /api/play/${combatId}`,
      `GET /api/play/${combatId}`,
    ]);
    expect(seen[0]?.url.searchParams.get('t')).toBe(token);
    expect(seen[1]?.headers.get('X-Player-Id')).toBe(joined.playerId);
    expect(seen[1]?.headers.get('X-Player-Key')).toBe(joined.playerKey);
    expect(playerKeys.get(combatId)).toEqual(joined);
  });

  it('joins again once on 401 and retries with the new key', async () => {
    const { fetch, seen } = playServer(1);
    const playerKeys = seededKeys();
    const client = createHonoApiClient({ baseUrl, fetch, playerKeys });
    await expect(client.play.dispatch(token, action)).resolves.toEqual({ version: 3 });
    expect(seen.map((request) => request.headers.get('X-Player-Key'))).toEqual([
      playerKey,
      null,
      joined.playerKey,
    ]);
    expect(playerKeys.get(combatId)).toEqual(joined);
  });

  it('rejects with unauthorized when the new key is refused too', async () => {
    const { fetch, seen } = playServer(2);
    const client = createHonoApiClient({ baseUrl, fetch, playerKeys: seededKeys() });
    await expect(client.play.get(token)).rejects.toMatchObject({ code: 'unauthorized' });
    expect(seen).toHaveLength(3);
  });

  it('opens the stream after joining, with the issued id and key in the URL', async () => {
    const { fetch, seen } = playServer();
    const client = createHonoApiClient({ baseUrl, fetch, eventSource: StubEventSource });
    client.play.subscribe(
      token,
      () => {},
      () => {},
    );
    expect(StubEventSource.instances).toHaveLength(0);
    await vi.waitFor(() => expect(StubEventSource.instances).toHaveLength(1));
    expect(seen).toHaveLength(1);
    const url = new URL(StubEventSource.instances[0]!.url);
    expect(url.searchParams.get('playerId')).toBe(joined.playerId);
    expect(url.searchParams.get('playerKey')).toBe(joined.playerKey);
  });

  it('joins no more after leave, even when a stream probe meets a 401', async () => {
    const seen: string[] = [];
    let answerLeave: (response: Response) => void = () => {};
    const fetch = (async (input: string | URL | Request, init?: RequestInit) => {
      const request = new Request(input, init);
      const { pathname } = new URL(request.url);
      seen.push(`${request.method} ${pathname}`);
      if (pathname.endsWith('/join')) return Response.json(joined);
      if (pathname.endsWith('/leave')) {
        return new Promise<Response>((resolve) => {
          answerLeave = resolve;
        });
      }
      return Response.json({ code: 'unauthorized', message: 'no key' }, { status: 401 });
    }) as typeof globalThis.fetch;
    const client = createHonoApiClient({
      baseUrl,
      fetch,
      playerKeys: seededKeys(),
      eventSource: StubEventSource,
    });
    const ended = vi.fn();
    client.play.subscribe(token, () => {}, ended);
    const source = StubEventSource.instances[0]!;
    source.open();
    const leaving = client.play.leave(combatId);
    source.refuse();
    await vi.waitFor(() => expect(ended).toHaveBeenCalledWith({ type: 'unauthorized' }));
    answerLeave(new Response(null, { status: 204 }));
    await leaving;
    await expect(client.play.dispatch(token, action)).rejects.toMatchObject({
      code: 'unauthorized',
    });
    expect(seen).toEqual([`POST /api/play/${combatId}/leave`, `GET /api/play/${combatId}`]);
    expect(StubEventSource.instances).toHaveLength(1);
  });

  it('closes the player stream on leave and joins again when the link is opened anew', async () => {
    const { fetch, seen } = playServer();
    const client = createHonoApiClient({
      baseUrl,
      fetch,
      playerKeys: seededKeys(),
      eventSource: StubEventSource,
    });
    const ended = vi.fn();
    client.play.subscribe(token, () => {}, ended);
    const source = StubEventSource.instances[0]!;
    source.open();
    await client.play.leave(combatId);
    expect(source.closed).toBe(true);
    expect(ended).not.toHaveBeenCalled();
    await expect(client.play.get(token)).resolves.toEqual(view);
    expect(seen.map((request) => request.url.pathname)).toEqual([
      `/api/play/${combatId}/leave`,
      `/api/play/${combatId}/join`,
      `/api/play/${combatId}`,
    ]);
  });

  it('opens no stream when unsubscribed while joining', async () => {
    const { fetch } = playServer();
    const client = createHonoApiClient({ baseUrl, fetch, eventSource: StubEventSource });
    const unsubscribe = client.play.subscribe(
      token,
      () => {},
      () => {},
    );
    unsubscribe();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(StubEventSource.instances).toHaveLength(0);
  });
});

describe('createHonoApiClient requests', () => {
  it('dispatch posts the action and resolves with { version }', async () => {
    const { fetch, seen } = stubFetch(200, { version: 3 });
    const client = createHonoApiClient({ baseUrl, playerKeys: seededKeys(), fetch });
    await expect(client.combats.dispatch(combatId, action)).resolves.toEqual({ version: 3 });
    expect(seen).toHaveLength(1);
    expect(seen[0]?.method).toBe('POST');
    expect(seen[0]?.url.pathname).toBe(`/api/combats/${combatId}/actions`);
    expect(seen[0]?.body).toEqual(action);
  });

  it('play.dispatch sends the token as a query and the player id and key as headers', async () => {
    const { fetch, seen } = stubFetch(200, { version: 4 });
    const client = createHonoApiClient({ baseUrl, playerKeys: seededKeys(), fetch });
    const token = `${combatId}.0.signature`;
    await expect(client.play.dispatch(token, action)).resolves.toEqual({ version: 4 });
    expect(seen[0]?.url.pathname).toBe(`/api/play/${combatId}/actions`);
    expect(seen[0]?.url.searchParams.get('t')).toBe(token);
    expect(seen[0]?.headers.get('X-Player-Id')).toBe(playerId);
    expect(seen[0]?.headers.get('X-Player-Key')).toBe(playerKey);
  });

  it('play.leave posts the player id and key, then forgets them', async () => {
    const { fetch, seen } = stubFetch(204, null);
    const playerKeys = seededKeys();
    const client = createHonoApiClient({ baseUrl, playerKeys, fetch });
    await expect(client.play.leave(combatId)).resolves.toBeUndefined();
    expect(seen[0]?.method).toBe('POST');
    expect(seen[0]?.url.pathname).toBe(`/api/play/${combatId}/leave`);
    expect(seen[0]?.headers.get('X-Player-Id')).toBe(playerId);
    expect(seen[0]?.headers.get('X-Player-Key')).toBe(playerKey);
    expect(playerKeys.get(combatId)).toBeNull();
  });

  it('play.leave forgets a key the server no longer knows and keeps it when unreachable', async () => {
    const refused = seededKeys();
    const { fetch } = stubFetch(401, { code: 'unauthorized', message: 'no key' });
    await expect(
      createHonoApiClient({ baseUrl, playerKeys: refused, fetch }).play.leave(combatId),
    ).resolves.toBeUndefined();
    expect(refused.get(combatId)).toBeNull();
    const offline = seededKeys();
    await expect(
      createHonoApiClient({ baseUrl, playerKeys: offline, fetch: failingFetch }).play.leave(
        combatId,
      ),
    ).rejects.toMatchObject({ code: 'network' });
    expect(offline.get(combatId)).toEqual(credentials);
  });

  it('rejects a token without a leading combat id', async () => {
    const { fetch } = stubFetch(200, { version: 4 });
    const client = createHonoApiClient({ baseUrl, playerKeys: seededKeys(), fetch });
    await expect(client.play.get('not-a-token')).rejects.toMatchObject({
      code: 'invalid',
    });
  });

  it('remove resolves without a body', async () => {
    const { fetch, seen } = stubFetch(204, null);
    const client = createHonoApiClient({ baseUrl, playerKeys: seededKeys(), fetch });
    await expect(client.combats.remove(combatId)).resolves.toBeUndefined();
    expect(seen[0]?.method).toBe('DELETE');
  });

  it('auth.session maps the Better Auth user to a Session', async () => {
    const { fetch } = stubFetch(200, {
      session: { id: 'session-1' },
      user: { id: 'user-1', email: 'dm@example.com', name: 'DM', language: 'ru' },
      method: 'google',
    });
    const client = createHonoApiClient({ baseUrl, playerKeys: seededKeys(), fetch });
    await expect(client.auth.session()).resolves.toEqual({
      userId: 'user-1',
      email: 'dm@example.com',
      displayName: 'DM',
      language: 'ru',
      method: 'google',
    });
  });

  it('auth.signIn and auth.signUp report the email method', async () => {
    const { fetch } = stubFetch(200, {
      token: 'token',
      user: { id: 'user-1', email: 'dm@example.com', name: 'DM', language: 'en' },
    });
    const client = createHonoApiClient({ baseUrl, playerKeys: seededKeys(), fetch });
    await expect(
      client.auth.signIn({ email: 'dm@example.com', password: 'password' }),
    ).resolves.toMatchObject({ method: 'email' });
    await expect(
      client.auth.signUp({ email: 'dm@example.com', password: 'password', displayName: 'DM' }),
    ).resolves.toMatchObject({ method: 'email' });
  });

  it('auth.signUp sends the chosen language as Accept-Language', async () => {
    const { fetch, seen } = stubFetch(200, {
      token: 'token',
      user: { id: 'user-1', email: 'dm@example.com', name: 'DM', language: 'en' },
    });
    const client = createHonoApiClient({ baseUrl, playerKeys: seededKeys(), fetch });
    await client.auth.signUp({
      email: 'dm@example.com',
      password: 'password',
      displayName: 'DM',
      language: 'en',
    });
    expect(seen[0]?.headers.get('accept-language')).toBe('en');
    expect(seen[0]?.body).toEqual({ email: 'dm@example.com', password: 'password', name: 'DM' });
  });

  it('rejects a response that does not match the schema', async () => {
    const { fetch } = stubFetch(200, { version: 'three' });
    const client = createHonoApiClient({ baseUrl, playerKeys: seededKeys(), fetch });
    await expect(client.combats.dispatch(combatId, action)).rejects.toThrow();
  });
});

describe('createHonoApiClient connection', () => {
  it('reports connected, reconnecting after 10 s of errors, and refetches on reopen', async () => {
    vi.useFakeTimers();
    const { fetch } = stubFetch(200, combatAt(5));
    const client = createHonoApiClient({
      baseUrl,
      playerKeys: seededKeys(),
      fetch,
      eventSource: StubEventSource,
    });
    const states: ConnectionState[] = [];
    client.connection.subscribe((state) => states.push(state));
    const documents: DmCombat[] = [];
    const ended = vi.fn();
    const unsubscribe = client.combats.subscribe(combatId, (doc) => documents.push(doc), ended);
    const source = StubEventSource.instances[0]!;
    expect(source.url).toBe(`${baseUrl}/combats/${combatId}/events`);
    expect(client.connection.state()).toBe('offline');

    source.emit('open');
    expect(client.connection.state()).toBe('connected');
    source.emit('message', JSON.stringify({ type: 'document', version: 1, document: combatAt(1) }));
    expect(documents.map((doc) => doc.version)).toEqual([1]);

    source.emit('error');
    expect(client.connection.state()).toBe('connected');
    vi.advanceTimersByTime(RECONNECTING_AFTER_MS - 1);
    expect(client.connection.state()).toBe('connected');
    vi.advanceTimersByTime(1);
    expect(client.connection.state()).toBe('reconnecting');

    source.emit('open');
    expect(client.connection.state()).toBe('connected');
    await vi.waitFor(() => expect(documents.map((doc) => doc.version)).toEqual([1, 5]));

    source.emit('message', JSON.stringify({ type: 'document', version: 4, document: combatAt(4) }));
    expect(documents).toHaveLength(2);

    unsubscribe();
    expect(source.closed).toBe(true);
    expect(client.connection.state()).toBe('offline');
    expect(states).toEqual(['connected', 'reconnecting', 'connected', 'offline']);
    expect(ended).not.toHaveBeenCalled();
  });

  it('hands the DM the undo summary from get, open and the stream', async () => {
    const undone = { ...combatAt(3), undo: { action, unitName: null } };
    const { fetch } = stubFetch(200, undone);
    const client = createHonoApiClient({
      baseUrl,
      playerKeys: seededKeys(),
      fetch,
      eventSource: StubEventSource,
    });
    await expect(client.combats.get(combatId)).resolves.toEqual(undone);
    await expect(client.combats.open(combatId)).resolves.toEqual(undone);
    const documents: DmCombat[] = [];
    const unsubscribe = client.combats.subscribe(combatId, (doc) => documents.push(doc), vi.fn());
    const source = StubEventSource.instances.at(-1)!;
    source.emit('open');
    source.emit('message', JSON.stringify({ type: 'document', version: 3, document: undone }));
    expect(documents).toEqual([undone]);
    unsubscribe();
  });

  it.each([
    ['is not JSON', '{"type":"document",'],
    ['fails the schema', JSON.stringify({ type: 'document', version: 2, document: { id: 1 } })],
  ])('drops an event that %s and refetches the document', async (_case, data) => {
    const { fetch, seen } = stubFetch(200, combatAt(6));
    const client = createHonoApiClient({
      baseUrl,
      playerKeys: seededKeys(),
      fetch,
      eventSource: StubEventSource,
    });
    const documents: DmCombat[] = [];
    const ended = vi.fn();
    const unsubscribe = client.combats.subscribe(combatId, (doc) => documents.push(doc), ended);
    const source = StubEventSource.instances.at(-1)!;
    source.emit('open');
    expect(() => source.emit('message', data)).not.toThrow();
    await vi.waitFor(() => expect(documents.map((doc) => doc.version)).toEqual([6]));
    expect(seen.map((request) => request.url.pathname)).toEqual([`/api/combats/${combatId}`]);
    expect(ended).not.toHaveBeenCalled();
    expect(source.closed).toBe(false);
    unsubscribe();
  });

  it('answers a burst of malformed events with one refetch and one follow-up after it', async () => {
    const answers: Array<() => void> = [];
    const paths: string[] = [];
    const fetch = ((input: string | URL | Request, init?: RequestInit) => {
      paths.push(new URL(new Request(input, init).url).pathname);
      const version = 5 + paths.length;
      return new Promise<Response>((resolve) => {
        answers.push(() => resolve(Response.json(combatAt(version))));
      });
    }) as typeof globalThis.fetch;
    const client = createHonoApiClient({
      baseUrl,
      playerKeys: seededKeys(),
      fetch,
      eventSource: StubEventSource,
    });
    const documents: DmCombat[] = [];
    const unsubscribe = client.combats.subscribe(combatId, (doc) => documents.push(doc), vi.fn());
    const source = StubEventSource.instances.at(-1)!;
    source.emit('open');
    source.emit('message', 'not json');
    source.emit('message', '{"type":"document",');
    source.emit('message', JSON.stringify({ type: 'document', version: 2, document: { id: 1 } }));
    await vi.waitFor(() => expect(paths).toHaveLength(1));
    source.emit('message', 'not json');
    expect(paths).toEqual([`/api/combats/${combatId}`]);
    answers[0]!();
    await vi.waitFor(() => expect(documents.map((doc) => doc.version)).toEqual([6]));
    await vi.waitFor(() => expect(paths).toHaveLength(2));
    answers[1]!();
    await vi.waitFor(() => expect(documents.map((doc) => doc.version)).toEqual([6, 7]));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(paths).toHaveLength(2);
    source.emit('message', 'not json');
    await vi.waitFor(() => expect(paths).toHaveLength(3));
    answers[2]!();
    await vi.waitFor(() => expect(documents.map((doc) => doc.version)).toEqual([6, 7, 8]));
    unsubscribe();
  });

  it('runs the follow-up refetch after a failed repair', async () => {
    const paths: string[] = [];
    const fails: Array<() => void> = [];
    const fetch = ((input: string | URL | Request, init?: RequestInit) => {
      paths.push(new URL(new Request(input, init).url).pathname);
      if (paths.length > 1) return Promise.resolve(Response.json(combatAt(9)));
      return new Promise<Response>((_resolve, reject) => {
        fails.push(() => reject(new TypeError('fetch failed')));
      });
    }) as typeof globalThis.fetch;
    const client = createHonoApiClient({
      baseUrl,
      playerKeys: seededKeys(),
      fetch,
      eventSource: StubEventSource,
    });
    const documents: DmCombat[] = [];
    const unsubscribe = client.combats.subscribe(combatId, (doc) => documents.push(doc), vi.fn());
    const source = StubEventSource.instances.at(-1)!;
    source.emit('open');
    source.emit('message', 'not json');
    await vi.waitFor(() => expect(paths).toHaveLength(1));
    source.emit('message', 'not json');
    fails[0]!();
    await vi.waitFor(() => expect(documents.map((doc) => doc.version)).toEqual([9]));
    expect(paths).toHaveLength(2);
    unsubscribe();
  });

  it('aborts a repair that hangs past the timeout and repairs again on the next bad event', async () => {
    vi.useFakeTimers();
    const signals: AbortSignal[] = [];
    const fetch = ((input: string | URL | Request, init?: RequestInit) => {
      const { signal } = new Request(input, init);
      signals.push(signal);
      if (signals.length > 1) return Promise.resolve(Response.json(combatAt(8)));
      return new Promise<Response>((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(signal.reason));
      });
    }) as typeof globalThis.fetch;
    const client = createHonoApiClient({
      baseUrl,
      playerKeys: seededKeys(),
      fetch,
      eventSource: StubEventSource,
    });
    const documents: DmCombat[] = [];
    const unsubscribe = client.combats.subscribe(combatId, (doc) => documents.push(doc), vi.fn());
    const source = StubEventSource.instances.at(-1)!;
    source.emit('open');
    source.emit('message', 'not json');
    await vi.advanceTimersByTimeAsync(0);
    expect(signals).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(REPAIR_TIMEOUT_MS);
    expect(signals[0]!.aborted).toBe(true);
    expect(signals).toHaveLength(1);
    source.emit('message', 'not json');
    await vi.advanceTimersByTimeAsync(0);
    expect(signals).toHaveLength(2);
    expect(documents.map((doc) => doc.version)).toEqual([8]);
    unsubscribe();
  });

  it('drops a stuck repair on reconnect so later bad events repair again', async () => {
    const signals: AbortSignal[] = [];
    const fetch = ((input: string | URL | Request, init?: RequestInit) => {
      const { signal } = new Request(input, init);
      signals.push(signal);
      if (signals.length > 1) return Promise.resolve(Response.json(combatAt(8)));
      return new Promise<Response>(() => {});
    }) as typeof globalThis.fetch;
    const client = createHonoApiClient({
      baseUrl,
      playerKeys: seededKeys(),
      fetch,
      eventSource: StubEventSource,
    });
    const documents: DmCombat[] = [];
    const unsubscribe = client.combats.subscribe(combatId, (doc) => documents.push(doc), vi.fn());
    const source = StubEventSource.instances.at(-1)!;
    source.emit('open');
    source.emit('message', 'not json');
    await vi.waitFor(() => expect(signals).toHaveLength(1));
    source.emit('error');
    await vi.waitFor(() => expect(signals).toHaveLength(2));
    source.emit('open');
    expect(signals[0]!.aborted).toBe(true);
    await vi.waitFor(() => expect(signals).toHaveLength(3));
    source.emit('message', 'not json');
    await vi.waitFor(() => expect(signals).toHaveLength(4));
    unsubscribe();
  });

  it('holds a repair until the reconnect refetch answers, then runs it as the follow-up', async () => {
    const { fetch, requests } = heldFetch();
    const client = createHonoApiClient({
      baseUrl,
      playerKeys: seededKeys(),
      fetch,
      eventSource: StubEventSource,
    });
    const documents: DmCombat[] = [];
    const unsubscribe = client.combats.subscribe(combatId, (doc) => documents.push(doc), vi.fn());
    const source = StubEventSource.instances.at(-1)!;
    source.emit('open');
    source.emit('error');
    await vi.waitFor(() => expect(requests).toHaveLength(1));
    requests[0]!.answer(2);
    await new Promise((resolve) => setTimeout(resolve, 0));
    source.emit('open');
    await vi.waitFor(() => expect(requests).toHaveLength(2));
    source.emit('message', 'not json');
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(requests).toHaveLength(2);
    requests[1]!.answer(5);
    await vi.waitFor(() => expect(documents.map((doc) => doc.version)).toEqual([5]));
    await vi.waitFor(() => expect(requests).toHaveLength(3));
    requests[2]!.answer(6);
    await vi.waitFor(() => expect(documents.map((doc) => doc.version)).toEqual([5, 6]));
    unsubscribe();
  });

  it('aborts a reconnect refetch past the timeout and delivers nothing after close', async () => {
    vi.useFakeTimers();
    const { fetch, requests } = heldFetch();
    const client = createHonoApiClient({
      baseUrl,
      playerKeys: seededKeys(),
      fetch,
      eventSource: StubEventSource,
    });
    const documents: DmCombat[] = [];
    const unsubscribe = client.combats.subscribe(combatId, (doc) => documents.push(doc), vi.fn());
    const source = StubEventSource.instances.at(-1)!;
    const reconnect = async () => {
      source.emit('error');
      await vi.advanceTimersByTimeAsync(0);
      requests.at(-1)!.answer(2);
      await vi.advanceTimersByTimeAsync(0);
      source.emit('open');
      await vi.advanceTimersByTimeAsync(0);
      return requests.at(-1)!;
    };
    source.emit('open');
    const stuck = await reconnect();
    expect(requests).toHaveLength(2);
    await vi.advanceTimersByTimeAsync(REPAIR_TIMEOUT_MS);
    expect(stuck.signal.aborted).toBe(true);
    source.emit('message', 'not json');
    await vi.advanceTimersByTimeAsync(0);
    expect(requests).toHaveLength(3);
    requests[2]!.answer(4);
    await vi.advanceTimersByTimeAsync(0);
    expect(documents.map((doc) => doc.version)).toEqual([4]);
    const late = await reconnect();
    expect(requests).toHaveLength(5);
    unsubscribe();
    expect(late.signal.aborted).toBe(true);
    late.answer(9);
    await vi.advanceTimersByTimeAsync(0);
    expect(documents.map((doc) => doc.version)).toEqual([4]);
  });

  it('hands the player the DM language from the stream and from the refetch', async () => {
    const token = `${combatId}.0.signature`;
    const document = project(combatAt(7), { kind: 'player', playerId });
    const { fetch } = stubFetch(200, { combatId, playerId, language: 'fr', combat: document });
    const client = createHonoApiClient({
      baseUrl,
      playerKeys: seededKeys(),
      fetch,
      eventSource: StubEventSource,
    });
    const received: Array<[number, string | undefined]> = [];
    const unsubscribe = client.play.subscribe(
      token,
      (doc, language) => received.push([doc.version, language]),
      vi.fn(),
    );
    const source = StubEventSource.instances.at(-1)!;
    source.emit('open');
    source.emit(
      'message',
      JSON.stringify({
        type: 'document',
        version: 6,
        document: { ...document, version: 6 },
        language: 'ja',
      }),
    );
    expect(received).toEqual([[6, 'ja']]);
    source.emit('message', 'not json');
    await vi.waitFor(() =>
      expect(received).toEqual([
        [6, 'ja'],
        [7, 'fr'],
      ]),
    );
    unsubscribe();
  });

  it('closes the stream on a final event and hands it to onEnd', () => {
    const { fetch } = stubFetch(200, combatAt(1));
    const client = createHonoApiClient({
      baseUrl,
      playerKeys: seededKeys(),
      fetch,
      eventSource: StubEventSource,
    });
    const ended = vi.fn();
    client.combats.subscribe(combatId, () => {}, ended);
    const source = StubEventSource.instances[0]!;
    source.emit('open');
    source.emit('deleted', JSON.stringify({ type: 'deleted', title: 'Goblin ambush' }));
    expect(ended).toHaveBeenCalledWith({ type: 'deleted', title: 'Goblin ambush' });
    expect(source.closed).toBe(true);
    expect(client.connection.state()).toBe('offline');
  });

  it('hands presence events to the DM and keeps the stream open', () => {
    const { fetch } = stubFetch(200, combatAt(1));
    const client = createHonoApiClient({
      baseUrl,
      playerKeys: seededKeys(),
      fetch,
      eventSource: StubEventSource,
    });
    const ended = vi.fn();
    const presence = vi.fn();
    const documents = vi.fn();
    client.combats.subscribe(combatId, documents, ended, presence);
    const source = StubEventSource.instances[0]!;
    source.open();
    source.emit('playerJoined', JSON.stringify({ type: 'playerJoined' }));
    source.emit('playerLeft', JSON.stringify({ type: 'playerLeft', name: 'Mika' }));
    source.emit(
      'document',
      JSON.stringify({ type: 'document', version: 2, document: combatAt(2) }),
    );
    expect(presence.mock.calls).toEqual([
      [{ type: 'playerJoined' }],
      [{ type: 'playerLeft', name: 'Mika' }],
    ]);
    expect(documents).toHaveBeenCalledWith(combatAt(2), undefined);
    expect(ended).not.toHaveBeenCalled();
    expect(source.closed).toBe(false);
    expect(client.connection.state()).toBe('connected');
  });

  it('ends a player stream on dropped and opens no new stream by itself', async () => {
    const { fetch } = stubFetch(200, null);
    const client = createHonoApiClient({
      baseUrl,
      playerKeys: seededKeys(),
      fetch,
      eventSource: StubEventSource,
    });
    const ended = vi.fn();
    client.play.subscribe(`${combatId}.2.signature`, () => {}, ended);
    const source = StubEventSource.instances[0]!;
    source.emit('open');
    source.emit('dropped', JSON.stringify({ type: 'dropped' }));
    expect(ended).toHaveBeenCalledWith({ type: 'dropped' });
    expect(source.closed).toBe(true);
    source.emit('error');
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(StubEventSource.instances).toHaveLength(1);
    expect(client.connection.state()).toBe('offline');
  });

  it('ends a player stream on left without reopening it', async () => {
    const { fetch } = stubFetch(200, null);
    const client = createHonoApiClient({
      baseUrl,
      playerKeys: seededKeys(),
      fetch,
      eventSource: StubEventSource,
    });
    const ended = vi.fn();
    client.play.subscribe(`${combatId}.2.signature`, () => {}, ended);
    const source = StubEventSource.instances[0]!;
    source.open();
    source.emit('left', JSON.stringify({ type: 'left' }));
    expect(ended).toHaveBeenCalledWith({ type: 'left' });
    expect(source.closed).toBe(true);
    source.emit('error');
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(StubEventSource.instances).toHaveLength(1);
  });

  it('play.subscribe puts the token, the player id and the key into the stream URL', () => {
    const { fetch } = stubFetch(200, null);
    const client = createHonoApiClient({
      baseUrl,
      playerKeys: seededKeys(),
      fetch,
      eventSource: StubEventSource,
    });
    const token = `${combatId}.2.signature`;
    client.play.subscribe(
      token,
      () => {},
      () => {},
    );
    const url = new URL(StubEventSource.instances[0]!.url);
    expect(url.pathname).toBe(`/api/play/${combatId}/events`);
    expect(url.searchParams.get('t')).toBe(token);
    expect(url.searchParams.get('playerId')).toBe(playerId);
    expect(url.searchParams.get('playerKey')).toBe(playerKey);
  });

  it('stays offline without an EventSource implementation', () => {
    const { fetch } = stubFetch(200, null);
    const client = createHonoApiClient({
      baseUrl,
      playerKeys: seededKeys(),
      fetch,
      eventSource: undefined,
    });
    const unsubscribe = client.combats.subscribe(
      combatId,
      () => {},
      () => {},
    );
    expect(client.connection.state()).toBe('offline');
    unsubscribe();
  });
});

describe('createHonoApiClient stream probe', () => {
  const token = `${combatId}.0.signature`;

  const streams = {
    dm: (client: ReturnType<typeof createHonoApiClient>, onEnd: EndListener) =>
      client.combats.subscribe(combatId, () => {}, onEnd),
    player: (client: ReturnType<typeof createHonoApiClient>, onEnd: EndListener) =>
      client.play.subscribe(token, () => {}, onEnd),
  };

  const documentEvent = (kind: keyof typeof streams) => {
    const combat = { ...combatAt(1), title: 'Ущелье гоблинов' };
    const document = kind === 'dm' ? combat : project(combat, { kind: 'player', playerId });
    return JSON.stringify({ type: 'document', version: 1, document });
  };

  describe.each(['dm', 'player'] as const)('%s stream', (kind) => {
    it('ends with linkRevoked when the probe answers 410', async () => {
      const { fetch, seen } = stubFetch(410, { code: 'linkRevoked', message: 'reissued' });
      const client = createHonoApiClient({
        baseUrl,
        playerKeys: seededKeys(),
        fetch,
        eventSource: StubEventSource,
      });
      const ended = vi.fn();
      streams[kind](client, ended);
      const source = StubEventSource.instances[0]!;
      source.emit('open');
      source.emit('error');
      await vi.waitFor(() => expect(ended).toHaveBeenCalledWith({ type: 'linkRevoked' }));
      expect(seen).toHaveLength(1);
      expect(seen[0]?.url.pathname).toBe(
        kind === 'dm' ? `/api/combats/${combatId}` : `/api/play/${combatId}`,
      );
      expect(source.closed).toBe(true);
      expect(client.connection.state()).toBe('offline');
    });

    it('ends with deleted and the last title when the probe answers 404', async () => {
      const { fetch } = stubFetch(404, { code: 'notFound', message: 'Combat not found' });
      const client = createHonoApiClient({
        baseUrl,
        playerKeys: seededKeys(),
        fetch,
        eventSource: StubEventSource,
      });
      const ended = vi.fn();
      streams[kind](client, ended);
      const source = StubEventSource.instances[0]!;
      source.emit('open');
      source.emit('message', documentEvent(kind));
      source.emit('error');
      await vi.waitFor(() =>
        expect(ended).toHaveBeenCalledWith({ type: 'deleted', title: 'Ущелье гоблинов' }),
      );
      expect(ended).toHaveBeenCalledTimes(1);
      expect(source.closed).toBe(true);
    });

    it('ends with deleted and an empty title when no document arrived', async () => {
      const { fetch } = stubFetch(404, { code: 'notFound', message: 'Combat not found' });
      const client = createHonoApiClient({
        baseUrl,
        playerKeys: seededKeys(),
        fetch,
        eventSource: StubEventSource,
      });
      const ended = vi.fn();
      streams[kind](client, ended);
      StubEventSource.instances[0]!.emit('error');
      await vi.waitFor(() => expect(ended).toHaveBeenCalledWith({ type: 'deleted', title: '' }));
    });

    it('keeps the browser reconnect on any other probe result', async () => {
      const { fetch, seen } = stubFetch(500, { message: 'boom' });
      const client = createHonoApiClient({
        baseUrl,
        playerKeys: seededKeys(),
        fetch,
        eventSource: StubEventSource,
      });
      const ended = vi.fn();
      streams[kind](client, ended);
      const source = StubEventSource.instances[0]!;
      source.emit('open');
      source.emit('error');
      await vi.waitFor(() => expect(seen).toHaveLength(1));
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(ended).not.toHaveBeenCalled();
      expect(source.closed).toBe(false);
    });

    it('ends with unauthorized when the probe answers 401', async () => {
      const { fetch } = stubFetch(401, { message: 'Unauthorized' });
      const client = createHonoApiClient({
        baseUrl,
        playerKeys: seededKeys(),
        fetch,
        eventSource: StubEventSource,
      });
      const ended = vi.fn();
      streams[kind](client, ended);
      const source = StubEventSource.instances[0]!;
      source.open();
      source.refuse();
      await vi.waitFor(() => expect(ended).toHaveBeenCalledWith({ type: 'unauthorized' }));
      expect(ended).toHaveBeenCalledTimes(1);
      expect(source.closed).toBe(true);
      expect(StubEventSource.instances).toHaveLength(1);
      expect(client.connection.state()).toBe('offline');
    });

    it('reopens a refused stream itself with backoff and reports reconnecting until it opens', async () => {
      vi.useFakeTimers();
      const { fetch, seen } = stubFetch(502, { message: 'Bad gateway' });
      const client = createHonoApiClient({
        baseUrl,
        playerKeys: seededKeys(),
        fetch,
        eventSource: StubEventSource,
      });
      const states: ConnectionState[] = [];
      client.connection.subscribe((state) => states.push(state));
      const ended = vi.fn();
      streams[kind](client, ended);
      const first = StubEventSource.instances[0]!;
      first.open();
      const settle = async () => {
        for (let turn = 0; turn < 10; turn += 1) await vi.advanceTimersByTimeAsync(0);
      };
      let waited = 0;
      for (const [attempt, delay] of [...REOPEN_DELAYS_MS, 15_000].entries()) {
        StubEventSource.instances[attempt]!.refuse();
        await settle();
        expect(seen).toHaveLength(attempt + 1);
        await vi.advanceTimersByTimeAsync(delay - 1);
        expect(StubEventSource.instances).toHaveLength(attempt + 1);
        await vi.advanceTimersByTimeAsync(1);
        expect(StubEventSource.instances).toHaveLength(attempt + 2);
        expect(StubEventSource.instances[attempt]!.closed).toBe(true);
        expect(StubEventSource.instances[attempt + 1]!.url).toBe(first.url);
        waited += delay;
        expect(client.connection.state()).toBe(
          waited >= RECONNECTING_AFTER_MS ? 'reconnecting' : 'connected',
        );
      }
      StubEventSource.instances.at(-1)!.open();
      expect(client.connection.state()).toBe('connected');
      expect(states).toEqual(['connected', 'reconnecting', 'connected']);
      expect(ended).not.toHaveBeenCalled();
      StubEventSource.instances.at(-1)!.refuse();
      await settle();
      await vi.advanceTimersByTimeAsync(REOPEN_DELAYS_MS[0] - 1);
      expect(StubEventSource.instances).toHaveLength(REOPEN_DELAYS_MS.length + 2);
      await vi.advanceTimersByTimeAsync(1);
      expect(StubEventSource.instances).toHaveLength(REOPEN_DELAYS_MS.length + 3);
    });

    it('does not end a stream that was closed before the probe answered', async () => {
      const { fetch } = stubFetch(410, { code: 'linkRevoked', message: 'reissued' });
      const client = createHonoApiClient({
        baseUrl,
        playerKeys: seededKeys(),
        fetch,
        eventSource: StubEventSource,
      });
      const ended = vi.fn();
      const unsubscribe = streams[kind](client, ended);
      StubEventSource.instances[0]!.emit('error');
      unsubscribe();
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(ended).not.toHaveBeenCalled();
    });

    const settle = async () => {
      for (let turn = 0; turn < 10; turn += 1) await vi.advanceTimersByTimeAsync(0);
    };

    const restBody = () => {
      const combat = combatAt(1);
      if (kind === 'dm') return combat;
      return {
        combatId,
        playerId,
        language: 'en',
        combat: project(combat, { kind: 'player', playerId }),
      };
    };

    it('reopens a refused stream after the REST probe answers 200', async () => {
      vi.useFakeTimers();
      const { fetch, seen } = stubFetch(200, restBody());
      const client = createHonoApiClient({
        baseUrl,
        playerKeys: seededKeys(),
        fetch,
        eventSource: StubEventSource,
      });
      const ended = vi.fn();
      const unsubscribe = streams[kind](client, ended);
      const first = StubEventSource.instances[0]!;
      first.open();
      first.emit('error');
      await settle();
      expect(seen).toHaveLength(1);
      await vi.advanceTimersByTimeAsync(REOPEN_DELAYS_MS.at(-1)!);
      expect(StubEventSource.instances).toHaveLength(1);
      first.refuse();
      await settle();
      expect(seen).toHaveLength(2);
      await vi.advanceTimersByTimeAsync(REOPEN_DELAYS_MS[0] - 1);
      expect(StubEventSource.instances).toHaveLength(1);
      await vi.advanceTimersByTimeAsync(1);
      expect(StubEventSource.instances).toHaveLength(2);
      expect(first.closed).toBe(true);
      expect(ended).not.toHaveBeenCalled();
      unsubscribe();
      expect(vi.getTimerCount()).toBe(0);
    });

    it('leaves no timer or source when unsubscribed while the reopen timer is pending', async () => {
      vi.useFakeTimers();
      const { fetch, seen } = stubFetch(502, { message: 'Bad gateway' });
      const client = createHonoApiClient({
        baseUrl,
        playerKeys: seededKeys(),
        fetch,
        eventSource: StubEventSource,
      });
      const ended = vi.fn();
      const unsubscribe = streams[kind](client, ended);
      const source = StubEventSource.instances[0]!;
      source.open();
      source.refuse();
      await settle();
      expect(seen).toHaveLength(1);
      expect(vi.getTimerCount()).toBe(2);
      unsubscribe();
      expect(vi.getTimerCount()).toBe(0);
      await vi.advanceTimersByTimeAsync(RECONNECTING_AFTER_MS + REOPEN_DELAYS_MS.at(-1)!);
      expect(StubEventSource.instances).toHaveLength(1);
      expect(source.closed).toBe(true);
      expect(seen).toHaveLength(1);
      expect(ended).not.toHaveBeenCalled();
      expect(client.connection.state()).toBe('offline');
    });

    it('aborts the probe fetch and leaves no timer or source when unsubscribed while the probe is pending', async () => {
      vi.useFakeTimers();
      const { fetch, signals } = hangingFetch({ honorAbort: true });
      const client = createHonoApiClient({
        baseUrl,
        playerKeys: seededKeys(),
        fetch,
        eventSource: StubEventSource,
      });
      const ended = vi.fn();
      const unsubscribe = streams[kind](client, ended);
      const source = StubEventSource.instances[0]!;
      source.open();
      source.refuse();
      await settle();
      expect(signals).toHaveLength(1);
      expect(signals[0]!.aborted).toBe(false);
      unsubscribe();
      expect(signals[0]!.aborted).toBe(true);
      expect(vi.getTimerCount()).toBe(0);
      await settle();
      await vi.advanceTimersByTimeAsync(PROBE_TIMEOUT_MS + REOPEN_DELAYS_MS.at(-1)!);
      expect(StubEventSource.instances).toHaveLength(1);
      expect(source.closed).toBe(true);
      expect(signals).toHaveLength(1);
      expect(ended).not.toHaveBeenCalled();
      expect(client.connection.state()).toBe('offline');
    });

    it('times out a probe that never answers and counts it as a failed reopen', async () => {
      vi.useFakeTimers();
      const { fetch, signals } = hangingFetch({ honorAbort: false });
      const client = createHonoApiClient({
        baseUrl,
        playerKeys: seededKeys(),
        fetch,
        eventSource: StubEventSource,
      });
      const ended = vi.fn();
      const unsubscribe = streams[kind](client, ended);
      StubEventSource.instances[0]!.open();
      for (const [attempt, delay] of REOPEN_DELAYS_MS.slice(0, 2).entries()) {
        StubEventSource.instances[attempt]!.refuse();
        await settle();
        expect(signals).toHaveLength(attempt + 1);
        await vi.advanceTimersByTimeAsync(PROBE_TIMEOUT_MS - 1);
        expect(signals[attempt]!.aborted).toBe(false);
        await vi.advanceTimersByTimeAsync(1);
        expect(signals[attempt]!.aborted).toBe(true);
        await vi.advanceTimersByTimeAsync(delay - 1);
        expect(StubEventSource.instances).toHaveLength(attempt + 1);
        await vi.advanceTimersByTimeAsync(1);
        expect(StubEventSource.instances).toHaveLength(attempt + 2);
      }
      expect(ended).not.toHaveBeenCalled();
      unsubscribe();
      expect(vi.getTimerCount()).toBe(0);
    });
  });
});
