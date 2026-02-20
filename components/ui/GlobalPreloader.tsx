"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

export function GlobalPreloader() {
  const pathname = usePathname();

  const [visible, setVisible] = useState(false);
  const persistentCountRef = useRef(0);
  const transientCountRef = useRef(0);
  const timersRef = useRef<number[]>([]);

  const updateVisibility = useCallback(() => {
    setVisible(persistentCountRef.current > 0 || transientCountRef.current > 0);
  }, []);

  const addTimer = useCallback((callback: () => void, ms: number) => {
    const timer = window.setTimeout(() => {
      callback();
      timersRef.current = timersRef.current.filter((id) => id !== timer);
    }, ms);

    timersRef.current.push(timer);
  }, []);

  const startPersistent = useCallback(() => {
    persistentCountRef.current += 1;
    updateVisibility();

    addTimer(() => {
      persistentCountRef.current = Math.max(0, persistentCountRef.current - 1);
      updateVisibility();
    }, 20000);
  }, [addTimer, updateVisibility]);

  const startTransient = useCallback((duration = 650) => {
    transientCountRef.current += 1;
    updateVisibility();

    addTimer(() => {
      transientCountRef.current = Math.max(0, transientCountRef.current - 1);
      updateVisibility();
    }, duration);
  }, [addTimer, updateVisibility]);

  const shouldTriggerButtonLoading = useCallback((button: HTMLButtonElement) => {
    if (button.disabled || button.getAttribute("aria-disabled") === "true") {
      return false;
    }

    if (button.getAttribute("data-preloader") === "off") {
      return false;
    }

    if (button.closest("form")) {
      return false;
    }

    return (
      button.getAttribute("data-preloader") === "on" ||
      button.getAttribute("data-loading") === "true" ||
      button.getAttribute("aria-busy") === "true"
    );
  }, []);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) {
        return;
      }

      const anchor = target.closest("a[href]") as HTMLAnchorElement | null;
      if (anchor) {
        const href = anchor.getAttribute("href") ?? "";
        const isSameTab = !anchor.target || anchor.target === "_self";
        const isInternal = href.startsWith("/");
        const isHash = href.startsWith("#");
        const isModifiedClick = event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
        const isPrimaryButton = event.button === 0;

        if (isSameTab && isInternal && !isHash && !anchor.hasAttribute("download") && isPrimaryButton && !isModifiedClick) {
          startPersistent();
          return;
        }
      }

      const button = target.closest("button") as HTMLButtonElement | null;
      if (button && shouldTriggerButtonLoading(button)) {
        startTransient(500);
      }
    };

    const onSubmit = () => {
      startPersistent();
    };

    document.addEventListener("click", onClick, true);
    document.addEventListener("submit", onSubmit, true);

    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("submit", onSubmit, true);
    };
  }, [shouldTriggerButtonLoading, startPersistent, startTransient]);

  useEffect(() => {
    persistentCountRef.current = 0;
    addTimer(() => {
      updateVisibility();
    }, 120);
  }, [addTimer, pathname, updateVisibility]);

  useEffect(() => {
    return () => {
      for (const timer of timersRef.current) {
        window.clearTimeout(timer);
      }
    };
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center bg-red-950/50 backdrop-blur-sm">
      <div className="flex items-center gap-3 rounded-2xl border border-yellow-500/45 bg-gradient-to-br from-red-900/95 to-red-800/90 px-5 py-3 text-sm font-semibold text-yellow-100 shadow-sm">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-yellow-200/35 border-t-yellow-200" />
        <span>Please wait...</span>
      </div>
    </div>
  );
}
