"use client";

import { Suspense } from "react";
import DirectMessagesShell from "@/components/messaging/DirectMessagesShell";

function Fallback() {
  return (
    <div className="px-4 py-8 text-sm text-gray-500 dark:text-gray-400 sm:px-6 lg:px-8">
      Loading messages…
    </div>
  );
}

export default function CompanyMessagesPage() {
  return (
    <Suspense fallback={<Fallback />}>
      <DirectMessagesShell viewerRole="company" basePath="/company/messages" />
    </Suspense>
  );
}
