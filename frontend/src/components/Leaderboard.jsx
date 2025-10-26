import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Trophy, Medal, Award } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Leaderboard = ({ user }) => {
  const [period, setPeriod] = useState('weekly');
  const [leaderboard, setLeaderboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, [period]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/leaderboard/${period}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLeaderboard(response.data);
    } catch (error) {
      toast.error('Failed to fetch leaderboard');
    } finally {
      setLoading(false);
    }
  };

  const getRankBadge = (rank) => {
    if (rank === 0) return <span className="text-2xl">🥇</span>;
    if (rank === 1) return <span className="text-2xl">🥈</span>;
    if (rank === 2) return <span className="text-2xl">🥉</span>;
    return <span className="text-gray-400 font-bold">#{rank + 1}</span>;
  };

  const categories = [
    { key: 'presentations', label: 'Presentations', icon: '📊', color: 'border-purple-500' },
    { key: 'testimonials', label: 'Testimonials', icon: '⭐', color: 'border-yellow-500' },
    { key: 'new_face_sold', label: 'New Face Sold', icon: '🎯', color: 'border-red-500' },
    { key: 'premium', label: 'Total Premium', icon: '💵', color: 'border-green-500' }
  ];

  if (loading) {
    return (
      <Card className="shadow-lg" data-testid="leaderboard-loading">
        <CardContent className="p-8 text-center">Loading leaderboard...</CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg" data-testid="leaderboard-card">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2" data-testid="leaderboard-title">
            <Trophy className="text-yellow-500" />
            Leaderboard
          </CardTitle>
          <div className="flex gap-2">
            {['weekly', 'monthly', 'quarterly', 'yearly'].map(p => (
              <Button
                key={p}
                data-testid={`period-${p}-btn`}
                variant={period === p ? 'default' : 'outline'}
                onClick={() => setPeriod(p)}
                size="sm"
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </Button>
            ))}
          </div>
        </div>
        <p className="text-sm text-gray-600 mt-2" data-testid="leaderboard-subtitle">
          Top 3 performers for {period} period
        </p>
      </CardHeader>
      <CardContent>
        {leaderboard && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {categories.map(category => (
              <div key={category.key} className={`bg-white rounded-lg border-l-4 ${category.color} p-4 shadow-sm`}>
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2" data-testid={`category-${category.key}-title`}>
                  <span className="text-2xl">{category.icon}</span>
                  {category.label}
                </h3>
                <div className="space-y-2">
                  {leaderboard[category.key] && leaderboard[category.key].slice(0, 3).map((entry, index) => (
                    <div
                      key={entry.user_id}
                      data-testid={`leaderboard-${category.key}-rank-${index + 1}`}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        entry.user_id === user.id ? 'bg-blue-100 border-2 border-blue-400' : 'bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 flex justify-center" data-testid={`rank-badge-${category.key}-${index + 1}`}>
                          {getRankBadge(index)}
                        </div>
                        <div>
                          <div className="font-semibold" data-testid={`name-${category.key}-${index + 1}`}>
                            {entry.name}
                            {entry.user_id === user.id && (
                              <span className="ml-2 text-xs bg-blue-600 text-white px-2 py-1 rounded" data-testid={`you-badge-${category.key}`}>
                                (You)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="font-bold text-lg" data-testid={`value-${category.key}-${index + 1}`}>
                        {category.key === 'premium' ? `$${entry[category.key].toFixed(2)}` : entry[category.key]}
                      </div>
                    </div>
                  ))}
                  {(!leaderboard[category.key] || leaderboard[category.key].length === 0) && (
                    <div className="text-center text-gray-500 py-4" data-testid={`no-data-${category.key}`}>No data yet</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default Leaderboard;