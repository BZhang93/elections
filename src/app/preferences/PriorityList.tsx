'use client';

import { useState } from 'react';

type Row = {
  slug: string;
  label: string;
  description: string;
  sideALabel: string;
  sideBLabel: string;
  stance: 'a' | 'b' | 'none';
};

export function PriorityList({ initial }: { initial: Row[] }) {
  const [rows, setRows] = useState<Row[]>(initial);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [openInfo, setOpenInfo] = useState<string | null>(null);

  function move(from: number, to: number) {
    if (from === to || to < 0 || to >= rows.length) return;
    const next = [...rows];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    setRows(next);
  }

  function setStance(index: number, stance: Row['stance']) {
    setRows(rows.map((r, i) => (i === index ? { ...r, stance } : r)));
  }

  return (
    <ol className="priority-list">
      {rows.map((row, index) => (
        <li
          key={row.slug}
          draggable
          onDragStart={() => setDragIndex(index)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => {
            if (dragIndex !== null) move(dragIndex, index);
            setDragIndex(null);
          }}
          onDragEnd={() => setDragIndex(null)}
          className="priority-row"
        >
          <span className="drag-handle" aria-hidden="true">⋮⋮</span>
          <span className="rank">{index + 1}</span>
          <span className="topic-label">
            {row.label}
            <span className="info-wrap">
              <button
                type="button"
                className="info"
                aria-label={`About ${row.label}`}
                aria-expanded={openInfo === row.slug}
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenInfo(openInfo === row.slug ? null : row.slug);
                }}
                onBlur={() => setOpenInfo(null)}
              >
                ⓘ
              </button>
              <span className={`tooltip${openInfo === row.slug ? ' open' : ''}`} role="tooltip">
                <strong>{row.description}</strong>
                <span className="tooltip-sides">More: {row.sideALabel}</span>
                <span className="tooltip-sides">Less: {row.sideBLabel}</span>
              </span>
            </span>
          </span>
          <select
            name={`stance_${row.slug}`}
            value={row.stance}
            onChange={(e) => setStance(index, e.target.value as Row['stance'])}
            aria-label={`Your stance on ${row.label}`}
          >
            <option value="none">Neutral</option>
            <option value="a">More</option>
            <option value="b">Less</option>
          </select>
          <span className="reorder-buttons">
            <button type="button" onClick={() => move(index, index - 1)} disabled={index === 0} aria-label={`Move ${row.label} up`}>↑</button>
            <button type="button" onClick={() => move(index, index + 1)} disabled={index === rows.length - 1} aria-label={`Move ${row.label} down`}>↓</button>
          </span>
          <input type="hidden" name="topic" value={row.slug} />
        </li>
      ))}
    </ol>
  );
}
