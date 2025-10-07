import React from 'react';
import financialMetricsByUseCase from '../data/financialMetricsByUseCase';
import { getDealContext, getCompanyName, getIndustryName } from '../data/dealContextByUseCase';
import { getAsOfDate, getTimingContext } from '../data/dealDatesByUseCase';
import industryBenchmarks from '../data/industryBenchmarks';
import metricTaxonomy, { getRiskLevel, groupMetricsByCategory } from '../data/metricTaxonomy';
import { calculateIndustryPremium } from '../utils/metricComparison';

function FinancialMetricsSection({ useCaseKey }) {
  const metrics = financialMetricsByUseCase[useCaseKey];
  const dealContext = getDealContext(useCaseKey);
  const companyName = getCompanyName(useCaseKey);
  const industryName = getIndustryName(useCaseKey);
  const asOfDate = getAsOfDate(useCaseKey);
  const timingContext = getTimingContext(useCaseKey);

  if (!metrics) return null;

  const groupedMetrics = groupMetricsByCategory(metrics);

  const formatMetricValue = (key, value) => {
    const taxonomy = metricTaxonomy[key];
    if (!taxonomy) return value;

    const { format, suffix } = taxonomy;

    if (format === 'percentage') {
      return `${value.toFixed(1)}%`;
    }

    return `${value.toFixed(1)}${suffix || ''}`;
  };

  const renderMetricItem = (key, value) => {
    const taxonomy = metricTaxonomy[key];
    if (!taxonomy) return null;

    const { label, category } = taxonomy;
    const formattedValue = formatMetricValue(key, value);

    // Add comparison for Valuation metrics
    if (category === 'Valuation') {
      const premiumData = calculateIndustryPremium(industryName, key, value);
      const peerAvg = premiumData?.formattedBenchmark;
      const premium = premiumData?.formattedPremium;

      return (
        <li key={key}>
          <strong>{label}:</strong> {formattedValue}
          {peerAvg && premium && (
            <span className="peer-comparison"> (Peer Avg: {peerAvg}, {premium})</span>
          )}
        </li>
      );
    }

    // Add risk assessment for Leverage metrics
    if (category === 'Leverage & Risk' && taxonomy.riskThresholds) {
      const riskLevel = getRiskLevel(key, value);
      return (
        <li key={key} className={riskLevel ? `risk-${riskLevel}` : ''}>
          <strong>{label}:</strong> {formattedValue}
          {riskLevel && (
            <span className="risk-label">
              ({riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1)} Risk)
            </span>
          )}
        </li>
      );
    }

    return (
      <li key={key}>
        <strong>{label}:</strong> {formattedValue}
      </li>
    );
  };

  return (
    <section className="financial-metrics">
      <h3>Financial Metrics</h3>
      <p className="timestamp-note">
        As of: {asOfDate}
        {timingContext && (
          <span className={timingContext.className}> • {timingContext.message}</span>
        )}
      </p>
      <p className="caption">
        This shows how {companyName}'s valuation and leverage compare to {industryName} sector peers.
      </p>

      <div className="metrics-grid">
        {["Valuation", "Returns", "Leverage & Risk"].map(category =>
          groupedMetrics[category] && (
            <div key={category} className="metric-group">
              <h4>{category}</h4>
              <ul>
                {Object.entries(groupedMetrics[category]).map(([key, value]) =>
                  renderMetricItem(key, value)
                )}
              </ul>
            </div>
          )
        )}
      </div>

      {/* Add industry context footer */}
      <div className="industry-context">
        <p className="context-note">
          <strong>Industry Context:</strong> Benchmarks based on {industryName} sector analysis
          {industryBenchmarks[industryName]?.sampleSize &&
            ` (${industryBenchmarks[industryName].sampleSize} companies)`
          }
        </p>
      </div>
    </section>
  );
}

export default FinancialMetricsSection;