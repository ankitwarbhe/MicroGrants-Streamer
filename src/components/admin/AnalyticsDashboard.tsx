import React, { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { supabase } from '../../lib/supabase';
import type { Application } from '../../types';
import { CURRENCY_SYMBOLS } from '../../types';
import { submitApplication } from '../../services/applications';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon, change, trend }) => (
  <div className="bg-white p-6 rounded-lg shadow-md">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="mt-2 text-3xl font-semibold text-gray-900">{value}</p>
        {change && (
          <p className={`mt-2 text-sm ${
            trend === 'up' ? 'text-green-600' : 
            trend === 'down' ? 'text-red-600' : 
            'text-gray-600'
          }`}>
            {change}
          </p>
        )}
      </div>
      <div className="p-3 bg-indigo-100 rounded-full">
        {icon}
      </div>
    </div>
  </div>
);

export function AnalyticsDashboard() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('year');

  useEffect(() => {
    async function fetchAnalyticsData() {
      try {
        // Calculate the start date based on selected time range
        const startDate = new Date();
        if (timeRange === 'week') {
          startDate.setDate(startDate.getDate() - 7);
        } else if (timeRange === 'month') {
          startDate.setMonth(startDate.getMonth() - 1);
        } else if (timeRange === 'year') {
          startDate.setFullYear(startDate.getFullYear() - 1);
        }

        const { data, error: fetchError } = await supabase
          .from('applications')
          .select('*')
          .gte('created_at', startDate.toISOString())
          .order('created_at', { ascending: true });

        if (fetchError) throw fetchError;
        setApplications(data || []);
      } catch (err) {
        console.error('Error fetching analytics data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch analytics data');
      } finally {
        setLoading(false);
      }
    }

    fetchAnalyticsData();
  }, [timeRange]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-700 p-4 rounded-md">
        {error}
      </div>
    );
  }

  // Get the start date for filtering
  const startDate = new Date();
  if (timeRange === 'week') {
    startDate.setDate(startDate.getDate() - 7);
  } else if (timeRange === 'month') {
    startDate.setMonth(startDate.getMonth() - 1);
  } else if (timeRange === 'year') {
    startDate.setFullYear(startDate.getFullYear() - 1);
  }

  // Filter applications based on time range
  const filteredApplications = applications.filter(app => 
    new Date(app.created_at) >= startDate
  );

  // Calculate metrics using filtered applications
  const totalApplications = filteredApplications.length;
  const totalapprovedApplications = filteredApplications.filter(app => 
    app.status === 'approved' || 
    app.status === 'pending_signature' || 
    app.status === 'signed'
  ).length;
  const approvedApplications = filteredApplications.filter(app => app.status === 'approved').length;
  const pendingApplications = filteredApplications.filter(app => app.status === 'submitted').length;
  const rejectedApplications = filteredApplications.filter(app => app.status === 'rejected').length;
  const pendingSignatureApplications = filteredApplications.filter(app => app.status === 'pending_signature').length;
  const signedApplications = filteredApplications.filter(app => app.status === 'signed').length;
  const draftApplications = filteredApplications.filter(app => app.status === 'draft').length;

  // Calculate approval rate based on completed applications only
  const completedApplications = totalapprovedApplications + rejectedApplications + draftApplications + pendingApplications;
  const approvalRate = completedApplications > 0 
    ? (totalapprovedApplications / completedApplications) * 100 
    : 0;

  // Calculate average processing time for completed applications
  const completedApps = filteredApplications.filter(app => 
    app.status === 'approved' || 
    app.status === 'rejected' || 
    app.status === 'signed'
  );

  const avgProcessingTime = completedApps.length > 0 
    ? completedApps.reduce((sum, app) => {
        const submittedDate = new Date(app.created_at);
        const completedDate = new Date(app.updated_at);
        const diffDays = Math.ceil((completedDate.getTime() - submittedDate.getTime()) / (1000 * 60 * 60 * 24));
        return sum + diffDays;
      }, 0) / completedApps.length
    : 0;

  // Prepare data for status distribution pie chart
  const statusData = [
    { name: 'Approved', value: approvedApplications, color: '#00C49F' },
    { name: 'Pending', value: pendingApplications, color: '#0088FE' },
    { name: 'Rejected', value: rejectedApplications, color: '#FF8042' },
    { name: 'Draft', value: draftApplications, color: '#FFBB28' },
    { name: 'Pending Signature', value: pendingSignatureApplications, color: '#8884d8' },
    { name: 'Signed', value: signedApplications, color: '#82ca9d' }
  ].filter(item => item.value > 0); // Only show statuses that have applications

  // Prepare data for monthly applications trend
  const monthlyData = (() => {
    // Create a map of all months in the range with 0 counts
    const months: { [key: string]: number } = {};
    const currentDate = new Date(startDate);
    while (currentDate <= new Date()) {
      const monthKey = currentDate.toLocaleString('default', { 
        month: timeRange === 'week' ? 'short' : 'short',
        year: '2-digit',
        day: timeRange === 'week' ? 'numeric' : undefined 
      });
      months[monthKey] = 0;
      if (timeRange === 'week') {
        currentDate.setDate(currentDate.getDate() + 1);
      } else {
        currentDate.setMonth(currentDate.getMonth() + 1);
      }
    }

    // Fill in the actual application counts
    filteredApplications.forEach(app => {
      const appDate = new Date(app.created_at);
      const monthKey = appDate.toLocaleString('default', { 
        month: timeRange === 'week' ? 'short' : 'short',
        year: '2-digit',
        day: timeRange === 'week' ? 'numeric' : undefined
      });
      if (monthKey in months) {
        months[monthKey]++;
      }
    });

    // Convert to array and sort chronologically
    return Object.entries(months)
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => {
        const aDate = new Date(a.month + ' 2020');
        const bDate = new Date(b.month + ' 2020');
        return aDate.getTime() - bDate.getTime();
      });
  })();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Total Applications"
            value={totalApplications}
            icon={<span className="text-indigo-600 text-xl">📝</span>}
          />
          <MetricCard
            title="Approval Rate"
            value={`${approvalRate.toFixed(1)}%`}
            icon={<span className="text-green-600 text-xl">✓</span>}
            change={completedApplications > 0 ? `Based on ${completedApplications} reviewed applications` : 'No reviewed applications yet'}
          />
          <MetricCard
            title="Average Processing Time"
            value={avgProcessingTime > 0 ? `${Math.round(avgProcessingTime)} days` : 'N/A'}
            icon={<span className="text-orange-600 text-xl">⏱️</span>}
            change={`Based on ${completedApps.length} completed applications`}
          />
          <MetricCard
            title="Pending Reviews"
            value={pendingApplications}
            icon={<span className="text-blue-600 text-xl">⏳</span>}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Status Distribution */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Application Status Distribution</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 20, right: 120, bottom: 20, left: 20 }}>
                <Pie
                  data={statusData}
                  cx="35%"
                  cy="50%"
                  labelLine={false}
                  label={false}
                  outerRadius={65}
                  innerRadius={45}
                  fill="#8884d8"
                  dataKey="value"
                  paddingAngle={2}
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    `${value} applications (${((value/totalApplications) * 100).toFixed(1)}%)`,
                    name
                  ]}
                  contentStyle={{ fontSize: '12px' }}
                />
                <Legend 
                  layout="vertical" 
                  align="right"
                  verticalAlign="middle"
                  formatter={(value, entry: any) => {
                    const percent = ((entry.payload.value / totalApplications) * 100).toFixed(1);
                    return `${value} (${entry.payload.value} - ${percent}%)`;
                  }}
                  wrapperStyle={{ 
                    fontSize: '12px', 
                    paddingLeft: '30px',
                    width: '200px',
                    overflowWrap: 'break-word'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Monthly Trend */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Application Trend</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 12 }}
                  interval={0}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis 
                  tick={{ fontSize: 12 }} 
                  allowDecimals={false}
                  domain={[0, 'auto']}
                />
                <Tooltip 
                  contentStyle={{ fontSize: '12px' }}
                  formatter={(value: number) => [`${value} applications`, 'Count']}
                />
                <Legend 
                  wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#8884d8" 
                  name="Applications"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Time Range Selector */}
      <div className="flex justify-end mb-4">
        <div className="inline-flex rounded-md shadow-sm">
          {(['week', 'month', 'year'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 text-sm font-medium ${
                timeRange === range
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              } border border-gray-300 first:rounded-l-md last:rounded-r-md`}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
} 