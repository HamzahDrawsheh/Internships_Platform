"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function CreateDemoButton() {
  const [loading, setLoading] = useState(false);

  const handleCreateDemo = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/create-demo", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data?.error ?? "Failed to create demo accounts");
        return;
      }
      alert("Demo accounts created");
    } catch {
      alert("Failed to create demo accounts");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="secondary"
      onClick={handleCreateDemo}
      disabled={loading}
    >
      {loading ? "Creating…" : "Create Demo Accounts"}
    </Button>
  );
}
