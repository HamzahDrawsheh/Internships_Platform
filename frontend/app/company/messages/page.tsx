"use client";

import { Suspense } from "react";
import { MessagesPageSkeleton } from "@/components/loading";
import DirectMessagesShell from "@/components/messaging/DirectMessagesShell";

function Fallback() {
  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <MessagesPageSkeleton />
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
