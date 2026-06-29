import { Playfair_Display, Lora } from "next/font/google";
import LandingNav from "@/components/landing/LandingNav";
import HeroSection from "@/components/landing/HeroSection";
import DemoSection from "@/components/landing/DemoSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import SourcesSection from "@/components/landing/SourcesSection";
import LandingFooter from "@/components/landing/LandingFooter";

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

export const metadata = {
  title: "NexusAI — Ask your documents anything",
  description:
    "NexusAI turns your uploaded documents, videos, and notes into a conversational knowledge base powered by multi-agent AI.",
};

export default function LandingPage() {
  return (
    <div
      className={`${playfair.variable} ${lora.variable} fb min-h-screen`}
      style={{ background: "var(--l-bg)", color: "var(--l-ink)" }}
    >
      <LandingNav />
      <HeroSection />
      <DemoSection />
      <FeaturesSection />
      <HowItWorksSection />
      <SourcesSection />
<LandingFooter />
    </div>
  );
}
