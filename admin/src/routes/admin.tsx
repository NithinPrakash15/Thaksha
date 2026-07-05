import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin")({
  component: Admin,
});

function Admin() {
  // Avoid route-template mismatch issues and ensure something reliable shows.
  throw redirect({ to: "/admin-login" });
}
