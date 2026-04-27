import React, { Suspense } from 'react'
import { Shield } from 'lucide-react'
import { LoginForm } from '@/components/component/login-form'

const LoginPage = () => {
    const iscBaseUrl = process.env.ISC_BASE_URL

    return (
        <div className="min-h-screen flex">
            {/* Left side - Branding */}
            <div className="hidden lg:flex lg:w-1/2 bg-card relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,oklch(0.28_0.08_252/0.15),transparent_50%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,oklch(0.62_0.22_252/0.08),transparent_50%)]" />

                <div className="relative z-10 flex flex-col justify-between p-12 w-full">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary">
                            <Shield className="w-6 h-6 text-primary-foreground" />
                        </div>
                        <span className="text-xl font-semibold">ACME DEMO</span>
                    </div>

                    <div className="max-w-xl space-y-6">
                        <div className="w-fit rounded-xl border border-primary/30 bg-gradient-to-r from-primary/15 via-primary/10 to-transparent px-4 py-3 shadow-sm">
                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary/90">Event Showcase</p>
                            <p className="mt-1 text-sm font-semibold text-foreground">SailPoint Developer Days 2026</p>
                        </div>
                        <h1 className="text-4xl font-semibold leading-tight text-balance">
                            From Detection to Resolution
                        </h1>
                        <p className="text-base leading-relaxed text-muted-foreground">
                            Automating policy violation remediation in SailPoint Identity Security Cloud with AI, APIs,
                            and MCP.
                        </p>

                        <div className="grid grid-cols-2 gap-3 pt-2">
                            <div className="rounded-lg border bg-background/40 p-3">
                                <p className="text-sm font-medium text-foreground">Platform</p>
                                <p className="text-sm text-muted-foreground">SailPoint ISC</p>
                            </div>
                            <div className="rounded-lg border bg-background/40 p-3">
                                <p className="text-sm font-medium text-foreground">Tech Stack</p>
                                <p className="text-sm text-muted-foreground">Next.js + TypeScript SDK + MCP</p>
                            </div>
                            <div className="rounded-lg border bg-background/40 p-3">
                                <p className="text-sm font-medium text-foreground">Approach</p>
                                <p className="text-sm text-muted-foreground">AI-guided remediation</p>
                            </div>
                            <div className="rounded-lg border bg-background/40 p-3">
                                <p className="text-sm font-medium text-foreground">Modes</p>
                                <p className="text-sm text-muted-foreground">Interactive</p>
                            </div>
                        </div>
                    </div>

                    <div className="text-sm leading-relaxed text-muted-foreground">
                        Demo focus: analyze policy intent, apply compensating controls, and safely execute entitlement
                        add/remove remediation actions while maintaining governance and compliance.
                        <div className="mt-3">
                            <a
                                href="https://developer.sailpoint.com/discuss/developerdays"
                                target="_blank"
                                rel="noreferrer"
                                className="font-medium text-primary underline-offset-4 hover:underline"
                            >
                                View SailPoint Developer Days 2026
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right side - Login Form */}
            <div className="flex-1 flex items-center justify-center p-8 bg-background">
                <div className="w-full max-w-md">
                    <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary">
                            <Shield className="w-6 h-6 text-primary-foreground" />
                        </div>
                        <span className="text-xl font-semibold">ACME DEMO</span>
                    </div>
                    <Suspense fallback={<div>Loading...</div>}>
                        <LoginForm iscBaseUrl={iscBaseUrl} />
                    </Suspense>
                </div>
            </div>
        </div>
    )
}

export default LoginPage