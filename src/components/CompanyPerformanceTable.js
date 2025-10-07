import React, { useState, useMemo } from 'react';
import PropTypes from 'prop-types';

export default function CompanyPerformanceTable({ companies, onDeepDive }) {
  const [sortDescending, setSortDescending] = useState(true);

  const sortedCompanies = useMemo(() => {
    if (!Array.isArray(companies)) return [];
    return [...companies].sort((a, b) => {
      const aVar = Math.abs(a.plan_variance_percent ?? 0);
      const bVar = Math.abs(b.plan_variance_percent ?? 0);
      return sortDescending ? bVar - aVar : aVar - bVar;
    });
  }, [companies, sortDescending]);

  return (
    <div className="mt-8 w-full">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold">Company Performance</h3>
        <button
          onClick={() => setSortDescending(!sortDescending)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          Sort by Variance {sortDescending ? '↓' : '↑'}
        </button>
      </div>

      <div className="overflow-x-auto border rounded-lg shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Company</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Sector</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Planned Revenue</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Actual Revenue</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Variance</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Cash Flow</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sortedCompanies.map((c, idx) => {
              const flagColor =
                c.variance_flag === 'high_positive' ? 'text-green-600'
                : c.variance_flag === 'high_negative' ? 'text-red-600'
                : c.variance_flag === 'outside_range' ? 'text-orange-500'
                : 'text-gray-700';

              return (
                <tr
                  key={idx}
                  className={`hover:bg-gray-50 ${c.requires_deep_dive ? 'cursor-pointer font-semibold' : ''}`}
                  onClick={() => c.requires_deep_dive && onDeepDive(c)}
                >
                  <td className="px-4 py-3 whitespace-nowrap">{c.name || '—'}</td>
                  <td className="px-4 py-3">{c.sector || '—'}</td>
                  <td className="px-4 py-3">{c.planned_revenue || '—'}</td>
                  <td className="px-4 py-3">{c.actual_revenue || '—'}</td>
                  <td className={`px-4 py-3 ${flagColor}`}>
                    {typeof c.plan_variance_percent === 'number'
                      ? `${c.plan_variance_percent > 0 ? '+' : ''}${c.plan_variance_percent}%`
                      : '—'}
                    {' '}
                    {c.variance_flag === 'high_positive' && '🔺'}
                    {c.variance_flag === 'high_negative' && '🔻'}
                  </td>
                  <td className="px-4 py-3">{c.cash_flow_status || '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

CompanyPerformanceTable.propTypes = {
  companies: PropTypes.arrayOf(PropTypes.shape({
    name: PropTypes.string,
    sector: PropTypes.string,
    planned_revenue: PropTypes.string,
    actual_revenue: PropTypes.string,
    plan_variance_percent: PropTypes.number,
    variance_flag: PropTypes.string,
    cash_flow_status: PropTypes.string,
    requires_deep_dive: PropTypes.bool,
  })).isRequired,
  onDeepDive: PropTypes.func,
};

CompanyPerformanceTable.defaultProps = {
  onDeepDive: (company) => console.log(`Deep dive on: ${company.name}`),
};
