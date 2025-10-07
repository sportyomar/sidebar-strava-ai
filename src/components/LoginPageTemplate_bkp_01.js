import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import styles from './LoginPageTemplate.module.css';
import InteractiveRevealComponent from "./InteractiveRevealComponent";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5002';

const LoginPageTemplate = ({ layout = 'centered' }) => {
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

  // Template state
  const [template, setTemplate] = useState(null);
  const [templateLoading, setTemplateLoading] = useState(true);

  // Marketing content state
  const [marketingContent, setMarketingContent] = useState({});
  const [contentLoading, setContentLoading] = useState(true);

  // Fetch template configuration
  const fetchTemplate = async () => {
    try {
      setTemplateLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/templates/login/${layout}`);
      if (response.ok) {
        const data = await response.json();
        setTemplate(data.template);
      } else {
        console.warn('Failed to fetch template, using defaults');
        setTemplate({ layout, config: {} });
      }
    } catch (error) {
      console.error('Error fetching template:', error);
      setTemplate({ layout, config: {} });
    } finally {
      setTemplateLoading(false);
    }
  };

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

    // Fetch template first
    fetchTemplate();

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
  }, [layout]);

  // Debug panel
  // const DebugInfo = () => (
  //   <div style={{
  //     position: 'fixed',
  //     top: 10,
  //     right: 10,
  //     background: 'rgba(0,0,0,0.8)',
  //     color: 'white',
  //     padding: '10px',
  //     borderRadius: '5px',
  //     fontSize: '12px',
  //     zIndex: 9999,
  //     fontFamily: 'monospace'
  //   }}>
  //     <div><strong>🔍 DEBUG</strong></div>
  //     <div>Layout: <span style={{color: 'yellow'}}>{template?.layout || layout}</span></div>
  //     <div>View: <span style={{color: 'yellow'}}>{view}</span></div>
  //     <div>Users: <span style={{color: 'yellow'}}>{rememberedUsers.length}</span></div>
  //     <div>Template: <span style={{color: 'yellow'}}>{templateLoading ? 'Loading' : 'Loaded'}</span></div>
  //     <div>Content: <span style={{color: 'yellow'}}>{contentLoading ? 'Loading' : 'Loaded'}</span></div>
  //   </div>
  // );

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

  // Get template-specific CSS classes
  const getLayoutClasses = () => {
    const layoutType = template?.layout || layout;
    return {
      page: `${styles.loginPage} ${styles[`${layoutType}Layout`] || ''}`,
      container: `${styles.container} ${styles[`${layoutType}Container`] || ''}`,
      card: `${styles.loginCard} ${styles[`${layoutType}Card`] || ''}`,
      sidePanel: template?.layout === 'centered' ? styles.sidePanel : styles.hiddenSidePanel
    };
  };

  // Side Panel Component for Default View
  const FeatureBlock = ({ title, bullets }) => (
  <div className={styles.featureBlock}>
    <h3 className={styles.featureBlockTitle}>{title}</h3>
    <ul className={styles.featureBlockList}>
      {bullets.filter(Boolean).map((text, idx) => (
        <li key={idx} className={styles.featureBullet}>{text}</li>
      ))}
    </ul>
  </div>
);

const DefaultSidePanel = () => (
  <div className={getLayoutClasses().sidePanel}>
    <div className={styles.sidePanelContent}>
      <h2 className={styles.sidePanelTitle}>
        {getContent('login_operational_headline', 'Operational Observability for LLMs in Production')}
      </h2>

      <div className={styles.features}>
        <FeatureBlock
          title={getContent('login_feature_monitor_title', 'Monitor')}
          bullets={[
            getContent('login_feature_monitor_model_switching'),
            getContent('login_feature_monitor_token_usage'),
            getContent('login_feature_monitor_response_quality'),
          ]}
        />
        <FeatureBlock
          title={getContent('login_feature_track_title', 'Track')}
          bullets={[
            getContent('login_feature_track_model_answers'),
            getContent('login_feature_track_response_drift'),
            getContent('login_feature_track_baselines'),
          ]}
        />
        <FeatureBlock
          title={getContent('login_feature_log_title', 'Log')}
          bullets={[
            getContent('login_feature_log_api_calls'),
            getContent('login_feature_log_prompt_consistency'),
            getContent('login_feature_log_task_routing'),
          ]}
        />
        <FeatureBlock
          title={getContent('login_feature_get_started_title', 'Get Started Fast')}
          bullets={[
            getContent('login_feature_get_started_deploy_monitoring'),
            getContent('login_feature_get_started_log_calls_immediately'),
            getContent('login_feature_get_started_install_sdk'),
            getContent('login_feature_get_started_benchmark_now'),
          ]}
        />
        {/*<InteractiveRevealComponent*/}
        {/*  scenarioKey="hallucination_demo"*/}
        {/*  onComplete={() => console.log('Scenario completed')}*/}
        {/*/>*/}
      </div>

      <div className={styles.callToAction}>
        <div className={styles.ctaText}>
          {getContent('login_operational_cta_text', 'Debug less. Deploy faster. Operate LLMs with confidence.')}
        </div>
        <a href="/docs" className={styles.ctaButton}>
          {getContent('login_operational_cta_button', 'Start Observing Your Models')}
        </a>
      </div>
    </div>
  </div>
);

  // Loading state
  if (view === 'loading' || contentLoading || templateLoading) {
    return (
      <div className={getLayoutClasses().page}>
        {/*<DebugInfo />*/}
        <div className={getLayoutClasses().container}>
          <div className={getLayoutClasses().card}>
            <div className={styles.loadingState}>
              <div className={styles.spinner}></div>
              <p>Loading...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Login Form Component
  const LoginForm = () => (
    <div className={getLayoutClasses().card}>
      <div className={styles.header}>
        <Link to="/" className={styles.logo}>Effora</Link>
        <h1 className={styles.title}>Welcome Back</h1>
        {/*<p className={styles.subtitle}>Sign in to access your strategic analytics dashboard</p>*/}
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
  );

  // Profile Components (same as original, but using new layout classes)
  const SingleProfileView = () => {
    const user = rememberedUsers[0];
    return (
      <div className={getLayoutClasses().card}>
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
    );
  };

  const MultipleProfilesView = () => (
    <div className={getLayoutClasses().card}>
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
  );

  // Render based on view and template layout
  const renderContent = () => {
    const layoutType = template?.layout || layout;

    // For 'top' layout, show side panel only for default view
    const showSidePanel = layoutType === 'centered' || (layoutType === 'top' && view === 'default');

    let mainContent;
    switch (view) {
      case 'single':
        mainContent = <SingleProfileView />;
        break;
      case 'multiple':
        mainContent = <MultipleProfilesView />;
        break;
      default:
        mainContent = <LoginForm />;
    }

    return (
      <div className={getLayoutClasses().container}>
        {mainContent}
        {/*{showSidePanel && view === 'default' && <DefaultSidePanel />}*/}
      </div>
    );
  };

  return (
    <div className={getLayoutClasses().page}>
      {/*<DebugInfo />*/}
      {renderContent()}
    </div>
  );
};

export default LoginPageTemplate;