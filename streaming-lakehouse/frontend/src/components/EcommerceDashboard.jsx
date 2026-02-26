import React, { useEffect, useState } from 'react';
import { trinoClient } from '../lib/trino';
import MetricCard from './MetricCard';
import { ShoppingCart, LogOut, TrendingDown, RefreshCw, Activity } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const EcommerceDashboard = () => {
    const [metricsData, setMetricsData] = useState([]);
    const [recentEvents, setRecentEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [kpis, setKpis] = useState({
        totalAdds: 0,
        totalCheckouts: 0,
        abandonmentRate: 0,
        recentRevenue: 0
    });

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);

            // Query 1: Live Cart Metrics (Sliding Window)
            const metricsQuery = `
        SELECT 
          CAST(window_end AS VARCHAR) as time_str,
          total_adds,
          total_checkouts,
          abandonment_rate,
          recent_revenue
        FROM iceberg.ecommerce.live_cart_metrics
        ORDER BY window_end DESC
        LIMIT 20
      `;

            const p1 = trinoClient.query(metricsQuery).catch(() => []);

            // Query 2: Recent Raw Events Flow
            const eventsQuery = `
        SELECT 
          event_id,
          user_id,
          product_id,
          event_type,
          price,
          CAST(event_time AS VARCHAR) as ts_str
        FROM iceberg.ecommerce.recent_events
        ORDER BY event_time DESC
        LIMIT 10
      `;

            const p2 = trinoClient.query(eventsQuery).catch(() => []);

            const [metricsResults, eventsResults] = await Promise.all([p1, p2]);

            if (metricsResults.length > 0) {
                const chartData = [...metricsResults].reverse().map(row => ({
                    ...row,
                    abandonment_rate_pct: (row.abandonment_rate * 100).toFixed(1),
                    time: new Date(row.time_str).toLocaleTimeString([], { minute: '2-digit', second: '2-digit' })
                }));
                setMetricsData(chartData);

                const latest = metricsResults[0];
                setKpis({
                    totalAdds: latest.total_adds || 0,
                    totalCheckouts: latest.total_checkouts || 0,
                    abandonmentRate: latest.abandonment_rate ? (latest.abandonment_rate * 100).toFixed(1) : 0,
                    recentRevenue: latest.recent_revenue ? latest.recent_revenue.toFixed(2) : 0
                });
            }

            setRecentEvents(eventsResults);

        } catch (err) {
            console.error("Fetch error:", err);
            setError("Waiting for Flink to write ecommerce data to Iceberg...");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 10000); // 10s sliding window update
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
                    <h2 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Live Ecommerce Funnel</h2>
                    <p style={{ color: 'var(--text-muted)' }}>Tracking cart abandonments in real-time (60s sliding window)</p>
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
                    title="Cart Abandonment Rate"
                    value={`${kpis.abandonmentRate}%`}
                    icon={TrendingDown}
                    trend={{ value: 1.2, isPositive: kpis.abandonmentRate < 50 }}
                />
                <MetricCard
                    title="Active Carts (Adds)"
                    value={kpis.totalAdds.toLocaleString()}
                    icon={ShoppingCart}
                />
                <MetricCard
                    title="Recent Checkouts"
                    value={kpis.totalCheckouts.toLocaleString()}
                    icon={LogOut}
                />
                <MetricCard
                    title="60s Revenue"
                    value={`$${kpis.recentRevenue}`}
                    icon={Activity}
                    trend={{ value: 5.4, isPositive: true }}
                />
            </div>

            <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
                {/* Chart */}
                <div className="glass-panel" style={{ padding: '24px', flex: 2, minWidth: '400px', height: '400px' }}>
                    <h3 style={{ marginBottom: '24px', fontSize: '1.1rem' }}>Cart Adds vs Checkouts</h3>
                    {metricsData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={metricsData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis dataKey="time" stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)' }} tickLine={false} axisLine={false} />
                                <YAxis stroke="var(--text-secondary)" tickLine={false} axisLine={false} />
                                <Tooltip content={<CustomTooltip />} />
                                <Line type="monotone" dataKey="total_adds" name="Added to Cart" stroke="var(--accent-blue)" strokeWidth={3} dot={false} />
                                <Line type="monotone" dataKey="total_checkouts" name="Checked Out" stroke="var(--accent-green)" strokeWidth={3} dot={false} />
                                <Line type="stepAfter" dataKey="abandonment_rate_pct" name="Abandonment (%)" stroke="var(--accent-purple)" strokeWidth={2} dot={{ r: 3, fill: 'var(--bg-base)' }} />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-muted)' }}>
                            Waiting for Flink sliding windows...
                        </div>
                    )}
                </div>

                {/* Live Event Feed */}
                <div className="glass-panel" style={{ padding: '24px', flex: 1, minWidth: '300px' }}>
                    <h3 style={{ marginBottom: '24px', fontSize: '1.1rem' }}>Live Event Stream</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>Streaming from iceberg.ecommerce.recent_events</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {recentEvents.map((event, i) => {
                            const isCheckout = event.event_type === 'checkout';
                            const borderCol = isCheckout ? 'var(--accent-green)' : 'var(--accent-blue)';
                            return (
                                <div key={i} style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', borderLeft: `3px solid ${borderCol}` }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <span style={{ fontSize: '0.85rem', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>User: {event.user_id}</span>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(event.ts_str).toLocaleTimeString()}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 'bold' }}>
                                        <span style={{ color: isCheckout ? 'var(--accent-green)' : 'var(--text-primary)' }}>
                                            {isCheckout ? 'Checked Out' : 'Added to Cart'}
                                        </span>
                                        <span style={{ fontSize: '0.9rem' }}>${event.price.toFixed(2)}</span>
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>Item: {event.product_id}</div>
                                </div>
                            );
                        })}
                        {recentEvents.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>No recent events.</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EcommerceDashboard;
