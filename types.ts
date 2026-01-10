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
    article: Article;
}
  
export interface UnionInfo {
    org: string;
    contact: string;
    intro: string;
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