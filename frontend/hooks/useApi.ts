"use client";

import { api, getAccessToken } from "@/lib/api";

/**
 * Hook that exposes the API client and token getter for components.
 * Use api.get/post/patch for requests; token is attached automatically in the browser.
 */
export function useApi() {
  return { api, getAccessToken };
}
