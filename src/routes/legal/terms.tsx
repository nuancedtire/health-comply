
import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent } from "@/components/ui/card"

export const Route = createFileRoute('/legal/terms')({
    component: TermsOfService,
})

function TermsOfService() {
    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            <Card>
                <CardContent className="p-6 sm:p-10">
                    <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>
                    <p className="text-sm text-muted-foreground mb-4">Last Updated: January 2026</p>

                    <div className="space-y-4 text-base leading-relaxed">
                        <p>
                            Welcome to Compass. By using our services, you agree to these Terms of Service. Please read them carefully.
                        </p>

                        <h2 className="text-xl font-semibold mt-6">1. Usage License</h2>
                        <p>
                            We grant you a limited, non-exclusive, non-transferable license to use the Compass platform for your internal business compliance needs, subject to these Terms.
                        </p>

                        <h2 className="text-xl font-semibold mt-6">2. User Responsibilities</h2>
                        <p>
                            You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to use the service in compliance with all applicable laws and regulations.
                        </p>

                        <h2 className="text-xl font-semibold mt-6">3. Intellectual Property</h2>
                        <p>
                            The Compass platform, including its software, design, and content (excluding your data), is owned by aiigent.io and protected by copyright and other intellectual property laws.
                        </p>

                        <h2 className="text-xl font-semibold mt-6">4. Termination</h2>
                        <p>
                            We may terminate or suspend your access to the service immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
