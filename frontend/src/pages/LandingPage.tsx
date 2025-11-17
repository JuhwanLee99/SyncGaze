// src/pages/LandingPage.tsx
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';
import DarkVeilBackground from '../components/DarkVeil';

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="landing-page">

      {/* Hero Section */}
      <header className="hero">
        <nav className="navbar">
          <div className="logo">AimTracker</div>
          <button className="nav-button" onClick={() => navigate('/auth')}>
            Sign In
          </button>
        </nav>
        
        <div className="hero-content">
          <h1>Master Your Aim with AI-Powered Eye Tracking</h1>
          <p className="hero-subtitle">
            Analyze your gaze patterns, improve reaction time, and unlock peak performance
          </p>
          <div className="cta-buttons">
            <button className="primary-button" onClick={() => navigate('/auth')}>
              Get Started
            </button>
            <button className="secondary-button" onClick={() => {
              document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
            }}>
              Learn More
            </button>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section id="features" className="features">
        <h2>Why Choose AimTracker?</h2>
        <div className="feature-grid">
          <div className="feature-card">
            <div className="feature-icon">👁️</div>
            <h3>Eye Tracking Technology</h3>
            <p>Advanced WebGazer integration for precise gaze tracking and analysis</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">📊</div>
            <h3>Data-Driven Insights</h3>
            <p>Comprehensive CSV reports with visualizations of your performance metrics</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">🎯</div>
            <h3>Calibrated Training</h3>
            <p>Personalized calibration ensures accurate tracking tailored to you</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">⚡</div>
            <h3>Real-Time Feedback</h3>
            <p>60-second training sessions with instant performance tracking</p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works">
        <h2>How It Works</h2>
        <div className="steps">
          <div className="step">
            <div className="step-number">1</div>
            <h3>Create Account</h3>
            <p>Sign up and access your personal dashboard</p>
          </div>
          
          <div className="step">
            <div className="step-number">2</div>
            <h3>Calibrate</h3>
            <p>Quick calibration process to optimize eye tracking</p>
          </div>
          
          <div className="step">
            <div className="step-number">3</div>
            <h3>Train</h3>
            <p>60-second sessions to improve your aim and reaction time</p>
          </div>
          
          <div className="step">
            <div className="step-number">4</div>
            <h3>Analyze</h3>
            <p>Review detailed metrics and track your progress</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <h2>Ready to Level Up Your Aim?</h2>
        <p>Join thousands of users improving their performance</p>
        <button className="primary-button large" onClick={() => navigate('/auth')}>
          Start Training Now
        </button>
      </section>

      {/* Footer */}
      <footer className="footer">
        <p>&copy; 2025 AimTracker. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default LandingPage;
