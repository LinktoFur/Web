import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, '../dist');

function removeCommentsFromJS(content) {
  let result = '';
  let inString = false;
  let stringChar = '';
  let inRegex = false;
  let i = 0;

  while (i < content.length) {
    const char = content[i];
    const nextChar = content[i + 1];

    // Handle strings
    if ((char === '"' || char === "'" || char === '`') && (i === 0 || content[i - 1] !== '\\')) {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar) {
        inString = false;
      }
      result += char;
      i++;
      continue;
    }

    // Skip if inside string
    if (inString) {
      result += char;
      i++;
      continue;
    }

    // Handle block comments
    if (char === '/' && nextChar === '*') {
      let j = i + 2;
      while (j < content.length - 1) {
        if (content[j] === '*' && content[j + 1] === '/') {
          i = j + 2;
          break;
        }
        j++;
      }
      if (j >= content.length - 1) i = content.length;
      continue;
    }

    // Handle line comments
    if (char === '/' && nextChar === '/') {
      let j = i + 2;
      while (j < content.length && content[j] !== '\n') {
        j++;
      }
      i = j;
      continue;
    }

    result += char;
    i++;
  }

  return result.replace(/\n\s*\n/g, '\n');
}

function processFile(filePath) {
  if (!filePath.endsWith('.js') && !filePath.endsWith('.html')) return;
  
  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    
    if (filePath.endsWith('.js')) {
      content = removeCommentsFromJS(content);
    } else if (filePath.endsWith('.html')) {
      content = content.replace(/<script[^>]*>([\s\S]*?)<\/script>/g, (match, scriptContent) => {
        const cleaned = removeCommentsFromJS(scriptContent);
        return `<script>${cleaned}</script>`;
      });
    }
    
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`✓ Processed: ${filePath}`);
  } catch (err) {
    console.error(`✗ Error processing ${filePath}:`, err.message);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      walkDir(filePath);
    } else {
      processFile(filePath);
    }
  });
}

if (fs.existsSync(distDir)) {
  console.log('Removing comments from build output...');
  walkDir(distDir);
  console.log('Done!');
} else {
  console.log('dist directory not found');
}
