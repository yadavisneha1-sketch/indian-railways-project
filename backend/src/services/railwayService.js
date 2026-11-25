import {
  DEMO_NOTICE,
  RAILWAY_FAQS,
  SAMPLE_PNRS,
  STATIONS,
  TRAINS,
} from '../data/railwayData.js';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Resolves a user input (station code, city name, or station name) to a station code or normalized token.
 */
export function resolveStationToken(input = '') {
  const cleaned = String(input).trim();
  if (!cleaned) return '';

  const upper = cleaned.toUpperCase();
  const exactCode = STATIONS.find((s) => s.code === upper);
  if (exactCode) return exactCode.code;

  const lower = cleaned.toLowerCase();
  const fuzzy = STATIONS.find(
    (s) =>
      s.name.toLowerCase().includes(lower) ||
      s.city.toLowerCase().includes(lower) ||
      s.code.toLowerCase() === lower
  );
  if (fuzzy) return fuzzy.code;

  // Also check intermediate schedule stops across trains
  for (const train of TRAINS) {
    for (const stop of train.schedule) {
      if (
        stop.stationCode.toUpperCase() === upper ||
        stop.stationName.toLowerCase().includes(lower)
      ) {
        return stop.stationCode;
      }
    }
  }

  return upper;
}

function getDayFromDate(dateStr) {
  if (!dateStr) return null;
  const parsed = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  return DAY_NAMES[parsed.getDay()];
}

/**
 * Search trains between source and destination (supports origin->dest AND intermediate stops).
 */
export function searchTrains({ source, destination, date = '', travelClass = '' } = {}) {
  const srcCode = resolveStationToken(source);
  const dstCode = resolveStationToken(destination);
  const targetDay = getDayFromDate(date);
  const classUpper = String(travelClass || '').trim().toUpperCase();

  if (!srcCode || !dstCode) {
    return {
      isDemoData: true,
      disclaimer: DEMO_NOTICE,
      error: 'Both source and destination stations are required.',
      trains: [],
    };
  }

  if (srcCode === dstCode) {
    return {
      isDemoData: true,
      disclaimer: DEMO_NOTICE,
      error: 'Source and destination stations must be different.',
      trains: [],
    };
  }

  const matched = [];

  for (const train of TRAINS) {
    const srcIdx = train.schedule.findIndex((s) => s.stationCode === srcCode);
    const dstIdx = train.schedule.findIndex((s) => s.stationCode === dstCode);

    if (srcIdx === -1 || dstIdx === -1 || srcIdx >= dstIdx) {
      continue;
    }

    if (targetDay && !train.runningDays.includes(targetDay)) {
      continue;
    }

    if (classUpper && !train.classes.some((c) => c.code === classUpper)) {
      continue;
    }

    const boardingStop = train.schedule[srcIdx];
    const alightingStop = train.schedule[dstIdx];
    const isFullRoute = srcIdx === 0 && dstIdx === train.schedule.length - 1;

    matched.push({
      trainNumber: train.trainNumber,
      trainName: train.trainName,
      type: train.type,
      source: boardingStop.stationCode,
      sourceName: boardingStop.stationName,
      destination: alightingStop.stationCode,
      destinationName: alightingStop.stationName,
      departureTime:
        boardingStop.departure === 'Source' ? train.departureTime : boardingStop.departure,
      arrivalTime:
        alightingStop.arrival === 'Destination' ? train.arrivalTime : alightingStop.arrival,
      duration: isFullRoute ? train.duration : `${alightingStop.distanceKm - boardingStop.distanceKm} km segment`,
      distanceKm: alightingStop.distanceKm - boardingStop.distanceKm,
      runningDays: train.runningDays,
      classes: train.classes,
      journeyDate: date || 'Flexible (Demo)',
      isDemoData: true,
    });
  }

  return {
    isDemoData: true,
    disclaimer: DEMO_NOTICE,
    query: { source: srcCode, destination: dstCode, date: date || null, travelClass: classUpper || null },
    count: matched.length,
    trains: matched,
  };
}

/**
 * Retrieve complete route schedule for a train by trainNumber or name.
 */
export function getTrainSchedule({ trainQuery } = {}) {
  const q = String(trainQuery || '').trim();
  if (!q) {
    return {
      isDemoData: true,
      disclaimer: DEMO_NOTICE,
      found: false,
      error: 'Please provide a train number or train name.',
    };
  }

  const lower = q.toLowerCase();
  const train = TRAINS.find(
    (t) =>
      t.trainNumber === q ||
      t.trainName.toLowerCase().includes(lower) ||
      t.trainNumber.includes(q)
  );

  if (!train) {
    return {
      isDemoData: true,
      disclaimer: DEMO_NOTICE,
      found: false,
      message: `No train matching "${q}" was found in the demonstration dataset.`,
      availableSampleTrains: TRAINS.map((t) => `${t.trainNumber} - ${t.trainName}`),
    };
  }

  return {
    isDemoData: true,
    disclaimer: DEMO_NOTICE,
    found: true,
    trainNumber: train.trainNumber,
    trainName: train.trainName,
    type: train.type,
    source: train.source,
    destination: train.destination,
    departureTime: train.departureTime,
    arrivalTime: train.arrivalTime,
    duration: train.duration,
    distanceKm: train.distanceKm,
    runningDays: train.runningDays,
    classes: train.classes,
    schedule: train.schedule,
  };
}

/**
 * Retrieve station information by code, city, or name.
 */
export function getStationInformation({ stationQuery } = {}) {
  const q = String(stationQuery || '').trim();
  if (!q) {
    return {
      isDemoData: true,
      disclaimer: DEMO_NOTICE,
      found: false,
      error: 'Please provide a station code or station/city name.',
    };
  }

  const code = resolveStationToken(q);
  const lower = q.toLowerCase();
  const station =
    STATIONS.find((s) => s.code === code) ||
    STATIONS.find(
      (s) => s.name.toLowerCase().includes(lower) || s.city.toLowerCase().includes(lower)
    );

  if (!station) {
    return {
      isDemoData: true,
      disclaimer: DEMO_NOTICE,
      found: false,
      message: `Station "${q}" not found in the demonstration dataset.`,
      availableStationCodes: STATIONS.map((s) => `${s.code} (${s.name})`),
    };
  }

  const servingTrains = TRAINS.filter((t) =>
    t.schedule.some((stop) => stop.stationCode === station.code)
  ).map((t) => {
    const stop = t.schedule.find((s) => s.stationCode === station.code);
    return {
      trainNumber: t.trainNumber,
      trainName: t.trainName,
      type: t.type,
      arrival: stop.arrival,
      departure: stop.departure,
      platform: stop.platform,
    };
  });

  return {
    isDemoData: true,
    disclaimer: DEMO_NOTICE,
    found: true,
    station,
    servingTrainsCount: servingTrains.length,
    servingTrains,
  };
}

/**
 * Suggest direct or 1-stop connecting journeys between source and destination.
 */
export function planJourney({ source, destination, date = '', preference = 'fastest' } = {}) {
  const srcCode = resolveStationToken(source);
  const dstCode = resolveStationToken(destination);

  if (!srcCode || !dstCode) {
    return {
      isDemoData: true,
      disclaimer: DEMO_NOTICE,
      error: 'Both source and destination are required to plan a journey.',
      directOptions: [],
      connectingOptions: [],
    };
  }

  const direct = searchTrains({ source: srcCode, destination: dstCode, date });

  const sortedDirect = [...direct.trains].sort((a, b) => {
    if (preference === 'budget') {
      const minA = Math.min(...a.classes.map((c) => c.demoFareInr));
      const minB = Math.min(...b.classes.map((c) => c.demoFareInr));
      return minA - minB;
    }
    return a.distanceKm - b.distanceKm;
  });

  // Also look for 1-transfer connections if few or no direct trains
  const connectingOptions = [];
  if (sortedDirect.length === 0) {
    for (const firstLeg of TRAINS) {
      const srcIdx = firstLeg.schedule.findIndex((s) => s.stationCode === srcCode);
      if (srcIdx === -1) continue;

      for (let i = srcIdx + 1; i < firstLeg.schedule.length; i += 1) {
        const hub = firstLeg.schedule[i];
        if (hub.stationCode === dstCode) continue;

        for (const secondLeg of TRAINS) {
          if (secondLeg.trainNumber === firstLeg.trainNumber) continue;
          const hubIdx = secondLeg.schedule.findIndex((s) => s.stationCode === hub.stationCode);
          const dstIdx = secondLeg.schedule.findIndex((s) => s.stationCode === dstCode);
          if (hubIdx !== -1 && dstIdx > hubIdx) {
            connectingOptions.push({
              viaStationCode: hub.stationCode,
              viaStationName: hub.stationName,
              leg1: {
                trainNumber: firstLeg.trainNumber,
                trainName: firstLeg.trainName,
                from: srcCode,
                to: hub.stationCode,
                departure: firstLeg.schedule[srcIdx].departure,
                arrival: hub.arrival,
              },
              leg2: {
                trainNumber: secondLeg.trainNumber,
                trainName: secondLeg.trainName,
                from: hub.stationCode,
                to: dstCode,
                departure: secondLeg.schedule[hubIdx].departure,
                arrival: secondLeg.schedule[dstIdx].arrival,
              },
            });
          }
        }
      }
    }
  }

  return {
    isDemoData: true,
    disclaimer: DEMO_NOTICE,
    query: { source: srcCode, destination: dstCode, date: date || null, preference },
    directOptions: sortedDirect,
    connectingOptions: connectingOptions.slice(0, 3),
    recommendation:
      sortedDirect.length > 0
        ? `Found ${sortedDirect.length} direct demonstration train(s) from ${srcCode} to ${dstCode}. Top match: ${sortedDirect[0].trainNumber} ${sortedDirect[0].trainName}.`
        : connectingOptions.length > 0
          ? `No direct demo train found on ${srcCode} → ${dstCode}, but ${connectingOptions.length} connecting route(s) via ${connectingOptions[0].viaStationName} are available.`
          : `No direct or 1-stop connecting route found in the demonstration dataset for ${srcCode} → ${dstCode}.`,
  };
}

/**
 * Search common Indian Railway FAQs.
 */
export function searchRailwayFaq({ question } = {}) {
  const q = String(question || '').trim().toLowerCase();
  if (!q) {
    return {
      isDemoData: true,
      disclaimer: DEMO_NOTICE,
      matches: RAILWAY_FAQS.slice(0, 4),
    };
  }

  const scored = RAILWAY_FAQS.map((faq) => {
    let score = 0;
    for (const kw of faq.keywords) {
      if (q.includes(kw)) score += 3;
    }
    const words = q.split(/\s+/).filter((w) => w.length > 2);
    for (const word of words) {
      if (faq.question.toLowerCase().includes(word)) score += 1;
      if (faq.answer.toLowerCase().includes(word)) score += 1;
    }
    return { ...faq, score };
  })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  return {
    isDemoData: true,
    disclaimer: DEMO_NOTICE,
    query: question,
    matches: scored.length > 0 ? scored.slice(0, 3) : RAILWAY_FAQS.slice(0, 3),
    exactMatchFound: scored.length > 0,
  };
}

/**
 * Track booking & simulated live train position using a 10-digit PNR / PR number.
 */
export function trackByPnr({ pnr } = {}) {
  const cleaned = String(pnr || '').replace(/\s|-/g, '').trim();

  if (!/^\d{10}$/.test(cleaned)) {
    return {
      isDemoData: true,
      disclaimer: DEMO_NOTICE,
      found: false,
      error: 'Invalid PNR/PR format. Please enter a 10-digit numeric PNR number (for example: 4521896304).',
      samplePnrs: SAMPLE_PNRS.map((p) => ({
        pnr: p.pnr,
        trainNumber: p.trainNumber,
        route: `${p.boardingStation} → ${p.destinationStation}`,
      })),
    };
  }

  const record = SAMPLE_PNRS.find((item) => item.pnr === cleaned);
  if (!record) {
    return {
      isDemoData: true,
      disclaimer: DEMO_NOTICE,
      found: false,
      pnr: cleaned,
      message: `PNR ${cleaned} is not present in the demonstration dataset. Because this app does not connect to live IRCTC servers, try one of the sample PNR numbers below.`,
      samplePnrs: SAMPLE_PNRS.map((p) => ({
        pnr: p.pnr,
        trainNumber: p.trainNumber,
        route: `${p.boardingStation} → ${p.destinationStation}`,
      })),
    };
  }

  const train = TRAINS.find((t) => t.trainNumber === record.trainNumber);

  return {
    isDemoData: true,
    disclaimer: DEMO_NOTICE,
    found: true,
    pnrDetails: record,
    trainInfo: train
      ? {
          trainNumber: train.trainNumber,
          trainName: train.trainName,
          type: train.type,
          source: train.source,
          destination: train.destination,
          departureTime: train.departureTime,
          arrivalTime: train.arrivalTime,
          duration: train.duration,
          liveSimulation: train.liveSimulation,
          schedule: train.schedule,
        }
      : null,
  };
}

/**
 * Retrieve simulated live running status by train number (or PNR if 10 digits passed).
 */
export function getTrainRunningStatus({ identifier } = {}) {
  const cleaned = String(identifier || '').replace(/\s|-/g, '').trim();
  if (!cleaned) {
    return {
      isDemoData: true,
      disclaimer: DEMO_NOTICE,
      found: false,
      error: 'Please provide a 5-digit train number or a 10-digit PNR number.',
    };
  }

  if (/^\d{10}$/.test(cleaned)) {
    return trackByPnr({ pnr: cleaned });
  }

  const lower = cleaned.toLowerCase();
  const train = TRAINS.find(
    (t) => t.trainNumber === cleaned || t.trainName.toLowerCase().includes(lower)
  );

  if (!train) {
    return {
      isDemoData: true,
      disclaimer: DEMO_NOTICE,
      found: false,
      message: `Train "${cleaned}" not found in the demonstration dataset.`,
      sampleTrainNumbers: TRAINS.map((t) => ({
        trainNumber: t.trainNumber,
        trainName: t.trainName,
        route: `${t.source} → ${t.destination}`,
      })),
    };
  }

  return {
    isDemoData: true,
    disclaimer: DEMO_NOTICE,
    found: true,
    trainInfo: {
      trainNumber: train.trainNumber,
      trainName: train.trainName,
      type: train.type,
      source: train.source,
      destination: train.destination,
      departureTime: train.departureTime,
      arrivalTime: train.arrivalTime,
      duration: train.duration,
      runningDays: train.runningDays,
      liveSimulation: train.liveSimulation,
      schedule: train.schedule,
    },
  };
}

export function listAllStations() {
  return STATIONS.map((s) => ({
    code: s.code,
    name: s.name,
    city: s.city,
    state: s.state,
    zone: s.zone,
    platforms: s.platforms,
  }));
}

export function getDashboardSummary() {
  return {
    isDemoData: true,
    disclaimer: DEMO_NOTICE,
    stats: {
      totalTrains: TRAINS.length,
      totalStations: STATIONS.length,
      samplePnrsCount: SAMPLE_PNRS.length,
      faqCount: RAILWAY_FAQS.length,
    },
    featuredTrains: TRAINS.slice(0, 4).map((t) => ({
      trainNumber: t.trainNumber,
      trainName: t.trainName,
      type: t.type,
      source: t.source,
      destination: t.destination,
      departureTime: t.departureTime,
      arrivalTime: t.arrivalTime,
      duration: t.duration,
      liveStatus: t.liveSimulation.status,
    })),
    samplePnrs: SAMPLE_PNRS.map((p) => ({
      pnr: p.pnr,
      trainNumber: p.trainNumber,
      route: `${p.boardingStation} → ${p.destinationStation}`,
      class: p.travelClass,
      summaryStatus: p.passengers[0]?.currentStatus || 'Demo',
    })),
  };
}
