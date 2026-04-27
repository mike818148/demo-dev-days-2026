"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { Button } from "@/components/ui/button";
import { LogOut, ShieldAlert } from "lucide-react";
import { signOut } from "next-auth/react";
import Link from "next/link";

interface UserHeaderProps {
  name: string;
  email: string;
}

export function UserHeader({ name, email }: UserHeaderProps) {
  // Generate initials from name
  const getInitials = (name: string) => {
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <header className="bg-primary text-primary-foreground py-3 px-6 flex items-center justify-between relative z-50">
      <Link
        href="/"
        className="flex items-center gap-2 text-lg font-semibold text-primary-foreground"
      >
        <ShieldAlert className="h-5 w-5" />
        ACME Policy Violation Demo
      </Link>
      <div className="flex items-center gap-4">
        <NavigationMenu>
          <NavigationMenuList>
            <NavigationMenuItem>
              <NavigationMenuLink asChild>
                <Link
                  href="/"
                  className="block select-none rounded-md px-4 py-2 leading-none no-underline outline-none transition-colors hover:bg-primary/90 hover:text-primary-foreground focus:bg-primary/90 focus:text-primary-foreground text-primary-foreground"
                >
                  Policy Violations
                </Link>
              </NavigationMenuLink>
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
