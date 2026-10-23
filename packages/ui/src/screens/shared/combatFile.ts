import { BODY_LIMIT_BYTES } from '@combat-planner/api/client';
import { LIMITS, combatFileSchema, toCombatFile } from '@combat-planner/domain';
import type { Combat, CombatFile } from '@combat-planner/domain';

export const COMBAT_FILE_ACCEPT = '.json,application/json';

const COMBAT_FILE_SUFFIX = '.combat.json';

const FALLBACK_NAME = 'combat';

const MAX_READ_BYTES = 1024 * 1024;

const UNSAFE_CHARACTERS = new Set('\\/:*?"<>|');

const FIRST_PRINTABLE = 0x20;

const DELETE = 0x7f;

const safeCharacter = (character: string): string => {
  const code = character.codePointAt(0) ?? 0;
  return UNSAFE_CHARACTERS.has(character) || code < FIRST_PRINTABLE || code === DELETE
    ? ' '
    : character;
};

export type ReadCombatFile =
  | { kind: 'file'; file: CombatFile }
  | { kind: 'invalid' }
  | { kind: 'unitLimit' };

export const combatFileName = (title: string): string => {
  const safe = Array.from(title, safeCharacter)
    .join('')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\.+|\.+$/g, '')
    .trim();
  return `${safe === '' ? FALLBACK_NAME : safe}${COMBAT_FILE_SUFFIX}`;
};

export const parseCombatFile = (text: string): ReadCombatFile => {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { kind: 'invalid' };
  }
  const parsed = combatFileSchema.safeParse(json);
  if (!parsed.success) return { kind: 'invalid' };
  if (new TextEncoder().encode(JSON.stringify(parsed.data)).length > BODY_LIMIT_BYTES) {
    return { kind: 'invalid' };
  }
  if (parsed.data.combat.units.length > LIMITS.unitsPerCombat) return { kind: 'unitLimit' };
  return { kind: 'file', file: parsed.data };
};

export const readCombatFile = async (file: Blob): Promise<ReadCombatFile> => {
  if (file.size > MAX_READ_BYTES) return { kind: 'invalid' };
  try {
    return parseCombatFile(await file.text());
  } catch {
    return { kind: 'invalid' };
  }
};

const download = (file: File) => {
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
};

const aborted = (error: unknown): boolean =>
  error instanceof DOMException && error.name === 'AbortError';

export const saveCombatFile = async (combat: Combat): Promise<void> => {
  const file = new File(
    [JSON.stringify(toCombatFile(combat), null, 2)],
    combatFileName(combat.title),
    { type: 'application/json' },
  );
  const shareable =
    typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });
  if (!shareable) {
    download(file);
    return;
  }
  try {
    await navigator.share({ files: [file] });
  } catch (error) {
    if (!aborted(error)) download(file);
  }
};
