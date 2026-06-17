import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { BookOpen, Eye, Globe, Lock, Loader2, Search, Filter } from 'lucide-react';
import { useState } from 'react';
import { docsApi } from '../lib/api';
import { formatDistanceToNow } from 'date-fns';

function DocCard({ doc }: { doc: any }) {
  const repo = doc.repository;
  return (
    <Link
      to={`/docs/${doc._id}`}
      className="card hover:border-violet-700/50 transition-all group block"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-white group-hover:text-violet-300 transition-colors truncate">
            {doc.title}
          </h3>
          {repo && (
            <p className="text-xs text-gray-500 mt-0.5">
              {repo.githubOwner}/{repo.githubName}
            </p>
          )}
        </div>
        <div className="ml-3 flex items-center gap-1 flex-shrink-0">
          {doc.isPublic ? (
            <Globe className="w-3.5 h-3.5 text-emerald-400" title="Public" />
          ) : (
            <Lock className="w-3.5 h-3.5 text-gray-500" title="Private" />
          )}
        </div>
      </div>

      {doc.description && (
        <p className="text-xs text-gray-500 mb-3 line-clamp-2">{doc.description}</p>
      )}

      <div className="flex items-center gap-3 text-xs text-gray-500">
        <span>{doc.sections?.length || 0} sections</span>
        <span className="flex items-center gap-1">
          <Eye className="w-3 h-3" />
          {doc.views || 0}
        </span>
        <span className="ml-auto">
          {doc.lastGeneratedAt
            ? formatDistanceToNow(new Date(doc.lastGeneratedAt), { addSuffix: true })
            : 'Draft'}
        </span>
      </div>

      <div className="mt-3 pt-3 border-t border-gray-800 flex items-center gap-2">
        <StatusPill status={doc.status} />
        {repo?.language && (
          <span className="text-xs text-gray-600 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
            {repo.language}
          </span>
        )}
      </div>
    </Link>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    published: 'badge-green',
    generating: 'badge-yellow',
    draft: 'badge-gray',
    error: 'badge-red',
    outdated: 'badge-yellow',
  };
  return <span className={`badge ${map[status] || 'badge-gray'}`}>{status}</span>;
}

export default function DocsPage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const { data, isLoading } = useQuery({
    queryKey: ['docs'],
    queryFn: () => docsApi.list().then((r) => r.data),
    refetchInterval: 10000, // refresh every 10s for generating status
  });

  const docs = (data?.docs || []).filter((d: any) => {
    const matchesSearch =
      !search ||
      d.title.toLowerCase().includes(search.toLowerCase()) ||
      d.repository?.githubName?.toLowerCase().includes(search.toLowerCase());
    const matchesFilter =
      filter === 'all' ||
      (filter === 'published' && d.status === 'published') ||
      (filter === 'public' && d.isPublic) ||
      (filter === 'generating' && d.status === 'generating');
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Documentation</h1>
        <p className="text-gray-400 text-sm mt-1">
          AI-generated living documentation for your connected repositories
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9"
            placeholder="Search docs…"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          {['all', 'published', 'public', 'generating'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === f
                  ? 'bg-violet-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
        </div>
      ) : docs.length === 0 ? (
        <div className="card text-center py-16">
          <BookOpen className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-200 mb-2">No documentation yet</h2>
          <p className="text-gray-500 text-sm mb-4">
            Connect a repository to automatically generate documentation
          </p>
          <Link to="/repos" className="btn-primary mx-auto">
            Connect a Repository
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {docs.map((doc: any) => (
            <DocCard key={doc._id} doc={doc} />
          ))}
        </div>
      )}
    </div>
  );
}
