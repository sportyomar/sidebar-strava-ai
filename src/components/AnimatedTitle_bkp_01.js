import React, { useState, useEffect } from 'react';
import styles from './AnimatedTitle.module.css';

const AnimatedTitle = ({ audienceSegment, orgName, onOrgNameClick }) => {
  const [currentUseCase, setCurrentUseCase] = useState(0);
  const [displayText, setDisplayText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [useCases, setUseCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch use cases from API when audience segment changes
  useEffect(() => {
    const fetchUseCases = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/welcome/use-cases/${audienceSegment}`);

        if (!response.ok) {
          throw new Error(`Failed to fetch use cases: ${response.status}`);
        }

        const data = await response.json();
        setUseCases(data.use_cases || []);

        // Reset animation state when new data loads
        setCurrentUseCase(0);
        setDisplayText('');
        setIsTyping(true);

      } catch (err) {
        console.error('Error fetching use cases:', err);
        setError(err.message);
        // Fallback to default use cases if API fails
        setUseCases([
          'reduce manual processing',
          'improve efficiency',
          'streamline workflows'
        ]);
      } finally {
        setLoading(false);
      }
    };

    if (audienceSegment) {
      fetchUseCases();
    }
  }, [audienceSegment]);

  // Typewriter animation effect
  useEffect(() => {
    if (loading || useCases.length === 0) return;

    let timeout;
    const currentText = useCases[currentUseCase];

    if (isTyping) {
      if (displayText.length < currentText.length) {
        timeout = setTimeout(() => {
          setDisplayText(currentText.slice(0, displayText.length + 1));
        }, 100);
      } else {
        timeout = setTimeout(() => {
          setIsTyping(false);
        }, 2000);
      }
    } else {
      if (displayText.length > 0) {
        timeout = setTimeout(() => {
          setDisplayText(displayText.slice(0, -1));
        }, 50);
      } else {
        setCurrentUseCase((prev) => (prev + 1) % useCases.length);
        setIsTyping(true);
      }
    }

    return () => clearTimeout(timeout);
  }, [displayText, isTyping, currentUseCase, useCases, loading]);

  if (loading) {
    return (
      <h1 className={styles.mainTitle}>
        <span className={styles.orgName} onClick={onOrgNameClick}>
          {orgName || 'My'}
        </span> use case for AI is to{' '}
        <span className={styles.animatedText}>
          <span className={styles.loadingText}>loading...</span>
        </span>
      </h1>
    );
  }

  if (error) {
    return (
      <h1 className={styles.mainTitle}>
        <span className={styles.orgName} onClick={onOrgNameClick}>
          {orgName || 'My'}
        </span> use case for AI is to{' '}
        <span className={styles.animatedText}>
          <span className={styles.errorText}>improve processes</span>
        </span>
      </h1>
    );
  }

  return (
    <h1 className={styles.mainTitle}>
      <span className={styles.orgName} onClick={onOrgNameClick}>
        {orgName || 'My'}
      </span> use case for AI is to{' '}
      <span className={styles.animatedText}>
        {displayText}
      </span>
    </h1>
  );
};

export default AnimatedTitle;