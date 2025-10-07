import React, { useState, useEffect } from 'react';
import { X, Brain, Target, Settings, Save, AlertCircle, CheckCircle, Plus, Trash2 } from 'lucide-react';
import styles from './IntentModal.module.css';

const IntentModal = ({
  isOpen,
  onClose,
  prompt,
  workspaceId,
  currentIntent,
  currentConfidence
}) => {
  const [classificationResult, setClassificationResult] = useState(null);
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('analysis');
  const [editingRule, setEditingRule] = useState(null);

  // Fetch classification analysis and rules when modal opens
  useEffect(() => {
    if (isOpen && prompt && workspaceId) {
      fetchClassificationAnalysis();
      fetchRules();
    }
  }, [isOpen, prompt, workspaceId]);

  const fetchClassificationAnalysis = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5002/api/interactions/intents/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, workspace_id: workspaceId })
      });

      if (response.ok) {
        const data = await response.json();
        setClassificationResult(data);
      }
    } catch (error) {
      console.error('Failed to fetch classification analysis:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRules = async () => {
    try {
      const response = await fetch(`http://localhost:5002/api/interactions/intents/rules/${workspaceId}`);
      if (response.ok) {
        const data = await response.json();
        setRules(data.rules || []);
      }
    } catch (error) {
      console.error('Failed to fetch rules:', error);
    }
  };

  const saveRule = async (rule) => {
    setSaving(true);
    try {
      const response = await fetch('http://localhost:5002/api/interactions/intents/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: workspaceId,
          intent_name: rule.intentName,
          description: rule.description,
          keywords: rule.keywords,
          phrases: rule.phrases,
          confidence_weight: rule.confidenceWeight
        })
      });

      if (response.ok) {
        await fetchRules();
        await fetchClassificationAnalysis(); // Refresh analysis
        setEditingRule(null);
      }
    } catch (error) {
      console.error('Failed to save rule:', error);
    } finally {
      setSaving(false);
    }
  };

  const addKeyword = (ruleIndex, keyword) => {
    if (!keyword.trim()) return;

    const updatedRules = [...rules];
    if (!updatedRules[ruleIndex].keywords.includes(keyword.trim())) {
      updatedRules[ruleIndex].keywords.push(keyword.trim());
      setRules(updatedRules);
    }
  };

  const removeKeyword = (ruleIndex, keywordIndex) => {
    const updatedRules = [...rules];
    updatedRules[ruleIndex].keywords.splice(keywordIndex, 1);
    setRules(updatedRules);
  };

  const addPhrase = (ruleIndex, phrase) => {
    if (!phrase.trim()) return;

    const updatedRules = [...rules];
    if (!updatedRules[ruleIndex].phrases.includes(phrase.trim())) {
      updatedRules[ruleIndex].phrases.push(phrase.trim());
      setRules(updatedRules);
    }
  };

  const removePhrase = (ruleIndex, phraseIndex) => {
    const updatedRules = [...rules];
    updatedRules[ruleIndex].phrases.splice(phraseIndex, 1);
    setRules(updatedRules);
  };

  const updateConfidenceWeight = (ruleIndex, weight) => {
    const updatedRules = [...rules];
    updatedRules[ruleIndex].confidenceWeight = parseFloat(weight);
    setRules(updatedRules);
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <Brain className={styles.headerIcon} />
            <div>
              <h2 className={styles.title}>Intent Classification</h2>
              <p className={styles.subtitle}>
                Classified as "{currentIntent}" with {Math.round(currentConfidence * 100)}% confidence
              </p>
            </div>
          </div>
          <button className={styles.closeButton} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'analysis' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('analysis')}
          >
            <Target size={16} />
            Analysis
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'rules' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('rules')}
          >
            <Settings size={16} />
            Rules
          </button>
        </div>

        <div className={styles.content}>
          {activeTab === 'analysis' && (
            <div className={styles.analysisTab}>
              <div className={styles.promptSection}>
                <h3 className={styles.sectionTitle}>Your Prompt</h3>
                <div className={styles.promptText}>{prompt}</div>
              </div>

              {loading ? (
                <div className={styles.loading}>Analyzing classification...</div>
              ) : classificationResult ? (
                <div className={styles.classificationResults}>
                  <h3 className={styles.sectionTitle}>Classification Breakdown</h3>

                  <div className={styles.resultSummary}>
                    <div className={styles.resultIntent}>
                      <strong>Intent:</strong> {classificationResult.predictedIntent}
                    </div>
                    <div className={styles.resultConfidence}>
                      <strong>Confidence:</strong> {Math.round(classificationResult.confidence * 100)}%
                    </div>
                  </div>

                  {classificationResult.matchedRules?.length > 0 ? (
                    <div className={styles.matchedRules}>
                      <h4 className={styles.subsectionTitle}>Matched Rules</h4>
                      {classificationResult.matchedRules.map((rule, index) => (
                        <div key={index} className={styles.matchedRule}>
                          <div className={styles.ruleHeader}>
                            <span className={styles.ruleIntent}>{rule.intentName}</span>
                            <span className={styles.ruleScore}>Score: {rule.finalScore.toFixed(2)}</span>
                          </div>
                          <p className={styles.ruleDescription}>{rule.description}</p>

                          {rule.matchedKeywords.length > 0 && (
                            <div className={styles.matches}>
                              <strong>Matched Keywords:</strong>
                              <div className={styles.matchTags}>
                                {rule.matchedKeywords.map((keyword, i) => (
                                  <span key={i} className={styles.matchTag}>{keyword}</span>
                                ))}
                              </div>
                            </div>
                          )}

                          {rule.matchedPhrases.length > 0 && (
                            <div className={styles.matches}>
                              <strong>Matched Phrases:</strong>
                              <div className={styles.matchTags}>
                                {rule.matchedPhrases.map((phrase, i) => (
                                  <span key={i} className={styles.matchTag}>{phrase}</span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className={styles.noMatches}>
                      <AlertCircle className={styles.warningIcon} />
                      <p>No specific rules matched. Classified as "other" by default.</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className={styles.error}>Failed to load classification analysis</div>
              )}
            </div>
          )}

          {activeTab === 'rules' && (
            <div className={styles.rulesTab}>
              <div className={styles.rulesHeader}>
                <h3 className={styles.sectionTitle}>Classification Rules</h3>
                <p className={styles.rulesDescription}>
                  Configure keywords and phrases to improve intent classification for your workspace.
                </p>
              </div>

              {rules.length > 0 ? (
                <div className={styles.rulesList}>
                  {rules.map((rule, ruleIndex) => (
                    <div key={rule.id} className={styles.ruleCard}>
                      <div className={styles.ruleCardHeader}>
                        <div className={styles.ruleInfo}>
                          <h4 className={styles.ruleName}>{rule.intentName}</h4>
                          <p className={styles.ruleDescription}>{rule.description}</p>
                          {rule.isCustom && (
                            <span className={styles.customBadge}>Custom Rule</span>
                          )}
                        </div>
                        <div className={styles.confidenceControl}>
                          <label className={styles.confidenceLabel}>
                            Confidence Weight: {rule.confidenceWeight}
                          </label>
                          <input
                            type="range"
                            min="0.1"
                            max="2.0"
                            step="0.1"
                            value={rule.confidenceWeight}
                            onChange={(e) => updateConfidenceWeight(ruleIndex, e.target.value)}
                            className={styles.confidenceSlider}
                          />
                        </div>
                      </div>

                      <div className={styles.ruleContent}>
                        <div className={styles.keywordsSection}>
                          <h5 className={styles.listTitle}>Keywords</h5>
                          <div className={styles.tagsList}>
                            {rule.keywords.map((keyword, keywordIndex) => (
                              <div key={keywordIndex} className={styles.tag}>
                                <span>{keyword}</span>
                                <button
                                  onClick={() => removeKeyword(ruleIndex, keywordIndex)}
                                  className={styles.removeTag}
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            ))}
                          </div>
                          <div className={styles.addInput}>
                            <input
                              type="text"
                              placeholder="Add keyword..."
                              className={styles.tagInput}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  addKeyword(ruleIndex, e.target.value);
                                  e.target.value = '';
                                }
                              }}
                            />
                            <button
                              onClick={(e) => {
                                const input = e.target.previousElementSibling;
                                addKeyword(ruleIndex, input.value);
                                input.value = '';
                              }}
                              className={styles.addButton}
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        </div>

                        <div className={styles.phrasesSection}>
                          <h5 className={styles.listTitle}>Phrases</h5>
                          <div className={styles.tagsList}>
                            {rule.phrases.map((phrase, phraseIndex) => (
                              <div key={phraseIndex} className={styles.tag}>
                                <span>{phrase}</span>
                                <button
                                  onClick={() => removePhrase(ruleIndex, phraseIndex)}
                                  className={styles.removeTag}
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            ))}
                          </div>
                          <div className={styles.addInput}>
                            <input
                              type="text"
                              placeholder="Add phrase..."
                              className={styles.tagInput}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  addPhrase(ruleIndex, e.target.value);
                                  e.target.value = '';
                                }
                              }}
                            />
                            <button
                              onClick={(e) => {
                                const input = e.target.previousElementSibling;
                                addPhrase(ruleIndex, input.value);
                                input.value = '';
                              }}
                              className={styles.addButton}
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className={styles.ruleActions}>
                        <button
                          onClick={() => saveRule(rule)}
                          disabled={saving}
                          className={styles.saveButton}
                        >
                          <Save size={14} />
                          {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.noRules}>
                  <Settings className={styles.noRulesIcon} />
                  <p>No classification rules found. Using default classifications.</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <div className={styles.footerInfo}>
            <span className={styles.tier}>Basic Tier - Keyword Matching</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntentModal;