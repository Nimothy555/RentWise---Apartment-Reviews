const twilio = require('twilio')

function getClient() {
  return twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
}

async function sendOtpSms(phone, otp) {
  await getClient().messages.create({
    body: `Your RentWise code is ${otp}. It expires in 10 minutes.`,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: phone,
  })
}

module.exports = { sendOtpSms }
