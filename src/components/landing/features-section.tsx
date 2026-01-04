import { cn } from "@/lib/utils";
import {
  ShieldCheck,
  FileText,
  Bot,
  History,
  LayoutDashboard,
  Users,
  Map,
} from "lucide-react";

export function FeaturesSection() {
  return (
    <section className="py-20 lg:py-32 relative z-20 overflow-hidden">
      <div className="max-w-7xl mx-auto px-8">
        <div className="mb-12 md:mb-20">
          <h2 className="text-3xl lg:text-5xl lg:leading-tight max-w-5xl mx-auto text-center tracking-tight font-medium text-black dark:text-white mb-6">
            Everything you need for CQC Excellence
          </h2>

          <p className="text-sm lg:text-base max-w-2xl mx-auto text-neutral-500 text-center font-normal dark:text-neutral-400">
            Compass replaces spreadsheets and scattered folders with a unified,
            intelligent compliance operating system. Designed for the modern
            healthcare landscape.
          </p>
        </div>

        <BentoGrid>
          {features.map((feature, i) => (
            <BentoGridItem
              key={i}
              title={feature.title}
              description={feature.description}
              header={feature.header}
              icon={feature.icon}
              className={feature.className}
            />
          ))}
        </BentoGrid>
      </div>
    </section>
  );
}

const BentoGrid = ({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) => {
  return (
    <div
      className={cn(
        "grid md:auto-rows-[18rem] grid-cols-1 md:grid-cols-3 gap-4 max-w-7xl mx-auto ",
        className
      )}
    >
      {children}
    </div>
  );
};

const BentoGridItem = ({
  className,
  title,
  description,
  header,
  icon,
}: {
  className?: string;
  title?: string | React.ReactNode;
  description?: string | React.ReactNode;
  header?: React.ReactNode;
  icon?: React.ReactNode;
}) => {
  return (
    <div
      className={cn(
        "row-span-1 rounded-xl group/bento hover:shadow-xl transition duration-200 shadow-input dark:shadow-none p-4 dark:bg-black dark:border-white/[0.2] bg-white border border-transparent justify-between flex flex-col space-y-4",
        "border border-neutral-200 dark:border-neutral-800",
        className
      )}
    >
      {header}
      <div className="group-hover/bento:translate-x-2 transition duration-200">
        {icon}
        <div className="font-bold text-neutral-600 dark:text-neutral-200 mb-2 mt-2">
          {title}
        </div>
        <div className="font-normal text-neutral-600 text-xs dark:text-neutral-300">
          {description}
        </div>
      </div>
    </div>
  );
};

const features = [
  {
    title: "CQC Framework Aligned",
    description: "Pre-seeded with all 34 CQC Quality Statements across 5 key questions.",
    header: <SkeletonOne />,
    icon: <ShieldCheck className="h-4 w-4 text-neutral-500" />,
    className: "md:col-span-2",
  },
  {
    title: "Evidence Locker",
    description: "Secure, audit-logged storage for your policies and reports.",
    header: <SkeletonTwo />,
    icon: <FileText className="h-4 w-4 text-neutral-500" />,
    className: "md:col-span-1",
  },
  {
    title: "AI Copilot",
    description: "Smart upload triage, automated narrative drafting, and gap detection.",
    header: <SkeletonThree />,
    icon: <Bot className="h-4 w-4 text-neutral-500" />,
    className: "md:col-span-1 border border-neutral-200 dark:border-neutral-800",
  },
  {
    title: "Multi-Site Management",
    description: "Manage multiple practice sites from a single dashboard.",
    header: <SkeletonFour />,
    icon: <Map className="h-4 w-4 text-neutral-500" />,
    className: "md:col-span-2",
  },
  {
    title: "Audit Trails",
    description: "Every action logged. Demonstrate vigorous governance.",
    header: <SkeletonFive />,
    icon: <History className="h-4 w-4 text-neutral-500" />,
    className: "md:col-span-1",
  },
  {
    title: "Inspection Packs",
    description: "Generate comprehensive inspection packs with a single click.",
    header: <SkeletonSix />,
    icon: <LayoutDashboard className="h-4 w-4 text-neutral-500" />,
    className: "md:col-span-1",
  },
  {
    title: "Team Collaboration",
    description: "Assign responsibilities and track approvals.",
    header: <SkeletonSeven />,
    icon: <Users className="h-4 w-4 text-neutral-500" />,
    className: "md:col-span-1",
  },
];

function SkeletonOne() {
  return (
    <div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl bg-gradient-to-br from-neutral-200 dark:from-neutral-900 dark:to-neutral-800 to-neutral-100 p-2 sm:p-4 overflow-hidden mask-image-b-0">
      <div className="flex flex-col space-y-2 w-full">
        <div className="flex items-center gap-2 p-2 bg-white/50 dark:bg-black/20 rounded shadow-sm">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <div className="h-2 w-2/3 bg-neutral-300 dark:bg-neutral-700 rounded" />
        </div>
        <div className="flex items-center gap-2 p-2 bg-white/50 dark:bg-black/20 rounded shadow-sm">
          <div className="w-2 h-2 rounded-full bg-amber-500" />
          <div className="h-2 w-1/2 bg-neutral-300 dark:bg-neutral-700 rounded" />
        </div>
        <div className="flex items-center gap-2 p-2 bg-white/50 dark:bg-black/20 rounded shadow-sm">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <div className="h-2 w-3/4 bg-neutral-300 dark:bg-neutral-700 rounded" />
        </div>
      </div>
    </div>
  );
}

function SkeletonTwo() {
  return (
    <div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl bg-gradient-to-br from-neutral-200 dark:from-neutral-900 dark:to-neutral-800 to-neutral-100 p-4">
      <div className="grid grid-cols-2 gap-2 w-full">
        <div className="h-20 bg-white/50 dark:bg-black/20 rounded-lg" />
        <div className="h-20 bg-white/50 dark:bg-black/20 rounded-lg" />
        <div className="h-20 bg-white/50 dark:bg-black/20 rounded-lg col-span-2" />
      </div>
    </div>
  );
}

function SkeletonThree() {
  return (
    <div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl bg-gradient-to-br from-neutral-200 dark:from-neutral-900 dark:to-neutral-800 to-neutral-100 flex items-center justify-center">
      <div className="relative">
        <div className="absolute inset-0 bg-blue-500 blur-xl opacity-20 rounded-full" />
        <Bot className="w-16 h-16 text-neutral-500 relative z-10" />
      </div>
    </div>
  );
}

function SkeletonFour() {
  return (
    <div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl bg-gradient-to-br from-neutral-200 dark:from-neutral-900 dark:to-neutral-800 to-neutral-100 p-4 relative overflow-hidden">
      <Map className="w-full h-full text-neutral-300 dark:text-neutral-700 opacity-20 absolute -right-10 -bottom-10 transform scale-150" />
      <div className="relative z-10 space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full" />
          <span className="text-xs font-medium text-neutral-600 dark:text-neutral-300">London HW</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-purple-500 rounded-full" />
          <span className="text-xs font-medium text-neutral-600 dark:text-neutral-300">Manchester North</span>
        </div>
      </div>
    </div>
  );
}

function SkeletonFive() {
  return (
    <div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl bg-gradient-to-br from-neutral-200 dark:from-neutral-900 dark:to-neutral-800 to-neutral-100 p-4 flex flex-col gap-2">
      {[1, 2, 3].map(i => (
        <div key={i} className="flex gap-2 items-center">
          <div className="h-1.5 w-1.5 rounded-full bg-neutral-400" />
          <div className="h-2 w-3/4 bg-neutral-300 dark:bg-neutral-700 rounded-full" />
        </div>
      ))}
    </div>
  );
}

function SkeletonSix() {
  return (
    <div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl bg-gradient-to-br from-neutral-200 dark:from-neutral-900 dark:to-neutral-800 to-neutral-100 flex items-center justify-center">
      <LayoutDashboard className="w-12 h-12 text-neutral-400" />
    </div>
  );
}

function SkeletonSeven() {
  return (
    <div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl bg-gradient-to-br from-neutral-200 dark:from-neutral-900 dark:to-neutral-800 to-neutral-100 flex items-center justify-center">
      <div className="flex -space-x-3">
        <div className="w-8 h-8 rounded-full bg-red-100 border-2 border-white" />
        <div className="w-8 h-8 rounded-full bg-blue-100 border-2 border-white" />
        <div className="w-8 h-8 rounded-full bg-green-100 border-2 border-white" />
      </div>
    </div>
  );
}
