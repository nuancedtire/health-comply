
import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent } from "@/components/ui/card"

export const Route = createFileRoute('/legal/cookies')({
    component: CookiePolicy,
})

function CookiePolicy() {
    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            <Card>
                <CardContent className="p-6 sm:p-10">
                    <h1 className="text-3xl font-bold mb-6">Cookie Policy</h1>
                    <p className="text-sm text-muted-foreground mb-4">Last Updated: January 2026</p>

                    <div className="space-y-4 text-base leading-relaxed">
                        <p>
                            Compass uses cookies to improve your experience on our platform. This policy explains what cookies are, how we use them, and how you can manage them.
                        </p>

                        <h2 className="text-xl font-semibold mt-6">1. What Are Cookies?</h2>
                        <p>
                            Cookies are small text files that are stored on your device when you visit a website. They allow the website to recognize your device and remember your preferences.
                        </p>

                        <h2 className="text-xl font-semibold mt-6">2. How We Use Cookies</h2>
                        <p>
                            We use cookies for the following purposes:
                        </p>
                        <ul className="list-disc pl-5 space-y-2">
                            <li><strong>Essential Cookies:</strong> These are necessary for the website to function correctly, such as maintaining your login session.</li>
                            <li><strong>Analytics Cookies:</strong> We use these to understand how users interact with our platform so we can improve it.</li>
                        </ul>

                        <h2 className="text-xl font-semibold mt-6">3. Managing Cookies</h2>
                        <p>
                            You can control and/or delete cookies as you wish through your browser settings. However, disabling cookies may limit your ability to use certain features of the Compass platform.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
