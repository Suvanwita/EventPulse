const {
  generateSeatList,
  getFirstAvailableSeat,
  getSeatIndex,
  isValidSeat,
} = require("./seatAllocator");

const venue = {
  rows: 2,
  seatsPerRow: 3,
  capacity: 5,
};

console.assert(
  JSON.stringify(generateSeatList(2, 3)) ===
    JSON.stringify(["A1", "A2", "A3", "B1", "B2", "B3"]),
  "Expected row-wise seat generation"
);

console.assert(
  JSON.stringify(generateSeatList(2, 3, 5)) ===
    JSON.stringify(["A1", "A2", "A3", "B1", "B2"]),
  "Expected generated seats to respect capacity"
);

console.assert(
  getFirstAvailableSeat(venue, []) === "A1",
  "Expected first available seat to be A1"
);

console.assert(
  getFirstAvailableSeat(venue, ["A1", "A2"]) === "A3",
  "Expected occupied seats to be skipped"
);

console.assert(
  getFirstAvailableSeat(venue, ["A1", "A2", "A3", "B1", "B2"]) === null,
  "Expected null when all capacity seats are occupied"
);

console.assert(isValidSeat("B2", venue), "Expected B2 to be valid");
console.assert(!isValidSeat("B3", venue), "Expected B3 to exceed capacity");
console.assert(!isValidSeat("C1", venue), "Expected C1 row to be invalid");
console.assert(!isValidSeat("A0", venue), "Expected A0 to be invalid");

console.assert(
  getSeatIndex("B2").rowIndex === 1 && getSeatIndex("B2").seatIndex === 1,
  "Expected B2 to map to zero-based row and seat indexes"
);

console.log("seatAllocator tests passed");
