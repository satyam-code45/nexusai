"use client";

import Image from "next/image";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Playfair_Display, Lora } from "next/font/google";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-playfair",
  display: "swap",
});

const lora = Lora({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal"],
  variable: "--font-lora",
  display: "swap",
});

function LoginPage() {
  return (
    <div
      className={`${playfair.variable} ${lora.variable} fb min-h-screen flex flex-col items-center justify-center px-6`}
      style={{ background: "var(--l-bg)", color: "var(--l-ink)" }}
    >
      <Link
        href="/"
        className="fd text-[1.1875rem] tracking-[-0.025em] no-underline flex items-baseline mb-10"
        style={{ color: "var(--l-ink)" }}
      >
        Nexus
        <span className="italic" style={{ color: "var(--l-moss)" }}>
          AI
        </span>
      </Link>

      <div
        className="w-full max-w-[380px] rounded-2xl border p-8 shadow-sm"
        style={{ background: "var(--l-sf)", borderColor: "var(--l-br)" }}
      >
        <h1 className="fd text-[1.75rem] text-center mb-2" style={{ color: "var(--l-ink)" }}>
          Welcome back
        </h1>
        <p className="fu text-[0.875rem] text-center mb-8" style={{ color: "var(--l-ink2)" }}>
          Sign in to continue to your workspace
        </p>

        <button
          onClick={() => signIn("google", { callbackUrl: "/workspace" })}
          className="fu flex items-center justify-center w-full gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-colors text-[0.875rem] font-medium"
          style={{ background: "var(--l-bg)", borderColor: "var(--l-br)", color: "var(--l-ink)" }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--l-moss)")}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--l-br)")}
        >
          <Image src="/icons/google.png" alt="" width={20} height={20} />
          Continue with Google
        </button>
      </div>

      <Link
        href="/"
        className="fu text-[0.8125rem] no-underline mt-8 transition-colors"
        style={{ color: "var(--l-ink3)" }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--l-ink2)")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "var(--l-ink3)")}
      >
        ← Back to home
      </Link>
    </div>
  );
}

export default LoginPage;
