"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { Button, Modal } from "@/components/ui";
import { performLogout } from "@/lib/auth/logout";
import { useI18n } from "@/lib/i18n/context";

type LogoutOptions = { beforeSignOut?: () => void };

type LogoutConfirmContextValue = {
  requestLogout: (options?: LogoutOptions) => void;
};

const LogoutConfirmContext = createContext<LogoutConfirmContextValue | null>(null);

export function LogoutConfirmProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const pendingOptions = useRef<LogoutOptions | undefined>(undefined);

  const requestLogout = useCallback((options?: LogoutOptions) => {
    pendingOptions.current = options;
    setOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    if (signingOut) return;
    setOpen(false);
    pendingOptions.current = undefined;
  }, [signingOut]);

  const handleConfirm = useCallback(async () => {
    setSigningOut(true);
    try {
      await performLogout(router, pendingOptions.current);
      setOpen(false);
      pendingOptions.current = undefined;
    } finally {
      setSigningOut(false);
    }
  }, [router]);

  return (
    <LogoutConfirmContext.Provider value={{ requestLogout }}>
      {children}
      <Modal
        isOpen={open}
        onClose={handleClose}
        title={t("nav.logoutConfirmTitle")}
        footer={
          <>
            <Button variant="secondary" onClick={handleClose} disabled={signingOut}>
              {t("nav.logoutConfirmCancel")}
            </Button>
            <Button variant="primary" onClick={() => void handleConfirm()} disabled={signingOut}>
              {signingOut ? t("nav.logoutConfirmInProgress") : t("nav.logout")}
            </Button>
          </>
        }
      >
        <p className="text-sm leading-relaxed text-gray-600 dark:text-slate-300">
          {t("nav.logoutConfirm")}
        </p>
      </Modal>
    </LogoutConfirmContext.Provider>
  );
}

export function useLogoutConfirm(): LogoutConfirmContextValue {
  const ctx = useContext(LogoutConfirmContext);
  if (!ctx) {
    throw new Error("useLogoutConfirm must be used within LogoutConfirmProvider");
  }
  return ctx;
}
