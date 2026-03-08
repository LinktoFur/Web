/// <reference types="vite/client" />
import {
  Article, SchoolInfo, UnionInfo,
  SchoolSearchResult, UnionSearchResult,
  SearchResponse, DetailResponse
} from '../types';

// Always use real URL, CORS handled server-side
const BASE_URL = 'https://moke.furry.luxe/';
const API_URL = `${BASE_URL}api.php`;

export const getAssetUrl = (path: string) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  if (path.startsWith('/')) return `${BASE_URL}${path.substring(1)}`;
  return `${BASE_URL}${path}`;
};

// Helper to remove frontmatter
const removeFrontmatter = (content: string): string => {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (match) {
    return content.slice(match[0].length);
  }
  return content;
};

/**
 * Fetch initial page data (announcement, articles for docs/about).
 * Does NOT fetch schools/unions anymore.
 * Uses module-level cache to prevent React StrictMode double-fetch.
 */
let _initDataPromise: ReturnType<typeof _fetchInitData> | null = null;

const _fetchInitData = async () => {
  try {
    // 1. Fetch hide status
    const hideResponse = await fetch(`${BASE_URL}hide.txt`);
    const hideText = await hideResponse.text();
    const hideAllContacts = hideText.trim().toLowerCase() === 'true';

    // 2. Fetch announcement
    let announcement = '';
    try {
      const annResponse = await fetch(`${BASE_URL}announce.md`);
      if (annResponse.ok) announcement = await annResponse.text();
    } catch (e) { console.warn('No announcement found'); }

    // 3. Fetch only root-level articles + joinus subfolder (for charter doc)
    // Do NOT fetch pages/* folders — those contain school contact data
    const requests = [
      fetch(API_URL, { method: 'POST', body: JSON.stringify({ category: '' }) }).then(r => r.json()).catch(() => ({ articles: [] })),
      fetch(API_URL, { method: 'POST', body: JSON.stringify({ category: 'joinus' }) }).then(r => r.json()).catch(() => ({ articles: [] })),
    ];

    const results = await Promise.all(requests);

    // 4. Process Articles
    const articles: Article[] = [];
    const loadedKeys = new Set<string>();

    results.forEach((d: any) => {
      if (d.articles) {
        d.articles.forEach((a: Article) => {
          const key = `${a.path}/${a.name}`;
          if (!loadedKeys.has(key)) {
            loadedKeys.add(key);
            articles.push(a);
          }
        });
      }
    });

    return {
      hideAllContacts,
      announcement,
      articles
    };

  } catch (error) {
    console.error("Failed to fetch init data", error);
    throw error;
  }
};

export const fetchInitData = () => {
  if (!_initDataPromise) {
    _initDataPromise = _fetchInitData();
  }
  return _initDataPromise;
};

/**
 * Search schools or unions via backend API (lazy search).
 * Results do NOT contain contact info.
 */
export const searchItems = async (
  query: string,
  type: 'school' | 'union',
  page: number = 1,
  limit: number = 10
): Promise<SearchResponse<SchoolSearchResult | UnionSearchResult>> => {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'search',
      q: query,
      type,
      page,
      limit
    })
  });

  if (res.status === 429) {
    throw new Error('RATE_LIMITED');
  }

  if (!res.ok) {
    throw new Error(`Search API Error: ${res.status}`);
  }

  return res.json();
};

/**
 * Fetch full detail (with contact info) for a single item.
 */
export const fetchItemDetail = async (
  type: 'school' | 'union',
  school?: string,
  org?: string
): Promise<DetailResponse<SchoolInfo | UnionInfo>> => {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'detail',
      type,
      school: school || '',
      org: org || ''
    })
  });

  if (res.status === 429) {
    throw new Error('RATE_LIMITED');
  }

  if (!res.ok) {
    throw new Error(`Detail API Error: ${res.status}`);
  }

  return res.json();
};

export const processMarkdownContent = (content: string, basePath: string) => {
  return removeFrontmatter(content);
};