import React from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip } from 'recharts';

const BasicFunnelChartReChartB = () => {
  // Dummy data for the horizontal funnel chart
  const data = [
    { name: 'Website Visitors', value: 10000, fill: '#8884d8' },
    { name: 'Product Views', value: 7500, fill: '#82ca9d' },
    { name: 'Add to Cart', value: 4200, fill: '#ffc658' },
    { name: 'Checkout Started', value: 2800, fill: '#ff7c7c' },
    { name: 'Payment Completed', value: 1850, fill: '#8dd1e1' },
    { name: 'Order Confirmed', value: 1640, fill: '#d084d0' }
  ];

  // Custom label formatter for tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          backgroundColor: '#fff',
          border: '1px solid #ccc',
          borderRadius: '4px',
          padding: '8px'
        }}>
          <p style={{ margin: 0, color: '#333' }}>
            {`${label}: ${payload[0].value.toLocaleString()}`}
          </p>
        </div>
      );
    }
    return null;
  };

  // Custom bar shape to create funnel effect
  const CustomBar = (props) => {
    const { fill, x, y, width, height, payload } = props;
    const maxValue = Math.max(...data.map(d => d.value));
    const ratio = payload.value / maxValue;
    const adjustedWidth = width * ratio;
    const centerOffset = (width - adjustedWidth) / 2;

    return (
      <rect
        x={x + centerOffset}
        y={y}
        width={adjustedWidth}
        height={height}
        fill={fill}
        rx={4}
      />
    );
  };

  // Custom label component
  const CustomLabel = (props) => {
    const { x, y, width, height, value, payload } = props;
    const maxValue = Math.max(...data.map(d => d.value));
    const ratio = payload.value / maxValue;
    const adjustedWidth = width * ratio;
    const centerOffset = (width - adjustedWidth) / 2;

    return (
      <text
        x={x + centerOffset + adjustedWidth / 2}
        y={y + height / 2}
        fill="white"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="12"
        fontWeight="bold"
      >
        {value.toLocaleString()}
      </text>
    );
  };

  return (
    <div style={{ width: '100%', height: '400px', padding: '16px' }}>
      <h2 style={{
        fontSize: '24px',
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: '16px',
        color: '#374151'
      }}>
        Horizontal Sales Funnel Chart
      </h2>

      <div style={{ width: '100%', height: '300px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="horizontal"
            margin={{ top: 20, right: 30, left: 100, bottom: 20 }}
          >
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="name"
              width={90}
              tick={{ fontSize: 12, fill: '#666' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="value"
              shape={<CustomBar />}
              isAnimationActive={false}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{
        marginTop: '16px',
        fontSize: '14px',
        color: '#6B7280',
        textAlign: 'center'
      }}>
        <p>Conversion Rate: {((data[data.length - 1].value / data[0].value) * 100).toFixed(1)}%</p>
        <p style={{ fontSize: '12px', marginTop: '4px' }}>
          Bar width represents relative funnel stage size
        </p>
      </div>
    </div>
  );
};

export default BasicFunnelChartReChartB;