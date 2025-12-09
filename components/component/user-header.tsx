"use client";

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
    <header className="bg-primary text-primary-foreground py-3 px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src="/placeholder-user.jpg" alt={name} />
          <AvatarFallback>{getInitials(name)}</AvatarFallback>
        </Avatar>
        <div className="grid gap-0.5 text-sm">
          <div className="font-medium">{name}</div>
          <div className="text-muted-foreground">{email}</div>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <Link
          href="/"
          className="text-white hover:text-gray-200 transition-colors"
        >
          Access Requests
        </Link>
        <Link
          href="/myrequests"
          className="text-white hover:text-gray-200 transition-colors"
        >
          My Request
        </Link>
        <Button
          className="text-white hover:bg-gray-500"
          onClick={() => signOut()}
        >
          Logout
        </Button>
      </div>
    </header>
  );
}
