import type {
  Action,
  Combat,
  CombatId,
  PlayerCombat,
  PlayerId,
  Preset,
  PresetId,
  Tag,
  TagId,
} from '@combat-planner/domain';
import {
  combatSchema,
  combatTitleSchema,
  playerCombatSchema,
  presetSchema,
  tagSchema,
} from '@combat-planner/domain';
import type { Hono } from 'hono';
import { hc } from 'hono/client';
import type { HonoBase } from 'hono/hono-base';
import type { BlankEnv } from 'hono/types';
import type { UnionToIntersection } from 'hono/utils/types';
import { z } from 'zod';
import type { AppType } from './app.ts';
import {
  ApiError,
  combatSummarySchema,
  linkReissueResultSchema,
  linkSchema,
  localeSchema,
  playViewSchema,
  sessionSchema,
  settingsSchema,
  versionResultSchema,
  versionSchema,
} from './client.ts';
import type {
  AccountPatch,
  ApiClient,
  ApiErrorCode,
  ConnectionListener,
  ConnectionState,
  DocumentListener,
  EndListener,
  Link,
  LinkReissueResult,
  LinkToken,
  PlayView,
  PresetCreateInput,
  PresetPatch,
  Session,
  Settings,
  SignInInput,
  SignUpInput,
  TagCreateInput,
  Unsubscribe,
  VersionResult,
} from './client.ts';

export const RECONNECTING_AFTER_MS = 10_000;

export interface MessageEventLike {
  type: string;
  data?: unknown;
}

export interface EventSourceLike {
  addEventListener(type: string, listener: (event: MessageEventLike) => void): void;
  close(): void;
}

export type EventSourceConstructor = new (
  url: string,
  init?: { withCredentials?: boolean },
) => EventSourceLike;

export interface HonoApiClientOptions {
  baseUrl: string;
  fetch?: typeof fetch;
  eventSource?: EventSourceConstructor;
}

type JsonEndpoint<Input, Output> = {
  input: Input;
  output: Output;
  outputFormat: 'json';
  status: 200;
};

type NoInput = Record<never, never>;
type IdParam = { param: { id: string } };
type TokenQuery = { query: { t: string } };

const authUserSchema = z.object({
  id: z.string().min(1),
  email: z.string(),
  name: z.string(),
  language: localeSchema.default('en'),
});
const authResponseSchema = z.object({ user: authUserSchema });
const authSessionSchema = authResponseSchema.nullable();
type AuthResponse = z.infer<typeof authResponseSchema>;

type PlannedRoutes = {
  '/auth/sign-up/email': {
    $post: JsonEndpoint<{ json: { name: string; email: string; password: string } }, AuthResponse>;
  };
  '/auth/sign-in/email': {
    $post: JsonEndpoint<{ json: { email: string; password: string } }, AuthResponse>;
  };
  '/auth/sign-out': { $post: JsonEndpoint<NoInput, { success: boolean }> };
  '/auth/get-session': { $get: JsonEndpoint<NoInput, AuthResponse | null> };
  '/combats/:id/actions': { $post: JsonEndpoint<IdParam & { json: Action }, VersionResult> };
  '/combats/:id/link': { $get: JsonEndpoint<IdParam, Link> };
  '/combats/:id/link/reissue': { $post: JsonEndpoint<IdParam, LinkReissueResult> };
  '/play/:id': { $get: JsonEndpoint<IdParam & TokenQuery, PlayView> };
  '/play/:id/actions': {
    $post: JsonEndpoint<IdParam & TokenQuery & { json: Action }, VersionResult>;
  };
  '/presets': {
    $get: JsonEndpoint<NoInput, Preset[]>;
    $post: JsonEndpoint<{ json: PresetCreateInput }, Preset>;
  };
  '/presets/:id': {
    $patch: JsonEndpoint<IdParam & { json: PresetPatch }, Preset>;
    $delete: JsonEndpoint<IdParam, null>;
  };
  '/presets/:id/duplicate': { $post: JsonEndpoint<IdParam & { json: { id: PresetId } }, Preset> };
  '/tags': {
    $get: JsonEndpoint<NoInput, Tag[]>;
    $post: JsonEndpoint<{ json: TagCreateInput }, Tag>;
  };
  '/tags/:id': {
    $patch: JsonEndpoint<IdParam & { json: { name: string } }, Tag>;
    $delete: JsonEndpoint<IdParam, null>;
  };
  '/settings': {
    $get: JsonEndpoint<NoInput, Settings>;
    $patch: JsonEndpoint<{ json: Settings }, Settings>;
  };
  '/account': {
    $patch: JsonEndpoint<{ json: AccountPatch }, Session>;
    $delete: JsonEndpoint<NoInput, null>;
  };
};

type AppSchema =
  AppType extends HonoBase<infer _Env, infer S, infer _Base, infer _Current> ? S : never;
type ClientApp = Hono<BlankEnv, UnionToIntersection<AppSchema> & PlannedRoutes>;

interface RawResponse {
  ok: boolean;
  status: number;
  statusText: string;
  json(): Promise<unknown>;
  text(): Promise<string>;
}

const ERROR_CODES: Record<number, ApiErrorCode> = {
  400: 'invalid',
  401: 'unauthorized',
  403: 'forbidden',
  404: 'notFound',
  409: 'version',
  422: 'invalid',
};

const errorBodySchema = z.object({ message: z.string().min(1) });

async function errorOf(response: RawResponse): Promise<ApiError> {
  const text = await response.text().catch(() => '');
  let message = response.statusText || String(response.status);
  try {
    const parsed = errorBodySchema.safeParse(JSON.parse(text));
    if (parsed.success) message = parsed.data.message;
  } catch {
    message = text || message;
  }
  return new ApiError({
    status: response.status,
    code: ERROR_CODES[response.status] ?? 'invalid',
    message,
  });
}

async function send(request: () => Promise<RawResponse>): Promise<RawResponse> {
  let response: RawResponse;
  try {
    response = await request();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    const message = error instanceof Error ? error.message : 'network';
    throw new ApiError({ status: 0, code: 'network', message });
  }
  if (!response.ok) throw await errorOf(response);
  return response;
}

async function json<T>(request: () => Promise<RawResponse>, schema: z.ZodType<T>): Promise<T> {
  const response = await send(request);
  return schema.parse(await response.json());
}

async function none(request: () => Promise<RawResponse>): Promise<void> {
  await send(request);
}

const sessionOf = ({ user }: AuthResponse): Session =>
  sessionSchema.parse({
    userId: user.id,
    email: user.email,
    displayName: user.name,
    language: user.language,
  });

const ULID_PREFIX = /^[0-7][0-9A-HJKMNP-TV-Z]{25}/;

const combatIdOf = (token: LinkToken): CombatId => {
  const match = ULID_PREFIX.exec(token);
  if (!match) throw new ApiError({ status: 400, code: 'invalid', message: 'malformed link token' });
  return match[0];
};

const streamEventSchema = <Document>(document: z.ZodType<Document>) =>
  z.discriminatedUnion('type', [
    z.object({ type: z.literal('document'), version: versionSchema, document }),
    z.object({ type: z.literal('deleted'), title: combatTitleSchema }),
    z.object({ type: z.literal('linkRevoked') }),
  ]);

type StreamStatus = 'connecting' | 'open' | 'error' | 'reconnecting';

interface Stream {
  status: StreamStatus;
}

function createConnection() {
  const streams = new Set<Stream>();
  const listeners = new Set<ConnectionListener>();
  let state: ConnectionState = 'offline';

  const compute = (): ConnectionState => {
    const statuses = [...streams].map((stream) => stream.status);
    if (statuses.includes('open')) return 'connected';
    if (statuses.includes('reconnecting')) return 'reconnecting';
    if (statuses.includes('error')) return state;
    return 'offline';
  };

  const update = () => {
    const next = compute();
    if (next === state) return;
    state = next;
    for (const listener of listeners) listener(next);
  };

  return {
    api: {
      state: () => state,
      subscribe: (listener: ConnectionListener): Unsubscribe => {
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      },
    },
    track: (stream: Stream) => {
      streams.add(stream);
      update();
    },
    untrack: (stream: Stream) => {
      streams.delete(stream);
      update();
    },
    update,
  };
}

export function createHonoApiClient({
  baseUrl,
  fetch: customFetch,
  eventSource = (globalThis as { EventSource?: EventSourceConstructor }).EventSource,
}: HonoApiClientOptions): ApiClient {
  const client = hc<ClientApp>(baseUrl, customFetch ? { fetch: customFetch } : {});
  const connection = createConnection();
  const playerHeaders = (playerId: PlayerId) => ({ headers: { 'X-Player-Id': playerId } });

  function openStream<Document extends Combat | PlayerCombat>(
    url: string,
    documentSchema: z.ZodType<Document>,
    refetch: () => Promise<Document>,
    onDocument: DocumentListener<Document>,
    onEnd: EndListener,
  ): Unsubscribe {
    if (!eventSource) return () => {};
    const eventSchema = streamEventSchema(documentSchema);
    const stream: Stream = { status: 'connecting' };
    const source = new eventSource(url, { withCredentials: true });
    let version = -1;
    let opened = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const close = () => {
      if (timer !== undefined) clearTimeout(timer);
      timer = undefined;
      source.close();
      connection.untrack(stream);
    };

    const deliver = (document: Document) => {
      if (document.version <= version) return;
      version = document.version;
      onDocument(document);
    };

    const handleEvent = (event: MessageEventLike) => {
      if (typeof event.data !== 'string') return;
      const parsed = eventSchema.safeParse(JSON.parse(event.data));
      if (!parsed.success) return;
      if (parsed.data.type === 'document') {
        deliver(parsed.data.document);
        return;
      }
      close();
      onEnd(parsed.data);
    };

    source.addEventListener('open', () => {
      if (timer !== undefined) clearTimeout(timer);
      timer = undefined;
      stream.status = 'open';
      connection.update();
      if (opened) refetch().then(deliver, () => {});
      opened = true;
    });
    source.addEventListener('error', () => {
      stream.status = 'error';
      connection.update();
      timer ??= setTimeout(() => {
        timer = undefined;
        stream.status = 'reconnecting';
        connection.update();
      }, RECONNECTING_AFTER_MS);
    });
    for (const type of ['message', 'document', 'deleted', 'linkRevoked']) {
      source.addEventListener(type, handleEvent);
    }
    connection.track(stream);
    return close;
  }

  const combats: ApiClient['combats'] = {
    list: () => json(() => client.combats.$get(), combatSummarySchema.array()),
    create: (input) => json(() => client.combats.$post({ json: input }), combatSchema),
    update: (id, patch) =>
      json(() => client.combats[':id'].$patch({ param: { id }, json: patch }), versionResultSchema),
    remove: (id) => none(() => client.combats[':id'].$delete({ param: { id } })),
    duplicate: (id, newId) =>
      json(
        () => client.combats[':id'].duplicate.$post({ param: { id }, json: { id: newId } }),
        combatSchema,
      ),
    open: (id) => json(() => client.combats[':id'].open.$post({ param: { id } }), combatSchema),
    get: (id) => json(() => client.combats[':id'].$get({ param: { id } }), combatSchema),
    dispatch: (id, action) =>
      json(
        () => client.combats[':id'].actions.$post({ param: { id }, json: action }),
        versionResultSchema,
      ),
    subscribe: (id, onDocument, onEnd) =>
      openStream(
        `${baseUrl}/combats/${id}/events`,
        combatSchema,
        () => combats.get(id),
        onDocument,
        onEnd,
      ),
  };

  const play: ApiClient['play'] = {
    get: (token, playerId) =>
      json(
        () =>
          client.play[':id'].$get(
            { param: { id: combatIdOf(token) }, query: { t: token } },
            playerHeaders(playerId),
          ),
        playViewSchema,
      ),
    dispatch: (token, playerId, action) =>
      json(
        () =>
          client.play[':id'].actions.$post(
            { param: { id: combatIdOf(token) }, query: { t: token }, json: action },
            playerHeaders(playerId),
          ),
        versionResultSchema,
      ),
    subscribe: (token, playerId, onDocument, onEnd) => {
      const query = new URLSearchParams({ t: token, playerId });
      return openStream(
        `${baseUrl}/play/${combatIdOf(token)}/events?${query.toString()}`,
        playerCombatSchema,
        async () => (await play.get(token, playerId)).combat,
        onDocument,
        onEnd,
      );
    },
  };

  return {
    connection: connection.api,
    auth: {
      signUp: async ({ email, password, displayName }: SignUpInput) =>
        sessionOf(
          await json(
            () =>
              client.auth['sign-up'].email.$post({ json: { email, password, name: displayName } }),
            authResponseSchema,
          ),
        ),
      signIn: async (input: SignInInput) =>
        sessionOf(
          await json(() => client.auth['sign-in'].email.$post({ json: input }), authResponseSchema),
        ),
      signOut: () => none(() => client.auth['sign-out'].$post()),
      session: async () => {
        const found = await json(() => client.auth['get-session'].$get(), authSessionSchema);
        return found === null ? null : sessionOf(found);
      },
    },
    combats,
    link: {
      get: (id) => json(() => client.combats[':id'].link.$get({ param: { id } }), linkSchema),
      reissue: (id) =>
        json(
          () => client.combats[':id'].link.reissue.$post({ param: { id } }),
          linkReissueResultSchema,
        ),
    },
    play,
    presets: {
      list: () => json(() => client.presets.$get(), presetSchema.array()),
      create: (input) => json(() => client.presets.$post({ json: input }), presetSchema),
      update: (id, patch) =>
        json(() => client.presets[':id'].$patch({ param: { id }, json: patch }), presetSchema),
      remove: (id) => none(() => client.presets[':id'].$delete({ param: { id } })),
      duplicate: (id, newId: PresetId) =>
        json(
          () => client.presets[':id'].duplicate.$post({ param: { id }, json: { id: newId } }),
          presetSchema,
        ),
    },
    tags: {
      list: () => json(() => client.tags.$get(), tagSchema.array()),
      create: (input) => json(() => client.tags.$post({ json: input }), tagSchema),
      rename: (id: TagId, name) =>
        json(() => client.tags[':id'].$patch({ param: { id }, json: { name } }), tagSchema),
      remove: (id) => none(() => client.tags[':id'].$delete({ param: { id } })),
    },
    settings: {
      get: () => json(() => client.settings.$get(), settingsSchema),
      update: (patch) => json(() => client.settings.$patch({ json: patch }), settingsSchema),
    },
    account: {
      update: (patch) => json(() => client.account.$patch({ json: patch }), sessionSchema),
      remove: () => none(() => client.account.$delete()),
    },
  };
}
