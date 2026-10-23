#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoUrl = 'https://github.com/clericlvl2/combat-planner-v2';
const sections = [
  { type: 'feat', title: 'Features' },
  { type: 'fix', title: 'Bug Fixes' },
  { type: 'perf', title: 'Performance' },
  { type: 'revert', title: 'Reverts' },
];
const releasableTypes = new Set(sections.map((section) => section.type));
const bumps = ['auto', 'patch', 'minor', 'major'];
const subjectPattern = /^(\w+)(?:\(([^()]+)\))?(!)?: (.+)$/;
const breakingFooterPattern = /^BREAKING[ -]CHANGE: /m;
const tagPattern = /^v(\d+)\.(\d+)\.(\d+)$/;

export function parseCommit({ hash, subject, body = '' }) {
  const match = subjectPattern.exec(subject.trim());
  if (!match) return null;
  const [, type, scope, bang, text] = match;
  return {
    hash,
    type: type.toLowerCase(),
    scope: scope ?? null,
    subject: text.trim(),
    breaking: bang === '!' || breakingFooterPattern.test(body),
  };
}

export function parseVersion(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!match) throw new Error(`not a version: ${version}`);
  return match.slice(1).map(Number);
}

export function nextVersion(current, commits, bump = 'auto') {
  if (!bumps.includes(bump))
    throw new Error(`unknown bump "${bump}", expected ${bumps.join(', ')}`);
  if (!commits.some((commit) => releasableTypes.has(commit.type))) {
    throw new Error('nothing to release: no feat, fix, perf or revert commit since the last tag');
  }
  const level =
    bump !== 'auto'
      ? bump
      : commits.some((commit) => commit.breaking)
        ? 'major'
        : commits.some((commit) => commit.type === 'feat')
          ? 'minor'
          : 'patch';
  const [major, minor, patch] = parseVersion(current);
  if (level === 'major') return `${major + 1}.0.0`;
  if (level === 'minor') return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

function renderLine(commit) {
  const scope = commit.scope ? `**${commit.scope}:** ` : '';
  const link = `[${commit.hash.slice(0, 7)}](${repoUrl}/commit/${commit.hash})`;
  return `* ${scope}${commit.subject} (${link})`;
}

export function renderNotes(version, date, commits) {
  const parts = [`## ${version} (${date})`];
  for (const section of sections) {
    const lines = commits.filter((commit) => commit.type === section.type).map(renderLine);
    if (lines.length > 0) parts.push(`### ${section.title}\n\n${lines.join('\n')}`);
  }
  return `${parts.join('\n\n')}\n`;
}

export function latestTag(tags) {
  let best = null;
  for (const tag of tags) {
    const match = tagPattern.exec(tag.trim());
    if (!match) continue;
    const parts = match.slice(1).map(Number);
    if (!best || compareParts(parts, best.parts) > 0) best = { tag: tag.trim(), parts };
  }
  return best ? best.tag : null;
}

function compareParts(left, right) {
  for (let index = 0; index < 3; index += 1) {
    if (left[index] !== right[index]) return left[index] - right[index];
  }
  return 0;
}

export function parseLog(output) {
  return output
    .split('\x1e')
    .map((record) => record.replace(/^\n+/, ''))
    .filter((record) => record.length > 0)
    .map((record) => {
      const [hash, subject, body] = record.split('\x1f');
      return { hash, subject, body };
    });
}

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

function readArgs(argv) {
  const [command, ...rest] = argv;
  let bump = 'auto';
  for (let index = 0; index < rest.length; index += 1) {
    if (rest[index] === '--bump') {
      bump = rest[index + 1];
      index += 1;
    } else if (rest[index].startsWith('--bump=')) {
      bump = rest[index].slice('--bump='.length);
    } else {
      throw new Error(`unknown argument ${rest[index]}`);
    }
  }
  if (command !== 'plan')
    throw new Error('usage: node scripts/release.mjs plan [--bump auto|patch|minor|major]');
  return { bump };
}

function plan(bump) {
  const lastTag = latestTag(git(['tag', '--merged', 'HEAD', '--list', 'v*']).split('\n'));
  if (!lastTag) throw new Error('no v<major>.<minor>.<patch> tag is reachable from HEAD');
  const log = git(['log', `${lastTag}..HEAD`, '--no-merges', '--format=%H%x1f%s%x1f%b%x1e']);
  const commits = parseLog(log)
    .map(parseCommit)
    .filter((commit) => commit !== null);
  const version = nextVersion(lastTag.slice(1), commits, bump);
  const date = new Date().toISOString().slice(0, 10);
  return { version, tag: `v${version}`, notes: renderNotes(version, date, commits) };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const { bump } = readArgs(process.argv.slice(2));
    process.stdout.write(`${JSON.stringify(plan(bump), null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`release: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  }
}
