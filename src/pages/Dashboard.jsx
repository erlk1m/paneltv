import React, { useEffect, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { database } from '../firebase';
import { Tv, Users, Activity, PlaySquare } from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, color }) => (
  <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
    <div style={{
      backgroundColor: `${color}20`,
      color: color,
      padding: '1rem',
      borderRadius: '12px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <Icon size={32} />
    </div>
    <div>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.25rem' }}>{title}</p>
      <h3 style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>{value}</h3>
    </div>
  </div>
);

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalChannels: 0,
    activeUsers: 0,
    activeStreams: 0,
    vodCount: 0
  });

  useEffect(() => {
    // In a real app, you would fetch these from specific endpoints or query aggregations
    // For now, we'll just count the channels node
    const channelsRef = ref(database, 'channels');
    const unsubscribe = onValue(channelsRef, (snapshot) => {
      const data = snapshot.val();
      const channelCount = data ? Object.keys(data).length : 0;
      
      setStats({
        totalChannels: channelCount,
        activeUsers: Math.floor(Math.random() * 50) + 10, // Mock data
        activeStreams: Math.floor(Math.random() * 20) + 5, // Mock data
        vodCount: 0 // Mock data
      });
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Dashboard Overview</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Welcome to Erlkim IPTV Admin Panel</p>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        <StatCard title="Total Channels" value={stats.totalChannels} icon={Tv} color="#3b82f6" />
        <StatCard title="Active Users" value={stats.activeUsers} icon={Users} color="#10b981" />
        <StatCard title="Active Streams" value={stats.activeStreams} icon={Activity} color="#f59e0b" />
        <StatCard title="VOD Library" value={stats.vodCount} icon={PlaySquare} color="#8b5cf6" />
      </div>

      <div className="card" style={{ minHeight: '300px' }}>
        <h3 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>System Status</h3>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          height: '200px',
          color: 'var(--text-secondary)'
        }}>
          Analytics charts will appear here...
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
