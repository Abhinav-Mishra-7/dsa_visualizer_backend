const express = require("express") ;

const {generateOTP , verifyOTP} = require("../controllers/emailVerication")

const emailRouter = express.Router();

// Generate and send OTP
emailRouter.post('/send-otp', generateOTP);  

// Verify OTP
emailRouter.post('/verify-otp', verifyOTP);

module.exports = emailRouter;