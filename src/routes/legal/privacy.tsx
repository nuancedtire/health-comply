
import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent } from "@/components/ui/card"

export const Route = createFileRoute('/legal/privacy')({
    component: PrivacyPolicy,
})

function PrivacyPolicy() {
    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            <Card>
                <CardContent className="p-6 sm:p-10">
                    <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
                    <p className="text-sm text-muted-foreground mb-4">Last Updated: January 2026</p>

                    <div className="space-y-4 text-base leading-relaxed">
                        <p>
                            At Compass by aiigent.io, we are committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information.
                        </p>

                        <h2 className="text-xl font-semibold mt-6">1. Information We Collect</h2>
                        <p>
                            We collect information you provide directly to us, such as when you create an account, update your profile, or use our compliance management features. This may include your name, email address, practice details, and uploaded evidence.
                        </p>

                        <h2 className="text-xl font-semibold mt-6">2. How We Use Your Information</h2>
                        <p>
                            We use the collected information to providing, maintaining, and improving our services. This notably includes generating compliance reports, facilitating audit trails, and enabling team collaboration features.
                        </p>

                        <h2 className="text-xl font-semibold mt-6">3. Data Security</h2>
                        <p>
                            We implement robust security measures to protect your data. All data is encrypted at rest and in transit. We use role-based access controls to ensure that only authorized personnel can access your practice's data.
                        </p>

                        <h2 className="text-xl font-semibold mt-6">4. Contact Us</h2>
                        <p>
                            If you have any questions about this Privacy Policy, please contact us at support@aiigent.io.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
