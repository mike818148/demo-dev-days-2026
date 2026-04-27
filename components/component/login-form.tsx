"use client"

import { signIn } from "next-auth/react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type LoginFormProps = {
  iscBaseUrl?: string
}

export function LoginForm({ iscBaseUrl }: LoginFormProps) {
  const searchParams = useSearchParams()
  const rawCallbackUrl = searchParams.get("callbackUrl") || "/"
  // Prevent redirect loops by ensuring we never redirect back to login
  const callbackUrl = rawCallbackUrl.startsWith("/login") ? "/" : rawCallbackUrl

  return (
    <Card className="border-border/50 shadow-lg">
      <CardHeader className="space-y-2">
        <CardTitle className="text-2xl font-semibold">Login Form</CardTitle>
        <CardDescription className="text-base">Sign in with your enterprise identity provider</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-5">
          <Button
            type="button"
            variant="outline"
            className="w-full h-11 bg-transparent"
            onClick={() => signIn("identitySecureCloud", { callbackUrl })}
          >
            <>
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
              Sign in with Identity Secure Cloud
            </>
          </Button>

          <div className="text-center text-sm text-muted-foreground pt-2">
            {"Don't have an account? "}
            <a
              href={iscBaseUrl || "/"}
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:text-primary/80 transition-colors font-medium"
            >
              Contact your administrator
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
