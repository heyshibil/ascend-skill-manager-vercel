import { useEffect, useRef, useState, useCallback } from 'react';
import LandingNav from '../components/landing/LandingNav';
import HeroSection from '../components/landing/HeroSection';
import ProblemSection from '../components/landing/ProblemSection';
import ScoreRevealSection from '../components/landing/ScoreRevealSection';
import DashboardShowcase from '../components/landing/DashboardShowcase';
import MarketIntelSection from '../components/landing/MarketIntelSection';
import EcosystemSection from '../components/landing/EcosystemSection';
import FinalCTASection from '../components/landing/FinalCTASection';
import LandingFooter from '../components/landing/LandingFooter';
import FluidCanvas from '../components/landing/FluidCanvas';
import '../components/landing/landing.css';
import useUIStore from '../store/useUIStore';

export default function LandingPage() {
  const setAppReady = useUIStore((state) => state.setAppReady);

  useEffect(() => {
    setAppReady(true);
  }, [setAppReady]);

  // Smooth scroll for anchor links
  useEffect(() => {
    const handleAnchorClick = (e) => {
      const href = e.target.closest('a')?.getAttribute('href');
      if (href?.startsWith('#')) {
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    };

    document.addEventListener('click', handleAnchorClick);
    return () => document.removeEventListener('click', handleAnchorClick);
  }, []);

  return (
    <div className="landing-page">
      {/* Fixed Three.js background */}
      <FluidCanvas />

      {/* Content layer above the fluid */}
      <div className="landing-content">
        <LandingNav />
        <HeroSection />
        <ProblemSection />
        <ScoreRevealSection />
        <DashboardShowcase />
        <MarketIntelSection />
        <EcosystemSection />
        <FinalCTASection />
        <LandingFooter />
      </div>
    </div>
  );
}
