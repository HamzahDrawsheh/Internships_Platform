import { Container } from "@/components/layout/Container";

const steps = [
  {
    step: "1",
    title: "Sign up & complete your profile",
    description:
      "Students add skills and CV; companies add company info and create listings. Supervisors join to track placements.",
  },
  {
    step: "2",
    title: "Discover & apply",
    description:
      "Browse internships, filter by skill and location, and apply with one click. Companies review applicants in one place.",
  },
  {
    step: "3",
    title: "Track & get placed",
    description:
      "Follow application status and get notified when companies respond. Supervisors can export reports for their department.",
  },
];

export function HowItWorks() {
  return (
    <section className="py-20 sm:py-28" id="how-it-works">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            How it works
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            From signup to placement — everything in one platform.
          </p>
        </div>
        <div className="mx-auto mt-16 grid max-w-5xl gap-10 sm:grid-cols-3">
          {steps.map((item) => (
            <div
              key={item.step}
              className="relative rounded-2xl border border-gray-200 bg-white p-8 shadow-sm transition-shadow hover:shadow-md"
            >
              <span
                className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-900 text-lg font-semibold text-white"
                aria-hidden
              >
                {item.step}
              </span>
              <h3 className="mt-6 text-lg font-semibold text-gray-900">{item.title}</h3>
              <p className="mt-3 text-sm leading-6 text-gray-600">{item.description}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
