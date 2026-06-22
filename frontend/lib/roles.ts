export type Role = "STUDENT" | "ORGANIZER" | "VOLUNTEER" | "ADMIN";

export const roleNavigation: Record<Role, { label: string; href: string }[]> = {
  STUDENT: [
    { label: "Events", href: "/events" },
    { label: "My Passes", href: "/passes" },
    { label: "My Registrations", href: "/registrations" },
    { label: "Notifications", href: "/notifications" },
  ],
  ORGANIZER: [
    { label: "Dashboard", href: "/organizer/dashboard" },
    { label: "Create Event", href: "/organizer/events/new" },
    { label: "My Events", href: "/organizer/events" },
    { label: "Notifications", href: "/notifications" },
  ],
  VOLUNTEER: [
    { label: "Scanner", href: "/volunteer/scan" },
    { label: "Live Entry", href: "/volunteer/live-entry" },
    { label: "Notifications", href: "/notifications" },
  ],
  ADMIN: [
    { label: "Venues", href: "/admin/venues" },
    { label: "Analytics", href: "/admin/analytics" },
    { label: "Notifications", href: "/notifications" },
  ],
};

export const roleHome: Record<Role, string> = {
  STUDENT: "/events",
  ORGANIZER: "/organizer/dashboard",
  VOLUNTEER: "/volunteer/scan",
  ADMIN: "/admin/venues",
};
