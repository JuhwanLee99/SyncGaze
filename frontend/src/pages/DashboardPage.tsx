// src/pages/DashboardPage.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './DashboardPage.css';

interface TrainingSession {
  id: string;
  date: string;
  duration: number;
  accuracy: number;
  targetsHit: number;
  totalTargets: number;
  avgReactionTime: number;
}

const DashboardPage = () => {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState('');
  const [sessions, setSessions] = useState<TrainingSession[]>([]);

  useEffect(() => {
    // Check if user is authenticated
    const isAuth = localStorage.getItem('isAuthenticated');
    if (!isAuth) {
      navigate('/auth');
      return;
    }

    const email = localStorage.getItem('userEmail') || 'user@example.com';
    setUserEmail(email);

    // Load training sessions from localStorage or API
    // For now, using mock data
    const mockSessions: TrainingSession[] = [
      {
        id: '1',
        date: '2025-11-14',
        duration: 60,
        accuracy: 85.5,
        targetsHit: 42,
        totalTargets: 49,
        avgReactionTime: 245
      },
      {
        id: '2',
        date: '2025-11-13',
        duration: 60,
        accuracy: 78.2,
        targetsHit: 38,
        totalTargets: 48,
        avgReactionTime: 268
      },
      {
        id: '3',
        date: '2025-11-12',
        duration: 60,
        accuracy: 82.1,
        targetsHit: 40,
        totalTargets: 47,
        avgReactionTime: 252
      }
    ];

    setSessions(mockSessions);
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('userEmail');
    navigate('/');
  };

  const handleStartTraining = () => {
    navigate('/calibration');
  };

  const handleViewResults = (sessionId: string) => {
    navigate(`/results?session=${sessionId}`);
  };

  const calculateStats = () => {
    if (sessions.length === 0) {
      return {
        totalSessions: 0,
        avgAccuracy: 0,
        bestAccuracy: 0,
        avgReactionTime: 0
      };
    }

    const totalSessions = sessions.length;
    const avgAccuracy = sessions.reduce((sum, s) => sum + s.accuracy, 0) / totalSessions;
    const bestAccuracy = Math.max(...sessions.map(s => s.accuracy));
    const avgReactionTime = sessions.reduce((sum, s) => sum + s.avgReactionTime, 0) / totalSessions;

    return {
      totalSessions,
      avgAccuracy: avgAccuracy.toFixed(1),
      bestAccuracy: bestAccuracy.toFixed(1),
      avgReactionTime: avgReactionTime.toFixed(0)
    };
  };

  const stats = calculateStats();

  return (
    <div className="dashboard-page">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-content">
          <h1 className="dashboard-logo">AimTracker</h1>
          <div className="header-actions">
            <span className="user-email">{userEmail}</span>
            <button className="logout-button" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="dashboard-main">
        {/* Welcome Section */}
        <section className="welcome-section">
          <h2>Welcome back!</h2>
          <p>Track your progress and start a new training session</p>
        </section>

        {/* Quick Stats */}
        <section className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-info">
              <h3>{stats.totalSessions}</h3>
              <p>Total Sessions</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">🎯</div>
            <div className="stat-info">
              <h3>{stats.avgAccuracy}%</h3>
              <p>Avg Accuracy</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">⚡</div>
            <div className="stat-info">
              <h3>{stats.avgReactionTime}ms</h3>
              <p>Avg Reaction Time</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">🏆</div>
            <div className="stat-info">
              <h3>{stats.bestAccuracy}%</h3>
              <p>Best Accuracy</p>
            </div>
          </div>
        </section>

        {/* Action Buttons */}
        <section className="action-section">
          <button className="start-training-button" onClick={handleStartTraining}>
            <span className="button-icon">🎮</span>
            Start New Training Session
          </button>
        </section>

        {/* Recent Sessions */}
        <section className="recent-sessions">
          <h2>Recent Training Sessions</h2>
          
          {sessions.length === 0 ? (
            <div className="no-sessions">
              <p>No training sessions yet. Start your first session to see results!</p>
            </div>
          ) : (
            <div className="sessions-table">
              <div className="table-header">
                <div className="table-cell">Date</div>
                <div className="table-cell">Duration</div>
                <div className="table-cell">Accuracy</div>
                <div className="table-cell">Targets Hit</div>
                <div className="table-cell">Avg Reaction</div>
                <div className="table-cell">Actions</div>
              </div>
              
              {sessions.map(session => (
                <div key={session.id} className="table-row">
                  <div className="table-cell">
                    {new Date(session.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </div>
                  <div className="table-cell">{session.duration}s</div>
                  <div className="table-cell">
                    <span className="accuracy-badge">{session.accuracy.toFixed(1)}%</span>
                  </div>
                  <div className="table-cell">
                    {session.targetsHit}/{session.totalTargets}
                  </div>
                  <div className="table-cell">{session.avgReactionTime}ms</div>
                  <div className="table-cell">
                    <button
                      className="view-button"
                      onClick={() => handleViewResults(session.id)}
                    >
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default DashboardPage;
