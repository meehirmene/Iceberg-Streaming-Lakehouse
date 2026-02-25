import React, { useEffect, useState } from 'react';
import { trinoClient } from '../lib/trino';
import MetricCard from './MetricCard';
import { Activity, Car, DollarSign, RefreshCw, Navigation } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const Dashboard = () => {
    const [surgeData, setSurgeData] = useState([]);
    const [ridesData, setRidesData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [metrics, setMetrics] = useState({
        demandMatchRate: 0,
        currentSurge: 1.0,
        activeDrivers: 0
    });

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);

            // Query 1: Surge Pricing Multiplier Live Data
            const surgeQuery = `
        SELECT 
          CAST(window_end AS VARCHAR) as time_str,
          demand_count,
          supply_count,
          surge_multiplier
        FROM iceberg.ride_hailing.iceberg_surge_pricing
        ORDER BY window_end DESC
        LIMIT 20
      `;

            const p1 = trinoClient.query(surgeQuery).catch(() => []);

            // Query 2: Active Rides tracked via V2 Upserts
            const ridesQuery = `
        SELECT 
          ride_id,
          driver_id,
          status,
          CAST(updated_at AS VARCHAR) as ts_str
        FROM iceberg.ride_hailing.iceberg_ride_events
        ORDER BY updated_at DESC
        LIMIT 10
      `;

            const p2 = trinoClient.query(ridesQuery).catch(() => []);

            const [surgeResults, ridesResults] = await Promise.all([p1, p2]);

            if (surgeResults.length > 0) {
                const chartData = [...surgeResults].reverse().map(row => ({
                    ...row,
                    time: new Date(row.time_str).toLocaleTimeString([], { minute: '2-digit', second: '2-digit' })
                }));
                setSurgeData(chartData);

                const latest = surgeResults[0];
                const matchRate = latest.demand_count > 0 ? (latest.supply_count / latest.demand_count) * 100 : 100;

                setMetrics({
                    demandMatchRate: Math.min(matchRate, 100).toFixed(1),
                    currentSurge: latest.surge_multiplier.toFixed(2),
                    activeDrivers: latest.supply_count
                });
            }

            setRidesData(ridesResults);

        } catch (err) {
            console.error("Fetch error:", err);
            setError("Waiting for Flink to write data to Iceberg...");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
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
                    <h2 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Surge Pricing Dashboard (V2)</h2>
                    <p style={{ color: 'var(--text-muted)' }}>Real-time 10s sliding window aggregations via Flink</p>
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
                    title="Current Surge Multiplier"
                    value={`${metrics.currentSurge}x`}
                    icon={Activity}
                    trend={{ value: 0.2, isPositive: true }}
                />
                <MetricCard
                    title="Supply Match Rate"
                    value={`${metrics.demandMatchRate}%`}
                    icon={Navigation}
                    trend={{ value: 2.5, isPositive: false }}
                />
                <MetricCard
                    title="Active Drivers (60s Window)"
                    value={metrics.activeDrivers.toLocaleString()}
                    icon={Car}
                />
            </div>

            <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
                {/* Chart */}
                <div className="glass-panel" style={{ padding: '24px', flex: 2, minWidth: '400px', height: '400px' }}>
                    <h3 style={{ marginBottom: '24px', fontSize: '1.1rem' }}>Surge Multiplier & Supply vs Demand</h3>
                    {surgeData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={surgeData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis dataKey="time" stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)' }} tickLine={false} axisLine={false} />
                                <YAxis yAxisId="left" stroke="var(--text-secondary)" tickLine={false} axisLine={false} />
                                <YAxis yAxisId="right" orientation="right" stroke="var(--text-secondary)" tickLine={false} axisLine={false} domain={[1, 3]} />
                                <Tooltip content={<CustomTooltip />} />
                                <Line yAxisId="left" type="monotone" dataKey="demand_count" name="Demand (Riders)" stroke="var(--accent-blue)" strokeWidth={3} dot={false} />
                                <Line yAxisId="left" type="monotone" dataKey="supply_count" name="Supply (Drivers)" stroke="var(--accent-cyan)" strokeWidth={3} dot={false} />
                                <Line yAxisId="right" type="stepAfter" dataKey="surge_multiplier" name="Surge (x)" stroke="var(--accent-purple)" strokeWidth={3} dot={{ r: 4, fill: 'var(--bg-base)' }} />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-muted)' }}>
                            Waiting for Flink sliding windows...
                        </div>
                    )}
                </div>

                {/* Live Ride State Feed (V2 Upserts) */}
                <div className="glass-panel" style={{ padding: '24px', flex: 1, minWidth: '300px' }}>
                    <h3 style={{ marginBottom: '24px', fontSize: '1.1rem' }}>Live Ride State Tracking</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>Powered by Iceberg V2 Row-Level Updates</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {ridesData.map((ride, i) => {
                            const borderCol = ride.status === 'COMPLETED' ? 'var(--accent-green)' : ride.status === 'ACCEPTED' ? 'var(--accent-blue)' : 'var(--text-secondary)';
                            return (
                                <div key={i} style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', borderLeft: `3px solid ${borderCol}` }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <span style={{ fontSize: '0.85rem', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>ID: {ride.ride_id.substring(0, 8)}</span>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(ride.ts_str).toLocaleTimeString()}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
                                        {ride.status}
                                    </div>
                                    {ride.driver_id && <div style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)', marginTop: '4px' }}>Driver: {ride.driver_id.substring(0, 8)}</div>}
                                </div>
                            );
                        })}
                        {ridesData.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>No active rides found.</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
