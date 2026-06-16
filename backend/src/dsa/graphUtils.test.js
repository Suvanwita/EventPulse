const {
  addEdge,
  buildGraph,
  leastLoadedNode,
  recommendGate,
  shortestPath,
} = require("./graphUtils");

const graph = buildGraph(["campus-entry", "gate-a", "gate-b", "aud-a"], [
  { from: "campus-entry", to: "gate-a", weight: 2 },
  { from: "gate-a", to: "aud-a", weight: 3 },
]);

console.assert(graph.has("campus-entry"), "graph creation should add nodes");
addEdge(graph, "campus-entry", "gate-b", 1);
addEdge(graph, "gate-b", "aud-a", 1);

const route = shortestPath(graph, "campus-entry", "aud-a");
console.assert(route.distance === 2, "shortest path should use lowest weighted route");
console.assert(route.path.join(">") === "campus-entry>gate-b>aud-a", "shortest path should return route nodes");

const leastLoaded = leastLoadedNode([
  { id: "a", load: 5 },
  { id: "b", load: 2 },
]);
console.assert(leastLoaded.id === "b", "leastLoadedNode should pick lowest load");

const recommended = recommendGate([
  { id: "gate-a", load: 5, distanceWeight: 1 },
  { id: "gate-b", load: 1, distanceWeight: 2 },
]);
console.assert(recommended.id === "gate-b", "recommendGate should use load + distance score");

const disconnected = shortestPath(buildGraph(["a", "b"], []), "a", "b");
console.assert(disconnected.distance === Infinity, "disconnected graph should return Infinity distance");
console.assert(disconnected.path.length === 0, "disconnected graph should return empty path");

console.log("GraphUtils tests passed");

