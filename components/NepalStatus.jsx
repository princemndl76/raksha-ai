import { useEffect, useState } from "react";
import { Zap, Waves, CloudLightning, RefreshCw } from "lucide-react";

const API_URL =
  import.meta.env.VITE_API_URL ||
  `${window.location.protocol}//${window.location.hostname}:8000`;

const SEVERITY_CLASS = {
  LOW: "severity-low",
  MEDIUM: "severity-medium",
  HIGH: "severity-high",
  CRITICAL: "severity-critical",
};

const TYPE_ICON = {
  EARTHQUAKE: Zap,
  FLOOD: Waves,
  WEATHER: CloudLightning,
};

function EventRow({ event }) {
  const Icon = TYPE_ICON[event.type] || CloudLightning;
  const severityClass = SEVERITY_CLASS[String(event.severity || "LOW").toUpperCase()];
  return (
    <div className={`status-event-row ${severityClass}`}>
      <Icon size={15} />
      <div className="status-event-body">
        <div className="status-event-title">
          {event.title || event.type}
          <span className={`severity-pill ${severityClass}`}>{event.severity}</span>
        </div>
        <div className="status-event-message">{event.message || event.location}</div>
      </div>
    </div>
  );
}

export default function NepalStatus() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function fetchStatus() {
    try {
      const response = await fetch(`${API_URL}/api/nepal-status`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setStatus(data);
      setError(null);
    } catch (err) {
      setError(err.message || "Failed to load status");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className="nepal-status-block">Loading national status...</div>;
  }

  if (error || !status) {
    return (
      <div className="nepal-status-block">
        Couldn't load national status{error ? ` (${error})` : ""}.{" "}
        <button className="weather-retry-btn" onClick={fetchStatus}>
          <RefreshCw size={13} /> Retry
        </button>
      </div>
    );
  }

  const earthquakeEvents = status.earthquakes?.events || [];
  const floodEvents = status.floods?.events || [];
  const weatherEvents = (status.weather?.locations || []).filter((w) =>
    ["HIGH", "CRITICAL"].includes(String(w.severity || "").toUpperCase())
  );

  const allEvents = [...earthquakeEvents, ...floodEvents, ...weatherEvents];

  return (
    <div className="nepal-status-block">
      <div className="nepal-status-head">
        <h3>Detailed Event Log</h3>
        <span className="nepal-status-count">{allEvents.length} tracked event(s)</span>
      </div>

      {allEvents.length === 0 ? (
        <p className="nepal-status-empty">No active earthquake, flood, or severe weather events right now.</p>
      ) : (
        <div className="status-event-list">
          {allEvents.map((event, index) => (
            <EventRow key={event.id || index} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}
