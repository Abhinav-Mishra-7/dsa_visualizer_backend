const crypto  = require('crypto') ;
const jwt = require("jsonwebtoken") ;
const Otp =  require('../models/otp.js');
const User =  require('../models/user_model.js');
const sendVerificationEmail = require('../services/emailService.js');

// generate OTP and Send it 
const generateOTP = async (req,res)=>{

    const { email} = req.body;
    let message = "" ;
    let exists = true ;

    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    
    try {      

      // Save OTP to database
      const ans = await Otp.findOneAndUpdate({ email },{otp , createdAt: new Date() } ,{ upsert: true, new: true});
      // Send OTP via email
      await sendVerificationEmail(email , otp) ;
        
      const reply = {
        email: email ,
        message: message ,
        exists: exists
      }

      // Sending some info about user so that do not need to call DB twice for user info
      res.status(201).json({ 
        user: reply 
      })
    } catch (err) {
      console.error('Error sending OTP:', err);
      res.status(500).json({ error: 'Failed to send OTP' });
    }
}

// Verify OTP
const verifyOTP = async (req, res) => {
  const { emailId , otp } = req.body; 

  try {
    const otpRecord = await Otp.findOne({emailId: emailId });

    let success = false ;
    let message = '' ;
    const user = await User.findOne({ emailId });
    let exists = false ;
    let givenToken ;
    
    if(user && !user.verified){
      if (user && !otpRecord) {
        message = 'OTP is expired or Invalid Email' ;
      }    
      else if (user && otpRecord.otp !== otp) {
        message = 'Invalid OTP' ; 
      }
      else if(user && otpRecord.otp === otp)
      {
        success = true ; 
        message = "Email Verified Successfully" ;
        // Update user verification status
        await User.findOneAndUpdate({ emailId }, { $set: { verified: true } });
      
        // Delete OTP after successful verification
        await Otp.findOneAndDelete({ emailId });
        // creating jwt
        const token = jwt.sign({_id: user._id , emailId: emailId , role: "user"} , process.env.JWT_KEY , {expiresIn: 60*60}) ;  
        // Storing cookie
        res.cookie('token' , token , {maxAge: 60*60*1000}) ;
    }
    else if(user && user.verified)
    {
        success = true ;
        exists = true ;
    }
  }

    if(user)
      exists = true ;

    const reply = {
      success: success,
      id: user?._id,
      email: user?.email,
      name: user?.name ,
      message: message ,
      exists: exists
    }

    res.status(200).json({ 
      user: reply ,
    });
  } catch (err) {
    console.error('Error verifying OTP:', err);
    res.status(500).json({ error: 'Failed to verify OTP' });
  }
} 

module.exports = {generateOTP , verifyOTP} ;