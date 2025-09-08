#!/usr/bin/env node

import { Command } from 'commander';
import { scrapeWebsite } from './scraper';

const program = new Command();

program
  .name('web-scraper')
  .description('A web scraping tool built with TypeScript and Cheerio')
  .version('1.0.0');

program
  .option('-u, --url <url>', 'URL to scrape')
  .option('-o, --output <file>', 'Output file path', 'output.json')
  .option('-v, --verbose', 'Enable verbose logging')
  .action(async (options) => {
    if (!options.url) {
      console.error('Error: URL is required. Use --url <url>');
      process.exit(1);
    }

    try {
      console.log(`Scraping URL: ${options.url}`);
      if (options.verbose) {
        console.log(`Output file: ${options.output}`);
      }

      // Call your scraper function here
      await scrapeWebsite(options.url, options.output);
      
      console.log('Scraping completed successfully!');
    } catch (error) {
      console.error('Error:', error);
      process.exit(1);
    }
  });

program.parse();