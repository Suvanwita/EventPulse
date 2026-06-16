const prisma = require("../../config/prisma");
const Trie = require("../../dsa/trie");

const MIN_QUERY_LENGTH = 2;
const DEFAULT_LIMIT = 8;

function parseLimit(limit) {
  const value = Number(limit || DEFAULT_LIMIT);

  if (!Number.isInteger(value) || value <= 0) {
    return DEFAULT_LIMIT;
  }

  return Math.min(value, 25);
}

function insertIfPresent(trie, label, type, metadata) {
  if (!label || !String(label).trim()) {
    return;
  }

  trie.insert(label, {
    type,
    metadata,
  });
}

async function buildSearchTrie() {
  const [events, venues] = await Promise.all([
    prisma.event.findMany({
      include: {
        venue: true,
      },
      orderBy: {
        startTime: "asc",
      },
    }),
    prisma.venue.findMany({
      orderBy: {
        name: "asc",
      },
    }),
  ]);

  const trie = new Trie();

  events.forEach((event) => {
    insertIfPresent(trie, event.title, "EVENT", {
      eventId: event.id,
      venueId: event.venueId,
      venueName: event.venue?.name || null,
    });

    insertIfPresent(trie, event.venue?.zone, "CATEGORY", {
      eventId: event.id,
      venueId: event.venueId,
      venueName: event.venue?.name || null,
    });
  });

  venues.forEach((venue) => {
    insertIfPresent(trie, venue.name, "VENUE", {
      venueId: venue.id,
      zone: venue.zone,
    });

    insertIfPresent(trie, venue.zone, "ZONE", {
      venueId: venue.id,
      zone: venue.zone,
      venueName: venue.name,
    });
  });

  return trie;
}

async function getSuggestions(query, limit) {
  const normalizedQuery = String(query || "").trim();
  const suggestionLimit = parseLimit(limit);

  if (normalizedQuery.length < MIN_QUERY_LENGTH) {
    return {
      query: normalizedQuery,
      suggestions: [],
    };
  }

  const trie = await buildSearchTrie();

  return {
    query: normalizedQuery,
    suggestions: trie.getSuggestions(normalizedQuery, suggestionLimit),
  };
}

module.exports = {
  getSuggestions,
};

