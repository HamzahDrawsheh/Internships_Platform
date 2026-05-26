import { Container } from "@/components/layout/Container";
import CompanyInternshipsList from "./CompanyInternshipsList";

export default function ManageInternshipsPage() {
  return (
    <main className="pb-10 transition-colors duration-300 dark:bg-slate-950 dark:text-white">
      <Container>
        <CompanyInternshipsList />
      </Container>
    </main>
  );
}
