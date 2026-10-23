import type { ErrorReportRow, ErrorSource, Usage } from '@combat-planner/api';
import type { RowStatus, StatusRow } from './format.ts';
import { clockTime, duration, shortDateTime } from './format.ts';

export interface LiveCounts {
  players: number;
  dmStreams: number;
}

export interface AdminPageModel {
  version: string;
  uptimeSeconds: number;
  renderedAt: Date;
  server: StatusRow[];
  usage: Usage;
  live: LiveCounts;
  checks: StatusRow[];
  errors: ErrorReportRow[];
}

const STATUS_LABEL: Record<RowStatus, string> = {
  ok: '✅ в порядке',
  problem: '❌ проблема',
  unknown: '⚪ нет данных',
  info: '—',
};

const SOURCE_LABEL: Record<ErrorSource, string> = {
  client: 'браузер',
  server: 'сервер',
};

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

const escape = (text: string | number): string =>
  String(text).replace(/[&<>"']/g, (character) => ESCAPES[character] ?? character);

const STYLE = `
body{font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;margin:16px;color:#1a1b1e;background:#fff}
h1{font-size:20px;margin:0 0 4px}
h2{font-size:16px;margin:24px 0 8px}
p.meta{margin:0;color:#5c5f66;font-size:14px}
table{border-collapse:collapse;width:100%;max-width:960px;font-size:14px}
th,td{text-align:left;padding:6px 8px;border-bottom:1px solid #dee2e6;vertical-align:top}
th{background:#f1f3f5;font-weight:600}
td.number,th.number{text-align:right}
tr.problem td{background:#fff5f5}
.detail{color:#c92a2a;font-size:13px}
.unknown .detail{color:#5c5f66}
td.message{word-break:break-word}
details pre{white-space:pre-wrap;word-break:break-all;font-size:12px;margin:4px 0 0}
`;

const statusTable = (rows: StatusRow[], heading: string): string => `
<table>
<thead><tr><th>${escape(heading)}</th><th>Значение</th><th>Статус</th><th>Проверено</th></tr></thead>
<tbody>
${rows
  .map(
    (row) =>
      `<tr class="${row.status}"><td>${escape(row.name)}</td><td>${escape(row.value)}${
        row.detail === undefined ? '' : `<div class="detail">${escape(row.detail)}</div>`
      }</td><td>${STATUS_LABEL[row.status]}</td><td>${clockTime(row.checkedAt)}</td></tr>`,
  )
  .join('\n')}
</tbody>
</table>`;

const usageTable = ({ usage, live }: AdminPageModel): string => {
  const today = usage.days[0];
  const rows: [string, number][] = [
    ['Мастеров всего', usage.totals.dms],
    ['Новых мастеров сегодня', today?.newDms ?? 0],
    ['Активных мастеров сегодня', today?.activeDms ?? 0],
    ['Живых сессий сейчас', usage.totals.sessionsAlive],
    ['Боёв всего', usage.totals.combats],
    ['Боёв изменено сегодня', today?.combatsChanged ?? 0],
    ['Игроков на связи сейчас', live.players],
    ['Открытых потоков мастеров сейчас', live.dmStreams],
    ['Входов игроков сегодня', today?.playerJoins ?? 0],
    ['Действий сегодня', today?.actions ?? 0],
  ];
  return `
<table>
<thead><tr><th>Показатель</th><th class="number">Значение</th></tr></thead>
<tbody>
${rows.map(([name, value]) => `<tr><td>${escape(name)}</td><td class="number">${value}</td></tr>`).join('\n')}
</tbody>
</table>`;
};

const historyTable = ({ usage }: AdminPageModel): string => `
<table>
<thead><tr><th>День</th><th class="number">Новые мастера</th><th class="number">Активные мастера</th><th class="number">Боёв изменено</th><th class="number">Входов игроков</th><th class="number">Действий</th></tr></thead>
<tbody>
${usage.days
  .map(
    (day) =>
      `<tr><td>${escape(day.day)}</td><td class="number">${day.newDms}</td><td class="number">${day.activeDms}</td><td class="number">${day.combatsChanged}</td><td class="number">${day.playerJoins}</td><td class="number">${day.actions}</td></tr>`,
  )
  .join('\n')}
</tbody>
</table>`;

const optionalText = (text: string | null): string => (text === null ? '—' : escape(text));

const errorsTable = ({ errors }: AdminPageModel): string =>
  errors.length === 0
    ? '<p class="meta">Ошибок нет.</p>'
    : `
<table>
<thead><tr><th>Время</th><th>Источник</th><th>Сообщение</th><th>Путь</th><th>Версия</th></tr></thead>
<tbody>
${errors
  .map(
    (error) =>
      `<tr><td>${shortDateTime(error.at)}</td><td>${SOURCE_LABEL[error.source]}</td><td class="message">${escape(error.message)}${
        error.stack === null
          ? ''
          : `<details><summary>Стек</summary><pre>${escape(error.stack)}</pre></details>`
      }</td><td>${optionalText(error.path)}</td><td>${optionalText(error.version)}</td></tr>`,
  )
  .join('\n')}
</tbody>
</table>`;

export const renderAdminPage = (model: AdminPageModel): string => `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<meta http-equiv="refresh" content="30">
<title>Combat Planner: состояние</title>
<style>${STYLE}</style>
</head>
<body>
<h1>Combat Planner: состояние</h1>
<p class="meta">Версия ${escape(model.version)} · работает ${duration(model.uptimeSeconds)} · страница собрана ${clockTime(model.renderedAt)} (МСК)</p>
<h2>Сервер</h2>
${statusTable(model.server, 'Показатель')}
<h2>Пользователи и активность</h2>
${usageTable(model)}
<h2>14 дней</h2>
${historyTable(model)}
<h2>Проверки</h2>
${model.checks.length === 0 ? '<p class="meta">Первая проверка ещё идёт.</p>' : statusTable(model.checks, 'Проверка')}
<h2>Последние ошибки</h2>
${errorsTable(model)}
</body>
</html>
`;
