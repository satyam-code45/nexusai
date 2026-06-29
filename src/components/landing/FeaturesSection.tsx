"use client";

import ScrollReveal from "./ScrollReveal";

const features = [
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ),
    name: "Semantic search",
    desc: "Finds what you mean, not just what you typed. Retrieves relevant passages based on conceptual meaning across your entire library.",
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
    name: "Cited answers",
    desc: "Every response traces back to your source — the exact document, passage, and page. No hallucination, no guessing.",
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    name: "Multi-agent research",
    desc: "Complex questions get a full research pipeline — a planner, a retriever, a synthesizer — working in parallel across all your sources.",
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
      </svg>
    ),
    name: "Collaborative workspace",
    desc: "Share your knowledge base with teammates. Annotate, discuss, and build shared understanding with real-time co-editing.",
  },
];

export default function FeaturesSection() {
  return (
    <section
      id="features"
      className="py-[clamp(4rem,8vw,7rem)]"
    >
      <div className="mx-auto max-w-[1100px] px-[clamp(1.25rem,5vw,2.5rem)]">
        {/* Header */}
        <ScrollReveal className="mb-[clamp(2.5rem,5vw,4rem)]">
          <p
            className="fu text-[0.6875rem] font-bold tracking-[0.14em] uppercase mb-5"
            style={{ color: "var(--l-moss)" }}
          >
            Capabilities
          </p>
          <h2
            className="fd font-normal leading-[1.2] mb-3 max-w-[600px]"
            style={{
              fontSize: "clamp(1.875rem, 3.5vw, 2.75rem)",
              color: "var(--l-ink)",
            }}
          >
            Everything you need to work with knowledge, not around it
          </h2>
          <p
            className="fb text-[1.0625rem] max-w-[480px] leading-[1.65]"
            style={{ color: "var(--l-ink2)" }}
          >
            Built for researchers, analysts, and anyone who drowns in documents.
          </p>
        </ScrollReveal>

        {/* Grid */}
        <div className="l-feat-grid">
          {features.map((f, i) => (
            <ScrollReveal key={f.name} delay={i * 60} className="h-full">
              <div
                className="p-8 h-full transition-colors cursor-default"
                style={{ background: "var(--l-bg)" }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLElement).style.background =
                    "var(--l-sf)")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLElement).style.background =
                    "var(--l-bg)")
                }
              >
                <div
                  className="w-[38px] h-[38px] rounded-[7px] flex items-center justify-center mb-[1.125rem]"
                  style={{
                    background: "var(--l-tint)",
                    color: "var(--l-moss)",
                  }}
                >
                  {f.icon}
                </div>
                <div
                  className="fd font-normal text-[1.125rem] leading-[1.3] mb-2"
                  style={{ color: "var(--l-ink)" }}
                >
                  {f.name}
                </div>
                <p
                  className="fb text-[0.9375rem] leading-[1.6]"
                  style={{ color: "var(--l-ink2)" }}
                >
                  {f.desc}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
