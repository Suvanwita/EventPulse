function toDate(value) {
  return value instanceof Date ? value : new Date(value);
}

function hasOverlap(newStart, newEnd, existingIntervals) {
  return Boolean(findConflictingInterval(newStart, newEnd, existingIntervals));
}

function findConflictingInterval(newStart, newEnd, existingIntervals) {
  const start = toDate(newStart);
  const end = toDate(newEnd);

  return (
    existingIntervals.find((interval) => {
      const existingStart = toDate(interval.start);
      const existingEnd = toDate(interval.end);

      return start < existingEnd && end > existingStart;
    }) || null
  );
}

module.exports = {
  hasOverlap,
  findConflictingInterval,
};
