# Web Scraper CLI Tool

A TypeScript-based web scraper with a command-line interface using Cheerio, Commander.js, and Vite for compilation.

## Features

- **CLI Interface**: Easy-to-use command-line tool with Commander.js
- **TypeScript**: Fully typed web scraper with interfaces
- **Cheerio**: Fast, flexible server-side HTML parsing
- **Axios**: HTTP client for fetching web pages
- **Vite**: Modern build tool for fast compilation
- **Comprehensive Scraping**: Extracts titles, headings, links, paragraphs, and images

## Installation

```bash
npm install
```

## Usage

### Build the project
```bash
npm run build
```

### CLI Usage
```bash
# Basic usage - scrape a URL
node ./dist/index.js --url https://courts.delaware.gov/tradenames/details.aspx?id=636000

# Save to custom output file
node ./dist/index.js --url https://courts.delaware.gov/tradenames/details.aspx?id=636000 --output github_data.json

# Enable verbose logging
node ./dist/index.js --url https://courts.delaware.gov/tradenames/details.aspx?id=636002 --verbose

# Show help
node ./dist/index.js --help

# Verification
node ./dist/index.js --verify info.json
```

NOTE: We are currently saving data into `info.json` and `signed_info.json`. So during verification, pass in the path as `info.json` and not the `output` filename you specified

## What it scrapes

The scraper extracts:
- **Page title**
- **All headings** (h1-h6)
- **Links** with text and href attributes
- **Paragraphs** of text content
- **Images** with src and alt attributes

## Output

Results are displayed in the console and optionally saved to a JSON file with the following structure:

```json
{
  "title": "Page Title",
  "headings": ["Heading 1", "Heading 2"],
  "links": [
    {"text": "Link Text", "href": "https://courts.delaware.gov/tradenames/details.aspx?id=636002"}
  ],
  "paragraphs": ["Paragraph content..."],
  "images": [
    {"src": "image.jpg", "alt": "Image description"}
  ]
}
```

## CLI Options

| Option | Alias | Description | Default |
|--------|-------|-------------|---------|
| `--url` | `-u` | URL to scrape (required) | - |
| `--output` | `-o` | Output file path | `output.json` |
| `--help` | `-h` | Show help information | - |
| `--verify` | `-V` | Verify AquaTree | - |

## Project Structure

```
dba_project/
├── src/
│   ├── index.ts           # CLI entry point with Commander.js
│   └── scraper.ts         # Main scraper implementation
├── dist/                  # Compiled JavaScript output
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── vite.config.ts        # Vite build configuration
└── README.md             # This file
```

## API

### CLI Function

```typescript
import { scrapeWebsite } from './scraper.js';

// Scrape a website and optionally save to file
const data = await scrapeWebsite('https://courts.delaware.gov/tradenames/details.aspx?id=636002', 'output.json');
```

### WebScraper Class

```typescript
import { WebScraper } from './scraper.js';

const scraper = new WebScraper('https://courts.delaware.gov/tradenames/details.aspx?id=636002');

// Get scraped data
const data = await scraper.scrape();

// Scrape and save to file
await scraper.scrapeAndSave('output.json');
```

## Dependencies

- **commander**: CLI argument parsing and help generation
- **cheerio**: Server-side HTML parsing
- **axios**: HTTP client for web requests
- **typescript**: Type checking and compilation
- **vite**: Modern build tool
