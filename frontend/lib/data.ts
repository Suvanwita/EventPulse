export type Status = "open" | "filling" | "waitlist" | "closed" | "live";

export const events = [
  {
    id: "founders-night",
    title: "Founders Night",
    date: "Jun 21, 2026",
    time: "6:30 PM",
    venue: "Innovation Hall",
    category: "Entrepreneurship",
    status: "filling" as Status,
    capacity: 280,
    checkedIn: 214,
    waitlist: 32,
    image: "linear-gradient(135deg, #1c7c6e, #f3b23f)",
    description: "A campus showcase with founder talks, live demos, and mentor tables.",
  },
  {
    id: "robotics-arena",
    title: "Robotics Arena",
    date: "Jun 24, 2026",
    time: "2:00 PM",
    venue: "Tech Quad",
    category: "Competition",
    status: "open" as Status,
    capacity: 180,
    checkedIn: 73,
    waitlist: 0,
    image: "linear-gradient(135deg, #264653, #2a9d8f)",
    description: "Autonomous bot heats, repair pits, and a live leaderboard.",
  },
  {
    id: "film-under-stars",
    title: "Film Under the Stars",
    date: "Jun 27, 2026",
    time: "8:00 PM",
    venue: "North Lawn",
    category: "Culture",
    status: "waitlist" as Status,
    capacity: 420,
    checkedIn: 409,
    waitlist: 68,
    image: "linear-gradient(135deg, #2b2d42, #e76f51)",
    description: "Outdoor screening with reserved lawn zones and food truck queues.",
  },
];

export const stats = [
  { label: "Live events", value: "12", delta: "+3 today" },
  { label: "Checked in", value: "1,842", delta: "84% scan rate" },
  { label: "Waitlisted", value: "219", delta: "Across 5 venues" },
  { label: "Peak crowd", value: "91%", delta: "Student Center" },
];

export const venues = [
  { name: "Innovation Hall", capacity: 280, occupancy: 76, status: "live" as Status },
  { name: "Tech Quad", capacity: 180, occupancy: 41, status: "open" as Status },
  { name: "North Lawn", capacity: 420, occupancy: 97, status: "waitlist" as Status },
  { name: "Student Center", capacity: 350, occupancy: 88, status: "filling" as Status },
];

export const scans = [
  { attendee: "Maya Chen", pass: "EP-1048", event: "Founders Night", status: "Valid" },
  { attendee: "Arjun Mehta", pass: "EP-1072", event: "Founders Night", status: "Already used" },
  { attendee: "Nora Smith", pass: "EP-1191", event: "Film Under the Stars", status: "Waitlist" },
];

