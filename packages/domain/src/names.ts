import { LIMITS } from './schemas.ts';

const COPY_SUFFIX = ' (copy)';
const NUMBERED = /^(.*\S)\s(\d+)$/;

const fitted = (base: string, suffix: string, limit: number): string =>
  `${base.slice(0, limit - suffix.length).trimEnd()}${suffix}`;

export const duplicateName = (name: string, existing: readonly string[]): string => {
  const match = NUMBERED.exec(name);
  const base = match?.[1] ?? name;
  const taken = new Set(existing);
  let n = match ? Number(match[2]) + 1 : 2;
  let candidate = fitted(base, ` ${n}`, LIMITS.unitName);
  while (taken.has(candidate)) {
    n += 1;
    candidate = fitted(base, ` ${n}`, LIMITS.unitName);
  }
  return candidate;
};

export const copyTitle = (title: string): string => fitted(title, COPY_SUFFIX, LIMITS.combatTitle);

export const normalizeTag = (tag: string): string =>
  tag.trim().slice(0, LIMITS.tagName).trimEnd().toLocaleLowerCase();
