/// <reference types="vite/client" />
import { ApiFolderResponse, ApiArticleResponse, Article, SchoolInfo, UnionInfo } from '../types';

// In development, use relative path to trigger Vite proxy (solves CORS).
// In production, use the real URL.
const BASE_URL = import.meta.env.DEV ? '/api/' : 'https://moke.furry.luxe/';
const API_URL = `${BASE_URL}api.php`;

export const getAssetUrl = (path: string) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  if (path.startsWith('/')) return `${BASE_URL}${path.substring(1)}`;
  return `${BASE_URL}${path}`;
};

// Helper to remove frontmatter (YAML-like metadata at top of MD files)
const removeFrontmatter = (content: string): string => {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (match) {
    return content.slice(match[0].length);
  }
  return content;
};

const getTitle = (content: string, filename: string): string => {
  const cleaned = removeFrontmatter(content).replace(/\r\n/g, '\n');
  const match = cleaned.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : filename.replace('.md', '');
};

const parseSchoolTable = (content: string): Omit<SchoolInfo, 'region' | 'article'>[] => {
  const schools: Omit<SchoolInfo, 'region' | 'article'>[] = [];
  content.split('\n').forEach(line => {
    line = line.trim();
    if (!line.startsWith('|') || line.includes(':----:') || line.includes('院校')) return;
    const cells = line.split('|').map(c => c.trim()).filter(c => c);
    if (cells.length >= 3) {
      const school = cells[0]?.replace(/\*\*/g, '').trim() || '';
      const org = cells[1]?.replace(/\*\*/g, '').trim() || '';
      const contact = cells[2]?.replace(/\*\*/g, '').trim() || '';
      if (school && org) schools.push({ school, org, contact });
    }
  });
  return schools;
};

const parseUnionTable = (content: string): UnionInfo[] => {
  const unions: UnionInfo[] = [];
  content.split('\n').forEach(line => {
    line = line.trim();
    if (!line.startsWith('|') || line.includes(':----:') || line.includes('组织名字')) return;
    const cells = line.split('|').map(c => c.trim()).filter(c => c);
    if (cells.length >= 2) {
      const org = cells[0]?.replace(/\*\*/g, '').trim() || '';
      const contact = cells[1]?.replace(/\*\*/g, '').trim() || '';
      const intro = cells.length >= 3 ? (cells[2]?.replace(/\*\*/g, '').trim() || '') : '';
      if (org) unions.push({ org, contact, intro });
    }
  });
  return unions;
};

export const fetchGlobalData = async () => {
  try {
    // 1. Fetch hide status
    // Add cache busting or simple headers if needed, but usually basic fetch is fine
    const hideResponse = await fetch(`${BASE_URL}hide.txt`);
    const hideText = await hideResponse.text();
    const hideAllContacts = hideText.trim().toLowerCase() === 'true';

    // 2. Fetch announcement
    let announcement = '';
    try {
      const annResponse = await fetch(`${BASE_URL}announce.md`);
      if (annResponse.ok) announcement = await annResponse.text();
    } catch (e) { console.warn('No announcement found'); }

    // 3. Fetch Folders
    const folderRes = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
    });
    
    if (!folderRes.ok) throw new Error(`API Error: ${folderRes.status}`);

    const folderData: ApiFolderResponse = await folderRes.json();
    const topFolders = (folderData.folders || []).filter(f => f.path && !f.path.includes('/'));

    // 4. Fetch Articles in parallel
    const requests = [
        fetch(API_URL, { method: 'POST', body: JSON.stringify({ category: '' }) }).then(r => r.json()).catch(() => ({ articles: [] })),
        ...topFolders.map(f => fetch(API_URL, { method: 'POST', body: JSON.stringify({ category: f.path }) }).then(r => r.json()).catch(() => ({ articles: [] })))
    ];

    const results = await Promise.all(requests);
    
    // 5. Process Articles
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

    // 6. Build Indexes
    const schools: SchoolInfo[] = [];
    const unions: UnionInfo[] = [];

    articles.forEach(a => {
        // Unions
        if (a.name === 'unions.md' && a.path === '') {
            unions.push(...parseUnionTable(a.content));
        }
        // Schools
        else if (a.path.startsWith('pages') && !a.path.includes('联合群')) {
             const region = getTitle(a.content, a.name);
             const schoolRows = parseSchoolTable(a.content);
             schoolRows.forEach(row => {
                 schools.push({ ...row, region, article: a });
             });
        }
    });

    return {
        hideAllContacts,
        announcement,
        schools,
        unions,
        articles // Return raw articles for About/Docs/Disclaimer
    };

  } catch (error) {
    console.error("Failed to fetch data", error);
    // Return empty data instead of crashing if possible, or let the UI handle the error
    throw error;
  }
};

export const processMarkdownContent = (content: string, basePath: string) => {
    return removeFrontmatter(content);
};