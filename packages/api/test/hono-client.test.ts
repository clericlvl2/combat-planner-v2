import type { Action } from '@combat-planner/domain';
import { project } from '@combat-planner/domain';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import type { ConnectionState, DmCombat, EndListener } from '../src/client.ts';
import {
  createHonoApiClient,
  EVENT_SOURCE_CLOSED,
  RECONNECTING_AFTER_MS,
  REOPEN_DELAYS_MS,
} from '../src/hono-client.ts';
import type { EventSourceLike, MessageEventLike } from '../src/hono-client.ts';

const baseUrl = 'http://combat-planner.test/api';
const combatId = '01ARZ3NDEKTSV4RRFFQ69G5FAV';
const playerId = '01ARZ3NDEKTSV4RRFFQ69G5FAW';
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
  ] as const)('maps %i to %s with the body message', async (status, code) => {
    const { fetch } = stubFetch(status, { message: `status ${status}` });
    const client = createHonoApiClient({ baseUrl, fetch });
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
    const client = createHonoApiClient({ baseUrl, fetch });
    await expect(client.play.get(`${combatId}.0.signature`, playerId)).rejects.toMatchObject({
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
    const client = createHonoApiClient({ baseUrl, fetch });
    await expect(client.tags.list()).rejects.toMatchObject({
      status,
      code,
      message: body.message,
    });
  });

  it('maps a failed fetch to a retryable network error', async () => {
    const client = createHonoApiClient({ baseUrl, fetch: failingFetch });
    await expect(client.combats.list()).rejects.toMatchObject({
      name: 'ApiError',
      status: 0,
      code: 'network',
      message: 'fetch failed',
      retryable: true,
    });
  });
});

describe('createHonoApiClient requests', () => {
  it('dispatch posts the action and resolves with { version }', async () => {
    const { fetch, seen } = stubFetch(200, { version: 3 });
    const client = createHonoApiClient({ baseUrl, fetch });
    await expect(client.combats.dispatch(combatId, action)).resolves.toEqual({ version: 3 });
    expect(seen).toHaveLength(1);
    expect(seen[0]?.method).toBe('POST');
    expect(seen[0]?.url.pathname).toBe(`/api/combats/${combatId}/actions`);
    expect(seen[0]?.body).toEqual(action);
  });

  it('play.dispatch sends the token as a query and the player id as a header', async () => {
    const { fetch, seen } = stubFetch(200, { version: 4 });
    const client = createHonoApiClient({ baseUrl, fetch });
    const token = `${combatId}.0.signature`;
    await expect(client.play.dispatch(token, playerId, action)).resolves.toEqual({ version: 4 });
    expect(seen[0]?.url.pathname).toBe(`/api/play/${combatId}/actions`);
    expect(seen[0]?.url.searchParams.get('t')).toBe(token);
    expect(seen[0]?.headers.get('X-Player-Id')).toBe(playerId);
  });

  it('rejects a token without a leading combat id', async () => {
    const { fetch } = stubFetch(200, { version: 4 });
    const client = createHonoApiClient({ baseUrl, fetch });
    await expect(client.play.get('not-a-token', playerId)).rejects.toMatchObject({
      code: 'invalid',
    });
  });

  it('remove resolves without a body', async () => {
    const { fetch, seen } = stubFetch(204, null);
    const client = createHonoApiClient({ baseUrl, fetch });
    await expect(client.combats.remove(combatId)).resolves.toBeUndefined();
    expect(seen[0]?.method).toBe('DELETE');
  });

  it('auth.session maps the Better Auth user to a Session', async () => {
    const { fetch } = stubFetch(200, {
      session: { id: 'session-1' },
      user: { id: 'user-1', email: 'dm@example.com', name: 'DM', language: 'ru' },
      method: 'google',
    });
    const client = createHonoApiClient({ baseUrl, fetch });
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
    const client = createHonoApiClient({ baseUrl, fetch });
    await expect(
      client.auth.signIn({ email: 'dm@example.com', password: 'password' }),
    ).resolves.toMatchObject({ method: 'email' });
    await expect(
      client.auth.signUp({ email: 'dm@example.com', password: 'password', displayName: 'DM' }),
    ).resolves.toMatchObject({ method: 'email' });
  });

  it('rejects a response that does not match the schema', async () => {
    const { fetch } = stubFetch(200, { version: 'three' });
    const client = createHonoApiClient({ baseUrl, fetch });
    await expect(client.combats.dispatch(combatId, action)).rejects.toThrow();
  });
});

describe('createHonoApiClient connection', () => {
  it('reports connected, reconnecting after 10 s of errors, and refetches on reopen', async () => {
    vi.useFakeTimers();
    const { fetch } = stubFetch(200, combatAt(5));
    const client = createHonoApiClient({ baseUrl, fetch, eventSource: StubEventSource });
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
    const client = createHonoApiClient({ baseUrl, fetch, eventSource: StubEventSource });
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

  it('closes the stream on a final event and hands it to onEnd', () => {
    const { fetch } = stubFetch(200, combatAt(1));
    const client = createHonoApiClient({ baseUrl, fetch, eventSource: StubEventSource });
    const ended = vi.fn();
    client.combats.subscribe(combatId, () => {}, ended);
    const source = StubEventSource.instances[0]!;
    source.emit('open');
    source.emit('deleted', JSON.stringify({ type: 'deleted', title: 'Goblin ambush' }));
    expect(ended).toHaveBeenCalledWith({ type: 'deleted', title: 'Goblin ambush' });
    expect(source.closed).toBe(true);
    expect(client.connection.state()).toBe('offline');
  });

  it('play.subscribe puts the token and player id into the stream URL', () => {
    const { fetch } = stubFetch(200, null);
    const client = createHonoApiClient({ baseUrl, fetch, eventSource: StubEventSource });
    const token = `${combatId}.2.signature`;
    client.play.subscribe(
      token,
      playerId,
      () => {},
      () => {},
    );
    const url = new URL(StubEventSource.instances[0]!.url);
    expect(url.pathname).toBe(`/api/play/${combatId}/events`);
    expect(url.searchParams.get('t')).toBe(token);
    expect(url.searchParams.get('playerId')).toBe(playerId);
  });

  it('stays offline without an EventSource implementation', () => {
    const { fetch } = stubFetch(200, null);
    const client = createHonoApiClient({ baseUrl, fetch, eventSource: undefined });
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
      client.play.subscribe(token, playerId, () => {}, onEnd),
  };

  const documentEvent = (kind: keyof typeof streams) => {
    const combat = { ...combatAt(1), title: 'Ущелье гоблинов' };
    const document = kind === 'dm' ? combat : project(combat, { kind: 'player', playerId });
    return JSON.stringify({ type: 'document', version: 1, document });
  };

  describe.each(['dm', 'player'] as const)('%s stream', (kind) => {
    it('ends with linkRevoked when the probe answers 410', async () => {
      const { fetch, seen } = stubFetch(410, { code: 'linkRevoked', message: 'reissued' });
      const client = createHonoApiClient({ baseUrl, fetch, eventSource: StubEventSource });
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
      const client = createHonoApiClient({ baseUrl, fetch, eventSource: StubEventSource });
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
      const client = createHonoApiClient({ baseUrl, fetch, eventSource: StubEventSource });
      const ended = vi.fn();
      streams[kind](client, ended);
      StubEventSource.instances[0]!.emit('error');
      await vi.waitFor(() => expect(ended).toHaveBeenCalledWith({ type: 'deleted', title: '' }));
    });

    it('keeps the browser reconnect on any other probe result', async () => {
      const { fetch, seen } = stubFetch(500, { message: 'boom' });
      const client = createHonoApiClient({ baseUrl, fetch, eventSource: StubEventSource });
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
      const client = createHonoApiClient({ baseUrl, fetch, eventSource: StubEventSource });
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
      const client = createHonoApiClient({ baseUrl, fetch, eventSource: StubEventSource });
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
      const client = createHonoApiClient({ baseUrl, fetch, eventSource: StubEventSource });
      const ended = vi.fn();
      const unsubscribe = streams[kind](client, ended);
      StubEventSource.instances[0]!.emit('error');
      unsubscribe();
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(ended).not.toHaveBeenCalled();
    });
  });
});
