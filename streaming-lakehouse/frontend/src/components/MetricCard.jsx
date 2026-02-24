import React from 'react';

const MetricCard = ({ title, value, icon: Icon, trend }) => {
    return (
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 className="metric-label">{title}</h3>
                {Icon && (
                    <div style={{ padding: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                        <Icon size={20} color="var(--accent-blue)" />
                    </div>
                )}
            </div>

            <div>
                <div className="metric-value">{value}</div>
                {trend && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.875rem', color: trend.isPositive ? 'var(--accent-green)' : 'var(--accent-purple)' }}>
                        <span>{trend.isPositive ? '↑' : '↓'}</span>
                        <span>{Math.abs(trend.value)}% from last hour</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MetricCard;
