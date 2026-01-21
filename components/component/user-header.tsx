"use client";

import * as React from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { LogOut, Moon, Sun, User, UserCircle } from "lucide-react";
import { signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import Link from "next/link";

interface UserHeaderProps {
  name: string;
  email: string;
}

export function UserHeader({ name, email }: UserHeaderProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  // Track if component has mounted on the client to prevent hydration mismatches.
  // During SSR, the theme is unknown (stored in localStorage/system), so we show
  // a safe fallback. After mounting, we can safely access the theme and render
  // theme-aware content. This prevents React hydration errors.
  const [mounted, setMounted] = React.useState(false);

  // Generate initials from name
  const getInitials = (name: string) => {
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Set mounted to true after component mounts on the client.
  // This ensures theme-dependent rendering only happens client-side,
  // preventing server/client HTML mismatch errors.
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Use resolvedTheme to get the actual theme (handles "system" theme).
  // Only check theme after mounting to avoid hydration mismatches.
  const isDark = mounted ? (resolvedTheme ?? theme) === "dark" : false;

  return (
    <header className="bg-primary text-primary-foreground py-3 px-6 flex items-center justify-between relative z-50">
      <div className="text-lg font-semibold text-primary-foreground">
        ACME Custom Access Request Portal
      </div>
      <div className="flex items-center gap-4">
        <NavigationMenu>
          <NavigationMenuList>
            <NavigationMenuItem>
              <NavigationMenuTrigger className="text-primary-foreground hover:text-primary/80 hover:bg-transparent data-[state=open]:bg-transparent data-[state=open]:text-primary/80 bg-transparent">
                Access Requests
              </NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="grid w-[200px] gap-1 p-2">
                  <li>
                    <NavigationMenuLink asChild>
                      <Link
                        href="/"
                        className="group block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                      >
                        <div className="text-sm font-medium leading-none group-hover:text-accent-foreground">
                          Manage User Access
                        </div>
                        <p className="line-clamp-2 text-xs leading-snug text-muted-foreground group-hover:text-accent-foreground/80">
                          Create and manage access requests
                        </p>
                      </Link>
                    </NavigationMenuLink>
                  </li>
                  <li>
                    <NavigationMenuLink asChild>
                      <Link
                        href="/myrequests"
                        className="group block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                      >
                        <div className="text-sm font-medium leading-none group-hover:text-accent-foreground">
                          Track My Request
                        </div>
                        <p className="line-clamp-2 text-xs leading-snug text-muted-foreground group-hover:text-accent-foreground/80">
                          View and track your access requests
                        </p>
                      </Link>
                    </NavigationMenuLink>
                  </li>
                  {/* Disable approval for now */}
                  {false && (
                    <li>
                      <NavigationMenuLink asChild>
                        <Link
                          href="/approve"
                          className="group block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                        >
                          <div className="text-sm font-medium leading-none group-hover:text-accent-foreground">
                            Approve Access
                          </div>
                          <p className="line-clamp-2 text-xs leading-snug text-muted-foreground group-hover:text-accent-foreground/80">
                            Review and approve pending requests
                          </p>
                        </Link>
                      </NavigationMenuLink>
                    </li>
                  )}
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
        <NavigationMenu>
          <NavigationMenuList>
            <NavigationMenuItem>
              <NavigationMenuTrigger className="text-primary-foreground hover:text-primary/80 hover:bg-transparent data-[state=open]:bg-transparent data-[state=open]:text-primary/80 bg-transparent">
                Access Review
              </NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="grid w-[200px] gap-1 p-2">
                  <li>
                    <NavigationMenuLink asChild>
                      <Link
                        href="/certification"
                        className="group block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                      >
                        <div className="text-sm font-medium leading-none group-hover:text-accent-foreground">
                          Certification Management
                        </div>
                        <p className="line-clamp-2 text-xs leading-snug text-muted-foreground group-hover:text-accent-foreground/80">
                          Review and manage certifications
                        </p>
                      </Link>
                    </NavigationMenuLink>
                  </li>
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
        <NavigationMenu>
          <NavigationMenuList>
            <NavigationMenuItem>
              <NavigationMenuTrigger className="text-primary-foreground hover:text-primary/80 hover:bg-transparent data-[state=open]:bg-transparent data-[state=open]:text-primary/80 bg-transparent">
                Policy
              </NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="grid w-[220px] gap-1 p-2">
                  <li>
                    <NavigationMenuLink asChild>
                      <Link
                        href="/policy"
                        className="group block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                      >
                        <div className="text-sm font-medium leading-none group-hover:text-accent-foreground">
                          Policy Management
                        </div>
                        <p className="line-clamp-2 text-xs leading-snug text-muted-foreground group-hover:text-accent-foreground/80">
                          Browse SOD policies and review violations
                        </p>
                      </Link>
                    </NavigationMenuLink>
                  </li>
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
        <NavigationMenu>
          <NavigationMenuList>
            <NavigationMenuItem>
              <NavigationMenuTrigger className="group flex items-center gap-2 bg-transparent text-foreground hover:text-foreground/80 data-[state=open]:bg-transparent data-[state=open]:text-foreground/80">
                <Avatar className="h-8 w-8 ring-1 ring-border transition group-hover:ring-ring/40">
                  <AvatarFallback className="bg-transparent text-primary-foreground group-hover:text-primary/80 data-[state=open]:text-primary/80">
                    {getInitials(name)}
                  </AvatarFallback>
                </Avatar>

                <div className="grid gap-0.5 text-left text-sm">
                  <div
                    className="
                      font-medium
                      text-primary-foreground
                      group-hover:text-primary/80
                      data-[state=open]:text-primary/80
                    "
                  >
                    {name}
                  </div>
                  <div
                    className="
                      text-xs
                      text-muted-foreground
                      group-hover:text-muted-foreground/80
                      data-[state=open]:text-muted-foreground
                    "
                  >
                    {email}
                  </div>
                </div>
              </NavigationMenuTrigger>

              <NavigationMenuContent>
                <ul className="grid w-[200px] gap-1 p-2">
                  <li>
                    <NavigationMenuLink asChild>
                      <div className="group flex items-center justify-between p-3 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors">
                        <div className="flex items-center gap-2">
                          {mounted && isDark ? (
                            <Moon className="h-4 w-4 group-hover:text-accent-foreground" />
                          ) : (
                            <Sun className="h-4 w-4 group-hover:text-accent-foreground" />
                          )}
                          <span className="text-sm font-medium group-hover:text-accent-foreground">
                            {mounted && isDark ? "Dark Mode" : "Light Mode"}
                          </span>
                        </div>
                        {mounted && (
                          <Switch
                            checked={isDark}
                            onCheckedChange={(checked) =>
                              setTheme(checked ? "dark" : "light")
                            }
                          />
                        )}
                      </div>
                    </NavigationMenuLink>
                  </li>
                  <li>
                    <NavigationMenuLink asChild>
                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => signOut()}
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        Logout
                      </Button>
                    </NavigationMenuLink>
                  </li>
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
      </div>
    </header>
  );
}
