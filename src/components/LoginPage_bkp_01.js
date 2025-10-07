import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import styles from './LoginPage.module.css';

const LoginPage = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [containers, setContainers] = useState([]);

  useEffect(() => {
    const fetchContainers = async () => {
      try {
        const res = await fetch('http://localhost:5002/api/db/list-instances');
        const data = await res.json();
        setContainers(data.instances || []);
      } catch (err) {
        console.error('Error fetching containers:', err);
      }
    };

    fetchContainers();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:5002/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password
        }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        window.location.href = '/dashboard';
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Login failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.loginPage}>
      <div className={styles.container}>
        <div className={styles.loginCard}>
          <div className={styles.header}>
            <Link to="/" className={styles.logo}>
              Effora
            </Link>
            <h1 className={styles.title}>Welcome Back</h1>
            <p className={styles.subtitle}>
              Sign in to access your strategic analytics dashboard
            </p>
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
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className={styles.input}
                placeholder="Enter your password"
                required
              />
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
          </form>

          <div className={styles.footer}>
            <p className={styles.signupPrompt}>
              Don't have an account?{' '}
              <Link to="/signup" className={styles.signupLink}>
                Start your free trial
              </Link>
            </p>
          </div>

          {containers.length > 0 && (
            <div className={styles.containerList}>
              <h4 className={styles.containerListTitle}>Active Database Instances</h4>
              <ul className={styles.containerListItems}>
                {containers.map((container) => (
                  <li key={container.container_id}>
                    <strong>{container.instance_name}</strong> – Port: {container.port} – Status: {container.status}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className={styles.sidePanel}>
          <div className={styles.sidePanelContent}>
            <h2 className={styles.sidePanelTitle}>Strategic Analytics Platform</h2>
            <p className={styles.sidePanelSubtitle}>
              Join 150+ growing companies using Effora to make data-driven strategic decisions.
            </p>

            <div className={styles.features}>
              <div className={styles.feature}>
                <div className={styles.featureIcon}>📊</div>
                <div className={styles.featureContent}>
                  <h3>Real-time Dashboards</h3>
                  <p>Executive KPI tracking with custom visualizations</p>
                </div>
              </div>
              <div className={styles.feature}>
                <div className={styles.featureIcon}>📈</div>
                <div className={styles.featureContent}>
                  <h3>Performance Analytics</h3>
                  <p>Track strategic initiatives and team performance</p>
                </div>
              </div>
              <div className={styles.feature}>
                <div className={styles.featureIcon}>⚖️</div>
                <div className={styles.featureContent}>
                  <h3>Resource Optimization</h3>
                  <p>Data-driven budget allocation and planning</p>
                </div>
              </div>
            </div>

            <div className={styles.testimonial}>
              <blockquote className={styles.quote}>
                "Effora transformed how we make strategic decisions. Our initiative success rate improved by 40%."
              </blockquote>
              <cite className={styles.author}>
                Sarah Chen, VP Strategy at TechCorp
              </cite>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
