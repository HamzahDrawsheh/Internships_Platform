"use client";

import { Suspense } from "react";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { DirectMessagesPanel } from "@/components/messaging/DirectMessagesPanel";
import type { MessagingViewerRole } from "@/lib/messaging";

type Props = {
  viewerRole: MessagingViewerRole;
  basePath: string;
  title?: string;
  description?: string;
};

function DirectMessagesShellInner({ viewerRole, basePath, title, description }: Props) {
  return (
    <div>
      <Container className="max-w-6xl">
        <PageHeader title={title ?? "Messages"} description={description ?? "Private conversations stay saved until you delete them."} />
        <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 lg:min-h-[520px]">
          <DirectMessagesPanel viewerRole={viewerRole} variant="page" basePath={basePath} />
        </div>
      </Container>
    </div>
  );
}

export default function DirectMessagesShell(props: Props) {
  return (
    <Suspense fallback={<Container className="py-8"><p className="text-sm text-gray-500">Loading…</p></Container>}>
      <DirectMessagesShellInner {...props} />
    </Suspense>
  );
}
