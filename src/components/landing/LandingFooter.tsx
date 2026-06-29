"use client";

export default function LandingFooter() {
  return (
    <footer
      className="border-t py-8"
      style={{ borderColor: "var(--l-br)" }}
    >
      <div className="mx-auto max-w-[1100px] px-[clamp(1.25rem,5vw,2.5rem)] flex items-center justify-between flex-wrap gap-4">
        <p
          className="fu text-[0.8125rem]"
          style={{ color: "var(--l-ink3)" }}
        >
          © 2026 NexusAI. Built for curious minds.
        </p>
        <div className="flex gap-6">
          {["Privacy", "Terms", "Contact"].map((link) => (
            <a
              key={link}
              href="#"
              className="fu text-[0.8125rem] no-underline transition-colors"
              style={{ color: "var(--l-ink3)" }}
              onMouseEnter={(e) =>
                ((e.target as HTMLElement).style.color = "var(--l-ink)")
              }
              onMouseLeave={(e) =>
                ((e.target as HTMLElement).style.color = "var(--l-ink3)")
              }
            >
              {link}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
