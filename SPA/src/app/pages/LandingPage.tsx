import React from "react";
import { Hero } from "../components/Hero";
import { Features } from "../components/Features";
import { Comparison } from "../components/Comparison";
import { CodeExamples } from "../components/CodeExamples";
import { GetStarted } from "../components/GetStarted";
import { ContactForm } from "../components/ContactForm";
import { Footer } from "../components/Footer";
import { Navigation } from "../components/Navigation";

export function LandingPage() {
  return (
    <div className="min-h-screen">
      <Navigation />
      <Hero />
      <Features />
      <Comparison />
      <CodeExamples />
      <GetStarted />
      <ContactForm />
      <Footer />
    </div>
  );
}
