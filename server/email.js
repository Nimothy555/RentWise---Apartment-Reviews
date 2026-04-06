const nodemailer = require('nodemailer')

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})

async function sendVerificationEmail(to, token) {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
  const link = `${frontendUrl}/verify-email?token=${token}`
  await transporter.sendMail({
    from: `"RentWise" <${process.env.GMAIL_USER}>`,
    to,
    subject: 'Verify your RentWise email',
    html: `
      <div style="font-family:'DM Sans',sans-serif;max-width:480px;margin:auto;padding:32px;background:#FAFAF7;">
        <h2 style="font-family:'DM Serif Display',Georgia,serif;color:#2D5016;font-weight:400;">Welcome to RentWise!</h2>
        <p>Please verify your email address to get started.</p>
        <a href="${link}" style="display:inline-block;margin:16px 0;padding:12px 24px;background:#2D5016;color:#fff;border-radius:8px;text-decoration:none;font-weight:500;">Verify Email</a>
        <p style="color:#888780;font-size:0.85rem;">This link expires in 24 hours. If you didn't create a RentWise account, you can ignore this email.</p>
      </div>
    `,
  })
}

module.exports = { sendVerificationEmail }
