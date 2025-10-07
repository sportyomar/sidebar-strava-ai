import React from 'react';
import financialMetricsByUseCase from '../data/financialMetricsByUseCase';
import { getDealContext, getCompanyName, getIndustryName } from '../data/dealContextByUseCase';
import industryBenchmarks from '../data/industryBenchmarks';
import metricTaxonomy, { getRiskLevel, groupMetricsByCategory } from '../data/metricTaxonomy';
import { calculateIndustryPremium, formatIndustryComparison } from '../utils/metricComparison';

function FinancialMetricsSection({ useCaseKey }) {
  const metrics = financialMetricsByUseCase[useCaseKey];
  const dealContext = getDealContext(useCaseKey);
  const companyName = getCompanyName(useCaseKey);
  const industryName = getIndustryName(useCaseKey);

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

    // Add risk assessment for leverage metrics
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

  const renderIndustryComparison = (metricKey) => {
    const premiumData = calculateIndustryPremium(industryName, metricKey, metrics[metricKey]);
    if (!premiumData) return null;

    const comparisonText = formatIndustryComparison(industryName, premiumData, {
      peerLabel: 'Peer avg',
      sectorSuffix: 'Sector'
    });

    return (
      <li key={`${metricKey}-comparison`} className={premiumData.isAboveBenchmark ? 'premium' : 'discount'}>
        <strong>{comparisonText}</strong>
      </li>
    );
  };

  return (
    <section className="financial-metrics">
      <h3>Financial Metrics</h3>
      <p className="caption">
        This shows how {companyName}'s valuation and leverage compare to {industryName} sector peers.
      </p>

      <div className="metrics-grid">
        {Object.entries(groupedMetrics).map(([category, categoryMetrics]) => (
          <div key={category} className="metric-group">
            <h4>{category}</h4>
            <ul>
              {Object.entries(categoryMetrics).map(([key, value]) =>
                renderMetricItem(key, value)
              )}

              {/* Add industry comparisons for valuation metrics */}
              {category === 'Valuation' && (
                <>
                  {metrics.ebitdaMultiple && renderIndustryComparison('ebitdaMultiple')}
                  {metrics.revenueMultiple && renderIndustryComparison('revenueMultiple')}
                  {metrics.bookValueMultiple && renderIndustryComparison('bookValueMultiple')}
                </>
              )}
            </ul>
          </div>
        ))}
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