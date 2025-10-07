import React, { useState } from 'react';
import styles from './PEWelcomeNav.module.css';
import { Link } from 'react-router-dom';

const PEWelcomeNav = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <nav className={styles.navbar}>
      <div className={styles.navContainer}>
        {/* Logo Section */}
        <div className={styles.logoSection}>
          {/*<Link to="/" className={styles.logo}>*/}
          {/*  <svg viewBox="0 0 200 200" className={styles.logoIcon}>*/}
          {/*    <g transform="translate(100, 100)">*/}
          {/*      <path*/}
          {/*        d="M-40,-40 L40,-40 L40,-20 L-20,-20 L-20,0 L30,0 L30,20 L-20,20 L-20,40 L40,40"*/}
          {/*        stroke="#ffffff"*/}
          {/*        strokeWidth="12"*/}
          {/*        strokeLinecap="round"*/}
          {/*        strokeLinejoin="round"*/}
          {/*        fill="none"*/}
          {/*      />*/}
          {/*      <circle cx="-25" cy="-25" r="8" fill="#7BA2E0FF"/>*/}
          {/*      <circle cx="25" cy="25" r="8" fill="#7BA2E0FF"/>*/}
          {/*    </g>*/}
          {/*  </svg>*/}
          {/*</Link>*/}
          <Link to="/" className={styles.brandName}>
            <span className={styles.brandText}>Effora</span>
            <span className={styles.brandSuffix}>.ai</span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <div className={styles.navLinks}>
          {/*<a href="#platform" className={styles.navLink}>Platform</a>*/}
          {/*<a href="#solutions" className={styles.navLink}>Solutions</a>*/}
          {/*<a href="#resources" className={styles.navLink}>Resources</a>*/}
          {/*<Link to="/pricing" className={styles.navLink}>Pricing</Link>*/}
        </div>

        {/* Action Buttons */}
        <div className={styles.navActions}>
          <Link to="/login" className={styles.loginBtn}>
            Log In
          </Link>
          {/*<button className={styles.loginBtn}>Log In</button>*/}
          {/*<button className={styles.signupBtn}>Sign Up</button>*/}
          {/*<button className={styles.adminBtn}>Admin</button>*/}
        </div>

        {/* Mobile Menu Button */}
        <button
          className={styles.mobileMenuBtn}
          onClick={toggleMobileMenu}
          aria-label="Toggle mobile menu"
        >
          <div className={`${styles.hamburger} ${isMobileMenuOpen ? styles.active : ''}`}>
            <span></span>
            <span></span>
            <span></span>
          </div>
        </button>
      </div>

      {/* Mobile Menu */}
      <div className={`${styles.mobileMenu} ${isMobileMenuOpen ? styles.open : ''}`}>
        <div className={styles.mobileNavLinks}>
          <a href="#platform" className={styles.mobileNavLink} onClick={toggleMobileMenu}>Platform</a>
          <a href="#solutions" className={styles.mobileNavLink} onClick={toggleMobileMenu}>Solutions</a>
          <a href="#resources" className={styles.mobileNavLink} onClick={toggleMobileMenu}>Resources</a>
          <a href="#pricing" className={styles.mobileNavLink} onClick={toggleMobileMenu}>Pricing</a>
        </div>
        <div className={styles.mobileActions}>
          <button className={styles.mobileLoginBtn} onClick={toggleMobileMenu}>Log In</button>
          {/*<button className={styles.mobileSignupBtn} onClick={toggleMobileMenu}>Sign Up</button>*/}
          {/*<button className={styles.mobileAdminBtn} onClick={toggleMobileMenu}>Admin</button>*/}
        </div>
      </div>
    </nav>
  );
};

export default PEWelcomeNav;