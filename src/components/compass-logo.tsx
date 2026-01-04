
import { cn } from "@/lib/utils"

interface CompassLogoProps extends React.SVGProps<SVGSVGElement> {
    className?: string
}

export function CompassLogo({ className, ...props }: CompassLogoProps) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={cn("w-8 h-8", className)}
            {...props}
        >
            {/* 
         SF Symbol Style Design:
         - Thick, clear strokes (2px on 24px grid)
         - Geometric precision
         - "Apple Blue" accent
         - No fill on circle for airy feel, or subtle fill if needed
      */}

            {/* Outer Ring - Dark Slate / Primary Color */}
            <circle cx="12" cy="12" r="10" className="stroke-slate-900 dark:stroke-slate-100 opacity-90" strokeWidth="2.5" />

            {/* Cardinal Ticks - subtle guides */}
            <path d="M12 2v2M12 20v2M2 12h2M20 12h2" className="stroke-slate-500" strokeWidth="2" />

            {/* Needle Group - Rotating */}
            <g>
                <animateTransform
                    attributeName="transform"
                    type="rotate"
                    values="45 12 12; 60 12 12; 30 12 12; 45 12 12"
                    keyTimes="0; 0.3; 0.7; 1"
                    dur="6s"
                    repeatCount="indefinite"
                />

                {/* Needle Shape: Modern Diamond */}
                {/* North (Blue) */}
                <path d="M12 4L15.5 12H8.5L12 4Z" fill="#007AFF" stroke="none" />

                {/* South (Slate/Silver) */}
                <path d="M12 20L15.5 12H8.5L12 20Z" fill="#8E8E93" stroke="none" />
            </g>
        </svg>
    )
}
