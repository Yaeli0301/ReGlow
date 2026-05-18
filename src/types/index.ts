export type SubscriptionTier = "none" | "basic" | "pro" | "premium";

export type ClientStatus = "active" | "atRisk" | "lost";

export type AppointmentStatus = "scheduled" | "completed" | "canceled";

export interface SessionUser {
  id: string;
  email: string;
  businessName: string;
  subscriptionTier: SubscriptionTier;
}

export const PLAN_FEATURES = {
  none: { clients: false, dashboard: false, appointments: false, lostClients: false, booking: false, automation: false },
  basic: { clients: true, dashboard: true, appointments: false, lostClients: false, booking: false, automation: false },
  pro: { clients: true, dashboard: true, appointments: true, lostClients: true, booking: false, automation: true },
  premium: { clients: true, dashboard: true, appointments: true, lostClients: true, booking: true, automation: true },
} as const;

export const PLANS = [
  {
    id: "basic" as const,
    name: "Basic",
    price: 99,
    description: "Client management & dashboard",
    popular: false,
    tag: null,
  },
  {
    id: "pro" as const,
    name: "Pro",
    price: 199,
    description: "Appointments, lost clients & automation",
    popular: true,
    tag: "Most Popular",
  },
  {
    id: "premium" as const,
    name: "Premium",
    price: 299,
    description: "Online booking page + everything in Pro",
    popular: false,
    tag: "Saves 5+ hours/week",
  },
];
