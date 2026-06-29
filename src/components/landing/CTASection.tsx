"use client";

import { useState } from "react";
import ScrollReveal from "./ScrollReveal";

export default function CTASection() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    try {
      await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
    } catch {
      // Fire-and-forget — show success regardless
    }
    setSubmitted(true);
  };

  return (
    <section
      className="py-[clamp(5rem,10vw,9rem)] border-t text-center"
      style={{ borderColor: "var(--l-br)" }}
    >
      <div className="mx-auto max-w-[1100px] px-[clamp(1.25rem,5vw,2.5rem)]">
        <ScrollReveal>
          <p
            className="fu text-[0.6875rem] font-bold tracking-[0.14em] uppercase mb-5 inline-block"
            style={{ color: "var(--l-moss)" }}
          >
            Get early access
          </p>
        </ScrollReveal>

        <ScrollReveal delay={80}>
          <h2
            className="fd font-normal leading-[1.15] max-w-[560px] mx-auto mb-3"
            style={{
              fontSize: "clamp(2rem, 4vw, 3.25rem)",
              color: "var(--l-ink)",
            }}
          >
            Stop searching.
            <br />
            Start asking.
          </h2>
        </ScrollReveal>

        <ScrollReveal delay={160}>
          <p
            className="fb text-[1.0625rem] mb-10"
            style={{ color: "var(--l-ink2)" }}
          >
            Join researchers and knowledge workers who&apos;ve stopped losing
            insights in their files.
          </p>
        </ScrollReveal>

        <ScrollReveal delay={240}>
          {submitted ? (
            <div
              className="fu text-[1rem] font-medium"
              style={{ color: "var(--l-moss)" }}
            >
              ✓ You&apos;re on the list — we&apos;ll be in touch.
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="flex gap-2.5 max-w-[400px] mx-auto flex-wrap justify-center"
            >
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="flex-1 min-w-[200px] px-4 py-3 border rounded-[7px] fu text-[0.9375rem] outline-none transition-colors"
                style={{
                  background: "var(--l-sf)",
                  borderColor: "var(--l-br)",
                  color: "var(--l-ink)",
                }}
                onFocus={(e) =>
                  ((e.target as HTMLElement).style.borderColor = "var(--l-moss)")
                }
                onBlur={(e) =>
                  ((e.target as HTMLElement).style.borderColor = "var(--l-br)")
                }
              />
              <button
                type="submit"
                className="fu text-[0.9375rem] font-bold text-white px-[1.625rem] py-3 rounded-[7px] transition-all hover:-translate-y-px whitespace-nowrap"
                style={{ background: "var(--l-moss)" }}
              >
                Request access →
              </button>
            </form>
          )}
        </ScrollReveal>
      </div>
    </section>
  );
}
