import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  BookOpen,
  Loader2,
  RefreshCw,
  Globe,
  Lock,
  Edit3,
  Check,
  X,
  ChevronRight,
  GitBranch,
  Star,
  Eye,
} from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { docsApi } from '../lib/api';

const SECTION_ICONS: Record<string, string> = {
  architecture: '🏗️',
  setup: '🚀',
  api_reference: '📡',
  decision_log: '🧭',
  glossary: '📖',
  overview: '📋',
  contributing: '🤝',
  changelog: '📝',
  custom: '📄',
};

export default function DocViewPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['doc', id],
    queryFn: () => docsApi.get(id!).then((r) => r.data),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (payload: any) => docsApi.update(id!, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['doc', id] });
      toast.success('Saved');
      setEditingSection(null);
    },
    onError: () => toast.error('Failed to save'),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
      </div>
    );
  }

  if (!data?.doc) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <BookOpen className="w-12 h-12 text-gray-600" />
        <p className="text-gray-400">Documentation not found</p>
        <button onClick={() => navigate(-1)} className="btn-secondary">
          Go back
        </button>
      </div>
    );
  }

  const { doc } = data;
  const sections = doc.sections || [];
  const currentSection = sections.find((s: any) => s.id === (activeSection || sections[0]?.id));

  const startEdit = (s: any) => {
    setEditContent(s.content || '');
    setEditingSection(s.id);
  };

  const saveEdit = () => {
    updateMutation.mutate({ section: { id: editingSection, content: editContent } });
  };

  const togglePublic = () => {
    updateMutation.mutate({ isPublic: !doc.isPublic });
    toast.success(doc.isPublic ? 'Made private' : 'Made public');
  };

  return (
    <div className="flex h-full">
      {/* Left sidebar — section nav */}
      <aside className="w-56 flex-shrink-0 bg-gray-900/50 border-r border-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-800">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Sections</h2>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {sections.map((s: any) => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors ${
                (activeSection || sections[0]?.id) === s.id
                  ? 'bg-violet-600/20 text-violet-300 border border-violet-600/30'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
              }`}
            >
              <span>{SECTION_ICONS[s.type] || '📄'}</span>
              <span className="truncate">{s.title}</span>
              {s.userEdited && (
                <span className="ml-auto text-violet-500 flex-shrink-0" title="Manually edited">
                  ✎
                </span>
              )}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        {/* Doc header */}
        <div className="sticky top-0 z-10 bg-gray-950/95 backdrop-blur border-b border-gray-800 px-6 py-3 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold text-white truncate">{doc.title}</h1>
              <ChevronRight className="w-3 h-3 text-gray-600 flex-shrink-0" />
              <span className="text-sm text-gray-400 truncate">{currentSection?.title}</span>
            </div>
            {doc.repository && (
              <div className="flex items-center gap-3 mt-0.5">
                <span className="text-xs text-gray-600 flex items-center gap-1">
                  <GitBranch className="w-3 h-3" />
                  {doc.repository.githubOwner}/{doc.repository.githubName}
                </span>
                <span className="text-xs text-gray-600 flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  {doc.views} views
                </span>
                {doc.repository.stars > 0 && (
                  <span className="text-xs text-gray-600 flex items-center gap-1">
                    <Star className="w-3 h-3" />
                    {doc.repository.stars}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {currentSection && !editingSection && (
              <button
                onClick={() => startEdit(currentSection)}
                className="btn-secondary text-xs px-3 py-1.5"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Edit
              </button>
            )}
            {editingSection && (
              <>
                <button onClick={saveEdit} disabled={updateMutation.isPending} className="btn-primary text-xs px-3 py-1.5">
                  <Check className="w-3.5 h-3.5" />
                  Save
                </button>
                <button onClick={() => setEditingSection(null)} className="btn-secondary text-xs px-3 py-1.5">
                  <X className="w-3.5 h-3.5" />
                  Cancel
                </button>
              </>
            )}
            <button
              onClick={togglePublic}
              className={`btn-secondary text-xs px-3 py-1.5 ${doc.isPublic ? 'text-emerald-400 border-emerald-800' : ''}`}
            >
              {doc.isPublic ? <Globe className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
              {doc.isPublic ? 'Public' : 'Private'}
            </button>
          </div>
        </div>

        {/* Section content */}
        <div className="p-8 max-w-4xl">
          {currentSection ? (
            editingSection === currentSection.id ? (
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full h-[60vh] bg-gray-900 border border-gray-700 rounded-xl p-4 text-gray-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
              />
            ) : (
              <div className="prose-codelore">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {currentSection.content}
                </ReactMarkdown>
              </div>
            )
          ) : (
            <div className="flex items-center justify-center h-40 text-gray-500 text-sm">
              Select a section from the sidebar
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
