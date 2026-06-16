class FenwickTree {
  constructor(size) {
    if (!Number.isInteger(size) || size < 0) {
      throw new Error("FenwickTree size must be a non-negative integer");
    }

    this.size = size;
    this.tree = Array(size + 1).fill(0);
  }

  // Public indexes are zero-based. Internally the tree uses one-based indexes.
  update(index, delta) {
    if (index < 0 || index >= this.size) {
      throw new Error("FenwickTree update index out of bounds");
    }

    for (let current = index + 1; current <= this.size; current += current & -current) {
      this.tree[current] += delta;
    }
  }

  // Returns the prefix sum from public index 0 through index, inclusive.
  query(index) {
    if (this.size === 0 || index < 0) {
      return 0;
    }

    let sum = 0;
    const boundedIndex = Math.min(index, this.size - 1);

    for (let current = boundedIndex + 1; current > 0; current -= current & -current) {
      sum += this.tree[current];
    }

    return sum;
  }

  // Returns the inclusive sum across public indexes left through right.
  rangeQuery(left, right) {
    if (left > right || this.size === 0 || right < 0 || left >= this.size) {
      return 0;
    }

    const boundedLeft = Math.max(left, 0);
    const boundedRight = Math.min(right, this.size - 1);

    return this.query(boundedRight) - this.query(boundedLeft - 1);
  }

  buildFromArray(arr) {
    if (!Array.isArray(arr)) {
      throw new Error("FenwickTree buildFromArray expects an array");
    }

    this.size = arr.length;
    this.tree = Array(arr.length + 1).fill(0);
    arr.forEach((value, index) => this.update(index, value));
    return this;
  }
}

module.exports = FenwickTree;

