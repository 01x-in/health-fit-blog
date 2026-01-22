import fs from 'fs';
import path from 'path';
import Parser from 'rss-parser';
import axios from 'axios';
import slugify from 'slugify';
import * as cheerio from 'cheerio';
import { fileURLToPath } from 'url';

const parser = new Parser();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read constants
const constantsPath = path.join(__dirname, 'constants.json');
const constants = JSON.parse(fs.readFileSync(constantsPath, 'utf8'));

// Paths
const contentDir = path.join(__dirname, '../src/content/blogs');

// Helper to ensure directory exists
function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

// Function to clean text
function cleanText(html) {
    if (!html) return '';
    const $ = cheerio.load(html);
    // Remove scripts, styles
    $('script').remove();
    $('style').remove();
    return $.text().trim();
}

// Main function
async function main() {
    for (const source of constants) {
        console.log(`Checking ${source.url} (${source.category})...`);
        try {
            // Fetch with Axios first to handle headers better
            const response = await axios.get(source.url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'application/rss+xml, application/xml, text/xml, */*'
                }
            });

            const feed = await parser.parseString(response.data);
            
            // Process first 3 items
            const items = feed.items.slice(0, 3);
            
            if (items.length === 0) {
                console.log(`No items found for ${source.url}`);
            }

            for (const item of items) {
                const title = item.title;
                const link = item.link;
                let content = item.content || item.summary || item.contentSnippet || '';
                
                // Clean content using Cheerio
                const $ = cheerio.load(content);
                const textContent = $('p').map((i, el) => $(el).text()).get().join('\n\n');
                
                const finalContent = textContent || cleanText(content);
                
                if (!finalContent) {
                    console.log(`Skipping ${title} (no content)`);
                    continue;
                }

                const slug = slugify(title, { lower: true, strict: true });
                const date = new Date(item.pubDate).toISOString();
                const description = finalContent.split('\n')[0].substring(0, 150) + '...';
                
                const safeTitle = title.replace(/"/g, '\\"');
                const safeDesc = description.replace(/"/g, '\\"');

                const markdown = `---
title: "${safeTitle}"
description: "${safeDesc}"
pubDate: ${date}
heroImage: ""
---

${finalContent}

[Read original article](${link})
`;

                const categoryDir = path.join(contentDir, source.category);
                ensureDir(categoryDir);
                const filePath = path.join(categoryDir, `${slug}.md`);
                
                fs.writeFileSync(filePath, markdown);
                console.log(`Saved: ${filePath}`);
            }

        } catch (error) {
            console.error(`Error processing source ${source.url}:`, error.message);
        }
    }
}

main();
