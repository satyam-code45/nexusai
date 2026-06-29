import ScrollReveal from "./ScrollReveal";

const DocIcon = () => (
  <svg
    width="11"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
);

const GlobeIcon = () => (
  <svg
    width="11"
    height="11"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

const SendIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#fff"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

export default function DemoSection() {
  return (
    <section
      className="border-y py-[clamp(3rem,7vw,6rem)]"
      style={{
        background: "var(--l-sf)",
        borderColor: "var(--l-br)",
      }}
    >
      <div className="mx-auto max-w-[1100px] px-[clamp(1.25rem,5vw,2.5rem)]">
        {/* Header */}
        <ScrollReveal className="text-center mb-10">
          <p
            className="fu text-[0.6875rem] font-bold tracking-[0.14em] uppercase inline-block mb-2"
            style={{ color: "var(--l-moss)" }}
          >
            In action
          </p>
          <p className="fb text-[1rem]" style={{ color: "var(--l-ink2)" }}>
            Ask a question, get a cited answer — straight from your sources.
          </p>
        </ScrollReveal>

        {/* Chat window */}
        <ScrollReveal delay={80}>
          <div
            className="max-w-[840px] mx-auto border rounded-xl overflow-hidden"
            style={{
              borderColor: "var(--l-br)",
              background: "var(--l-bg)",
              boxShadow:
                "0 4px 24px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)",
            }}
          >
            {/* Title bar */}
            <div
              className="flex items-center gap-2 px-4 py-[0.6875rem] border-b"
              style={{ background: "var(--l-sf)", borderColor: "var(--l-br)" }}
            >
              <div className="w-2.5 h-2.5 rounded-full bg-[#FF6058]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
              <span
                className="flex-1 text-center fu text-[0.6875rem] tracking-[0.04em]"
                style={{ color: "var(--l-ink3)" }}
              >
                NexusAI — Payment Architecture Project
              </span>
            </div>

            {/* Body */}
            <div className="grid" style={{ gridTemplateColumns: "210px 1fr" }}>
              {/* Sidebar */}
              <div
                className="border-r p-4 hidden sm:block"
                style={{
                  background: "var(--l-sf)",
                  borderColor: "var(--l-br)",
                }}
              >
                <div
                  className="fu text-[0.625rem] font-bold tracking-[0.12em] uppercase mb-2.5"
                  style={{ color: "var(--l-ink3)" }}
                >
                  Sources · 3
                </div>

                {/* Active doc */}
                {[
                  { icon: <DocIcon />, name: "Razorpay_Payment_Flow.pdf", active: true },
                  { icon: <DocIcon />, name: "Backend_Architecture.docx", active: false },
                  { icon: <GlobeIcon />, name: "razorpay.com/docs/orders", active: false },
                ].map((doc) => (
                  <div
                    key={doc.name}
                    className="flex items-start gap-2 px-2 py-[0.4375rem] rounded-md mb-0.5 cursor-pointer"
                    style={{
                      background: doc.active ? "var(--l-tint)" : "transparent",
                    }}
                  >
                    <div
                      className="w-[26px] h-[30px] rounded flex items-center justify-center flex-shrink-0 mt-[1px] border"
                      style={{
                        background: doc.active
                          ? "color-mix(in srgb, var(--l-moss) 12%, transparent)"
                          : "var(--l-bg)",
                        borderColor: doc.active ? "var(--l-moss)" : "var(--l-br)",
                        color: doc.active ? "var(--l-moss)" : "var(--l-ink3)",
                      }}
                    >
                      {doc.icon}
                    </div>
                    <span
                      className="fu text-[0.6875rem] leading-[1.4]"
                      style={{
                        color: doc.active ? "var(--l-moss)" : "var(--l-ink2)",
                      }}
                    >
                      {doc.name}
                    </span>
                  </div>
                ))}
              </div>

              {/* Messages */}
              <div className="flex flex-col min-h-[340px]">
                <div className="flex-1 p-5 flex flex-col gap-4 overflow-auto">
                  {/* User message */}
                  <div className="flex flex-row-reverse gap-2">
                    <div
                      className="w-[26px] h-[26px] rounded-full border flex items-center justify-center flex-shrink-0 fu text-[0.5625rem] font-bold"
                      style={{
                        background: "var(--l-sf)",
                        borderColor: "var(--l-br)",
                        color: "var(--l-ink3)",
                      }}
                    >
                      You
                    </div>
                    <div
                      className="max-w-[88%] px-[0.875rem] py-[0.625rem] rounded-lg rounded-br-[2px] fu text-[0.8125rem] leading-[1.55]"
                      style={{ background: "var(--l-moss)", color: "#fff" }}
                    >
                      How should the backend contact the payment service when a
                      booking is confirmed?
                    </div>
                  </div>

                  {/* AI message */}
                  <div className="flex gap-2">
                    <div
                      className="w-[26px] h-[26px] rounded-full border flex items-center justify-center flex-shrink-0 fu text-[0.625rem] font-bold"
                      style={{
                        background: "var(--l-tint)",
                        borderColor:
                          "color-mix(in srgb, var(--l-moss) 30%, transparent)",
                        color: "var(--l-moss)",
                      }}
                    >
                      N
                    </div>
                    <div className="max-w-[88%]">
                      <div
                        className="px-[0.875rem] py-[0.625rem] rounded-lg rounded-bl-[2px] border fu text-[0.8125rem] leading-[1.55]"
                        style={{
                          background: "var(--l-sf)",
                          borderColor: "var(--l-br)",
                          color: "var(--l-ink)",
                        }}
                      >
                        Based on your Razorpay doc, the backend must initiate
                        the payment order server-side — never trust the client.
                        Call{" "}
                        <code
                          className="text-[0.9em] px-1 py-[0.1em] rounded"
                          style={{
                            background:
                              "color-mix(in srgb, var(--l-moss) 12%, transparent)",
                            color: "var(--l-moss)",
                          }}
                        >
                          POST /v1/orders
                        </code>{" "}
                        with the amount, receive an{" "}
                        <code
                          className="text-[0.9em] px-1 py-[0.1em] rounded"
                          style={{
                            background:
                              "color-mix(in srgb, var(--l-moss) 12%, transparent)",
                            color: "var(--l-moss)",
                          }}
                        >
                          order_id
                        </code>
                        , then verify the transaction only after Razorpay&apos;s
                        signed webhook fires.
                        {/* Citation */}
                        <div
                          className="mt-2 px-3 py-2 rounded-r-md text-[0.75rem] leading-[1.5] italic border-l-[2.5px]"
                          style={{
                            borderLeftColor: "var(--l-moss)",
                            background: "var(--l-tint)",
                            color: "var(--l-ink2)",
                          }}
                        >
                          &ldquo;The payment flow must be server-initiated: call
                          POST /v1/orders with the amount and currency, receive
                          an order_id, and only mark the booking confirmed after
                          verifying the Razorpay webhook signature on your
                          backend.&rdquo;
                          <span
                            className="block not-italic fu text-[0.6875rem] font-bold mt-1.5"
                            style={{ color: "var(--l-moss)" }}
                          >
                            ↗ Razorpay_Payment_Flow.pdf · p. 4
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Input bar */}
                <div
                  className="border-t px-4 py-2.5 flex items-center gap-2"
                  style={{
                    borderColor: "var(--l-br)",
                    background: "var(--l-bg)",
                  }}
                >
                  <div
                    className="flex-1 h-[34px] border rounded-md px-3 flex items-center fu text-[0.75rem]"
                    style={{
                      background: "var(--l-sf)",
                      borderColor: "var(--l-br)",
                      color: "var(--l-ink3)",
                    }}
                  >
                    Ask a follow-up question…
                  </div>
                  <div
                    className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0"
                    style={{ background: "var(--l-moss)" }}
                  >
                    <SendIcon />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
