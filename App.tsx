import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search, Moon, Sun, ChevronDown,
  Book, Home, Info, Building2, Users, ExternalLink
} from './components/Icons';
import Markdown from './components/Markdown';
import Modal from './components/Modal';
import { fetchInitData, searchItems, fetchItemDetail, getAssetUrl, processMarkdownContent } from './services/api';
import { SchoolSearchResult, UnionSearchResult, SchoolInfo, UnionInfo, Article, SearchCategory } from './types';

// Page types for simple routing
type Page = 'home' | 'docs' | 'about';
type DocType = 'charter' | 'disclaimer';

// Skeleton shimmer component for search loading
const SearchSkeleton = () => (
  <div className="animate-pulse">
    {[1, 2, 3].map(i => (
      <div key={i} className="p-4 border-b border-gray-50 dark:border-zinc-700/50 last:border-0">
        <div className="h-4 bg-gray-200 dark:bg-zinc-700 rounded-lg w-3/5 mb-2.5" />
        <div className="h-3 bg-gray-100 dark:bg-zinc-700/60 rounded-lg w-2/5" />
      </div>
    ))}
  </div>
);

// Spinner component
const Spinner = ({ size = 16, className = '' }: { size?: number; className?: string }) => (
  <div
    className={`border-2 border-brand-500 border-t-transparent rounded-full animate-spin ${className}`}
    style={{ width: size, height: size }}
  />
);

function App() {
  // -- State --
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [activePage, setActivePage] = useState<Page>('home');
  const [activeDoc, setActiveDoc] = useState<DocType>('charter');

  // Data State
  const [loading, setLoading] = useState(true);
  const [announcement, setAnnouncement] = useState('');
  const [hideAllContacts, setHideAllContacts] = useState(false);
  const [articles, setArticles] = useState<Article[]>([]);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCategory, setSearchCategory] = useState<SearchCategory>('school');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<(SchoolSearchResult | UnionSearchResult)[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchTotal, setSearchTotal] = useState(0);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{ type: 'school' | 'union', data: SchoolSearchResult | UnionSearchResult } | null>(null);
  const [detailData, setDetailData] = useState<SchoolInfo | UnionInfo | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [rulesModalOpen, setRulesModalOpen] = useState(false);
  const [rateLimitMsg, setRateLimitMsg] = useState('');

  // Refs
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rateLimitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestQueryRef = useRef('');

  // Show rate limit warning toast
  const showRateLimitWarning = useCallback(() => {
    setRateLimitMsg('请求过于频繁，请稍后再试');
    if (rateLimitTimerRef.current) clearTimeout(rateLimitTimerRef.current);
    rateLimitTimerRef.current = setTimeout(() => setRateLimitMsg(''), 5000);
  }, []);

  // -- Effects --

  // Theme Init
  useEffect(() => {
    const saved = localStorage.getItem('theme') || 'dark';
    setTheme(saved as any);
    if (saved === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('theme', next);
      if (next === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return next;
    });
  };

  // Data Fetching (only init data — no schools/unions)
  useEffect(() => {
    let ignore = false;
    fetchInitData().then(data => {
      if (ignore) return;
      setAnnouncement(data.announcement);
      setHideAllContacts(data.hideAllContacts);
      setArticles(data.articles);
      setLoading(false);
    }).catch(err => {
      if (ignore) return;
      console.error(err);
      setLoading(false);
    });
    return () => { ignore = true; };
  }, []);

  // -- Debounced Search --
  const doSearch = useCallback(async (query: string, category: SearchCategory) => {
    if (!query.trim()) {
      setSearchResults([]);
      setSearchLoading(false);
      setSearchTotal(0);
      return;
    }

    latestQueryRef.current = query;
    setSearchLoading(true);

    try {
      const res = await searchItems(query, category);
      // Only update if this is still the latest query
      if (latestQueryRef.current === query) {
        setSearchResults(res.results);
        setSearchTotal(res.total);
        setSearchLoading(false);
      }
    } catch (err: any) {
      if (latestQueryRef.current === query) {
        setSearchLoading(false);
        if (err.message === 'RATE_LIMITED') {
          setSearchResults([]);
          showRateLimitWarning();
        }
      }
    }
  }, [showRateLimitWarning]);

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);

    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }

    if (!value.trim()) {
      setSearchResults([]);
      setSearchLoading(false);
      setSearchTotal(0);
      return;
    }

    // Show loading immediately for responsiveness
    setSearchLoading(true);

    searchTimerRef.current = setTimeout(() => {
      doSearch(value, searchCategory);
    }, 200);
  }, [searchCategory, doSearch]);

  // Re-search when category changes
  useEffect(() => {
    if (searchQuery.trim()) {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
      setSearchLoading(true);
      searchTimerRef.current = setTimeout(() => {
        doSearch(searchQuery, searchCategory);
      }, 200);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchCategory]);

  // -- Detail Loading --
  const handleResultClick = async (item: SchoolSearchResult | UnionSearchResult) => {
    if (!item) return;
    setSelectedItem({ type: searchCategory, data: item });
    setDetailData(null);
    setDetailLoading(true);
    setModalOpen(true);

    try {
      const schoolName = 'school' in item ? item.school : '';
      const orgName = item.org;
      const res = await fetchItemDetail(searchCategory, schoolName, orgName);
      if (res.found && res.data) {
        setDetailData(res.data);
      }
    } catch (err) {
      console.error('Failed to load detail', err);
      if ((err as any)?.message === 'RATE_LIMITED') {
        showRateLimitWarning();
      }
    } finally {
      setDetailLoading(false);
    }
  };

  // -- Content Logic --

  const renderHighlight = (text: string, query: string) => {
    if (!text) return '';
    if (!query) return text;
    try {
      const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
      return parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ?
          <mark key={i} className="bg-brand-500/20 text-brand-600 dark:text-brand-400 rounded px-0.5">{part}</mark> :
          part
      );
    } catch {
      return text;
    }
  };

  const getDocContent = (type: DocType) => {
    const filename = type === 'charter' ? 'charter.md' : 'disclaimer.md';
    const article = articles.find(a => a.name === filename || a.path.includes(type));
    if (!article) return 'Loading...';
    return processMarkdownContent(article.content, type === 'charter' ? 'joinus/' : '');
  };

  const getAboutContent = () => {
    const article = articles.find(a => a.name === 'aboutus.md');
    if (!article) return 'Loading...';
    return processMarkdownContent(article.content, '');
  };

  const handleInternalNav = (type: 'charter' | 'disclaimer') => {
    setActivePage('docs');
    setActiveDoc(type);
  };

  // -- Render Helpers --

  const Contributors = () => {
    const list = [
      { name: 'Moko', title: '站长&编辑', avatar: 'moko.png', link: 'https://github.com/mybear123' },
      { name: '乔伊Joe', title: '开源贡献者', avatar: 'joe.png', link: 'https://github.com/Joe-REAL-0' },
      { name: '狼牙', title: '全栈开发', avatar: 'langya.png', link: 'https://github.com/LangYa466' },
      { name: '蛇蛇', title: '预备志愿者', avatar: 'snake.png', link: 'https://space.bilibili.com/422589383' },
    ];

    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 my-6">
        {list.map((c, i) => (
          <a key={i} href={c.link} target="_blank" rel="noreferrer" className="block group">
            <div className="bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl p-3 md:p-4 flex flex-col items-center transition-all hover:ring-2 hover:ring-brand-500 hover:border-transparent duration-300 h-full">
              <img
                src={getAssetUrl(c.avatar)}
                alt={c.name}
                className="w-16 h-16 md:w-20 md:h-20 rounded-full object-cover mb-2 md:mb-3 border-2 border-gray-100 dark:border-zinc-600 group-hover:border-brand-400 transition-colors"
              />
              <h4 className="font-semibold text-gray-900 dark:text-white text-sm md:text-base">{c.name}</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">{c.title}</p>
            </div>
          </a>
        ))}
      </div>
    )
  };

  return (
    <div className="min-h-screen flex flex-col font-sans selection:bg-brand-500/30 selection:text-brand-800 dark:selection:text-brand-200">

      {/* Rate Limit Toast */}
      {rateLimitMsg && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-slide-down">
          <div className="bg-red-500/90 backdrop-blur-sm text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-3 text-sm font-medium">
            <span>⚠️ {rateLimitMsg}</span>
            <button onClick={() => setRateLimitMsg('')} className="text-white/70 hover:text-white ml-2">×</button>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 h-16 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-gray-200 dark:border-zinc-800 z-40 px-4 md:px-6 flex items-center justify-between transition-colors duration-300">

        {/* Left: Logo */}
        <div className="flex-1 flex justify-start">
          <div
            className="hidden md:block text-xl font-bold bg-gradient-to-r from-brand-600 to-emerald-500 bg-clip-text text-transparent cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => setActivePage('home')}
          >
            LinktoFur
          </div>
        </div>

        {/* Center: Nav Buttons */}
        <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="flex items-center gap-1 md:gap-2 bg-gray-100 dark:bg-zinc-800/50 p-1 rounded-full border border-gray-200 dark:border-zinc-700 shadow-sm">
            {[
              { id: 'home', label: '首页', icon: Home },
              { id: 'docs', label: '文档', icon: Book },
              { id: 'about', label: '关于', icon: Info },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setActivePage(item.id as Page)}
                className={`
                            relative px-3 py-1.5 rounded-full text-sm font-medium flex items-center justify-center gap-2 transition-all duration-300
                            ${activePage === item.id
                    ? 'text-brand-600 dark:text-brand-300 bg-white dark:bg-zinc-700 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-200/50 dark:hover:bg-zinc-700/50'}
                        `}
              >
                <item.icon size={16} className="hidden sm:block" />
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Theme Toggle */}
        <div className="flex-1 flex justify-end">
          <button
            onClick={toggleTheme}
            className="w-10 h-10 flex items-center justify-center rounded-full border border-gray-200 dark:border-zinc-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all active:scale-95"
          >
            {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-4xl mx-auto pt-28 px-4 pb-12 flex flex-col">

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center mt-20 animate-fade-in flex-1">
            <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-500">加载数据中...</p>
          </div>
        )}

        {/* PAGE CONTENT WRAPPER */}
        <div key={activePage} className="animate-slide-up flex-1">

          {/* HOME PAGE */}
          {!loading && activePage === 'home' && (
            <div className="flex flex-col items-center">
              <div className="mb-8 text-center">
                <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4 tracking-tight">
                  搜索院校或地区联合群
                </h1>
                <p className="text-lg text-gray-500 dark:text-gray-400">
                  兽迷?在我高校里?这比你想的更有可能
                </p>
              </div>

              {/* Search Component */}
              <div className="w-full max-w-2xl relative z-30">
                <div className="flex shadow-lg shadow-brand-500/5 dark:shadow-black/20 rounded-2xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 transition-all focus-within:ring-2 focus-within:ring-brand-500/50 focus-within:border-brand-500">

                  {/* Category Select */}
                  <div className="relative border-r border-gray-100 dark:border-zinc-700">
                    <button
                      className="h-14 px-3 sm:px-5 flex items-center gap-1 sm:gap-2 text-gray-700 dark:text-gray-200 font-medium hover:bg-gray-50 dark:hover:bg-zinc-700/50 rounded-l-2xl transition-colors shrink-0 outline-none"
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    >
                      <span className="flex items-center gap-2">
                        {searchCategory === 'school' ? <Building2 size={18} /> : <Users size={18} />}
                        <span className="whitespace-nowrap">
                          {searchCategory === 'school' ? '院校' : '联合群'}
                        </span>
                      </span>
                      <ChevronDown size={14} className={`transition-transform duration-200 ml-1 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isDropdownOpen && (
                      <div className="absolute top-full left-0 mt-2 w-40 bg-white dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 rounded-xl shadow-xl overflow-hidden py-1 animate-zoom-in z-[60]">
                        <button
                          className={`w-full text-left px-4 py-3 text-sm flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-zinc-700 ${searchCategory === 'school' ? 'text-brand-600 bg-brand-50/50 dark:bg-brand-900/10' : 'text-gray-700 dark:text-gray-300'}`}
                          onClick={() => { setSearchCategory('school'); setIsDropdownOpen(false); }}
                        >
                          <Building2 size={16} /> 院校
                        </button>
                        <button
                          className={`w-full text-left px-4 py-3 text-sm flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-zinc-700 ${searchCategory === 'union' ? 'text-brand-600 bg-brand-50/50 dark:bg-brand-900/10' : 'text-gray-700 dark:text-gray-300'}`}
                          onClick={() => { setSearchCategory('union'); setIsDropdownOpen(false); }}
                        >
                          <Users size={16} /> 地区联合群
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Input */}
                  <div className="flex-1 flex items-center px-4 overflow-hidden">
                    <Search className="text-gray-400 mr-3 shrink-0" size={20} />
                    <input
                      type="text"
                      className="flex-1 h-full bg-transparent outline-none text-gray-900 dark:text-white placeholder-gray-400 min-w-0"
                      placeholder={searchCategory === 'school' ? '输入学校名称...' : '输入地区名称...'}
                      value={searchQuery}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      autoComplete="off"
                    />
                    {/* Spinner or Clear button */}
                    {searchQuery && (
                      searchLoading ? (
                        <Spinner size={16} className="shrink-0 ml-2" />
                      ) : (
                        <button onClick={() => { setSearchQuery(''); setSearchResults([]); setSearchTotal(0); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 shrink-0 ml-2">
                          <div className="bg-gray-100 dark:bg-zinc-700 rounded-full p-1"><span className="sr-only">Clear</span>×</div>
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* Results Dropdown */}
                {searchQuery && (
                  <div className="absolute top-full left-0 right-0 mt-3 bg-white dark:bg-zinc-800 rounded-2xl border border-gray-100 dark:border-zinc-700 shadow-xl max-h-[60vh] overflow-y-auto overscroll-contain custom-scrollbar animate-slide-down origin-top z-50">
                    {searchLoading && searchResults.length === 0 ? (
                      /* Skeleton shimmer when no previous results */
                      <SearchSkeleton />
                    ) : searchResults.length > 0 ? (
                      <div className={searchLoading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
                        {/* Result count header */}
                        <div className="px-4 py-2 border-b border-gray-100 dark:border-zinc-700/50 text-xs text-gray-400">
                          找到 {searchTotal} 个结果
                        </div>
                        {searchResults.map((item: any, i) => (
                          <div
                            key={i}
                            onClick={() => handleResultClick(item)}
                            className="p-4 hover:bg-gray-50 dark:hover:bg-zinc-700/50 cursor-pointer border-b border-gray-50 dark:border-zinc-700/50 last:border-0 transition-colors"
                          >
                            <div className="font-semibold text-gray-900 dark:text-white text-base">
                              {searchCategory === 'school'
                                ? renderHighlight((item as SchoolSearchResult).school, searchQuery)
                                : renderHighlight((item as UnionSearchResult).org, searchQuery)
                              }
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-2">
                              {searchCategory === 'school' ? (
                                <>
                                  <span className="font-medium">{renderHighlight((item as SchoolSearchResult).org, searchQuery)}</span>
                                  <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                  <span>{(item as SchoolSearchResult).region}</span>
                                </>
                              ) : (
                                <span>{(item as UnionSearchResult).intro || '地区联合群'}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center">
                        <p className="text-gray-500 mb-4">没有找到相关结果</p>
                        <button
                          onClick={() => setRulesModalOpen(true)}
                          className="text-brand-600 hover:text-brand-700 font-medium text-sm flex items-center justify-center gap-2 mx-auto hover:bg-brand-50 dark:hover:bg-brand-900/20 px-4 py-2 rounded-lg transition-colors"
                        >
                          <Info size={16} />
                          <span>欢迎填写信息表加入我们</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Announcement */}
              {announcement && (
                <div className="w-full max-w-2xl bg-brand-50/50 dark:bg-brand-900/10 border border-brand-100 dark:border-brand-900/20 rounded-2xl p-6 mt-8 mb-6 shadow-sm relative z-10">
                  <Markdown
                    content={announcement}
                    className="text-sm [&_h1]:text-xl [&_h1]:mb-3 [&_ol]:my-1"
                    onOpenRules={() => setRulesModalOpen(true)}
                  />
                </div>
              )}
            </div>
          )}

          {/* DOCS PAGE */}
          {!loading && activePage === 'docs' && (
            <div>
              <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-zinc-800 pb-0">
                {(['charter', 'disclaimer'] as DocType[]).map(type => (
                  <button
                    key={type}
                    onClick={() => setActiveDoc(type)}
                    className={`px-4 py-3 text-sm font-medium border-b-2 transition-all duration-300 ${activeDoc === type
                      ? 'text-brand-600 dark:text-brand-400 border-brand-500 bg-brand-50/50 dark:bg-brand-900/10 rounded-t-lg'
                      : 'text-gray-500 border-transparent hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-zinc-600'
                      }`}
                  >
                    {type === 'charter' ? '成员公约' : '免责声明'}
                  </button>
                ))}
              </div>
              <div key={activeDoc} className="bg-white dark:bg-zinc-800 p-8 rounded-2xl border border-gray-200 dark:border-zinc-700 shadow-sm animate-zoom-in">
                <Markdown
                  content={getDocContent(activeDoc)}
                  basePath={activeDoc === 'charter' ? 'joinus/' : ''}
                  onInternalNav={handleInternalNav}
                  onOpenRules={() => setRulesModalOpen(true)}
                />
              </div>
            </div>
          )}

          {/* ABOUT PAGE */}
          {!loading && activePage === 'about' && (
            <div className="bg-white dark:bg-zinc-800 p-8 rounded-2xl border border-gray-200 dark:border-zinc-700 shadow-sm">
              {(() => {
                const content = getAboutContent();
                const parts = content.split('*四个flex*');

                if (parts.length > 1) {
                  return (
                    <>
                      <Markdown content={parts[0]} onOpenRules={() => setRulesModalOpen(true)} />
                      <Contributors />
                      <Markdown content={parts[1]} onOpenRules={() => setRulesModalOpen(true)} />
                    </>
                  );
                }

                return (
                  <>
                    <Markdown content={content} onOpenRules={() => setRulesModalOpen(true)} />
                    <div className="mt-8 border-t border-gray-200 dark:border-zinc-700 pt-8">
                      <h3 className="text-center text-xl font-bold mb-6">LinktoFur 团队</h3>
                      <Contributors />
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-12 flex flex-wrap justify-center gap-4 text-sm text-gray-400">
          <span>© {new Date().getFullYear()} LinktoFur</span>
          <span>•</span>
          <a
            href="https://beian.miit.gov.cn/"
            rel="noreferrer"
            target="_blank"
            className="flex items-center hover:text-gray-600 dark:hover:text-gray-300"
          >
            <img src="icp_icon.png" alt="ICP" className="mr-1 h-4 w-4" />
            粤ICP备2026000263号
          </a>
          <span>•</span>
          <a
            href="https://beian.mps.gov.cn/#/query/webSearch?code=44011102484588"
            rel="noreferrer"
            target="_blank"
            className="flex items-center hover:text-gray-600 dark:hover:text-gray-300"
          >
            <img src="beian.mps.gov.cn_icon.png" alt="公安备案图标" className="mr-1 h-4 w-4" />
            粤公网安备44011102484588号
          </a>
        </div>
      </main>

      {/* Details Modal — loads contact info on demand */}
      <Modal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setDetailData(null); }}
        title={selectedItem?.data ? (selectedItem.type === 'school' ? (selectedItem.data as SchoolSearchResult).school : (selectedItem.data as UnionSearchResult).org) : ''}
      >
        {selectedItem?.data && (
          <div className="space-y-4 text-gray-700 dark:text-gray-300">
            {selectedItem.type === 'school' ? (
              <>
                <div className="flex flex-col sm:flex-row sm:items-baseline gap-2">
                  <span className="font-semibold w-20 text-gray-900 dark:text-white shrink-0">组织名称:</span>
                  <span>{(selectedItem.data as SchoolSearchResult).org}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-baseline gap-2">
                  <span className="font-semibold w-20 text-gray-900 dark:text-white shrink-0">所属地区:</span>
                  <span>{(selectedItem.data as SchoolSearchResult).region}</span>
                </div>
              </>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-baseline gap-2">
                <span className="font-semibold w-20 text-gray-900 dark:text-white shrink-0">简介:</span>
                <span>{(selectedItem.data as UnionSearchResult).intro || '暂无简介'}</span>
              </div>
            )}

            {/* Contact info section — loaded on demand */}
            <div className="pt-4 border-t border-gray-100 dark:border-zinc-700">
              <span className="block font-semibold mb-2 text-gray-900 dark:text-white">联系方式:</span>
              {detailLoading ? (
                <div className="flex items-center gap-3 py-4">
                  <Spinner size={18} />
                  <span className="text-gray-400 text-sm">加载联系方式中...</span>
                </div>
              ) : detailData ? (
                hideAllContacts ? (
                  <p className="text-gray-500 italic">暂无联系方式</p>
                ) : (
                  <Markdown content={(detailData as any).contact || '暂无联系方式'} className="prose-p:m-0" onOpenRules={() => setRulesModalOpen(true)} />
                )
              ) : (
                <p className="text-gray-500 italic">无法加载联系方式</p>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Rules Modal */}
      <Modal
        isOpen={rulesModalOpen}
        onClose={() => setRulesModalOpen(false)}
        title="提交须知"
        footer={
          <a
            href="https://docs.qq.com/form/page/DVVZXV09zUUdDUWJs"
            target="_blank"
            rel="noreferrer"
            className="w-full sm:w-auto inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-xl text-white bg-brand-600 hover:bg-brand-700 transition-colors shadow-lg shadow-brand-500/20"
          >
            我已阅读，前往填写 <ExternalLink size={18} className="ml-2" />
          </a>
        }
      >
        <div className="text-sm">
          <p className="mb-4 text-gray-500">
            <a
              onClick={() => { setRulesModalOpen(false); setActivePage('docs'); setActiveDoc('charter'); }}
              className="text-brand-600 cursor-pointer hover:underline"
            >
              *原条目：《成员公约》
            </a>
          </p>
          <div className="space-y-3">
            <p>一、 本企划仅接受以Furry同好主题相关的组织加入。</p>
            <p>二、 高校组织加入本项目并且参与信息登记的条件是：</p>
            <ol className="list-decimal list-outside ml-5 space-y-2 text-gray-600 dark:text-gray-300">
              <li>有加入本项目的意愿；</li>
              <li>具有高校背景*；</li>
              <li>有明确的负责人代表其组织，并有对Furry一定程度的理解；</li>
              <li>组织成员至少达到3人;</li>
              <li><strong>申请的群聊应遵循法律法规，不得传播违法信息;</strong></li>
              <li><strong>填写联系方式的人须加入高校兽迷同好汇的QQ群878487713以方便获取联系。</strong></li>
              <li>同意本网站的<a onClick={() => { setRulesModalOpen(false); setActivePage('docs'); setActiveDoc('disclaimer'); }} className="text-brand-600 cursor-pointer hover:underline">免责声明</a>；</li>
              <li>您知晓并同意，在本企划任何范围内不得就任何方面歧视、贬低其它院校。</li>
              <li>若加入的高校组织若决定自行退出，需通知相关的志愿者，并且删除相关的现在正在合作的声明，或声明合作已经终止。</li>
            </ol>
          </div>
        </div>
      </Modal>

    </div>
  );
}

export default App;
