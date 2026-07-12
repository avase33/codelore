// DocViewer component -- 2026-07-12 10:39:24
import { useState, useEffect } from 'react';

interface Doc { filePath: string; content: string; linesOfCode: number; functionCount: number; outdated: boolean; generatedAt: string; }

interface Props { repoId: string; filePath: string; }

export default function DocViewer({ repoId, filePath }: Props) {
  const [doc, setDoc] = useState<Doc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!repoId || !filePath) return;
    setLoading(true);
    fetch('/api/repos/' + repoId + '/docs/' + encodeURIComponent(filePath))
      .then(r => r.json()).then(setDoc).catch(console.error).finally(() => setLoading(false));
  }, [repoId, filePath]);

  if (loading) return <div className='p-6 text-gray-400'>Loading documentation...</div>;
  if (!doc) return <div className='p-6 text-red-400'>No documentation found for this file.</div>;

  return (
    <div className='p-6 max-w-4xl'>
      {doc.outdated && (
        <div className='mb-4 p-3 bg-yellow-50 border border-yellow-300 rounded-lg text-yellow-800 text-sm'>
          This doc may be outdated since the last commit.
        </div>
      )}
      <div className='flex gap-4 mb-6 text-sm text-gray-500'>
        <span>{doc.linesOfCode} lines</span>
        <span>{doc.functionCount} functions</span>
        <span>Updated {new Date(doc.generatedAt).toLocaleDateString()}</span>
      </div>
      <div className='prose prose-sm max-w-none' dangerouslySetInnerHTML={{ __html: doc.content }} />
    </div>
  );
}