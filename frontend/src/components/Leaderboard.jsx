import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Trophy } from 'lucide-react';

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
    return <span className="text-gray-600 font-bold text-lg">#{rank + 1}</span>;
  };

  const categories = [
    { key: 'presentations', label: 'Presentations', icon: '📊', color: 'border-purple-500' },
    { key: 'referrals', label: 'Referrals', icon: '🤝', color: 'border-blue-500' },
    { key: 'testimonials', label: 'Testimonials', icon: '⭐', color: 'border-yellow-500' },
    { key: 'new_face_sold', label: 'New Face Sold', icon: '🎯', color: 'border-red-500' },
    { key: 'premium', label: 'Total Premium', icon: '💵', color: 'border-green-500' }
  ];

  return (
    <Card className="shadow-lg bg-white" data-testid="leaderboard-card">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-xl" data-testid="leaderboard-title">
          <Trophy className="text-yellow-500" size={24} />
          Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2 space-y-4">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <p className="text-sm text-gray-600" data-testid="leaderboard-subtitle">
            Top 5 performers for {period} period
          </p>
          <div className="flex flex-wrap gap-2">
            {['weekly', 'monthly', 'quarterly', 'yearly'].map(p => (
              <Button
                key={p}
                data-testid={`period-${p}-btn`}
                variant={period === p ? 'default' : 'outline'}
                onClick={() => setPeriod(p)}
                size="sm"
                className="text-xs"
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </Button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading leaderboard...</div>
        ) : leaderboard && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {categories.map(category => (
              <div key={category.key} className={`bg-gradient-to-br from-white to-gray-50 rounded-lg border-l-4 ${category.color} p-5 shadow-sm`}>
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2" data-testid={`category-${category.key}-title`}>
                  <span className="text-2xl">{category.icon}</span>
                  {category.label}
                </h3>
                <div className="space-y-3">
                  {leaderboard[category.key] && leaderboard[category.key].slice(0, 5).map((entry, index) => (
                    <div
                      key={entry.user_id}
                      data-testid={`leaderboard-${category.key}-rank-${index + 1}`}
                      className={`flex items-center justify-between p-3 rounded-lg transition-all ${ 
                        entry.user_id === user.id ? 'bg-blue-100 border-2 border-blue-400 shadow-md' : 'bg-white shadow-sm'
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 flex justify-center shrink-0" data-testid={`rank-badge-${category.key}-${index + 1}`}>
                          {getRankBadge(index)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold truncate" data-testid={`name-${category.key}-${index + 1}`}>
                            {entry.name}
                            {entry.user_id === user.id && (
                              <span className="ml-2 text-xs bg-blue-600 text-white px-2 py-0.5 rounded" data-testid={`you-badge-${category.key}`}>
                                (You)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="font-bold text-lg shrink-0 ml-2" data-testid={`value-${category.key}-${index + 1}`}>
                        {category.key === 'premium' ? `$${entry[category.key].toFixed(2)}` : entry[category.key]}
                      </div>
                    </div>
                  ))}
                  {(!leaderboard[category.key] || leaderboard[category.key].length === 0) && (
                    <div className="text-center text-gray-500 py-6 bg-gray-50 rounded-lg" data-testid={`no-data-${category.key}`}>
                      No data yet
                    </div>
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
