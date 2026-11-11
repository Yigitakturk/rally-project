// Line chart for the Standings page: how the top crews' points grew, rally by rally.
// Drawn by hand in SVG (no chart library), so it matches the site's look.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useI18n } from '../i18n/index.jsx';

const COLORS = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)', 'var(--series-4)'];
const HEIGHT = 280;
const PAD = { top: 14, bottom: 30, left: 40 };
const LABEL_SPACE = 132; // room at the right for names at the line ends (wide screens)

/** A round number of steps for the left axis, e.g. 0, 50, 100, 150… */
function ticksFor(max) {
  const step = [5, 10, 20, 25, 50, 100, 200, 250].find((s) => max / s <= 5) ?? 500;
  const top = Math.max(step, Math.ceil(max / step) * step);
  const out = [];
  for (let v = 0; v <= top; v += step) out.push(v);
  return out;
}

function useWidth() {
  const ref = useRef(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!ref.current) return undefined;
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e.contentRect.width)));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}

/**
 * series: [{ name, values: [total after round 1, after round 2, …] }]
 * rounds: [{ code, name }] — one per point on the line
 */
export default function PointsChart({ series, rounds }) {
  const { t, locale } = useI18n();
  const [boxRef, width] = useWidth();
  const [hover, setHover] = useState(null);
  const n = rounds.length;

  const wide = width >= 560;
  const right = wide ? LABEL_SPACE : 14;
  const plotW = Math.max(0, width - PAD.left - right);
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const max = Math.max(1, ...series.flatMap((s) => s.values));
  const ticks = ticksFor(max);
  const top = ticks[ticks.length - 1];
  const x = (i) => PAD.left + (n > 1 ? (i * plotW) / (n - 1) : plotW / 2);
  const y = (v) => PAD.top + plotH - (v / top) * plotH;
  const fmt = (v) => new Intl.NumberFormat(locale).format(v);

  // Names at the line ends, top to bottom; a name that would sit on top of
  // the one above is left out (the legend and the hover box still show it).
  const endLabels = useMemo(() => {
    if (!wide) return [];
    const placed = [];
    [...series.map((s, i) => ({ ...s, color: i }))]
      .sort((a, b) => b.values[n - 1] - a.values[n - 1])
      .forEach((s) => {
        const yy = y(s.values[n - 1]);
        if (placed.every((p) => Math.abs(p.y - yy) >= 16)) placed.push({ ...s, y: yy });
      });
    return placed;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [series, n, wide, width]);

  // Show every round code if there is room, otherwise every second one.
  const everyOther = n > 1 && plotW / (n - 1) < 34;

  const onMove = (e) => {
    const box = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - box.left;
    const i = n > 1 ? Math.round(((px - PAD.left) / plotW) * (n - 1)) : 0;
    setHover(Math.max(0, Math.min(n - 1, i)));
  };

  const summary = series.map((s) => `${s.name} ${fmt(s.values[n - 1])}`).join(', ');
  const hoverRows = hover == null ? [] : series
    .map((s, i) => ({ name: s.name, value: s.values[hover], color: COLORS[i] }))
    .sort((a, b) => b.value - a.value);
  const tipLeft = hover == null ? 0 : x(hover) > width / 2 ? x(hover) - 12 : x(hover) + 12;

  return (
    <figure className="points-chart">
      <figcaption className="card-label">{t('standingsPage.chartTitle')}</figcaption>
      <ul className="chart-legend">
        {series.map((s, i) => (
          <li key={s.name}>
            <span className="chart-key" style={{ background: COLORS[i] }} aria-hidden="true" />
            <span lang="">{s.name}</span>
            <span className="muted">{fmt(s.values[n - 1])}</span>
          </li>
        ))}
      </ul>
      <div ref={boxRef} className="chart-box">
        {width > 0 && (
          <svg
            width={width}
            height={HEIGHT}
            role="img"
            aria-label={`${t('standingsPage.chartTitle')}: ${summary}`}
            onPointerMove={onMove}
            onPointerDown={onMove}
            onPointerLeave={() => setHover(null)}
          >
            {ticks.map((v) => (
              <g key={v}>
                <line x1={PAD.left} x2={PAD.left + plotW} y1={y(v)} y2={y(v)} className="chart-grid" />
                <text x={PAD.left - 8} y={y(v)} className="chart-axis" textAnchor="end" dominantBaseline="middle">{fmt(v)}</text>
              </g>
            ))}
            {rounds.map((r, i) => (!everyOther || i % 2 === 0 || i === n - 1) && (
              <text key={i} x={x(i)} y={HEIGHT - 8} className="chart-axis" textAnchor="middle">{r.code}</text>
            ))}

            {hover != null && <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + plotH} className="chart-cross" />}

            {series.map((s, i) => (
              <polyline
                key={s.name}
                points={s.values.map((v, j) => `${x(j)},${y(v)}`).join(' ')}
                fill="none"
                stroke={COLORS[i]}
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ))}

            {hover != null && series.map((s, i) => (
              <circle key={s.name} cx={x(hover)} cy={y(s.values[hover])} r="4.5" fill={COLORS[i]} className="chart-dot" />
            ))}

            {endLabels.map((s) => (
              <text key={s.name} x={x(n - 1) + 10} y={s.y} className="chart-end" dominantBaseline="middle">
                {s.name.split(' ').slice(-1)[0]} <tspan className="chart-end-num">{fmt(s.values[n - 1])}</tspan>
              </text>
            ))}
          </svg>
        )}
        {hover != null && (
          <div
            className="chart-tip"
            style={{ left: tipLeft, top: PAD.top, transform: x(hover) > width / 2 ? 'translateX(-100%)' : 'none' }}
            aria-hidden="true"
          >
            <strong>{t('standingsPage.chartAfter', { rally: rounds[hover].name ?? rounds[hover].code })}</strong>
            {hoverRows.map((r) => (
              <span key={r.name} className="chart-tip-row">
                <span className="chart-key" style={{ background: r.color }} />
                <span lang="">{r.name}</span>
                <span className="chart-tip-num">{fmt(r.value)}</span>
              </span>
            ))}
          </div>
        )}
      </div>
      <p className="muted small">{t('standingsPage.chartHelp')}</p>
    </figure>
  );
}
