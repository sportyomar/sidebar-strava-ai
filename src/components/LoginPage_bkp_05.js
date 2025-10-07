import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import styles from './LoginPage.module.css';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5002';

const LoginPage = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [view, setView] = useState('loading');
  const [rememberedUsers, setRememberedUsers] = useState([]);
  const [showPassword, setShowPassword] = useState(false);

  // Marketing content state
  const [marketingContent, setMarketingContent] = useState({});
  const [contentLoading, setContentLoading] = useState(true);

  // Fetch marketing content based on audience
  const fetchMarketingContent = async (audience) => {
    try {
      setContentLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/marketing/content?page=login&audience=${audience}`);
      if (response.ok) {
        const content = await response.json();
        setMarketingContent(content);
      } else {
        console.warn('Failed to fetch marketing content, using fallbacks');
      }
    } catch (error) {
      console.error('Error fetching marketing content:', error);
    } finally {
      setContentLoading(false);
    }
  };

  // Detect audience and load content
  useEffect(() => {
    console.log('🚀 Component mounted - checking localStorage...');

    const timer = setTimeout(() => {
      try {
        const rawData = localStorage.getItem('rememberedUsers');
        console.log('📦 Raw localStorage data:', rawData);

        if (rawData && rawData !== 'null' && rawData !== 'undefined' && rawData.trim() !== '') {
          const parsedData = JSON.parse(rawData);
          console.log('✅ Parsed data:', parsedData);

          if (Array.isArray(parsedData)) {
            console.log(`👥 Found ${parsedData.length} remembered users`);
            setRememberedUsers(parsedData);

            let detectedView = 'default';
            if (parsedData.length === 0) {
              detectedView = 'default';
              console.log('📋 No users -> default view');
            } else if (parsedData.length === 1) {
              detectedView = 'single';
              console.log('👤 1 user -> single view');
            } else {
              detectedView = 'multiple';
              console.log('👥 Multiple users -> multiple view');
            }

            setView(detectedView);
            fetchMarketingContent(detectedView);
          } else {
            console.log('⚠️ Data is not an array, using default view');
            setView('default');
            fetchMarketingContent('default');
          }
        } else {
          console.log('📭 No valid localStorage data found');
          setView('default');
          fetchMarketingContent('default');
        }
      } catch (error) {
        console.error('❌ Error reading localStorage:', error);
        setView('default');
        fetchMarketingContent('default');
      }
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // Debug panel
  const DebugInfo = () => (
    <div style={{
      position: 'fixed',
      top: 10,
      right: 10,
      background: 'rgba(0,0,0,0.8)',
      color: 'white',
      padding: '10px',
      borderRadius: '5px',
      fontSize: '12px',
      zIndex: 9999,
      fontFamily: 'monospace'
    }}>
      <div><strong>🔍 DEBUG</strong></div>
      <div>View: <span style={{color: 'yellow'}}>{view}</span></div>
      <div>Users: <span style={{color: 'yellow'}}>{rememberedUsers.length}</span></div>
      <div>Content: <span style={{color: 'yellow'}}>{contentLoading ? 'Loading' : 'Loaded'}</span></div>
      <div>
        localStorage: <span style={{color: 'yellow'}}>
          {localStorage.getItem('rememberedUsers') ? 'EXISTS' : 'EMPTY'}
        </span>
      </div>
      <button
        onClick={() => {
          console.log('=== MANUAL DEBUG ===');
          console.log('Current view:', view);
          console.log('Marketing content:', marketingContent);
          console.log('Remembered users:', rememberedUsers);
        }}
        style={{fontSize: '10px', marginTop: '5px', padding: '2px 5px'}}
      >
        Log Debug
      </button>
    </div>
  );

  const addRememberedUser = (userData, token) => {
    const userProfile = {
      email: userData.email || formData.email,
      name: userData.display_name || userData.username || 'User',
      profileImage: userData.avatar || userData.avatar_url || null,
      token: token,
      lastLogin: new Date().toISOString()
    };

    const existing = [...rememberedUsers];
    const existingIndex = existing.findIndex(user => user.email === userProfile.email);

    if (existingIndex >= 0) {
      existing[existingIndex] = userProfile;
    } else {
      existing.push(userProfile);
    }

    localStorage.setItem('rememberedUsers', JSON.stringify(existing));
    setRememberedUsers(existing);

    // Update view and fetch new content
    let newView = 'default';
    if (existing.length === 1) {
      newView = 'single';
    } else if (existing.length > 1) {
      newView = 'multiple';
    }

    setView(newView);
    fetchMarketingContent(newView);
  };

  const removeProfile = (emailToRemove) => {
    const filtered = rememberedUsers.filter(user => user.email !== emailToRemove);
    setRememberedUsers(filtered);
    localStorage.setItem('rememberedUsers', JSON.stringify(filtered));

    let newView = 'default';
    if (filtered.length === 1) {
      newView = 'single';
    } else if (filtered.length > 1) {
      newView = 'multiple';
    }

    setView(newView);
    fetchMarketingContent(newView);
  };

  const quickSignIn = async (user) => {
    setIsLoading(true);
    setError('');

    try {
      if (user.token) {
        const verifyResponse = await fetch(`${API_BASE_URL}/api/auth/me`, {
          headers: { 'Authorization': `Bearer ${user.token}` }
        });

        if (verifyResponse.ok) {
          localStorage.setItem('authToken', user.token);
          localStorage.setItem('user', JSON.stringify({
            email: user.email,
            display_name: user.name,
            avatar: user.profileImage
          }));
          window.location.href = '/dashboard';
          return;
        } else {
          removeProfile(user.email);
          setError('Session expired. Please sign in again.');
          return;
        }
      }

      setView('default');
      fetchMarketingContent('default');
      setTimeout(() => {
        setFormData(prev => ({ ...prev, email: user.email }));
      }, 0);
    } catch (error) {
      console.error('Quick sign in error:', error);
      setError('Network error. Please try again.');
      removeProfile(user.email);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password
        }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));

        if (formData.rememberMe) {
          addRememberedUser(data.user, data.token);
        }

        window.location.href = '/dashboard';
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Login failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Network error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Helper function to get content with fallback
  const getContent = (key, fallback = '') => {
    return marketingContent[key]?.value || fallback;
  };

  // Side Panel Component for Default View
  const DefaultSidePanel = () => (
    <div className={styles.sidePanel}>
      <div className={styles.sidePanelContent}>
        <h2 className={styles.sidePanelTitle}>
          {getContent('login_default_title', 'Stop Fighting Broken AI. Start Building on Solid Ground.')}
        </h2>
        <p className={styles.sidePanelSubtitle}>
          {getContent('login_default_subtitle', 'The telemetry platform that eliminates the painful cycle of AI failure → manual fixes → higher costs')}
        </p>
        <div className={styles.features}>
          <div className={styles.feature}>
            <div className={styles.featureIcon}>📊</div>
            <div className={styles.featureContent}>
              <h3>{getContent('login_default_feature_1_title', 'End the Guessing Game')}</h3>
              <p>{getContent('login_default_feature_1_desc', 'See exactly why your AI fails instead of throwing resources at symptoms')}</p>
            </div>
          </div>
          <div className={styles.feature}>
            <div className={styles.featureIcon}>🔄</div>
            <div className={styles.featureContent}>
              <h3>{getContent('login_default_feature_2_title', 'Surgical Fixes, Not Band-Aids')}</h3>
              <p>{getContent('login_default_feature_2_desc', 'Target root causes with precision instead of expensive workarounds')}</p>
            </div>
          </div>
          <div className={styles.feature}>
            <div className={styles.featureIcon}>⚡</div>
            <div className={styles.featureContent}>
              <h3>{getContent('login_default_feature_3_title', 'Innovation at Scale')}</h3>
              <p>{getContent('login_default_feature_3_desc', 'Build ambitious AI workflows knowing your foundation won\'t crack')}</p>
            </div>
          </div>
        </div>
        <div className={styles.callToAction}>
          <div className={styles.ctaText}>
            {getContent('login_default_cta_text', 'Every hour debugging AI is an hour not innovating. Ready to build breakthrough AI with confidence?')}
          </div>
          <a href="/docs" className={styles.ctaButton}>
            {getContent('login_default_cta_button', 'Secure Your AI Foundation')}
          </a>
        </div>
      </div>
    </div>
  );

  // Side Panel Component for Single Profile View
  const SingleProfileSidePanel = () => (
    <div className={styles.sidePanel}>
      <div className={styles.sidePanelContent}>
        <h2 className={styles.sidePanelTitle}>
          {getContent('login_single_title', 'The Foundation for Ambitious AI Innovation')}
        </h2>
        <p className={styles.sidePanelSubtitle}>
          {getContent('login_single_subtitle', 'Build breakthrough AI workflows in high-stakes environments where failure isn\'t an option')}
        </p>

        <div className={styles.features}>
          <div className={styles.feature}>
            <div className={styles.featureIcon}>
              <svg className={styles.iconBlueprint} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <line x1="9" y1="9" x2="15" y2="9"/>
                <line x1="9" y1="12" x2="15" y2="12"/>
                <line x1="9" y1="15" x2="15" y2="15"/>
                <circle cx="6" cy="9" r="1"/>
                <circle cx="6" cy="12" r="1"/>
                <circle cx="6" cy="15" r="1"/>
              </svg>
            </div>
            <div className={styles.featureContent}>
              <h3>{getContent('login_single_feature_1_title', 'Business-Critical Reliability')}</h3>
              <p>{getContent('login_single_feature_1_desc', 'AI infrastructure solid enough for mission-critical workflows')}</p>
            </div>
          </div>

          <div className={styles.feature}>
            <div className={styles.featureIcon}>
              <svg className={styles.iconModules} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="8" height="8" rx="1"/>
                <rect x="13" y="3" width="8" height="8" rx="1"/>
                <rect x="3" y="13" width="8" height="8" rx="1"/>
                <rect x="13" y="13" width="8" height="8" rx="1"/>
                <path d="M11 7h2"/>
                <path d="M7 11v2"/>
                <path d="M17 11v2"/>
                <path d="M11 17h2"/>
              </svg>
            </div>
            <div className={styles.featureContent}>
              <h3>{getContent('login_single_feature_2_title', 'Innovation Without Limits')}</h3>
              <p>{getContent('login_single_feature_2_desc', 'Push boundaries knowing your foundation won\'t crack under pressure')}</p>
            </div>
          </div>

          <div className={styles.feature}>
            <div className={styles.featureIcon}>
              <svg className={styles.iconEngineering} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="4" y="4" width="16" height="16" rx="2"/>
                <rect x="6" y="6" width="12" height="4" rx="1"/>
                <rect x="6" y="14" width="12" height="4" rx="1"/>
                <line x1="8" y1="12" x2="16" y2="12"/>
                <circle cx="10" cy="8" r="1"/>
                <circle cx="14" cy="8" r="1"/>
                <circle cx="10" cy="16" r="1"/>
                <circle cx="14" cy="16" r="1"/>
                <path d="M2 8h2"/>
                <path d="M2 16h2"/>
                <path d="M20 8h2"/>
                <path d="M20 16h2"/>
              </svg>
            </div>
            <div className={styles.featureContent}>
              <h3>{getContent('login_single_feature_3_title', 'Precision Engineering')}</h3>
              <p>{getContent('login_single_feature_3_desc', 'Where technical excellence enables fearless innovation')}</p>
            </div>
          </div>
        </div>

        <div className={styles.callToAction}>
          <div className={styles.ctaText}>
            {getContent('login_single_cta_text', 'Your AI infrastructure is solid. Time to build something ambitious.')}
          </div>
          <a href="/docs" className={styles.ctaButton}>
            {getContent('login_single_cta_button', 'Enable Fearless Innovation')}
          </a>
        </div>
      </div>
    </div>
  );

  // Side Panel Component for Multiple Profiles View
  const MultipleProfilesSidePanel = () => (
    <div className={styles.sidePanel}>
      <div className={styles.sidePanelContent}>
        <h2 className={styles.sidePanelTitle}>
          {getContent('login_multiple_title', 'Your Team\'s AI Innovation Command Center')}
        </h2>
        <p className={styles.sidePanelSubtitle}>
          {getContent('login_multiple_subtitle', '150+ teams eliminated the AI failure tax and accelerated breakthrough development')}
        </p>
        <div className={styles.features}>
          <div className={styles.feature}>
            <div className={styles.featureIcon}>📊</div>
            <div className={styles.featureContent}>
              <h3>{getContent('login_multiple_feature_1_title', 'Innovation Velocity')}</h3>
              <p>{getContent('login_multiple_feature_1_desc', 'Teams build breakthrough AI 3x faster with reliable infrastructure')}</p>
            </div>
          </div>
          <div className={styles.feature}>
            <div className={styles.featureIcon}>📈</div>
            <div className={styles.featureContent}>
              <h3>{getContent('login_multiple_feature_2_title', 'Engineering Focus')}</h3>
              <p>{getContent('login_multiple_feature_2_desc', 'Your engineers focus on breakthroughs, not infrastructure breakdowns')}</p>
            </div>
          </div>
          <div className={styles.feature}>
            <div className={styles.featureIcon}>⚖️</div>
            <div className={styles.featureContent}>
              <h3>{getContent('login_multiple_feature_3_title', 'Predictable Innovation')}</h3>
              <p>{getContent('login_multiple_feature_3_desc', 'Transform AI development from costly experiment to competitive advantage')}</p>
            </div>
          </div>
        </div>
        <div className={styles.testimonial}>
          <blockquote className={styles.quote}>
            {getContent('login_multiple_testimonial_quote', 'Effora eliminated our AI failure tax. We now ship ambitious AI features with confidence instead of crossing our fingers.')}
          </blockquote>
          <cite className={styles.author}>
            {getContent('login_multiple_testimonial_author', 'Sarah Chen, VP Engineering at TechCorp')}
          </cite>
        </div>
      </div>
    </div>
  );

  // Loading state
  if (view === 'loading' || contentLoading) {
    return (
      <div className={styles.loginPage}>
        <DebugInfo />
        <div className={styles.container}>
          <div className={styles.loginCard}>
            <div className={styles.loadingState}>
              <div className={styles.spinner}></div>
              <p>Loading...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default login form
  if (view === 'default') {
    return (
      <div className={styles.loginPage}>
        <DebugInfo />
        <div className={styles.container}>
          <div className={styles.loginCard}>
            <div className={styles.header}>
              <Link to="/" className={styles.logo}>Effora</Link>
              <h1 className={styles.title}>Welcome Back</h1>
              <p className={styles.subtitle}>Sign in to access your strategic analytics dashboard</p>
            </div>

            <form onSubmit={handleSubmit} className={styles.form}>
              {error && <div className={styles.errorMessage}>{error}</div>}

              <div className={styles.formGroup}>
                <label htmlFor="email" className={styles.label}>Email Address</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={styles.input}
                  placeholder="Enter your email"
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="password" className={styles.label}>Password</label>
                <div className={styles.passwordWrapper}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className={styles.input}
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(prev => !prev)}
                    className={styles.passwordToggle}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              <div className={styles.formOptions}>
                <label className={styles.checkbox}>
                  <input
                    type="checkbox"
                    name="rememberMe"
                    checked={formData.rememberMe}
                    onChange={handleChange}
                  />
                  <span className={styles.checkboxLabel}>Remember me</span>
                </label>
                <Link to="/forgot-password" className={styles.forgotLink}>
                  Forgot password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className={`${styles.submitButton} ${isLoading ? styles.loading : ''}`}
              >
                {isLoading ? 'Signing In...' : 'Sign In'}
              </button>

              {rememberedUsers.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const newView = rememberedUsers.length === 1 ? 'single' : 'multiple';
                    setView(newView);
                    fetchMarketingContent(newView);
                  }}
                  className={styles.switchAccountButton}
                >
                  Use saved account ({rememberedUsers.length})
                </button>
              )}
            </form>

            <div className={styles.footer}>
              <p className={styles.signupPrompt}>
                Don't have an account?{' '}
                <Link to="/signup" className={styles.signupLink}>Create account</Link>
              </p>
            </div>
          </div>
          <DefaultSidePanel />
        </div>
      </div>
    );
  }

  // Single profile view
  if (view === 'single' && rememberedUsers.length > 0) {
    const user = rememberedUsers[0];

    return (
      <div className={styles.loginPage}>
        <DebugInfo />
        <div className={styles.container}>
          <div className={styles.loginCard}>
            <div className={styles.header}>
              <Link to="/" className={styles.logo}>Effora</Link>
              <h1 className={styles.title}>Welcome Back</h1>
              <p className={styles.subtitle}>Continue with your account</p>
            </div>

            <div className={styles.singleProfileContainer}>
              {error && <div className={styles.errorMessage}>{error}</div>}

              <div className={styles.profileCard} onClick={() => quickSignIn(user)}>
                <div className={styles.profileAvatar}>
                  {user.profileImage ? (
                    <img src={user.profileImage} alt={user.name} />
                  ) : (
                    <div className={styles.avatarPlaceholder}>
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className={styles.profileInfo}>
                  <h3 className={styles.profileName}>{user.name}</h3>
                  <p className={styles.profileEmail}>{user.email}</p>
                </div>
                <button
                  className={styles.removeProfile}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeProfile(user.email);
                  }}
                >
                  ✕
                </button>
              </div>

              <button
                onClick={() => quickSignIn(user)}
                disabled={isLoading}
                className={`${styles.submitButton} ${isLoading ? styles.loading : ''}`}
              >
                {isLoading ? 'Signing In...' : 'Continue'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setView('default');
                  fetchMarketingContent('default');
                }}
                className={styles.useAnotherAccount}
              >
                Use another account
              </button>
            </div>

            <div className={styles.footer}>
              <p className={styles.signupPrompt}>
                Don't have an account?{' '}
                <Link to="/signup" className={styles.signupLink}>Create account</Link>
              </p>
            </div>
          </div>
          <SingleProfileSidePanel />
        </div>
      </div>
    );
  }

  // Multiple profiles view
  if (view === 'multiple') {
    return (
      <div className={styles.loginPage}>
        <DebugInfo />
        <div className={styles.container}>
          <div className={styles.loginCard}>
            <div className={styles.header}>
              <Link to="/" className={styles.logo}>Effora</Link>
              <h1 className={styles.title}>Choose Account</h1>
              <p className={styles.subtitle}>Select an account to continue</p>
            </div>

            <div className={styles.multipleProfilesContainer}>
              {error && <div className={styles.errorMessage}>{error}</div>}

              <h2 className={styles.chooseAccountTitle}>Choose an account</h2>

              <div className={styles.profilesList}>
                {rememberedUsers.map((user, index) => (
                  <div
                    key={`${user.email}-${index}`}
                    className={styles.profileCard}
                    onClick={() => quickSignIn(user)}
                  >
                    <div className={styles.profileAvatar}>
                      {user.profileImage ? (
                        <img src={user.profileImage} alt={user.name} />
                      ) : (
                        <div className={styles.avatarPlaceholder}>
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className={styles.profileInfo}>
                      <h3 className={styles.profileName}>{user.name}</h3>
                      <p className={styles.profileEmail}>{user.email}</p>
                    </div>
                    <button
                      className={styles.removeProfile}
                      onClick={(e) => {
                        e.stopPropagation();
                        removeProfile(user.email);
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => {
                  setView('default');
                  fetchMarketingContent('default');
                }}
                className={styles.useAnotherAccount}
              >
                Use another account
              </button>
            </div>

            <div className={styles.footer}>
              <p className={styles.signupPrompt}>
                Don't have an account?{' '}
                <Link to="/signup" className={styles.signupLink}>Start your free trial</Link>
              </p>
            </div>
          </div>
          <MultipleProfilesSidePanel />
        </div>
      </div>
    );
  }

  // Fallback
  return (
    <div className={styles.loginPage}>
      <DebugInfo />
      <div className={styles.container}>
        <div className={styles.loginCard}>
          <p>Something went wrong. View: {view}, Users: {rememberedUsers.length}</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;