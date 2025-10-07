import React from 'react';
import financialMetricsByUseCase from '../data/financialMetricsByUseCase';
import metricTaxonomy, { getRiskLevel, groupMetricsByCategory } from '../data/metricTaxonomy';

function FinancialMetricsSection({useCaseKey, companyName}) {
    const metrics = financialMetricsByUseCase[useCaseKey]
    if (!metrics) return null;

    // grouping metrics by category to avoid manually coded valuation, leverage, returns
    // this dynamically groups and renders using mapping later in the code.


    const groupedMetrics = groupMetricsByCategory(metrics);

    // const {
    //     ebitdaMultiple,
    //     industryAvgMultiple,
    //     revenueMultiple,
    //     bookValueMultiple,
    //     debtToEbitda,
    //     debtToEquity,
    //     interestCoverage,
    //     roe,
    //     roic
    // } = metrics;


    // Calculate special values that need cross-metric logic
    const valuationPremium = metrics.ebitdaMultiple && metrics.industryAvgMultiple
    ? ((metrics.ebitdaMultiple - metrics.industryAvgMultiple) / metrics.industryAvgMultiple * 100).toFixed(1)
        : null;

    // const leverageRisk = debtToEbitda ? (debtToEbitda > 5 ? 'High' : debtToEbitda > 3 ? 'Moderate' : 'Low') : null;

    // const leverageRisk = getRiskLevel('debtToEbitda', metrics.debtToEbitda);

    const formatMetricValue = (key, value) => {
        const taxonomy = metricTaxonomy[key];
        if (!taxonomy) return value;

        const {format, suffix} = taxonomy;

        if (format === 'percentage') {
            return `${value.toFixed(1)}%`;
        }

        return `${value.toFixed(1)}${suffix || ''}`;
    }

    const renderMetricItem = (key, value) => {
        const taxonomy = metricTaxonomy[key];
        if (!taxonomy) return null;

        const {label, category} = taxonomy;
        const formattedValue = formatMetricValue(key, value);

        // Handle special cases
        if (key === 'industryAvgMultiple') return null;

        // Add risk assessment for leverage metrics
        if (category === 'Leverage & Risk' && taxonomy.riskThresholds) {
            const riskLevel = getRiskLevel(key, value);
            return (
                <li key={key} className={riskLevel ? `risk-${riskLevel}` : ''}>
                    <strong>{label}:</strong> {formattedValue}
                    {riskLevel && ` (${riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1)} Risk)`}
                </li>
            );
        }

        return (
            <li key={key}>
                <strong>{label}:</strong> {formattedValue}
            </li>
        )
    }

    return (
        <section className="financial-metrics">
            <h3>Financial Metrics</h3>
            <p className="caption">
                This shows how {companyName || 'the company'}'s valuation and leverage compares to peers.
            </p>

            <div className="metrics-grid">
                {Object.entries(groupedMetrics).map(([category, categoryMetrics]) => (
                    <div key={category} className="metric-group">
                        <h4>{category}</h4>
                        <ul>
                            {Object.entries(categoryMetrics).map(([key, value]) =>
                                renderMetricItem(key, value)
                            )}

                            {/* Add valuation premium if we're in Valuation category and have the data */}
                            {category === 'Valuation' && valuationPremium && (
                                <li className={valuationPremium > 0 ? 'premium' : 'discount'}>
                                    <strong>vs. Industry:</strong> {valuationPremium > 0 ? '+' : ''} {valuationPremium}%
                                </li>
                            )}
                        </ul>
                    </div>
                ))}
            </div>
        </section>
    );
}

export default FinancialMetricsSection;