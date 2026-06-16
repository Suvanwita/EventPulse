function getRowLabel(index) {
  let label = "";
  let value = index;

  while (value >= 0) {
    label = String.fromCharCode((value % 26) + 65) + label;
    value = Math.floor(value / 26) - 1;
  }

  return label;
}

function getSeatIndex(seatNumber) {
  if (typeof seatNumber !== "string") {
    return -1;
  }

  const match = seatNumber.trim().toUpperCase().match(/^([A-Z]+)([1-9]\d*)$/);

  if (!match) {
    return -1;
  }

  const [, rowLabel, seatValue] = match;
  let rowIndex = 0;

  for (const character of rowLabel) {
    rowIndex = rowIndex * 26 + (character.charCodeAt(0) - 64);
  }

  return {
    rowIndex: rowIndex - 1,
    seatIndex: Number(seatValue) - 1,
  };
}

function generateSeatList(rows, seatsPerRow, capacity = rows * seatsPerRow) {
  const seats = [];
  const totalPhysicalSeats = rows * seatsPerRow;
  const maxSeats = Math.min(capacity, totalPhysicalSeats);

  for (let rowIndex = 0; rowIndex < rows; rowIndex += 1) {
    const rowLabel = getRowLabel(rowIndex);

    for (let seatIndex = 1; seatIndex <= seatsPerRow; seatIndex += 1) {
      if (seats.length >= maxSeats) {
        return seats;
      }

      seats.push(`${rowLabel}${seatIndex}`);
    }
  }

  return seats;
}

function isValidSeat(seatNumber, venue) {
  const index = getSeatIndex(seatNumber);

  if (index === -1) {
    return false;
  }

  if (
    index.rowIndex < 0 ||
    index.rowIndex >= venue.rows ||
    index.seatIndex < 0 ||
    index.seatIndex >= venue.seatsPerRow
  ) {
    return false;
  }

  const linearIndex = index.rowIndex * venue.seatsPerRow + index.seatIndex;
  return linearIndex < venue.capacity;
}

function getFirstAvailableSeat(venue, occupiedSeats) {
  const occupied = new Set(occupiedSeats.map((seat) => seat.toUpperCase()));
  const seats = generateSeatList(venue.rows, venue.seatsPerRow, venue.capacity);

  return seats.find((seat) => !occupied.has(seat)) || null;
}

module.exports = {
  generateSeatList,
  getFirstAvailableSeat,
  isValidSeat,
  getSeatIndex,
};
