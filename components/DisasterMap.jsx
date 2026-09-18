import { useMemo, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Circle,
  Popup,
  Tooltip,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

const NEPAL_CENTER = [28.3949, 84.124];

const SEVERITY_COLOR = {
  LOW: "#22c55e",
  MEDIUM: "#f59e0b",
  HIGH: "#ff9648",
  CRITICAL: "#ef4444",
};

function severityColor(severity) {
  return (
    SEVERITY_COLOR[String(severity || "LOW").toUpperCase()] ||
    SEVERITY_COLOR.LOW
  );
}

function severityRadius(severity) {
  switch (String(severity || "LOW").toUpperCase()) {
    case "CRITICAL":
      return 14;
    case "HIGH":
      return 10;
    case "MEDIUM":
      return 8;
    default:
      return 6;
  }
}

// Controller component to smoothly fly to focused threat coordinates
function MapController({ focusedTarget }) {
  const map = useMap();

  useEffect(() => {
    if (
      focusedTarget &&
      typeof focusedTarget.lat === "number" &&
      typeof focusedTarget.lon === "number"
    ) {
      map.flyTo([focusedTarget.lat, focusedTarget.lon], focusedTarget.zoom || 10, {
        animate: true,
        duration: 1.4,
      });
    }
  }, [focusedTarget, map]);

  return null;
}

export default function DisasterMap({
  alerts = [],
  focusedTarget = null,
  onSelectThreat,
}) {
  // Baseline key threat locations to ensure public visibility across Nepal
  const baselineThreatPoints = useMemo(
    () => [
      {
        id: "map-gorkha-eq",
        title: "Major Seismic Rupture — Gorkha Barpak Segment",
        type: "EARTHQUAKE",
        severity: "CRITICAL",
        magnitude: "M 7.8",
        metric_badge: "M 7.8 MAGNITUDE",
        metric_sub: "8.2 km Shallow Crustal • MMI VIII Violent",
        location: "Barpak, Gorkha District, Gandaki",
        danger_zones: "Barpak, Laprak, Mugling Corridor, Nuwakot",
        safe_haven: "Barpak Highland Football Ground (>1,450m)",
        latitude: 28.1473,
        longitude: 84.7079,
        impact_radius_m: 65000,
        color: "#ef4444",
      },
      {
        id: "map-narayani-flood",
        title: "Flash Flood & Water Inundation — Narayani Basin",
        type: "FLOOD",
        severity: "CRITICAL",
        magnitude: "+4.2m Crest",
        metric_badge: "+4.2m WATER SURGE",
        metric_sub: "River Discharge 3,150 m³/s • 2.8x Danger Mark",
        location: "Devghat Sangam to Narayangarh, Chitwan",
        danger_zones: "Narayangarh Riverside, Gaindakot, Madi, Sauraha",
        safe_haven: "Bharatpur Central Stadium (>210m elevation)",
        latitude: 27.7083,
        longitude: 84.4250,
        impact_radius_m: 35000,
        color: "#3b82f6",
      },
      {
        id: "map-pokhara-rain",
        title: "Extreme Precipitation & Landslide Warning",
        type: "WEATHER",
        severity: "HIGH",
        magnitude: "168 mm/24h",
        metric_badge: "168mm TODAY'S RAIN",
        metric_sub: "Torrential Cloudburst • High Runoff Slope Hazard",
        location: "Pokhara Valley & Lumle Ridge, Kaski",
        danger_zones: "Lumle Slopes, Seti Canyon, Sarangkot Cliff Cut",
        safe_haven: "Pokhara Exhibition Grounds High Platform",
        latitude: 28.2096,
        longitude: 83.9856,
        impact_radius_m: 25000,
        color: "#06b6d4",
      },
      {
        id: "map-nepalgunj-heat",
        title: "Severe Heatwave & Dehydration Stress",
        type: "HEATWAVE",
        severity: "HIGH",
        magnitude: "42.4 °C",
        metric_badge: "42.4°C HEATWAVE",
        metric_sub: "Heat Index 47.8°C • Red Heat Stress Advisory",
        location: "Nepalgunj Sub-Metropolitan, Banke",
        danger_zones: "Urban Core, Kohalpur Highway, Rani Talau",
        safe_haven: "Bheri Hospital Air-Cooled Hydration Hubs",
        latitude: 28.0500,
        longitude: 81.6167,
        impact_radius_m: 30000,
        color: "#f97316",
      },
    ],
    []
  );

  // Merge live alert points with baseline threat locations
  const points = useMemo(() => {
    const live = (alerts || [])
      .filter(
        (a) =>
          typeof a?.latitude === "number" && typeof a?.longitude === "number"
      )
      .map((a) => {
        const severity = String(a.severity || "LOW").toUpperCase();
        const color = severityColor(severity);
        const isEq = (a.type || "").toUpperCase().includes("EARTH");
        const isFlood = (a.type || "").toUpperCase().includes("FLOOD");

        return {
          id: a.id || `${a.latitude}-${a.longitude}`,
          title: a.title || a.type || "Live Event",
          type: a.type || "ALERT",
          severity,
          magnitude: a.magnitude ? `M ${a.magnitude}` : severity,
          metric_badge: a.magnitude ? `M ${a.magnitude} MAG` : `${severity} ALERT`,
          metric_sub: a.message || "Active sensor telemetry",
          location: a.location || "Nepal Region",
          danger_zones: a.location || "Central Impact Swath",
          safe_haven: "Designated Local Open Assembly Ground",
          latitude: a.latitude,
          longitude: a.longitude,
          impact_radius_m: isEq ? 45000 : isFlood ? 25000 : 15000,
          color,
        };
      });

    // Ensure baseline threats appear on the map
    const combined = [...live];
    baselineThreatPoints.forEach((base) => {
      if (!combined.some((c) => c.title === base.title || c.id === base.id)) {
        combined.push(base);
      }
    });

    return combined;
  }, [alerts, baselineThreatPoints]);

  return (
    <div className="disaster-map-container" style={{ height: "100%", width: "100%", position: "relative" }}>
      <MapContainer
        center={NEPAL_CENTER}
        zoom={7}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%", borderRadius: "10px" }}
      >
        <MapController focusedTarget={focusedTarget} />

        <TileLayer
          attribution='RAKSHAK AI &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {points.map((point) => {
          const isFocused = focusedTarget && focusedTarget.threatId === point.id;

          return (
            <div key={point.id}>
              {/* Impact footprint radius circle */}
              <Circle
                center={[point.latitude, point.longitude]}
                radius={point.impact_radius_m || 25000}
                pathOptions={{
                  color: point.color,
                  fillColor: point.color,
                  fillOpacity: isFocused ? 0.22 : 0.1,
                  weight: isFocused ? 2.5 : 1,
                  dashArray: "6, 8",
                }}
              />

              {/* Core Epicenter Beacon */}
              <CircleMarker
                center={[point.latitude, point.longitude]}
                radius={isFocused ? 18 : severityRadius(point.severity)}
                pathOptions={{
                  color: point.color,
                  fillColor: point.color,
                  fillOpacity: 0.85,
                  weight: isFocused ? 3 : 2,
                }}
              >
                <Tooltip direction="top" offset={[0, -10]} opacity={0.9}>
                  <span>
                    <strong>{point.metric_badge}</strong>: {point.location}
                  </span>
                </Tooltip>

                <Popup>
                  <div className="map-popup-card">
                    {/* Highlighted Magnitude / Metric Badge */}
                    <div
                      className="popup-magnitude-badge"
                      style={{
                        background: point.color,
                        color: "#fff",
                        padding: "4px 8px",
                        borderRadius: "5px",
                        fontWeight: "900",
                        fontSize: "12px",
                        letterSpacing: "0.04em",
                        marginBottom: "6px",
                        display: "inline-block",
                      }}
                    >
                      {point.metric_badge}
                    </div>

                    <h4 style={{ margin: "2px 0 6px", fontSize: "13px" }}>
                      {point.title}
                    </h4>

                    <div style={{ fontSize: "11px", marginBottom: "5px", color: "#334155" }}>
                      <strong>📍 Location:</strong> {point.location}
                      <br />
                      <small style={{ color: "#64748b" }}>
                        Lat: {point.latitude.toFixed(4)}°, Lon: {point.longitude.toFixed(4)}°
                      </small>
                    </div>

                    <div style={{ fontSize: "11px", marginBottom: "5px", color: "#b91c1c" }}>
                      <strong>⚠️ Danger Zones:</strong> {point.danger_zones}
                    </div>

                    <div style={{ fontSize: "11px", marginBottom: "6px", color: "#15803d" }}>
                      <strong>🛡️ Safe Zone:</strong> {point.safe_haven}
                    </div>

                    <p style={{ margin: "0", fontSize: "11px", color: "#475569" }}>
                      {point.metric_sub}
                    </p>
                  </div>
                </Popup>
              </CircleMarker>
            </div>
          );
        })}
      </MapContainer>
    </div>
  );
}
