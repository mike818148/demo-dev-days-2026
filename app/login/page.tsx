import React, { Suspense } from 'react'
import { Shield } from 'lucide-react'
import { LoginForm } from '@/components/component/login-form'

const LoginPage = () => {
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

                <div className="space-y-6 max-w-md">
                <h1 className="text-4xl font-semibold leading-tight text-balance">Enterprise Identity Security Platform</h1>
                <p className="text-lg text-muted-foreground leading-relaxed">
                    Secure access management for modern organizations. Protect your team with advanced authentication and
                    identity verification.
                </p>

                <div className="flex items-center gap-8 pt-4">
                    <div>
                    <div className="text-3xl font-semibold text-primary">99.99%</div>
                    <div className="text-sm text-muted-foreground">Uptime</div>
                    </div>
                    <div className="w-px h-12 bg-border" />
                    <div>
                    <div className="text-3xl font-semibold text-primary">500K+</div>
                    <div className="text-sm text-muted-foreground">Users Protected</div>
                    </div>
                    <div className="w-px h-12 bg-border" />
                    <div>
                    <div className="text-3xl font-semibold text-primary">SOC 2</div>
                    <div className="text-sm text-muted-foreground">Certified</div>
                    </div>
                </div>
                </div>

                <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <a href="#" className="hover:text-foreground transition-colors">
                    Privacy Policy
                </a>
                <span className="text-border">•</span>
                <a href="#" className="hover:text-foreground transition-colors">
                    Terms of Service
                </a>
                <span className="text-border">•</span>
                <a href="#" className="hover:text-foreground transition-colors">
                    Support
                </a>
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
                    <LoginForm />
                </Suspense>
            </div>
            </div>
        </div>
    )
}

export default LoginPage