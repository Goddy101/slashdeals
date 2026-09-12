// src/components/TrafficChart.tsx
'use client';

import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';

export default function TrafficChart({ data }: { data: { date: string; views: number; clicks: number }[] }) {
  if (!data || data.length === 0) return null;

  return (
    <div className="h-72 w-full mt-6">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid stroke="#f3f4f6" strokeDasharray="5 5" vertical={false} />
          <XAxis 
            dataKey="date" 
            stroke="#9ca3af" 
            fontSize={12} 
            tickLine={false} 
            axisLine={false} 
          />
          <YAxis 
            stroke="#9ca3af" 
            fontSize={12} 
            tickLine={false} 
            axisLine={false} 
            allowDecimals={false} 
          />
          <Tooltip 
            contentStyle={{ 
              borderRadius: '12px', 
              border: 'none', 
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' 
            }}
            cursor={{ stroke: '#e5e7eb', strokeWidth: 2 }}
          />
          {/* Blue Line for Views */}
          <Line 
            type="monotone" 
            dataKey="views" 
            name="Organic Views"
            stroke="#2563eb" 
            strokeWidth={3} 
            dot={{ r: 4, fill: '#2563eb', strokeWidth: 2, stroke: '#fff' }} 
            activeDot={{ r: 8, strokeWidth: 0 }} 
          />
          {/* Emerald Line for Clicks */}
          <Line 
            type="monotone" 
            dataKey="clicks" 
            name="Organic Clicks"
            stroke="#10b981" 
            strokeWidth={3} 
            dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} 
            activeDot={{ r: 8, strokeWidth: 0 }} 
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}