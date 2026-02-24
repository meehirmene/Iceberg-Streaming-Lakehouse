import React, { useEffect, useState } from 'react';
import { trinoClient } from '../lib/trino';
import { RefreshCw } from 'lucide-react';

const RawStreams = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);
            // Query recent raw events
            const query = `
        SELECT 
          event_id,
          user_id,
          url,
          revenue,
          CAST(event_time AS VARCHAR) as event_time_str
        FROM iceberg.default_db.events_iceberg
        ORDER BY event_time DESC
        LIMIT 50
      `;

            const results = await trinoClient.query(query);
            setData(results);
        } catch (err) {
            console.error("Failed to fetch raw streams:", err);
            setError("Waiting for raw data from Trino...");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 10000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Raw Streaming Events</h2>
                    <p style={{ color: 'var(--text-muted)' }}>Latest 50 events ingested into the Iceberg Lakehouse</p>
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

            <div className="glass-panel" style={{ padding: '24px' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                                <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 500 }}>Time</th>
                                <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 500 }}>Event ID</th>
                                <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 500 }}>User ID</th>
                                <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 500 }}>URL</th>
                                <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 500 }}>Revenue</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((row, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                                    <td style={{ padding: '16px', whiteSpace: 'nowrap' }}>{row.event_time_str}</td>
                                    <td style={{ padding: '16px', fontFamily: 'monospace', fontSize: '14px', color: 'var(--accent-purple)' }}>{row.event_id}</td>
                                    <td style={{ padding: '16px', fontFamily: 'monospace', fontSize: '14px', color: 'var(--accent-blue)' }}>{row.user_id}</td>
                                    <td style={{ padding: '16px', color: 'var(--text-muted)' }}>{row.url}</td>
                                    <td style={{ padding: '16px', fontWeight: 'bold' }}>${typeof row.revenue === 'number' ? row.revenue.toFixed(2) : row.revenue}</td>
                                </tr>
                            ))}
                            {data.length === 0 && (
                                <tr>
                                    <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>Waiting for streams...</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default RawStreams;
