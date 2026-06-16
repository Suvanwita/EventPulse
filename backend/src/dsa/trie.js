class TrieNode {
  constructor() {
    this.children = new Map();
    this.suggestions = [];
    this.terminalSuggestions = [];
  }
}

class Trie {
  constructor() {
    this.root = new TrieNode();
  }

  normalize(value) {
    return String(value || "").trim().toLowerCase();
  }

  insert(word, metadata = {}) {
    const label = String(word || "").trim();
    const normalized = this.normalize(label);

    if (!normalized) {
      return;
    }

    const suggestion = {
      label,
      type: metadata.type || "UNKNOWN",
      metadata: metadata.metadata || metadata,
    };

    let node = this.root;
    node.suggestions.push(suggestion);

    for (const character of normalized) {
      if (!node.children.has(character)) {
        node.children.set(character, new TrieNode());
      }

      node = node.children.get(character);
      node.suggestions.push(suggestion);
    }

    node.terminalSuggestions.push(suggestion);
  }

  getNode(value) {
    const normalized = this.normalize(value);
    let node = this.root;

    for (const character of normalized) {
      node = node.children.get(character);
      if (!node) {
        return null;
      }
    }

    return node;
  }

  search(word) {
    const node = this.getNode(word);
    return node ? node.terminalSuggestions : [];
  }

  startsWith(prefix) {
    return Boolean(this.getNode(prefix));
  }

  getSuggestions(prefix, limit = 8) {
    const node = this.getNode(prefix);

    if (!node) {
      return [];
    }

    const seen = new Set();
    const suggestions = [];

    for (const suggestion of node.suggestions) {
      const key = `${suggestion.type}:${suggestion.label}:${JSON.stringify(suggestion.metadata)}`;
      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      suggestions.push(suggestion);

      if (suggestions.length >= limit) {
        break;
      }
    }

    return suggestions;
  }

  clear() {
    this.root = new TrieNode();
  }
}

module.exports = Trie;

