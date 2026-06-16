const FenwickTree = require("./fenwickTree");

const tree = new FenwickTree(5);
[1, 2, 3, 4, 5].forEach((value, index) => tree.update(index, value));

console.assert(tree.query(2) === 6, "prefix query should return sum 1..3");
console.assert(tree.rangeQuery(1, 3) === 9, "range query should return sum 2..4");

tree.update(2, 7);
console.assert(tree.query(2) === 13, "update should change prefix sum");
console.assert(tree.rangeQuery(2, 2) === 10, "update should change point value");

const built = new FenwickTree(0).buildFromArray([4, 1, 6, 2]);
console.assert(built.query(3) === 13, "buildFromArray should build prefix sums");
console.assert(built.rangeQuery(1, 2) === 7, "buildFromArray should support ranges");

console.log("FenwickTree tests passed");

