const dns = require("node:dns");

const resolver = new dns.Resolver();

resolver.setServers(["8.8.8.8"]);

const hostname =
    "_mongodb._tcp.learnmongodb.idgqgys.mongodb.net";

console.log("Testing MongoDB SRV lookup using Google DNS...");

resolver.resolveSrv(hostname, (error, addresses) => {
    if (error) {
        console.error("DNS lookup failed:");
        console.error(error);
        return;
    }

    console.log("DNS lookup successful!");
    console.log(addresses);
});