// Multilingual Localization Dictionary for RAKSHA-AI
// Supports English, Nepali (नेपाली), and Hindi (हिंदी) for Grassroots Inclusivity

export const translations = {
  en: {
    // Header & Meta
    systemTitle: "RAKSHAK C4ISR",
    systemSubtitle: "Autonomous Planetary Hazard & Life-Safety Network",
    classifiedBadge: "NDRRMA / DEFENSE CLEARED",
    operatorLock: "OPERATOR LOCK",
    operatorAuth: "OPERATOR (AUTH)",
    securityAudit: "SECURITY AUDIT",
    
    // Mission Workspaces Tabs
    tabs: {
      threatOverview: "THREAT OVERVIEW",
      tactical3d: "3D TACTICAL COMMAND",
      predictiveLab: "PREDICTIVE AI LAB",
      droneVision: "UAV DRONE VISION AI",
      evacuation: "EVACUATION PLANNER",
      reliefInventory: "RELIEF INVENTORY",
      missingPersons: "MISSING PERSONS",
      governmentOps: "GOVERNMENT C4ISR OPS",
      simulation: "SCENARIO SIMULATION"
    },

    // Alarm & Hazard HUD
    alarm: {
      emergencyBeacon: "CRITICAL HAZARD DETECTED",
      occurrenceChance: "OCCURRENCE CHANCE",
      targetAddress: "TARGET ADDRESS DOSSIER",
      ward: "Ward / Tole",
      municipality: "Municipality",
      district: "District",
      province: "Province",
      coordinates: "Coordinates",
      safeHaven: "Primary Safe Haven",
      confidence: "Confidence",
      acousticAlarmMute: "MUTE SIREN",
      acousticAlarmUnmute: "SOUND SIREN",
      locateMap: "LOCATE ON TACTICAL MAP",
      dismiss: "DISMISS BEACON",
      outwardDispatch: "OUTWARD CELLULAR ALERT DISPATCH",
      phonePlaceholder: "Recipient Phone (+977-98XXXXXXXX)",
      sendSms: "SEND DISPATCH SMS",
      sending: "DISPATCHING...",
      dispatchSuccess: "SMS dispatched successfully via telecom gateway",
      dispatchError: "Dispatch failed. Verify authorization and phone format."
    },

    // Threat Levels
    threatLevels: {
      critical: "CRITICAL",
      high: "HIGH",
      medium: "MODERATE",
      low: "NOMINAL"
    },

    // Telemetry Ticker
    ticker: {
      usgsFeed: "USGS Seismic Stream",
      hydrology: "GloFAS Hydrology",
      weather: "Open-Meteo Radar",
      nasaFirms: "NASA FIRMS Thermal Satellites",
      activeAlerts: "Active Crisis Feeds"
    },

    // Evacuation & Action Alerts
    alerts: {
      immediateEvacuation: "IMMEDIATE EVACUATION REQUIRED: Seek designated high-ground safe haven immediately.",
      floodWarning: "FLASH FLOOD SURGE WARNING: River basin exceeding dangerous discharge thresholds.",
      earthquakeWarning: "SEISMIC WAVE ALERT: Tremors detected. Drop, cover, and hold on away from fragile masonry."
    },

    // SMS Dispatch Templates
    smsTemplate: (type, chance, loc, safe) => 
      `[RAKSHA-AI EMERGENCY] ${type.toUpperCase()} WARNING (${chance}% risk) in ${loc}. Immediate evacuation advised to ${safe}. Call 1149 / 100 for rescue.`
  },

  ne: {
    // Header & Meta (Nepali)
    systemTitle: "रक्षक C4ISR",
    systemSubtitle: "स्वायत्त प्राकृतिक विपद् तथा जनसुरक्षा नेटवर्क",
    classifiedBadge: "विपद् व्यवस्थापन / सुरक्षा प्रमाणीकरण",
    operatorLock: "अपरेटर बन्द",
    operatorAuth: "अपरेटर (प्रमाणित)",
    securityAudit: "सुरक्षा अडिट",
    
    // Mission Workspaces Tabs
    tabs: {
      threatOverview: "विपद् सिंहावलोकन",
      tactical3d: "३डी रणनीतिक कमाण्ड",
      predictiveLab: "एआई पूर्वअनुमान ल्याब",
      droneVision: "ड्रोन भिजन एआई (UAV)",
      evacuation: "उद्धार तथा स्थानान्तरण",
      reliefInventory: "राहत तथा औषधि भण्डार",
      missingPersons: "हराएका नागरिक खोजी",
      governmentOps: "सरकारी कमाण्ड केन्द्र",
      simulation: "विपद् अभ्यास सिमुलेशन"
    },

    // Alarm & Hazard HUD
    alarm: {
      emergencyBeacon: "गम्भीर विपद् जोखिम चेतावनी",
      occurrenceChance: "घटना हुने सम्भावना",
      targetAddress: "प्रभावित स्थानको विवरण",
      ward: "वडा / टोल",
      municipality: "नगरपालिका / गाउँपालिका",
      district: "जिल्ला",
      province: "प्रदेश",
      coordinates: "अक्षांश र देशान्तर",
      safeHaven: "तोकिएको सुरक्षित आश्रयस्थल",
      confidence: "एआई विश्वसनीयता",
      acousticAlarmMute: "साइरन बन्द गर्नुहोस्",
      acousticAlarmUnmute: "साइरन बजाउनुहोस्",
      locateMap: "नक्सामा स्थान हेर्नुहोस्",
      dismiss: "अलर्ट हटाउनुहोस्",
      outwardDispatch: "नागरिक मोबाइल एसएमएस प्रेषण",
      phonePlaceholder: "प्राप्तकर्ता नम्बर (+९७७-९८XXXXXXXX)",
      sendSms: "एसएमएस पठाउनुहोस्",
      sending: "पठाउँदै...",
      dispatchSuccess: "दूरसञ्चार गेटवेबाट आपत्कालीन एसएमएस सफलतापूर्वक पठाइयो",
      dispatchError: "एसएमएस पठाउन सकिएन। नम्बर र प्रमाणीकरण जाँच गर्नुहोस्।"
    },

    // Threat Levels
    threatLevels: {
      critical: "अति गम्भीर",
      high: "उच्च जोखिम",
      medium: "मध्यम",
      low: "सामान्य"
    },

    // Telemetry Ticker
    ticker: {
      usgsFeed: "युएसजीएस भूकम्प स्ट्रिम",
      hydrology: "ग्लोफास नदी बहाव",
      weather: "मौसम तथा वर्षा राडार",
      nasaFirms: "नासा फर्म्स थर्मल उपग्रह",
      activeAlerts: "सक्रिय विपद् सङ्केतहरू"
    },

    // Evacuation & Action Alerts
    alerts: {
      immediateEvacuation: "तत्काल सुरक्षित स्थानमा जानुहोस्: नजिकैको तोकिएको उच्च सुरक्षित आश्रयस्थलमा पुग्नुहोस्।",
      floodWarning: "अचानक बाढीको गम्भीर चेतावनी: नदीको जलसतह खतराको तहभन्दा माथि बगेको छ।",
      earthquakeWarning: "भूकम्पीय धक्का चेतावनी: खुला स्थानमा जानुहोस् वा बलियो संरचनामुनि सुरक्षित बस्नुहोस्।"
    },

    // SMS Dispatch Templates
    smsTemplate: (type, chance, loc, safe) => 
      `[रक्षक विपद् सूचना] ${loc} मा ${chance}% सम्भावना सहित ${type} को उच्च जोखिम छ। तत्काल ${safe} तर्फ सुरक्षित स्थानान्तरण हुनुहोस्। आपत्कालीन उद्धारका लागि ११४९ वा १०० मा फोन गर्नुहोस्।`
  },

  hi: {
    // Header & Meta (Hindi)
    systemTitle: "रक्षक C4ISR",
    systemSubtitle: "स्वायत्त आपदा चेतावनी एवं जनसुरक्षा तंत्र",
    classifiedBadge: "आपदा प्रबंधन / सुरक्षा अधिकृत",
    operatorLock: "ऑपरेटर लॉक",
    operatorAuth: "ऑपरेटर (अधिकृत)",
    securityAudit: "सुरक्षा ऑडिट",
    
    // Mission Workspaces Tabs
    tabs: {
      threatOverview: "आपदा अवलोकन",
      tactical3d: "3D सामरिक कमान्ड",
      predictiveLab: "एआई पूर्वानुमान लैब",
      droneVision: "ड्रोन विज़न एआई (UAV)",
      evacuation: "निकासी एवं मार्ग योजना",
      reliefInventory: "राहत एवं रसद भंडार",
      missingPersons: "लापता व्यक्ति खोज",
      governmentOps: "सरकारी कमान्ड केंद्र",
      simulation: "आपदा अभ्यास सिमुलेशन"
    },

    // Alarm & Hazard HUD
    alarm: {
      emergencyBeacon: "गंभीर आपदा चेतावनी",
      occurrenceChance: "घटना होने की संभावना",
      targetAddress: "प्रभावित क्षेत्र का विवरण",
      ward: "वार्ड / मोहल्ला",
      municipality: "नगर पालिका / प्रखंड",
      district: "ज़िला",
      province: "राज्य / प्रान्त",
      coordinates: "निर्देशांक",
      safeHaven: "प्राथमिक सुरक्षित शरणस्थल",
      confidence: "एआई विश्वसनीयता",
      acousticAlarmMute: "सायरन बंद करें",
      acousticAlarmUnmute: "सायरन बजाएं",
      locateMap: "मानचित्र पर देखें",
      dismiss: "अलर्ट हटाएं",
      outwardDispatch: "मोबाइल एसएमएस आपात संदेश",
      phonePlaceholder: "मोबाइल नंबर (+91 / +977-XXXXXXXXXX)",
      sendSms: "एसएमएस भेजें",
      sending: "भेज रहे हैं...",
      dispatchSuccess: "टेलीकॉम गेटवे से आपातकालीन एसएमएस सफलतापूर्वक भेजा गया",
      dispatchError: "एसएमएस भेजने में विफल। नंबर और प्रमाणीकरण जांचें।"
    },

    // Threat Levels
    threatLevels: {
      critical: "अति गंभीर",
      high: "उच्च जोखिम",
      medium: "मध्यम",
      low: "सामान्य"
    },

    // Telemetry Ticker
    ticker: {
      usgsFeed: "यूएसजीएस भूकंप स्ट्रीम",
      hydrology: "ग्लोफ़ास नदी जलस्तर",
      weather: "मौसम एवं वर्षा रडार",
      nasaFirms: "नासा फर्म्स थर्मल उपग्रह",
      activeAlerts: "सक्रिय आपदा अलर्ट"
    },

    // Evacuation & Action Alerts
    alerts: {
      immediateEvacuation: "तत्काल निकासी आवश्यक: निर्धारित सुरक्षित स्थान या ऊंचे शरणस्थल की ओर तुरंत जाएं।",
      floodWarning: "आकस्मिक बाढ़ की गंभीर चेतावनी: नदी का जलस्तर खतरे के निशान से ऊपर बह रहा है।",
      earthquakeWarning: "भूकंपीय कंपन चेतावनी: खुले स्थान पर जाएं अथवा मजबूत संरचना के नीचे शरण लें।"
    },

    // SMS Dispatch Templates
    smsTemplate: (type, chance, loc, safe) => 
      `[रक्षक आपदा अलर्ट] ${loc} में ${chance}% संभावना के साथ ${type} की गंभीर चेतावनी। तुरंत ${safe} की ओर प्रस्थान करें। आपातकालीन सहायता के लिए 112 / 100 पर संपर्क करें।`
  }
};
