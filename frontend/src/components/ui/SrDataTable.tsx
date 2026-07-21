import React from 'react';

/**
 * A visually-hidden data table — the screen-reader equivalent of a chart.
 *
 * Our charts are drawn with divs/SVG and convey their numbers only through
 * hover tooltips, which are invisible to assistive tech (and unusable on touch,
 * where there is no hover). Rendering the same series as a real `<table>` inside
 * `.sr-only` gives screen-reader and keyboard users the actual figures without
 * changing the visual design. Render it inside the chart's `<figure>`; the
 * table's own `<caption>` names the data for assistive tech (and the visible
 * chart heading names the figure), so don't also put an `aria-label` on the
 * figure — that just double-announces the same sentence.
 *
 * `rows` is a list of string cells; the first cell of each row is the row header.
 */
export function SrDataTable({
  caption,
  columns,
  rows,
  className,
}: {
  caption: string;
  columns: string[];
  rows: string[][];
  className?: string;
}) {
  return (
    <table className={`sr-only ${className ?? ''}`}>
      <caption>{caption}</caption>
      <thead>
        <tr>
          {columns.map((c, i) => (
            <th key={c} scope="col" style={i === 0 ? undefined : { textAlign: 'right' }}>
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, r) => (
          <tr key={r}>
            {row.map((cell, c) =>
              c === 0 ? (
                <th key={c} scope="row">
                  {cell}
                </th>
              ) : (
                <td key={c}>{cell}</td>
              ),
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
