"use client";

import { useState, useRef, useEffect } from "react";
import { useTheme } from "next-themes";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { Sun, Moon, Menu, X } from "lucide-react";

export default function LandingNav() {
  const { resolvedTheme, setTheme } = useTheme();
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const [dropOpen, setDropOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);
  const user = session?.user;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setDropOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <>
      <nav
        className="sticky top-0 z-50 h-[60px] border-b backdrop-blur-md"
        style={{
          borderColor: "var(--l-br)",
          background: "color-mix(in srgb, var(--l-bg) 90%, transparent)",
        }}
      >
        <div className="mx-auto max-w-[1100px] px-[clamp(1.25rem,5vw,2.5rem)] h-full flex items-center justify-between gap-6">
          {/* Logo */}
          <Link
            href="/"
            className="fd text-[1.1875rem] tracking-[-0.025em] no-underline flex items-baseline"
            style={{ color: "var(--l-ink)" }}
          >
            Nexus
            <span className="italic" style={{ color: "var(--l-moss)" }}>
              AI
            </span>
          </Link>

          {/* Center links */}
          <div className="hidden md:flex items-center gap-8">
            {["Features", "How it works", "Sources"].map((label) => (
              <a
                key={label}
                href={`#${label.toLowerCase().replace(/ /g, "-")}`}
                className="fu text-[0.8125rem] no-underline transition-colors"
                style={{ color: "var(--l-ink2)" }}
                onMouseEnter={(e) =>
                  ((e.target as HTMLElement).style.color = "var(--l-ink)")
                }
                onMouseLeave={(e) =>
                  ((e.target as HTMLElement).style.color = "var(--l-ink2)")
                }
              >
                {label}
              </a>
            ))}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2.5">
            {status !== "loading" && (
              user ? (
                <div className="relative" ref={dropRef}>
                  <button
                    onClick={() => setDropOpen((v) => !v)}
                    className="flex items-center rounded-full focus:outline-none"
                    aria-label="Account menu"
                  >
                    {user.image ? (
                      <Image
                        src={user.image}
                        alt={user.name ?? "avatar"}
                        width={30}
                        height={30}
                        className="rounded-full"
                      />
                    ) : (
                      <span
                        className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-[0.8125rem] font-bold"
                        style={{ background: "var(--l-moss)", color: "#fff" }}
                      >
                        {(user.name ?? "U")[0].toUpperCase()}
                      </span>
                    )}
                  </button>

                  {dropOpen && (
                    <div
                      className="absolute right-0 top-[calc(100%+10px)] w-[220px] rounded-[10px] border shadow-lg overflow-hidden z-50"
                      style={{
                        background: "var(--l-sf)",
                        borderColor: "var(--l-br)",
                      }}
                    >
                      <div
                        className="px-4 py-3 border-b"
                        style={{ borderColor: "var(--l-br)" }}
                      >
                        <p className="fu text-[0.8125rem] font-semibold truncate" style={{ color: "var(--l-ink)" }}>
                          {user.name}
                        </p>
                        <p className="fu text-[0.75rem] truncate mt-0.5" style={{ color: "var(--l-ink3)" }}>
                          {user.email}
                        </p>
                      </div>
                      <Link
                        href="/workspace"
                        onClick={() => setDropOpen(false)}
                        className="block px-4 py-2.5 fu text-[0.8125rem] no-underline transition-colors"
                        style={{ color: "var(--l-ink2)" }}
                        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--l-ink)")}
                        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--l-ink2)")}
                      >
                        Go to workspace
                      </Link>
                      <button
                        onClick={() => signOut({ callbackUrl: "/login" })}
                        className="w-full text-left px-4 py-2.5 fu text-[0.8125rem] transition-colors border-t"
                        style={{ color: "var(--l-ink2)", borderColor: "var(--l-br)" }}
                        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--l-ink)")}
                        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--l-ink2)")}
                      >
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="hidden sm:block fu text-[0.8125rem] no-underline transition-colors"
                    style={{ color: "var(--l-ink2)" }}
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/login"
                    className="fu text-[0.8125rem] font-bold text-white px-4 py-[0.475rem] rounded-md no-underline transition-colors whitespace-nowrap"
                    style={{ background: "var(--l-moss)" }}
                  >
                    Get started →
                  </Link>
                </>
              )
            )}
            <button
              onClick={() =>
                setTheme(resolvedTheme === "dark" ? "light" : "dark")
              }
              className="w-8 h-8 flex items-center justify-center border rounded-md transition-colors flex-shrink-0"
              style={{
                borderColor: "var(--l-br)",
                color: "var(--l-ink2)",
              }}
              aria-label="Toggle dark mode"
            >
              {resolvedTheme === "dark" ? (
                <Sun size={15} />
              ) : (
                <Moon size={15} />
              )}
            </button>
            <button
              className="md:hidden w-8 h-8 flex items-center justify-center border rounded-md flex-shrink-0"
              style={{ borderColor: "var(--l-br)", color: "var(--l-ink)" }}
              onClick={() => setOpen(!open)}
              aria-label="Toggle menu"
            >
              {open ? <X size={16} /> : <Menu size={16} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div
          className="md:hidden fixed top-[60px] left-0 right-0 z-40 border-b flex flex-col"
          style={{
            background: "var(--l-bg)",
            borderColor: "var(--l-br)",
          }}
        >
          {["Features", "How it works", "Sources"].map((label) => (
            <a
              key={label}
              href={`#${label.toLowerCase().replace(/ /g, "-")}`}
              className="fu text-[0.9375rem] px-[clamp(1.25rem,5vw,2.5rem)] py-3 border-b no-underline"
              style={{
                borderColor: "var(--l-br)",
                color: "var(--l-ink2)",
              }}
              onClick={() => setOpen(false)}
            >
              {label}
            </a>
          ))}
          {user ? (
            <>
              <Link
                href="/workspace"
                className="fu text-[0.9375rem] px-[clamp(1.25rem,5vw,2.5rem)] py-3 border-b no-underline"
                style={{ borderColor: "var(--l-br)", color: "var(--l-ink2)" }}
                onClick={() => setOpen(false)}
              >
                Go to workspace
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="fu text-[0.9375rem] text-left px-[clamp(1.25rem,5vw,2.5rem)] py-3"
                style={{ color: "var(--l-ink3)" }}
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="fu text-[0.9375rem] px-[clamp(1.25rem,5vw,2.5rem)] py-3 no-underline"
                style={{ color: "var(--l-ink2)" }}
                onClick={() => setOpen(false)}
              >
                Sign in
              </Link>
              <Link
                href="/login"
                className="fu text-[0.9375rem] font-bold px-[clamp(1.25rem,5vw,2.5rem)] py-3 no-underline"
                style={{ color: "var(--l-moss)" }}
                onClick={() => setOpen(false)}
              >
                Get started →
              </Link>
            </>
          )}
        </div>
      )}
    </>
  );
}
