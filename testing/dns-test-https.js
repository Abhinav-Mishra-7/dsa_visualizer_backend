const https = require("node:https");

const hostname = "_mongodb._tcp.learnmongodb.idgqgys.mongodb.net";

const options = {
    hostname: "dns.google",
    path: `/resolve?name=${encodeURIComponent(hostname)}&type=SRV`,
    method: "GET",
    headers: {
        Accept: "application/dns-json"
    }
};

https.get(options, (response) => {
    let data = "";

    response.on("data", (chunk) => {
        data += chunk;
    });

    response.on("end", () => {
        console.log("HTTP status:", response.statusCode);
        console.log(JSON.stringify(JSON.parse(data), null, 2));
    });
}).on("error", (error) => {
    console.error("HTTPS DNS request failed:", error.message);
});