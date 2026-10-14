const dns = require("node:dns");

dns.resolve4("google.com", (error, addresses) => {
    if (error) {
        console.error("DNS lookup failed:", error);
        return;
    }

    console.log("DNS lookup successful:", addresses);
});