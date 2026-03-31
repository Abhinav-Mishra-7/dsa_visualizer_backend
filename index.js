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

// const express = require("express") ;
// const app = express() ;
// require("dotenv").config() ;

// const main = require("./src/config/db_config") ;
// const cors = require("cors") ;
// const http = require('http');
// const cookieParser = require("cookie-parser");

// app.use(cookieParser());
// app.use(express.json()) ;

// app.use((req, res, next) => {
//   res.setHeader(
//     "Content-Security-Policy",
//     `
//     default-src 'self';
//     script-src 'self' 'unsafe-inline' https://accounts.google.com https://apis.google.com;
//     style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
//     font-src 'self' https://fonts.gstatic.com;
//     img-src 'self' data: https://lh3.googleusercontent.com;
//     connect-src 'self' https://accounts.google.com;
//     frame-src https://accounts.google.com;
//     `
//   );
//   next();
// });

// // Handling routing
// const aiRouter = require("./src/routes/LLM_route") ;
// const quizRouter = require("./src/routes/quiz_route") ;
// const authRouter = require("./src/routes/auth_route") ;


// // CORS Handling
// const corsOptions = {
//   origin: "http://localhost:5173",
//   credentials: true,
//   methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
//   allowedHeaders: ["Content-Type", "Authorization"],
// };

// app.use((req, res, next) => {
//   // Allow popups for OAuth flows (Google, GitHub, etc.)
//   res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  
//   // Embedder policy for iframes
//   res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
  
//   // Prevent clickjacking
//   res.setHeader("X-Frame-Options", "SAMEORIGIN");
  
//   // Enable XSS protection
//   res.setHeader("X-XSS-Protection", "1; mode=block");
  
//   // Prevent MIME type sniffing
//   res.setHeader("X-Content-Type-Options", "nosniff");
  
//   next();
// });

// app.use(cors(corsOptions));

// app.use(express.json()) ;
// const server = http.createServer(app);

// server.on("error", (err) => {
//   if (err.code === "EADDRINUSE") {
//     console.error(`Port ${process.env.PORT} is already in use. Stop the other server process and restart.`);
//     return;
//   }
//   console.error("Server error:", err);
// });

// // AI chat bot
// app.use('/ai' , aiRouter) ;

// // Quiz
// app.use('/quiz', quizRouter) ;

// // authentication
// app.use('/auth', authRouter) ;

// const initializeConnection = async ()=>{

//     try{
//         await main() ;
//         console.log("DB Connected") ;
//         const PORT = process.env.PORT;
//         server.listen(PORT, () => {
//             console.log(`Server listening at http://localhost:${PORT}`);
//         });
//     }
//     catch(err)
//     {
//         console.log("Error : " + err) ;
//     }
// }

// initializeConnection() ;