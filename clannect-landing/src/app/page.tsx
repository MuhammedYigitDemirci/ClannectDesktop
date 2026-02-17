"use client";

import { ArrowRight, Gamepad2, Users, Trophy, MessageCircle, Shield, Zap, Sparkles, Coins, Rocket, ListTodo, Target, Gem } from "lucide-react";

export default function LandingPage() {

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "white" }}>
      {/* Navigation */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 50, background: "rgba(10, 10, 10, 0.9)", backdropFilter: "blur(8px)", borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
        <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "0 24px", height: "64px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <img src="/ClannectLogo.png" alt="Clannect" style={{ height: "40px", width: "auto" }} />
          <div style={{ display: "none", gap: "32px" } as any}>
            <a href="#features" style={{ fontSize: "14px", color: "#9ca3af", textDecoration: "none" }}>Features</a>
            <a href="#about" style={{ fontSize: "14px", color: "#9ca3af", textDecoration: "none" }}>About</a>
          </div>
          <button
            onClick={() => (window.location.href = "https://app.clannect.com")}
            style={{ padding: "8px 16px", background: "#fe4133", color: "white", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: "500", cursor: "pointer" }}
          >
            Get Started
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section style={{ position: "relative", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px", paddingTop: "80px" }}>
        {/* Background glow */}
        <div style={{ position: "absolute", top: "25%", left: "50%", transform: "translate(-50%, -50%)", width: "600px", height: "400px", background: "rgba(254, 65, 51, 0.15)", borderRadius: "50%", filter: "blur(120px)", pointerEvents: "none" }}></div>
        
        <div style={{ position: "relative", textAlign: "center", maxWidth: "768px", margin: "0 auto" }}>
          {/* Badge */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "8px 16px", background: "rgba(254, 65, 51, 0.1)", border: "1px solid rgba(254, 65, 51, 0.3)", borderRadius: "9999px", marginBottom: "32px" }}>
            <span style={{ width: "8px", height: "8px", background: "#fe4133", borderRadius: "50%", animation: "pulse 2s infinite" }}></span>
            <span style={{ fontSize: "14px", color: "#fe4133", fontWeight: "500" }}>Beta • Coming Soon</span>
          </div>

          {/* Headline */}
          <h1 style={{ fontSize: "48px", fontWeight: "bold", marginBottom: "24px", lineHeight: "1.2" }}>
            Social Media<br />
            <span style={{ color: "#fe4133" }}>As a Game</span>
          </h1>

          {/* Subheadline */}
          <p style={{ fontSize: "18px", color: "#9ca3af", maxWidth: "500px", margin: "0 auto 40px", lineHeight: "1.6" }}>
            Earn XP, level up, complete quests, and unlock rewards. Turn social interaction into an epic gameplay experience with RPG mechanics, daily challenges, and strategic boosts.
          </p>

          {/* CTA */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "48px", alignItems: "center" }}>
            <button
              onClick={() => (window.location.href = "https://app.clannect.com")}
              style={{ display: "flex", alignItems: "center", gap: "8px", padding: "12px 24px", background: "#fe4133", color: "white", border: "none", borderRadius: "12px", fontWeight: "600", cursor: "pointer" }}
            >
              Start Playing
              <ArrowRight size={20} />
            </button>
            <button style={{ padding: "12px 24px", border: "1px solid rgba(255, 255, 255, 0.2)", color: "white", background: "transparent", borderRadius: "12px", fontWeight: "600", cursor: "pointer" }}>
              Documentation
            </button>
          </div>
        </div>
        {/* Hero Image - Positioned absolutely so it doesn't affect layout */}
        <div style={{ position: "absolute", bottom: "-100px", left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: "900px", textAlign: "center", pointerEvents: "none" }}>
          <img src="/HeroSectionGoblins.png" alt="Clannect Hero" style={{ width: "100%", height: "auto", maxHeight: "300px", objectFit: "contain", opacity: 0.75 }} />
        </div>      </section>

      {/* We Are Still Getting Better Section */}
      <section id="features" style={{ padding: "80px 24px", borderTop: "1px solid rgba(254, 65, 51, 0.2)", background: "linear-gradient(135deg, rgba(254, 65, 51, 0.05) 0%, rgba(254, 65, 51, 0.02) 100%)" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "60px", alignItems: "center", marginBottom: "48px" }}>
            {/* Left side - Content */}
            <div>
              <div style={{ marginBottom: "40px" }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "12px 24px", background: "rgba(254, 65, 51, 0.1)", border: "1px solid rgba(254, 65, 51, 0.3)", borderRadius: "9999px", marginBottom: "24px" }}>
                  <Rocket size={16} color="#fe4133" />
                  <span style={{ fontSize: "14px", color: "#fe4133", fontWeight: "600" }}>Our Journey</span>
                </div>
                <h2 style={{ fontSize: "42px", fontWeight: "bold", marginBottom: "24px", lineHeight: "1.2" }}>
                  We Are Still
                  <br />
                  <span className="gradient-text" style={{ background: "linear-gradient(135deg, #fe4133 0%, #a855f7 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Getting Better</span>
                </h2>
                <p style={{ color: "#9ca3af", fontSize: "16px", lineHeight: "1.8" }}>
                  Clannect is evolving every single day. We're constantly building new features, improving existing ones, and listening to what you want. The core experience is live and ready. Jump in and shape the future with us.
                </p>
              </div>

              {/* Features coming section */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div style={{ padding: "20px", background: "rgba(34, 197, 94, 0.05)", border: "1px solid rgba(34, 197, 94, 0.2)", borderRadius: "12px", textAlign: "center" }}>
                  <div style={{ marginBottom: "8px", display: "flex", justifyContent: "center" }}>
                    <Zap size={24} color="#22c55e" />
                  </div>
                  <h3 style={{ fontSize: "13px", fontWeight: "600", marginBottom: "4px" }}>XP & Leveling</h3>
                  <p style={{ fontSize: "11px", color: "#22c55e", fontWeight: "600" }}>Added!</p>
                </div>
                <div style={{ padding: "20px", background: "rgba(254, 65, 51, 0.05)", border: "1px solid rgba(254, 65, 51, 0.2)", borderRadius: "12px", textAlign: "center" }}>
                  <div style={{ marginBottom: "8px", display: "flex", justifyContent: "center" }}>
                    <ListTodo size={24} color="#fe4133" />
                  </div>
                  <h3 style={{ fontSize: "13px", fontWeight: "600", marginBottom: "4px" }}>Daily Quests</h3>
                  <p style={{ fontSize: "11px", color: "#6b7280" }}>Coming Soon</p>
                </div>
                <div style={{ padding: "20px", background: "rgba(254, 65, 51, 0.05)", border: "1px solid rgba(254, 65, 51, 0.2)", borderRadius: "12px", textAlign: "center" }}>
                  <div style={{ marginBottom: "8px", display: "flex", justifyContent: "center" }}>
                    <Target size={24} color="#fe4133" />
                  </div>
                  <h3 style={{ fontSize: "13px", fontWeight: "600", marginBottom: "4px" }}>Strategic Boosts</h3>
                  <p style={{ fontSize: "11px", color: "#6b7280" }}>Coming Soon</p>
                </div>
                <div style={{ padding: "20px", background: "rgba(254, 65, 51, 0.05)", border: "1px solid rgba(254, 65, 51, 0.2)", borderRadius: "12px", textAlign: "center" }}>
                  <div style={{ marginBottom: "8px", display: "flex", justifyContent: "center" }}>
                    <Gem size={24} color="#fe4133" />
                  </div>
                  <h3 style={{ fontSize: "13px", fontWeight: "600", marginBottom: "4px" }}>Cosmetics</h3>
                  <p style={{ fontSize: "11px", color: "#6b7280" }}>Coming Soon</p>
                </div>
              </div>
            </div>

            {/* Right side - Image */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
              <img src="/BuildingGettingBetterSection.png" alt="Kings Building" style={{ width: "100%", height: "auto", maxWidth: "450px", borderRadius: "16px" }} />
            </div>
          </div>

          {/* CTA */}
          <div style={{ textAlign: "center", padding: "48px 32px", background: "linear-gradient(135deg, rgba(254, 65, 51, 0.08), rgba(254, 65, 51, 0.04))", border: "1px solid rgba(254, 65, 51, 0.3)", borderRadius: "20px" }}>
            <p style={{ color: "#9ca3af", fontSize: "16px", marginBottom: "24px", lineHeight: "1.6" }}>
              The best is yet to come. Be part of something special. Join thousands of players already experiencing the future of social media.
            </p>
            <button
              onClick={() => (window.location.href = "https://app.clannect.com")}
              style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "14px 32px", background: "linear-gradient(135deg, #fe4133 0%, #a855f7 100%)", color: "white", border: "none", borderRadius: "12px", fontWeight: "600", cursor: "pointer", fontSize: "16px" }}
            >
              Start Your Journey
              <span style={{ fontSize: "18px" }}>→</span>
            </button>
          </div>
        </div>
      </section>

      {/* Problems Solved Section */}
      <section style={{ padding: "80px 24px", borderTop: "1px solid rgba(255, 255, 255, 0.05)", background: "linear-gradient(135deg, rgba(254, 65, 51, 0.03) 0%, rgba(254, 65, 51, 0.02) 100%)", position: "relative" }}>
        <div style={{ maxWidth: "1080px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "48px" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "12px 24px", background: "rgba(254, 65, 51, 0.1)", border: "1px solid rgba(254, 65, 51, 0.3)", borderRadius: "9999px", marginBottom: "24px" }}>
              <Shield size={16} color="#fe4133" />
              <span style={{ fontSize: "14px", color: "#fe4133", fontWeight: "600" }}>The Problem</span>
            </div>
            <h2 style={{ fontSize: "42px", fontWeight: "bold", marginBottom: "24px", lineHeight: "1.2" }}>
              Why
              <br />
              <span className="gradient-text" style={{ background: "linear-gradient(135deg, #fe4133 0%, #a855f7 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Clannect?</span>
            </h2>
            <p style={{ color: "#9ca3af", fontSize: "18px", lineHeight: "1.8", maxWidth: "700px", margin: "0 auto" }}>
              Social media today doesn't reward your time and effort. Clannect changes that with real progression and actual control.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "24px" }}>
            <ProblemCard title="Low Engagement" solution="Gamification makes interactions rewarding and addictive" />
            <ProblemCard title="Unfair Algorithms" solution="Strategic boosts give you control over your content reach" />
            <ProblemCard title="Boring Profiles" solution="Customize everything with progression and cosmetics" />
            <ProblemCard title="No Progress" solution="Level up, earn rewards, and track your growth visually" />
          </div>

          {/* Fight Problem Image - Positioned absolutely */}
          <div style={{ position: "absolute", bottom: "-120px", left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: "600px", textAlign: "center", pointerEvents: "none" }}>
            <img src="/FightProblemSection.png" alt="Fight Problem Section" style={{ width: "100%", height: "auto", maxHeight: "350px", objectFit: "contain", opacity: 0.5, pointerEvents: "auto" }} />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="about" style={{ padding: "80px 24px", borderTop: "1px solid rgba(254, 65, 51, 0.2)", background: "linear-gradient(135deg, rgba(254, 65, 51, 0.02) 0%, rgba(254, 65, 51, 0.01) 100%)" }}>
        <div style={{ maxWidth: "900px", margin: "0 auto" }}>
          <div style={{ padding: "60px 48px", background: "linear-gradient(135deg, rgba(254, 65, 51, 0.08) 0%, rgba(254, 65, 51, 0.04) 100%)", border: "1px solid rgba(254, 65, 51, 0.3)", borderRadius: "24px", textAlign: "center" }}>
            <h2 style={{ fontSize: "42px", fontWeight: "bold", marginBottom: "24px", lineHeight: "1.2" }}>
              <span className="gradient-text" style={{ background: "linear-gradient(135deg, #fe4133 0%, #a855f7 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Ready to Play?</span>
            </h2>
            <p style={{ color: "#9ca3af", marginBottom: "32px", fontSize: "16px", lineHeight: "1.8", maxWidth: "600px", margin: "0 auto 32px" }}>
              Join thousands of players reshaping how social media works. Create your account and start earning rewards from day one.
            </p>
            <button
              onClick={() => (window.location.href = "https://app.clannect.com")}
              style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "14px 32px", background: "linear-gradient(135deg, #fe4133 0%, #a855f7 100%)", color: "white", border: "none", borderRadius: "12px", fontWeight: "600", cursor: "pointer", fontSize: "16px" }}
            >
              Get Started Now
              <ArrowRight size={20} />
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: "32px 24px", borderTop: "1px solid rgba(254, 65, 51, 0.2)", background: "rgba(254, 65, 51, 0.02)" }}>
        <div style={{ maxWidth: "1280px", margin: "0 auto", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
          <img src="/ClannectLogo.png" alt="Clannect" style={{ height: "32px", width: "auto" }} />
          <div style={{ display: "flex", alignItems: "center", gap: "24px", fontSize: "12px", color: "#9ca3af" }}>
            <a href="#" style={{ color: "#9ca3af", textDecoration: "none" }}>About</a>
            <a href="#" style={{ color: "#9ca3af", textDecoration: "none" }}>Privacy</a>
            <a href="#" style={{ color: "#9ca3af", textDecoration: "none" }}>Terms</a>
          </div>
          <p style={{ fontSize: "12px", color: "#6b7280" }}>© 2026 Clannect</p>
        </div>
      </footer>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        /* Selection styling */
        ::selection {
          background-color: #fe4133;
          color: white;
        }
        ::-moz-selection {
          background-color: #fe4133;
          color: white;
        }
        
        /* Gradient text selection fix */
        .gradient-text::selection {
          background-color: transparent;
          color: inherit;
        }
        .gradient-text::-moz-selection {
          background-color: transparent;
          color: inherit;
        }
        
        /* Focus and active states */
        a:hover { color: #fe4133; transition: color 0.2s; }
        a:focus { outline: none; color: #fe4133; }
        a:active { color: white; }
        
        button:hover { opacity: 0.9; }
        button:focus { outline: 2px solid #fe4133; outline-offset: 2px; }
        button:active { transform: scale(0.98); }
        
        input:focus, textarea:focus, select:focus {
          outline: none;
          border-color: #fe4133 !important;
          box-shadow: 0 0 0 3px rgba(254, 65, 51, 0.1);
        }
        
        /* Focus visible for accessibility */
        *:focus-visible {
          outline: 2px solid #fe4133;
          outline-offset: 2px;
        }
      `}</style>
    </div>
  );
}

// Feature Card Component
function FeatureCard({ icon, iconBg, title, description }: { 
  icon: React.ReactNode; 
  iconBg: string; 
  title: string; 
  description: string; 
}) {
  return (
    <div style={{ padding: "20px", background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.05)", borderRadius: "16px", transition: "all 0.3s" }}>
      <div style={{ width: "40px", height: "40px", background: `${iconBg}1a`, borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "12px" }}>
        {icon}
      </div>
      <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "8px" }}>{title}</h3>
      <p style={{ color: "#9ca3af", fontSize: "14px", lineHeight: "1.5" }}>{description}</p>
    </div>
  );
}

// Problem Card Component
function ProblemCard({ title, solution }: { title: string; solution: string }) {
  return (
    <div style={{ padding: "32px", background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(254, 65, 51, 0.2)", borderRadius: "16px", transition: "all 0.3s ease", overflow: "hidden" }}>
      {/* Problem section */}
      <div style={{ marginBottom: "24px", paddingBottom: "24px", borderBottom: "1px solid rgba(254, 65, 51, 0.1)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
          <div style={{ width: "32px", height: "32px", background: "rgba(254, 65, 51, 0.15)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: "18px", color: "#fe4133", fontWeight: "bold" }}>✗</span>
          </div>
          <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#fe4133" }}>{title}</h3>
        </div>
        <p style={{ fontSize: "13px", color: "#9ca3af", marginLeft: "44px" }}>The problem with traditional social media</p>
      </div>

      {/* Solution section */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
          <div style={{ width: "32px", height: "32px", background: "rgba(34, 197, 94, 0.15)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: "18px", color: "#22c55e", fontWeight: "bold" }}>✓</span>
          </div>
          <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#22c55e" }}>Clannect Solution</h3>
        </div>
        <p style={{ fontSize: "14px", color: "#9ca3af", lineHeight: "1.6", marginLeft: "44px" }}>
          {solution}
        </p>
      </div>
    </div>
  );
}
