"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";

export default function HeroSection() {
  const { data: session, status } = useSession();
  const loggedIn = status !== "loading" && !!session?.user;

  return (
    <section className="pt-[clamp(5rem,10vh,9rem)] pb-[clamp(4rem,8vh,7rem)]">
      <div className="mx-auto max-w-[1100px] px-[clamp(1.25rem,5vw,2.5rem)]">
        {/* Eyebrow */}
        <p
          className="fu text-[0.6875rem] font-bold tracking-[0.14em] uppercase mb-5 l-load"
          style={{ color: "var(--l-moss)", animationDelay: "0ms" }}
        >
          Research assistant
        </p>

        {/* Headline */}
        <h1
          className="fd font-normal leading-[1.075] tracking-[-0.025em] mb-7 max-w-[730px] l-load"
          style={{
            fontSize: "clamp(3rem, 6.5vw, 5.5rem)",
            color: "var(--l-ink)",
            animationDelay: "80ms",
          }}
        >
          Your documents
          <br />
          already{" "}
          <em className="l-em">know</em>
          <br />
          the answer.
        </h1>

        {/* Body */}
        <p
          className="fb mb-9 max-w-[520px] leading-[1.65] l-load"
          style={{
            fontSize: "clamp(1rem, 1.6vw, 1.1875rem)",
            color: "var(--l-ink2)",
            animationDelay: "160ms",
          }}
        >
          NexusAI brings together everything you&apos;ve collected — research
          papers, YouTube transcripts, web pages, notes — into a knowledge base
          that answers back. Upload once, ask anything, across all of it.
        </p>

        {/* CTAs */}
        <div
          className="flex items-center gap-5 flex-wrap l-load"
          style={{ animationDelay: "240ms" }}
        >
          <Link
            href={loggedIn ? "/workspace" : "/login"}
            className="fu text-[0.9375rem] font-bold text-white px-[1.625rem] py-[0.8125rem] rounded-[7px] no-underline inline-flex items-center gap-2 transition-all hover:-translate-y-px"
            style={{ background: "var(--l-moss)" }}
          >
            {loggedIn ? "Go to workspace" : "Start for free"}
            <span>→</span>
          </Link>
          <a
            href="#how-it-works"
            className="fu text-[0.9375rem] no-underline border-b pb-[1px] transition-colors"
            style={{
              color: "var(--l-ink2)",
              borderColor: "var(--l-br)",
            }}
          >
            See how it works
          </a>
        </div>
      </div>
    </section>
  );
}
