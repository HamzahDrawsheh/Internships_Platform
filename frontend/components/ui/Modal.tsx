"use client";

import { useEffect } from "react";
import { Button } from "./Button";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Wider dialog for long-form content (e.g. cover letter). */
  size?: "md" | "lg";
}

export function Modal({ isOpen, onClose, title, children, footer, size = "md" }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className="fixed inset-0 bg-black/50"
        aria-hidden
        onClick={onClose}
      />
      <div
        className={`relative z-10 w-full rounded-lg bg-white shadow-xl transition-colors duration-300 dark:bg-slate-900 ${
          size === "lg" ? "max-w-2xl" : "max-w-lg"
        }`}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 transition-colors duration-300 dark:border-slate-800">
          <h2 id="modal-title" className="text-lg font-semibold text-gray-900 transition-colors duration-300 dark:text-white">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-gray-400 transition-colors duration-300 hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
            aria-label="Close"
          >
            <span className="text-xl leading-none">&times;</span>
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-6 py-4 transition-colors duration-300 dark:text-white">{children}</div>
        {footer !== undefined ? (
          <div className="flex justify-end gap-2 border-t border-gray-200 px-6 py-4 transition-colors duration-300 dark:border-slate-800">
            {footer}
          </div>
        ) : (
          <div className="flex justify-end border-t border-gray-200 px-6 py-4 transition-colors duration-300 dark:border-slate-800">
            <Button variant="secondary" className="transition-colors duration-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700" onClick={onClose}>
              Close
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
