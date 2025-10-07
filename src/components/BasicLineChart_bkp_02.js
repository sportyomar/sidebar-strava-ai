import React from 'react';
import { Line, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { ComposedChart, Bar } from 'recharts';
import { Tooltip, ReferenceDot, LabelList, ReferenceLine, Area } from 'recharts';

const data = [
  {
    month: 1,
    efficiency_A: 100,
    efficiency_A_min: 95,
    efficiency_A_max: 105,
    efficiency_B: 95,
    implementations_A: 1,
    implementations_B: 2,
  },
  {
    month: 3,
    efficiency_A: 115,
    efficiency_A_min: 110,
    efficiency_A_max: 120,
    efficiency_B: 110,
    implementations_A: 4,
    implementations_B: 5,
  },
  {
    month: 6,
    efficiency_A: 135,
    efficiency_A_min: 125,
    efficiency_A_max: 145,
    efficiency_B: 125,
    implementations_A: 7,
    implementations_B: 8,
  },
  {
    month: 12,
    efficiency_A: 160,
    efficiency_A_min: 150,
    efficiency_A_max: 170,
    efficiency_B: 150,
    implementations_A: 10,
    implementations_B: 11,
  },
  {
    month: 18,
    efficiency_A: 185,
    efficiency_A_min: 175,
    efficiency_A_max: 195,
    efficiency_B: 170,
    implementations_A: 12,
    implementations_B: 14,
  },
];



const BasicLineChart = () => {
  return (
    <div style={{ width: 550, height: 480 }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          // margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
          margin={{ top: 30, right: 40, bottom: 40, left: 60 }}
        >
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#64748b" />
              <stop offset="100%" stopColor="#94a3b8" />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="month"
            label={{ value: 'Months Since AI Launch', position: 'insideBottom', offset: -10, fill: '#475569', fontSize: 13 }}
            tick={{ fill: '#94a3b8', fontSize: 12 }}
            // tick={{ fill: '#94a3b8', fontSize: 12, angle: -90, textAnchor: 'end' }}
            tickFormatter={(value) => `t + ${value}`}
          />
            <YAxis
              label={{ value: 'Efficiency Gain (%)', angle: -90, position: 'insideLeft', fill: '#475569', fontSize: 13 }}
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              tickFormatter={(value) => `${value}%`}
            />
            {/*<YAxis*/}
            {/*  yAxisId="right"*/}
            {/*  orientation="right"*/}
            {/*  label={{ value: 'AI Implementations', angle: 90, position: 'insideRight', fill: '#475569', fontSize: 13 }}*/}
            {/*  tick={{ fill: '#94a3b8', fontSize: 12 }}*/}
            {/*/>*/}
          {/*<Bar dataKey="implementations_A" fill="#475569" yAxisId="right" />*/}
          {/*<Bar dataKey="implementations_B" fill="#64748b" yAxisId="right" />*/}
          {/*<Bar dataKey="implementations_A" fill="#475569" yAxisId="right">*/}
          {/*  <LabelList dataKey="implementations_A" position="top" fill="#475569" fontSize={11} />*/}
          {/*</Bar>*/}
          {/*<Bar dataKey="implementations_B" fill="#64748b" yAxisId="right">*/}
          {/*  <LabelList dataKey="implementations_B" position="top" fill="#64748b" fontSize={11} />*/}
          {/*</Bar>*/}

          <Line
            type="monotone"
            dataKey="efficiency"
            stroke="url(#gradient)"
            strokeWidth={3}
            dot={{ r: 4, stroke: '#475569', strokeWidth: 1.5, fill: '#94a3b8' }}
          />
          <Line
            type="monotone"
            dataKey="efficiency_A"
            name="Company A"
            stroke="#94a3b8"
            strokeWidth={3}
            dot={{ r: 4 }}
            />
          <Line
            type="monotone"
            dataKey="efficiency_B"
            name="Company B"
            stroke="#64748b"
            strokeDasharray="5 5"
            strokeWidth={3}
          />
          <ReferenceDot
            x={6}
            y={135}
            r={6}
            fill="#94a3b8"
            stroke="none"
            label={{
              value: 'NLP Launched',
              position: 'top',
              fontSize: 12,
              fill: '#94a3b8',
            }}
          />

          <ReferenceDot
            x={12}
            y={160}
            r={6}
            fill="#94a3b8"
            stroke="none"
            label={{
              value: 'RPA Scaled',
              position: 'top',
              fontSize: 12,
              fill: '#94a3b8',
            }}
          />
          <ReferenceLine
            y={140}
            stroke="#94a3b8"
            strokeDasharray="3 3"
            strokeWidth={2}
            label={{
              value: 'Industry Benchmark',
              position: 'left',
              fontSize: 12,
              fill: '#94a3b8',
            }}
          />
          {/*<Area*/}
          {/*    type="monotone"*/}
          {/*    dataKey="efficiency_A_max"*/}
          {/*    stroke="none"*/}
          {/*    fill="#0ea5e9"*/}
          {/*    fillOpacity={0.1}*/}
          {/*  />*/}
          {/*  <Area*/}
          {/*    type="monotone"*/}
          {/*    dataKey="efficiency_A_min"*/}
          {/*    stroke="none"*/}
          {/*    fill="#ffffff"*/}
          {/*    fillOpacity={0.1}*/}
          {/*  />*/}
          <Tooltip
              formatter={(value, name) => {
                if (name === 'efficiency') return [`${value}%`, 'Efficiency'];
                if (name === 'implementations') return [`${value}`, 'AI Implementations'];
                return [value, name];
              }}
              labelFormatter={(label) => `Month ${label}`}
            />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default BasicLineChart;