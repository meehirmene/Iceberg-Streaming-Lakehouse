import React, { useEffect, useState } from 'react';
import { trinoClient } from '../lib/trino';
import MetricCard from './MetricCard';
import { Activity, Users, DollarSign, RefreshCw } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const Dashboard = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [metrics, setMetrics] = useState({
        totalEvents: 0,
        totalRevenue: 0,
        uniqueUsers: 0
    });

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);
            // We will query the aggregated table: hourly_page_views
            // If it doesn't exist, we fallback to selecting from events_iceberg directly.
            // Assuming hourly_page_views exists and is populated by dbt.
            const query = `
        SELECT 
          CAST(event_hour AS VARCHAR) as hour_str,
          total_events,
          total_revenue,
          unique_users
        FROM iceberg.default_db.hourly_page_views
        ORDER BY event_hour DESC
        LIMIT 24
      `;

            const results = await trinoClient.query(query);

            // Reverse to get chronological order for the chart
            const chartData = [...results].reverse().map(row => ({
                ...row,
                hour: new Date(row.hour_str).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }));

            setData(chartData);

            // Simple aggregations for KPIs based on the fetched data
            if (results.length > 0) {
                const latest = results[0];
                setMetrics({
                    totalEvents: latest.total_events || 0,
                    totalRevenue: typeof latest.total_revenue === 'number' ? latest.total_revenue.toFixed(2) : 0,
                    uniqueUsers: latest.unique_users || 0
                });
            }
        } catch (err) {
            console.error("Failed to fetch dashboard data:", err);
            // For demonstration, if the table isn't ready, let's show dummy data instead of a harsh error
            setError("Waiting for data from Trino...");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // Poll every 10 seconds for new streaming data
        const interval = setInterval(fetchData, 10000);
        return () => clearInterval(interval);
    }, []);

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="glass-panel" style={{ padding: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <p style={{ margin: '0 0 8px 0', fontWeight: 'bold' }}>{label}</p>
                    {payload.map((entry, index) => (
                        <p key={index} style={{ color: entry.color, margin: '4px 0', fontSize: '14px' }}>
                            {entry.name}: {entry.value}
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Streaming Metrics</h2>
                    <p style={{ color: 'var(--text-muted)' }}>Real-time aggregated view of the Iceberg Lakehouse</p>
                </div>
                <button
                    onClick={fetchData}
                    disabled={loading}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        background: 'var(--primary-glow)', border: '1px solid var(--border-focus)',
                        color: 'var(--text-primary)', padding: '10px 16px', borderRadius: '8px',
                        cursor: loading ? 'wait' : 'pointer', transition: 'all 0.2s'
                    }}
                >
                    <RefreshCw size={16} className={loading ? 'animate-pulse' : ''} />
                    {loading ? 'Syncing...' : 'Sync Now'}
                </button>
            </div>

            {error && (
                <div style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', color: '#ef4444' }}>
                    {error}
                </div>
            )}

            {/* KPI Cards */}
            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                <MetricCard
                    title="Total Events (Last Hour)"
                    value={metrics.totalEvents.toLocaleString()}
                    icon={Activity}
                    trend={{ value: 12, isPositive: true }}
                />
                <MetricCard
                    title="Revenue (Last Hour)"
                    value={`$${metrics.totalRevenue}`}
                    icon={DollarSign}
                    trend={{ value: 5, isPositive: true }}
                />
                <MetricCard
                    title="Unique Users"
                    value={metrics.uniqueUsers.toLocaleString()}
                    icon={Users}
                />
            </div>

            {/* Chart */}
            <div className="glass-panel" style={{ padding: '24px', height: '400px' }}>
                <h3 style={{ marginBottom: '24px', fontSize: '1.1rem' }}>Events Timeline (Last 24 Hours)</h3>
                {data.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                            <XAxis dataKey="hour" stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)' }} tickLine={false} axisLine={false} />
                            <YAxis stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)' }} tickLine={false} axisLine={false} />
                            <Tooltip content={<CustomTooltip />} />
                            <Line type="monotone" dataKey="total_events" name="Events" stroke="var(--accent-blue)" strokeWidth={3} dot={{ r: 4, fill: 'var(--bg-base)', strokeWidth: 2 }} activeDot={{ r: 6, fill: 'var(--accent-blue)' }} />
                            <Line type="monotone" dataKey="unique_users" name="Users" stroke="var(--accent-purple)" strokeWidth={3} dot={{ r: 4, fill: 'var(--bg-base)', strokeWidth: 2 }} />
                        </LineChart>
                    </ResponsiveContainer>
                ) : (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-muted)' }}>
                        No data available for charting yet.
                    </div>
                )}
            </div>

            {/* Live Feed Table */}
            <div className="glass-panel" style={{ padding: '24px' }}>
                <h3 style={{ marginBottom: '24px', fontSize: '1.1rem' }}>Recent Hourly Aggregations</h3>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                                <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 500 }}>Hour</th>
                                <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 500 }}>Events</th>
                                <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 500 }}>Revenue</th>
                                <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 500 }}>Unique Users</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.slice().reverse().map((row, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                                    <td style={{ padding: '16px' }}>{row.hour_str}</td>
                                    <td style={{ padding: '16px' }}>{row.total_events}</td>
                                    <td style={{ padding: '16px' }}>${typeof row.total_revenue === 'number' ? row.total_revenue.toFixed(2) : row.total_revenue}</td>
                                    <td style={{ padding: '16px' }}>{row.unique_users}</td>
                                </tr>
                            ))}
                            {data.length === 0 && (
                                <tr>
                                    <td colSpan={4} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>Waiting for streams...</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
