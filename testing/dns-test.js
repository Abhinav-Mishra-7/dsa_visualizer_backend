const dns = require("node:dns");

const hostname = "_mongodb._tcp.learnmongodb.idgqgys.mongodb.net";

dns.resolveSrv(hostname, (error, addresses) => {
    if (error) {
        console.error("SRV lookup failed:");
        console.error(error);
        return;
    }

    console.log("SRV records resolved successfully:");
    console.log(addresses);
});