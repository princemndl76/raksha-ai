import React, { useState, useEffect, useRef } from 'react';

// Curated high-fidelity disaster aerial reconnaissance frames
const PRESET_FRAMES = [
  {
    id: "sindhupalchok_debris",
    title: "Sindhupalchok Mountain Sector - Heavy Masonry Collapse",
    altitude: "145m AGL",
    coords: "27.9512° N, 85.8320° E",
    sensor: "RGB 4K + FLIR LWIR",
    imageUrl: "https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=1200&q=80",
    detections: [
      { id: "OBJ-01", label: "Structural Collapse (Level 4)", category: "collapse", confidence: 96.4, x: 22, y: 35, w: 26, h: 28, triage: "CRITICAL", notes: "Masonry failure with potential void spaces under reinforced slabs" },
      { id: "OBJ-02", label: "Blocked Access Artery", category: "access", confidence: 91.8, x: 55, y: 62, w: 32, h: 18, triage: "HIGH", notes: "Boulder and mud aggregate severed vehicular evacuation route" },
      { id: "OBJ-03", label: "Survivor Distress Heat Signal", category: "survivor", confidence: 97.2, x: 38, y: 28, w: 14, h: 16, triage: "PRIORITY RESCUE", notes: "2-3 body thermal signatures confirmed by FLIR sensor" }
    ]
  },
  {
    id: "kathmandu_flooding",
    title: "Bagmati River Corridor - Urban Inundation",
    altitude: "95m AGL",
    coords: "27.6890° N, 85.3180° E",
    sensor: "Multispectral Hydrology Band",
    imageUrl: "https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?auto=format&fit=crop&w=1200&q=80",
    detections: [
      { id: "OBJ-04", label: "Submerged Vehicular Bridge", category: "access", confidence: 94.7, x: 40, y: 48, w: 35, h: 22, triage: "CRITICAL", notes: "Water level 1.8m above guardrail; current velocity 4.2 m/s" },
      { id: "OBJ-05", label: "Stranded Civilian Group (Rooftop)", category: "survivor", confidence: 98.9, x: 18, y: 22, w: 20, h: 24, triage: "AIRLIFT REQUIRED", notes: "5 individuals signaling with high-visibility fabric on concrete terrace" }
    ]
  },
  {
    id: "gorkha_seismic",
    title: "Gorkha Ridge Line - Escarpment Fracture",
    altitude: "180m AGL",
    coords: "28.0050° N, 84.6200° E",
    sensor: "LiDAR Point Cloud + Optical",
    imageUrl: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80",
    detections: [
      { id: "OBJ-06", label: "Active Escarpment Tension Crack", category: "collapse", confidence: 93.1, x: 48, y: 15, w: 38, h: 32, triage: "HIGH HAZARD", notes: "Crown shear crack 240m long; immediate secondary slip probability 82%" },
      { id: "OBJ-07", label: "Isolated Cattle & Field Shelter", category: "survivor", confidence: 88.5, x: 25, y: 65, w: 18, h: 20, triage: "MONITOR", notes: "Secondary agricultural outpost; ground pathway precarious" }
    ]
  }
];

export default function DroneVisionScanner({ lang = 'en', onDispatchSAR }) {
  const [selectedFrame, setSelectedFrame] = useState(PRESET_FRAMES[0]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanCompleted, setScanCompleted] = useState(false);
  const [customImage, setCustomImage] = useState(null);
  const [activeDetections, setActiveDetections] = useState(PRESET_FRAMES[0].detections);
  const [selectedDetection, setSelectedDetection] = useState(null);
  const [sarDispatched, setSarDispatched] = useState(false);
  const fileInputRef = useRef(null);

  // Switch frame
  const handleSelectPreset = (frame) => {
    setSelectedFrame(frame);
    setCustomImage(null);
    setActiveDetections(frame.detections);
    setSelectedDetection(null);
    setScanCompleted(false);
    setSarDispatched(false);
  };

  // Custom photo upload
  const handleCustomUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCustomImage(event.target.result);
        setSelectedFrame({
          id: "custom_uav",
          title: `Custom Aerial Reconnaissance: ${file.name}`,
          altitude: "110m AGL (Telemetry Extrapolated)",
          coords: "27.7000° N, 85.3300° E (Field GPS)",
          sensor: "Optical 12MP Field Sensor",
          imageUrl: event.target.result,
          detections: [
            { id: "C-01", label: "Anomalous Structural Fracture", category: "collapse", confidence: 92.4, x: 28, y: 32, w: 30, h: 30, triage: "CRITICAL", notes: "Severe shear cracks observed on load-bearing facade" },
            { id: "C-02", label: "Potential Civilian Congregation", category: "survivor", confidence: 89.6, x: 62, y: 45, w: 22, h: 22, triage: "PRIORITY SEARCH", notes: "Distinct optical cluster in courtyard clearing" }
          ]
        });
        setActiveDetections([
          { id: "C-01", label: "Anomalous Structural Fracture", category: "collapse", confidence: 92.4, x: 28, y: 32, w: 30, h: 30, triage: "CRITICAL", notes: "Severe shear cracks observed on load-bearing facade" },
          { id: "C-02", label: "Potential Civilian Congregation", category: "survivor", confidence: 89.6, x: 62, y: 45, w: 22, h: 22, triage: "PRIORITY SEARCH", notes: "Distinct optical cluster in courtyard clearing" }
        ]);
        setScanCompleted(false);
        setSarDispatched(false);
      };
      reader.readAsDataURL(file);
    }
  };

  // Run holographic scan simulation
  const handleRunScan = () => {
    setIsScanning(true);
    setScanProgress(0);
    setScanCompleted(false);
    setSelectedDetection(null);

    const interval = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsScanning(false);
          setScanCompleted(true);
          return 100;
        }
        return prev + 10;
      });
    }, 180);
  };

  const handleDispatch = (detection) => {
    setSarDispatched(true);
    if (onDispatchSAR) {
      onDispatchSAR(detection || activeDetections[0]);
    }
    setTimeout(() => setSarDispatched(false), 4000);
  };

  return (
    <div className="drone-vision-container">
      {/* Top Telemetry Header */}
      <div className="drone-header">
        <div className="drone-header-left">
          <div className="drone-badge-status">
            <span className="drone-pulse-dot"></span>
            <strong>UAV RECONNAISSANCE SQUADRON (RAKSHA-DRONE-01)</strong>
          </div>
          <div className="drone-telemetry-strip">
            <span><strong>ALTITUDE:</strong> {selectedFrame.altitude}</span>
            <span><strong>GPS RTK:</strong> {selectedFrame.coords}</span>
            <span><strong>OPTICS:</strong> {selectedFrame.sensor}</span>
            <span><strong>BATTERY:</strong> 82% [34 MIN ENDURANCE]</span>
          </div>
        </div>

        <div className="drone-header-actions">
          <button 
            className="drone-btn drone-btn-upload"
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
          >
            📷 UPLOAD FIELD DRONE RECON
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            style={{ display: 'none' }} 
            accept="image/*"
            onChange={handleCustomUpload} 
          />

          <button 
            className={`drone-btn drone-btn-scan ${isScanning ? 'scanning' : ''}`}
            onClick={handleRunScan}
            disabled={isScanning}
          >
            {isScanning ? `SCANNING TENSORS (${scanProgress}%)` : '⚡ RUN COMPUTER VISION AI SCAN'}
          </button>
        </div>
      </div>

      {/* Preset Selector Bar */}
      <div className="drone-presets-bar">
        <span className="preset-label">FLIGHT RECON TARGETS:</span>
        {PRESET_FRAMES.map((frame) => (
          <button
            key={frame.id}
            className={`preset-chip ${selectedFrame.id === frame.id && !customImage ? 'active' : ''}`}
            onClick={() => handleSelectPreset(frame)}
          >
            {frame.title.split('-')[0]}
          </button>
        ))}
        {customImage && (
          <span className="preset-chip active custom-chip">
            Custom Frame Active
          </span>
        )}
      </div>

      {/* Main Viewport & Analysis Split */}
      <div className="drone-viewport-grid">
        {/* Left: Aerial Recon Viewport with Bounding Box Overlays */}
        <div className="drone-feed-box">
          <div className="drone-osd-overlay">
            <div className="osd-top-left">CAM 01 // HD OPTICAL // FLIR LWIR LINKED</div>
            <div className="osd-top-right">FPS: 30.0 // AI INFERENCE: 24ms</div>
            <div className="osd-crosshair"></div>
          </div>

          <div className="drone-image-wrapper">
            <img 
              src={selectedFrame.imageUrl} 
              alt={selectedFrame.title} 
              className="drone-main-image" 
            />

            {/* Scanning Laser Beam */}
            {isScanning && (
              <div 
                className="drone-scan-laser" 
                style={{ top: `${scanProgress}%` }}
              >
                <div className="scan-laser-glow"></div>
                <div className="scan-laser-text">NEURAL INFERENCE SCANNING... {scanProgress}%</div>
              </div>
            )}

            {/* Computer Vision Bounding Boxes */}
            {scanCompleted && activeDetections.map((det) => {
              const isSelected = selectedDetection?.id === det.id;
              const colorClass = 
                det.category === 'survivor' ? 'box-survivor' :
                det.category === 'collapse' ? 'box-collapse' : 'box-access';

              return (
                <div
                  key={det.id}
                  className={`cv-bounding-box ${colorClass} ${isSelected ? 'selected' : ''}`}
                  style={{
                    left: `${det.x}%`,
                    top: `${det.y}%`,
                    width: `${det.w}%`,
                    height: `${det.h}%`
                  }}
                  onClick={() => setSelectedDetection(det)}
                >
                  <div className="box-corner tl"></div>
                  <div className="box-corner tr"></div>
                  <div className="box-corner bl"></div>
                  <div className="box-corner br"></div>
                  <div className="cv-box-label">
                    <span>{det.id}</span>
                    <span>{det.label.split('(')[0]}</span>
                    <span className="cv-conf">{det.confidence}%</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="drone-feed-footer">
            <span>TARGET: {selectedFrame.title}</span>
            <span>SYSTEM: YOLOv8-DISASTER-SAIF ENSEMBLE</span>
          </div>
        </div>

        {/* Right: Tactical Detection Triage Ledger */}
        <div className="drone-analysis-panel">
          <div className="analysis-panel-header">
            <h3>OBJECT DETECTION & CASUALTY TRIAGE</h3>
            <span className="badge-count">{scanCompleted ? activeDetections.length : 0} DETECTIONS</span>
          </div>

          {!scanCompleted && (
            <div className="scan-prompt-state">
              <div className="prompt-radar-icon">📡</div>
              <h4>AERIAL SENSORS READY</h4>
              <p>Click <strong>RUN COMPUTER VISION AI SCAN</strong> to process the optical feed with our neural network and locate collapsed structures, impassable routes, and stranded survivors.</p>
            </div>
          )}

          {scanCompleted && (
            <div className="detections-ledger">
              {activeDetections.map((det) => {
                const isSelected = selectedDetection?.id === det.id;
                return (
                  <div 
                    key={det.id}
                    className={`detection-card ${det.category} ${isSelected ? 'active-card' : ''}`}
                    onClick={() => setSelectedDetection(det)}
                  >
                    <div className="detection-card-top">
                      <span className={`det-badge ${det.category}`}>
                        {det.category === 'survivor' ? '🟢 HUMAN SURVIVOR' :
                         det.category === 'collapse' ? '🔴 STRUCTURAL BREACH' : '🟠 ARTERY CUT'}
                      </span>
                      <span className="det-triage">{det.triage}</span>
                    </div>

                    <div className="detection-title">{det.label}</div>
                    <div className="detection-notes">{det.notes}</div>

                    <div className="detection-metrics">
                      <span><strong>CONFIDENCE:</strong> {det.confidence}%</span>
                      <span><strong>COORDS:</strong> {selectedFrame.coords}</span>
                    </div>

                    <div className="detection-actions">
                      <button 
                        className="btn-dispatch-sar"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDispatch(det);
                        }}
                      >
                        🚁 DISPATCH SAR HELICOPTER SORTIE
                      </button>
                    </div>
                  </div>
                );
              })}

              {sarDispatched && (
                <div className="sar-dispatch-toast">
                  ✅ SEARCH & RESCUE SORTIE DISPATCHED! Coordinates relayed to Nepal Army Aviation Directorate & NDRRMA Command.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
