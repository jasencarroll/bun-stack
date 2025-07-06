import React from "react";
import { Hero } from "../components/Hero";
import { Features } from "../components/Features";
import { Comparison } from "../components/Comparison";
import { CodeExamples } from "../components/CodeExamples";
import { AboutProject } from "../components/AboutProject";
import { Roadmap } from "../components/Roadmap";
import { GetStarted } from "../components/GetStarted";
import { Philosophy } from "../components/Philosophy";
import { ContactForm } from "../components/ContactForm";
import { Footer } from "../components/Footer";
import { Navigation } from "../components/Navigation";
import { SEO } from "../components/SEO";
import { StructuredData } from "../components/StructuredData";

export function LandingPage() {
  return (
    <>
      <SEO 
        title="Bun Stack - The Rails of the JavaScript world"
        description="A full-stack framework for building modern web applications with Bun, React, and TypeScript. Get started in seconds with our Rails-inspired generator."
      />
      <StructuredData type="WebSite" />
      <StructuredData type="SoftwareApplication" />
      <StructuredData type="Organization" />
      <div className="min-h-screen">
        <Navigation />
        <Hero />
        <Features />
        <AboutProject />
        <Comparison />
        <CodeExamples />
        <Roadmap />
        <Philosophy />
        <ContactForm />
        <GetStarted />
        <Footer />
      </div>
    </>
  );
}
