import ScrollReveal from "./ScrollReveal";

const sources = [
  "PDF",
  "Word (.docx)",
  "PowerPoint (.pptx)",
  "Plain text (.txt)",
  "YouTube videos",
  "Web pages",
  "Pasted notes",
  "Legacy Word (.doc)",
];

export default function SourcesSection() {
  return (
    <section id="sources" className="py-[clamp(4rem,8vw,7rem)]">
      <div className="mx-auto max-w-[1100px] px-[clamp(1.25rem,5vw,2.5rem)]">
        <ScrollReveal className="mb-8">
          <p
            className="fu text-[0.6875rem] font-bold tracking-[0.14em] uppercase mb-5"
            style={{ color: "var(--l-moss)" }}
          >
            Upload from anywhere
          </p>
          <h2
            className="fd font-normal leading-[1.2] mb-3"
            style={{
              fontSize: "clamp(1.875rem, 3.5vw, 2.75rem)",
              color: "var(--l-ink)",
            }}
          >
            If you saved it, NexusAI can read it
          </h2>
          <p
            className="fb text-[1.0625rem] max-w-[440px] leading-[1.65]"
            style={{ color: "var(--l-ink2)" }}
          >
            Works with the formats you already use. No conversion, no
            copy-paste.
          </p>
        </ScrollReveal>

        <ScrollReveal delay={80}>
          <div className="flex flex-wrap gap-2.5">
            {sources.map((s) => (
              <div
                key={s}
                className="flex items-center gap-[0.4375rem] px-[0.875rem] py-[0.4375rem] border rounded-full fu text-[0.8125rem] transition-colors cursor-default"
                style={{
                  borderColor: "var(--l-br)",
                  background: "var(--l-bg)",
                  color: "var(--l-ink2)",
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: "var(--l-moss)" }}
                />
                {s}
              </div>
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
