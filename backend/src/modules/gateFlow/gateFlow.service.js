const prisma = require("../../config/prisma");
const ApiError = require("../../utils/ApiError");
const {
  buildGraph,
  recommendGate,
  shortestPath,
} = require("../../dsa/graphUtils");

function buildDemoGates(venueZone, gateLoads) {
  return [
    {
      id: "gate-a",
      name: "Gate A",
      zone: venueZone,
      load: gateLoads["Gate A"] || gateLoads["Main Gate"] || 0,
      distanceWeight: 1,
    },
    {
      id: "gate-b",
      name: "Gate B",
      zone: venueZone,
      load: gateLoads["Gate B"] || gateLoads["North Entry"] || 0,
      distanceWeight: 2,
    },
    {
      id: "gate-c",
      name: "Gate C",
      zone: venueZone,
      load: gateLoads["Gate C"] || gateLoads["Overflow Desk"] || 0,
      distanceWeight: 3,
    },
  ];
}

function countGateLoads(checkIns) {
  return checkIns.reduce((loads, checkIn) => {
    const gateName = checkIn.gateName || "Gate A";
    loads[gateName] = (loads[gateName] || 0) + 1;
    return loads;
  }, {});
}

function buildVenueRouteGraph(venueZone, gates) {
  const target = `venue:${venueZone || "campus"}`;
  const nodes = ["campus-entry", target, ...gates.map((gate) => gate.id)];
  const edges = gates.flatMap((gate) => [
    {
      from: "campus-entry",
      to: gate.id,
      weight: gate.distanceWeight,
    },
    {
      from: gate.id,
      to: target,
      weight: Math.max(1, gate.distanceWeight - 1),
    },
  ]);

  return {
    graph: buildGraph(nodes, edges),
    source: "campus-entry",
    target,
  };
}

async function getEventWithGateData(eventId) {
  const event = await prisma.event.findUnique({
    where: {
      id: eventId,
    },
    include: {
      venue: true,
      checkIns: {
        select: {
          id: true,
          gateName: true,
          scannedAt: true,
        },
      },
    },
  });

  if (!event) {
    throw new ApiError(404, "Event not found");
  }

  return event;
}

async function getGateRecommendation(eventId) {
  const event = await getEventWithGateData(eventId);
  const gateLoads = countGateLoads(event.checkIns);
  const gates = buildDemoGates(event.venue.zone, gateLoads);
  const recommendedGate = recommendGate(gates);
  const routeGraph = buildVenueRouteGraph(event.venue.zone, gates);
  const route = shortestPath(
    routeGraph.graph,
    routeGraph.source,
    routeGraph.target
  );

  return {
    eventId,
    recommendedGate,
    reason: recommendedGate
      ? `${recommendedGate.name} has the lowest combined load and distance score (${recommendedGate.score}).`
      : "No gate recommendation available.",
    gates,
    route,
  };
}

async function getGateFlow(eventId) {
  const recommendation = await getGateRecommendation(eventId);
  const venueRoute = shortestPath(
    buildVenueRouteGraph(
      recommendation.gates[0]?.zone,
      recommendation.gates
    ).graph,
    "campus-entry",
    `venue:${recommendation.gates[0]?.zone || "campus"}`
  );

  return {
    ...recommendation,
    routeToVenue: venueRoute,
  };
}

module.exports = {
  getGateFlow,
  getGateRecommendation,
};
