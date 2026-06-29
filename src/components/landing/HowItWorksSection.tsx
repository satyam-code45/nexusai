import ScrollReveal from "./ScrollReveal";

const steps = [
  {
    n: "1",
    title: "Collect",
    desc: "Upload PDFs, paste a YouTube link, add web pages, or drop in plain text. NexusAI indexes everything into a searchable vector store.",
  },
  {
    n: "2",
    title: "Ask",
    desc: "Type any question in natural language. Select specific sources to narrow the search, or let NexusAI query your entire library at once.",
  },
  {
    n: "3",
    title: "Discover",
    desc: "Get a thorough, cited answer synthesized from your own documents — not from the internet, not hallucinated. From your sources, verified.",
  },
];

export default function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="py-[clamp(4rem,8vw,7rem)] border-y"
      style={{ background: "var(--l-sf)", borderColor: "var(--l-br)" }}
    >
      <div className="mx-auto max-w-[1100px] px-[clamp(1.25rem,5vw,2.5rem)]">
        {/* Header */}
        <ScrollReveal className="mb-[clamp(2.5rem,5vw,4rem)]">
          <p
            className="fu text-[0.6875rem] font-bold tracking-[0.14em] uppercase mb-5"
            style={{ color: "var(--l-moss)" }}
          >
            How it works
          </p>
          <h2
            className="fd font-normal leading-[1.2]"
            style={{
              fontSize: "clamp(1.875rem, 3.5vw, 2.75rem)",
              color: "var(--l-ink)",
            }}
          >
            From scattered files to answered questions
          </h2>
        </ScrollReveal>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-0">
          {steps.map((s, i) => (
            <ScrollReveal
              key={s.n}
              delay={i * 80}
              className={
                i < 2
                  ? "md:pr-10 md:border-r border-[var(--l-br)]"
                  : ""
              }
            >
              <div
                className={i > 0 ? "md:pl-10" : ""}
                style={{
                  borderColor: "var(--l-br)",
                }}
              >
                <div
                  className="fd font-normal italic leading-none mb-3 tracking-tight"
                  style={{
                    fontSize: "3.5rem",
                    color: "var(--l-br)",
                  }}
                >
                  {s.n}
                </div>
                <div
                  className="fd font-normal text-[1.125rem] mb-2"
                  style={{ color: "var(--l-ink)" }}
                >
                  {s.title}
                </div>
                <p
                  className="fb text-[0.9375rem] leading-[1.6] max-w-[240px]"
                  style={{ color: "var(--l-ink2)" }}
                >
                  {s.desc}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
