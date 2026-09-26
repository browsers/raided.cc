import Card from "./Card";
import "./ViewsChart.css";

const WIDTH = 640;
const HEIGHT = 220;
const PADDING_LEFT = 28;
const PADDING_BOTTOM = 22;
const PADDING_TOP = 10;

// Builds a smooth-ish path through the given points using simple
// quadratic midpoint smoothing (no chart library dependency).
function buildSmoothPath(points) {
  if (points.length === 0) return "";
  let d = `M ${points[0][0]} ${points[0][1]}`;
  for (let i = 0; i < points.length - 1; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[i + 1];
    const mx = (x1 + x2) / 2;
    d += ` Q ${x1} ${y1} ${mx} ${(y1 + y2) / 2}`;
    d += ` Q ${x2} ${y2} ${x2} ${y2}`;
  }
  return d;
}

export default function ViewsChart({ data }) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const niceMax = Math.ceil(maxValue / 6) * 6 || 6;
  const yTicks = [0, niceMax / 4, niceMax / 2, (niceMax * 3) / 4, niceMax];

  const plotWidth = WIDTH - PADDING_LEFT;
  const plotHeight = HEIGHT - PADDING_BOTTOM - PADDING_TOP;
  const stepX = plotWidth / (data.length - 1);

  const points = data.map((d, i) => {
    const x = PADDING_LEFT + i * stepX;
    const y = PADDING_TOP + plotHeight * (1 - d.value / niceMax);
    return [x, y];
  });

  const linePath = buildSmoothPath(points);
  const areaPath =
    `${linePath} L ${points[points.length - 1][0]} ${PADDING_TOP + plotHeight}` +
    ` L ${points[0][0]} ${PADDING_TOP + plotHeight} Z`;

  return (
    <Card className="dash-views-chart">
      <h3 className="dash-views-chart__title">Last 7 Days</h3>
      <div className="dash-card__eyebrow" style={{ marginBottom: 18 }}>
        Views Preview
      </div>

      <svg
        className="dash-views-chart__svg"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="viewsFade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00e5ff" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#00e5ff" stopOpacity="0" />
          </linearGradient>
        </defs>

        {yTicks.map((tick) => {
          const y = PADDING_TOP + plotHeight * (1 - tick / niceMax);
          return (
            <line
              key={tick}
              x1={PADDING_LEFT}
              x2={WIDTH}
              y1={y}
              y2={y}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="1"
            />
          );
        })}

        <path d={areaPath} fill="url(#viewsFade)" stroke="none" />
        <path d={linePath} fill="none" stroke="#00e5ff" strokeWidth="2" />

        {yTicks.map((tick) => {
          const y = PADDING_TOP + plotHeight * (1 - tick / niceMax);
          return (
            <text
              key={tick}
              x={0}
              y={y + 4}
              className="dash-views-chart__axis-label"
            >
              {Math.round(tick)}
            </text>
          );
        })}

        {data.map((d, i) => (
          <text
            key={d.label}
            x={PADDING_LEFT + i * stepX}
            y={HEIGHT - 4}
            textAnchor="middle"
            className="dash-views-chart__axis-label"
          >
            {d.label}
          </text>
        ))}
      </svg>
    </Card>
  );
}