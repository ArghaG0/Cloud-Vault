import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { documentService } from '../services/documentService';
import { formatBytes, formatRelativeTime, getFileIcon } from '../utils/formatters';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Checkbox } from '../components/common/Checkbox';
import { Skeleton } from '../components/common/Skeleton';

export function SearchResults() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';

  const [inputQuery, setInputQuery] = useState(query);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedType, setSelectedType] = useState('all');
  const [onlySynced, setOnlySynced] = useState(false);

  useEffect(() => {
    async function executeSearch() {
      setLoading(true);
      try {
        const filters = {
          category: selectedCategory,
          extension: selectedType,
          s3Status: onlySynced ? 'synced' : undefined,
        };
        const data = await documentService.searchDocuments(query, filters);
        setResults(data);
      } finally {
        setLoading(false);
      }
    }
    executeSearch();
  }, [query, selectedCategory, selectedType, onlySynced]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearchParams(inputQuery.trim() ? { q: inputQuery.trim() } : {});
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-12">
      {/* Search Header Bar */}
      <div className="flex flex-col gap-3">
        <h1 className="font-headline-sm text-2xl font-bold text-on-surface">
          Vault Search Results
        </h1>
        <form onSubmit={handleSearchSubmit} className="relative flex items-center max-w-2xl">
          <span className="material-symbols-outlined absolute left-3.5 text-[20px] text-secondary pointer-events-none">
            search
          </span>
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder="Search by filename, lecture subject, or keyword..."
            className="w-full pl-11 pr-24 py-3 rounded-full bg-card-surface border border-border-subtle text-on-surface font-body-sm text-sm placeholder:text-secondary focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
          />
          <button
            type="submit"
            className="absolute right-2 px-4 py-1.5 rounded-full bg-primary text-on-primary text-xs font-semibold hover:bg-neutral-800 transition-colors"
          >
            Search
          </button>
        </form>
        <p className="font-body-sm text-xs text-on-surface-variant">
          Showing results for <strong className="text-on-surface">"{query || 'All Documents'}"</strong> • {results.length} files matched
        </p>
      </div>

      {/* Main Grid: Filters Sidebar & Results List */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Filter Sidebar */}
        <div className="p-5 rounded-2xl bg-card-surface border border-border-subtle shadow-card flex flex-col gap-5 h-fit">
          <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
            <span className="font-label-caps text-xs text-on-surface-variant uppercase font-semibold">
              FILTERS
            </span>
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('All');
                setSelectedType('all');
                setOnlySynced(false);
              }}
              className="text-[11px] text-secondary hover:text-primary transition-colors"
            >
              Reset All
            </button>
          </div>

          {/* Category Filter */}
          <div className="flex flex-col gap-2">
            <span className="font-label-caps text-[11px] text-secondary uppercase">
              Course Category
            </span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-DEFAULT bg-surface-container-low border border-border-subtle text-xs text-on-surface focus:outline-none"
            >
              <option value="All">All Categories</option>
              <option value="Lecture Notes">Lecture Notes</option>
              <option value="Assignments">Assignments</option>
              <option value="Question Papers">Question Papers</option>
              <option value="Project Reports">Project Reports</option>
              <option value="Study Materials">Study Materials</option>
              <option value="Other Documents">Other Documents</option>
            </select>
          </div>

          {/* File Type Filter */}
          <div className="flex flex-col gap-2">
            <span className="font-label-caps text-[11px] text-secondary uppercase">
              File Format
            </span>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-3 py-2 rounded-DEFAULT bg-surface-container-low border border-border-subtle text-xs text-on-surface focus:outline-none"
            >
              <option value="all">All Formats</option>
              <option value="pdf">PDF Document (.pdf)</option>
              <option value="docx">Word Document (.docx)</option>
              <option value="pptx">Slide Deck (.pptx)</option>
              <option value="zip">Archive (.zip)</option>
              <option value="image">Image (.png, .jpg)</option>
            </select>
          </div>

          {/* S3 Status Checkbox */}
          <div className="pt-2 border-t border-border-subtle/60">
            <Checkbox
              checked={onlySynced}
              onChange={setOnlySynced}
              label="Only S3 Synced"
              description="Exclude pending local queues"
            />
          </div>
        </div>

        {/* Right Results Column */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          {loading ? (
            <div className="flex flex-col gap-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-24 rounded-2xl w-full" />
              ))}
            </div>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 bg-card-surface border border-border-subtle rounded-2xl text-center">
              <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center text-secondary mb-3">
                <span className="material-symbols-outlined text-[24px]">search_off</span>
              </div>
              <h3 className="font-headline-sm text-base font-semibold text-on-surface">
                No matching documents found
              </h3>
              <p className="font-body-sm text-xs text-on-surface-variant max-w-sm mt-1">
                We couldn't find any documents matching "{query}". Check for spelling errors or broaden your filters.
              </p>
              <Link to="/upload" className="mt-4">
                <Button variant="primary" size="sm" icon="cloud_upload">
                  Upload this Document
                </Button>
              </Link>
            </div>
          ) : (
            results.map((doc) => {
              const { icon, color } = getFileIcon(doc.extension);

              return (
                <div
                  key={doc.id}
                  className="p-5 rounded-2xl bg-card-surface border border-border-subtle shadow-card hover:border-primary/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
                      <span className="material-symbols-outlined text-[22px]">{icon}</span>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <Link
                        to={`/documents/${doc.id}/preview`}
                        className="font-semibold text-sm text-on-surface hover:underline truncate"
                      >
                        {doc.name}
                      </Link>
                      <p className="font-body-sm text-xs text-secondary truncate mt-0.5">
                        {doc.title}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge size="sm">{doc.category}</Badge>
                        <span className="font-mono text-[11px] text-secondary">
                          {formatBytes(doc.sizeBytes)}
                        </span>
                        <span className="text-[11px] text-secondary">
                          • {formatRelativeTime(doc.lastModified)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Link to={`/documents/${doc.id}/preview`}>
                      <Button variant="secondary" size="sm" icon="visibility">
                        Preview
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
