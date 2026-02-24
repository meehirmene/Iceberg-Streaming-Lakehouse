import React from 'react';

const Settings = () => {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <div>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Settings</h2>
                <p style={{ color: 'var(--text-muted)' }}>Configuration for the Streaming Lakehouse Dashboard</p>
            </div>

            <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <h3 style={{ fontSize: '1.1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>Connection Details</h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                        <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '8px' }}>Trino Endpoint Proxy</label>
                        <input
                            type="text"
                            value="/api/trino/v1/statement"
                            disabled
                            style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'var(--text-muted)' }}
                        />
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>Proxied to http://localhost:8080</span>
                    </div>
                    <div>
                        <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '8px' }}>Trino User</label>
                        <input
                            type="text"
                            value="admin"
                            disabled
                            style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'var(--text-muted)' }}
                        />
                    </div>
                </div>

                <h3 style={{ fontSize: '1.1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px', marginTop: '16px' }}>Application Preferences</h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                    <div>
                        <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '8px' }}>Data Refresh Rate</label>
                        <select
                            disabled
                            style={{ padding: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'var(--text-muted)', width: '200px' }}
                        >
                            <option>10 Seconds (Default)</option>
                        </select>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Settings;
