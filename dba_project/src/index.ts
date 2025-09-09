#!/usr/bin/env node

import { Command } from 'commander';
// import { scrapeWebsite } from './scraper';
import { createDBAClaim, verifyDBAClaim } from './claim';
import fs from "fs"
import { AquaTreeWrapper } from 'aqua-js-sdk';
import { scrapeWebsite } from './scraper';

const program = new Command();

program
  .name('web-scraper')
  .description('A web scraping tool built with TypeScript and Cheerio')
  .version('1.0.0');

program
  .option('-u, --url <url>', 'URL to scrape')
  .option('-o, --output <file>', 'Output file path', 'output.json')
  // .option('-v, --verbose', 'Enable verbose logging')
  .option('-v, --verify <file>', 'Verify DBA claim')
  .action(async (options) => {

    if (options.verify) {
      const filePath = options.verify
      const infoJson = fs.readFileSync(`${filePath}`, 'utf8')
      const aquaTree = JSON.parse(fs.readFileSync(`signed_${filePath}`, 'utf8'))
      // console.log("+==========\nInfo json file\n+==========")
      // console.log(infoJson)
      // console.log("+=========end========")
      const aquaTreeWrapper: AquaTreeWrapper = {
        aquaTree,
        revision: "",
        fileObject: {
          fileName: "info.json",
          fileContent: infoJson,
          path: "./info.json"
        }
      }
      await verifyDBAClaim(aquaTreeWrapper)
      return
    }

    if (options.url) {
      // console.error('Error: URL is required. Use --url <url>');
      // process.exit(1);
      const data = await scrapeWebsite(options.url, options.output);
      if (data && data.tradeNameDetails) {
        createDBAClaim(data.tradeNameDetails, options.url)
      }
      return
    }

    try {
      console.log(`Scraping URL: ${options.url}`);
      if (options.verbose) {
        console.log(`Output file: ${options.output}`);
      }

      // Call your scraper function here
      // verifyDBAClaimLayerTwo()


      console.log('Scraping completed successfully!');
    } catch (error) {
      console.error('Error:', error);
      process.exit(1);
    }
  });

program.parse();