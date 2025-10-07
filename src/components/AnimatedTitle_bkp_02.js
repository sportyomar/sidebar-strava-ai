import React, { useState, useEffect, useRef } from 'react';
import styles from './AnimatedTitle.module.css';

const AnimatedTitle = ({ audienceSegment, orgName, onOrgNameClick }) => {
  const [currentUseCase, setCurrentUseCase] = useState(0);
  const [displayText, setDisplayText] = useState('improve processes');
  const [isTyping, setIsTyping] = useState(true);
  const [useCases, setUseCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // New interactive states
  const [isEditing, setIsEditing] = useState(false);
  const [userInput, setUserInput] = useState('improve processes');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState([]);

  const inputRef = useRef(null);
  const animationTimeoutRef = useRef(null);

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

      } catch (err) {
        console.error('Error fetching use cases:', err);
        setError(err.message);
        // Fallback to default use cases if API fails
        setUseCases([
          'reduce manual processing',
          'improve efficiency',
          'streamline workflows',
          'automate repetitive tasks',
          'enhance customer experience',
          'optimize resource allocation'
        ]);
      } finally {
        setLoading(false);
      }
    };

    if (audienceSegment) {
      fetchUseCases();
    }
  }, [audienceSegment]);

  // Animation effect (only when manually triggered)
  useEffect(() => {
    if (loading || useCases.length === 0 || !isAnimating || isEditing) return;

    const currentText = useCases[currentUseCase];

    if (isTyping) {
      if (displayText.length < currentText.length) {
        animationTimeoutRef.current = setTimeout(() => {
          setDisplayText(currentText.slice(0, displayText.length + 1));
        }, 100);
      } else {
        animationTimeoutRef.current = setTimeout(() => {
          setIsTyping(false);
        }, 2000);
      }
    } else {
      if (displayText.length > 0) {
        animationTimeoutRef.current = setTimeout(() => {
          setDisplayText(displayText.slice(0, -1));
        }, 50);
      } else {
        setCurrentUseCase((prev) => (prev + 1) % useCases.length);
        setIsTyping(true);
      }
    }

    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, [displayText, isTyping, currentUseCase, useCases, loading, isAnimating, isEditing]);

  // Filter suggestions based on user input
  useEffect(() => {
    if (isEditing && userInput.length > 0) {
      const filtered = useCases.filter(useCase =>
        useCase.toLowerCase().includes(userInput.toLowerCase()) &&
        useCase.toLowerCase() !== userInput.toLowerCase()
      );
      setFilteredSuggestions(filtered);
    } else {
      setFilteredSuggestions([]);
    }
  }, [userInput, useCases, isEditing]);

  const handleKeyDown = (e) => {
    if (e.key === 'Backspace' || e.key === 'Delete') {
      if (!isEditing) {
        setIsEditing(true);
        setIsAnimating(false);
        setUserInput(displayText);
        setShowSuggestions(true);
      }

      if (userInput.length > 0) {
        setUserInput(prev => prev.slice(0, -1));
      }
    } else if (e.key === 'Enter') {
      // Save to localStorage and exit editing mode
      const formData = JSON.parse(localStorage.getItem('welcomeFormData') || '{}');
      formData.useCase = userInput;
      localStorage.setItem('welcomeFormData', JSON.stringify(formData));

      setIsEditing(false);
      setShowSuggestions(false);
      setDisplayText(userInput);
    } else if (e.key.length === 1) {
      // Regular character input
      if (!isEditing) {
        setIsEditing(true);
        setIsAnimating(false);
        setUserInput(displayText + e.key);
        setShowSuggestions(true);
      } else {
        setUserInput(prev => prev + e.key);
      }
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setUserInput(suggestion);
    setDisplayText(suggestion);
    setIsEditing(false);
    setShowSuggestions(false);

    // Save to localStorage
    const formData = JSON.parse(localStorage.getItem('welcomeFormData') || '{}');
    formData.useCase = suggestion;
    localStorage.setItem('welcomeFormData', JSON.stringify(formData));
  };

  const handlePlayAnimation = () => {
    if (isEditing) return;

    setIsAnimating(true);
    setCurrentUseCase(0);
    setDisplayText('');
    setIsTyping(true);
  };

  const handlePauseAnimation = () => {
    setIsAnimating(false);
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
    }
  };

  // Focus input when component mounts
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const currentDisplayText = isEditing ? userInput : displayText;

  if (loading) {
    return (
      <div className={styles.titleContainer}>
        <h1 className={styles.mainTitle}>
          <span className={styles.orgName} onClick={onOrgNameClick}>
            {orgName || 'My'}
          </span> use case for AI is to{' '}
          <span className={styles.animatedText}>
            <span className={styles.loadingText}>loading...</span>
          </span>
        </h1>
      </div>
    );
  }

  return (
    <div className={styles.titleContainer}>
      <h1 className={styles.mainTitle}>
        <span className={styles.orgName} onClick={onOrgNameClick}>
          {orgName || 'My'}
        </span> use case for AI is to{' '}
        <span className={styles.animatedText}>
          {currentDisplayText}
        </span>
      </h1>

      {/* Hidden input to capture keystrokes */}
      <input
        ref={inputRef}
        className={styles.hiddenInput}
        value=""
        onChange={() => {}} // Controlled by keyDown
        onKeyDown={handleKeyDown}
        onBlur={() => {
          // Refocus to keep capturing keystrokes
          setTimeout(() => {
            if (inputRef.current) {
              inputRef.current.focus();
            }
          }, 0);
        }}
      />

      {/* Animation controls */}
      <div className={styles.controls}>
        {!isAnimating ? (
          <button
            className={styles.controlButton}
            onClick={handlePlayAnimation}
            disabled={isEditing}
          >
            ▶ Play Examples
          </button>
        ) : (
          <button
            className={styles.controlButton}
            onClick={handlePauseAnimation}
          >
            ⏸ Pause
          </button>
        )}
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className={styles.suggestionsContainer}>
          <div className={styles.suggestions}>
            {filteredSuggestions.slice(0, 5).map((suggestion, index) => (
              <div
                key={index}
                className={styles.suggestion}
                onClick={() => handleSuggestionClick(suggestion)}
              >
                {suggestion}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AnimatedTitle;