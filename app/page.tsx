import type { Metadata } from "next";
import { Chart } from "@/components/landing/Chart";
import { Footer } from "@/components/landing/Footer";
import { Gate, GateClass, GateScript } from "@/components/landing/Gate";
import { Masthead } from "@/components/landing/Masthead";
import { IndexSection, ProjectList } from "@/components/landing/ProjectList";
import { applications, projects } from "@/lib/projects";
import "./landing.css";

const description = "Sternbild is an organization dedicated to advancing human-centered values with AI.";

export const metadata: Metadata = {
  title: "Sternbild",
  description,
  openGraph: {
    title: "Sternbild",
    description,
    images: "https://sternbild.org/assets/og.png",
  },
  twitter: { card: "summary_large_image" },
};

export default function Home() {
  return (
    <>
      <GateClass />
      <Gate />
      {/* gate.js makes the site inert while the opening plays, before React hydrates. */}
      <div id="site" suppressHydrationWarning>
        <Masthead />
        <main id="top">
          <Chart />
          <IndexSection className="index" id="apps" label="Applications">
            <ProjectList lead={projects.atlas} rest={applications.map(key => projects[key])} />
          </IndexSection>
          <IndexSection className="research" id="research" label="Research">
            <ProjectList lead={projects.alioth} rest={[projects.polaris, projects.nebula, projects.orion, projects.quasar]} />
          </IndexSection>
        </main>
        <Footer />
      </div>
      <GateScript />
    </>
  );
}
