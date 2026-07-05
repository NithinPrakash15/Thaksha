import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

const ADMIN_APP_ORIGIN = "http://10.113.0.114:8081";

export const Route = createFileRoute("/admin-login")({
  component: AdminLoginRedirect,
});

function AdminLoginRedirect() {
  useEffect(() => {
    // Admin app is served separately (admin/). Redirect immediately.
    window.location.replace(`${ADMIN_APP_ORIGIN}/admin-login/`);
  }, []);

  return null;
}

