"use client";
import { useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";
import type { UserRole } from "@/types";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function useLocalStorageValue(key: string): string {
  return useSyncExternalStore(
    subscribe,
    () => localStorage.getItem(key) || "",
    () => ""
  );
}

export function useRole() {
  const router = useRouter();
  const role = (useLocalStorageValue("role") as UserRole) || null;
  const wallet = useLocalStorageValue("wallet");
  const userName = useLocalStorageValue("userName");
  const userId = useLocalStorageValue("userId");
  const token = useLocalStorageValue("jwt");
  const holderId = useLocalStorageValue("holderId");

  function logout() {
    localStorage.removeItem("jwt");
    localStorage.removeItem("role");
    localStorage.removeItem("wallet");
    localStorage.removeItem("userName");
    localStorage.removeItem("userId");
    localStorage.removeItem("holderId");
    router.push("/login");
  }

  return { role, wallet, userName, userId, token, holderId, logout };
}
