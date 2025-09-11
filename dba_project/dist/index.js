#!/usr/bin/env node
import { Command } from "commander";
import Aquafier, { LogTypeEmojis, getGenesisHash, OrderRevisionInAquaTree } from "aqua-js-sdk";
import fs from "fs";
import axios from "axios";
import * as cheerio from "cheerio";
const mnemonic = "mail ignore situate guard glove physical gaze scale they trouble chunk sock";
const nostr_sk = "bab92dda770b41ffb8afa623198344f44950b5b9c3e83f6b36ad08977b783d55";
const did_key = "2edfed1830e9db59438c65b63a85c73a1aea467e8a84270d242025632e04bb65";
const alchemy_key = "ZaQtnup49WhU7fxrujVpkFdRz4JaFRtZ";
const witness_eth_network = "sepolia";
const witness_eth_platform = "metamask";
const witness_method = "cli";
const Credentials = {
  mnemonic,
  nostr_sk,
  did_key,
  alchemy_key,
  witness_eth_network,
  witness_eth_platform,
  witness_method
};
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
async function createDBAClaim(dbaInfo, url) {
  const aquafier = new Aquafier();
  const fileContent = JSON.stringify({ ...dbaInfo, url, delegated_addresses: "0xD36AAf65a91bB7dc69942cF6B6d1dBa4Ef171664,0xD36AAf65a91bB7dc69942cF6B6d1dBa4Ef171664", type: "dba_claim" }, null, 4);
  const fileObject = {
    fileName: "info.json",
    fileContent,
    path: "./info.json"
  };
  const genesisRevisionRes = await aquafier.createGenesisRevision(fileObject, true, false, false);
  if (genesisRevisionRes.isOk()) {
    const aquaTree = genesisRevisionRes.data.aquaTree;
    const aquaTreeWrapper = {
      aquaTree,
      revision: "",
      fileObject
    };
    const credentials = Credentials;
    const signRes = await aquafier.signAquaTree(aquaTreeWrapper, "cli", credentials, true);
    if (signRes.isOk()) {
      console.log("Signed AquaTree successfully");
      fs.writeFileSync("./info.json", fileContent);
      fs.writeFileSync("./signed_info.json", JSON.stringify(signRes.data.aquaTree, null, 4));
    }
  }
}
async function verifyDomain(url) {
  try {
    const { hostname } = new URL(url);
    const response = await fetch(`https://cloudflare-dns.com/dns-query?name=${hostname}&type=DS`, {
      headers: { "accept": "application/dns-json" }
    });
    if (!response.ok) return false;
    const data = await response.json();
    return Array.isArray(data.Answer) && data.Answer.length > 0;
  } catch (e) {
    return false;
  }
}
async function verifyDBAClaimLayerOne(aquaTreeWrapper) {
  const aquafier = new Aquafier();
  const res = await aquafier.verifyAquaTree(aquaTreeWrapper.aquaTree, [aquaTreeWrapper.fileObject], Credentials);
  if (res.isOk()) {
    console.log("\n\nVerification Layer 1");
    console.log("✅ AquaTree verified successfully");
    console.log("Verification logs\n========\n");
    for (const log of res.data.logData) {
      const emoji = LogTypeEmojis[log.logType];
      console.log(`${emoji} ${log.log}`);
    }
    console.log("========\n");
  } else {
    console.log("❌ AquaTree verification failed");
    console.log("Verification logs\n========\n");
    for (const log of res.data) {
      const emoji = LogTypeEmojis[log.logType];
      console.log(`${emoji} ${log.log}`);
    }
    console.log("========\n");
  }
}
async function verifyDataAgainstNewData(infoJsonData) {
  console.log("\nVerifying claim data vs website data");
  const newData = await scrapeWebsite(infoJsonData.url);
  if (!newData) return;
  const newInfo = {
    ...newData.tradeNameDetails,
    url: infoJsonData.url
  };
  const orderedKeysOld = Object.keys(infoJsonData).sort();
  const orderedKeysNew = Object.keys(newInfo).sort();
  if (orderedKeysOld.length !== orderedKeysNew.length) {
    console.log("❌ Data verification failed.");
    console.log("Keys do not match");
    console.log("Old keys:", orderedKeysOld);
    console.log("New keys:", orderedKeysNew);
  } else {
    let errorsCount = 0;
    for (let i = 0; i < orderedKeysOld.length; i++) {
      const key = orderedKeysOld[i];
      if (infoJsonData[key] !== newInfo[key]) {
        errorsCount++;
        console.log("❌ Key:", key);
        console.log("Old value:", infoJsonData[key]);
        console.log("New value:", newInfo[key]);
      } else {
        console.log("✅ Key:", key);
        console.log("Old value:", infoJsonData[key]);
        console.log("New value:", newInfo[key]);
        console.log("__________________\n");
      }
    }
    if (errorsCount === 0) {
      console.log("✅ Data verification passed.");
    } else {
      console.log("❌ Data verification failed.");
    }
  }
}
async function verifyDBAClaimLayerTwo(aquaTreeWrapper) {
  console.log("\n\nVerification Layer 2\n");
  const genesisHash = getGenesisHash(aquaTreeWrapper.aquaTree);
  const orderedAquatree = OrderRevisionInAquaTree(aquaTreeWrapper.aquaTree);
  const aquaTreeRevisionsHashes = Object.keys(orderedAquatree.revisions);
  const secondRevionsHash = aquaTreeRevisionsHashes[1];
  if (!genesisHash) return;
  const genesisRevision = aquaTreeWrapper.aquaTree.revisions[genesisHash];
  if (!genesisRevision) return;
  const domainVerified = await verifyDomain(genesisRevision["forms_url"]);
  console.log(">> Domain Verification");
  if (domainVerified) {
    console.log("✅ Domain verified successfully");
  } else {
    console.log("❌ Domain verification failed");
  }
  console.log("<------------------\n");
  console.log(">> Wallet Address Verification");
  if (secondRevionsHash) {
    const secondRevision = aquaTreeWrapper.aquaTree.revisions[secondRevionsHash];
    if (!secondRevision) {
      console.log("❌ Second revision not found");
    } else {
      if (secondRevision["signature_wallet_address"]?.toLocaleLowerCase() === genesisRevision["forms_trade_name"].toLocaleLowerCase()) {
        console.log("✅ Second revision signature_wallet_address matches first revision forms_trade_name");
      } else {
        console.log("❌ Second revision signature_wallet_address does not match first revision forms_trade_name");
      }
    }
  } else {
    console.log("❌ Second revision not found");
  }
  console.log("<------------------\n");
  const infoJsonData = {};
  const keys = Object.keys(genesisRevision);
  for (const key of keys) {
    if (key.startsWith("forms_")) {
      infoJsonData[key.replace("forms_", "")] = genesisRevision[key];
    }
  }
  await verifyDataAgainstNewData(infoJsonData);
}
async function verifyDBAClaim(aquaTreeWrapper) {
  await verifyDBAClaimLayerOne(aquaTreeWrapper);
  await verifyDBAClaimLayerTwo(aquaTreeWrapper);
}
const program = new Command();
program.name("web-scraper").description("A web scraping tool built with TypeScript and Cheerio").version("1.0.0");
program.option("-u, --url <url>", "URL to scrape").option("-o, --output <file>", "Output file path", "output.json").option("-v, --verify <file>", "Verify DBA claim").action(async (options) => {
  if (options.verify) {
    const filePath = options.verify;
    const infoJson = fs.readFileSync(`${filePath}`, "utf8");
    const aquaTree = JSON.parse(fs.readFileSync(`signed_${filePath}`, "utf8"));
    const aquaTreeWrapper = {
      aquaTree,
      fileObject: {
        fileName: "info.json",
        fileContent: infoJson,
        path: "./info.json"
      }
    };
    await verifyDBAClaim(aquaTreeWrapper);
    return;
  }
  if (options.url) {
    const data = await scrapeWebsite(options.url, options.output);
    if (data && data.tradeNameDetails) {
      createDBAClaim(data.tradeNameDetails, options.url);
    }
    return;
  }
  try {
    console.log(`Scraping URL: ${options.url}`);
    if (options.verbose) {
      console.log(`Output file: ${options.output}`);
    }
    console.log("Scraping completed successfully!");
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
});
program.parse();
