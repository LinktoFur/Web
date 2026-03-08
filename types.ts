export interface Article {
    path: string;
    name: string;
    content: string;
}

export interface SchoolInfo {
    school: string;
    org: string;
    contact: string;
    region: string;
    article?: Article;
}

export interface UnionInfo {
    org: string;
    contact: string;
    intro: string;
}

// Search results (no contact info)
export interface SchoolSearchResult {
    school: string;
    org: string;
    region: string;
}

export interface UnionSearchResult {
    org: string;
    intro: string;
}

export interface SearchResponse<T> {
    results: T[];
    total: number;
    page: number;
    hasMore: boolean;
}

export interface DetailResponse<T> {
    found: boolean;
    data?: T;
}

export interface ApiFolderResponse {
    folders: { path: string }[];
}

export interface ApiArticleResponse {
    articles: Article[];
}

export type SearchCategory = 'school' | 'union';

export interface Contributor {
    name: string;
    title: string;
    avatar: string;
    link: string;
}