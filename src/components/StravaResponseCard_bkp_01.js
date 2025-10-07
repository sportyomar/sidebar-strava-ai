import React, { useState } from 'react';
import { mockStravaResponse } from './data/mockStravaData';

const TokenFeedbackModal = ({ isOpen, onClose, onSubmit, answer, existingTokens }) => {
  const [selectedText, setSelectedText] = useState('');
  const [tokenType, setTokenType] = useState('metric');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleSubmit = () => {
    onSubmit({
      suggested_text: selectedText,
      type: tokenType,
      notes: notes,
      answer: answer,
      existing_tokens: existingTokens,
      timestamp: new Date().toISOString()
    });
    setSelectedText('');
    setNotes('');
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.4)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000
    }} onClick={onClose}>
      <div style={{
        background: 'white',
        borderRadius: '8px',
        padding: '24px',
        maxWidth: '500px',
        width: '90%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600' }}>
          Suggest Missing Token
        </h3>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '6px', color: '#374151' }}>
            Text to tokenize
          </label>
          <input
            type="text"
            value={selectedText}
            onChange={(e) => setSelectedText(e.target.value)}
            placeholder="e.g., 'total moving time'"
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '6px', color: '#374151' }}>
            Token type
          </label>
          <select
            value={tokenType}
            onChange={(e) => setTokenType(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          >
            <option value="metric">Metric</option>
            <option value="dimension">Dimension</option>
            <option value="value">Value</option>
            <option value="aggregation">Aggregation</option>
            <option value="source">Source</option>
          </select>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '6px', color: '#374151' }}>
            Notes (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Why should this be tokenized?"
            rows={3}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              fontFamily: 'inherit',
              resize: 'vertical'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              background: 'white',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedText.trim()}
            style={{
              padding: '8px 16px',
              background: selectedText.trim() ? '#3b82f6' : '#e5e7eb',
              color: selectedText.trim() ? 'white' : '#9ca3af',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: selectedText.trim() ? 'pointer' : 'not-allowed',
              fontWeight: '500'
            }}
          >
            Submit Feedback
          </button>
        </div>
      </div>
    </div>
  );
};


const TokenCritiqueModal = ({ isOpen, onClose, critique, onApprove, answer, originalTokens }) => {
  const [selectedTokens, setSelectedTokens] = useState([]);

  // DEBUG: Log the critique data
  console.log('TokenCritiqueModal critique:', critique);
  console.log('Missing tokens:', critique?.missing_tokens);

  if (!isOpen || !critique) return null;

  const toggleToken = (idx) => {
    setSelectedTokens(prev =>
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    );
  };

  const handleApprove = () => {
    const approved = critique.missing_tokens.filter((_, idx) => selectedTokens.includes(idx));
    onApprove(approved);
    setSelectedTokens([]);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.4)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000
    }} onClick={onClose}>
      <div style={{
        background: 'white',
        borderRadius: '8px',
        padding: '24px',
        maxWidth: '600px',
        width: '90%',
        maxHeight: '80vh',
        overflow: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }} onClick={(e) => e.stopPropagation()}>

        <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '600' }}>
          Missing Tokens Found
        </h3>

        <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: '#6b7280' }}>
          {critique.critique}
        </p>

        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '12px', color: '#374151' }}>
            Select tokens to add:
          </div>

          {critique.missing_tokens.map((token, idx) => (
            <div key={idx} style={{
              padding: '12px',
              border: selectedTokens.includes(idx) ? '2px solid #3b82f6' : '1px solid #e5e7eb',
              borderRadius: '6px',
              marginBottom: '8px',
              background: selectedTokens.includes(idx) ? '#eff6ff' : 'white',
              cursor: 'pointer'
            }} onClick={() => toggleToken(idx)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <input
                  type="checkbox"
                  checked={selectedTokens.includes(idx)}
                  onChange={() => toggleToken(idx)}
                />
                <span style={{
                  fontWeight: '600',
                  fontSize: '14px',
                  fontFamily: token.type === 'value' ? 'monospace' : 'inherit',
                  color: '#111827'
                }}>
                  "{token.text}"
                </span>
                <span style={{
                  fontSize: '11px',
                  padding: '2px 6px',
                  background: '#f3f4f6',
                  borderRadius: '3px',
                  color: '#6b7280'
                }}>
                  {token.type}
                </span>
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280', paddingLeft: '24px' }}>
                {token.reason}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              background: 'white',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleApprove}
            disabled={selectedTokens.length === 0}
            style={{
              padding: '8px 16px',
              background: selectedTokens.length > 0 ? '#3b82f6' : '#e5e7eb',
              color: selectedTokens.length > 0 ? 'white' : '#9ca3af',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: selectedTokens.length > 0 ? 'pointer' : 'not-allowed',
              fontWeight: '500'
            }}
          >
            Approve {selectedTokens.length > 0 ? `(${selectedTokens.length})` : ''}
          </button>
        </div>
      </div>
    </div>
  );
};


const SemanticElement = ({ element, type, onClick }) => {
  const getElementStyle = () => {
    const baseStyle = {
      padding: '2px 5px',
      borderRadius: '3px',
      cursor: 'pointer',
      fontSize: '13px',
      fontWeight: '500',
      display: 'inline',
      transition: 'all 0.15s ease',
      margin: '0 1px',
      border: '1px solid transparent',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      lineHeight: '1.5'
    };

    switch(type) {
      case 'metric':
        return {
          ...baseStyle,
          background: '#e8eef5',
          color: '#0969da',
          border: '1px solid #d0d7de',
          fontWeight: '600'
        };
      case 'dimension':
        return {
          ...baseStyle,
          background: '#f6f8fa',
          color: '#57606a',
          border: '1px solid #d0d7de',
          fontWeight: '500'
        };
      case 'value':
        return {
          ...baseStyle,
          background: '#f6f8fa',
          color: '#656d76',
          fontFamily: '"SF Mono", "Monaco", "Consolas", monospace',
          fontWeight: '600',
          border: '1px solid #d0d7de',
          fontSize: '12px',
          lineHeight: '1.5',
          padding: '2px 4px',
          verticalAlign: 'baseline'
        };
      case 'filter':
        return {
          ...baseStyle,
          background: '#dafbe1',
          color: '#1a7f37',
          border: '1px solid #c3e6cd',
          fontWeight: '600'
        };
      case 'aggregation':
        return {
          ...baseStyle,
          background: '#f6f8fa',
          color: '#6e7781',
          border: '1px solid #d0d7de',
          fontWeight: '500'
        };
      default:
        return baseStyle;
    }
  };

  return (
    <span
      style={getElementStyle()}
      onClick={(e) => {
        e.stopPropagation();
        onClick(e, element);
      }}
      onMouseEnter={(e) => {
        e.target.style.background = '#fff';
        e.target.style.boxShadow = '0 0 0 2px rgba(59, 130, 246, 0.3)';
      }}
      onMouseLeave={(e) => {
        const style = getElementStyle();
        e.target.style.background = style.background;
        e.target.style.boxShadow = 'none';
      }}
      title={element.clickable_actions?.[0]?.replace(/_/g, ' ')}
    >
      {element.display}
    </span>
  );
};

const parseAnswerWithSemanticElements = (answer, semanticElements, onElementClick) => {
  // Collect all displayable elements
  const allElements = [
    ...semanticElements.metrics.map(m => ({ ...m, type: 'metric' })),
    ...semanticElements.dimensions.map(d => ({ ...d, type: 'dimension' })),
    ...semanticElements.values.map(v => ({ ...v, type: 'value' })),
    ...semanticElements.filters.map(f => ({ ...f, type: 'filter' })),
    ...semanticElements.aggregations.map(a => ({ ...a, type: 'aggregation' }))
  ];

  // Sort by display text length (longest first to avoid partial matches)
  const sortedElements = allElements.sort((a, b) =>
    (b.display?.length || 0) - (a.display?.length || 0)
  );

  // Track which parts of the answer have been matched
  const matches = [];

  sortedElements.forEach(element => {
    if (!element.display) return;

    const displayText = element.display.toLowerCase();
    const answerLower = answer.toLowerCase();
    let searchStart = 0;

    // Find all occurrences of this display text
    while (true) {
      const idx = answerLower.indexOf(displayText, searchStart);
      if (idx === -1) break;

      // Check if this position overlaps with existing matches
      const overlaps = matches.some(m =>
        (idx >= m.start && idx < m.end) ||
        (idx + displayText.length > m.start && idx + displayText.length <= m.end)
      );

      if (!overlaps) {
        matches.push({
          start: idx,
          end: idx + displayText.length,
          element: element
        });
      }

      searchStart = idx + 1;
    }
  });

  // Sort matches by position
  matches.sort((a, b) => a.start - b.start);

  // Build the rendered output
  const elements = [];
  let lastIndex = 0;

  matches.forEach((match, idx) => {
    // Add text before this match
    if (match.start > lastIndex) {
      elements.push(answer.substring(lastIndex, match.start));
    }

    // Add the semantic element
    elements.push(
      <SemanticElement
        key={`${match.element.id}-${idx}`}
        element={match.element}
        type={match.element.type}
        onClick={(e, el) => onElementClick(e, el)}
      />
    );

    lastIndex = match.end;
  });

  // Add remaining text
  if (lastIndex < answer.length) {
    elements.push(answer.substring(lastIndex));
  }

  return elements;
};

const StravaResponseCard = ({ question, backendData }) => {
  const [showAudit, setShowAudit] = useState(true);
  const [showBadges, setShowBadges] = useState(true);
  const [showTokenMenu, setShowTokenMenu] = useState(false);
  const [selectedToken, setSelectedToken] = useState(null);
  const [showRawData, setShowRawData] = useState(false);
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [viewMode, setViewMode] = useState('ide'); // 'ide' or 'reading'
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackType, setFeedbackType] = useState('metric');
  const [isCheckingTokens, setIsCheckingTokens] = useState(false);
  const [missingTokens, setMissingTokens] = useState(null);
  const [showCritiqueModal, setShowCritiqueModal] = useState(false);
  const [isTestingApi, setIsTestingApi] = useState(false);
  const [apiTestResult, setApiTestResult] = useState(null);
  const [showFullJson, setShowFullJson] = useState(false);


  // Use backend data if available, otherwise fall back to mock
  const response = backendData || mockStravaResponse;

  // If response is missing required fields, show error
  if (!response?.audit?.data_quality) {
    return (
      <div style={{ padding: '32px', background: '#fee', borderRadius: '12px', color: '#c00' }}>
        Error: Invalid response data. Check backend connection.
      </div>
    );
  }

  // Extract semantic elements
  const semanticElements = response.semantic_elements || {
    metrics: [],
    dimensions: [],
    values: [],
    filters: [],
    aggregations: []
  };

  const handleCheckMissingTokens = async () => {
    setIsCheckingTokens(true);

    try {
      const critiqueResponse = await fetch('http://localhost:5002/api/strava/ai/critique-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answer: response.answer,
          tokens: response.tokens
        })
      });

      const critique = await critiqueResponse.json();

      if (critique.missing_tokens && critique.missing_tokens.length > 0) {
        setMissingTokens(critique);
        setShowCritiqueModal(true);
      } else {
        alert('No missing tokens found! The current tokenization looks complete.');
      }
    } catch (error) {
      console.error('Failed to check tokens:', error);
      alert('Failed to check for missing tokens. Please try again.');
    } finally {
      setIsCheckingTokens(false);
    }
  };

  const handleApproveMissingTokens = async (approvedTokens) => {
    console.log('Approved missing tokens:', approvedTokens);

    // Log to feedback system
    try {
      await fetch('http://localhost:5002/api/strava/feedback/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feedback_type: 'ai_critique_approved',
          approved_tokens: approvedTokens,
          original_answer: response.answer,
          original_tokens: response.tokens,
          question: question,
          user_id: 'test_123',
          timestamp: new Date().toISOString()
        })
      });

      alert(`Approved ${approvedTokens.length} missing token(s). Thank you for the feedback!`);
    } catch (error) {
      console.error('Failed to log feedback:', error);
    }
  };

  const handleTokenClick = (token, event) => {
    console.log('Token clicked:', token);
    setSelectedToken({...token, position: { x: event.clientX, y: event.clientY }});
    setShowTokenMenu(true);
  };

  const handleSemanticElementClick = (event, element) => {
    console.log('Semantic element clicked:', element);
    setSelectedToken({
      ...element,
      text: element.display,
      metadata: {
        clickable_actions: element.clickable_actions
      },
      position: { x: event.clientX, y: event.clientY }
    });
    setShowTokenMenu(true);
  };

  const handleTokenAction = (action, token) => {
    console.log('Action:', action, 'on token:', token);
    // TODO: Implement actual actions
    // For now, just log what would happen
    alert(`Action: ${action}\nToken: ${token.text}\nThis would trigger: ${action}`);
  };

  const handleFeedbackSubmit = async (feedback) => {
    console.log('Token feedback submitted:', feedback);

    try {
      const response = await fetch('http://localhost:5002/api/strava/feedback/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...feedback,
          question: question,
          user_id: 'test_123'
        })
      });

      if (response.ok) {
        alert('Feedback submitted! Thank you for helping improve token detection.');
      }
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    }
  };

  // Token parser - converts answer text with tokens into interactive elements
  const parseAnswerWithTokens = (answer, tokens, onTokenClick) => {
    if (!tokens || tokens.length === 0) {
      return answer;
    }

    // Sort tokens by start position to process in order
    const sortedTokens = [...tokens].sort((a, b) => a.start - b.start);

    const elements = [];
    let lastIndex = 0;

    sortedTokens.forEach((token, idx) => {
      // Add text before this token
      if (token.start > lastIndex) {
        const textBefore = answer.substring(lastIndex, token.start);
        if (textBefore) {
          elements.push(textBefore);
        }
      }

      // Add the token as an interactive element
      elements.push(
        <AnalyticsToken
          key={`token-${idx}`}
          token={token}
          onClick={(e) => onTokenClick(token, e)}
        />
      );

      lastIndex = token.end;
    });

    // Add remaining text after last token
    if (lastIndex < answer.length) {
      elements.push(answer.substring(lastIndex));
    }

    return elements;
  };

  const AnalyticsToken = ({ token, onClick }) => {
    const getTokenStyle = () => {
      const baseStyle = {
        padding: '2px 5px',
        borderRadius: '3px',
        cursor: 'pointer',
        fontSize: '13px',
        fontWeight: '500',
        display: 'inline',
        transition: 'all 0.15s ease',
        margin: '0 1px',
        border: '1px solid transparent',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        lineHeight: '1.5'
      };

      switch(token.type) {
      case 'metric':
        return {
          ...baseStyle,
          background: '#e8eef5',
          color: '#0969da',
          border: '1px solid #d0d7de',
          fontWeight: '600'
        };
      case 'dimension':
        return {
          ...baseStyle,
          background: '#f6f8fa',
          color: '#57606a',
          border: '1px solid #d0d7de',
          fontWeight: '500'
        };
      case 'value':
        return {
          ...baseStyle,
          background: '#f6f8fa',
          color: '#656d76',
          fontFamily: '"SF Mono", "Monaco", "Consolas", monospace',
          fontWeight: '600',
          border: '1px solid #d0d7de',
          fontSize: '12px',
          lineHeight: '1.5',
          padding: '2px 4px',
          verticalAlign: 'baseline'
        };
      case 'aggregation':
        return {
          ...baseStyle,
          background: '#f6f8fa',
          color: '#6e7781',
          border: '1px solid #d0d7de',
          fontWeight: '500'
        };
      case 'source':
        return {
          ...baseStyle,
          background: '#f0f6f4',
          color: '#2d6a4f',
          border: '1px solid #d0e4db',
          fontWeight: '600'
        };
        default:
          return baseStyle;
      }
    };

    return (
      <span
        style={getTokenStyle()}
        onClick={(e) => {
          e.stopPropagation();
          onClick(e);
        }}
        onMouseEnter={(e) => {
          e.target.style.background = '#fff';
          e.target.style.boxShadow = '0 0 0 2px rgba(59, 130, 246, 0.3)';
        }}
        onMouseLeave={(e) => {
          const style = getTokenStyle();
          e.target.style.background = style.background;
          e.target.style.boxShadow = 'none';
        }}
        title={token.metadata?.clickable_actions?.[0]?.replace(/_/g, ' ')}
      >
        {token.text}
      </span>
    );
  };

  const TokenActionMenu = ({ token, onClose, onAction }) => {
    const actions = token.metadata?.clickable_actions || [];
    const [hoveredIndex, setHoveredIndex] = React.useState(0);

    const getActionLabel = (action) => {
      const labels = {
        'adjust_period': 'Adjust time period',
        'select_custom_range': 'Select custom date range',
        'change_metric': 'Change metric',
        'compare_over_time': 'Compare over time',
        'convert_to_kmh': 'Convert to km/h',
        'convert_to_miles': 'Convert to miles',
        'convert_to_km': 'Convert to kilometers',
        'view_raw_data': 'View raw data',
        'view_activities': 'View all activities',
        'filter_activities': 'Filter activities',
        'change_aggregation': 'Change aggregation',
        'convert_to_hours': 'Convert to hours'
      };
      return labels[action] || action.replace(/_/g, ' ');
    };

    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.02)',
        zIndex: 1000
      }} onClick={onClose}>
        <div
          style={{
            position: 'absolute',
            top: (token.position?.y || 100) + 5,
            left: token.position?.x || 100,
            background: '#ffffff',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)',
            padding: '4px',
            minWidth: '240px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            zIndex: 1001
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{
            padding: '6px 10px',
            fontSize: '11px',
            fontWeight: '600',
            color: '#6b7280',
            letterSpacing: '0.3px',
            borderBottom: '1px solid #f3f4f6',
            marginBottom: '4px'
          }}>
            {token.text}
          </div>

          {actions.map((action, idx) => (
            <div
              key={idx}
              onClick={() => {
                onAction(action, token);
                onClose();
              }}
              onMouseEnter={() => setHoveredIndex(idx)}
              style={{
                padding: '6px 10px',
                background: hoveredIndex === idx ? '#f3f4f6' : 'transparent',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '13px',
                color: '#374151',
                fontWeight: '500',
                transition: 'background 0.1s',
                margin: '2px 0'
              }}
            >
              {getActionLabel(action)}
            </div>
          ))}

          {token.metadata && (
            <div style={{
              padding: '6px 10px',
              fontSize: '10px',
              color: '#9ca3af',
              borderTop: '1px solid #f3f4f6',
              marginTop: '4px',
              fontFamily: '"SF Mono", "Monaco", "Consolas", monospace',
              background: '#fafbfc'
            }}>
              {token.type === 'value' && token.metadata.original_value &&
                `raw: ${token.metadata.original_value}`}
              {token.type === 'dimension' && token.metadata.start_date &&
                `${token.metadata.start_date} → ${token.metadata.end_date}`}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Generate title from question
  const generateTitle = (question) => {
    const q = question.toLowerCase();
    if (q.includes('pace')) return 'Average Running Pace Analysis';
    if (q.includes('distance')) return 'Distance Summary';
    if (q.includes('frequency') || q.includes('how many')) return 'Activity Frequency Report';
    return 'Running Analysis';
  };

  return (
    <>
      <div style={{
        background: 'linear-gradient(to bottom, #ffffff, #fafbfc)',
        borderRadius: '12px',
        padding: '32px',
        marginBottom: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.04)',
        border: '1px solid rgba(0,0,0,0.06)'
      }}>

        {/* Header with Stacked Source Icons */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '24px',
          paddingBottom: '16px',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <div style={{ flex: 1 }}>
            <h3 style={{
              fontSize: '20px',
              fontWeight: '700',
              color: '#111827',
              margin: '0 0 8px 0'
            }}>
              {generateTitle(question)}
            </h3>
            <div style={{
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '1.2px',
              color: '#6b7280',
              fontWeight: '600'
            }}>
              Analysis Complete • {response.processing_time || '1.2'}s
            </div>

            {/* View Toggle */}
            <div style={{
              display: 'inline-flex',
              background: '#f3f4f6',
              borderRadius: '6px',
              padding: '2px',
              marginTop: '8px'
            }}>
              <button
                onClick={() => setViewMode('ide')}
                style={{
                  padding: '4px 12px',
                  background: viewMode === 'ide' ? 'white' : 'transparent',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: viewMode === 'ide' ? '#374151' : '#6b7280',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  boxShadow: viewMode === 'ide' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
                }}
              >
                IDE View
              </button>
              <button
                onClick={() => setViewMode('reading')}
                style={{
                  padding: '4px 12px',
                  background: viewMode === 'reading' ? 'white' : 'transparent',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: viewMode === 'reading' ? '#374151' : '#6b7280',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  boxShadow: viewMode === 'reading' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
                }}
              >
                Reading View
              </button>
            </div>
          </div>

          {/* Stacked Source Icons */}
          <div style={{
            display: 'flex',
            flexDirection: 'row-reverse',
            position: 'relative'
          }}>
            {/* Strava Icon */}
            <div
              onMouseEnter={(e) => {
                const tooltip = e.currentTarget.querySelector('.source-tooltip');
                if (tooltip) tooltip.style.opacity = '1';
              }}
              onMouseLeave={(e) => {
                const tooltip = e.currentTarget.querySelector('.source-tooltip');
                if (tooltip) tooltip.style.opacity = '0';
              }}
              style={{
                position: 'relative',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: '#fc4c02',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid white',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                cursor: 'pointer',
                marginLeft: '-8px'
              }}
            >
              <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" style={{ width: '20px', height: '20px' }}>
                <g fill="#fff" fillRule="evenodd">
                  <path d="M6.9 8.8l2.5 4.5 2.4-4.5h-1.5l-.9 1.7-1-1.7z" opacity=".6"/>
                  <path d="M7.2 2.5l3.1 6.3H4zm0 3.8l1.2 2.5H5.9z"/>
                </g>
              </svg>

              <div style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                background: '#10b981',
                color: 'white',
                borderRadius: '50%',
                width: '18px',
                height: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                fontWeight: '700',
                border: '2px solid white',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }}>
                1
              </div>

              <div
                className="source-tooltip"
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '8px',
                  background: '#111827',
                  color: 'white',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '500',
                  whiteSpace: 'nowrap',
                  opacity: 0,
                  transition: 'opacity 0.2s',
                  pointerEvents: 'none',
                  zIndex: 10,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                }}
              >
                Strava API
                <div style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '12px',
                  width: 0,
                  height: 0,
                  borderLeft: '4px solid transparent',
                  borderRight: '4px solid transparent',
                  borderBottom: '4px solid #111827'
                }} />
              </div>
            </div>

            {/* API Count Icon */}
            <div
              onMouseEnter={(e) => {
                const tooltip = e.currentTarget.querySelector('.source-tooltip');
                if (tooltip) tooltip.style.opacity = '1';
              }}
              onMouseLeave={(e) => {
                const tooltip = e.currentTarget.querySelector('.source-tooltip');
                if (tooltip) tooltip.style.opacity = '0';
              }}
              style={{
                position: 'relative',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid white',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                cursor: 'pointer',
                marginLeft: '-8px',
                fontSize: '10px',
                fontWeight: '700',
                color: 'white'
              }}
            >
              API

              <div style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                background: '#f59e0b',
                color: 'white',
                borderRadius: '50%',
                width: '18px',
                height: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                fontWeight: '700',
                border: '2px solid white',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }}>
                3
              </div>

              <div
                className="source-tooltip"
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '8px',
                  background: '#111827',
                  color: 'white',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '500',
                  whiteSpace: 'nowrap',
                  opacity: 0,
                  transition: 'opacity 0.2s',
                  pointerEvents: 'none',
                  zIndex: 10,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                }}
              >
                3 API calls
                <div style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '12px',
                  width: 0,
                  height: 0,
                  borderLeft: '4px solid transparent',
                  borderRight: '4px solid transparent',
                  borderBottom: '4px solid #111827'
                }} />
              </div>
            </div>

            {/* Edit Prompt Button */}
            <button
              onClick={() => setShowPromptModal(true)}
              style={{
                position: 'relative',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'white',
                border: '2px solid #e5e7eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                marginLeft: '-8px',
                fontSize: '16px'
              }}
            >
              ✏️
            </button>
          </div>
        </div>

        {/* Answer */}
        <div style={{ marginBottom: '32px' }}>
          <p style={{
            fontSize: '17px',
            lineHeight: '1.7',
            color: '#111827',
            margin: 0,
            fontWeight: '500'
          }}>
            {viewMode === 'ide'
              ? parseAnswerWithSemanticElements(response.answer, semanticElements, handleSemanticElementClick)
              : response.answer
            }
          </p>
        </div>

        {/* Confidence Badges - Collapsible */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          marginBottom: '32px',
          flexWrap: 'wrap'
        }}>
          {showBadges ? (
            <>
              {/* Confidence Badge */}
              <div style={{
                position: 'relative',
                padding: '6px 16px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                color: 'white',
                fontSize: '12px',
                fontWeight: '600',
                boxShadow: '0 2px 6px rgba(59, 130, 246, 0.2)',
                border: '2px solid white'
              }}>
                Confidence
                <div style={{
                  position: 'absolute',
                  top: '-12px',
                  right: '-12px',
                  background: '#10b981',
                  color: 'white',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '9px',
                  fontWeight: '700',
                  border: '2px solid white',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}>
                  H
                </div>
              </div>

              {/* Coverage Badge */}
              <div style={{
                position: 'relative',
                padding: '6px 16px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                fontSize: '12px',
                fontWeight: '600',
                boxShadow: '0 2px 6px rgba(16, 185, 129, 0.2)',
                border: '2px solid white'
              }}>
                Coverage
                <div style={{
                  position: 'absolute',
                  top: '-12px',
                  right: '-12px',
                  background: '#3b82f6',
                  color: 'white',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '9px',
                  fontWeight: '700',
                  border: '2px solid white',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}>
                  {Math.round(response.audit.data_quality.completeness * 100)}
                </div>
              </div>

              {/* Records Badge */}
              <div style={{
                position: 'relative',
                padding: '6px 16px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                color: 'white',
                fontSize: '12px',
                fontWeight: '600',
                boxShadow: '0 2px 6px rgba(245, 158, 11, 0.2)',
                border: '2px solid white'
              }}>
                Records
                <div style={{
                  position: 'absolute',
                  top: '-12px',
                  right: '-12px',
                  background: '#dc2626',
                  color: 'white',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '9px',
                  fontWeight: '700',
                  border: '2px solid white',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}>
                  {response.audit.calculations.activities_included}
                </div>
              </div>

              {/* Collapse Button */}
              <button
                onClick={() => setShowBadges(false)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'white',
                  border: '2px solid #e5e7eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#6b7280',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
              >
                ←
              </button>
            </>
          ) : (
            <>
              {/* Collapsed view - just circles stacked */}
              <div style={{
                display: 'flex',
                flexDirection: 'row-reverse',
                position: 'relative'
              }}>
                {/* Records circle */}
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: '#dc2626',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '9px',
                  fontWeight: '700',
                  border: '2px solid white',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                  marginLeft: '-8px'
                }}>
                  {response.audit.calculations.activities_included}
                </div>

                {/* Coverage circle */}
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: '#3b82f6',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '9px',
                  fontWeight: '700',
                  border: '2px solid white',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                  marginLeft: '-8px'
                }}>
                  {Math.round(response.audit.data_quality.completeness * 100)}
                </div>

                {/* Confidence circle */}
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: '#10b981',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '9px',
                  fontWeight: '700',
                  border: '2px solid white',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                  marginLeft: '-8px'
                }}>
                  H
                </div>

                {/* Expand button */}
                <button
                  onClick={() => setShowBadges(true)}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'white',
                    border: '2px solid #e5e7eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: '14px',
                    color: '#6b7280',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    marginLeft: '-8px'
                  }}
                >
                  →
                </button>
              </div>
            </>
          )}
        </div>

        {/* Tabbed Interface */}
        <div style={{ marginTop: '24px' }}>
          {/* Tab Headers */}
          <div style={{
            display: 'flex',
            borderBottom: '2px solid #e5e7eb',
            gap: '4px'
          }}>
            <button
              onClick={() => {
                setShowAudit(true);
                setShowRawData(false);
                setShowAlternatives(false);
              }}
              style={{
                padding: '12px 24px',
                background: showAudit ? 'white' : 'transparent',
                color: showAudit ? '#3b82f6' : '#6b7280',
                border: 'none',
                borderBottom: showAudit ? '2px solid #3b82f6' : '2px solid transparent',
                marginBottom: '-2px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                borderTopLeftRadius: '6px',
                borderTopRightRadius: '6px'
              }}
            >
              Methodologies
            </button>

            <button
              onClick={() => {
                setShowAudit(false);
                setShowRawData(true);
                setShowAlternatives(false);
              }}
              style={{
                padding: '12px 24px',
                background: showRawData ? 'white' : 'transparent',
                color: showRawData ? '#10b981' : '#6b7280',
                border: 'none',
                borderBottom: showRawData ? '2px solid #10b981' : '2px solid transparent',
                marginBottom: '-2px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                borderTopLeftRadius: '6px',
                borderTopRightRadius: '6px'
              }}
            >
              Data Sources
            </button>

            <button
              onClick={() => {
                setShowAudit(false);
                setShowRawData(false);
                setShowAlternatives(true);
              }}
              style={{
                padding: '12px 24px',
                background: showAlternatives ? 'white' : 'transparent',
                color: showAlternatives ? '#f59e0b' : '#6b7280',
                border: 'none',
                borderBottom: showAlternatives ? '2px solid #f59e0b' : '2px solid transparent',
                marginBottom: '-2px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                borderTopLeftRadius: '6px',
                borderTopRightRadius: '6px'
              }}
            >
              Suggested Prompts
            </button>
          </div>

          {/* Tab Content */}
          <div style={{
            background: 'white',
            padding: '24px',
            borderRadius: '0 0 8px 8px',
            minHeight: '200px'
          }}>
            {showAudit && (
              <div>
                <h4 style={{ margin: '0 0 20px 0', fontSize: '15px', fontWeight: '700', color: '#3b82f6' }}>
                  Calculation Breakdown
                </h4>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '12px 0', color: '#6b7280', fontWeight: '500', fontSize: '14px', width: '40%' }}>Method</td>
                      <td style={{ padding: '12px 0', color: '#374151', fontWeight: '500', fontSize: '14px' }}>{response.audit.calculations.method}</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '12px 0', color: '#6b7280', fontWeight: '500', fontSize: '14px' }}>Raw calculation</td>
                      <td style={{ padding: '12px 0', color: '#374151', fontWeight: '500', fontSize: '14px' }}>{response.audit.calculations.raw_calculation}</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #f3f4f6', background: '#fafbfc' }}>
                      <td style={{ padding: '12px 0', color: '#6b7280', fontWeight: '600', fontSize: '14px' }}>Result</td>
                      <td style={{ padding: '12px 0', color: '#111827', fontWeight: '700', fontSize: '14px', fontFamily: 'monospace' }}>{response.audit.calculations.conversion}</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '12px 0', color: '#6b7280', fontWeight: '500', fontSize: '14px' }}>Time period</td>
                      <td style={{ padding: '12px 0', color: '#374151', fontWeight: '500', fontSize: '14px' }}>{response.audit.calculations.period_start} to {response.audit.calculations.period_end}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '12px 0', color: '#6b7280', fontWeight: '500', fontSize: '14px' }}>Data source</td>
                      <td style={{ padding: '12px 0', color: '#374151', fontWeight: '500', fontSize: '14px' }}>Strava API - {response.audit.data_sources[0].endpoint}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {showRawData && (
              <div>
                {/* Data Fetch Summary */}
                <div style={{
                  background: '#fff3cd',
                  border: '1px solid #ffc107',
                  borderRadius: '6px',
                  padding: '16px',
                  marginBottom: '20px'
                }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600', color: '#856404' }}>
                    ⚠️ Data Fetch Summary
                  </h4>
                  <div style={{ fontSize: '13px', color: '#856404', lineHeight: '1.6' }}>
                    <div><strong>Query:</strong> {question}</div>
                    <div><strong>Date Range:</strong> {response.audit?.data_sources?.[0]?.params?.after || 'N/A'} to {response.audit?.data_sources?.[0]?.params?.before || 'N/A'}</div>
                    <div><strong>Activities Fetched:</strong> {response.audit?.data_sources?.[0]?.activities_fetched || 0}</div>
                    {response.raw_data?.activity_count !== response.audit?.data_sources?.[0]?.activities_fetched && (
                      <div style={{ marginTop: '8px', padding: '8px', background: '#f8d7da', borderRadius: '4px', color: '#721c24' }}>
                        <strong>⚠️ Mismatch:</strong> Raw data shows {response.raw_data?.activity_count} but audit shows {response.audit?.data_sources?.[0]?.activities_fetched} fetched
                      </div>
                    )}
                  </div>
                </div>

                {/* Parsed Query Debug */}
                {response.parsed_query && (
                  <div style={{
                    background: '#e7f3ff',
                    border: '1px solid #0969da',
                    borderRadius: '6px',
                    padding: '16px',
                    marginBottom: '20px'
                  }}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600', color: '#0969da' }}>
                      AI Query Parsing
                    </h4>
                    <pre style={{
                      background: '#f6f8fa',
                      padding: '12px',
                      borderRadius: '4px',
                      overflow: 'auto',
                      fontSize: '11px',
                      margin: 0,
                      border: '1px solid #d0d7de',
                      fontFamily: 'monospace',
                      color: '#24292f'
                    }}>
                      {JSON.stringify(response.parsed_query, null, 2)}
                    </pre>
                  </div>
                )}


                {/* Interactive API Tester */}
                <div style={{
                  background: '#ffffff',
                  border: '2px solid #0969da',
                  borderRadius: '6px',
                  padding: '16px',
                  marginBottom: '20px'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '12px'
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '11px', color: '#57606a', marginBottom: '4px' }}>
                        GET Request
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: '600', color: '#0969da', fontFamily: 'monospace' }}>
                        /api/v3{response.audit?.data_sources?.[0]?.endpoint || '/athlete/activities'}
                      </div>
                    </div>
                    <button
                      onClick={async () => {
                        setIsTestingApi(true);
                        try {
                          const params = response.audit?.data_sources?.[0]?.params || {};
                          const endpoint = response.audit?.data_sources?.[0]?.endpoint || '';

                          const testResponse = await fetch('http://localhost:5002/api/strava/data/test-api-call', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              endpoint: endpoint,
                              params: params,
                              user_id: 'test_123'
                            })
                          });

                          const data = await testResponse.json();
                          setApiTestResult(data);
                        } catch (error) {
                          setApiTestResult({ error: error.message });
                        } finally {
                          setIsTestingApi(false);
                        }
                      }}
                      disabled={isTestingApi}
                      style={{
                        padding: '6px 16px',
                        background: isTestingApi ? '#6b7280' : '#0969da',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: isTestingApi ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {isTestingApi ? 'Testing...' : 'Run API Call Now'}
                    </button>
                  </div>

                  {apiTestResult && (
                    <div>
                      <div style={{
                        fontSize: '11px',
                        color: '#57606a',
                        marginBottom: '8px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <span>Live Response from Strava:</span>
                        <span style={{
                          padding: '2px 8px',
                          background: apiTestResult.error ? '#f8d7da' : '#d1fae5',
                          color: apiTestResult.error ? '#721c24' : '#065f46',
                          borderRadius: '3px',
                          fontWeight: '600'
                        }}>
                          {apiTestResult.error ? 'ERROR' : `${apiTestResult.count || 0} activities`}
                        </span>
                      </div>
                      <div style={{ marginBottom: '12px' }}>
                        <button
                          onClick={() => setShowFullJson(!showFullJson)}
                          style={{
                            padding: '4px 12px',
                            background: '#f6f8fa',
                            border: '1px solid #d0d7de',
                            borderRadius: '4px',
                            fontSize: '11px',
                            cursor: 'pointer',
                            color: '#24292f'
                          }}
                        >
                          {showFullJson ? '▼ Hide Full JSON' : '▶ Show Full JSON'}
                        </button>
                      </div>

                      {/* Activity Summary Table */}
                      {apiTestResult.activities && apiTestResult.activities.length > 0 && (
                        <>
                          <button
                            onClick={() => {
                              // Convert activities to CSV
                              const headers = ['#', 'Date', 'Name', 'Distance (mi)', 'Time (mm:ss)'];
                              const rows = [...apiTestResult.activities].reverse().map((activity, idx) => [
                                idx + 1,
                                activity.start_date?.split('T')[0],
                                activity.name,
                                (activity.distance / 1609.34).toFixed(2),
                                `${Math.floor(activity.moving_time / 60)}:${String(activity.moving_time % 60).padStart(2, '0')}`
                              ]);

                              const csv = [
                                headers.join(','),
                                ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
                              ].join('\n');

                              // Download
                              const blob = new Blob([csv], { type: 'text/csv' });
                              const url = window.URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `strava-activities-${apiTestResult.count}.csv`;
                              a.click();
                              window.URL.revokeObjectURL(url);
                            }}
                            style={{
                              marginBottom: '12px',
                              padding: '6px 12px',
                              background: '#0969da',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: '600',
                              cursor: 'pointer'
                            }}
                          >
                            Download CSV
                          </button>
                          <div style={{
                            background: 'white',
                            border: '1px solid #d0d7de',
                            borderRadius: '4px',
                            marginBottom: '12px',
                            maxHeight: '300px',
                            overflow: 'auto'
                          }}>
                          <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
                            <thead style={{ position: 'sticky', top: 0, background: '#f6f8fa', borderBottom: '2px solid #d0d7de' }}>
                              <tr>
                                <th style={{ padding: '8px', textAlign: 'left', fontWeight: '600' }}>#</th>
                                <th style={{ padding: '8px', textAlign: 'left', fontWeight: '600' }}>Date & Time (ET)</th>
                                <th style={{ padding: '8px', textAlign: 'left', fontWeight: '600' }}>Name</th>
                                <th style={{ padding: '8px', textAlign: 'right', fontWeight: '600' }}>Distance</th>
                                <th style={{ padding: '8px', textAlign: 'right', fontWeight: '600' }}>Time</th>
                              </tr>
                            </thead>
                            <tbody>
                              {[...apiTestResult.activities].reverse().map((activity, idx) => (
                                <tr key={idx} style={{ borderBottom: '1px solid #f6f8fa' }}>
                                  <td style={{ padding: '8px', color: '#57606a' }}>{idx + 1}</td>
                                  <td style={{ padding: '8px', color: '#24292f', fontFamily: 'monospace' }}>
                                    {(() => {
                                      const utcDate = new Date(activity.start_date);
                                      return utcDate.toLocaleString('en-US', {
                                        timeZone: 'America/New_York',
                                        year: 'numeric',
                                        month: '2-digit',
                                        day: '2-digit',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        hour12: true
                                      });
                                    })()}
                                  </td>
                                  <td style={{ padding: '8px', color: '#24292f' }}>
                                    {activity.name}
                                  </td>
                                  <td style={{ padding: '8px', textAlign: 'right', color: '#24292f', fontFamily: 'monospace' }}>
                                    {(activity.distance / 1609.34).toFixed(2)} mi
                                  </td>
                                  <td style={{ padding: '8px', textAlign: 'right', color: '#24292f', fontFamily: 'monospace' }}>
                                    {Math.floor(activity.moving_time / 60)}:{String(activity.moving_time % 60).padStart(2, '0')}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        </>
                      )}

                      {showFullJson && (
                        <pre style={{
                          background: '#f6f8fa',
                          padding: '12px',
                          borderRadius: '4px',
                          overflow: 'auto',
                          maxHeight: '300px',
                          fontSize: '10px',
                          margin: 0,
                          border: '1px solid #d0d7de',
                          fontFamily: 'monospace',
                          color: '#24292f'
                        }}>
                          {JSON.stringify(apiTestResult, null, 2)}
                        </pre>
                      )}
                    </div>
                  )}
                </div>

                {/* Actual API Request */}
                <div style={{
                  background: '#f6f8fa',
                  border: '1px solid #d0d7de',
                  borderRadius: '6px',
                  padding: '16px',
                  marginBottom: '20px',
                  fontFamily: 'monospace',
                  fontSize: '12px'
                }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: '600', color: '#24292f' }}>
                    🔌 Strava API Request
                  </h4>
                  <div style={{ marginBottom: '12px' }}>
                    <span style={{ color: '#0969da', fontWeight: '600' }}>GET</span>{' '}
                    <span style={{ color: '#24292f' }}>
                      https://www.strava.com/api/v3{response.audit?.data_sources?.[0]?.endpoint}
                    </span>
                  </div>
                  <div style={{ background: '#ffffff', padding: '10px', borderRadius: '4px', border: '1px solid #d0d7de' }}>
                    <div style={{ color: '#57606a', marginBottom: '4px' }}>Query Parameters:</div>
                    <div style={{ color: '#24292f' }}>
                      {Object.entries(response.audit?.data_sources?.[0]?.params || {}).map(([key, value]) => (
                        <div key={key} style={{ paddingLeft: '12px' }}>
                          <span style={{ color: '#0969da' }}>{key}</span>: <span style={{ color: '#cf222e' }}>{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ marginTop: '12px', fontSize: '11px', color: '#57606a' }}>
                    💡 Copy this into Postman to reproduce the exact API call
                  </div>
                </div>

                <h4 style={{ margin: '0 0 20px 0', fontSize: '15px', fontWeight: '700', color: '#10b981' }}>
                  Processed Results
                </h4>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '12px 0', color: '#6b7280', fontWeight: '500', fontSize: '14px', width: '40%' }}>Activities</td>
                      <td style={{ padding: '12px 0', color: '#374151', fontWeight: '500', fontSize: '14px' }}>{response.raw_data.activity_count}</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '12px 0', color: '#6b7280', fontWeight: '500', fontSize: '14px' }}>Total distance</td>
                      <td style={{ padding: '12px 0', color: '#374151', fontWeight: '500', fontSize: '14px' }}>{response.raw_data.total_distance_meters.toLocaleString()} meters</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '12px 0', color: '#6b7280', fontWeight: '500', fontSize: '14px' }}>Moving time</td>
                      <td style={{ padding: '12px 0', color: '#374151', fontWeight: '500', fontSize: '14px' }}>{response.raw_data.total_moving_time.toLocaleString()} seconds</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {showAlternatives && (
              <div>
                <h4 style={{ margin: '0 0 20px 0', fontSize: '15px', fontWeight: '700', color: '#f59e0b' }}>
                  Alternative Calculations
                </h4>
                <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '2' }}>
                  {response.alternatives.map((alt, i) => (
                    <li key={i} style={{ color: '#6b7280', fontSize: '14px' }}>{alt}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Prompt Modal */}
      {showPromptModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}
        onClick={() => setShowPromptModal(false)}
        >
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '32px',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px'
            }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#111827' }}>
                Original Prompt
              </h3>
              <button
                onClick={() => setShowPromptModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  color: '#6b7280',
                  cursor: 'pointer',
                  padding: 0,
                  lineHeight: 1
                }}
              >
                ×
              </button>
            </div>

            <div style={{
              background: '#f9fafb',
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              marginBottom: '20px'
            }}>
              <p style={{
                margin: 0,
                fontSize: '15px',
                lineHeight: '1.6',
                color: '#374151'
              }}>
                {question}
              </p>
            </div>

            <button
              onClick={() => setShowPromptModal(false)}
              style={{
                width: '100%',
                padding: '12px',
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {showTokenMenu && selectedToken && (
        <TokenActionMenu
          token={selectedToken}
          onClose={() => setShowTokenMenu(false)}
          onAction={handleTokenAction}
        />
      )}

      <TokenFeedbackModal
        isOpen={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        onSubmit={handleFeedbackSubmit}
        answer={response.answer}
        existingTokens={response.tokens}
      />

      <TokenCritiqueModal
        isOpen={showCritiqueModal}
        onClose={() => setShowCritiqueModal(false)}
        critique={missingTokens}
        onApprove={handleApproveMissingTokens}
        answer={response.answer}
        originalTokens={response.tokens}
      />
    </>
  );
};

export default StravaResponseCard;