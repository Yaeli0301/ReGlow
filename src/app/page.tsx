import { canStartLandingDemo } from "@/lib/env";
import { LandingPage } from "@/components/landing/LandingPage";

/** Read ENABLE_LANDING_DEMO at request time (not static build). */
export const dynamic = "force-dynamic";

export default function HomePage() {
  return <LandingPage showDemoCta={canStartLandingDemo()} />;
}
