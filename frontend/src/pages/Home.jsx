import { useState } from 'react';
import axios from 'axios';
import { Search, Loader2, Sparkles, BookOpen, ArrowLeft, ExternalLink, FileText, Eye, EyeOff, Download } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const API_URL = 'https://libsys-backend-hkck.onrender.com';

const Home = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showFreeOnly, setShowFreeOnly] = useState(true);
  
  // Reader & Summary States
  const [selectedBook, setSelectedBook] = useState(null);
  const [readerMode, setReaderMode] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query) return;
    
    setLoading(true);
    setResults([]);
    setSelectedBook(null);
    setReaderMode(false);
    
    try {
      const res = await axios.post(`${API_URL}/ai/search`, { query, free_only: showFreeOnly });
      setResults(res.data.results || []);
    } catch (err) {
      console.error(err);
      alert('Gagal mencari referensi.');
    } finally {
      setLoading(false);
    }
  };

  const handleReadBook = (book) => {
    setSelectedBook(book);
    setReaderMode(true);
  };

  const handleBackToSearch = () => {
    setReaderMode(false);
  };

  const handleSummarize = async (summaryType = 'short') => {
    if (!selectedBook) return;
    
    // Reset existing summary if any, keep the rest of the book data
    setSelectedBook(prev => ({ ...prev, summary: null }));
    setSummaryLoading(true);
    
    try {
      const res = await axios.post(`${API_URL}/ai/summarize`, {
        title: selectedBook.title,
        content_preview: selectedBook.content_preview,
        summary_type: summaryType
      });
      setSelectedBook(prev => ({ ...prev, summary: res.data.summary, summaryType }));
    } catch (err) {
      console.error(err);
      alert('Gagal memuat ringkasan.');
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleExport = async (format) => {
    if (!selectedBook?.summary) return;
    
    const safeTitle = selectedBook.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    
    if (format === 'md' || format === 'txt') {
      const element = document.createElement("a");
      const file = new Blob([selectedBook.summary], {type: format === 'md' ? 'text/markdown' : 'text/plain'});
      element.href = URL.createObjectURL(file);
      element.download = `Ringkasan_${safeTitle.substring(0, 30)}.${format}`;
      document.body.appendChild(element); // Required for this to work in FireFox
      element.click();
      document.body.removeChild(element);
      return;
    }
    
    // For pdf and docx, call backend
    try {
      // Show loading indicator on button if needed, but for simplicity we just fetch
      const res = await axios.post(`${API_URL}/ai/export`, {
        title: selectedBook.title,
        summary_markdown: selectedBook.summary,
        format: format
      }, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Ringkasan_${safeTitle.substring(0, 30)}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error(err);
      alert('Gagal mengekspor dokumen dalam format ' + format.toUpperCase());
    }
  };

  return (
    <div className="home-container">
      {!readerMode ? (
        <>
          <div className="hero-section">
            <h1>Libsys</h1>
            <p className="hero-subtitle">Mesin pencari khusus jurnal ilmiah, paper teknologi, referensi sejarah, geografi, dan berbagai disiplin ilmu lainnya (Free-to-Access).</p>
            
            <form onSubmit={handleSearch} className="search-bar glass">
              <Search className="search-icon" size={24} />
              <input 
                type="text" 
                placeholder="Cari topik penelitian, teknologi, geografi, medis, sejarah..." 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <button type="submit" className="btn btn-primary search-btn" disabled={loading}>
                {loading ? <Loader2 className="animate-spin" size={20} /> : 'Cari'}
              </button>
            </form>
            
            <div className="search-filters" style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center' }}>
              <button 
                type="button" 
                className="btn btn-outline" 
                style={{ borderRadius: '999px', padding: '0.5rem 1.25rem', fontSize: '0.9rem' }}
                onClick={() => setShowFreeOnly(!showFreeOnly)}
              >
                {showFreeOnly ? (
                  <><EyeOff size={16} /> Show Free Only</>
                ) : (
                  <><Eye size={16} /> Show All</>
                )}
              </button>
            </div>
          </div>

          <div className="search-results-container">
            {loading && (
               <div className="loading-state">
                 <Loader2 className="animate-spin" size={40} />
                 <p>Mencari referensi terbaik untuk Anda...</p>
               </div>
            )}
            
            {!loading && results.length > 0 && (
              <div className="results-grid">
                {results.map((item, idx) => (
                  <div 
                    key={idx} 
                    className="card glass result-card"
                    onClick={() => handleReadBook(item)}
                  >
                    <div className="card-header">
                      <BookOpen size={20} className="icon-book" />
                      <h3>{item.title}</h3>
                    </div>
                    <p className="author" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>Oleh: {item.author}</p>
                    <div className="meta-tags">
                      <span className="tag">{item.type}</span>
                      <span className="tag">{item.language}</span>
                      {!item.is_oa && (
                        <span className="tag tag-danger" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)' }}>More Action Required</span>
                      )}
                    </div>
                    <p className="description-preview">
                      {item.content_preview?.substring(0, 150)}...
                    </p>
                    <div className="read-more-hint">Baca Selengkapnya ➔</div>
                  </div>
                ))}
              </div>
            )}
            
            {results.length === 0 && !loading && query && (
               <p className="empty-state">Tidak ada hasil ditemukan.</p>
            )}
          </div>
        </>
      ) : (
        <div className="reader-view">
          <button className="btn btn-back" onClick={handleBackToSearch}>
            <ArrowLeft size={18} /> Kembali ke Pencarian
          </button>
          
          <div className="reader-content glass">
            <div className="reader-header">
              <div className="meta-tags mb-3">
                <span className="tag">{selectedBook.type}</span>
                <span className="tag">{selectedBook.language}</span>
                {!selectedBook.is_oa && (
                  <span className="tag tag-danger" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)' }}>More Action Required</span>
                )}
              </div>
              <h1 className="reader-title">{selectedBook.title}</h1>
              <p className="reader-author">Penulis: {selectedBook.author}</p>
              
              <div className="reader-actions">
                <a 
                  href={selectedBook.source_url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="btn btn-outline"
                >
                  <ExternalLink size={18} /> Buka Teks Asli (Full Text)
                </a>
              </div>
            </div>
            
            <div className="document-preview">
              <h3><FileText size={20} className="inline-icon" /> Abstrak / Pratinjau Isi</h3>
              <div className="preview-text">
                {selectedBook.content_preview}
              </div>
            </div>
            
            <div className="summarize-section" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <button 
                className="btn btn-outline btn-lg" 
                onClick={() => handleSummarize('short')}
                disabled={summaryLoading}
                style={{ flex: 1 }}
              >
                {summaryLoading ? (
                  <><Loader2 className="animate-spin" size={20} /> Menganalisis...</>
                ) : (
                  <><Sparkles size={20} /> Ringkasan Poin Inti</>
                )}
              </button>
              <button 
                className="btn btn-primary btn-lg" 
                onClick={() => handleSummarize('detailed')}
                disabled={summaryLoading}
                style={{ flex: 1 }}
              >
                {summaryLoading ? (
                  <><Loader2 className="animate-spin" size={20} /> Menganalisis...</>
                ) : (
                  <><Sparkles size={20} /> Ringkasan Lengkap & Rinci</>
                )}
              </button>
            </div>
            
            {selectedBook.summary && (
              <div className="summary-panel glass mt-4">
                <div className="summary-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Sparkles size={24} className="icon-sparkles" />
                    <h2>Analisis & Ringkasan AI ({selectedBook.summaryType === 'detailed' ? 'Lengkap' : 'Poin Inti'})</h2>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button className="btn btn-outline" onClick={() => handleExport('md')} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
                      <Download size={14} /> MD
                    </button>
                    <button className="btn btn-outline" onClick={() => handleExport('txt')} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
                      <Download size={14} /> TXT
                    </button>
                    <button className="btn btn-outline" onClick={() => handleExport('pdf')} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
                      <Download size={14} /> PDF
                    </button>
                    <button className="btn btn-outline" onClick={() => handleExport('docx')} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
                      <Download size={14} /> DOCX
                    </button>
                  </div>
                </div>
                <div className="summary-content markdown-body">
                  <ReactMarkdown>{selectedBook.summary}</ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default Home;
