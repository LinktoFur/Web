import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { minify } from 'terser';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, '../dist');

async function processFile(filePath) {
  if (!filePath.endsWith('.js') && !filePath.endsWith('.html')) return;
  
  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    
    if (filePath.endsWith('.js')) {
      const result = await minify(content, {
        compress: false,
        mangle: false,
        format: { comments: false }
      });
      content = result.code;
    } else if (filePath.endsWith('.html')) {
      content = content.replace(/<script[^>]*>([\s\S]*?)<\/script>/g, async (match, scriptContent) => {
        const result = await minify(scriptContent, {
          compress: false,
          mangle: false,
          format: { comments: false }
        });
        return `<script>${result.code}</script>`;
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
