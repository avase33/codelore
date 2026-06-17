import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import {
  GitBranch,
  BookOpen,
  Zap,
  TrendingUp,
  Plus,
  Clock,
  CheckCircle2,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { useAuthStore } from '../store/auth';
import { reposApi, docsApi } from '../lib/api';
import { formatDistanceToNow } from 'date-fns';

// Mock activity data — replace with real analytics endpoint
const activityData = Array.from({ length: 14 }, (_, i) => ({
  day: `Jun ${i + 4}`,
  docs: Math.floor(Math.random() * 20 + 5),
  repos: Math.floor(Math.random() * 8 + 1),
}));

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color = 'violet',
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  sub?: string;
  color?: string;
}) {
  const colors: Record<string, string> = {
    violet: 'bg-violet-600/20 text-violet-400',
    emerald: 'bg-emerald-600/20 text-emerald-400',
    blue: 'bg-blue-600/20 text-blue-400',
    amber: 'bg-amber-600/20 text-amber-400',
  };

  return (
    <div className="card hover:border-gray-700 transition-colors">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">{label}</p>
          <p className="text-3xl font-bold text-white mt-1">{value}</p>
          {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors[color] || colors.violet}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; icon: React.ElementType; label: string }> = {
    ready: { cls: 'badge-green', icon: CheckCircle2, label: 'Ready' },
    analyzing: { cls: 'badge-yellow', icon: Loader2, label: 'Analyzing' },
    pending: { cls: 'badge-gray', icon: Clock, label: 'Pending' },
    error: { cls: 'badge-red', icon: AlertCircle, label: 'Error' },
  };
  const { cls, icon: Icon, label } = map[status] || map.pending;
  return (
    <span className={`badge ${cls} gap-1`}>
      <Icon className={`w-3 h-3 ${status === 'analyzing' ? 'animate-spin' : ''}`} />
      {label}
    </span>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();

  const { data: reposData } = useQuery({
    queryKey: ['repos'],
    queryFn: () => reposApi.list().then((r) => r.data),
  });

  const { data: docsData } = useQuery({
    queryKey: ['docs'],
    queryFn: () => docsApi.list().then((r) => r.data),
  });

  const repos = reposData?.repos || [];
  const docs = docsData?.docs || [];
  const readyRepos = repos.filter((r: any) => r.status === 'ready').length;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'},{' '}
          {user?.fullName?.split(' ')[0] || user?.username} 👋
        </h1>
        <p className="text-gray-400 mt-1 text-sm">Here's what's happening with your documentation.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={GitBranch} label="Repositories" value={repos.length} sub={`${readyRepos} analyzed`} color="violet" />
        <StatCard icon={BookOpen} label="Docs Pages" value={docs.length} sub="generated" color="emerald" />
        <StatCard icon={Zap} label="AI Tokens Used" value={user?.docsGenerated || 0} sub="total generations" color="blue" />
        <StatCard icon={TrendingUp} label="Public Docs" value={docs.filter((d: any) => d.isPublic).length} sub="shared" color="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity chart */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-semibold text-white">Documentation Activity</h2>
              <p className="text-xs text-gray-500 mt-0.5">Last 14 days</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={activityData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="docsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#1a1a24', border: '1px solid #3a3a55', borderRadius: 8 }}
                labelStyle={{ color: '#d1d5db', fontSize: 12 }}
                itemStyle={{ color: '#a78bfa', fontSize: 12 }}
              />
              <Area type="monotone" dataKey="docs" stroke="#7c3aed" strokeWidth={2} fill="url(#docsGrad)" name="Docs generated" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Recent repos */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">Recent Repositories</h2>
            <Link to="/repos" className="text-xs text-violet-400 hover:text-violet-300">View all</Link>
          </div>

          {repos.length === 0 ? (
            <div className="text-center py-6">
              <GitBranch className="w-8 h-8 text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No repos connected</p>
              <Link to="/repos" className="mt-3 btn-primary text-xs px-3 py-1.5 inline-flex">
                <Plus className="w-3 h-3" />
                Connect repo
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {repos.slice(0, 5).map((repo: any) => (
                <Link
                  key={repo._id}
                  to={`/repos/${repo._id}`}
                  className="flex items-center justify-between group hover:bg-gray-800 rounded-lg p-2 -mx-2 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-200 group-hover:text-white truncate">
                      {repo.githubOwner}/{repo.githubName}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {formatDistanceToNow(new Date(repo.updatedAt), { addSuffix: true })}
                    </p>
                  </div>
                  <StatusBadge status={repo.status} />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent docs */}
      {docs.length > 0 && (
        <div className="mt-6 card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">Recent Documentation</h2>
            <Link to="/docs" className="text-xs text-violet-400 hover:text-violet-300">View all</Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {docs.slice(0, 6).map((doc: any) => (
              <Link
                key={doc._id}
                to={`/docs/${doc._id}`}
                className="bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50 hover:border-gray-600 rounded-lg p-3 transition-all"
              >
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen className="w-4 h-4 text-violet-400 flex-shrink-0" />
                  <span className="text-sm font-medium text-gray-200 truncate">{doc.title}</span>
                </div>
                <p className="text-xs text-gray-500">
                  {doc.sections?.length || 0} sections · {doc.views || 0} views
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
