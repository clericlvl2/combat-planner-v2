import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vite-plus/test';

const script = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../deploy/deploy.sh');
const previousImage = 'ghcr.io/clericlvl2/combat-planner-v2:0.1.0';
const newImage = 'ghcr.io/clericlvl2/combat-planner-v2:0.2.0';

const fakes = {
  git: `#!/usr/bin/env bash
echo "git $*" >> "$FAKE_LOG"
[ "$1" = -C ] && shift 2
case "$1" in
  rev-parse) cat "$FAKE_HEAD" ;;
  fetch) ;;
  cat-file) [ -z "\${FAKE_TAG_WITHOUT_SCRIPT:-}" ] ;;
  checkout)
    printf '%s\\n' "\${3#refs/tags/}" > "$FAKE_HEAD"
    printf 'echo MUTATED\\nexit 99\\n' > "$FAKE_ROOT/deploy/deploy.sh"
    ;;
  *) exit 1 ;;
esac
`,
  docker: `#!/usr/bin/env bash
echo "docker $*" >> "$FAKE_LOG"
if [ "$1 $2" = 'compose up' ]; then
  sed -n 's/^APP_IMAGE=//p' "$FAKE_ROOT/deploy/.env" > "$FAKE_RUNNING"
fi
if [ "$1 $2" = 'compose exec' ] && [ -n "\${FAKE_SNAPSHOT_FAILS:-}" ]; then exit 1; fi
exit 0
`,
  curl: `#!/usr/bin/env bash
echo "curl $*" >> "$FAKE_LOG"
running="$(cat "$FAKE_RUNNING")"
for bad in \${FAKE_UNHEALTHY:-}; do
  [ "$running" = "$bad" ] && exit 22
done
exit 0
`,
  flock: `#!/usr/bin/env bash
[ -z "\${FAKE_LOCKED:-}" ]
`,
  sleep: `#!/usr/bin/env bash
exit 0
`,
};

const temporaryDirectories = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

function setUp() {
  const base = mkdtempSync(path.join(tmpdir(), 'deploy-test-'));
  temporaryDirectories.push(base);
  const root = path.join(base, 'opt');
  const bin = path.join(base, 'bin');
  const temp = path.join(base, 'tmp');
  for (const directory of [path.join(root, 'deploy'), bin, temp]) {
    mkdirSync(directory, { recursive: true });
  }
  copyFileSync(script, path.join(root, 'deploy/deploy.sh'));
  writeFileSync(
    path.join(root, 'deploy/.env'),
    [
      `APP_IMAGE=${previousImage}`,
      'DOMAIN=planner.example.test',
      'BETTER_AUTH_URL=https://${DOMAIN}',
      "ADMIN_PASSWORD_HASH='$2a$14$hash'",
      '',
    ].join('\n'),
  );
  for (const [name, body] of Object.entries(fakes)) {
    writeFileSync(path.join(bin, name), body);
    chmodSync(path.join(bin, name), 0o755);
  }
  const files = {
    log: path.join(base, 'calls.log'),
    head: path.join(base, 'head'),
    running: path.join(base, 'running'),
  };
  writeFileSync(files.log, '');
  writeFileSync(files.head, 'previous-commit\n');
  writeFileSync(files.running, `${previousImage}\n`);

  const run = (tag, env = {}) => {
    const result = spawnSync('bash', [path.join(root, 'deploy/deploy.sh')], {
      encoding: 'utf8',
      env: {
        PATH: `${bin}:${process.env.PATH}`,
        TMPDIR: temp,
        FAKE_LOG: files.log,
        FAKE_HEAD: files.head,
        FAKE_RUNNING: files.running,
        FAKE_ROOT: root,
        ...(tag === undefined ? {} : { SSH_ORIGINAL_COMMAND: tag }),
        ...env,
      },
    });
    return {
      status: result.status,
      output: result.stdout + result.stderr,
      calls: readFileSync(files.log, 'utf8'),
      head: readFileSync(files.head, 'utf8').trim(),
      running: readFileSync(files.running, 'utf8').trim(),
      env: readFileSync(path.join(root, 'deploy/.env'), 'utf8'),
      temp: readdirSync(temp),
    };
  };
  return { run };
}

describe('deploy.sh', () => {
  it('refuses a value that is not a release tag', () => {
    const { run } = setUp();
    for (const tag of [undefined, '', 'main', 'v1.2', 'v1.2.3; rm -rf /', 'v1.2.3 ', '1.2.3']) {
      const result = run(tag);
      expect(result.status).toBe(1);
      expect(result.output).toContain('refused: expected a release tag');
      expect(result.calls).toBe('');
    }
  });

  it('refuses while another deploy holds the lock', () => {
    const { run } = setUp();
    const result = run('v0.2.0', { FAKE_LOCKED: '1' });
    expect(result.status).toBe(1);
    expect(result.output).toContain('another deploy is running');
    expect(result.calls).toBe('');
  });

  it('refuses a tag without the deploy script and changes nothing', () => {
    const { run } = setUp();
    const result = run('v0.2.0', { FAKE_TAG_WITHOUT_SCRIPT: '1' });
    expect(result.status).toBe(1);
    expect(result.output).toContain('has no deploy/deploy.sh');
    expect(result.calls).not.toContain('checkout');
    expect(result.calls).not.toContain('docker');
  });

  it('deploys the files and the image of the tag', () => {
    const { run } = setUp();
    const result = run('v0.2.0');
    expect(result.status).toBe(0);
    expect(result.head).toBe('v0.2.0');
    expect(result.running).toBe(newImage);
    expect(result.env).toContain(`APP_IMAGE=${newImage}\n`);
    expect(result.env).not.toContain(previousImage);
    expect(result.env).toContain("ADMIN_PASSWORD_HASH='$2a$14$hash'\n");
    expect(result.calls).toMatch(
      /git -C \S+ fetch --tags origin\n[\s\S]*git -C \S+ checkout --detach refs\/tags\/v0\.2\.0\ndocker compose pull app\ndocker compose exec -T app node -e [\s\S]*\/data\/backups\/pre-v0\.2\.0-\d{8}T\d{6}Z\.db 3\ndocker compose up -d --force-recreate --wait\ncurl -fsS --max-time 5 -o \/dev\/null https:\/\/planner\.example\.test\/api\/health\ndocker image prune -f\n/,
    );
    expect(result.output).toContain('deployed v0.2.0 at v0.2.0');
  });

  it('runs from a copy, so the checkout cannot change the running script', () => {
    const { run } = setUp();
    const result = run('v0.2.0');
    expect(result.status).toBe(0);
    expect(result.output).not.toContain('MUTATED');
    expect(result.output).toContain('deployed v0.2.0');
    expect(result.running).toBe(newImage);
    expect(result.temp).toEqual([]);
  });

  it('rolls back to the previous release when the new one is unhealthy', () => {
    const { run } = setUp();
    const result = run('v0.2.0', { FAKE_UNHEALTHY: newImage });
    expect(result.status).toBe(1);
    expect(result.head).toBe('previous-commit');
    expect(result.running).toBe(previousImage);
    expect(result.env).toContain(`APP_IMAGE=${previousImage}\n`);
    expect(result.calls.match(/^curl /gm)).toHaveLength(13);
    expect(result.calls).not.toContain('image prune');
    expect(result.output).toContain(`rolled back to previous-commit (${previousImage})`);
    expect(result.temp).toEqual([]);
  });

  it('rolls back when the snapshot fails, before the new image starts', () => {
    const { run } = setUp();
    const result = run('v0.2.0', { FAKE_SNAPSHOT_FAILS: '1' });
    expect(result.status).toBe(1);
    expect(result.head).toBe('previous-commit');
    expect(result.env).toContain(`APP_IMAGE=${previousImage}\n`);
    expect(result.calls.match(/compose up/g)).toHaveLength(1);
  });

  it('prints the restore steps and leaves the database alone when the rollback is unhealthy too', () => {
    const { run } = setUp();
    const result = run('v0.2.0', { FAKE_UNHEALTHY: `${newImage} ${previousImage}` });
    expect(result.status).toBe(2);
    expect(result.output).toMatch(
      /\/data\/backups\/pre-v0\.2\.0-\d{8}T\d{6}Z\.db in the data volume/,
    );
    expect(result.output).toMatch(
      /litestream restore -timestamp \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z \/data\/combat-planner\.db/,
    );
    expect(result.calls).not.toMatch(/volume rm|restore/);
  });
});
