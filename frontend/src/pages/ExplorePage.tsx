import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Globe, BookOpen, Eye, Star, Loader2, Search } from 'lucide-react';
import { useState } from 'react';
import { docsApi } from '../lib/api';

export default function ExplorePage() {
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['public-docs'],
    queryFn: () => docsApi.listPublic().then((r) => r.data),
  });

  const docs = (data?.docs || []).filter(
    (d: any) =>
      !search ||
      d.title.toLowerCase().includes(search.toLowerCase()) ||
      d.repository?.githubName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Globe className="w-5 h-5 text-violet-400" />
          <h1 className="text-2xl font-bold text-white">Explore</h1>
        </div>
        <p className="text-gray-400 text-sm">Discover living documentation shared by the community</p>
      </div>

      <div className="relative max-w-md mb-8">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input pl-9"
          placeholder="Search public documentation…"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
        </div>
      ) : docs.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Globe className="w-12 h-12 mx-auto mb-4 text-gray-700" />
          <p>No public documentation yet. Be the first to share!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {docs.map((doc: any) => {
            const repo = doc.repository;
            const owner = doc.owner;
            return (
              <Link
                key={doc._id}
                to={`/docs/${doc._id}`}
                className="card hover:border-violet-700/50 transition-all group block"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-8 h-8 rounded-full bg-violet-600/20 flex items-center justify-center flex-shrink-0">
                    {owner?.avatarUrl ? (
                      <img src={owner.avatarUrl} alt={owner.username} className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <BookOpen className="w-4 h-4 text-violet-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white group-hover:text-violet-300 transition-colors truncate">
                      {doc.title}
                    </p>
                    <p className="text-xs text-gray-500">
                      by {owner?.username || 'Unknown'}
                    </p>
                  </div>
                </div>

                {repo && (
                  <p className="text-xs text-gray-600 mb-3">
                    📦 {repo.githubOwner}/{repo.githubName}
                    {repo.language && ` · ${repo.language}`}
                  </p>
                )}

                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    {doc.views || 0}
                  </span>
                  <span>{doc.sections?.length || 0} sections</span>
                  {repo?.stars > 0 && (
                    <span className="flex items-center gap-1">
                      <Star className="w-3 h-3" />
                      {repo.stars}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
