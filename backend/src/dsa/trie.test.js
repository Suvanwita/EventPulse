const Trie = require("./trie");

const trie = new Trie();
trie.insert("CodeGuerra", {
  type: "EVENT",
  metadata: {
    eventId: "event-1",
    venueId: "venue-1",
  },
});
trie.insert("CodeSprint Workshop", {
  type: "EVENT",
  metadata: {
    eventId: "event-2",
  },
});
trie.insert("CC3 Lab 5041", {
  type: "VENUE",
  metadata: {
    venueId: "venue-2",
    zone: "CC3-5041",
  },
});

console.assert(trie.search("CodeGuerra").length === 1, "exact search should find inserted word");
console.assert(trie.getSuggestions("Code").length === 2, "prefix suggestions should return matching words");
console.assert(trie.getSuggestions("C", 1).length === 1, "limit should cap suggestions");
console.assert(trie.search("codeguerra").length === 1, "search should be case-insensitive");
console.assert(trie.getSuggestions("cc3")[0].metadata.venueId === "venue-2", "metadata should be returned");

trie.clear();
console.assert(trie.getSuggestions("Code").length === 0, "clear should remove suggestions");

console.log("Trie tests passed");

