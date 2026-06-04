"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { IconMagnifyingGlass } from "@/components/layout/icons";
import { SidebarIcon, type SidebarIconName } from "@/components/layout/SidebarIcon";
import { openStudentAssistant } from "@/lib/ai/open-student-assistant";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/context";
import {
  buildLocalNavbarResults,
  EMPTY_NAVBAR_SEARCH_RESULTS,
  getNavbarSearchRoleConfig,
  prefetchNavbarSearchCache,
  REMOTE_SEARCH_MIN_CHARS,
  searchAdminRemote,
  searchPublicCatalog,
  type NavbarSearchCache,
  type NavbarSearchResults,
} from "@/lib/search/navbar-search";
import type { ProfileRole } from "@/lib/types";

const DEBOUNCE_MS = 150;

type Props = {
  role: ProfileRole;
};

export function RoleNavbarSearch({ role }: Props) {
  const { t } = useI18n();
  const router = useRouter();
  const config = getNavbarSearchRoleConfig(role);
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const cacheRef = useRef<NavbarSearchCache>({ people: [], records: [] });
  const prefetchStartedRef = useRef(false);

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loadingRemote, setLoadingRemote] = useState(false);
  const [results, setResults] = useState<NavbarSearchResults>(EMPTY_NAVBAR_SEARCH_RESULTS);
  const queryRef = useRef(query);
  queryRef.current = query;

  useEffect(() => {
    prefetchStartedRef.current = false;
    cacheRef.current = { people: [], records: [] };
    setResults(EMPTY_NAVBAR_SEARCH_RESULTS);
    setQuery("");
    setLoadingRemote(false);
  }, [role]);

  useEffect(() => {
    if (prefetchStartedRef.current) return;
    prefetchStartedRef.current = true;
    const supabase = createClient();
    void prefetchNavbarSearchCache(supabase, role).then((cache) => {
      cacheRef.current = cache;
      const q = queryRef.current.trim();
      if (!q) return;
      const local = buildLocalNavbarResults(role, q, t, cache);
      setResults((prev) => ({
        ...prev,
        pages: local.pages,
        people: local.people,
        records: local.records,
      }));
    });
  }, [role, t]);

  const runLocalSearch = useCallback(
    (raw: string) => {
      const q = raw.trim();
      if (!q) {
        setResults(EMPTY_NAVBAR_SEARCH_RESULTS);
        return;
      }
      setResults((prev) => {
        const local = buildLocalNavbarResults(role, q, t, cacheRef.current);
        return {
          pages: local.pages,
          people: local.people,
          records: local.records,
          internships: prev.internships,
          companies: prev.companies,
        };
      });
    },
    [role, t],
  );

  const runRemoteSearch = useCallback(
    (raw: string) => {
      const q = raw.trim();
      abortRef.current?.abort();

      if (config.remoteMode === "none" || !q || q.length < REMOTE_SEARCH_MIN_CHARS) {
        setResults((prev) => ({ ...prev, internships: [], companies: [] }));
        setLoadingRemote(false);
        return;
      }

      const controller = new AbortController();
      abortRef.current = controller;
      setLoadingRemote(true);
      setResults((prev) => ({ ...prev, internships: [], companies: [] }));

      const supabase = createClient();

      const finish = (patch: Partial<NavbarSearchResults>) => {
        if (controller.signal.aborted) return;
        setResults((prev) => ({ ...prev, ...patch }));
        setLoadingRemote(false);
      };

      if (config.remoteMode === "admin") {
        void searchAdminRemote(supabase, q, cacheRef.current, controller.signal).then((remote) => {
          if (controller.signal.aborted) return;
          setResults((prev) => {
            const seen = new Set(prev.people.map((p) => p.id));
            const merged = [...prev.people];
            for (const p of remote.people) {
              if (!seen.has(p.id)) merged.push(p);
            }
            return {
              ...prev,
              internships: remote.internships,
              people: merged.slice(0, 8),
            };
          });
          setLoadingRemote(false);
        });
        return;
      }

      void searchPublicCatalog(supabase, q, controller.signal).then((remote) => finish(remote));
    },
    [config.remoteMode, role, t],
  );

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    runLocalSearch(query);
  }, [query, open, runLocalSearch]);

  useEffect(() => {
    if (!open) return;
    const tId = window.setTimeout(() => runRemoteSearch(query), DEBOUNCE_MS);
    return () => window.clearTimeout(tId);
  }, [query, open, runRemoteSearch]);

  const hasResults =
    results.pages.length > 0 ||
    results.people.length > 0 ||
    results.records.length > 0 ||
    results.internships.length > 0 ||
    results.companies.length > 0;
  const showPanel = open && query.trim().length > 0;
  const showRemotePending =
    loadingRemote && config.remoteMode !== "none" && query.trim().length >= REMOTE_SEARCH_MIN_CHARS;

  const closePanel = () => {
    abortRef.current?.abort();
    setOpen(false);
    setQuery("");
    setResults(EMPTY_NAVBAR_SEARCH_RESULTS);
    setLoadingRemote(false);
  };

  const closeAndNavigate = (href: string) => {
    closePanel();
    router.push(href);
  };

  const selectPage = (href: string, action?: "open-assistant") => {
    closePanel();
    if (action === "open-assistant" && role === "student") {
      openStudentAssistant();
      if (href && !href.startsWith("#")) router.push(href);
      return;
    }
    router.push(href);
  };

  const browseAllHref = config.browseAllHref?.(query.trim());

  return (
    <div ref={rootRef} className="relative w-full min-w-0 md:max-w-xl md:flex-1">
      <span
        className="pointer-events-none absolute start-3 top-1/2 z-10 -translate-y-1/2 text-violet-600 dark:text-violet-400"
        aria-hidden
      >
        <IconMagnifyingGlass />
      </span>
      <input
        type="search"
        value={query}
        onChange={(e) => {
          const v = e.target.value;
          setQuery(v);
          if (v.trim()) runLocalSearch(v);
          else setResults(EMPTY_NAVBAR_SEARCH_RESULTS);
        }}
        onFocus={() => setOpen(true)}
        placeholder={t(config.placeholderKey)}
        className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/90 px-10 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-violet-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-slate-700 dark:bg-slate-900/80 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-violet-500/50 dark:focus:bg-slate-900"
        role="combobox"
        aria-expanded={showPanel}
        aria-controls={listboxId}
        aria-autocomplete="list"
      />

      {showPanel ? (
        <div
          id={listboxId}
          role="listbox"
          className="absolute start-0 end-0 top-[calc(100%+6px)] z-[60] max-h-[min(60vh,360px)] overflow-y-auto rounded-xl border border-slate-200 bg-white py-2 shadow-xl shadow-slate-200/60 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/40 md:max-h-[min(70vh,480px)]"
        >
          {!hasResults && !showRemotePending ? (
            <p className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
              {t("nav.navbarSearchNoResults")}
            </p>
          ) : (
            <>
              {results.pages.length > 0 ? (
                <SearchSection title={t("nav.navbarSearchPages")}>
                  {results.pages.map((link) => (
                    <NavResultRow
                      key={`${link.href}-${link.labelKey}`}
                      icon={link.icon}
                      title={t(link.labelKey)}
                      onSelect={() => selectPage(link.href, link.action)}
                    />
                  ))}
                </SearchSection>
              ) : null}
              {results.people.length > 0 && config.peopleSectionKey ? (
                <SearchSection title={t(config.peopleSectionKey)}>
                  {results.people.map((hit) => (
                    <NavResultRow
                      key={hit.id}
                      icon={hit.icon}
                      title={hit.name}
                      subtitle={hit.subtitle ?? undefined}
                      onSelect={() => closeAndNavigate(hit.href)}
                    />
                  ))}
                </SearchSection>
              ) : null}
              {results.records.length > 0 && config.recordsSectionKey ? (
                <SearchSection title={t(config.recordsSectionKey)}>
                  {results.records.map((hit) => (
                    <NavResultRow
                      key={hit.id}
                      icon={hit.icon}
                      title={hit.title}
                      subtitle={hit.subtitle ?? undefined}
                      onSelect={() => closeAndNavigate(hit.href)}
                    />
                  ))}
                </SearchSection>
              ) : null}
              {results.internships.length > 0 ? (
                <SearchSection title={t("nav.navbarSearchInternships")}>
                  {results.internships.map((hit) => (
                    <NavResultRow
                      key={hit.id}
                      icon="briefcase"
                      title={hit.title}
                      subtitle={[hit.companyName, hit.location].filter(Boolean).join(" · ")}
                      onSelect={() =>
                        closeAndNavigate(
                          role === "admin" ? `/admin/internships` : `/internships/${hit.id}`,
                        )
                      }
                    />
                  ))}
                </SearchSection>
              ) : null}
              {results.companies.length > 0 ? (
                <SearchSection title={t("nav.navbarSearchCompanies")}>
                  {results.companies.map((hit) => (
                    <NavResultRow
                      key={hit.id}
                      icon="building"
                      title={hit.name}
                      subtitle={hit.location ?? undefined}
                      onSelect={() =>
                        closeAndNavigate(
                          role === "supervisor"
                            ? `/supervisor/companies/${hit.id}`
                            : `/companies/${hit.id}`,
                        )
                      }
                    />
                  ))}
                </SearchSection>
              ) : null}
              {showRemotePending ? (
                <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-400 dark:border-slate-800 dark:text-slate-500">
                  {t("nav.navbarSearchLoadingMore")}
                </p>
              ) : null}
              {browseAllHref ? (
                <div className="border-t border-slate-100 px-4 py-2 dark:border-slate-800">
                  <Link
                    href={browseAllHref}
                    className="text-xs font-medium text-violet-700 hover:text-violet-900 dark:text-violet-300"
                    onClick={closePanel}
                  >
                    {t("nav.navbarSearchBrowseAll")}
                  </Link>
                </div>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

function SearchSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="px-2 pb-1">
      <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
        {title}
      </p>
      {children}
    </section>
  );
}

function NavResultRow({
  icon,
  title,
  subtitle,
  onSelect,
}: {
  icon: SidebarIconName;
  title: string;
  subtitle?: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="option"
      onClick={onSelect}
      className="flex w-full items-start gap-3 rounded-lg px-2 py-2 text-start transition-colors hover:bg-violet-50 dark:hover:bg-violet-500/10"
    >
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-200">
        <SidebarIcon name={icon} />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-slate-900 dark:text-white">{title}</span>
        {subtitle ? (
          <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{subtitle}</span>
        ) : null}
      </span>
    </button>
  );
}
