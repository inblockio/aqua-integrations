

/*
    Functions in this file help in processing DBA (Doing Business As) data.
*/

import Aquafier, { AquaTreeWrapper, FileObject, getGenesisHash, LogTypeEmojis, OrderRevisionInAquaTree } from "aqua-js-sdk"
import { TradeNameDetails } from "./types"
import Credentials from "./assets/credentials.json"
import fs from "fs"
import { scrapeWebsite } from "./scraper"

/*
    Create Aqua Claim
        - Scrape data and create an aquajson file
    Allow aquajson file to be signed
        - Sign the aquajson file and update the file with signature revision
    Verify Aqua Claim
        1. Layer 1 verification
            - Verify the aquajson if valid aqua chain
            - Verify the aquajson if second revision signature_wallet_address === first revision forms_trade_name
        2. Layer 2 verification
            - Verify the `forms_url` from revision 1 to make sure its a valid and right url ie DNSSEC verification
            - Using `forms_url` from revision 1, scrape the data and verify if the data matches field by field
    Final Results logging
        - Log the final results of the verification
*/


async function createDBAClaim(dbaInfo: TradeNameDetails, url: string) {
    const aquafier = new Aquafier()
    const fileContent = JSON.stringify({ ...dbaInfo, url }, null, 4)
    const fileObject: FileObject = {
        fileName: "info.json",
        fileContent,
        path: "./info.json"
    }
    const genesisRevisionRes = await aquafier.createGenesisRevision(fileObject, true, false, false)
    if (genesisRevisionRes.isOk()) {
        const aquaTree = genesisRevisionRes.data.aquaTree
        const aquaTreeWrapper: AquaTreeWrapper = {
            aquaTree: aquaTree!,
            revision: "",
            fileObject
        }
        const credentials = Credentials
        const signRes = await aquafier.signAquaTree(aquaTreeWrapper, "cli", credentials, true)
        if (signRes.isOk()) {
            console.log("Signed AquaTree successfully");
            fs.writeFileSync("./info.json", fileContent)
            fs.writeFileSync("./signed_info.json", JSON.stringify(signRes.data.aquaTree, null, 4))
        }
    }
}

async function verifyDomain(url: string): Promise<boolean> {
    try {
        // Extract hostname from URL
        const { hostname } = new URL(url);
        // Query DS record using Cloudflare DNS-over-HTTPS
        const response = await fetch(`https://cloudflare-dns.com/dns-query?name=${hostname}&type=DS`, {
            headers: { 'accept': 'application/dns-json' }
        });
        // console.log("response", response)
        if (!response.ok) return false;
        const data: any = await response.json();
        // console.log("data", data)
        // DS records present means DNSSEC is enabled
        return Array.isArray(data.Answer) && data.Answer.length > 0;
    } catch (e) {
        return false;
    }
}

// Aqua Chain verification
async function verifyDBAClaimLayerOne(aquaTreeWrapper: AquaTreeWrapper) {
    const aquafier = new Aquafier()
    const res = await aquafier.verifyAquaTree(aquaTreeWrapper.aquaTree!, [aquaTreeWrapper.fileObject!], Credentials)
    if (res.isOk()) {
        console.log("\n\nVerification Layer 1")
        console.log("✅ AquaTree verified successfully");
        console.log("Verification logs\n========\n")
        for (const log of res.data.logData) {
            const emoji = LogTypeEmojis[log.logType]
            console.log(`${emoji} ${log.log}`)
        }
        console.log("========\n")
    } else {
        console.log("❌ AquaTree verification failed");
        console.log("Verification logs\n========\n")
        for (const log of res.data) {
            const emoji = LogTypeEmojis[log.logType]
            console.log(`${emoji} ${log.log}`)
        }
        console.log("========\n")
    }
}

async function verifyDataAgainstNewData(infoJsonData: Record<string, string>) {

    console.log("\nVerifying claim data vs website data")

    const newData = await scrapeWebsite(infoJsonData.url);

    if (!newData) return

    const newInfo: Record<string, string> = {
        ...newData.tradeNameDetails,
        url: infoJsonData.url
    }

    const orderedKeysOld = Object.keys(infoJsonData).sort()
    const orderedKeysNew = Object.keys(newInfo).sort()

    if (orderedKeysOld.length !== orderedKeysNew.length) {
        console.log("❌ Data verification failed.")
        console.log("Keys do not match")
        console.log("Old keys:", orderedKeysOld)
        console.log("New keys:", orderedKeysNew)
    }
    else {
        let errorsCount = 0
        for (let i = 0; i < orderedKeysOld.length; i++) {
            const key = orderedKeysOld[i]
            if (infoJsonData[key] !== newInfo[key]) {
                errorsCount++
                // console.log("❌ Data verification failed.")
                console.log("❌ Key:", key)
                console.log("Old value:", infoJsonData[key])
                console.log("New value:", newInfo[key])
            } else {
                // console.log("✅ Data verification passed.")
                console.log("✅ Key:", key)
                console.log("Old value:", infoJsonData[key])
                console.log("New value:", newInfo[key])
                console.log("__________________\n")
            }
        }
        if (errorsCount === 0) {
            console.log("✅ Data verification passed.")
        } else {
            console.log("❌ Data verification failed.")
        }
    }

}

// Additional verification checks L2:
// Was it signed by the wallet in the template?
// Are all fields identical?
// Is the Website DNS-Sec? (Domain lookup logic)
async function verifyDBAClaimLayerTwo(aquaTreeWrapper: AquaTreeWrapper) {

    console.log("\n\nVerification Layer 2\n")

    const genesisHash = getGenesisHash(aquaTreeWrapper.aquaTree!)
    const orderedAquatree = OrderRevisionInAquaTree(aquaTreeWrapper.aquaTree!)
    const aquaTreeRevisionsHashes = Object.keys(orderedAquatree.revisions)
    const secondRevionsHash = aquaTreeRevisionsHashes[1]

    if (!genesisHash) return

    const genesisRevision = aquaTreeWrapper.aquaTree!.revisions[genesisHash]

    if (!genesisRevision) return

    const domainVerified = await verifyDomain(genesisRevision["forms_url"])

    console.log(">> Domain Verification")

    if (domainVerified) {
        console.log("✅ Domain verified successfully")
    } else {
        console.log("❌ Domain verification failed")
    }

    console.log("<------------------\n")

    console.log(">> Wallet Address Verification")

    if (secondRevionsHash) {
        const secondRevision = aquaTreeWrapper.aquaTree!.revisions[secondRevionsHash]

        if (!secondRevision) {
            console.log("❌ Second revision not found")
        } else {
            if (secondRevision["signature_wallet_address"]?.toLocaleLowerCase() === genesisRevision["forms_trade_name"].toLocaleLowerCase()) {
                console.log("✅ Second revision signature_wallet_address matches first revision forms_trade_name")
            } else {
                console.log("❌ Second revision signature_wallet_address does not match first revision forms_trade_name")
            }
        }

    } else {
        console.log("❌ Second revision not found")
    }

    console.log("<------------------\n")


    // Match data from aquajson file with data from website
    const infoJsonData: Record<string, string> = {}
    const keys = Object.keys(genesisRevision)
    for (const key of keys) {
        if (key.startsWith("forms_")) {
            infoJsonData[key.replace("forms_", "")] = genesisRevision[key]
        }
    }

    await verifyDataAgainstNewData(infoJsonData)
}

async function verifyDBAClaim(aquaTreeWrapper: AquaTreeWrapper) {
    await verifyDBAClaimLayerOne(aquaTreeWrapper)
    await verifyDBAClaimLayerTwo(aquaTreeWrapper)
}


function finalResultsLogging() {


}


export { createDBAClaim, verifyDBAClaim, verifyDBAClaimLayerOne, verifyDataAgainstNewData, verifyDBAClaimLayerTwo, finalResultsLogging }