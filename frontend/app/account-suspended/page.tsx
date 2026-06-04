"use client";

import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui";
import { useLogoutConfirm } from "@/components/auth/LogoutConfirmProvider";

export default function AccountSuspendedPage() {
  const { requestLogout } = useLogoutConfirm();

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-950">
      <Container className="max-w-lg">
        <div className="rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm dark:border-red-500/30 dark:bg-gray-900">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Account suspended</h1>
          <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
            Your account has been suspended by a platform administrator. Contact support if you believe this is a
            mistake.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button variant="secondary" onClick={() => requestLogout()}>
              Sign out
            </Button>
            <Link href="/">
              <Button variant="primary">Back to home</Button>
            </Link>
          </div>
        </div>
      </Container>
    </main>
  );
}
