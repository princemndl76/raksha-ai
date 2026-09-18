import { useState } from "react";
import {
  Flame,
  Waves,
  AlertTriangle,
  Play,
  RotateCcw,
  Shield,
  Activity,
  CheckCircle,
  HelpCircle,
  Zap,
} from "lucide-react";

export default function SimulationEngine({
  apiUrl,
  onSimulationStart,
  onSimulationReset,
  isSimulating = false,
}) {
  const [selectedScenario, setSelectedScenario] = useState("EARTHQUAKE_M78");
  const [loading, setLoading] = useState(false);
  const [drillLog, setDrillLog] = useState([]);

  const scenarios = [
    {
      id: "EARTHQUAKE_M78",
      title: "M7.8 Central Himalayan Mega-Earthquake",
      category: "SEISMIC CRISIS",
      icon: Flame,
      color: "red",
      severity: "CRITICAL",
      hypocenter: "14.8 km (Shallow Crustal Rupture)",
      epicenter: "Barpak, Gorkha District",
      intensity: "MMI IX (Violent Shaking)",
      summary:
        "Re-creates the catastrophic Gorkha rupture dynamics. Models 3D seismic shockwave propagation across Bagmati and Gandaki provinces with lifeline road fractures.",
      parameters: [
        { label: "PRIMARY SHOCK", value: "M7.8 (USGS Spec)" },
        { label: "FOCAL DEPTH", value: "14.8 km" },
        { label: "SECONDARY SHOCK", value: "M6.7 (Sindhupalchok)" },
        { label: "EST. STRUCTURAL FAILURE", value: "Level 3 Emergency" },
      ],
    },
    {
      id: "GLOF_FLOOD",
      title: "Glacial Lake Outburst Flood (GLOF) & Torrent",
      category: "HYDROLOGICAL CRISIS",
      icon: Waves,
      color: "blue",
      severity: "CRITICAL",
      hypocenter: "Surface Outburst (2,840m Elevation)",
      epicenter: "Upper Tama Koshi River Basin",
      intensity: "5.4x Baseline River Discharge",
      summary:
        "Simulates moraine barrier failure at high-altitude glacial lake Tsho Rolpa. Models downstream torrent climbing valley walls and washing out bridges down to Trishuli.",
      parameters: [
        { label: "DISCHARGE PEAK", value: "1,420 m³/s (5.4x Normal)" },
        { label: "FLOOD CREST", value: "+4.2m Above Barrage" },
        { label: "CRITICAL DAM RISK", value: "Upper Tamakoshi + Trishuli" },
        { label: "LIFELINE HIGHWAY", value: "Prithvi Highway Mugling Cutoff" },
      ],
    },
    {
      id: "COMPOUND_DISASTER",
      title: "Compound Landslide Dam Outburst Flood (LDOF)",
      category: "MULTI-HAZARD COMPOUND",
      icon: AlertTriangle,
      color: "amber",
      severity: "CRITICAL",
      hypocenter: "11.2 km Seismic + Hydrological Surge",
      epicenter: "Nuwakot - Rasuwa Mountain Gorge",
      intensity: "Cascading Compounded Disaster",
      summary:
        "Monsoon cloudburst combined with M7.2 tremor creates massive rockslide damming Trishuli river. Debris dam suddenly fails, unleashing a 6.1x flash flood wall.",
      parameters: [
        { label: "EARTHQUAKE", value: "M7.2 Nuwakot Border" },
        { label: "LANDSLIDE DAM", value: "Trishuli River Gorge Dammed" },
        { label: "BREACH SURGE", value: "6.1x Baseline Normal Flow" },
        { label: "RESPONSE REQUISITION", value: "Army 11th Air Brigade MI-17" },
      ],
    },
  ];

  const activeScenarioObj = scenarios.find((s) => s.id === selectedScenario) || scenarios[0];

  const handleInjectDrill = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/simulation/inject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario_type: selectedScenario }),
      });
      if (res.ok) {
        const data = await res.json();
        setDrillLog((prev) => [
          {
            id: Date.now(),
            time: new Date().toLocaleTimeString("en-IN"),
            scenario: activeScenarioObj.title,
            status: "INJECTED",
            events: data.injected_events,
          },
          ...prev,
        ]);
        if (onSimulationStart) onSimulationStart(activeScenarioObj);
      }
    } catch (err) {
      console.error("Simulation error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleResetDrill = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/simulation/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        setDrillLog((prev) => [
          {
            id: Date.now(),
            time: new Date().toLocaleTimeString("en-IN"),
            scenario: "Baseline Recovery",
            status: "CLEARED",
            events: 0,
          },
          ...prev,
        ]);
        if (onSimulationReset) onSimulationReset();
      }
    } catch (err) {
      console.error("Reset error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sim-engine-shell">
      {/* Header Banner */}
      <div className="sim-header-banner">
        <div>
          <div className="eyebrow text-red">// NATIONAL EMERGENCY DRILL ENGINE</div>
          <h3>Multi-Hazard Disaster Simulation & Preparedness</h3>
          <p>
            Inject realistic, calibrated disaster scenarios into the live 3D situation room to
            conduct drills, evaluate response SOPs, and test inter-agency resource mobilization.
          </p>
        </div>

        <div className="drill-status-cluster">
          <span className={`drill-indicator ${isSimulating ? "active" : ""}`} />
          <strong>{isSimulating ? "DRILL SIMULATION RUNNING" : "STANDBY / BASELINE"}</strong>
        </div>
      </div>

      {/* Scenario Selector Cards */}
      <div className="scenario-selector-grid">
        {scenarios.map((scenario) => {
          const Icon = scenario.icon;
          const isSelected = scenario.id === selectedScenario;
          return (
            <div
              key={scenario.id}
              className={`scenario-card ${isSelected ? "selected" : ""} color-${scenario.color}`}
              onClick={() => setSelectedScenario(scenario.id)}
            >
              <div className="scenario-card-head">
                <Icon size={20} className={`text-${scenario.color}`} />
                <span className="scenario-category">{scenario.category}</span>
              </div>

              <h4>{scenario.title}</h4>
              <p>{scenario.summary}</p>

              <div className="scenario-meta">
                <span>{scenario.epicenter}</span>
                <strong>{scenario.intensity}</strong>
              </div>
            </div>
          );
        })}
      </div>

      {/* Scenario Detail & Injection Console */}
      <div className="sim-console-card">
        <div className="console-head">
          <div className="console-title">
            <Zap size={18} className="text-cyan" />
            <span>SELECTED DRILL: {activeScenarioObj.title.toUpperCase()}</span>
          </div>

          <div className="console-actions">
            <button
              onClick={handleInjectDrill}
              className="tactical-btn primary-btn"
              disabled={loading}
            >
              <Play size={14} />
              <span>{loading ? "INJECTING..." : "INJECT SCENARIO TO 3D GRID"}</span>
            </button>

            <button
              onClick={handleResetDrill}
              className="tactical-btn"
              disabled={loading}
              title="Clear all drill events and return to live telemetry"
            >
              <RotateCcw size={14} />
              <span>RESET TO LIVE SENSORS</span>
            </button>
          </div>
        </div>

        {/* Drill Parameters Grid */}
        <div className="drill-params-grid">
          {activeScenarioObj.parameters.map((param, idx) => (
            <div key={idx} className="drill-param-box">
              <small>{param.label}</small>
              <strong>{param.value}</strong>
            </div>
          ))}
        </div>

        {/* Drill Execution Log */}
        <div className="drill-history-block">
          <h5>DRILL DISPATCH TELEMETRY LOG</h5>
          {drillLog.length === 0 ? (
            <div className="drill-empty-log">
              <span>No simulation events initiated yet. Select a scenario above to test.</span>
            </div>
          ) : (
            <ul className="drill-log-list">
              {drillLog.map((log) => (
                <li key={log.id} className="drill-log-item">
                  <span className="log-time">{log.time}</span>
                  <strong>{log.scenario}</strong>
                  <span className={`log-badge ${log.status.toLowerCase()}`}>{log.status}</span>
                  {log.events > 0 && <small>{log.events} Events Broadcasted</small>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
