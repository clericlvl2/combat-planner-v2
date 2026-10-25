import type {
  Action,
  Combat,
  CombatFile,
  CombatId,
  Condition,
  PlayerCombat,
  PresetId,
  Role,
  TagId,
  UnitId,
} from '@combat-planner/domain';
import { LIMITS, copyTitle, duplicateName, toCombatFile } from '@combat-planner/domain';
import { ulid } from 'ulid';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import type {
  ApiClient,
  ApiEndEvent,
  ApiErrorCode,
  DmCombat,
  Locale,
  PresenceEvent,
  PresetCreateInput,
  Unsubscribe,
} from '../client.ts';

export interface ContractBackend {
  dm: ApiClient;
  player(): ApiClient;
  close(): Promise<void>;
}

const EMAIL = 'dm@example.com';
const PASSWORD = 'correct horse battery';
const WAIT = { timeout: 3000 };

const expectRejection = async (
  promise: Promise<unknown>,
  code: ApiErrorCode,
  status: number,
): Promise<void> => {
  await expect(promise).rejects.toMatchObject({ code, status });
};

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const addUnit = (version: number, name: string, role: Role, unitId: UnitId = ulid()): Action => ({
  id: ulid(),
  version,
  type: 'addUnit',
  unitId,
  roll: 10,
  name,
  role,
  maxHp: 20,
  ac: 15,
  pd: 12,
  md: 11,
  initiativeBonus: 2,
  tempHp: 0,
  note: '',
});

const toggle = (version: number, unitId: UnitId, condition: Condition = 'dazed'): Action => ({
  id: ulid(),
  version,
  type: 'toggleCondition',
  unitId,
  condition,
});

const damage = (version: number, unitId: UnitId, amount = 5): Action => ({
  id: ulid(),
  version,
  type: 'damage',
  unitId,
  amount,
});

const claim = (version: number, unitId: UnitId, displayName = 'Mika'): Action => ({
  id: ulid(),
  version,
  type: 'claimUnit',
  unitId,
  displayName,
});

const release = (version: number, unitId: UnitId): Action => ({
  id: ulid(),
  version,
  type: 'releaseUnit',
  unitId,
});

const undo = (version: number): Action => ({ id: ulid(), version, type: 'undo' });

const presetInput = (name: string, tags: TagId[] = []): PresetCreateInput => ({
  id: ulid(),
  name,
  role: 'enemy',
  maxHp: 20,
  ac: 15,
  pd: 12,
  md: 11,
  initiativeBonus: 2,
  tags,
});

const unitOf = (combat: Combat, unitId: UnitId) => combat.units.find((unit) => unit.id === unitId);

export function describeApiClientContract(
  adapter: string,
  open: () => Promise<ContractBackend>,
): void {
  describe(`ApiClient contract: ${adapter}`, () => {
    let backend: ContractBackend;
    let dm: ApiClient;
    let subscriptions: Unsubscribe[] = [];

    const track = (unsubscribe: Unsubscribe): Unsubscribe => {
      subscriptions.push(unsubscribe);
      return unsubscribe;
    };

    beforeEach(async () => {
      backend = await open();
      dm = backend.dm;
      await dm.auth.signUp({
        email: EMAIL,
        password: PASSWORD,
        displayName: 'DM',
        language: 'en',
      });
    });

    afterEach(async () => {
      for (const unsubscribe of subscriptions) unsubscribe();
      subscriptions = [];
      await backend.close();
    });

    const createCombat = (title = 'Goblin ambush'): Promise<Combat> =>
      dm.combats.create({ id: ulid(), title, description: 'Road to Shadowfall', color: 3 });

    const versionOf = async (id: CombatId): Promise<number> => (await dm.combats.get(id)).version;

    const send = async (id: CombatId, action: Action): Promise<number> =>
      (await dm.combats.dispatch(id, action)).version;

    const withHero = async () => {
      const combat = await createCombat();
      const heroId = ulid();
      const enemyId = ulid();
      let version = await send(combat.id, addUnit(combat.version, 'Vashti', 'hero', heroId));
      version = await send(combat.id, addUnit(version, 'Orc', 'enemy', enemyId));
      const { token } = await dm.link.get(combat.id);
      return { combat, heroId, enemyId, token, version };
    };

    const join = async (token: string) => {
      const client = backend.player();
      const view = await client.play.get(token);
      return { client, view };
    };

    const watchDm = (id: CombatId) => {
      const documents: DmCombat[] = [];
      const ended: ApiEndEvent[] = [];
      const presence: PresenceEvent[] = [];
      track(
        dm.combats.subscribe(
          id,
          (document) => documents.push(document),
          (event) => ended.push(event),
          (event) => presence.push(event),
        ),
      );
      return { documents, ended, presence };
    };

    const watchPlayer = (client: ApiClient, token: string) => {
      const documents: PlayerCombat[] = [];
      const languages: (Locale | undefined)[] = [];
      const ended: ApiEndEvent[] = [];
      track(
        client.play.subscribe(
          token,
          (document, language) => {
            documents.push(document);
            languages.push(language);
          },
          (event) => ended.push(event),
        ),
      );
      return { documents, languages, ended };
    };

    describe('accepted adapter differences, not asserted', () => {
      it.todo('FakeApiClient keeps the playAs id after leave; the server issues a new one');
      it.todo(
        'FakeApiClient holds one library, so cross-DM ownership and ID_IN_USE are server-only',
      );
      it.todo('the preset cap is covered by FakeApiClient.test.ts and test/presets.test.ts');
      it.todo('social sign-in, rate limits, body limit and reportError stay outside the contract');
    });

    describe('auth', () => {
      it('signUp returns the email session and session() repeats it', async () => {
        const session = await dm.auth.session();
        expect(session).toMatchObject({
          email: EMAIL,
          displayName: 'DM',
          language: 'en',
          method: 'email',
        });
        expect(session?.userId).toEqual(expect.any(String));
      });

      it('signUp with a taken email rejects emailTaken', async () => {
        await dm.auth.signOut();
        await expectRejection(
          dm.auth.signUp({ email: EMAIL, password: PASSWORD, displayName: 'Other' }),
          'emailTaken',
          422,
        );
      });

      it('signIn refuses a wrong password with unauthorized and accepts the right one', async () => {
        await dm.auth.signOut();
        await expectRejection(
          dm.auth.signIn({ email: EMAIL, password: 'wrong horse battery' }),
          'unauthorized',
          401,
        );
        await expect(dm.auth.signIn({ email: EMAIL, password: PASSWORD })).resolves.toMatchObject({
          email: EMAIL,
          method: 'email',
        });
        expect(await dm.auth.session()).toMatchObject({ email: EMAIL });
      });

      it('signOut leaves no session and DM calls reject unauthorized 401', async () => {
        await dm.auth.signOut();
        expect(await dm.auth.session()).toBeNull();
        await expectRejection(dm.combats.list(), 'unauthorized', 401);
        await expectRejection(dm.presets.list(), 'unauthorized', 401);
      });

      it('providers() lists none without configuration', async () => {
        expect(await dm.auth.providers()).toEqual([]);
      });
    });

    describe('combats', () => {
      it('create returns version 1 in setup and a repeated create returns the stored combat', async () => {
        const input = { id: ulid(), title: 'Goblin ambush', description: '', color: 2 };
        const created = await dm.combats.create(input);
        expect(created).toMatchObject({ ...input, version: 1, status: 'setup', units: [] });
        await dm.combats.update(input.id, { title: 'Renamed' });
        const repeated = await dm.combats.create(input);
        expect(repeated).toMatchObject({ id: input.id, title: 'Renamed', version: 2 });
      });

      it('list returns summaries newest first with unit count and null round in setup', async () => {
        const older = await createCombat('Older');
        await send(older.id, addUnit(older.version, 'Orc', 'enemy'));
        await pause(5);
        const newer = await createCombat('Newer');
        const list = await dm.combats.list();
        expect(list.map((summary) => summary.id)).toEqual([newer.id, older.id]);
        expect(list[1]).toMatchObject({
          title: 'Older',
          status: 'setup',
          round: null,
          unitCount: 1,
          lastPlayedAt: null,
        });
        expect(list[0]).toMatchObject({ unitCount: 0, round: null });
      });

      it('update bumps the version once and an empty patch keeps it', async () => {
        const combat = await createCombat();
        expect(await dm.combats.update(combat.id, { title: 'Ambush' })).toEqual({ version: 2 });
        expect(await dm.combats.update(combat.id, {})).toEqual({ version: 2 });
        expect(await dm.combats.get(combat.id)).toMatchObject({ title: 'Ambush', version: 2 });
      });

      it('open sets lastPlayedAt and bumps the version while get changes nothing', async () => {
        const combat = await createCombat();
        expect(await dm.combats.get(combat.id)).toMatchObject({ version: 1, lastPlayedAt: null });
        expect(await dm.combats.get(combat.id)).toMatchObject({ version: 1 });
        const opened = await dm.combats.open(combat.id);
        expect(opened.version).toBe(2);
        expect(opened.lastPlayedAt).toEqual(expect.any(String));
        expect(await dm.combats.get(combat.id)).toMatchObject({
          version: 2,
          lastPlayedAt: opened.lastPlayedAt,
        });
      });

      it('remove makes get, remove and dispatch reject notFound 404', async () => {
        const combat = await createCombat();
        await dm.combats.remove(combat.id);
        await expectRejection(dm.combats.get(combat.id), 'notFound', 404);
        await expectRejection(dm.combats.remove(combat.id), 'notFound', 404);
        await expectRejection(
          dm.combats.dispatch(combat.id, addUnit(1, 'Orc', 'enemy')),
          'notFound',
          404,
        );
        expect(await dm.combats.list()).toEqual([]);
      });

      it('duplicate stores a restarted copy under the new id', async () => {
        const combat = await createCombat();
        const unitId = ulid();
        let version = await send(combat.id, addUnit(combat.version, 'Orc', 'enemy', unitId));
        version = await send(combat.id, damage(version, unitId, 7));
        await send(combat.id, toggle(version, unitId));
        const newId = ulid();
        const copy = await dm.combats.duplicate(combat.id, newId);
        expect(copy).toMatchObject({
          id: newId,
          title: copyTitle(combat.title),
          status: 'setup',
          version: 1,
          lastPlayedAt: null,
        });
        expect(copy.units).toHaveLength(1);
        expect(copy.units[0]).toMatchObject({ id: unitId, hp: 20, conditions: [] });
        expect(await dm.combats.get(newId)).toMatchObject({ id: newId, version: 1, undo: null });
        expect(await versionOf(combat.id)).toBe(4);
      });

      it('importCombat stores the file under new ids and a malformed file rejects invalid 422', async () => {
        const combat = await createCombat('Dragon lair');
        const unitId = ulid();
        await send(combat.id, addUnit(combat.version, 'Dragon', 'enemy', unitId));
        const file = toCombatFile(await dm.combats.get(combat.id));
        const imported = await dm.combats.importCombat(file);
        expect(imported.id).not.toBe(combat.id);
        expect(imported).toMatchObject({ title: 'Dragon lair', version: 1, status: 'setup' });
        expect(imported.units.map((unit) => unit.name)).toEqual(['Dragon']);
        expect(imported.units[0]?.id).not.toBe(unitId);
        expect(await dm.combats.get(imported.id)).toMatchObject({ id: imported.id });
        const malformed = { format: 'something else' } as unknown as CombatFile;
        await expectRejection(dm.combats.importCombat(malformed), 'invalid', 422);
        expect(await dm.combats.list()).toHaveLength(2);
      });

      it('create beyond LIMITS.combatsPerDm rejects limit 422', async () => {
        for (let index = 0; index < LIMITS.combatsPerDm; index += 1) {
          await createCombat(`Combat ${index}`);
        }
        await expectRejection(createCombat('One too many'), 'limit', 422);
        expect(await dm.combats.list()).toHaveLength(LIMITS.combatsPerDm);
      });
    });

    describe('actions', () => {
      it('dispatch applies, returns the next version and names the action in undo', async () => {
        const combat = await createCombat();
        const action = addUnit(combat.version, 'Orc', 'enemy');
        expect(await dm.combats.dispatch(combat.id, action)).toEqual({ version: 2 });
        const stored = await dm.combats.get(combat.id);
        expect(stored.version).toBe(2);
        expect(stored.units.map((unit) => unit.name)).toEqual(['Orc']);
        expect(stored.undo).toMatchObject({ action: { id: action.id }, unitName: 'Orc' });
      });

      it('a stale version rejects version 409 and changes nothing', async () => {
        const combat = await createCombat();
        const unitId = ulid();
        const version = await send(combat.id, addUnit(combat.version, 'Orc', 'enemy', unitId));
        await expectRejection(
          dm.combats.dispatch(combat.id, damage(version - 1, unitId)),
          'version',
          409,
        );
        const stored = await dm.combats.get(combat.id);
        expect(stored.version).toBe(version);
        expect(unitOf(stored, unitId)?.hp).toBe(20);
      });

      it('a repeated action answers the current version and changes nothing', async () => {
        const combat = await createCombat();
        const unitId = ulid();
        let version = await send(combat.id, addUnit(combat.version, 'Orc', 'enemy', unitId));
        const hit = damage(version, unitId, 5);
        version = await send(combat.id, hit);
        version = await send(combat.id, toggle(version, unitId));
        expect(await dm.combats.dispatch(combat.id, hit)).toEqual({ version });
        const stored = await dm.combats.get(combat.id);
        expect(stored.version).toBe(version);
        expect(unitOf(stored, unitId)?.hp).toBe(15);
      });

      it('the DM sending claimUnit rejects forbidden 403', async () => {
        const { combat, heroId, version } = await withHero();
        await expectRejection(
          dm.combats.dispatch(combat.id, claim(version, heroId)),
          'forbidden',
          403,
        );
      });

      it('nextTurn in setup rejects invalid 422', async () => {
        const { combat, version } = await withHero();
        await expectRejection(
          dm.combats.dispatch(combat.id, { id: ulid(), version, type: 'nextTurn' }),
          'invalid',
          422,
        );
        expect(await versionOf(combat.id)).toBe(version);
      });

      it('an unknown unit rejects notFound', async () => {
        const combat = await createCombat();
        await expectRejection(
          dm.combats.dispatch(combat.id, damage(combat.version, ulid())),
          'notFound',
          404,
        );
      });

      it('addUnit beyond LIMITS.unitsPerCombat rejects limit', async () => {
        const combat = await createCombat();
        let version = combat.version;
        for (let index = 0; index < LIMITS.unitsPerCombat; index += 1) {
          version = await send(combat.id, addUnit(version, `Orc ${index}`, 'enemy'));
        }
        await expectRejection(
          dm.combats.dispatch(combat.id, addUnit(version, 'One too many', 'enemy')),
          'limit',
          422,
        );
        expect((await dm.combats.get(combat.id)).units).toHaveLength(LIMITS.unitsPerCombat);
      });
    });

    describe('actions, repeats after a lost reply', () => {
      it('a repeated undo answers the current version and undoes nothing more', async () => {
        const combat = await createCombat();
        const unitId = ulid();
        let version = await send(combat.id, addUnit(combat.version, 'Orc', 'enemy', unitId));
        const first = toggle(version, unitId, 'dazed');
        version = await send(combat.id, first);
        version = await send(combat.id, toggle(version, unitId, 'stunned'));
        const undone = undo(version);
        version = await send(combat.id, undone);
        expect(await dm.combats.dispatch(combat.id, undone)).toEqual({ version });
        const stored = await dm.combats.get(combat.id);
        expect(stored.version).toBe(version);
        expect(unitOf(stored, unitId)?.conditions).toEqual(['dazed']);
        expect(stored.undo).toMatchObject({ action: { id: first.id } });
      });

      it('a repeated claimUnit answers the current version', async () => {
        const { combat, heroId, token } = await withHero();
        const { client, view } = await join(token);
        const claimed = claim(view.combat.version, heroId);
        const { version } = await client.play.dispatch(token, claimed);
        expect(await client.play.dispatch(token, claimed)).toEqual({ version });
        const stored = await dm.combats.get(combat.id);
        expect(stored.version).toBe(version);
        expect(unitOf(stored, heroId)?.claimedBy).toBe(view.playerId);
      });

      it('a repeated releaseUnit answers the current version', async () => {
        const { combat, heroId, token } = await withHero();
        const { client, view } = await join(token);
        const claimed = await client.play.dispatch(token, claim(view.combat.version, heroId));
        const released = release(claimed.version, heroId);
        const { version } = await client.play.dispatch(token, released);
        expect(await client.play.dispatch(token, released)).toEqual({ version });
        const stored = await dm.combats.get(combat.id);
        expect(stored.version).toBe(version);
        expect(unitOf(stored, heroId)?.claimedBy).toBeNull();
      });

      it('a repeat of an action pushed out of the undo stack answers the current version', async () => {
        const combat = await createCombat();
        const unitId = ulid();
        const added = addUnit(combat.version, 'Orc', 'enemy', unitId);
        let version = await send(combat.id, added);
        for (let index = 0; index < LIMITS.undoDepth; index += 1) {
          version = await send(combat.id, toggle(version, unitId));
        }
        expect(await dm.combats.dispatch(combat.id, added)).toEqual({ version });
        const stored = await dm.combats.get(combat.id);
        expect(stored.version).toBe(version);
        expect(stored.units).toHaveLength(1);
      });
    });

    describe('undo', () => {
      it('undo reverts the top action and the summary moves to the one below', async () => {
        const combat = await createCombat();
        const unitId = ulid();
        const added = addUnit(combat.version, 'Orc', 'enemy', unitId);
        let version = await send(combat.id, added);
        version = await send(combat.id, toggle(version, unitId));
        expect(unitOf(await dm.combats.get(combat.id), unitId)?.conditions).toEqual(['dazed']);
        version = await send(combat.id, undo(version));
        const stored = await dm.combats.get(combat.id);
        expect(stored.version).toBe(version);
        expect(unitOf(stored, unitId)?.conditions).toEqual([]);
        expect(stored.undo).toMatchObject({ action: { id: added.id } });
      });

      it('undo on an empty stack rejects invalid 422', async () => {
        const combat = await createCombat();
        await expectRejection(dm.combats.dispatch(combat.id, undo(combat.version)), 'invalid', 422);
      });

      it('11 actions allow exactly 10 undos', async () => {
        const combat = await createCombat();
        const unitId = ulid();
        let version = await send(combat.id, addUnit(combat.version, 'Orc', 'enemy', unitId));
        for (let index = 0; index < 10; index += 1) {
          version = await send(combat.id, toggle(version, unitId));
        }
        for (let index = 0; index < LIMITS.undoDepth; index += 1) {
          version = await send(combat.id, undo(version));
        }
        await expectRejection(dm.combats.dispatch(combat.id, undo(version)), 'invalid', 422);
        const stored = await dm.combats.get(combat.id);
        expect(stored.undo).toBeNull();
        expect(unitOf(stored, unitId)?.conditions).toEqual([]);
      });

      it('undo after a claim keeps the claim', async () => {
        const { combat, heroId, token } = await withHero();
        await send(combat.id, toggle(await versionOf(combat.id), heroId));
        const { client, view } = await join(token);
        await client.play.dispatch(token, claim(view.combat.version, heroId));
        await send(combat.id, undo(await versionOf(combat.id)));
        const hero = unitOf(await dm.combats.get(combat.id), heroId);
        expect(hero?.conditions).toEqual([]);
        expect(hero?.claimedBy).toBe(view.playerId);
      });
    });

    describe('presets', () => {
      it('create, list newest first, update and remove', async () => {
        const first = await dm.presets.create(presetInput('Orc'));
        const second = await dm.presets.create(presetInput('Goblin'));
        expect(first).toMatchObject({ name: 'Orc', createdAt: expect.any(String) });
        expect((await dm.presets.list()).map((preset) => preset.id)).toEqual([second.id, first.id]);
        const updated = await dm.presets.update(first.id, { name: 'Orc chief', maxHp: 30 });
        expect(updated).toMatchObject({ id: first.id, name: 'Orc chief', maxHp: 30 });
        await dm.presets.remove(second.id);
        expect(await dm.presets.list()).toEqual([updated]);
      });

      it('duplicate adds a numbered copy on top', async () => {
        const source = await dm.presets.create(presetInput('Orc'));
        const newId: PresetId = ulid();
        const copy = await dm.presets.duplicate(source.id, newId);
        expect(copy).toMatchObject({ id: newId, name: duplicateName('Orc', ['Orc']) });
        expect((await dm.presets.list()).map((preset) => preset.id)).toEqual([newId, source.id]);
      });

      it('an unknown tag rejects invalid and a missing preset rejects notFound', async () => {
        await expectRejection(dm.presets.create(presetInput('Orc', [ulid()])), 'invalid', 422);
        const preset = await dm.presets.create(presetInput('Orc'));
        await expectRejection(dm.presets.update(preset.id, { tags: [ulid()] }), 'invalid', 422);
        const missing = ulid();
        await expectRejection(dm.presets.update(missing, { name: 'Ghost' }), 'notFound', 404);
        await expectRejection(dm.presets.remove(missing), 'notFound', 404);
        await expectRejection(dm.presets.duplicate(missing, ulid()), 'notFound', 404);
        expect(await dm.presets.list()).toEqual([preset]);
      });

      it('a repeated create returns the stored preset', async () => {
        const input = presetInput('Orc');
        const created = await dm.presets.create(input);
        await dm.presets.update(input.id, { name: 'Orc chief' });
        expect(await dm.presets.create(input)).toMatchObject({
          id: created.id,
          name: 'Orc chief',
        });
        expect(await dm.presets.list()).toHaveLength(1);
      });
    });

    describe('tags', () => {
      it('create and list sorted by name ignoring case', async () => {
        await dm.tags.create({ id: ulid(), name: 'beta' });
        await dm.tags.create({ id: ulid(), name: 'Alpha' });
        await dm.tags.create({ id: ulid(), name: 'gamma' });
        expect((await dm.tags.list()).map((tag) => tag.name)).toEqual(['Alpha', 'beta', 'gamma']);
      });

      it('a name taken ignoring case rejects invalid 409 on create and rename', async () => {
        await dm.tags.create({ id: ulid(), name: 'Undead' });
        const other = await dm.tags.create({ id: ulid(), name: 'Beast' });
        await expectRejection(dm.tags.create({ id: ulid(), name: 'undead' }), 'invalid', 409);
        await expectRejection(dm.tags.rename(other.id, 'UNDEAD'), 'invalid', 409);
        expect(await dm.tags.rename(other.id, 'beast')).toEqual({ id: other.id, name: 'beast' });
        expect(await dm.tags.list()).toHaveLength(2);
      });

      it('remove strips the tag from presets', async () => {
        const undead = await dm.tags.create({ id: ulid(), name: 'Undead' });
        const preset = await dm.presets.create(presetInput('Zombie', [undead.id]));
        expect(preset.tags).toEqual([undead.id]);
        await dm.tags.remove(undead.id);
        expect(await dm.tags.list()).toEqual([]);
        expect((await dm.presets.list())[0]?.tags).toEqual([]);
        await expectRejection(dm.tags.remove(undead.id), 'notFound', 404);
      });

      it('create beyond LIMITS.tagsPerDm rejects limit and a known id returns the stored tag', async () => {
        const first = await dm.tags.create({ id: ulid(), name: 'Tag 0' });
        for (let index = 1; index < LIMITS.tagsPerDm; index += 1) {
          await dm.tags.create({ id: ulid(), name: `Tag ${index}` });
        }
        await expectRejection(dm.tags.create({ id: ulid(), name: 'One too many' }), 'limit', 422);
        expect(await dm.tags.create({ id: first.id, name: 'Other name' })).toEqual(first);
        expect(await dm.tags.list()).toHaveLength(LIMITS.tagsPerDm);
      });
    });

    describe('settings, account', () => {
      it('settings.get returns the sign-up language and update changes the session language', async () => {
        expect(await dm.settings.get()).toEqual({ language: 'en' });
        expect(await dm.settings.update({ language: 'de' })).toEqual({ language: 'de' });
        expect(await dm.settings.get()).toEqual({ language: 'de' });
        expect(await dm.auth.session()).toMatchObject({ language: 'de' });
      });

      it('account.update renames the session', async () => {
        expect(await dm.account.update({ displayName: 'Game Master' })).toMatchObject({
          email: EMAIL,
          displayName: 'Game Master',
        });
        expect(await dm.auth.session()).toMatchObject({ displayName: 'Game Master' });
      });

      it('account.remove signs out, empties the library and refuses the old password', async () => {
        await createCombat();
        await dm.presets.create(presetInput('Orc'));
        await dm.tags.create({ id: ulid(), name: 'Undead' });
        await dm.account.remove();
        expect(await dm.auth.session()).toBeNull();
        await expectRejection(dm.combats.list(), 'unauthorized', 401);
        await expectRejection(
          dm.auth.signIn({ email: EMAIL, password: PASSWORD }),
          'unauthorized',
          401,
        );
        await dm.auth.signUp({ email: EMAIL, password: PASSWORD, displayName: 'DM' });
        expect(await dm.combats.list()).toEqual([]);
        expect(await dm.presets.list()).toEqual([]);
        expect(await dm.tags.list()).toEqual([]);
      });
    });

    describe('link', () => {
      it('link.get returns generation 0 and the same token twice', async () => {
        const combat = await createCombat();
        const first = await dm.link.get(combat.id);
        expect(first).toEqual({ token: expect.any(String), generation: 0 });
        expect(await dm.link.get(combat.id)).toEqual(first);
      });

      it('reissue returns the next generation, revokes the old token with linkRevoked 410 and releases every claim', async () => {
        const { combat, heroId, token } = await withHero();
        const { client, view } = await join(token);
        await client.play.dispatch(token, claim(view.combat.version, heroId));
        const reissued = await dm.link.reissue(combat.id);
        expect(reissued.generation).toBe(1);
        expect(reissued.token).not.toBe(token);
        expect(await dm.link.get(combat.id)).toEqual(reissued);
        const stored = await dm.combats.get(combat.id);
        expect(unitOf(stored, heroId)?.claimedBy).toBeNull();
        expect(stored.players).toEqual({});
        expect(stored.linkGeneration).toBe(1);
        await expectRejection(backend.player().play.get(token), 'linkRevoked', 410);
        await expect(backend.player().play.get(reissued.token)).resolves.toMatchObject({
          combatId: combat.id,
        });
      });

      it('stopSharing revokes the token', async () => {
        const combat = await createCombat();
        const { token } = await dm.link.get(combat.id);
        await dm.link.stopSharing(combat.id);
        await expectRejection(backend.player().play.get(token), 'linkRevoked', 410);
      });
    });

    describe('play, claims', () => {
      it('play.get returns the projection, the DM language and one player id per client', async () => {
        const { combat, token, version } = await withHero();
        const first = await join(token);
        const second = await join(token);
        expect(first.view).toMatchObject({ combatId: combat.id, language: 'en' });
        expect(first.view.combat).toMatchObject({ id: combat.id, version, myName: null });
        expect(first.view.combat).not.toHaveProperty('players');
        expect(first.view.combat.units.map((unit) => unit.name)).toEqual(['Vashti', 'Orc']);
        expect(first.view.combat.units[1]).not.toHaveProperty('hp');
        expect(second.view.playerId).not.toBe(first.view.playerId);
        expect((await first.client.play.get(token)).playerId).toBe(first.view.playerId);
      });

      it('a player claims, damages and releases an own hero', async () => {
        const { combat, heroId, token } = await withHero();
        const { client, view } = await join(token);
        let version = (await client.play.dispatch(token, claim(view.combat.version, heroId)))
          .version;
        let stored = await dm.combats.get(combat.id);
        expect(unitOf(stored, heroId)?.claimedBy).toBe(view.playerId);
        expect(stored.players).toEqual({ [view.playerId]: 'Mika' });
        expect((await client.play.get(token)).combat.myName).toBe('Mika');
        version = (await client.play.dispatch(token, damage(version, heroId, 4))).version;
        version = (await client.play.dispatch(token, release(version, heroId))).version;
        stored = await dm.combats.get(combat.id);
        expect(stored.version).toBe(version);
        expect(unitOf(stored, heroId)).toMatchObject({ hp: 16, claimedBy: null });
      });

      it("a player is refused enemies and another player's hero with forbidden 403", async () => {
        const { heroId, enemyId, token } = await withHero();
        const owner = await join(token);
        const version = (
          await owner.client.play.dispatch(token, claim(owner.view.combat.version, heroId))
        ).version;
        const other = await join(token);
        await expectRejection(
          owner.client.play.dispatch(token, damage(version, enemyId)),
          'forbidden',
          403,
        );
        await expectRejection(
          other.client.play.dispatch(token, damage(version, heroId)),
          'forbidden',
          403,
        );
        await expectRejection(
          other.client.play.dispatch(token, claim(version, heroId, 'Ilse')),
          'forbidden',
          403,
        );
        await expectRejection(
          other.client.play.dispatch(token, claim(version, enemyId, 'Ilse')),
          'forbidden',
          403,
        );
      });

      it('leave releases the claims and the name and the next dispatch rejects unauthorized', async () => {
        const { combat, heroId, token } = await withHero();
        const { client, view } = await join(token);
        await client.play.dispatch(token, claim(view.combat.version, heroId));
        await client.play.leave(combat.id);
        const stored = await dm.combats.get(combat.id);
        expect(unitOf(stored, heroId)?.claimedBy).toBeNull();
        expect(stored.players).toEqual({});
        await expectRejection(
          client.play.dispatch(token, claim(stored.version, heroId)),
          'unauthorized',
          401,
        );
      });

      it('play.get of a deleted combat rejects notFound', async () => {
        const { combat, token } = await withHero();
        await dm.combats.remove(combat.id);
        await expectRejection(backend.player().play.get(token), 'notFound', 404);
      });

      it('the 13th player rejects limit 422 until one leaves', async () => {
        const { combat, token } = await withHero();
        const joined = [];
        for (let index = 0; index < LIMITS.playersPerCombat; index += 1) {
          joined.push(await join(token));
        }
        const late = backend.player();
        await expectRejection(late.play.get(token), 'limit', 422);
        await joined[0]?.client.play.leave(combat.id);
        await expect(late.play.get(token)).resolves.toMatchObject({ combatId: combat.id });
      });

      it('a reissue frees the player places', async () => {
        const { combat, token } = await withHero();
        for (let index = 0; index < LIMITS.playersPerCombat; index += 1) await join(token);
        await expectRejection(backend.player().play.get(token), 'limit', 422);
        const reissued = await dm.link.reissue(combat.id);
        await expect(backend.player().play.get(reissued.token)).resolves.toMatchObject({
          combatId: combat.id,
        });
      });
    });

    describe('events', () => {
      it('combats.subscribe delivers the current document, then each newer one', async () => {
        const combat = await createCombat();
        const watched = watchDm(combat.id);
        await vi.waitFor(() => expect(watched.documents.map((d) => d.version)).toEqual([1]), WAIT);
        const version = await send(combat.id, addUnit(1, 'Orc', 'enemy'));
        await vi.waitFor(
          () => expect(watched.documents.map((d) => d.version)).toEqual([1, version]),
          WAIT,
        );
        await dm.combats.update(combat.id, { title: 'Renamed' });
        await vi.waitFor(
          () => expect(watched.documents.at(-1)).toMatchObject({ title: 'Renamed', version: 3 }),
          WAIT,
        );
        expect(watched.documents.at(1)?.undo).toMatchObject({ unitName: 'Orc' });
        expect(watched.ended).toEqual([]);
      });

      it('play.subscribe delivers the projection with the DM language', async () => {
        const { combat, heroId, token, version } = await withHero();
        const client = backend.player();
        const watched = watchPlayer(client, token);
        await vi.waitFor(() => expect(watched.documents).toHaveLength(1), WAIT);
        expect(watched.documents[0]).toMatchObject({ id: combat.id, version, myName: null });
        expect(watched.documents[0]).not.toHaveProperty('players');
        expect(watched.languages).toEqual(['en']);
        await send(combat.id, toggle(version, heroId));
        await vi.waitFor(
          () => expect(watched.documents.map((d) => d.version)).toEqual([version, version + 1]),
          WAIT,
        );
      });

      it('remove ends DM and player subscriptions with deleted and the title', async () => {
        const { combat, token } = await withHero();
        const watchedDm = watchDm(combat.id);
        const watchedPlayer = watchPlayer(backend.player(), token);
        await vi.waitFor(() => {
          expect(watchedDm.documents).toHaveLength(1);
          expect(watchedPlayer.documents).toHaveLength(1);
        }, WAIT);
        await dm.combats.remove(combat.id);
        const deleted = { type: 'deleted', title: combat.title };
        await vi.waitFor(() => {
          expect(watchedDm.ended).toEqual([deleted]);
          expect(watchedPlayer.ended).toEqual([deleted]);
        }, WAIT);
      });

      it('reissue ends player subscriptions with linkRevoked and hands the DM the new document', async () => {
        const { combat, token } = await withHero();
        const watchedDm = watchDm(combat.id);
        const watchedPlayer = watchPlayer(backend.player(), token);
        await vi.waitFor(() => {
          expect(watchedDm.documents).toHaveLength(1);
          expect(watchedPlayer.documents).toHaveLength(1);
        }, WAIT);
        await dm.link.reissue(combat.id);
        await vi.waitFor(() => {
          expect(watchedPlayer.ended).toEqual([{ type: 'linkRevoked' }]);
          expect(watchedDm.documents.at(-1)).toMatchObject({ linkGeneration: 1 });
        }, WAIT);
        expect(watchedDm.ended).toEqual([]);
      });

      it('a joining and a leaving player reach the DM as presence', async () => {
        const { combat, heroId, token } = await withHero();
        const watched = watchDm(combat.id);
        await vi.waitFor(() => expect(watched.documents).toHaveLength(1), WAIT);
        const { client, view } = await join(token);
        await vi.waitFor(() => expect(watched.presence).toEqual([{ type: 'playerJoined' }]), WAIT);
        await client.play.dispatch(token, claim(view.combat.version, heroId));
        await client.play.leave(combat.id);
        await vi.waitFor(
          () =>
            expect(watched.presence).toEqual([
              { type: 'playerJoined' },
              { type: 'playerLeft', name: 'Mika' },
            ]),
          WAIT,
        );
      });

      it('account.remove ends the DM subscription with deleted', async () => {
        const combat = await createCombat();
        const watched = watchDm(combat.id);
        await vi.waitFor(() => expect(watched.documents).toHaveLength(1), WAIT);
        await dm.account.remove();
        await vi.waitFor(
          () => expect(watched.ended).toEqual([{ type: 'deleted', title: combat.title }]),
          WAIT,
        );
      });

      it('signOut ends the DM subscription with unauthorized', async () => {
        const combat = await createCombat();
        const watched = watchDm(combat.id);
        await vi.waitFor(() => expect(watched.documents).toHaveLength(1), WAIT);
        await dm.auth.signOut();
        await vi.waitFor(() => expect(watched.ended).toEqual([{ type: 'unauthorized' }]), WAIT);
      });

      it('subscribing to an unknown combat ends with deleted', async () => {
        const watched = watchDm(ulid());
        await vi.waitFor(
          () => expect(watched.ended).toEqual([{ type: 'deleted', title: '' }]),
          WAIT,
        );
        expect(watched.documents).toEqual([]);
      });
    });
  });
}
