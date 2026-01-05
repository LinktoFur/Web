const API = window.BASE_URL;
let articles = [];
let hideAllContacts = false;
const $ = id => document.getElementById(id);

marked.setOptions({ breaks: true, gfm: true });

// 加载公告
(async () => {
  try {
    const response = await fetch(API + 'announce.md');
    if (response.ok) {
      const content = await response.text();
      const announcementWrap = $('announcementWrap');
      const announcementContent = $('announcementContent');
      if (content.trim()) {
        announcementContent.innerHTML = marked.parse(content);
        announcementWrap.style.display = 'block';
      }
    }
  } catch (e) {
    // 公告加载失败，不显示
  }
})();

(async () => {
  try {
    const response = await fetch(API + 'hide.txt');
    const content = await response.text();
    hideAllContacts = content.trim().toLowerCase() === 'true';
  } catch (e) {
    hideAllContacts = false;
  }
})();

const theme = localStorage.getItem('theme') || 'dark';
document.documentElement.dataset.theme = theme;
$('moonIcon').style.display = theme === 'dark' ? 'block' : 'none';
$('sunIcon').style.display = theme === 'light' ? 'block' : 'none';

$('themeToggle').onclick = () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  localStorage.setItem('theme', next);
  $('moonIcon').style.display = next === 'dark' ? 'block' : 'none';
  $('sunIcon').style.display = next === 'light' ? 'block' : 'none';
};

const navLinks = document.querySelectorAll('.nav-link');
const pages = { home: $('homePage'), docs: $('docsPage'), about: $('aboutPage') };

function showPage(pageName) {
  navLinks.forEach(l => l.classList.toggle('active', l.dataset.page === pageName));
  Object.entries(pages).forEach(([name, el]) => el.classList.toggle('active', name === pageName));
  if (pageName === 'docs') loadDoc('charter');
  if (pageName === 'about') loadAbout();
}

navLinks.forEach(link => {
  link.onclick = () => showPage(link.dataset.page);
});

const docBtns = document.querySelectorAll('.docs-nav-btn');
docBtns.forEach(btn => {
  btn.onclick = () => {
    docBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    loadDoc(btn.dataset.doc);
  };
});

function fixRelativeUrls(html, basePath) {
  return html
    .replace(/src="\.\/([^"]+)"/g, 'src="' + API + basePath + '$1"')
    .replace(/src="\.\.\/([^"]+)"/g, 'src="' + API + '$1"')
    .replace(/href="\.\/([^"]+)"/g, 'href="' + API + basePath + '$1"')
    .replace(/href="\.\.\/([^"]+)"/g, 'href="' + API + '$1"');
}

function processHtmlTags(html) {
  return html.replace(/<center>([^<]*(?:\*\*[^*]+\*\*[^<]*)*)<\/center>/gi, (match, inner) => {
    let processed = inner.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    processed = processed.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    return '<center>' + processed + '</center>';
  });
}

function renderMarkdown(content, basePath) {
  let html = marked.parse(content);
  html = processHtmlTags(html);
  html = fixRelativeUrls(html, basePath);
  return html;
}

function loadDoc(docType) {
  const docsBody = $('docsBody');
  docsBody.innerHTML = '加载中...';
  docBtns.forEach(b => b.classList.toggle('active', b.dataset.doc === docType));
  const file = docType === 'charter' ? 'joinus/charter.md' : 'disclaimer.md';
  const basePath = docType === 'charter' ? 'joinus/' : '';
  fetch(API + file).then(r => r.text()).then(content => {
    docsBody.innerHTML = renderMarkdown(removeFrontmatter(content), basePath);
  }).catch(() => {
    docsBody.innerHTML = '<p>加载失败</p>';
  });
}

function loadAbout() {
  const aboutBody = $('aboutBody');
  aboutBody.innerHTML = '加载中...';
  fetch(API + 'aboutus.md').then(r => r.text()).then(content => {
    let html = renderMarkdown(removeFrontmatter(content), '');
    
    const contributors = [
      { name: 'Moko', title: '站长&编辑', avatar: 'moko.png', link: 'https://github.com/mybear123' },
      { name: '乔伊Joe', title: '开源贡献者', avatar: 'joe.png', link: 'https://github.com/Joe-REAL-0' },
      { name: '狼牙', title: '全栈开发', avatar: 'langya.png', link: 'https://github.com/LangYa466' },
      { name: '蛇蛇', title: '预备志愿者', avatar: 'snake.png', link: 'https://space.bilibili.com/422589383' },
    ];
    
    const cardsHtml = '<div style="display:flex;gap:20px;justify-content:center;margin:20px 0;flex-wrap:wrap" class="contributor-cards-container">' + 
      contributors.map(c => `
        <a href="${c.link}" target="_blank" rel="noopener noreferrer" class="contributor-card">
          <div class="contributor-card-inner">
            <img src="${API}${c.avatar}" alt="${c.name}" style="width:120px;height:120px;border-radius:50%;object-fit:cover;margin-bottom:10px;border:2px solid var(--c-border)">
            <p style="margin:5px 0;font-weight:600;color:var(--c-text)">${c.name}</p>
            <p style="margin:5px 0;font-size:14px;color:var(--c-text-2)">${c.title}</p>
          </div>
        </a>
      `).join('') + 
      '</div>';
    
    html = html.replace(/<em>.*?四个flex.*?<\/em>/s, cardsHtml);
    html = html.replace(/四个flex/g, cardsHtml);
    aboutBody.innerHTML = html;
  }).catch(() => {
    aboutBody.innerHTML = '<p>加载失败</p>';
  });
}

function loadRules() {
  const rulesBody = $('rulesBody');
  rulesBody.innerHTML = getJoinRulesHtml();
}

function handleRoute() {
  const path = window.location.pathname;
  if (path === '/disclaimer' || path === '/disclaimer/') {
    showPage('docs');
    setTimeout(() => loadDoc('disclaimer'), 100);
  } else if (path === '/aboutus' || path === '/aboutus/') {
    showPage('about');
  } else if (path === '/docs' || path === '/docs/') {
    showPage('docs');
  }
}
handleRoute();

function parseFrontmatter(content) {
  let match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) match = content.match(/^---([^-][\s\S]*?)---\r?\n?/);
  if (!match) return { frontmatter: {}, content };
  const fm = {};
  match[1].split(/\r?\n/).forEach(line => {
    const idx = line.indexOf(':');
    if (idx > 0) { fm[line.slice(0, idx).trim()] = line.slice(idx + 1).trim(); }
  });
  return { frontmatter: fm, content: content.slice(match[0].length) };
}

function removeFrontmatter(content) { return parseFrontmatter(content).content; }

function getTitle(content, filename) {
  const cleaned = removeFrontmatter(content).replace(/\r\n/g, '\n');
  const match = cleaned.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : filename.replace('.md', '');
}

function escapeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

fetch(API + 'api.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
  .then(r => r.json()).then(data => {
    const folders = data.folders || [];
    const topFolders = folders.filter(f => f.path && !f.path.includes('/'));
    const requests = [
      fetch(API + 'api.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ category: '' }) }).then(r => r.json()).catch(e => ({ articles: [] })),
      ...topFolders.map(f => fetch(API + 'api.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ category: f.path }) }).then(r => r.json()).catch(e => ({ articles: [] })))
    ];
    Promise.all(requests).then(results => {
      const loaded = {};
      results.forEach(d => {
        if (d.articles) d.articles.forEach(a => {
          const key = a.path + '/' + a.name;
          if (!loaded[key]) { loaded[key] = true; articles.push({ path: a.path || '', name: a.name, content: a.content }); }
        });
      });
    });
  }).catch(err => {
    console.error('加载文件夹失败:', err);
  });

const searchInput = $('searchInput');
const searchResults = $('searchResults');
let timer;
let currentCategory = 'school';

const customCategorySelect = $('customCategorySelect');
const categoryDropdown = $('categoryDropdown');
const categoryLabel = $('categoryLabel');
const categoryOptions = categoryDropdown.querySelectorAll('.custom-select-option');

customCategorySelect.onclick = () => {
  categoryDropdown.classList.toggle('show');
};

categoryOptions.forEach(option => {
  option.onclick = () => {
    const value = option.dataset.value;
    currentCategory = value;
    categoryLabel.textContent = option.textContent;
    categoryOptions.forEach(o => o.classList.remove('selected'));
    option.classList.add('selected');
    categoryDropdown.classList.remove('show');
    const q = searchInput.value.trim();
    if (q.length >= 1) search(q);
  };
});

document.onclick = e => {
  if (!e.target.closest('.search-wrap') && !e.target.closest('.custom-select-wrapper')) {
    searchResults.classList.remove('show');
    categoryDropdown.classList.remove('show');
  }
};

searchInput.oninput = e => {
  clearTimeout(timer);
  const q = e.target.value.trim();
  if (q.length < 1) { searchResults.classList.remove('show'); return; }
  timer = setTimeout(() => search(q), 150);
};
searchInput.onfocus = () => { if (searchInput.value.trim().length >= 1) search(searchInput.value.trim()); };

function isSearchable(article, category) {
  if (category === 'union') return article.name === 'unions.md' && article.path === '';
  if (!article.path) return false;
  return article.path.startsWith('pages') && !article.path.includes('联合群');
}

function parseSchoolTable(content) {
  const schools = [];
  content.split('\n').forEach(line => {
    line = line.trim();
    if (!line.startsWith('|') || line.includes(':----:') || line.includes('院校')) return;
    const cells = line.split('|').map(c => c.trim()).filter(c => c);
    if (cells.length >= 3) {
      const school = cells[0].replace(/\*\*/g, '').trim();
      const org = cells[1].replace(/\*\*/g, '').trim();
      const contact = cells[2].replace(/\*\*/g, '').trim();
      if (school && org) schools.push({ school, org, contact });
    }
  });
  return schools;
}

function parseUnionTable(content) {
  const unions = [];
  content.split('\n').forEach(line => {
    line = line.trim();
    if (!line.startsWith('|') || line.includes(':----:') || line.includes('组织名字')) return;
    const cells = line.split('|').map(c => c.trim()).filter(c => c);
    if (cells.length >= 2) {
      const org = cells[0].replace(/\*\*/g, '').trim();
      const contact = cells[1].replace(/\*\*/g, '').trim();
      const intro = cells.length >= 3 ? cells[2].replace(/\*\*/g, '').trim() : '';
      if (org) unions.push({ org, contact, intro });
    }
  });
  return unions;
}

let schoolIndex = [];
let unionIndex = [];

function buildSchoolIndex(category) {
  schoolIndex = [];
  articles.forEach(a => {
    if (!isSearchable(a, category)) return;
    const region = getTitle(a.content, a.name);
    parseSchoolTable(a.content).forEach(s => schoolIndex.push({ ...s, region, article: a }));
  });
}

function buildUnionIndex() {
  unionIndex = [];
  const unionArticle = articles.find(a => a.name === 'unions.md' && a.path === '');
  if (unionArticle) {
    parseUnionTable(unionArticle.content).forEach(u => unionIndex.push(u));
  }
}

const joinRulesText = `*原条目：[《成员公约》](/charter)*

一、 本企划仅接受以Furry同好主题相关的组织加入。

二、 高校组织加入本项目并且参与信息登记的条件是：
1. 有加入本项目的意愿；
2. 具有高校背景*；
3. 有明确的负责人代表其组织，并有对Furry一定程度的理解；
4. 组织成员至少达到3人;
5. **申请的群聊应遵循法律法规，不得传播违法信息;**
6. **填写联系方式的人须加入高校兽迷同好汇的QQ群878487713以方便获取联系。**；
7. 同意本网站的[免责声明](/disclaimer)；
8. 您知晓并同意，在本企划任何范围内不得就任何方面歧视、贬低其它院校。
9. 若加入的高校组织若决定自行退出，需通知相关的志愿者，并且删除相关的现在正在合作的声明，或声明合作已经终止。`;

function getJoinRulesHtml() {
  let html = marked.parse(joinRulesText);
  html = html.replace(/href="\/disclaimer"/g, 'href="javascript:void(0)" onclick="goToDisclaimer()"');
  html = html.replace(/href="\/charter"/g, 'href="javascript:void(0)" onclick="goToCharter()"');
  return html;
}

window.goToDisclaimer = function() {
  rulesModal.classList.remove('show');
  showPage('docs');
  setTimeout(() => loadDoc('disclaimer'), 100);
};

window.goToCharter = function() {
  rulesModal.classList.remove('show');
  showPage('docs');
  setTimeout(() => loadDoc('charter'), 100);
};

function search(q) {
  const category = currentCategory;
  const lq = q.toLowerCase();
  
  if (category === 'union') {
    buildUnionIndex();
    const results = unionIndex.filter(u => u.org.toLowerCase().includes(lq));
    if (!results.length) {
      searchResults.innerHTML = '<div class="no-result"><span class="no-result-link" onclick="showRulesModal()">没有找到相关联合群，欢迎填写信息表</span></div>';
    } else {
      searchResults.innerHTML = results.slice(0, 15).map((r, i) => {
        const orgHtml = r.org.replace(new RegExp('(' + escapeRegex(q) + ')', 'gi'), '<mark>$1</mark>');
        return '<div class="result-item" data-i="' + i + '"><div class="result-title">' + orgHtml + '</div><div class="result-preview">' + (r.intro || '地区联合群') + '</div></div>';
      }).join('');
      const resRef = results;
      searchResults.querySelectorAll('.result-item').forEach((el, i) => { el.onclick = () => showUnionInfo(resRef[i]); });
    }
  } else {
    buildSchoolIndex(category);
    const results = schoolIndex.filter(s => s.school.toLowerCase().includes(lq) || s.org.toLowerCase().includes(lq));
    if (!results.length) {
      searchResults.innerHTML = '<div class="no-result"><span class="no-result-link" onclick="showRulesModal()">没有找到相关院校的组织，如你是该院校组织的管理员，欢迎填写信息表</span></div>';
    } else {
      searchResults.innerHTML = results.slice(0, 15).map((r, i) => {
        const schoolHtml = r.school.replace(new RegExp('(' + escapeRegex(q) + ')', 'gi'), '<mark>$1</mark>');
        const orgHtml = r.org.replace(new RegExp('(' + escapeRegex(q) + ')', 'gi'), '<mark>$1</mark>');
        return '<div class="result-item" data-i="' + i + '"><div class="result-title">' + schoolHtml + '</div><div class="result-preview">' + orgHtml + ' · ' + r.region + '</div></div>';
      }).join('');
      const resRef = results;
      searchResults.querySelectorAll('.result-item').forEach((el, i) => { el.onclick = () => showSchoolInfo(resRef[i]); });
    }
  }
  searchResults.classList.add('show');
}

const modalOverlay = $('modalOverlay');
const modalTitle = $('modalTitle');
const modalBody = $('modalBody');
const rulesModal = $('rulesModal');

function showSchoolInfo(info) {
  modalTitle.textContent = info.school;
  const contactHtml = info.contact.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, url) => {
    if (url.startsWith('./')) {
      url = API + info.article.path + '/' + url.slice(2);
    } else if (url.startsWith('../')) {
      const pathParts = info.article.path.split('/');
      pathParts.pop();
      url = API + pathParts.join('/') + '/' + url.slice(3);
    }
    return '<a href="' + url + '" target="_blank" rel="noopener noreferrer" style="color:var(--c-brand)">' + text + '</a>';
  });
  
  const firstLine = info.article.content.split('\n')[0].trim();
  const shouldHideContact = hideAllContacts || firstLine.includes('#hide');
  
  let html = '<div style="line-height:2"><p><strong>院校：</strong>' + info.school + '</p><p><strong>组织：</strong>' + info.org + '</p>';
  if (shouldHideContact) {
    html += '<p><strong>联系方式：</strong>暂无</p>';
  } else {
    html += '<p><strong>联系方式：</strong>' + contactHtml + '</p>';
  }
  html += '<p><strong>地区：</strong>' + info.region + '</p></div>';
  
  modalBody.innerHTML = html;
  modalOverlay.classList.add('show');
  searchResults.classList.remove('show');
}

function showUnionInfo(info) {
  modalTitle.textContent = info.org;
  const contactHtml = info.contact.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, url) => {
    if (url.startsWith('./')) {
      url = API + url.slice(2);
    } else if (url.startsWith('../')) {
      url = API + url.slice(3);
    }
    return '<a href="' + url + '" target="_blank" rel="noopener noreferrer" style="color:var(--c-brand)">' + text + '</a>';
  });
  
  let html = '<div style="line-height:2"><p><strong>组织名字：</strong>' + info.org + '</p>';
  if (hideAllContacts) {
    html += '<p><strong>联系方式：</strong>暂无</p>';
  } else {
    html += '<p><strong>联系方式：</strong>' + contactHtml + '</p>';
  }
  html += (info.intro ? '<p><strong>组织介绍：</strong>' + info.intro + '</p>' : '') + '</div>';
  
  modalBody.innerHTML = html;
  modalOverlay.classList.add('show');
  searchResults.classList.remove('show');
}

window.showRulesModal = function() {
  loadRules();
  rulesModal.classList.add('show');
  searchResults.classList.remove('show');
};

$('modalClose').onclick = () => modalOverlay.classList.remove('show');
$('rulesClose').onclick = () => rulesModal.classList.remove('show');
modalOverlay.onclick = e => { if (e.target === modalOverlay) modalOverlay.classList.remove('show'); };
rulesModal.onclick = e => { if (e.target === rulesModal) rulesModal.classList.remove('show'); };
document.onkeydown = e => { if (e.key === 'Escape') { modalOverlay.classList.remove('show'); rulesModal.classList.remove('show'); } };
$('footerYear').textContent = new Date().getFullYear();
