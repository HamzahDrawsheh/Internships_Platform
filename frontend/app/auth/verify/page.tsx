import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui";

export default function VerifyEmailPage() {
  return (
    <main className="py-12">
      <Container className="mx-auto max-w-md">
        <h1 className="text-2xl font-bold text-gray-900">Email verified</h1>
        <p className="mt-2 text-gray-600">
          Your email has been verified. You can now sign in to your account.
        </p>
        <div className="mt-6">
          <Link href="/auth/login">
            <Button variant="primary">Back to Login</Button>
          </Link>
        </div>
      </Container>
    </main>
  );
}
