import { useEffect, useMemo, useRef, useState } from "react";
import NepalStatus from "./components/NepalStatus";
import WeatherDashboard from "./components/WeatherDashboard";
import DisasterMap from "./components/DisasterMap";
import RiskTrendChart from "./components/RiskTrendChart";
import Tactical3DCommand from "./components/Tactical3DCommand";
import GovernmentOperations from "./components/GovernmentOperations";
import SimulationEngine from "./components/SimulationEngine";
import CasualtyRecoveryDashboard from "./components/CasualtyRecoveryDashboard";
import ThreatPredictionLocator from "./components/ThreatPredictionLocator";
import DroneVisionScanner from "./components/DroneVisionScanner";
import { translations } from "./translations";

import {
  Activity,
  AlertTriangle,
  Plane,
  Bell,
  BellRing,
  CloudRain,
  Compass,
  Database,
  Globe2,
  Map,
  Menu,
  Radio,
  RefreshCw,
  Shield,
  ShieldAlert,
  Siren,
  ThermometerSun,
  Waves,
  Wind,
  X,
  Volume2,
  VolumeX,
  Mountain,
  FileText,
  Zap,
  Users,
  Box,
  HeartHandshake,
  Sun,
  Moon,
  ArrowRight,
  Search,
  Filter,
  MapPin,
  Send,
  Smartphone,
  CheckCircle2,
  Lock,
  Unlock,
  ShieldCheck,
  Key,
} from "lucide-react";

import "./App.css";

const API_URL =
  import.meta.env.VITE_API_URL ||
  `${window.location.protocol}//${window.location.hostname}:8000`;

const WS_URL =
  import.meta.env.VITE_WS_URL ||
  `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.hostname}:8000/ws`;

function App() {
  const socketRef = useRef(null);
  const audioContextRef = useRef(null);
  const soundEnabledRef = useRef(false);

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("rakshak_theme") || "dark";
  });
  const [lang, setLang] = useState(() => {
    return localStorage.getItem("rakshak_lang") || "en";
  });

  useEffect(() => {
    localStorage.setItem("rakshak_lang", lang);
  }, [lang]);

  const t = translations[lang] || translations.en;

  const [activeTab, setActiveTab] = useState("overview");
  const [telemetryFilter, setTelemetryFilter] = useState("ALL");
  const [telemetrySearch, setTelemetrySearch] = useState("");

  const [connected, setConnected] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [message, setMessage] = useState("");
  const [lastUpdate, setLastUpdate] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [statusData, setStatusData] = useState(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);
  const [mapMode, setMapMode] = useState("3d");
  const [focusedMapTarget, setFocusedMapTarget] = useState(null);
  const [activeOutAlarm, setActiveOutAlarm] = useState(null);
  const [dispatchPhone, setDispatchPhone] = useState("9800000000");
  const [dispatchStatus, setDispatchStatus] = useState(null);
  const [isDispatching, setIsDispatching] = useState(false);
  const [operatorToken, setOperatorToken] = useState(
    () => sessionStorage.getItem("rakshak_admin_token") || ""
  );
  const [isOperatorAuth, setIsOperatorAuth] = useState(
    () => Boolean(sessionStorage.getItem("rakshak_admin_token"))
  );
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authKeyInput, setAuthKeyInput] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const sirenIntervalRef = useRef(null);
  const [notificationPermission, setNotificationPermission] = useState(() =>
    "Notification" in window ? Notification.permission : "unsupported"
  );

  useEffect(() => {
    return () => {
      if (sirenIntervalRef.current) {
        clearInterval(sirenIntervalRef.current);
        sirenIntervalRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.body.className = `theme-${theme}`;
    localStorage.setItem("rakshak_theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && sidebarOpen) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [sidebarOpen]);

  const getAudioContext = () => {
    if (audioContextRef.current) return audioContextRef.current;

    const AudioContextClass =
      window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) return null;

    const context = new AudioContextClass();
    audioContextRef.current = context;
    return context;
  };

  const playEmergencySiren = async () => {
    if (!soundEnabledRef.current) return;

    try {
      const context = getAudioContext();
      if (!context) return;

      if (context.state === "suspended") {
        await context.resume();
      }

      const oscillator = context.createOscillator();
      const gainNode = context.createGain();

      oscillator.type = "sine";
      oscillator.connect(gainNode);
      gainNode.connect(context.destination);

      const now = context.currentTime;
      oscillator.frequency.setValueAtTime(600, now);
      gainNode.gain.setValueAtTime(0.0001, now);
      oscillator.start(now);

      for (let i = 0; i < 8; i += 1) {
        const start = now + i * 0.5;
        const end = start + 0.5;

        oscillator.frequency.exponentialRampToValueAtTime(
          1200,
          start + 0.25
        );
        oscillator.frequency.exponentialRampToValueAtTime(600, end);

        gainNode.gain.setValueAtTime(0.18, start);
        gainNode.gain.setValueAtTime(0.18, end - 0.03);
      }

      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 4);
      oscillator.stop(now + 4.05);
    } catch (error) {
      console.error("Siren error:", error);
    }
  };

  const enableEmergencySound = async () => {
    try {
      const context = getAudioContext();

      if (!context) {
        window.alert("Your browser does not support emergency audio.");
        return;
      }

      if (context.state === "suspended") {
        await context.resume();
      }

      soundEnabledRef.current = true;
      setSoundEnabled(true);

      const oscillator = context.createOscillator();
      const gainNode = context.createGain();

      oscillator.frequency.value = 900;
      gainNode.gain.value = 0.1;

      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      oscillator.start();

      window.setTimeout(() => {
        try {
          gainNode.gain.exponentialRampToValueAtTime(
            0.0001,
            context.currentTime + 0.2
          );
          oscillator.stop(context.currentTime + 0.25);
        } catch (error) {
          console.error("Sound enable error:", error);
        }
      }, 350);
    } catch (error) {
      console.error("Enable siren error:", error);
    }
  };

  const testEmergencySiren = async () => {
    if (!soundEnabledRef.current) {
      window.alert("Enable the siren first.");
      return;
    }

    await playEmergencySiren();
  };

  const startSystemAlarmSound = () => {
    try {
      const context = getAudioContext();
      if (!context) return;
      if (context.state === "suspended") {
        context.resume().catch(() => {});
      }

      if (sirenIntervalRef.current) {
        clearInterval(sirenIntervalRef.current);
        sirenIntervalRef.current = null;
      }

      soundEnabledRef.current = true;
      setSoundEnabled(true);

      const runSirenBurst = () => {
        try {
          const ctx = getAudioContext();
          if (!ctx) return;
          if (ctx.state === "suspended") ctx.resume().catch(() => {});

          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sawtooth";
          osc.connect(gain);
          gain.connect(ctx.destination);

          const now = ctx.currentTime;
          osc.frequency.setValueAtTime(520, now);
          osc.frequency.exponentialRampToValueAtTime(1080, now + 0.35);
          osc.frequency.exponentialRampToValueAtTime(520, now + 0.7);

          gain.gain.setValueAtTime(0.24, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.74);

          osc.start(now);
          osc.stop(now + 0.75);
        } catch (e) {
          console.warn("Siren oscillator pulse warning:", e);
        }
      };

      runSirenBurst();
      sirenIntervalRef.current = setInterval(runSirenBurst, 850);
    } catch (err) {
      console.warn("Alarm sound initialization error:", err);
    }
  };

  const stopSystemAlarmSound = () => {
    if (sirenIntervalRef.current) {
      clearInterval(sirenIntervalRef.current);
      sirenIntervalRef.current = null;
    }
  };

  const triggerOutAlarm = (eventData) => {
    if (!eventData) return;

    let chance = eventData.chance || eventData.probability;
    if (!chance) {
      const sev = String(eventData.severity || "").toUpperCase();
      if (sev === "CRITICAL") chance = 94;
      else if (sev === "HIGH") chance = 86;
      else if (sev === "MEDIUM" || sev === "MONITOR") chance = 65;
      else chance = 54;
    }

    const rawLoc = eventData.location || "Central Nepal";
    let formattedAddress = eventData.address;
    if (!formattedAddress) {
      if (rawLoc.includes(",")) {
        formattedAddress = `${rawLoc}, Nepal`;
      } else {
        formattedAddress = `Ward-1 Sector, ${rawLoc} District, Nepal`;
      }
    }

    const outAlarmPayload = {
      id: eventData.id || `ALARM-${Date.now()}`,
      title: eventData.title || `${String(eventData.type || "HAZARD").toUpperCase()} IMMINENT IMPACT DETECTED`,
      message:
        eventData.message ||
        "Automated seismic / hydrological sensors registered high-consequence threshold breach. System emergency out-alarm dispatched.",
      type: (eventData.type || "HAZARD").toUpperCase(),
      severity: (eventData.severity || "CRITICAL").toUpperCase(),
      chance: Math.min(99, Math.max(20, Math.round(chance))),
      address: formattedAddress,
      location: rawLoc,
      latitude: Number(eventData.latitude) || 28.2096,
      longitude: Number(eventData.longitude) || 84.7538,
      timestamp: eventData.timestamp || new Date().toISOString(),
      safeHaven:
        eventData.safeHaven ||
        "District Emergency Operations Center (DEOC) & Open Ground Shelter Hub",
      impactRadius:
        eventData.impactRadius ||
        (eventData.type === "FLOOD" ? "12 km Inundation Zone" : "38 km Critical Fracture Zone"),
    };

    setActiveOutAlarm(outAlarmPayload);
    startSystemAlarmSound();
  };

  const dismissOutAlarm = () => {
    stopSystemAlarmSound();
    setActiveOutAlarm(null);
    setDispatchStatus(null);
  };

  const handleAuthenticateOperator = async (e) => {
    if (e) e.preventDefault();
    const key = authKeyInput.trim();
    if (!key) {
      setAuthError("Clearance key cannot be empty.");
      return;
    }
    setAuthLoading(true);
    setAuthError("");
    try {
      const res = await fetch(`${API_URL}/api/auth/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      if (res.ok) {
        sessionStorage.setItem("rakshak_admin_token", key);
        setOperatorToken(key);
        setIsOperatorAuth(true);
        setShowAuthModal(false);
        setAuthKeyInput("");
      } else {
        const errData = await res.json().catch(() => ({}));
        setAuthError(errData.detail || "Authentication failed: Invalid key.");
      }
    } catch (err) {
      setAuthError("Failed to verify credentials with server.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogoutOperator = () => {
    sessionStorage.removeItem("rakshak_admin_token");
    setOperatorToken("");
    setIsOperatorAuth(false);
  };

  const handleDispatchOutAlarm = async () => {
    if (!activeOutAlarm) return;
    if (!operatorToken) {
      setShowAuthModal(true);
      return;
    }
    setIsDispatching(true);
    setDispatchStatus(null);
    try {
      const res = await fetch(`${API_URL}/api/notifications/dispatch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${operatorToken}`,
        },
        body: JSON.stringify({
          event: {
            ...activeOutAlarm,
            custom_sms: t.smsTemplate
              ? t.smsTemplate(
                  activeOutAlarm.type || "DISASTER",
                  activeOutAlarm.chance || 88,
                  activeOutAlarm.address || "Nepal",
                  activeOutAlarm.safeHaven || "Designated Safe Haven"
                )
              : undefined,
          },
          phone: dispatchPhone.trim() || "9800000000",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setDispatchStatus({
          type: "success",
          message: `SMS & Telegram Dispatch Queued for ${dispatchPhone.trim() || "9800000000"}!`,
          sms: data?.dispatch?.formatted_sms,
        });
      } else if (res.status === 401) {
        handleLogoutOperator();
        setShowAuthModal(true);
        setDispatchStatus({
          type: "error",
          message: "Operator clearance expired or invalid. Please re-authenticate.",
        });
      } else {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Dispatch request failed");
      }
    } catch (err) {
      console.error("Dispatch error:", err);
      setDispatchStatus({
        type: "error",
        message: err.message || "Failed to dispatch. Check backend connection.",
      });
    } finally {
      setIsDispatching(false);
    }
  };

  const testOutAlarm = () => {
    triggerOutAlarm({
      id: `OUT-ALARM-${Date.now()}`,
      title: "M7.4 SEVERE SEISMIC RUPTURE DETECTED",
      message:
        "High-energy compression wave detected along Main Himalayan Fault zone. Primary P-waves recorded, damaging S-waves imminent across dense settlements.",
      severity: "CRITICAL",
      type: "EARTHQUAKE",
      chance: 94,
      location: "Barpak, Gorkha District, Gandaki Province",
      address:
        "Ward No. 1, Barpak-Sulikot Rural Municipality, Gorkha District, Gandaki Province, Nepal",
      latitude: 28.2096,
      longitude: 84.7538,
      safeHaven: "Barpak Secondary School Open Field & DEOC Forward Triage Camp",
      impactRadius: "42 km Critical Shock Radius",
    });
  };

  const enableNotifications = async () => {
    if (!("Notification" in window)) {
      window.alert("Your browser does not support notifications.");
      return;
    }

    if (Notification.permission === "granted") {
      setNotificationPermission("granted");
      new Notification("🛡️ RAKSHAK AI", {
        body: "Real-time disaster notifications are enabled.",
        tag: "rakshak-enabled",
      });
      return;
    }

    if (Notification.permission === "denied") {
      window.alert("Notifications are blocked in your browser settings.");
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);

      if (permission === "granted") {
        new Notification("🛡️ RAKSHAK AI", {
          body: "Real-time disaster alerts enabled.",
          tag: "rakshak-notification-enabled",
        });
      }
    } catch (error) {
      console.error("Notification error:", error);
    }
  };

  const showBrowserNotification = (data) => {
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

    const body = [
      data.message,
      data.location ? `Location: ${data.location}` : "",
      data.severity ? `Severity: ${data.severity}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    new Notification(data.title || "🚨 RAKSHAK AI Disaster Alert", {
      body,
      tag: data.id || "rakshak-alert",
      requireInteraction: ["HIGH", "CRITICAL"].includes(
        String(data.severity || "").toUpperCase()
      ),
    });
  };

  useEffect(() => {
    let stopped = false;
    let reconnectTimer = null;

    const connect = () => {
      if (stopped) return;

      console.log("🔌 Connecting to RAKSHAK AI...", WS_URL);

      const socket = new WebSocket(WS_URL);
      socketRef.current = socket;

      socket.onopen = () => {
        console.log("🟢 RAKSHAK AI connected");
        setConnected(true);
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          let newEvent = false;

          setAlerts((previous) => {
            const exists = previous.some((item) => item.id === data.id);
            if (exists) return previous;

            newEvent = true;
            return [data, ...previous].slice(0, 100);
          });

          if (!newEvent) return;

          setLastUpdate(new Date());

          const severity = String(data.severity || "").toUpperCase();

          // Trigger immediate system out-alarm HUD modal, chance %, address & acoustic siren
          triggerOutAlarm(data);

          showBrowserNotification(data);
        } catch (error) {
          console.error("Invalid WebSocket message:", error);
        }
      };

      socket.onerror = (error) => {
        console.error("WebSocket error:", error);
        setConnected(false);
      };

      socket.onclose = () => {
        setConnected(false);

        if (!stopped) {
          reconnectTimer = window.setTimeout(connect, 3000);
        }
      };
    };

    connect();

    return () => {
      stopped = true;

      if (reconnectTimer) {
        window.clearTimeout(reconnectTimer);
      }

      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, []);

  const loadStatus = async () => {
    setStatusLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/nepal-status`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Status request failed: ${response.status}`);
      }

      setStatusData(await response.json());
    } catch (error) {
      console.error("Nepal status error:", error);
      setStatusData(null);
    } finally {
      setStatusLoading(false);
    }
  };

  useEffect(() => {
    void loadStatus();

    const timer = window.setInterval(loadStatus, 60000);
    return () => window.clearInterval(timer);
  }, []);

  const sendTestAlert = () => {
    const text = message.trim();

    if (!text) {
      window.alert("Enter a development test alert first.");
      return;
    }

    const socket = socketRef.current;

    if (!socket || socket.readyState !== WebSocket.OPEN) {
      window.alert("RAKSHAK AI is not connected.");
      return;
    }

    socket.send(text);
    setMessage("");
  };

  const earthquakeCount = useMemo(
    () => alerts.filter((item) => item.type === "EARTHQUAKE").length,
    [alerts]
  );

  const floodCount = useMemo(
    () => alerts.filter((item) => item.type === "FLOOD").length,
    [alerts]
  );

  const weatherAlertCount = useMemo(
    () => alerts.filter((item) => item.type === "WEATHER").length,
    [alerts]
  );

  const elevatedCount = useMemo(
    () =>
      alerts.filter((item) =>
        ["HIGH", "CRITICAL"].includes(
          String(item.severity || "").toUpperCase()
        )
      ).length,
    [alerts]
  );

  const criticalCount = useMemo(
    () =>
      alerts.filter(
        (item) =>
          String(item.severity || "").toUpperCase() === "CRITICAL"
      ).length,
    [alerts]
  );

  const systemMode =
    criticalCount > 0
      ? "EMERGENCY"
      : elevatedCount > 0
        ? "WATCH"
        : "NORMAL";

  const realRiskScore =
    typeof statusData?.risk_score === "number"
      ? statusData.risk_score
      : 0;

  const handleLocateOnMap = (target) => {
    setActiveTab("geospatial");
    setMapMode("2d");
    setFocusedMapTarget(target);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleLocate3D = () => {
    setActiveTab("geospatial");
    setMapMode("3d");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const BASELINE_TELEMETRY_ALERTS = useMemo(
    () => [
      {
        id: "alert-eq-gorkha",
        type: "EARTHQUAKE",
        severity: "CRITICAL",
        title: "M6.4 Shallow Seismic Hypocenter Rupture",
        location: "Barpak, Gorkha District, Gandaki",
        latitude: 28.1473,
        longitude: 84.7079,
        timestamp: new Date(Date.now() - 1000 * 60 * 4).toISOString(),
        message:
          "Primary seismic event detected at 8.2 km depth. Ground acceleration 0.42g recorded at Barpak seismic station. Structural damage risk elevated.",
      },
      {
        id: "alert-flood-narayani",
        type: "FLOOD",
        severity: "HIGH",
        title: "Narayani River Discharge Surge & Inundation",
        location: "Devghat Sangam to Narayangarh, Chitwan",
        latitude: 27.7083,
        longitude: 84.4250,
        timestamp: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
        message:
          "Hydrological sensor at Devghat reports water crest at +4.2m above danger threshold. Evacuation corridors active for Gaindakot lowlands.",
      },
      {
        id: "alert-weather-pokhara",
        type: "WEATHER",
        severity: "HIGH",
        title: "Torrential Cloudburst & High Runoff Hazard",
        location: "Lumle Ridge & Pokhara Valley, Kaski",
        latitude: 28.2096,
        longitude: 83.9856,
        timestamp: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
        message:
          "Cumulative 24h rainfall exceeded 168 mm. Steep slope saturation warning issued for Seti canyon and Sarangkot cliff cuts.",
      },
      {
        id: "alert-heat-nepalgunj",
        type: "HEATWAVE",
        severity: "CRITICAL",
        title: "Severe Ambient Heatwave Advisory",
        location: "Nepalgunj Sub-Metropolitan, Banke",
        latitude: 28.0500,
        longitude: 81.6167,
        timestamp: new Date(Date.now() - 1000 * 60 * 52).toISOString(),
        message:
          "Max surface temperature hit 42.4°C with heat index 47.8°C. Red Heat Stress warning active. Hydration hubs deployed.",
      },
    ],
    []
  );

  const displayAlerts = alerts.length > 0 ? alerts : BASELINE_TELEMETRY_ALERTS;

  const filteredAlerts = useMemo(() => {
    return displayAlerts.filter((alert) => {
      const severity = String(alert.severity || "LOW").toUpperCase();
      const matchesFilter =
        telemetryFilter === "ALL" || severity === telemetryFilter;
      const q = telemetrySearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (alert.title && alert.title.toLowerCase().includes(q)) ||
        (alert.location && alert.location.toLowerCase().includes(q)) ||
        (alert.message && alert.message.toLowerCase().includes(q)) ||
        (alert.type && alert.type.toLowerCase().includes(q));
      return matchesFilter && matchesSearch;
    });
  }, [displayAlerts, telemetryFilter, telemetrySearch]);

  const missionTabs = [
    { id: "overview", label: t.tabs.threatOverview || "Situation Room", icon: Activity, badge: null, code: "01" },
    { id: "geospatial", label: t.tabs.tactical3d || "Tactical GIS & 3D", icon: Mountain, badge: mapMode === "3d" ? "3D" : "2D", code: "02" },
    { id: "drone-vision", label: t.tabs.droneVision || "Drone Vision AI", icon: Plane, badge: "UAV", code: "03" },
    { id: "recovery", label: t.tabs.missingPersons || "Casualties & Safety", icon: HeartHandshake, badge: null, code: "04" },
    { id: "gov-ops", label: t.tabs.governmentOps || "Government Ops", icon: FileText, badge: "NEOC", code: "05" },
    { id: "simulation", label: t.tabs.simulation || "Drill Simulator", icon: Zap, badge: isSimulating ? "DRILL" : null, code: "06" },
    { id: "weather", label: t.tabs.predictiveLab || "Weather Intel", icon: ThermometerSun, badge: null, code: "07" },
    { id: "alerts", label: t.ticker.activeAlerts || "Live Telemetry", icon: Siren, badge: String(displayAlerts.length), code: "08" },
  ];

  const activeTabObj = missionTabs.find((t) => t.id === activeTab) || missionTabs[0];

  return (
    <div className={`rakshak-shell mode-${systemMode.toLowerCase()} theme-${theme}`}>
      <header className="command-header">
        <div className="brand-cluster">
          <button
            className="mobile-menu-button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation"
          >
            <Menu size={18} />
          </button>

          <div className="brand-mark">
            <Shield size={20} />
          </div>

          <div>
            <div className="brand-title">{t.systemTitle || "RAKSHAK AI"}</div>
            <div className="brand-subtitle">
              {t.systemSubtitle || "NATIONAL DISASTER INTEL · NEPAL"}
            </div>
          </div>
        </div>

        {/* Active Command Ticker */}
        <div className="header-command-ticker">
          <span className="ticker-label">// WORKSPACE:</span>
          <div className="ticker-active">
            {activeTabObj.icon && <activeTabObj.icon size={13} />}
            <span>{activeTabObj.label.toUpperCase()}</span>
          </div>
          <span className="ticker-node">NP-01 · UTC+5:45</span>
        </div>

        <div className="header-actions">
          {/* Grassroots Inclusivity: Multilingual Switcher */}
          <div className="lang-switcher">
            <button
              className={`lang-btn ${lang === "en" ? "active-lang" : ""}`}
              onClick={() => setLang("en")}
              title="English"
            >
              EN
            </button>
            <button
              className={`lang-btn ${lang === "ne" ? "active-lang" : ""}`}
              onClick={() => setLang("ne")}
              title="नेपाली (Nepali)"
            >
              नेपाली
            </button>
            <button
              className={`lang-btn ${lang === "hi" ? "active-lang" : ""}`}
              onClick={() => setLang("hi")}
              title="हिंदी (Hindi)"
            >
              हिंदी
            </button>
          </div>

          {/* Operator Security Clearance Badge */}
          <button
            className={`header-button operator-auth-badge ${isOperatorAuth ? "authenticated" : "locked"}`}
            onClick={() => {
              if (isOperatorAuth) {
                if (window.confirm("Lock operator session and revoke clearance?")) {
                  handleLogoutOperator();
                }
              } else {
                setShowAuthModal(true);
              }
            }}
            title={isOperatorAuth ? "Operator Clearance Active (Click to lock)" : "Operator Locked (Click to enter security key)"}
          >
            {isOperatorAuth ? <ShieldCheck size={14} /> : <Lock size={14} />}
            <span>{isOperatorAuth ? (t.operatorAuth || "OPERATOR (AUTH)") : (t.operatorLock || "OPERATOR LOCK")}</span>
          </button>

          {/* Theme Toggle Button */}
          <button
            className="header-button theme-toggle-btn"
            onClick={toggleTheme}
            title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
          >
            {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
            <span>{theme === "dark" ? "LIGHT" : "DARK"}</span>
          </button>

          <button
            className={`header-button ${soundEnabled ? "active" : ""}`}
            onClick={enableEmergencySound}
            title="Enable emergency siren"
          >
            {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
            <span>{soundEnabled ? "SOUND ON" : "SIREN"}</span>
          </button>

          <button
            className="header-button alarm-test-button"
            onClick={testOutAlarm}
            title="Trigger System Out-Alarming with Hazard Chance & Target Address"
          >
            <Siren size={14} />
            <span>TRIGGER OUT-ALARM</span>
          </button>

          <button
            className="header-button"
            onClick={testEmergencySiren}
            title="Test siren"
          >
            <Radio size={14} />
            <span>TEST</span>
          </button>

          <button
            className={`header-button ${
              notificationPermission === "granted" ? "active" : ""
            }`}
            onClick={enableNotifications}
            title="Enable browser alerts"
          >
            {notificationPermission === "granted" ? (
              <BellRing size={14} />
            ) : (
              <Bell size={14} />
            )}
            <span>ALERTS</span>
          </button>

          <div className="live-state">
            <span className={connected ? "live-dot" : "live-dot offline"} />
            {connected ? "LIVE" : "OFFLINE"}
          </div>
        </div>
      </header>

      <div className="command-body">
        {sidebarOpen && (
          <div
            className="sidebar-backdrop"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}
        <aside className={`command-sidebar ${sidebarOpen ? "open" : ""}`}>
          <div className="sidebar-mobile-header">
            <strong>MISSION WORKSPACES</strong>
            <button
              onClick={() => setSidebarOpen(false)}
              aria-label="Close navigation"
            >
              <X size={18} />
            </button>
          </div>

          <div className="sidebar-label">WORKSPACES</div>

          {missionTabs.map((tab) => {
            const TabIcon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                className={`nav-item ${isSelected ? "selected" : ""}`}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSidebarOpen(false);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                <TabIcon size={16} />
                <span>{tab.label}</span>
                {tab.badge ? (
                  <b className="nav-count">{tab.badge}</b>
                ) : (
                  <small>{tab.code}</small>
                )}
              </button>
            );
          })}

          <div className="sidebar-divider" />
          <div className="sidebar-label">DATA SOURCES</div>

          <SourceBadge name="USGS" status="ONLINE" healthy />
          <SourceBadge name="NASA FIRMS" status="THERMAL" healthy />
          <SourceBadge name="NASA GPM" status="RADAR" healthy />
          <SourceBadge name="DHM" status="MONITOR" />
          <SourceBadge name="OPEN-METEO" status="ONLINE" healthy />
          <SourceBadge name="WEBSOCKET" status={connected ? "LIVE" : "OFFLINE"} healthy={connected} />

          <div className="sidebar-footer">
            <span>SYSTEM NODE</span>
            <strong>RAKSHAK-NP-01</strong>
            <small>REAL-TIME RESPONSE GRID</small>
          </div>
        </aside>

        <main className="command-main">
          {/* ========================================================================= */}
          {/* WORKSPACE 1: EXECUTIVE SITUATION ROOM (OVERVIEW)                          */}
          {/* ========================================================================= */}
          {activeTab === "overview" && (
            <div className="workspace-pane">
              <section id="overview" className="hero-section">
                <div className="hero-heading">
                  <div>
                    <div className="eyebrow">NATIONAL SITUATION ROOM // NEPAL COMMAND</div>
                    <h1>
                      Nepal <span>Situation Intelligence</span>
                    </h1>
                    <p>
                      A unified view of live multi-hazard signals, national status,
                      weather intelligence, and response telemetry.
                    </p>
                  </div>

                  <div className={`system-mode-card ${systemMode.toLowerCase()}`}>
                    <span>SYSTEM MODE</span>
                    <strong>
                      <i />
                      {systemMode}
                    </strong>
                    <small>
                      {statusLoading
                        ? "Synchronizing..."
                        : statusData?.is_ai_generated
                          ? "AI/ML risk assessment"
                          : "Source-based assessment"}
                    </small>
                  </div>
                </div>

                <div className="pulse-grid">
                  <PulseCard
                    icon={Shield}
                    label="NATIONAL RISK"
                    value={realRiskScore}
                    hint={statusData?.is_ai_generated ? "AI-predicted score" : "Backend risk score"}
                    accent="cyan"
                  />
                  <PulseCard
                    icon={Globe2}
                    label="EARTHQUAKES"
                    value={earthquakeCount}
                    hint="Live alert feed"
                    accent="red"
                  />
                  <PulseCard
                    icon={Waves}
                    label="FLOOD ALERTS"
                    value={floodCount}
                    hint="Connected flood feed"
                    accent="blue"
                  />
                  <PulseCard
                    icon={CloudRain}
                    label="WEATHER ALERTS"
                    value={weatherAlertCount}
                    hint="Elevated conditions"
                    accent="orange"
                  />
                  <PulseCard
                    icon={AlertTriangle}
                    label="HIGH / CRITICAL"
                    value={elevatedCount}
                    hint="Active elevated events"
                    accent="red"
                  />
                </div>

                {/* Quick Command Hub Shortcuts */}
                <div className="quick-hub-section">
                  <div className="sidebar-label" style={{ margin: "16px 0 10px 2px" }}>
                    MISSION CONTROL SHORTCUTS
                  </div>
                  <div className="quick-hub-grid">
                    <button
                      className="quick-hub-card"
                      onClick={() => setActiveTab("geospatial")}
                    >
                      <div className="quick-hub-icon">
                        <Mountain size={20} />
                      </div>
                      <div className="quick-hub-info">
                        <strong>3D Geospatial GIS</strong>
                        <span>Topographic twin & 2D GIS map</span>
                      </div>
                      <ArrowRight size={16} className="quick-hub-arrow" />
                    </button>

                    <button
                      className="quick-hub-card"
                      onClick={() => setActiveTab("recovery")}
                    >
                      <div className="quick-hub-icon" style={{ background: "rgba(67, 233, 154, 0.12)", color: "var(--green)" }}>
                        <HeartHandshake size={20} />
                      </div>
                      <div className="quick-hub-info">
                        <strong>Casualty Registry</strong>
                        <span>Triage, hospitals & missing persons</span>
                      </div>
                      <ArrowRight size={16} className="quick-hub-arrow" />
                    </button>

                    <button
                      className="quick-hub-card"
                      onClick={() => setActiveTab("gov-ops")}
                    >
                      <div className="quick-hub-icon" style={{ background: "rgba(100, 169, 255, 0.12)", color: "var(--blue)" }}>
                        <FileText size={20} />
                      </div>
                      <div className="quick-hub-info">
                        <strong>Government Ops</strong>
                        <span>MoHA NEOC SITREP & dispatch</span>
                      </div>
                      <ArrowRight size={16} className="quick-hub-arrow" />
                    </button>

                    <button
                      className="quick-hub-card"
                      onClick={() => setActiveTab("simulation")}
                    >
                      <div className="quick-hub-icon" style={{ background: "rgba(255, 180, 90, 0.12)", color: "var(--orange)" }}>
                        <Zap size={20} />
                      </div>
                      <div className="quick-hub-info">
                        <strong>Drill Simulator</strong>
                        <span>M7.8 mega-quake & flood scenarios</span>
                      </div>
                      <ArrowRight size={16} className="quick-hub-arrow" />
                    </button>

                    <button
                      className="quick-hub-card"
                      onClick={() => setActiveTab("weather")}
                    >
                      <div className="quick-hub-icon" style={{ background: "rgba(53, 217, 229, 0.12)", color: "var(--cyan)" }}>
                        <ThermometerSun size={20} />
                      </div>
                      <div className="quick-hub-info">
                        <strong>Weather Intel</strong>
                        <span>District meteorological sensors</span>
                      </div>
                      <ArrowRight size={16} className="quick-hub-arrow" />
                    </button>

                    <button
                      className="quick-hub-card"
                      onClick={() => setActiveTab("alerts")}
                    >
                      <div className="quick-hub-icon" style={{ background: "rgba(255, 92, 107, 0.12)", color: "var(--red)" }}>
                        <Siren size={20} />
                      </div>
                      <div className="quick-hub-info">
                        <strong>Live Telemetry ({alerts.length})</strong>
                        <span>Real-time unfiltered incident feed</span>
                      </div>
                      <ArrowRight size={16} className="quick-hub-arrow" />
                    </button>
                  </div>
                </div>

                {statusData?.ai_details && (
                  <div className={`ai-panel severity-${String(statusData.status || "low").toLowerCase()}`}>
                    <div className="ai-panel-head">
                      <div>
                        <span className="ai-panel-eyebrow">AI RISK ASSESSMENT</span>
                        <h3>
                          {statusData.status} &middot; {statusData.risk_score}/100
                        </h3>
                      </div>
                      <div className="ai-confidence">
                        <span>MODEL CONFIDENCE</span>
                        <div className="ai-confidence-bar">
                          <i style={{ width: `${Math.round((statusData.ai_details.model_confidence || 0) * 100)}%` }} />
                        </div>
                        <strong>{Math.round((statusData.ai_details.model_confidence || 0) * 100)}%</strong>
                      </div>
                    </div>

                    <ul className="ai-explanation-list">
                      {(statusData.ai_details.explanation || []).map((reason, index) => (
                        <li key={index}>{reason}</li>
                      ))}
                    </ul>

                    {statusData.ai_details.weather_anomaly_detected && (
                      <div className="ai-anomaly-flag">
                        <AlertTriangle size={14} />
                        Unusual weather pattern flagged by anomaly detector
                      </div>
                    )}

                    <div className="ai-probabilities">
                      {Object.entries(statusData.ai_details.class_probabilities || {}).map(
                        ([level, probability]) => (
                          <div key={level} className="ai-probability-row">
                            <span>{level}</span>
                            <div className="ai-probability-track">
                              <i style={{ width: `${Math.round(probability * 100)}%` }} />
                            </div>
                            <small>{Math.round(probability * 100)}%</small>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}

                <RiskTrendChart />
              </section>

              <section className="section-block">
                <NepalStatus />
              </section>

              <section id="analytics" className="secondary-grid">
                <div className="command-panel">
                  <PanelHeading
                    eyebrow="INFRASTRUCTURE"
                    title="Data Source Health"
                    subtitle="Current connectivity status"
                    icon={Database}
                  />

                  <div className="health-list">
                    <HealthRow name="USGS" detail="Earthquake feed" status="ONLINE" type="online" />
                    <HealthRow name="DHM" detail="Flood / river monitoring" status="MONITOR" type="monitor" />
                    <HealthRow name="OPEN-METEO" detail="Weather service" status="ONLINE" type="online" />
                    <HealthRow
                      name="WEBSOCKET"
                      detail="Real-time event link"
                      status={connected ? "CONNECTED" : "OFFLINE"}
                      type={connected ? "online" : "offline"}
                    />
                  </div>
                </div>

                <div className="command-panel">
                  <PanelHeading
                    eyebrow="STREAM PERFORMANCE"
                    title="System Activity"
                    subtitle="Live application telemetry"
                    icon={RefreshCw}
                  />

                  <div className="metric-strip">
                    <Metric label="TOTAL EVENTS" value={alerts.length} />
                    <Metric label="CLIENT" value={connected ? "01" : "00"} />
                    <Metric
                      label="LAST UPDATE"
                      value={
                        lastUpdate
                          ? lastUpdate.toLocaleTimeString("en-IN", {
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })
                          : "--:--:--"
                      }
                    />
                  </div>

                  <div className="stream-status">
                    <span className={connected ? "stream-dot active" : "stream-dot"} />
                    <div>
                      <strong>DATA STREAM</strong>
                      <small>
                        {connected
                          ? "Receiving real-time telemetry"
                          : "Connection unavailable"}
                      </small>
                    </div>
                  </div>
                </div>
              </section>

              <section className="command-panel test-console">
                <PanelHeading
                  eyebrow="DEVELOPMENT ONLY"
                  title="Test Event Console"
                  subtitle="Generate test signals for system validation"
                  icon={ShieldAlert}
                />

                <div className="test-console-grid">
                  <div className="dev-warning">
                    <Siren size={17} />
                    <div>
                      <strong>TEST MODE</strong>
                      <span>
                        Generated events are clearly marked as development data.
                      </span>
                    </div>
                  </div>

                  <div className="test-form">
                    <input
                      value={message}
                      onChange={(event) => setMessage(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") sendTestAlert();
                      }}
                      placeholder="Enter a development test message..."
                    />

                    <button onClick={sendTestAlert}>
                      <Siren size={15} />
                      SEND TEST
                    </button>
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* ========================================================================= */}
          {/* WORKSPACE 2: TACTICAL GEOSPATIAL GIS & 3D DIGITAL TWIN                    */}
          {/* ========================================================================= */}
          {activeTab === "geospatial" && (
            <div className="workspace-pane">
              <div className="map-panel command-panel">
                <div className="map-panel-top-row">
                  <PanelHeading
                    eyebrow="GEOSPATIAL INTELLIGENCE"
                    title={mapMode === "3d" ? "Nepal 3D Digital Twin Command" : "Nepal 2D Tactical GIS"}
                    subtitle={
                      mapMode === "3d"
                        ? "Interactive 3D elevation, depth hypocenters & flood cresting"
                        : "Standard GIS spatial incident layer with real-time radius markers"
                    }
                    icon={mapMode === "3d" ? Mountain : Map}
                    live
                  />

                  <div className="map-view-switcher">
                    <button
                      className={`view-btn ${mapMode === "3d" ? "active" : ""}`}
                      onClick={() => setMapMode("3d")}
                    >
                      <Mountain size={13} />
                      <span>3D TWIN</span>
                    </button>
                    <button
                      className={`view-btn ${mapMode === "2d" ? "active" : ""}`}
                      onClick={() => setMapMode("2d")}
                    >
                      <Map size={13} />
                      <span>2D GIS</span>
                    </button>
                  </div>
                </div>

                <div className="map-stage" style={{ height: "560px" }}>
                  {mapMode === "3d" ? (
                    <Tactical3DCommand alerts={alerts} isSimulating={isSimulating} />
                  ) : (
                    <DisasterMap alerts={alerts} focusedTarget={focusedMapTarget} />
                  )}

                  <div className="map-corner map-corner-top">
                    <span>NEPAL / LIVE</span>
                    <span>EVENTS {alerts.length}</span>
                  </div>

                  <div className="map-corner map-corner-bottom">
                    {connected ? "LINK STABLE" : "LINK LOST"}
                  </div>
                </div>

                <div className="map-footer">
                  <MapLegend color="red" label="EARTHQUAKE" />
                  <MapLegend color="blue" label="FLOOD" />
                  <MapLegend color="orange" label="WEATHER" />
                  <span className="map-note">
                    {mapMode === "3d" ? "Orbit and pan 3D Himalayas" : "Click a marker for incident details"}
                  </span>
                </div>
              </div>

              {/* Threat Prediction & Hazard Locator */}
              <section className="command-panel section-threat-block">
                <ThreatPredictionLocator
                  alerts={alerts}
                  onLocateOnMap={handleLocateOnMap}
                  onLocate3D={handleLocate3D}
                  onTriggerSiren={playEmergencySiren}
                />
              </section>
            </div>
          )}

          {/* ========================================================================= */}
          {/* WORKSPACE: UAV / DRONE COMPUTER VISION AI SCANNER                         */}
          {/* ========================================================================= */}
          {activeTab === "drone-vision" && (
            <div className="workspace-pane">
              <section className="command-panel">
                <PanelHeading
                  eyebrow="UAV RECONNAISSANCE & COMPUTER VISION"
                  title="Aerial Search & Rescue AI Scanner"
                  subtitle="Autonomous neural inspection of high-resolution drone & satellite frames for structural collapse, breached arteries, and stranded survivors"
                  icon={Plane}
                  live
                />
                <DroneVisionScanner
                  lang={lang}
                  onDispatchSAR={(det) => {
                    handleTriggerSystemAlarm(
                      "UAV AERIAL SEARCH & RESCUE DISPATCHED",
                      `Tactical drone verified ${det.label} (${det.confidence}% confidence). Priority ${det.triage}. Emergency helicopter dispatched.`
                    );
                  }}
                />
              </section>
            </div>
          )}

          {/* ========================================================================= */}
          {/* WORKSPACE 3: HUMANITARIAN CASUALTY & LIFE SAFETY DASHBOARD                */}
          {/* ========================================================================= */}
          {activeTab === "recovery" && (
            <div className="workspace-pane">
              <section className="command-panel section-recovery-block">
                <PanelHeading
                  eyebrow="NATIONAL LIFE SAFETY REGISTRY"
                  title="Humanitarian Casualty & Recovery Operations"
                  subtitle="Confirmed Fatalities, Rescued Alive, Triage Hospitalization, and Missing Persons Tracing"
                  icon={HeartHandshake}
                  live
                />
                <CasualtyRecoveryDashboard
                  apiUrl={API_URL}
                  isSimulating={isSimulating}
                />
              </section>
            </div>
          )}

          {/* ========================================================================= */}
          {/* WORKSPACE 4: GOVERNMENT OPERATIONS CENTER (NEOC / MoHA)                   */}
          {/* ========================================================================= */}
          {activeTab === "gov-ops" && (
            <div className="workspace-pane">
              <section className="command-panel section-gov-block">
                <PanelHeading
                  eyebrow="MINISTRY OF HOME AFFAIRS · NEOC"
                  title="National Government Operations Suite"
                  subtitle="UN OCHA/NEOC SITREP, Inter-Agency C4ISR Dispatch, and CAP Public Early Warning"
                  icon={FileText}
                />
                <GovernmentOperations
                  apiUrl={API_URL}
                  alerts={alerts}
                  statusData={statusData}
                  onTriggerSiren={playEmergencySiren}
                  operatorToken={operatorToken}
                  onRequireAuth={() => setShowAuthModal(true)}
                  lang={lang}
                />
              </section>
            </div>
          )}

          {/* ========================================================================= */}
          {/* WORKSPACE 5: MULTI-HAZARD DISASTER SIMULATION ENGINE                      */}
          {/* ========================================================================= */}
          {activeTab === "simulation" && (
            <div className="workspace-pane">
              <section className="command-panel section-sim-block">
                <PanelHeading
                  eyebrow="EMERGENCY RESPONSE DRILLS"
                  title="Multi-Hazard Drill Simulation Engine"
                  subtitle="Calibrated M7.8 Mega-Quake, GLOF torrent, and compounded disaster drill injection"
                  icon={Zap}
                />
                <SimulationEngine
                  apiUrl={API_URL}
                  isSimulating={isSimulating}
                  onSimulationStart={(scenario) => {
                    setIsSimulating(true);
                    triggerOutAlarm({
                      id: `SIM-${Date.now()}`,
                      title: scenario?.name || "M7.8 HIGH-CONSEQUENCE EARTHQUAKE DRILL",
                      message:
                        scenario?.description ||
                        "Simulated seismic rupture across Main Himalayan Thrust. Emergency civil defense out-alarm dispatched.",
                      severity: "CRITICAL",
                      type: scenario?.type || "EARTHQUAKE",
                      chance: 97,
                      address:
                        scenario?.address ||
                        "Barpak Epicenter Zone, Barpak-Sulikot Rural Municipality, Gorkha District, Gandaki, Nepal",
                      location: scenario?.location || "Barpak, Gorkha",
                      latitude: scenario?.epicenter?.lat || 28.2096,
                      longitude: scenario?.epicenter?.lon || 84.7538,
                      safeHaven: "District Emergency Operations Center (DEOC) & Open Tundikhel Grounds",
                      impactRadius: "55 km High Shaking Impact Zone",
                    });
                  }}
                  onSimulationReset={() => {
                    setIsSimulating(false);
                  }}
                />
              </section>
            </div>
          )}

          {/* ========================================================================= */}
          {/* WORKSPACE 6: WEATHER & METEOROLOGICAL INTELLIGENCE                        */}
          {/* ========================================================================= */}
          {activeTab === "weather" && (
            <div className="workspace-pane">
              <section className="section-block">
                <PanelHeading
                  eyebrow="METEOROLOGICAL SENSING GRID"
                  title="National Weather & Basin Telemetry"
                  subtitle="Real-time precipitation, temperatures, wind vectors, and river basins across Nepal"
                  icon={ThermometerSun}
                />
                <WeatherDashboard />
              </section>
            </div>
          )}

          {/* ========================================================================= */}
          {/* WORKSPACE 7: DEDICATED LIVE TELEMETRY CONSOLE                             */}
          {/* ========================================================================= */}
          {activeTab === "alerts" && (
            <div className="workspace-pane">
              <section className="command-panel">
                <PanelHeading
                  eyebrow="REAL-TIME TELEMETRY FEED"
                  title="National Live Event Stream"
                  subtitle="Real-time multi-hazard telemetry received via WebSocket"
                  icon={Siren}
                  live
                />

                {/* Filter and search bar */}
                <div className="telemetry-filter-bar">
                  <div className="telemetry-pills">
                    {["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"].map((level) => (
                      <button
                        key={level}
                        className={`telemetry-pill-btn ${telemetryFilter === level ? "active" : ""}`}
                        onClick={() => setTelemetryFilter(level)}
                      >
                        {level} {level === "ALL" ? `(${alerts.length})` : ""}
                      </button>
                    ))}
                  </div>

                  <div className="telemetry-search-box">
                    <Search size={15} />
                    <input
                      value={telemetrySearch}
                      onChange={(e) => setTelemetrySearch(e.target.value)}
                      placeholder="Search alerts by location or keyword..."
                    />
                  </div>
                </div>

                {/* Stream grid */}
                <div className="telemetry-grid">
                  {filteredAlerts.length === 0 ? (
                    <div className="event-empty" style={{ gridColumn: "1 / -1", padding: "40px" }}>
                      <Activity size={32} />
                      <strong>NO EVENTS MATCH FILTER</strong>
                      <span>Adjust severity filter or search terms</span>
                    </div>
                  ) : (
                    filteredAlerts.map((item, index) => {
                      const severity = String(item.severity || "LOW").toUpperCase();
                      const sevClass = severity.toLowerCase();

                      return (
                        <article
                          key={item.id || index}
                          className={`telemetry-full-card severity-${sevClass}`}
                        >
                          <div className="telemetry-card-top">
                            <span className={`telemetry-badge ${sevClass}`}>
                              {item.type || "EVENT"} &middot; {severity}
                            </span>
                            <span className="telemetry-time">
                              {item.timestamp
                                ? new Date(item.timestamp).toLocaleTimeString("en-IN", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    second: "2-digit",
                                  })
                                : "--:--:--"}
                            </span>
                          </div>

                          <h3 className="telemetry-title">
                            {item.title || "Monitoring Event"}
                          </h3>

                          <div className="telemetry-loc">
                            <Map size={13} />
                            <span>{item.location || "Nepal Region"}</span>
                          </div>

                          {item.message && (
                            <p className="telemetry-msg">{item.message}</p>
                          )}

                          <div className="telemetry-actions">
                            <button
                              className="telemetry-map-btn"
                              onClick={() => {
                                if (item.latitude && item.longitude) {
                                  handleLocateOnMap({
                                    lat: item.latitude,
                                    lon: item.longitude,
                                    threatId: item.id,
                                  });
                                } else {
                                  setActiveTab("geospatial");
                                }
                              }}
                            >
                              <Map size={12} />
                              <span>View on Tactical Map</span>
                            </button>
                          </div>
                        </article>
                      );
                    })
                  )}
                </div>
              </section>
            </div>
          )}
        </main>
      </div>

      {/* ========================================================================= */}
      {/* SYSTEM OUT-ALARM HUD MODAL & SCREEN PERIMETER BEACON                      */}
      {/* ========================================================================= */}
      {activeOutAlarm && (
        <>
          <div className="alarm-screen-beacon" />
          <div className="out-alarm-overlay" role="dialog" aria-modal="true">
            <div className="out-alarm-modal">
              <div className="out-alarm-header">
                <div className="out-alarm-badge-cluster">
                  <div className="siren-beacon-icon">
                    <Siren size={24} />
                  </div>
                  <div className="out-alarm-header-text">
                    <strong>CRITICAL HAZARD OUT-ALARM ACTIVE</strong>
                    <span>NEOC // AUTOMATED CIVIL DEFENSE INTERCEPT · SYSTEM BROADCAST</span>
                  </div>
                </div>

                <button
                  className="dossier-close"
                  onClick={dismissOutAlarm}
                  title="Silence and dismiss alarm"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="out-alarm-body">
                <div>
                  <div className="out-alarm-meta-line">
                    <span className="source-dot" style={{ background: "var(--red)" }} />
                    <strong>{activeOutAlarm.type}</strong>
                    <span>//</span>
                    <span style={{ color: "var(--red)", fontWeight: 800 }}>
                      {activeOutAlarm.severity} SEVERITY
                    </span>
                    <span>//</span>
                    <span>{new Date(activeOutAlarm.timestamp).toLocaleTimeString("en-IN")}</span>
                  </div>
                  <h3 className="out-alarm-title">{activeOutAlarm.title}</h3>
                  <p className="dossier-message" style={{ margin: 0 }}>
                    {activeOutAlarm.message}
                  </p>
                </div>

                {/* 1. OCCURRENCE CHANCE DISPLAY */}
                <div className="out-alarm-chance-card">
                  <div className="chance-card-head">
                    <span>HAZARD OCCURRENCE / ESCALATION CHANCE:</span>
                    <span className="chance-percentage">{activeOutAlarm.chance}% PROBABILITY</span>
                  </div>
                  <div className="chance-meter-track">
                    <div
                      className="chance-meter-fill"
                      style={{ width: `${activeOutAlarm.chance}%` }}
                    />
                  </div>
                </div>

                {/* 2. IMMEDIATE TARGET ADDRESS & LOCATION DOSSIER */}
                <div className="out-alarm-address-box">
                  <div className="address-box-label">
                    <MapPin size={14} />
                    <span>TARGET INCIDENT ADDRESS & JURISDICTION</span>
                  </div>

                  <div className="primary-address-text">
                    {activeOutAlarm.address}
                  </div>

                  <div className="address-coord-grid">
                    <div className="coord-item">
                      <span>EXACT GPS COORDINATES</span>
                      <strong>
                        {Number(activeOutAlarm.latitude).toFixed(4)}° N, {Number(activeOutAlarm.longitude).toFixed(4)}° E
                      </strong>
                    </div>
                    <div className="coord-item">
                      <span>AFFECTED PERIMETER</span>
                      <strong>{activeOutAlarm.impactRadius}</strong>
                    </div>
                  </div>

                  <div className="safe-haven-row">
                    <Shield size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <strong>RECOMMENDED SAFE HAVEN / EVACUATION POINT:</strong>
                      <div>{activeOutAlarm.safeHaven}</div>
                    </div>
                  </div>
                </div>

                {/* 3. OUTWARD EMERGENCY MESSAGE DISPATCH STATION */}
                <div className="out-alarm-dispatch-box">
                  <div className="dispatch-box-header">
                    <div className="dispatch-header-title">
                      <Smartphone size={14} />
                      <span>OUTWARD DISPATCH // SPARROW SMS, TELEGRAM & WEBHOOKS</span>
                    </div>
                    <span className="dispatch-live-tag">LIVE GATEWAY</span>
                  </div>

                  <div className="dispatch-form-row">
                    <div className="dispatch-input-group">
                      <span className="phone-prefix">+977</span>
                      <input
                        type="text"
                        className="dispatch-phone-input"
                        value={dispatchPhone}
                        onChange={(e) => setDispatchPhone(e.target.value)}
                        placeholder="e.g. 9812345678"
                        title="Recipient Mobile Phone for SMS Broadcast"
                      />
                    </div>

                    <button
                      className="alarm-btn dispatch-action-btn"
                      onClick={handleDispatchOutAlarm}
                      disabled={isDispatching}
                    >
                      <Send size={13} />
                      <span>{isDispatching ? "DISPATCHING..." : "DISPATCH SMS ALERT"}</span>
                    </button>
                  </div>

                  {dispatchStatus && (
                    <div className={`dispatch-status-banner ${dispatchStatus.type}`}>
                      <CheckCircle2 size={14} />
                      <div>
                        <strong>{dispatchStatus.message}</strong>
                        {dispatchStatus.sms && (
                          <p className="dispatch-sms-preview">{dispatchStatus.sms}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="out-alarm-actions">
                <button
                  className="alarm-btn secondary"
                  onClick={dismissOutAlarm}
                >
                  <VolumeX size={15} />
                  <span>ACKNOWLEDGE & SILENCE</span>
                </button>

                <button
                  className="alarm-btn primary"
                  onClick={() => {
                    handleLocateOnMap({
                      lat: activeOutAlarm.latitude,
                      lon: activeOutAlarm.longitude,
                      threatId: activeOutAlarm.id,
                    });
                    dismissOutAlarm();
                  }}
                >
                  <Map size={15} />
                  <span>LOCATE ON TACTICAL MAP</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* OPERATOR CLEARANCE AUTHENTICATION MODAL                                   */}
      {/* ========================================================================= */}
      {showAuthModal && (
        <div className="out-alarm-overlay" role="dialog" aria-modal="true">
          <div className="out-alarm-modal auth-modal-box">
            <div
              className="out-alarm-header"
              style={{
                background:
                  "linear-gradient(90deg, rgba(53, 217, 229, 0.2), rgba(53, 217, 229, 0.05))",
                borderBottomColor: "var(--cyan)",
              }}
            >
              <div className="out-alarm-badge-cluster">
                <div
                  className="siren-beacon-icon"
                  style={{
                    background: "rgba(53, 217, 229, 0.2)",
                    borderColor: "var(--cyan)",
                    color: "var(--cyan)",
                    animation: "none",
                  }}
                >
                  <Key size={22} />
                </div>
                <div className="out-alarm-header-text">
                  <strong style={{ color: "var(--cyan)" }}>
                    CIVIL DEFENSE OPERATOR CLEARANCE
                  </strong>
                  <span>NEOC / MOHA SECURITY GATEWAY // AUTHENTICATION REQUIRED</span>
                </div>
              </div>

              <button
                className="dossier-close"
                onClick={() => {
                  setShowAuthModal(false);
                  setAuthError("");
                }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAuthenticateOperator} className="out-alarm-body">
              <p
                style={{
                  margin: 0,
                  fontSize: "13px",
                  color: "var(--soft)",
                  lineHeight: 1.5,
                }}
              >
                National emergency broadcast, outward SMS dispatch, and drill
                injection are restricted to authenticated civil defense operators.
              </p>

              <div className="auth-input-group">
                <label
                  style={{
                    display: "block",
                    fontSize: "11px",
                    fontWeight: 800,
                    color: "var(--cyan)",
                    letterSpacing: "0.08em",
                    marginBottom: "6px",
                  }}
                >
                  ENTER OPERATOR PASSKEY / ADMIN KEY:
                </label>
                <div style={{ display: "flex", gap: "10px" }}>
                  <input
                    type="password"
                    autoFocus
                    className="dispatch-phone-input"
                    style={{
                      background: "var(--panel-2)",
                      border: "1px solid var(--border-strong)",
                      borderRadius: "8px",
                      padding: "10px 14px",
                    }}
                    placeholder="Enter security passkey (default: rakshak-admin-2026)"
                    value={authKeyInput}
                    onChange={(e) => setAuthKeyInput(e.target.value)}
                  />
                  <button
                    type="submit"
                    className="alarm-btn primary"
                    disabled={authLoading}
                    style={{ whiteSpace: "nowrap" }}
                  >
                    <Unlock size={14} />
                    <span>{authLoading ? "VERIFYING..." : "UNLOCK ACCESS"}</span>
                  </button>
                </div>
              </div>

              {authError && (
                <div className="dispatch-status-banner error">
                  <AlertTriangle size={15} />
                  <span>{authError}</span>
                </div>
              )}

              <div
                style={{
                  padding: "10px 12px",
                  borderRadius: "8px",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid var(--border)",
                  fontSize: "11.5px",
                  color: "var(--muted)",
                }}
              >
                💡 Default development passkey:{" "}
                <code style={{ color: "var(--cyan)", fontWeight: 700 }}>
                  rakshak-admin-2026
                </code>{" "}
                (Configurable via <code style={{ color: "var(--cyan)" }}>ADMIN_API_KEY</code> in{" "}
                <code style={{ color: "var(--cyan)" }}>.env</code>).
              </div>
            </form>
          </div>
        </div>
      )}

      <footer className="command-footer">
        <span>RAKSHAK AI // NATIONAL DISASTER INTELLIGENCE</span>
        <span>
          SYSTEM {connected ? "ONLINE" : "OFFLINE"} · NODE NP-01
        </span>
        <span>DEVELOPMENT BUILD</span>
      </footer>
    </div>
  );
}

function SourceBadge({ name, status, healthy = false }) {
  return (
    <div className="source-row">
      <span>
        <i className={healthy ? "source-dot healthy" : "source-dot"} />
        {name}
      </span>
      <small>{status}</small>
    </div>
  );
}

function PulseCard({ icon: Icon, label, value, hint, accent }) {
  return (
    <div className={`pulse-card accent-${accent}`}>
      <div className="pulse-icon">
        <Icon size={18} />
      </div>
      <div className="pulse-copy">
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{hint}</small>
      </div>
    </div>
  );
}

function PanelHeading({
  eyebrow,
  title,
  subtitle,
  icon: Icon,
  live = false,
}) {
  return (
    <div className="panel-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h2>
          {Icon && <Icon size={17} />}
          {title}
        </h2>
        <p>{subtitle}</p>
      </div>

      {live && (
        <span className="panel-live">
          <i />
          LIVE
        </span>
      )}
    </div>
  );
}

function MapLegend({ color, label }) {
  return (
    <span className="map-legend-item">
      <i className={`legend-dot ${color}`} />
      {label}
    </span>
  );
}

function HealthRow({ name, detail, status, type }) {
  return (
    <div className="health-row">
      <div>
        <i className={`health-dot ${type}`} />
        <strong>{name}</strong>
      </div>
      <span>{detail}</span>
      <b className={type}>{status}</b>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="metric-box">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default App;
