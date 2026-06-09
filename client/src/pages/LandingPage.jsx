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
  const [scrollProgress, setScrollProgress] = useState(0);
  const rafRef = useRef(null);
  const lastScrollRef = useRef(0);

  useEffect(() => {
    setAppReady(true);
  }, [setAppReady]);

  const handleScroll = useCallback(() => {
    if (rafRef.current) return; // throttle via rAF

    rafRef.current = requestAnimationFrame(() => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? Math.min(scrollTop / docHeight, 1) : 0;

      // Only update if changed meaningfully (avoid excessive rerenders)
      if (Math.abs(progress - lastScrollRef.current) > 0.001) {
        lastScrollRef.current = progress;
        setScrollProgress(progress);
      }

      rafRef.current = null;
    });
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    // Initial calculation
    handleScroll();
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [handleScroll]);

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
      <FluidCanvas scrollProgress={scrollProgress} />

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
