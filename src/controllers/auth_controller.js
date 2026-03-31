const User = require("../models/user_model");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const PhoneOtp = require("../models/phoneOtp_model");
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const redisClient = require("../config/redis") ;
// const nodemailer = require('nodemailer') ;
// const generateOTP = require("../utils/generateOtp") ;
const Otp = require("../models/otp") ;
const sendVerificationEmail = require('../services/emailService') ;

function getJwtSecret() {
  return process.env.JWT_SECRET || process.env.JWT_KEY || "SECRET";
}

function signAuthToken(user) {
  return jwt.sign({ id: user._id }, getJwtSecret(), { expiresIn: "7d" });
}

function getPublicBaseUrl(req) {
  return process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get("host")}`;
}

function normalizePhone(phone) {
  if (!phone || typeof phone !== "string") return null;
  return phone.replace(/[^\d+]/g, "");
}


const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // 1. Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered. Please login." });
    }

    // 2. Create unverified user
    // Password will be hashed by your schema's pre-save hook
    const newUser = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      verified: false, // User cannot login until this is true
      provider: "local"
    });

    // 3. Generate 6-digit OTP (Logic from your generateOTP function)
    const otp = crypto.randomInt(100000, 999999).toString();

    // 4. Save OTP to DB (Logic from your generateOTP function)
    await Otp.findOneAndUpdate(
      { email },
      { otp, createdAt: new Date() },
      { upsert: true, new: true, runValidators: true }
    );

    // 5. Send the email
    await sendVerificationEmail(email, otp);

    // 6. Response (Frontend will redirect to OTP page)
    res.status(201).json({
      message: "Registration successful. Please verify your email.",
      user: {
        email: newUser.email,
        name: newUser.name, // Matching your OTP function's expectation
        verified: false
      }
    });

  } catch (err) {
    console.error("Registration Error:", err);
    res.status(500).json({ message: "Registration failed: " + err.message });
  }
};

const login = async(req,res)=>{
       
    try{
        
      const email = req.body.email ;
      const password = req.body.password ;

      if(!email)
      throw new Error("Invalid Credentials") ;
      if(!password)
      throw new Error("Invalid Credentials") ;

      const user = await User.findOne({email}) ;

      if(!user)
      return res.send("User doesn't exist") ;

      const match = await bcrypt.compare(password , user.password) ;

      if(!match)
        throw new Error("Invalid Credentials") ;

      // creating jwt
      const jwtToken = jwt.sign({ _id: user._id, email: user.email, role: user.role },process.env.JWT_KEY,
        { expiresIn: "24h" });

      const reply = {
        name: user.name ,
        email: user.email ,
        _id: user._id,
        role: user.role ,
        verified: user.verified
      }

        
        // Storing cookie
      res.cookie('token' , jwtToken , {maxAge: 24*60*60*1000 , httpOnly: true,secure: true,sameSite: 'none'}) ;

      res.status(201).json({
        user: reply ,
        message: "Logged in Successfully"
      })
      
    }
    catch(err){
        res.status(401).send("Error: " + err) ;
    }
}

// Logout 
const logout = async(req,res)=>{
    try{
        const {token} = req.cookies ;
        const payload = jwt.decode(token) ; 
        
        const res = await redisClient.set(`token: ${token}` , "Blocked") ;
        console.log(res) ;

        // Adding expiry date for the token
        await redisClient.expireAt(`token: ${token}` , payload.exp) ;
        
 
        // Clear cookie
        res.cookie("token" , null ,{expires: new Date(0),httpOnly: true,secure: true,sameSite: 'none'}) ; 

        res.send("Logged Out Successfully") ; 

    }
    catch(err){
        res.status(503).send("Error: " + err) ;
    }
}

const googleLogin = async (req, res) => {
    try {
        const { token } = req.body;

        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        const { email, name, picture } = payload;

        // 2. Find user using the correct schema field: 'email'
        let user = await User.findOne({ email: email.toLowerCase() });

        if (!user) {
            const randomPassword = crypto.randomBytes(16).toString('hex');
            
            user = await User.create({
                name: name,                
                email: email,             
                password: randomPassword,  
                picture: picture,       
                provider: "google",  
                role: "user"
            });
        } else {
            user.lastLogin = Date.now();
            user.picture = picture; 
            await user.save();
        }

        const jwtToken = jwt.sign(
            { _id: user._id, email: user.email, role: user.role },
            process.env.JWT_KEY,
            { expiresIn: "24h" }
        );

        const baseCookieOpts = {
            httpOnly: true,
            secure: true,         
            sameSite: "None",      
            maxAge: 24 * 60 * 60 * 1000 
        };

        res.cookie("token", jwtToken, baseCookieOpts);

        const reply = {
            name: user.name,
            email: user.email,
            picture: user.picture,
            _id: user._id,
            role: user.role,
            isPremium: user.isPremium
        };

        res.status(200).json({
            user: reply,
            message: 'Google authentication successful'
        });

    } catch (err) {
        console.error("Google Login Error:", err);
        res.status(400).json({ message: 'Authentication failed: ' + err.message });
    }
};

// Example backend route
const checkAuth = async (req, res) => {
  
  try{      
    const reply = {
      name: req.result.name ,
      email: req.result.email ,
      _id: req.result._id,
      role: req.result.role,
      picture: req.result.picture
    }

    res.status(200).json({  user: reply ,message: "Valid User"})
    }
    catch(err)
    {
      res.status(500).send("Error : " + err) ;
    }
};

const sendPhoneOtp = async (req, res) => {
  const phone = normalizePhone(req.body?.phone);
  if (!phone) return res.status(400).json({ message: "phone is required" });

  const otpLength = Number(process.env.OTP_LENGTH || 6);
  const otpTtlSeconds = Number(process.env.OTP_TTL_SECONDS || 300);

  const otp = Array.from({ length: otpLength }, () => crypto.randomInt(0, 10)).join("");
  const otpHash = await bcrypt.hash(otp, 10);
  const expiresAt = new Date(Date.now() + otpTtlSeconds * 1000);

  await PhoneOtp.create({ phone, otpHash, expiresAt });

  // If you later integrate SMS (Twilio/etc), send `otp` to the user here.
  // For now, dev-friendly behavior: return OTP when OTP_DEV_RETURN=true
  const devReturn = String(process.env.OTP_DEV_RETURN || "true").toLowerCase() === "true";
  if (devReturn) {
    return res.json({ ok: true, phone, otp, expiresAt });
  }

  return res.json({ ok: true, phone, expiresAt });
};

const verifyPhoneOtp = async (req, res) => {
  const phone = normalizePhone(req.body?.phone);
  const otp = String(req.body?.otp || "").trim();

  if (!phone) return res.status(400).json({ message: "phone is required" });
  if (!otp) return res.status(400).json({ message: "otp is required" });

  const now = new Date();

  const otpDoc = await PhoneOtp.findOne({
    phone,
    expiresAt: { $gt: now },
    consumedAt: null
  }).sort({ createdAt: -1 });

  if (!otpDoc) return res.status(400).json({ message: "OTP expired or not found" });

  if (otpDoc.attempts >= 5) return res.status(429).json({ message: "Too many attempts" });

  const ok = await bcrypt.compare(otp, otpDoc.otpHash);
  if (!ok) {
    otpDoc.attempts += 1;
    await otpDoc.save();
    return res.status(400).json({ message: "Invalid OTP" });
  }

  otpDoc.consumedAt = now;
  await otpDoc.save();

  let user = await User.findOne({ phone });

  if (!user) {
    user = await User.create({
      name: `User ${phone}`,
      phone,
      provider: "phone"
    });
  } else {
    user.lastLogin = now;
    user.provider = "phone";
    await user.save();
  }

  const token = signAuthToken(user);

  res.cookie("token", token, {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    maxAge: 60 * 60 * 1000
  });

  return res.json({ user });
};

const githubStart = async (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) return res.status(500).json({ message: "Missing GITHUB_CLIENT_ID" });

  const frontendRedirect = req.query?.redirectTo || process.env.GITHUB_FRONTEND_REDIRECT || "";
  const state = jwt.sign(
    { redirectTo: frontendRedirect || "", nonce: crypto.randomUUID() },
    getJwtSecret(),
    { expiresIn: "10m" }
  );

  const callbackUrl = `${getPublicBaseUrl(req)}/auth/github/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callbackUrl,
    scope: "read:user user:email",
    state
  });

  const authUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;

  // If called from browser, redirect. If called from SPA via fetch, return URL.
  const wantsJson = String(req.headers.accept || "").includes("application/json");
  if (wantsJson) return res.json({ url: authUrl });
  return res.redirect(authUrl);
};

const githubCallback = async (req, res) => {
  const code = String(req.query?.code || "");
  const state = String(req.query?.state || "");

  if (!code) return res.status(400).json({ message: "Missing code" });
  if (!state) return res.status(400).json({ message: "Missing state" });

  let decodedState;
  try {
    decodedState = jwt.verify(state, getJwtSecret());
  } catch {
    return res.status(400).json({ message: "Invalid state" });
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  const tokenResp = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: `${getPublicBaseUrl(req)}/auth/github/callback`
    })
  });

  const tokenJson = await tokenResp.json();
  const accessToken = tokenJson?.access_token;

  const ghUserResp = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  const ghUser = await ghUserResp.json();

  const email = ghUser.email || `${ghUser.login}@users.noreply.github.com`;
  const githubId = String(ghUser.id);

  let user = await User.findOne({ $or: [{ githubId }, { email }] });

  if (!user) {
    user = await User.create({
      name: ghUser.name || ghUser.login,
      email,
      picture: ghUser.avatar_url,
      provider: "github",
      githubId
    });
  }

  const token = signAuthToken(user);

  // 🔥 SET COOKIE
  res.cookie("token", token, {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    maxAge: 60 * 60 * 1000
  });

  // redirect without exposing token
  const redirectTo = decodedState?.redirectTo || "http://localhost:5173";

  return res.redirect(redirectTo);
};

const getMe = async (req, res) => {
  const token = req.cookies.token ;

  if (!token) {
    return res.status(401).json({ message: "Not logged in" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_KEY);
  
    // fetch user
    const user = await User.findById(decoded._id);
    console.log(user) ;

    if (!user) {
      return res.status(401).json({ message: "Invalid token" });
    }

    res.json({ user });

  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
};

module.exports = { login, sendPhoneOtp, verifyPhoneOtp, githubStart, githubCallback, getMe, googleLogin, checkAuth , logout, register};