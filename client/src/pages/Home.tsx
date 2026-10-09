import React from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import heroImage from "../assets/Header_image.jpg";
import "../styles/Home.css";

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="home-page">
      <header className="home-header">
        <div className="header-container">
          <a className="brand" href="#" aria-label="CTP home">
            <span className="brand-mark">C</span>
            <span className="brand-copy">
              <strong>CTP</strong>
              <span>Learning platform</span>
            </span>
          </a>

          <nav className="home-navigation" aria-label="Main navigation">
            <a className="nav-link" href="#courses">
              Learning
            </a>
            <a className="nav-link" href="#approach">
              Our approach
            </a>
            <button
              className="login-button"
              onClick={() => navigate("/login")}
            >
              Log in
            </button>
            <button
              className="signup-button"
              onClick={() => navigate("/login")}
            >
              Get started <span aria-hidden="true">↗</span>
            </button>
            <button
              className="theme-toggle"
              aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
              onClick={toggleTheme}
            >
              <span aria-hidden="true">{theme === "light" ? "☾" : "☀"}</span>
            </button>
          </nav>
        </div>
      </header>

      <main>
        <section className="hero-section" aria-labelledby="hero-title">
          <div className="hero-container">
            <div className="hero-copy">
              <p className="eyebrow">
                <span className="eyebrow-dot" aria-hidden="true" />
                A smarter way to prepare
              </p>
              <h1 id="hero-title">
                Make your next
                <br />
                move <span>count.</span>
              </h1>
              <p className="hero-description">
                Build practical skills, learn at your own pace, and feel
                prepared for the opportunities ahead.
              </p>
              <div className="hero-actions">
                <a className="primary-button" href="#courses">
                  Explore learning <span aria-hidden="true">→</span>
                </a>
                <button
                  className="secondary-button"
                  onClick={() => navigate("/login")}
                >
                  Create your account
                </button>
              </div>
              <div className="hero-note">
                <span className="hero-note-icon" aria-hidden="true">✓</span>
                Learn on your schedule. Grow at your pace.
              </div>
            </div>

            <figure className="hero-visual">
              <img
                className="hero-image"
                src={heroImage}
                alt="Professionals greeting each other in a bright workspace"
              />
              <figcaption className="image-caption">
                <span className="caption-icon" aria-hidden="true">✳</span>
                <span>
                  <strong>Skills for what comes next</strong>
                  <small>Learn with purpose. Move forward with confidence.</small>
                </span>
              </figcaption>
            </figure>
          </div>
        </section>

        <section className="approach-section" id="approach">
          <div className="content-container approach-grid">
            <div className="section-heading">
              <p className="eyebrow">LEARNING, MADE PRACTICAL</p>
              <h2>Progress starts with a clear path.</h2>
            </div>
            <div className="approach-copy">
              <p>
                Finding your footing in technical learning should feel
                achievable. CTP brings structure and focus to the skills that
                help you take your next step.
              </p>
              <a className="text-link" href="#courses">
                See how you can learn <span aria-hidden="true">→</span>
              </a>
            </div>
          </div>
        </section>

        <section className="learning-section" id="courses">
          <div className="content-container">
            <div className="learning-heading">
              <div>
                <p className="eyebrow">YOUR JOURNEY, YOUR PACE</p>
                <h2>Build a foundation that lasts.</h2>
              </div>
              <p>
                A focused approach to learning new skills and putting them
                into practice.
              </p>
            </div>

            <div className="feature-grid">
              <article className="feature-card">
                <span className="feature-number">01</span>
                <div className="feature-icon" aria-hidden="true">↗</div>
                <h3>Learn with structure</h3>
                <p>
                  Follow organized learning paths that make complex topics
                  easier to navigate.
                </p>
              </article>
              <article className="feature-card">
                <span className="feature-number">02</span>
                <div className="feature-icon" aria-hidden="true">◇</div>
                <h3>Practice with purpose</h3>
                <p>
                  Reinforce what you learn with practical exercises and
                  hands-on activities.
                </p>
              </article>
              <article className="feature-card">
                <span className="feature-number">03</span>
                <div className="feature-icon" aria-hidden="true">◎</div>
                <h3>Prepare for what’s next</h3>
                <p>
                  Grow your confidence and develop skills for future
                  opportunities.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section className="closing-section">
          <div className="closing-card">
            <div>
              <p className="eyebrow">TAKE THE NEXT STEP</p>
              <h2>Your next opportunity starts here.</h2>
            </div>
            <button
              className="closing-button"
              onClick={() => navigate("/login")}
            >
              Get started <span aria-hidden="true">→</span>
            </button>
          </div>
        </section>
      </main>

      <footer className="home-footer">
        <div className="footer-container">
          <a className="footer-brand" href="#" aria-label="CTP home">
            <span className="brand-mark">C</span>
            <strong>CTP</strong>
          </a>
          <p>Learning with purpose, moving forward with confidence.</p>
          <small>© 2026 CTP. All rights reserved.</small>
        </div>
      </footer>
    </div>
  );
};

export default Home;
