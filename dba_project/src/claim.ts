

/*
    Functions in this file help in processing DBA (Doing Business As) data.
*/

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

function createDBAClaim() {

}

function signDBAClaim() {

}

function verifyDBAClaimLayerOne() {

}

function verifyUrl() {

}

function verifyDataAgainstNewData() {

}

function verifyDBAClaimLayerTwo() {
    verifyUrl()
    verifyDataAgainstNewData()
}


function finalResultsLogging() {


}


export { createDBAClaim, signDBAClaim, verifyDBAClaimLayerOne, verifyUrl, verifyDataAgainstNewData, verifyDBAClaimLayerTwo, finalResultsLogging }