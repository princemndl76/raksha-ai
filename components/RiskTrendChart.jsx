import { useEffect, useMemo, useState } from "react";
import { TrendingUp, RefreshCw } from "lucide-react";

const API_URL =
  import.meta.env.VITE_API_URL ||
  `${window.location.protocol}//${window.location.hostname}:8000`;

const LEVEL_COLOR = {
  LOW: "#22c55e",
  MEDIUM: "#f59e0b",
  HIGH: "#ff9648",
  CRITICAL: "#ef4444",
};

function levelColor(level) {
  return LEVEL_COLOR[String(level || "LOW").toUpperCase()] || LEVEL_COLOR.LOW;
}

const CHART_WIDTH = 760;
const CHART_HEIGHT = 160;
const PADDING = 24;

export default function RiskTrendChart() {
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function fetchTrend() {
    try {
      const response = await fetch(`${API_URL}/api/risk-trend?limit=50`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setPoints(data.points || []);
      setError(null);
    } catch (err) {
      setError(err.message || "Failed to load trend");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTrend();
    const interval = setInterval(fetchTrend, 30000);
    return () => clearInterval(interval);
  }, []);

  const { pathD, areaD, dots, maxScore } = useMemo(() => {
    if (!points.length) {
      return { pathD: "", areaD: "", dots: [], maxScore: 100 };
    }

    const scores = points.map((p) => p.risk_score || 0);
    const maxScore = Math.max(100, ...scores);
    const usableWidth = CHART_WIDTH - PADDING * 2;
    const usableHeight = CHART_HEIGHT - PADDING * 2;
    const stepX = points.length > 1 ? usableWidth / (points.length - 1) : 0;

    const coords = points.map((p, index) => {
      const x = PADDING + index * stepX;
      const y =
        PADDING + usableHeight - (Math.max(0, p.risk_score || 0) / maxScore) * usableHeight;
      return { x, y, point: p };
    });

    const pathD = coords
      .map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
      .join(" ");

    const areaD =
      coords.length > 0
        ? `${pathD} L ${coords[coords.length - 1].x.toFixed(1)} ${(CHART_HEIGHT - PADDING).toFixed(1)} ` +
          `L ${coords[0].x.toFixed(1)} ${(CHART_HEIGHT - PADDING).toFixed(1)} Z`
        : "";

    return { pathD, areaD, dots: coords, maxScore };
  }, [points]);

  if (loading) {
    return <div className="risk-trend-status">Loading risk trend...</div>;
  }

  if (error) {
    return (
      <div className="risk-trend-status">
        Couldn't load risk trend ({error}).{" "}
        <button className="weather-retry-btn" onClick={fetchTrend}>
          <RefreshCw size={13} /> Retry
        </button>
      </div>
    );
  }

  if (points.length < 2) {
    return (
      <div className="risk-trend-block">
        <div className="risk-trend-head">
          <h3>
            <TrendingUp size={16} /> Risk Trend
          </h3>
        </div>
        <p className="risk-trend-empty">
          Not enough data yet to show a trend — this fills in automatically as the AI
          engine keeps making predictions over time.
        </p>
      </div>
    );
  }

  const latest = points[points.length - 1];

  return (
    <div className="risk-trend-block">
      <div className="risk-trend-head">
        <h3>
          <TrendingUp size={16} /> Risk Trend
        </h3>
        <span className="risk-trend-latest" style={{ color: levelColor(latest.risk_level) }}>
          Latest: {latest.risk_level} · {latest.risk_score}/100
        </span>
      </div>

      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        className="risk-trend-svg"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="riskTrendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00e5c7" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#00e5c7" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Gridlines */}
        {[0.25, 0.5, 0.75].map((fraction) => (
          <line
            key={fraction}
            x1={PADDING}
            x2={CHART_WIDTH - PADDING}
            y1={PADDING + fraction * (CHART_HEIGHT - PADDING * 2)}
            y2={PADDING + fraction * (CHART_HEIGHT - PADDING * 2)}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="1"
          />
        ))}

        <path d={areaD} fill="url(#riskTrendFill)" />
        <path d={pathD} fill="none" stroke="#00e5c7" strokeWidth="2" />

        {dots.map((d, i) => (
          <circle
            key={i}
            cx={d.x}
            cy={d.y}
            r={i === dots.length - 1 ? 4 : 2.5}
            fill={levelColor(d.point.risk_level)}
          />
        ))}
      </svg>

      <div className="risk-trend-footer">
        <span>{points.length} recent predictions</span>
        <span>Scale: 0–{Math.round(maxScore)}</span>
      </div>
    </div>
  );
}
