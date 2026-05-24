"use client";

import { Container } from "@/components/layout/Container";
import { useI18n } from "@/lib/i18n/context";

const EMAIL_PATTERN = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;

function isEmail(value: string) {
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value);
}

function RichText({ text }: { text: string }) {
  if (!text) return null;

  const parts = text.split(EMAIL_PATTERN);

  return (
    <p className="legal-body">
      {parts.map((part, index) =>
        isEmail(part) ? (
          <a key={`${part}-${index}`} href={`mailto:${part}`} className="legal-link">
            {part}
          </a>
        ) : (
          <span key={`${part}-${index}`}>{part}</span>
        ),
      )}
    </p>
  );
}
function LegalBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <h3 className="legal-section-heading">{title}</h3>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="legal-list">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function LegalSectionShell({
  id,
  badge,
  title,
  children,
  className = "",
}: {
  id: string;
  badge: string;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  const { t } = useI18n();

  return (
    <section
      id={id}
      className={`legal-document scroll-mt-16 border-t border-slate-200 py-16 transition-colors duration-300 dark:border-slate-800 lg:py-24 ${className}`}
    >
      <Container>
        <div className="mx-auto max-w-3xl">
          <header className="text-center sm:text-start">
            <p className="legal-eyebrow">{badge}</p>
            <h2 className="legal-title mt-3">{title}</h2>
            <p className="legal-meta mt-4">{t("legal.lastUpdated")}</p>
            <div className="legal-divider mt-8" aria-hidden />
          </header>

          <article className="mt-10 space-y-10 sm:mt-12 sm:space-y-12">{children}</article>

          <div className="legal-divider mt-12" aria-hidden />
          <p className="legal-footer mt-8 text-center">{t("legal.sectionFooter")}</p>
        </div>
      </Container>
    </section>
  );
}

function PrivacySection() {
  const { t } = useI18n();

  return (
    <LegalSectionShell
      id="privacy"
      badge={t("legal.privacy.badge")}
      title={t("legal.privacy.title")}
      className="bg-white dark:bg-slate-950"
    >
      <LegalBlock title={t("legal.privacy.introTitle")}>
        <RichText text={t("legal.privacy.intro1")} />
        <RichText text={t("legal.privacy.intro2")} />
      </LegalBlock>

      <LegalBlock title={t("legal.privacy.collectedTitle")}>
        <BulletList
          items={[
            t("legal.privacy.collect1"),
            t("legal.privacy.collect2"),
            t("legal.privacy.collect3"),
            t("legal.privacy.collect4"),
            t("legal.privacy.collect5"),
            t("legal.privacy.collect6"),
          ]}
        />
      </LegalBlock>

      <LegalBlock title={t("legal.privacy.useTitle")}>
        <BulletList
          items={[
            t("legal.privacy.use1"),
            t("legal.privacy.use2"),
            t("legal.privacy.use3"),
            t("legal.privacy.use4"),
            t("legal.privacy.use5"),
          ]}
        />
      </LegalBlock>

      <LegalBlock title={t("legal.privacy.securityTitle")}>
        <RichText text={t("legal.privacy.securityBody")} />
      </LegalBlock>

      <LegalBlock title={t("legal.privacy.rightsTitle")}>
        <BulletList
          items={[
            t("legal.privacy.rights1"),
            t("legal.privacy.rights2"),
            t("legal.privacy.rights3"),
            t("legal.privacy.rights4"),
          ]}
        />
        <RichText text={t("legal.privacy.rightsContact")} />
      </LegalBlock>

      <LegalBlock title={t("legal.privacy.updatesTitle")}>
        <RichText text={t("legal.privacy.updatesBody")} />
      </LegalBlock>
    </LegalSectionShell>
  );
}

function TermsSection() {
  const { t } = useI18n();

  return (
    <LegalSectionShell
      id="terms"
      badge={t("legal.terms.badge")}
      title={t("legal.terms.title")}
      className="bg-white dark:bg-slate-950"
    >
      <RichText text={t("legal.terms.intro")} />

      <LegalBlock title={t("legal.terms.acceptanceTitle")}>
        <RichText text={t("legal.terms.acceptanceBody")} />
      </LegalBlock>

      <LegalBlock title={t("legal.terms.registrationTitle")}>
        <BulletList
          items={[
            t("legal.terms.registration1"),
            t("legal.terms.registration2"),
            t("legal.terms.registration3"),
            t("legal.terms.registration4"),
            t("legal.terms.registration5"),
          ]}
        />
      </LegalBlock>

      <LegalBlock title={t("legal.terms.prohibitedTitle")}>
        <BulletList
          items={[
            t("legal.terms.prohibited1"),
            t("legal.terms.prohibited2"),
            t("legal.terms.prohibited3"),
            t("legal.terms.prohibited4"),
            t("legal.terms.prohibited5"),
          ]}
        />
      </LegalBlock>

      <LegalBlock title={t("legal.terms.liabilityTitle")}>
        <RichText text={t("legal.terms.liabilityBody")} />
      </LegalBlock>

      <LegalBlock title={t("legal.terms.ipTitle")}>
        <RichText text={t("legal.terms.ipBody")} />
      </LegalBlock>

      <LegalBlock title={t("legal.terms.contactTitle")}>
        <RichText text={t("legal.terms.contactBody")} />
      </LegalBlock>
    </LegalSectionShell>
  );
}

export function LandingLegalSections() {
  return (
    <>
      <PrivacySection />
      <TermsSection />
    </>
  );
}
