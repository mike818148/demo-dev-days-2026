import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { RoleDocument } from "sailpoint-api-client";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Check if requestCommentsRequired is true for a role.
 * Checks the first-level boolean attribute requestCommentsRequired.
 * Returns false if the attribute doesn't exist or is not a boolean.
 */
export function isRequestCommentsRequired(role: RoleDocument): boolean {
  const direct = (role as any).requestCommentsRequired;
  if (typeof direct === "boolean") return direct;
  return false;
}
