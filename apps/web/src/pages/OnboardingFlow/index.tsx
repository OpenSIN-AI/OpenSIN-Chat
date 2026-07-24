// SPDX-License-Identifier: MIT
import { Navigate } from "react-router";
import paths from "@/utils/paths";

// Onboarding is permanently disabled for this instance. All /onboarding/* routes
// redirect to home immediately without rendering the onboarding UI.
export default function OnboardingFlow() {
  return <Navigate to={paths.home()} replace />;
}
