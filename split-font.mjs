import { fontSplit } from '@konghayao/cn-font-split';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
    console.log("Starting font split...");
    await fontSplit({
        FontPath: path.resolve(__dirname, 'public/LXGWWenKai-Medium.ttf'),
        destFold: path.resolve(__dirname, 'public/fonts/lxgw-wenkai'),
        css: {
            fontFamily: 'LXGW WenKai'
        }
    });
    console.log("Font split done!");
}

run().catch(console.error);
