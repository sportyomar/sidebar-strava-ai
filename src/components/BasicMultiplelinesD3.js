import React from 'react';
import SimpleLine from './BasicLineD3.js';

const BasicMultipleLinesD3 = () => {
  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-2xl font-bold mb-6 text-gray-900">Multiple D3 Line Charts</h1>
      <div className="flex gap-6 overflow-x-auto">
        {Array.from({length: 5}).map((_, i) => (
          <SimpleLine key={i} />
        ))}
      </div>
    </div>
  );
};

export default BasicMultipleLinesD3;