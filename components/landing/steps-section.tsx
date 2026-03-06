import { FileText, Users, CheckCircle } from "lucide-react"

const steps = [
  {
    number: "01",
    title: "Post Your Job",
    description: "Describe your roofing project, set your budget, and share your location. It only takes a few minutes.",
    icon: FileText,
  },
  {
    number: "02",
    title: "Get Connected With Contractors",
    description: "Qualified roofing contractors in your area will review your job and reach out with their best offers.",
    icon: Users,
  },
  {
    number: "03",
    title: "Complete Your Roofing Project",
    description: "Choose the contractor that fits your needs, communicate directly, and get your roof done right.",
    icon: CheckCircle,
  },
]

export function StepsSection() {
  return (
    <section className="border-t border-border bg-card py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2
            className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            How It Works
          </h2>
          <p className="mt-4 text-pretty text-lg leading-relaxed text-muted-foreground">
            Three simple steps to get your roofing project started.
          </p>
        </div>

        <div className="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-8 md:grid-cols-3">
          {steps.map((step) => (
            <div
              key={step.number}
              className="group relative flex flex-col items-center rounded-2xl border border-border bg-background p-8 text-center shadow-sm transition-all hover:border-primary/20 hover:shadow-md"
            >
              <div className="mb-4 text-xs font-bold uppercase tracking-widest text-primary">
                Step {step.number}
              </div>
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 transition-colors group-hover:bg-primary/15">
                <step.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-foreground">{step.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
