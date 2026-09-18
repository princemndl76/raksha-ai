import { useState, useEffect, useMemo } from "react";
import {
  HeartHandshake,
  Activity,
  Users,
  Search,
  PlusCircle,
  Building2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Shield,
  MapPin,
  RefreshCw,
  Phone,
  HelpCircle,
  UserCheck,
  Stethoscope,
  Flame,
  Waves,
  Package,
  ArrowUpRight,
  Filter,
} from "lucide-react";

export default function CasualtyRecoveryDashboard({ apiUrl, isSimulating = false }) {
  const [activeTab, setActiveTab] = useState("overview"); // 'overview' | 'missing' | 'hospitals' | 'relief'
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Missing Persons Filter & Form state
  const [missingSearch, setMissingSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [showReportForm, setShowReportForm] = useState(false);
  const [newReport, setNewReport] = useState({
    full_name: "",
    age: "",
    gender: "Male",
    last_seen_district: "Gorkha",
    last_seen_location: "",
    reported_by: "",
    contact_number: "",
    notes: "",
  });
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [districtSearch, setDistrictSearch] = useState("");

  const fetchData = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/casualty-recovery`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      console.warn("Casualty API fetch error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [apiUrl, isSimulating]);

  // Handle Missing Person Registration
  const handleSubmitReport = async (e) => {
    e.preventDefault();
    if (!newReport.full_name.trim()) return;

    try {
      const res = await fetch(`${apiUrl}/api/missing-persons/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newReport),
      });
      if (res.ok) {
        setSubmitSuccess(true);
        setTimeout(() => setSubmitSuccess(false), 4000);
        setShowReportForm(false);
        setNewReport({
          full_name: "",
          age: "",
          gender: "Male",
          last_seen_district: "Gorkha",
          last_seen_location: "",
          reported_by: "",
          contact_number: "",
          notes: "",
        });
        fetchData();
      }
    } catch (err) {
      console.error("Failed to submit report:", err);
    }
  };

  // Handle Status Update (e.g. mark found/rescued)
  const handleUpdateStatus = async (id, newStatus) => {
    try {
      const res = await fetch(`${apiUrl}/api/missing-persons/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  // Filter Missing Persons List
  const filteredMissing = useMemo(() => {
    const list = data?.missing_persons || [];
    return list.filter((p) => {
      const matchesSearch =
        p.full_name?.toLowerCase().includes(missingSearch.toLowerCase()) ||
        p.last_seen_district?.toLowerCase().includes(missingSearch.toLowerCase()) ||
        p.last_seen_location?.toLowerCase().includes(missingSearch.toLowerCase());
      const matchesStatus = statusFilter === "ALL" || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [data, missingSearch, statusFilter]);

  // Filter District Records
  const filteredDistricts = useMemo(() => {
    const list = data?.district_records || [];
    return list.filter((d) =>
      d.district?.toLowerCase().includes(districtSearch.toLowerCase()) ||
      d.province?.toLowerCase().includes(districtSearch.toLowerCase())
    );
  }, [data, districtSearch]);

  const summary = data?.life_safety_summary || {
    rescued_alive: 142,
    deceased: 18,
    hospitalized_critical: 34,
    hospitalized_stable: 86,
    total_hospitalized: 120,
    displaced_sheltered: 1840,
    missing_persons: 27,
    survival_rescue_rate_pct: 88.7,
  };

  return (
    <div className="casualty-dashboard-shell">
      {/* Top Banner & Sub-Tabs */}
      <div className="casualty-header-banner">
        <div className="casualty-title-area">
          <div className="eyebrow text-cyan">
            // HUMANITARIAN OPERATIONS & LIFE SAFETY
          </div>
          <h3>Casualty, Rescue & Recovery Intelligence</h3>
          <p>
            Real-time inter-agency casualty registration, search-and-rescue recovery tallies,
            referral trauma hospital occupancy, and missing persons tracing across Nepal.
          </p>
        </div>

        {data?.is_drill_active && (
          <div className="drill-banner-badge">
            <span className="live-dot" />
            <span>DRILL TELEMETRY SCALED: {data.active_drill}</span>
          </div>
        )}

        <div className="casualty-tabs-list">
          <button
            className={`casualty-tab-btn ${activeTab === "overview" ? "active" : ""}`}
            onClick={() => setActiveTab("overview")}
          >
            <Activity size={14} />
            <span>OVERVIEW & DISTRICTS</span>
          </button>
          <button
            className={`casualty-tab-btn ${activeTab === "missing" ? "active" : ""}`}
            onClick={() => setActiveTab("missing")}
          >
            <UserCheck size={14} />
            <span>MISSING PERSONS TRACING ({data?.missing_persons?.length || 0})</span>
          </button>
          <button
            className={`casualty-tab-btn ${activeTab === "hospitals" ? "active" : ""}`}
            onClick={() => setActiveTab("hospitals")}
          >
            <Stethoscope size={14} />
            <span>HOSPITAL TRAUMA CAPACITY</span>
          </button>
          <button
            className={`casualty-tab-btn ${activeTab === "relief" ? "active" : ""}`}
            onClick={() => setActiveTab("relief")}
          >
            <Package size={14} />
            <span>RELIEF LOGISTICS</span>
          </button>
        </div>
      </div>

      {/* Hero Life Safety KPI Grid */}
      <div className="casualty-kpi-grid">
        {/* Rescued Alive */}
        <div className="casualty-kpi-card accent-green">
          <div className="kpi-icon-wrap">
            <HeartHandshake size={20} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">RESCUED & RECOVERED ALIVE</span>
            <strong className="kpi-value text-green">
              {summary.rescued_alive?.toLocaleString()}
            </strong>
            <div className="kpi-subtext">
              <span>Extracted by SAR squads</span>
              <b className="survival-rate-badge">{summary.survival_rescue_rate_pct}% Survival Ratio</b>
            </div>
          </div>
        </div>

        {/* Confirmed Deceased */}
        <div className="casualty-kpi-card accent-red">
          <div className="kpi-icon-wrap">
            <AlertCircle size={20} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">CONFIRMED FATALITIES</span>
            <strong className="kpi-value text-red">
              {summary.deceased?.toLocaleString()}
            </strong>
            <div className="kpi-subtext">
              <span>Verified death registry</span>
              <small>Structural / Landslide / Flood</small>
            </div>
          </div>
        </div>

        {/* Hospitalized / Critical */}
        <div className="casualty-kpi-card accent-amber">
          <div className="kpi-icon-wrap">
            <Stethoscope size={20} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">INJURED / HOSPITALIZED</span>
            <strong className="kpi-value text-amber">
              {summary.total_hospitalized?.toLocaleString()}
            </strong>
            <div className="kpi-subtext">
              <span>{summary.hospitalized_critical} Critical (ICU)</span>
              <small>{summary.hospitalized_stable} Stable Trauma</small>
            </div>
          </div>
        </div>

        {/* Displaced in Shelters */}
        <div className="casualty-kpi-card accent-blue">
          <div className="kpi-icon-wrap">
            <Building2 size={20} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">DISPLACED POPULATION</span>
            <strong className="kpi-value text-blue">
              {summary.displaced_sheltered?.toLocaleString()}
            </strong>
            <div className="kpi-subtext">
              <span>In designated relief camps</span>
              <small>14 Managed Shelters</small>
            </div>
          </div>
        </div>

        {/* Reported Missing */}
        <div className="casualty-kpi-card accent-purple">
          <div className="kpi-icon-wrap">
            <Users size={20} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">MISSING PERSONS REGISTRY</span>
            <strong className="kpi-value text-purple">
              {summary.missing_persons?.toLocaleString()}
            </strong>
            <div className="kpi-subtext">
              <span>Active search grid</span>
              <small>FLTR Family Links active</small>
            </div>
          </div>
        </div>
      </div>

      {/* Recovery Survival Gauge Bar */}
      <div className="survival-bar-card">
        <div className="survival-bar-labels">
          <span>
            <b>RESCUE EXTRACTION SUCCESS:</b> {summary.rescued_alive} Alive vs {summary.deceased} Deceased
          </span>
          <strong className="text-cyan">{summary.survival_rescue_rate_pct}% Survived Rescue</strong>
        </div>
        <div className="survival-bar-track">
          <div
            className="survival-bar-fill green-fill"
            style={{ width: `${summary.survival_rescue_rate_pct}%` }}
            title={`${summary.rescued_alive} Rescued Alive`}
          />
          <div
            className="survival-bar-fill red-fill"
            style={{ width: `${100 - summary.survival_rescue_rate_pct}%` }}
            title={`${summary.deceased} Deceased`}
          />
        </div>
      </div>

      {/* =================================================================== */}
      {/* TAB 1: OVERVIEW & DISTRICTS */}
      {/* =================================================================== */}
      {activeTab === "overview" && (
        <div className="casualty-tab-content">
          {/* Extraction Agency Breakdown Cards */}
          <div className="extraction-agencies-grid">
            <div className="overview-mini-card">
              <h4>SEARCH & RESCUE AGENCIES DEPLOYED</h4>
              <div className="agency-stats-list">
                {Object.entries(data?.rescue_agencies || {}).map(([key, item]) => (
                  <div key={key} className="agency-stat-row">
                    <div>
                      <strong>{item.label}</strong>
                    </div>
                    <b className="text-green">+{item.rescued} Rescued</b>
                  </div>
                ))}
              </div>
            </div>

            <div className="overview-mini-card">
              <h4>CAUSE OF FATALITIES BREAKDOWN</h4>
              <div className="cause-stats-list">
                {Object.entries(data?.fatality_causes || {}).map(([key, item]) => (
                  <div key={key} className="cause-stat-row">
                    <div className="cause-info">
                      <span>{item.label}</span>
                      <small>{item.pct}% of total</small>
                    </div>
                    <div className="cause-bar-wrap">
                      <div className="cause-bar-fill" style={{ width: `${item.pct}%` }} />
                    </div>
                    <strong className="text-red">{item.count}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* District Casualty Table */}
          <div className="district-casualty-card">
            <div className="district-card-head">
              <div>
                <h4>PROVINCIAL & DISTRICT CASUALTY TELEMETRY</h4>
                <small>Official human impact records by administrative jurisdiction</small>
              </div>

              <div className="district-search-wrap">
                <Search size={14} className="search-icon" />
                <input
                  type="text"
                  placeholder="Filter district or province..."
                  value={districtSearch}
                  onChange={(e) => setDistrictSearch(e.target.value)}
                  className="district-search-input"
                />
              </div>
            </div>

            <div className="table-responsive">
              <table className="casualty-table">
                <thead>
                  <tr>
                    <th>DISTRICT / SECTOR</th>
                    <th>PROVINCE</th>
                    <th className="text-red">DECEASED</th>
                    <th className="text-green">RESCUED ALIVE</th>
                    <th className="text-amber">HOSPITALIZED</th>
                    <th className="text-blue">DISPLACED</th>
                    <th className="text-purple">MISSING</th>
                    <th>PRIMARY HAZARD</th>
                    <th>CAMP STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDistricts.map((row, idx) => (
                    <tr key={idx}>
                      <td>
                        <strong>{row.district}</strong>
                      </td>
                      <td>
                        <span className="province-tag">{row.province}</span>
                      </td>
                      <td className="text-red font-mono">
                        <b>{row.deceased}</b>
                      </td>
                      <td className="text-green font-mono">
                        <b>{row.rescued_alive}</b>
                      </td>
                      <td className="text-amber font-mono">{row.hospitalized}</td>
                      <td className="text-blue font-mono">{row.displaced}</td>
                      <td className="text-purple font-mono">
                        <b>{row.missing}</b>
                      </td>
                      <td>
                        <span className="hazard-indicator">{row.primary_hazard}</span>
                      </td>
                      <td>
                        <small className="shelter-status">{row.relief_camp_status}</small>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 2: MISSING PERSONS & TRACING REGISTRY */}
      {/* =================================================================== */}
      {activeTab === "missing" && (
        <div className="casualty-tab-content">
          <div className="missing-toolbar">
            <div className="missing-search-box">
              <Search size={15} />
              <input
                type="text"
                placeholder="Search missing person by name, district, or last seen spot..."
                value={missingSearch}
                onChange={(e) => setMissingSearch(e.target.value)}
              />
            </div>

            <div className="missing-filter-pills">
              {["ALL", "UNDER_SEARCH", "RESCUED_ALIVE", "HOSPITALIZED", "REUNITED"].map(
                (status) => (
                  <button
                    key={status}
                    className={`filter-pill ${statusFilter === status ? "active" : ""}`}
                    onClick={() => setStatusFilter(status)}
                  >
                    {status.replace("_", " ")}
                  </button>
                )
              )}
            </div>

            <button
              onClick={() => setShowReportForm(!showReportForm)}
              className="tactical-btn primary-btn"
            >
              <PlusCircle size={14} />
              <span>{showReportForm ? "CLOSE FORM" : "REPORT MISSING PERSON"}</span>
            </button>
          </div>

          {/* New Missing Person Intake Form */}
          {showReportForm && (
            <form onSubmit={handleSubmitReport} className="missing-report-form">
              <h4>OFFICIAL MISSING PERSON REGISTRATION INTAKE</h4>
              <div className="form-grid-3">
                <div className="form-group">
                  <label>Full Name *</label>
                  <input
                    required
                    value={newReport.full_name}
                    onChange={(e) => setNewReport({ ...newReport, full_name: e.target.value })}
                    placeholder="e.g. Bibek Gurung"
                  />
                </div>
                <div className="form-group">
                  <label>Age</label>
                  <input
                    type="number"
                    value={newReport.age}
                    onChange={(e) => setNewReport({ ...newReport, age: e.target.value })}
                    placeholder="e.g. 28"
                  />
                </div>
                <div className="form-group">
                  <label>Gender</label>
                  <select
                    value={newReport.gender}
                    onChange={(e) => setNewReport({ ...newReport, gender: e.target.value })}
                  >
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other / Unspecified</option>
                  </select>
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label>Last Seen District *</label>
                  <input
                    required
                    value={newReport.last_seen_district}
                    onChange={(e) =>
                      setNewReport({ ...newReport, last_seen_district: e.target.value })
                    }
                    placeholder="e.g. Gorkha, Sindhupalchok, Kathmandu"
                  />
                </div>
                <div className="form-group">
                  <label>Last Seen Specific Location</label>
                  <input
                    value={newReport.last_seen_location}
                    onChange={(e) =>
                      setNewReport({ ...newReport, last_seen_location: e.target.value })
                    }
                    placeholder="e.g. Near suspension bridge or market"
                  />
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label>Reported By (Family / Relative)</label>
                  <input
                    value={newReport.reported_by}
                    onChange={(e) => setNewReport({ ...newReport, reported_by: e.target.value })}
                    placeholder="e.g. Maya Gurung (Sister)"
                  />
                </div>
                <div className="form-group">
                  <label>Contact Phone Number</label>
                  <input
                    value={newReport.contact_number}
                    onChange={(e) =>
                      setNewReport({ ...newReport, contact_number: e.target.value })
                    }
                    placeholder="+977-98XXXXXXXX"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Emergency Notes / Physical Identifiers</label>
                <textarea
                  rows={2}
                  value={newReport.notes}
                  onChange={(e) => setNewReport({ ...newReport, notes: e.target.value })}
                  placeholder="Clothing worn, physical markers, known conditions..."
                />
              </div>

              <div className="form-submit-row">
                <button type="submit" className="tactical-btn primary-btn">
                  REGISTER IN NATIONAL MISSING REGISTRY
                </button>
              </div>
            </form>
          )}

          {submitSuccess && (
            <div className="missing-success-alert">
              <CheckCircle2 size={16} />
              <span>Person registered in national FLTR missing persons database successfully.</span>
            </div>
          )}

          {/* Missing Persons Cards Grid */}
          <div className="missing-cards-grid">
            {filteredMissing.length === 0 ? (
              <div className="missing-empty-box">
                <Users size={28} />
                <strong>NO RECORDS MATCH SEARCH</strong>
                <span>Try another keyword or filter</span>
              </div>
            ) : (
              filteredMissing.map((person) => (
                <div key={person.id} className="person-card">
                  <div className="person-card-head">
                    <div>
                      <span className="person-id">{person.id}</span>
                      <h4>{person.full_name}</h4>
                      <small>
                        {person.age ? `${person.age} yrs` : "Age --"} &middot; {person.gender}
                      </small>
                    </div>

                    <span
                      className={`status-pill status-${person.status.toLowerCase().replace("_", "-")}`}
                    >
                      {person.status.replace("_", " ")}
                    </span>
                  </div>

                  <div className="person-card-body">
                    <div className="person-meta-row">
                      <MapPin size={13} className="text-cyan" />
                      <span>
                        <b>{person.last_seen_district}</b> &middot; {person.last_seen_location}
                      </span>
                    </div>

                    <div className="person-meta-row">
                      <Phone size={13} className="text-muted" />
                      <span>
                        Reported by: <b>{person.reported_by}</b> ({person.contact_number})
                      </span>
                    </div>

                    {person.notes && <p className="person-notes">{person.notes}</p>}
                  </div>

                  <div className="person-card-actions">
                    <small>STATUS CONTROLS:</small>
                    <div className="action-buttons">
                      {person.status !== "RESCUED_ALIVE" && (
                        <button
                          onClick={() => handleUpdateStatus(person.id, "RESCUED_ALIVE")}
                          className="status-action-btn green"
                        >
                          Mark Rescued Alive
                        </button>
                      )}
                      {person.status !== "REUNITED" && (
                        <button
                          onClick={() => handleUpdateStatus(person.id, "REUNITED")}
                          className="status-action-btn blue"
                        >
                          Mark Reunited
                        </button>
                      )}
                      {person.status !== "HOSPITALIZED" && (
                        <button
                          onClick={() => handleUpdateStatus(person.id, "HOSPITALIZED")}
                          className="status-action-btn amber"
                        >
                          Mark Hospitalized
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 3: HOSPITAL TRAUMA CAPACITY MATRIX */}
      {/* =================================================================== */}
      {activeTab === "hospitals" && (
        <div className="casualty-tab-content">
          <div className="hospitals-intro-banner">
            <div>
              <h4>National Emergency Referral Trauma Centers</h4>
              <p>
                Live monitoring of critical trauma bed occupancy, free ICU ventilators, and blood
                reserves to coordinate helicopter medical evacuation (MEDEVAC) sorties.
              </p>
            </div>
            <div className="ems-status-tag">STATUS: SURGE ACTIVE</div>
          </div>

          <div className="hospitals-grid">
            {(data?.hospital_capacity || []).map((hosp) => {
              const occupancyPct = Math.round((hosp.occupied_beds / hosp.total_beds) * 100);
              return (
                <div key={hosp.id} className="hospital-card">
                  <div className="hosp-card-head">
                    <div>
                      <h5>{hosp.name}</h5>
                      <span className="hosp-location">{hosp.location}</span>
                    </div>
                    <span className={`hosp-status-badge ${hosp.trauma_status.toLowerCase()}`}>
                      {hosp.trauma_status.replace("_", " ")}
                    </span>
                  </div>

                  {/* Bed Occupancy Progress Bar */}
                  <div className="hosp-occupancy-section">
                    <div className="hosp-stat-label">
                      <span>GENERAL TRAUMA BEDS OCCUPIED</span>
                      <strong>
                        {hosp.occupied_beds} / {hosp.total_beds} ({occupancyPct}%)
                      </strong>
                    </div>
                    <div className="hosp-bar-track">
                      <div
                        className={`hosp-bar-fill ${
                          occupancyPct > 85 ? "red" : occupancyPct > 70 ? "amber" : "green"
                        }`}
                        style={{ width: `${occupancyPct}%` }}
                      />
                    </div>
                  </div>

                  {/* ICU & Ventilator Stats */}
                  <div className="hosp-metrics-grid">
                    <div className="hosp-metric-item">
                      <small>FREE ICU BEDS</small>
                      <strong className="text-cyan">
                        {hosp.icu_available} <small>/ {hosp.icu_total}</small>
                      </strong>
                    </div>
                    <div className="hosp-metric-item">
                      <small>FREE VENTILATORS</small>
                      <strong className="text-green">{hosp.ventilators_free}</strong>
                    </div>
                  </div>

                  <div className="hosp-blood-row">
                    <span>BLOOD RESERVE:</span>
                    <strong>{hosp.blood_reserve}</strong>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 4: RELIEF LOGISTICS & AID */}
      {/* =================================================================== */}
      {activeTab === "relief" && (
        <div className="casualty-tab-content">
          <div className="relief-kpi-grid">
            <div className="relief-stat-card">
              <small>FOOD RATIONS DISPATCHED</small>
              <strong>{data?.relief_distribution?.food_rations_dispatched_tons || 42.5} Tons</strong>
              <span>Gorkha, Sindhupalchok, Dolakha</span>
            </div>

            <div className="relief-stat-card">
              <small>CLEAN DRINKING WATER</small>
              <strong>{(data?.relief_distribution?.drinking_water_liters || 125000).toLocaleString()} Liters</strong>
              <span>Tankers & high-altitude drops</span>
            </div>

            <div className="relief-stat-card">
              <small>PURIFICATION TABLETS ISSUED</small>
              <strong>{(data?.relief_distribution?.water_purification_tablets || 85000).toLocaleString()}</strong>
              <span>Epidemic prevention protocol</span>
            </div>

            <div className="relief-stat-card">
              <small>EMERGENCY TENTS ERECTED</small>
              <strong>{(data?.relief_distribution?.emergency_shelter_tents || 1650).toLocaleString()} Units</strong>
              <span>NRCS & Nepal Army staging</span>
            </div>

            <div className="relief-stat-card">
              <small>THERMAL BLANKETS ISSUED</small>
              <strong>{(data?.relief_distribution?.thermal_blankets_distributed || 4800).toLocaleString()}</strong>
              <span>Cold exposure protection</span>
            </div>

            <div className="relief-stat-card">
              <small>MANAGED RELIEF CAMPS</small>
              <strong>{data?.relief_distribution?.active_relief_camps || 14} Active Camps</strong>
              <span>Equipped with mobile medics</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
