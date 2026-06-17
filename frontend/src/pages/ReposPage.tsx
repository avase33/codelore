import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  GitBranch,
  Plus,
  Search,
  RefreshCw,
  Trash2,
  Star,
  Lock,
  Globe,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { reposApi } from '../lib/api';
import { formatDistanceToNow } from 'date-fns';

function StatusIcon({ status }: { status: string }) {
  if (status === 'ready') return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
  if (status === 'analyzing') return <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />;
  if (status === 'error') return <AlertCircle className="w-4 h-4 text-red-400" />;
  return <Clock className="w-4 h-4 text-gray-500" />;
}

function ConnectModal({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['github-repos', page],
    queryFn: () => reposApi.listGitHub(page).then((r) => r.data),
  });

  const connectMutation = useMutation({
    mutationFn: (repo: { githubOwner: string; githubName: string }) => reposApi.connect(repo),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['repos'] });
      qc.invalidateQueries({ queryKey: ['github-repos'] });
      toast.success('Repository connected! Analysis in progress…');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to connect repository');
    },
  });

  const filtered = (data?.repos || []).filter(
    (r: any) => !query || r.fullName.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-white">Connect a Repository</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="input pl-9"
              placeholder="Search repositories…"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 text-violet-400 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              {data ? 'No repositories found' : 'Connect GitHub to see your repos'}
            </div>
          ) : (
            filtered.map((repo: any) => (
              <div
                key={repo.id}
                className="flex items-center justify-between bg-gray-800/60 hover:bg-gray-800 rounded-lg p-3 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {repo.isPrivate ? (
                      <Lock className="w-3 h-3 text-gray-500 flex-shrink-0" />
                    ) : (
                      <Globe className="w-3 h-3 text-gray-500 flex-shrink-0" />
                    )}
                    <p className="text-sm font-medium text-gray-200 truncate">{repo.fullName}</p>
                  </div>
                  {repo.description && (
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{repo.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1">
                    {repo.language && <span className="text-xs text-gray-500">{repo.language}</span>}
                    <span className="flex items-center gap-0.5 text-xs text-gray-500">
                      <Star className="w-3 h-3" />
                      {repo.stars}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() =>
                    connectMutation.mutate({
                      githubOwner: repo.fullName.split('/')[0],
                      githubName: repo.name,
                    })
                  }
                  disabled={repo.connected || connectMutation.isPending}
                  className={`ml-3 flex-shrink-0 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    repo.connected
                      ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                      : 'btn-primary px-3 py-1.5 text-xs'
                  }`}
                >
                  {repo.connected ? 'Connected' : 'Connect'}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default function ReposPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['repos'],
    queryFn: () => reposApi.list().then((r) => r.data),
  });

  const reanalyzeMutation = useMutation({
    mutationFn: (id: string) => reposApi.reanalyze(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['repos'] });
      toast.success('Re-analysis started');
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Failed to start analysis'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => reposApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['repos'] });
      toast.success('Repository disconnected');
    },
  });

  const repos = data?.repos || [];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Repositories</h1>
          <p className="text-gray-400 text-sm mt-1">Connect GitHub repos to generate living documentation</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus className="w-4 h-4" />
          Connect Repo
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
        </div>
      ) : repos.length === 0 ? (
        <div className="card text-center py-16">
          <GitBranch className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-200 mb-2">No repositories connected</h2>
          <p className="text-gray-500 text-sm mb-6">Connect your first GitHub repository to get started</p>
          <button onClick={() => setShowModal(true)} className="btn-primary mx-auto">
            <Plus className="w-4 h-4" />
            Connect Repository
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {repos.map((repo: any) => (
            <div
              key={repo._id}
              className="card hover:border-gray-700 transition-all flex items-center gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <StatusIcon status={repo.status} />
                  <Link
                    to={`/repos/${repo._id}`}
                    className="text-sm font-semibold text-white hover:text-violet-300 transition-colors"
                  >
                    {repo.githubOwner}/{repo.githubName}
                  </Link>
                  {repo.isPrivate && (
                    <span className="badge-gray">
                      <Lock className="w-3 h-3" /> Private
                    </span>
                  )}
                </div>
                {repo.description && (
                  <p className="text-xs text-gray-500 truncate">{repo.description}</p>
                )}
                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                  {repo.language && (
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-violet-500" />
                      {repo.language}
                    </span>
                  )}
                  <span className="text-xs text-gray-500">
                    {repo.totalFiles || 0} files
                  </span>
                  <span className="text-xs text-gray-500">
                    Updated {formatDistanceToNow(new Date(repo.updatedAt), { addSuffix: true })}
                  </span>
                  {repo.status === 'error' && repo.errorMessage && (
                    <span className="text-xs text-red-400 truncate max-w-xs">{repo.errorMessage}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {repo.status === 'ready' && (
                  <Link to={`/docs/${repo._id}`} className="btn-secondary text-xs px-3 py-1.5">
                    <BookOpen className="w-3.5 h-3.5" />
                    View Docs
                  </Link>
                )}
                <button
                  onClick={() => reanalyzeMutation.mutate(repo._id)}
                  disabled={repo.status === 'analyzing'}
                  title="Re-analyze"
                  className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors disabled:opacity-40"
                >
                  <RefreshCw className={`w-4 h-4 ${repo.status === 'analyzing' ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Disconnect ${repo.githubOwner}/${repo.githubName}?`)) {
                      deleteMutation.mutate(repo._id);
                    }
                  }}
                  title="Disconnect"
                  className="p-2 rounded-lg bg-gray-800 hover:bg-red-900/40 text-gray-400 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && <ConnectModal onClose={() => setShowModal(false)} />}
    </div>
  );
}

// Small icon component referenced in repo card
function BookOpen({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}
