const mongoose = require("mongoose") ;
const dns = require("node:dns");

const resolver = new dns.Resolver(); 

dns.setServers(["8.8.8.8", "8.8.4.4"]);

async function main()
{   
    try{
        await mongoose.connect(process.env.DB_CONNECT_STRING) ; 
    }
    catch(error){
        console.log(error);
    }
} 

module.exports =  main ; 