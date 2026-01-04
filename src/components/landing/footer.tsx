import { Heart } from "lucide-react"

const navigation = {
  product: [
    { name: 'Features', href: '#features' },
    { name: 'Pricing', href: '#' },
    { name: 'Security', href: '#' },
    { name: 'Roadmap', href: '#' },
  ],
  company: [
    { name: 'About aiigent.io', href: 'https://aiigent.io' },
    { name: 'Blog', href: '#' },
    { name: 'Careers', href: '#' },
    { name: 'Contact', href: '#' },
  ],
  legal: [
    { name: 'Privacy Policy', href: '/legal/privacy' },
    { name: 'Terms of Service', href: '/legal/terms' },
    { name: 'Cookie Policy', href: '/legal/cookies' },
  ]
}

export function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              {/* Placeholder for small logo if needed, or text */}
              <span className="font-bold text-xl tracking-tight">Compass</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Navigating CQC compliance with confidence, clarity, and control.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-4">Product</h3>
            <ul className="space-y-3">
              {navigation.product.map((item) => (
                <li key={item.name}>
                  <a href={item.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {item.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-4">Company</h3>
            <ul className="space-y-3">
              {navigation.company.map((item) => (
                <li key={item.name}>
                  <a href={item.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {item.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-4">Legal</h3>
            <ul className="space-y-3">
              {navigation.legal.map((item) => (
                <li key={item.name}>
                  <a href={item.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {item.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-sm text-muted-foreground">
            <p>
              &copy; {new Date().getFullYear()} <span className="font-semibold text-foreground">aiigent.io</span>. All rights reserved.
            </p>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-2 text-sm text-muted-foreground">
            <p className="flex items-center gap-1">
              Built with <Heart className="h-3 w-3 text-red-500 fill-red-500" /> in the UK
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}