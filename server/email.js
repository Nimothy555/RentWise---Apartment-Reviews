const nodemailer = require('nodemailer')

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})

async function sendVerificationEmail(to, token, otp) {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
  const link = `${frontendUrl}/verify-email?token=${token}`
  await transporter.sendMail({
    from: `"RentWise" <${process.env.GMAIL_USER}>`,
    to,
    subject: 'Verify your RentWise email',
    html: `
      <div style="font-family:'DM Sans',sans-serif;max-width:480px;margin:auto;padding:32px;background:#FAFAF7;">
        <h2 style="font-family:'DM Serif Display',Georgia,serif;color:#2D5016;font-weight:400;">Welcome to RentWise!</h2>
        <p>Please verify your email address to get started. You can use either option below.</p>
        <p><strong>Option 1 — Click the link:</strong></p>
        <a href="${link}" style="display:inline-block;margin:8px 0 24px;padding:12px 24px;background:#2D5016;color:#fff;border-radius:8px;text-decoration:none;font-weight:500;">Verify Email</a>
        ${otp ? `
        <p><strong>Option 2 — Enter this code on the site:</strong></p>
        <div style="font-size:2rem;font-weight:700;letter-spacing:0.4em;color:#2D5016;background:#EEF3E8;padding:16px 24px;border-radius:8px;display:inline-block;margin-bottom:24px;">${otp}</div>
        ` : ''}
        <p style="color:#888780;font-size:0.85rem;">This link and code expire in 24 hours. If you didn't create a RentWise account, you can ignore this email.</p>
      </div>
    `,
  })
}

async function sendPasswordResetEmail(to, token) {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
  const link = `${frontendUrl}/reset-password?token=${token}`
  await transporter.sendMail({
    from: `"RentWise" <${process.env.GMAIL_USER}>`,
    to,
    subject: 'Reset your RentWise password',
    html: `
      <div style="font-family:'DM Sans',sans-serif;max-width:480px;margin:auto;padding:32px;background:#FAFAF7;">
        <h2 style="font-family:'DM Serif Display',Georgia,serif;color:#2D5016;font-weight:400;">Reset your password</h2>
        <p>We received a request to reset your RentWise password. Click the button below to choose a new one.</p>
        <a href="${link}" style="display:inline-block;margin:16px 0;padding:12px 24px;background:#2D5016;color:#fff;border-radius:8px;text-decoration:none;font-weight:500;">Reset Password</a>
        <p style="color:#888780;font-size:0.85rem;">This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.</p>
      </div>
    `,
  })
}

async function sendVerificationSubmissionNotification({ user, apartment, docType, fileBuffer, fileMimetype, verificationStatus }) {
  const docLabels = { lease: 'Lease Agreement', utility_bill: 'Utility Bill', postal_mail: 'Postal Mail' }
  const statusLabel = verificationStatus === 'verified' ? '✅ Auto-verified' : verificationStatus === 'failed' ? '❌ Needs manual review' : '⏳ Pending'

  const ext = fileMimetype === 'application/pdf' ? 'pdf'
    : fileMimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ? 'docx'
    : fileMimetype.split('/')[1] || 'file'

  await transporter.sendMail({
    from: `"RentWise" <${process.env.GMAIL_USER}>`,
    to: process.env.VERIFICATION_INBOX || 'rentwise.verify@outlook.com',
    subject: `[Verification] ${user.first_name} ${user.last_name} — ${apartment.name}`,
    html: `
      <div style="font-family:'DM Sans',sans-serif;max-width:560px;margin:auto;padding:32px;background:#FAFAF7;">
        <h2 style="font-family:'DM Serif Display',Georgia,serif;color:#2D5016;font-weight:400;">New Verification Submission</h2>
        <table style="width:100%;border-collapse:collapse;font-size:0.95rem;">
          <tr><td style="padding:8px 0;color:#555;width:140px;">Status</td><td style="padding:8px 0;font-weight:600;">${statusLabel}</td></tr>
          <tr><td style="padding:8px 0;color:#555;">User</td><td style="padding:8px 0;">${user.first_name} ${user.last_name} &lt;${user.email}&gt;</td></tr>
          <tr><td style="padding:8px 0;color:#555;">Document Type</td><td style="padding:8px 0;">${docLabels[docType] || docType}</td></tr>
          <tr><td style="padding:8px 0;color:#555;">Apartment</td><td style="padding:8px 0;">${apartment.name}</td></tr>
          <tr><td style="padding:8px 0;color:#555;">Address</td><td style="padding:8px 0;">${apartment.street_address}, ${apartment.city}, ${apartment.state} ${apartment.zip_code}</td></tr>
        </table>
        <p style="color:#888780;font-size:0.85rem;margin-top:24px;">The submitted document is attached. Review and update the verification status in the admin panel if needed.</p>
      </div>
    `,
    attachments: [{
      filename: `verification-${user.id}-${Date.now()}.${ext}`,
      content: fileBuffer,
      contentType: fileMimetype,
    }]
  })
}

async function sendVerificationReceivedEmail({ user, apartment }) {
  await transporter.sendMail({
    from: `"RentWise" <${process.env.GMAIL_USER}>`,
    to: user.email,
    subject: 'We received your verification submission',
    html: `
      <div style="font-family:'DM Sans',sans-serif;max-width:480px;margin:auto;padding:32px;background:#FAFAF7;">
        <h2 style="font-family:'DM Serif Display',Georgia,serif;color:#2D5016;font-weight:400;">Submission Received</h2>
        <p>Hi ${user.first_name},</p>
        <p>We received your verification document for <strong>${apartment.name}</strong> and it's currently under review. Our team will follow up once it's been processed.</p>
        <p>Thanks for your patience,<br/>The RentWise Team</p>
      </div>
    `,
  })
}

module.exports = { sendVerificationEmail, sendPasswordResetEmail, sendVerificationSubmissionNotification, sendVerificationReceivedEmail }
