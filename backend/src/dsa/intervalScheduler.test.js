const {
  findConflictingInterval,
  hasOverlap,
} = require("./intervalScheduler");

const existingIntervals = [
  {
    id: "morning",
    start: new Date("2026-06-16T09:00:00.000Z"),
    end: new Date("2026-06-16T10:00:00.000Z"),
  },
  {
    id: "afternoon",
    start: new Date("2026-06-16T13:00:00.000Z"),
    end: new Date("2026-06-16T14:00:00.000Z"),
  },
];

console.assert(
  !hasOverlap(
    new Date("2026-06-16T10:00:00.000Z"),
    new Date("2026-06-16T11:00:00.000Z"),
    existingIntervals
  ),
  "Expected no conflict when one event ends exactly when another starts"
);

console.assert(
  hasOverlap(
    new Date("2026-06-16T09:30:00.000Z"),
    new Date("2026-06-16T10:30:00.000Z"),
    existingIntervals
  ),
  "Expected conflict when intervals overlap"
);

console.assert(
  findConflictingInterval(
    new Date("2026-06-16T08:00:00.000Z"),
    new Date("2026-06-16T11:00:00.000Z"),
    existingIntervals
  )?.id === "morning",
  "Expected conflict when new event fully contains existing event"
);

console.assert(
  findConflictingInterval(
    new Date("2026-06-16T09:15:00.000Z"),
    new Date("2026-06-16T09:45:00.000Z"),
    existingIntervals
  )?.id === "morning",
  "Expected conflict when existing event fully contains new event"
);

console.log("intervalScheduler tests passed");
