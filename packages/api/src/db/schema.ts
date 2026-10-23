import type { Action, Combat, CombatStatus, Patch, Role, Viewer } from '@combat-planner/domain';
import { sql } from 'drizzle-orm';
import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

const now = sql`(cast(unixepoch('subsecond') * 1000 as integer))`;

const authTimestamp = (name: string) => integer(name, { mode: 'timestamp_ms' });

const authCreatedAt = () => authTimestamp('createdAt').default(now).notNull();

const authUpdatedAt = () =>
  authTimestamp('updatedAt')
    .default(now)
    .$onUpdate(() => new Date())
    .notNull();

export const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: integer('emailVerified', { mode: 'boolean' }).default(false).notNull(),
  image: text('image'),
  language: text('language').default('en').notNull(),
  createdAt: authCreatedAt(),
  updatedAt: authUpdatedAt(),
});

export const session = sqliteTable(
  'session',
  {
    id: text('id').primaryKey(),
    expiresAt: authTimestamp('expiresAt').notNull(),
    token: text('token').notNull().unique(),
    createdAt: authCreatedAt(),
    updatedAt: authUpdatedAt(),
    ipAddress: text('ipAddress'),
    userAgent: text('userAgent'),
    userId: text('userId')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (table) => [index('session_userId_idx').on(table.userId)],
);

export const account = sqliteTable(
  'account',
  {
    id: text('id').primaryKey(),
    accountId: text('accountId').notNull(),
    providerId: text('providerId').notNull(),
    userId: text('userId')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text('accessToken'),
    refreshToken: text('refreshToken'),
    idToken: text('idToken'),
    accessTokenExpiresAt: authTimestamp('accessTokenExpiresAt'),
    refreshTokenExpiresAt: authTimestamp('refreshTokenExpiresAt'),
    scope: text('scope'),
    password: text('password'),
    createdAt: authCreatedAt(),
    updatedAt: authUpdatedAt(),
  },
  (table) => [index('account_userId_idx').on(table.userId)],
);

export const verification = sqliteTable(
  'verification',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: authTimestamp('expiresAt').notNull(),
    createdAt: authCreatedAt(),
    updatedAt: authUpdatedAt(),
  },
  (table) => [index('verification_identifier_idx').on(table.identifier)],
);

export const combats = sqliteTable(
  'combats',
  {
    id: text('id').primaryKey(),
    ownerId: text('ownerId')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    document: text('document', { mode: 'json' }).$type<Combat>().notNull(),
    version: integer('version').notNull(),
    title: text('title').notNull(),
    status: text('status').$type<CombatStatus>().notNull(),
    color: integer('color').notNull(),
    lastPlayedAt: text('lastPlayedAt'),
    createdAt: text('createdAt').notNull(),
    updatedAt: text('updatedAt').notNull(),
    linkShared: integer('linkShared', { mode: 'boolean' }).default(false).notNull(),
    orphanedAt: text('orphanedAt'),
  },
  (table) => [index('combats_ownerId_idx').on(table.ownerId)],
);

export const actionLog = sqliteTable(
  'action_log',
  {
    combatId: text('combatId')
      .notNull()
      .references(() => combats.id, { onDelete: 'cascade' }),
    seq: integer('seq').notNull(),
    actionId: text('actionId').notNull(),
    action: text('action', { mode: 'json' }).$type<Action>().notNull(),
    author: text('author', { mode: 'json' }).$type<Viewer>().notNull(),
    at: text('at').notNull(),
    patch: text('patch', { mode: 'json' }).$type<Patch>(),
    undoneBy: text('undoneBy'),
  },
  (table) => [
    primaryKey({ columns: [table.combatId, table.seq] }),
    uniqueIndex('action_log_combatId_actionId_idx').on(table.combatId, table.actionId),
  ],
);

export const players = sqliteTable(
  'players',
  {
    combatId: text('combatId')
      .notNull()
      .references(() => combats.id, { onDelete: 'cascade' }),
    playerId: text('playerId').notNull(),
    displayName: text('displayName').notNull(),
    watchingSince: text('watchingSince'),
  },
  (table) => [primaryKey({ columns: [table.combatId, table.playerId] })],
);

export const presets = sqliteTable(
  'presets',
  {
    id: text('id').primaryKey(),
    ownerId: text('ownerId')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    role: text('role').$type<Role>().notNull(),
    maxHp: integer('maxHp').notNull(),
    ac: integer('ac').notNull(),
    pd: integer('pd').notNull(),
    md: integer('md').notNull(),
    initiativeBonus: integer('initiativeBonus').notNull(),
    createdAt: text('createdAt').notNull(),
    updatedAt: text('updatedAt').notNull(),
  },
  (table) => [index('presets_ownerId_idx').on(table.ownerId)],
);

export const tags = sqliteTable(
  'tags',
  {
    id: text('id').primaryKey(),
    ownerId: text('ownerId')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    nameLower: text('nameLower').notNull(),
  },
  (table) => [uniqueIndex('tags_ownerId_nameLower_idx').on(table.ownerId, table.nameLower)],
);

export const presetTags = sqliteTable(
  'preset_tags',
  {
    presetId: text('presetId')
      .notNull()
      .references(() => presets.id, { onDelete: 'cascade' }),
    tagId: text('tagId')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
  },
  (table) => [primaryKey({ columns: [table.presetId, table.tagId] })],
);
