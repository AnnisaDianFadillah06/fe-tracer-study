import LandingNav from "@/components/landing/LandingNav";
import HeroSection from "@/components/landing/HeroSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import StatsSection from "@/components/landing/StatsSection";
import TeamSection from "@/components/landing/TeamSection";
import FooterSection from "@/components/landing/FooterSection";

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      <LandingNav />
      <HeroSection />
      <FeaturesSection />
      <StatsSection />
      <TeamSection />
      <FooterSection />
    </div>
  );
};

export default Landing;
