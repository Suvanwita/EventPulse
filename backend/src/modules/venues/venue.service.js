const prisma = require("../../config/prisma");
const ApiError = require("../../utils/ApiError");

async function createVenue(data) {
  return prisma.venue.create({
    data,
  });
}

async function listVenues() {
  return prisma.venue.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });
}

async function getVenueById(id) {
  const venue = await prisma.venue.findUnique({
    where: {
      id,
    },
  });

  if (!venue) {
    throw new ApiError(404, "Venue not found");
  }

  return venue;
}

async function updateVenue(id, data) {
  const existingVenue = await getVenueById(id);
  const nextVenue = {
    ...existingVenue,
    ...data,
  };

  if (nextVenue.rows * nextVenue.seatsPerRow < nextVenue.capacity) {
    throw new ApiError(
      400,
      "rows * seatsPerRow must be greater than or equal to capacity"
    );
  }

  return prisma.venue.update({
    where: {
      id,
    },
    data,
  });
}

async function deleteVenue(id) {
  await getVenueById(id);

  return prisma.venue.delete({
    where: {
      id,
    },
  });
}

async function getVenueSchedule(id) {
  await getVenueById(id);

  return prisma.event.findMany({
    where: {
      venueId: id,
    },
    orderBy: {
      startTime: "asc",
    },
  });
}

module.exports = {
  createVenue,
  listVenues,
  getVenueById,
  updateVenue,
  deleteVenue,
  getVenueSchedule,
};
