import React from 'react';
import styles from './ReactCodeBlock.module.css';

const ReactCodeBlock = ({ code, language }) => {
  // Parse and highlight code into structured tokens
  const parseCode = (code) => {
    const tokens = [];
    let currentIndex = 0;

    // Define patterns with their corresponding styles
    const patterns = [
      { regex: /\/\/.*$/gm, type: 'comment' },
      { regex: /\/\*[\s\S]*?\*\//g, type: 'comment' },
      { regex: /(["'`])((?:\\.|(?!\1)[^\\])*?)\1/g, type: 'string' },
      { regex: /\b(React|useState|useEffect|useCallback|useMemo|useContext|useReducer|useRef)\b/g, type: 'reactKeyword' },
      { regex: /\b(const|let|var|function|return|if|else|for|while|import|export|from|default)\b/g, type: 'jsKeyword' },
      { regex: /\b(\d+\.?\d*)\b/g, type: 'number' },
    ];

    // Find all matches
    const allMatches = [];
    patterns.forEach(pattern => {
      let match;
      const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
      while ((match = regex.exec(code)) !== null) {
        allMatches.push({
          start: match.index,
          end: match.index + match[0].length,
          text: match[0],
          type: pattern.type
        });
      }
    });

    // Sort matches by position
    allMatches.sort((a, b) => a.start - b.start);

    // Remove overlapping matches (keep the first one)
    const nonOverlapping = [];
    allMatches.forEach(match => {
      if (!nonOverlapping.some(existing =>
        match.start < existing.end && match.end > existing.start
      )) {
        nonOverlapping.push(match);
      }
    });

    // Build token array
    let lastIndex = 0;
    nonOverlapping.forEach(match => {
      // Add plain text before the match
      if (match.start > lastIndex) {
        tokens.push({
          text: code.slice(lastIndex, match.start),
          type: 'plain'
        });
      }
      // Add the highlighted match
      tokens.push({
        text: match.text,
        type: match.type
      });
      lastIndex = match.end;
    });

    // Add remaining plain text
    if (lastIndex < code.length) {
      tokens.push({
        text: code.slice(lastIndex),
        type: 'plain'
      });
    }

    return tokens;
  };

  const tokens = parseCode(code);

  return (
    <div className={styles.codeBlockContainer}>
      <div className={styles.header}>
        <span className={styles.label}>React</span>
      </div>
      <pre className={styles.codeBlock}>
        <code className={styles.reactCode}>
          {tokens.map((token, index) => {
            const className = token.type !== 'plain' ? styles[token.type] : '';
            return (
              <span key={index} className={className}>
                {token.text}
              </span>
            );
          })}
        </code>
      </pre>
    </div>
  );
};

export default ReactCodeBlock;