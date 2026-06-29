import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest) {
  const { email } = await req.json();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    // Config missing — log server-side, still return success to user
    console.warn("[waitlist] SMTP_USER / SMTP_PASS not set — email skipped. Signup:", email);
    return NextResponse.json({ ok: true });
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });

  await transporter.sendMail({
    from: `"NexusAI Waitlist" <${user}>`,
    to: "satyam45.dev@gmail.com",
    subject: "New waitlist signup 🎉",
    text: `${email} just joined the NexusAI waitlist.`,
    html: `<p><strong>${email}</strong> just joined the NexusAI waitlist.</p>`,
  });

  return NextResponse.json({ ok: true });
}
