#!/usr/bin/env node
import { Command } from "commander";
import axios from "axios";
import * as cheerio from "cheerio";
import fs from "fs";
class WebScraper {
  constructor(url) {
    this.url = url;
  }
  async scrape() {
    try {
      console.log(`Scraping: ${this.url}`);
      const response = await axios.get(this.url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        },
        timeout: 1e4
      });
      const $ = cheerio.load(response.data);
      const scrapedData = {
        title: $("title").text().trim() || "No title found",
        headings: [],
        links: [],
        paragraphs: [],
        images: []
      };
      const tradeNameDetails = this.extractTradeNameDetails($);
      if (tradeNameDetails) {
        scrapedData.tradeNameDetails = tradeNameDetails;
      }
      $("h1, h2, h3, h4, h5, h6").each((_, element) => {
        const heading = $(element).text().trim();
        if (heading) {
          scrapedData.headings.push(heading);
        }
      });
      $("a[href]").each((_, element) => {
        const text = $(element).text().trim();
        const href = $(element).attr("href");
        if (text && href) {
          scrapedData.links.push({ text, href });
        }
      });
      $("p").each((_, element) => {
        const paragraph = $(element).text().trim();
        if (paragraph) {
          scrapedData.paragraphs.push(paragraph);
        }
      });
      $("img[src]").each((_, element) => {
        const src = $(element).attr("src");
        const alt = $(element).attr("alt") || "";
        if (src) {
          scrapedData.images.push({ src, alt });
        }
      });
      return scrapedData;
    } catch (error) {
      console.error("Error scraping website:", error);
      throw error;
    }
  }
  extractTradeNameDetails($) {
    const table = $("table.table.table-bordered.table-condensed");
    if (table.length === 0) {
      return null;
    }
    const details = {};
    table.find("tbody tr").each((_, row) => {
      const cells = $(row).find("td");
      if (cells.length >= 2) {
        const label = $(cells[0]).text().trim().toLowerCase();
        const value = $(cells[1]).text().trim();
        switch (label) {
          case "county":
            details.county = value;
            break;
          case "status":
            details.status = value;
            break;
          case "trade name":
            details.trade_name = value;
            break;
          case "file number":
            details.file_number = value;
            break;
          case "formation date":
            details.formation_date = value;
            break;
          case "filed date":
            details.filed_date = value;
            break;
          case "address 1":
            details.address_1 = value;
            break;
          case "address 2":
            details.address_2 = value;
            break;
          case "city":
            details.city = value;
            break;
          case "state":
            details.state = value;
            break;
          case "zip code":
            details.zip_code = value;
            break;
          case "phone":
            details.phone = value;
            break;
          case "affiant":
            details.affiant = value;
            break;
          case "affiant title":
            details.affiant_title = value;
            break;
          case "parent company":
            details.parent_company = value;
            break;
          case "nature of business":
            details.nature_of_business = value;
            break;
          case "termination date":
            details.termination_date = value;
            break;
          case "last updated on":
            details.last_updated_on = value;
            break;
        }
      }
    });
    if (Object.keys(details).length > 0) {
      return {
        county: details.county || "",
        status: details.status || "",
        trade_name: details.trade_name || "",
        file_number: details.file_number || "",
        formation_date: details.formation_date || "",
        filed_date: details.filed_date || "",
        address_1: details.address_1 || "",
        address_2: details.address_2 || "",
        city: details.city || "",
        state: details.state || "",
        zip_code: details.zip_code || "",
        phone: details.phone || "",
        affiant: details.affiant || "",
        affiant_title: details.affiant_title || "",
        parent_company: details.parent_company || "",
        nature_of_business: details.nature_of_business || "",
        termination_date: details.termination_date || "",
        last_updated_on: details.last_updated_on || ""
      };
    }
    return null;
  }
  // Method to scrape and save to JSON file
  async scrapeAndSave(outputPath) {
    try {
      const data = await this.scrape();
      console.log("\n=== SCRAPING RESULTS ===");
      console.log(`Title: ${data.title}`);
      console.log(`
Headings found: ${data.headings.length}`);
      data.headings.forEach((heading, index) => {
        console.log(`  ${index + 1}. ${heading}`);
      });
      console.log(`
Links found: ${data.links.length}`);
      data.links.slice(0, 5).forEach((link, index) => {
        console.log(`  ${index + 1}. ${link.text} -> ${link.href}`);
      });
      if (data.links.length > 5) {
        console.log(`  ... and ${data.links.length - 5} more links`);
      }
      console.log(`
Paragraphs found: ${data.paragraphs.length}`);
      data.paragraphs.slice(0, 3).forEach((paragraph, index) => {
        console.log(`  ${index + 1}. ${paragraph.substring(0, 100)}${paragraph.length > 100 ? "..." : ""}`);
      });
      if (data.paragraphs.length > 3) {
        console.log(`  ... and ${data.paragraphs.length - 3} more paragraphs`);
      }
      console.log(`
Images found: ${data.images.length}`);
      data.images.slice(0, 5).forEach((image, index) => {
        console.log(`  ${index + 1}. ${image.src} (alt: ${image.alt})`);
      });
      if (data.images.length > 5) {
        console.log(`  ... and ${data.images.length - 5} more images`);
      }
      if (data.tradeNameDetails) {
        console.log("\n=== TRADE NAME DETAILS ===");
        console.log(JSON.stringify(data.tradeNameDetails, null, 2));
      }
      if (outputPath) {
        fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
        console.log(`
Data saved to: ${outputPath}`);
      }
    } catch (error) {
      console.error("Error in scrapeAndSave:", error);
      throw error;
    }
  }
}
async function scrapeWebsite(url, outputFile) {
  const scraper = new WebScraper(url);
  try {
    const data = await scraper.scrape();
    if (outputFile) {
      fs.writeFileSync(outputFile, JSON.stringify(data, null, 2));
    }
    return data;
  } catch (error) {
    console.error("Error in scrapeWebsite:", error);
    return null;
  }
}
const program = new Command();
program.name("web-scraper").description("A web scraping tool built with TypeScript and Cheerio").version("1.0.0");
program.option("-u, --url <url>", "URL to scrape").option("-o, --output <file>", "Output file path", "output.json").option("-v, --verbose", "Enable verbose logging").action(async (options) => {
  if (!options.url) {
    console.error("Error: URL is required. Use --url <url>");
    process.exit(1);
  }
  try {
    console.log(`Scraping URL: ${options.url}`);
    if (options.verbose) {
      console.log(`Output file: ${options.output}`);
    }
    await scrapeWebsite(options.url, options.output);
    console.log("Scraping completed successfully!");
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
});
program.parse();
