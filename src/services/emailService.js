const nodemailer = require('nodemailer') ;

const transporter = nodemailer.createTransport({
  service: 'gmail',
  host: 'smtp.gmail.com',
  port: 587, // Alternative ports: 465 (SSL) or 587 (TLS)
  secure: false, // true for 465, false for other ports
  requireTLS: true, // Use TLS
  auth: {
    user: process.env.GMAIL_USER, // Your full Gmail address
    pass: process.env.GMAIL_PASS  // App password (not your  regular password)
  },
  tls: {
    ciphers: 'SSLv3' // Sometimes needed for older servers
  }
});

const sendVerificationEmail = (email, otp) => {
  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: email,
    subject: 'Email Verification OTP',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Email Verification</h2>
        <p>Your OTP for email verification is:</p>
        <h1 style="background: #f0f0f0; padding: 10px; display: inline-block; border-radius: 5px;">
          ${otp}
        </h1>
        <p>This OTP is valid for 5 minutes.</p>
        <p style="color: #777; font-size: 0.9rem; margin-top: 20px;">
          If you didn't request this, please ignore this email.
        </p>
      </div>
    `
  };

  return transporter.sendMail(mailOptions);
};


module.exports = sendVerificationEmail ;