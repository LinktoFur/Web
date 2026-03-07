import { fontSplit } from '@konghayao/cn-font-split';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
    console.log("Starting font split...");
    await fontSplit({
        FontPath: path.resolve(__dirname, 'public/OPPO Sans 4.0.ttf'),
        destFold: path.resolve(__dirname, 'public/fonts/oppo-sans'),
        css: {
            fontFamily: 'OPPO Sans'
        }
    });
    console.log("Font split done!");
}

run().catch(console.error);
