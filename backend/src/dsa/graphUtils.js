function buildGraph(nodes = [], edges = []) {
  const graph = new Map();

  nodes.forEach((node) => {
    const id = typeof node === "string" ? node : node.id;
    if (id) {
      graph.set(id, []);
    }
  });

  edges.forEach((edge) => {
    addEdge(graph, edge.from, edge.to, edge.weight);
  });

  return graph;
}

function addEdge(graph, from, to, weight = 1) {
  if (!graph.has(from)) {
    graph.set(from, []);
  }

  if (!graph.has(to)) {
    graph.set(to, []);
  }

  graph.get(from).push({ node: to, weight });
  graph.get(to).push({ node: from, weight });

  return graph;
}

function getMinDistanceNode(distances, visited) {
  let nextNode = null;
  let nextDistance = Infinity;

  for (const [node, distance] of distances.entries()) {
    if (!visited.has(node) && distance < nextDistance) {
      nextNode = node;
      nextDistance = distance;
    }
  }

  return nextNode;
}

function shortestPath(graph, source, target) {
  if (!graph.has(source) || !graph.has(target)) {
    return {
      distance: Infinity,
      path: [],
    };
  }

  const distances = new Map();
  const previous = new Map();
  const visited = new Set();

  for (const node of graph.keys()) {
    distances.set(node, Infinity);
  }

  distances.set(source, 0);

  while (visited.size < graph.size) {
    const current = getMinDistanceNode(distances, visited);

    if (!current) {
      break;
    }

    if (current === target) {
      break;
    }

    visited.add(current);

    for (const edge of graph.get(current) || []) {
      const nextDistance = distances.get(current) + edge.weight;
      if (nextDistance < distances.get(edge.node)) {
        distances.set(edge.node, nextDistance);
        previous.set(edge.node, current);
      }
    }
  }

  if (distances.get(target) === Infinity) {
    return {
      distance: Infinity,
      path: [],
    };
  }

  const path = [];
  let current = target;

  while (current) {
    path.unshift(current);
    current = previous.get(current);
  }

  return {
    distance: distances.get(target),
    path,
  };
}

function leastLoadedNode(nodes = []) {
  return nodes.reduce((best, node) => {
    if (!best) {
      return node;
    }

    return Number(node.load || 0) < Number(best.load || 0) ? node : best;
  }, null);
}

function recommendGate(gates = []) {
  return gates.reduce((best, gate) => {
    const score = Number(gate.load || 0) + Number(gate.distanceWeight || 0);
    const candidate = {
      ...gate,
      score,
    };

    if (!best || candidate.score < best.score) {
      return candidate;
    }

    return best;
  }, null);
}

module.exports = {
  addEdge,
  buildGraph,
  leastLoadedNode,
  recommendGate,
  shortestPath,
};

