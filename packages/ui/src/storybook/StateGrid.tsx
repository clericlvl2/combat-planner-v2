import type { CSSProperties, ReactNode } from 'react';

export interface StateGridRow<State extends string> {
  label: string;
  render: (state: State) => ReactNode;
}

export interface StateGridProps<State extends string> {
  rows: readonly StateGridRow<State>[];
  columns: readonly State[];
}

const grid: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
  padding: 12,
};

const row: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'flex-start',
  gap: 12,
};

const cell: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: 4,
  minWidth: 0,
  maxWidth: '100%',
};

const cellLabel: CSSProperties = {
  fontSize: 12,
  lineHeight: 1.3,
  color: 'var(--mantine-color-dimmed)',
};

export function cellLabelOf(rowLabel: string, column: string): string {
  return `${rowLabel} · ${column}`;
}

export function StateGrid<State extends string>({ rows, columns }: StateGridProps<State>) {
  return (
    <div style={grid}>
      {rows.map((gridRow) => (
        <div key={gridRow.label} style={row}>
          {columns.map((column) => {
            const label = cellLabelOf(gridRow.label, column);
            return (
              <div key={column} style={cell} data-state-cell={label}>
                <span style={cellLabel}>{label}</span>
                {gridRow.render(column)}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
