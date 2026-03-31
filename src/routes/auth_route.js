const express = require('express');
const { login, sendPhoneOtp, verifyPhoneOtp, githubStart, githubCallback , getMe, googleLogin, checkAuth, logout, register} = require('../controllers/auth_controller');
const {userMiddleware} = require("../middleware/userMiddleware") ;
const {generateOTP,verifyOTP} = require("../controllers/emailVerication") ;

const authRouter = express.Router();

authRouter.post('/google', googleLogin);
authRouter.post('/register-init', register);
authRouter.post('/generate-otp', generateOTP);
authRouter.post('/verify-registration', verifyOTP);
// authRouter.post('/verify-registration', verifyAndCreateUser);
authRouter.post('/login', login);
authRouter.get('/check', userMiddleware, checkAuth);
authRouter.post('/logout', logout); 
authRouter.post('/phone/send-otp', sendPhoneOtp);
authRouter.post('/phone/verify-otp', verifyPhoneOtp);
authRouter.get('/github', githubStart);
authRouter.get('/github/callback', githubCallback);
authRouter.get('/me', getMe);

module.exports = authRouter;