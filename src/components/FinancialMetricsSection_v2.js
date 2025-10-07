import React from 'react';
import financialMetricsByUseCase from '../data/financialMetricsByUseCase';
import industryBenchmarks, { getIndustryBenchmark } from '../data/industryBenchmarks';
import { getDealContext, getCompanyName, getIndustryName } from '../data/dealContextByUseCase';
import metricTaxonomy, { getRiskLevel, groupMetricsByCategory } from '../data/metricTaxonomy';

function FinancialMetricsSection({ useCaseKey }) {
  const metrics = financialMetricsByUseCase[useCaseKey];
  const dealContext = getDealContext(useCaseKey);
  const companyName = getCompanyName(useCaseKey);
  const industryName = getIndustryName(useCaseKey);

  if (!metrics) return null;

  const groupedMetrics = groupMetricsByCategory(metrics);

  // Calculate industry-specific premiums for key valuation metrics
  const calculateIndustryPremium = (metricKey, value) => {
    const industryBenchmark = getIndustryBenchmark(industryName, metricKey);
    if (!industryBenchmark || !value) return null;

    return ((value - industryBenchmark) / industryBenchmark * 100).toFixed(1);
  };

  const ebitdaPremium = calculateIndustryPremium('ebitdaMultiple', metrics.ebitdaMultiple);
  const revenuePremium = calculateIndustryPremium('revenueMultiple', metrics.revenueMultiple);

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

  const renderIndustryComparison = (metricKey, premium) => {
    if (!premium) return null;

    const industryBenchmark = getIndustryBenchmark(industryName, metricKey);
    const metricLabel = metricTaxonomy[metricKey]?.label || metricKey;

    return (
      <li key={`${metricKey}-comparison`} className={premium > 0 ? 'premium' : 'discount'}>
        <strong>vs. {industryName}:</strong> {premium > 0 ? '+' : ''}{premium}%
        <span className="benchmark-detail">
          (Industry avg: {industryBenchmark.toFixed(1)}x)
        </span>
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
                  {ebitdaPremium && renderIndustryComparison('ebitdaMultiple', ebitdaPremium)}
                  {revenuePremium && renderIndustryComparison('revenueMultiple', revenuePremium)}
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