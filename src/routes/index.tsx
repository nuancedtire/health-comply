import { createFileRoute, Link } from '@tanstack/react-router'
import { HeroSection } from '@/components/landing/hero-section'
import { FeaturesSection } from '@/components/landing/features-section'
import { Footer } from '@/components/landing/footer'
import logoSrc from '@/logo.svg'
import { ThemeToggle } from '@/components/theme'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-background font-sans antialiased text-foreground">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 max-w-screen-2xl items-center px-4 md:px-6">
          <Link to="/" className="flex items-center gap-2 font-bold tracking-tight text-lg hover:opacity-90 transition-opacity">
            <img src={logoSrc} alt="Compass Logo" className="h-8 w-8" />
            <span className="text-xl">Compass</span>
            <span className="text-muted-foreground/60 font-medium text-sm ml-1">by aiigent.io</span>
          </Link>
          <nav className="ml-auto flex items-center gap-4 sm:gap-6">
            <ThemeToggle />
            <Link to="/login" className="text-sm font-medium transition-colors hover:text-primary">
              Login
            </Link>
            <Link
              to="/signup"
              className="inline-flex h-9 items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
            >
              Get Started
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <HeroSection />
        <FeaturesSection />
      </main>

      <Footer />
    </div>
  )
}
