const dns = require("node:dns");
const mongoose = require("mongoose");
require("dotenv").config();

async function testConnection() {
    try {
        console.log("Default DNS servers:", dns.getServers());

        // Temporary diagnostic workaround:
        // Configure Node's DNS resolver to use Google DNS.
        dns.setServers(["8.8.8.8", "8.8.4.4"]);

        console.log("DNS servers after configuration:", dns.getServers());

        const uri = process.env.DB_CONNECT_STRING;

        if (!uri) {
            throw new Error("MONGODB_URI environment variable is missing.");
        }

        console.log("Connecting to MongoDB Atlas...");

        await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 10000
        });

        console.log("SUCCESS: Connected to MongoDB Atlas!");
        console.log("Database:", mongoose.connection.name);

    } catch (error) {
        console.error("CONNECTION FAILED");
        console.error("Error name:", error.name);
        console.error("Error message:", error.message);
    } finally {
        await mongoose.disconnect().catch(() => {});
    }
}

testConnection();