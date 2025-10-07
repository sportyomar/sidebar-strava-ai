import React from 'react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from 'recharts';

const data = [
  { x: 1, y: 20 },
  { x: 2, y: 35 },
  { x: 3, y: 25 },
  { x: 4, y: 40 },
  { x: 5, y: 30 },
];

const BasicLineChart = () => {
  return (
    <div style={{ width: 300, height: 300 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
        >
          <XAxis dataKey="x" hide />
          <YAxis dataKey="y" hide domain={['auto', 'auto']} />
          <Line
            type="monotone"
            dataKey="y"
            stroke="#fff"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default BasicLineChart;