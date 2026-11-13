import type { Metadata } from "next";
import { GuideFooter, GuideMasthead, GuideOpening, GuideRail } from "@/components/guide/Chrome";
import { ColourSection } from "@/components/guide/sections/Colour";
import { InterfaceSection } from "@/components/guide/sections/Interface";
import { LayoutSection } from "@/components/guide/sections/Layout";
import { LogoSection } from "@/components/guide/sections/Logo";
import { MarksSection } from "@/components/guide/sections/Marks";
import { SternbildSection } from "@/components/guide/sections/Sternbild";
import { TypographySection } from "@/components/guide/sections/Typography";
import { UsingSection } from "@/components/guide/sections/Using";
import { WritingSection } from "@/components/guide/sections/Writing";
import { designFile } from "@/lib/guide";
import "./guide.css";

export const metadata: Metadata = {
  title: "Sternbild style guide",
  description: "The Sternbild style guide: the logo and seal, the marks, colour, type, layout, the application interface and writing.",
};

export default function StyleGuide() {
  return (
    <>
      {/* The guide is styled only by the published tokens, loaded by their hosted path, and by its own guide.css. */}
      <link rel="stylesheet" href={designFile("v1/sternbild.css")} precedence="default" />
      <a className="skip" href="#content">Skip to the guide</a>
      <GuideMasthead />
      <GuideOpening />
      <div className="page">
        <GuideRail />
        <main id="content">
          <SternbildSection />
          <LogoSection />
          <MarksSection />
          <ColourSection />
          <TypographySection />
          <LayoutSection />
          <InterfaceSection />
          <WritingSection />
          <UsingSection />
        </main>
      </div>
      <GuideFooter />
    </>
  );
}
