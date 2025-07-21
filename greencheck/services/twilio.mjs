/* ======================== services/twilio.mjs ======================== */
import twilio from 'twilio';

const {
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_VERIFY_SERVICE_SID,
} = process.env;

if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_VERIFY_SERVICE_SID) {
  console.warn('⚠️  Twilio Verify env vars missing – SMS/Email verification will fail');
}

const twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

export async function startSmsVerification(to) {
  return twilioClient.verify.v2
    .services(TWILIO_VERIFY_SERVICE_SID)
    .verifications.create({ to, channel: 'sms' });
}

export async function checkSmsVerification(to, code) {
  return twilioClient.verify.v2
    .services(TWILIO_VERIFY_SERVICE_SID)
    .verificationChecks.create({ to, code });
}

export async function startEmailVerification(to) {
  return twilioClient.verify.v2
    .services(TWILIO_VERIFY_SERVICE_SID)
    .verifications.create({ to, channel: 'email' });
}

export async function checkEmailVerification(to, code) {
  return twilioClient.verify.v2
    .services(TWILIO_VERIFY_SERVICE_SID)
    .verificationChecks.create({ to, code });
}

export async function getVerificationDetails(verificationSid) {
  const serviceID = "VA7968c724b09573b9aeea5eae641d0ac5" // TWILIO_VERIFY_SERVICE_SID
  try {
    console.log("Using service SID:", serviceID);
    console.log("Fetching verification with SID:", verificationSid);

    const verifications = await twilioClient.verify.v2
      .services(serviceID)
      .fetch();

    console.log(`Found ${verifications.length} recent verifications`, verifications);

    const targetVerification = verifications.find(v => v.sid === verificationSid);

    if (targetVerification) {
      console.log("Found verification in list:", targetVerification.sid);
      const verification = await twilioClient.verify.v2
        .services(serviceID)
        .verifications(verificationSid)
        .fetch();

      console.log("Verification Status:", verification.status);
      console.log("Verification Channel:", verification.channel);
      console.log("Verification Date Created:", verification.dateCreated);
      return verification;
    } else {
      console.log("Verification not found in recent verifications list");
      return null;
    }
  } catch (error) {
    console.error("Error fetching verification details:", error);
    return null;
  }
}