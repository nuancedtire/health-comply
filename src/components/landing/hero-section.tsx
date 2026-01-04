import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowRight } from "lucide-react"
import { Link } from "@tanstack/react-router"
import { AuroraBackground } from "@/components/ui/aurora-background"
import { motion } from "motion/react"
import { CompassLogo } from "@/components/compass-logo"

export function HeroSection() {
  return (
    <AuroraBackground className="min-h-screen">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{
          delay: 0.3,
          duration: 0.8,
          ease: "easeInOut",
        }}
        className="relative flex flex-col items-center justify-center gap-4 px-4 text-center max-w-4xl mx-auto py-24 sm:py-32"
      >
        <div className="mb-4 flex justify-center">
          <Badge variant="outline" className="px-4 py-1.5 text-sm bg-background/50 backdrop-blur-sm border-blue-200 text-blue-800 dark:text-blue-200 dark:border-blue-800 rounded-full">
            Now in Public Beta
          </Badge>
        </div>

        <div className="relative mb-2">
          <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full" />
          <CompassLogo className="w-24 h-24 md:w-32 md:h-32 relative drop-shadow-2xl" />
        </div>

        <h1 className="text-4xl font-extrabold tracking-tight md:text-7xl text-foreground">
          Compass
        </h1>
        <p className="text-xl font-medium text-muted-foreground/80 mb-6">
          by <span className="text-foreground font-semibold">aiigent.io</span>
        </p>

        <div className="font-extrabold text-3xl md:text-5xl dark:text-white text-slate-900 mb-6 leading-tight">
          Navigating CQC Compliance <br className="hidden sm:block" /> with Confidence
        </div>

        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          The complete operating system for GP practices. Continuous, auditable, evidence-backed compliance.
          Stop scrambling for inspections and start leading with data.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
          <Button size="lg" className="h-12 px-8 text-base bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-500/20 rounded-full w-full sm:w-auto" asChild>
            <Link to="/signup">
              Get Started for Free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>

          <Button variant="outline" size="lg" className="h-12 px-8 text-base rounded-full backdrop-blur-sm bg-background/50 hover:bg-background/80 w-full sm:w-auto border-slate-200 dark:border-slate-800" asChild>
            <Link to="/login">
              Sign In
            </Link>
          </Button>
        </div>

        <div className="mt-12 flex flex-wrap justify-center gap-6 text-sm font-medium text-muted-foreground">
          <div className="flex items-center gap-2 bg-background/40 backdrop-blur-md px-3 py-1 rounded-full border border-border/50">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            <span>CQC Framework Ready</span>
          </div>
          <div className="flex items-center gap-2 bg-background/40 backdrop-blur-md px-3 py-1 rounded-full border border-border/50">
            <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
            <span>AI-Powered Evidence</span>
          </div>
        </div>
      </motion.div>
    </AuroraBackground>
  )
}