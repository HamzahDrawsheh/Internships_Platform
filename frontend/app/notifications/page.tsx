"use client";

import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button, EmptyState } from "@/components/ui";

export default function NotificationsPage() {
  const notifications: unknown[] = [];

  return (
    <main className="py-8">
      <Container className="max-w-3xl">
        <PageHeader
          title="Notifications"
          description="In-app notification center for all roles."
          action={
            <Button variant="secondary" onClick={() => {}}>
              Mark all read
            </Button>
          }
        />
        {notifications.length === 0 ? (
          <EmptyState
            title="No notifications"
            description="You're all caught up. Notifications will appear here when the feature is enabled."
          />
        ) : (
          <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
            {/* When data exists: list items with unread badge styles (e.g. bg-blue-50 for unread) */}
          </ul>
        )}
      </Container>
    </main>
  );
}
