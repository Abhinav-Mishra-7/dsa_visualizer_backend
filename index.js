const express = require("express");
const app = express();
require("dotenv").config();

const main = require("./src/config/db_config");
const cors = require("cors");
const http = require("http");
const cookieParser = require("cookie-parser");
const redisClient = require("./src/config/redis") ;

app.use(cookieParser());
app.use(express.json());

// ✅ CORS FIRST
const corsOptions = {
  origin: "https://dsa-visualizer-hw2f.onrender.com",
  credentials: true,
};
app.use(cors(corsOptions));

app.use((req, res, next) => {
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  res.setHeader("Cross-Origin-Embedder-Policy", "unsafe-none"); 
  next();
});

// ROUTES
const aiRouter = require("./src/routes/LLM_route");
const quizRouter = require("./src/routes/quiz_route");
const authRouter = require("./src/routes/auth_route");
const emailRouter = require("./src/routes/emailVerify") ;

// Setting security headers
app.use("/ai", aiRouter);
app.use("/quiz", quizRouter);
app.use("/auth", authRouter);
app.use("/email", emailRouter);

// SERVER
const server = http.createServer(app);

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`Port ${process.env.PORT} is already in use.`);
    return;
  }
  console.error("Server error:", err);
});

const initializeConnection = async ()=>{

    try{
        await Promise.all([main() , redisClient.connect()]) ;
        console.log("DB Connected") ;
        const PORT = process.env.PORT;
        server.listen(PORT, () => {
            console.log(`Server listening at http://localhost:${PORT}`);
        });
    }
    catch(err)
    {
        console.log("Error : " + err) ;
    }
}

initializeConnection();