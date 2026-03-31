const jwt = require("jsonwebtoken") ;
const User = require("../models/user_model") ;
const redisClient = require("../config/redis") ;

const userMiddleware = async (req,res,next)=>
{
    try{
        // accessing token
        const {token} = req.cookies ;
        if(!token)
            throw new Error("Token is absent") ;


        // if token exists then check that the token is valid or not
        const payload = jwt.verify(token, process.env.JWT_KEY) ;

        const {_id} = payload ;

        if(!_id)
            throw new Error("Invalid Token") ;

        const result = await User.findById(_id) ;

        if(!result)
            throw new Error("User doesn't exist") ;

        // Check ki token redis ke blocklist me to present nhi hai ya nhi
        const isBlocked = await redisClient.exists(`token: ${token}`) ;

        if(isBlocked)
            throw new Error("Invalid token") ;

        req.result = result ;

        next() ;

    }
    catch(err)
    {
        res.status(401).send("Error: " + err.message) ;
    }
}


module.exports = {userMiddleware} ;