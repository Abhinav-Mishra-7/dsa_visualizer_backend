const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_KEY);
const Chat = require('../models/Chat');


function buildChatTitle(messages = []) {
  const firstUser = messages.find((m) => m.user && m.user.trim());
  const raw = firstUser?.user?.replace(/\s+/g, ' ').trim() || 'New Chat';
  return raw.length > 55 ? `${raw.slice(0, 55).trim()}...` : raw;
}

// exports.saveSession = async (req, res) => {
//   try {
//     const {
//       name,
//       email,
//       isPremium = false,
//       algorithmSlug,
//       algorithmName,
//       chatTitle,
//       messages = []
//     } = req.body;

//     if (!algorithmSlug || !algorithmName) {
//       return res.status(400).json({ success: false, message: 'algorithmSlug and algorithmName are required' });
//     }

//     if (!Array.isArray(messages) || messages.length === 0) {
//       return res.status(400).json({ success: false, message: 'messages must be a non-empty array' });
//     }

//     const finalTitle = (chatTitle && chatTitle.trim()) || buildChatTitle(messages);

//     const chat = await Chat.create({
//       name: name || null,
//       email: email || null,
//       isPremium: !!isPremium,
//       algorithmSlug,
//       algorithmName,
//       chatTitle: finalTitle,
//       messages
//     });

//     return res.json({ success: true, chatId: chat._id, chatTitle: chat.chatTitle });
//   } catch (err) {
//     console.error('saveSession error:', err);
//     return res.status(500).json({ success: false, message: 'Failed to save chat session' });
//   }
// };

exports.saveSession = async (req, res) => {
  try {
    const {
      chatId,
      name,
      email,
      isPremium = false,
      algorithmSlug,
      algorithmName,
      chatTitle,
      messages = []
    } = req.body;

    if (!algorithmSlug || !algorithmName) {
      return res.status(400).json({ success: false, message: 'algorithmSlug and algorithmName are required' });
    }

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ success: false, message: 'messages must be non-empty' });
    }

    const finalTitle = chatTitle || buildChatTitle(messages);

    // 🔥 ✅ UPDATE EXISTING CHAT
    if (chatId) {
      const updatedChat = await Chat.findByIdAndUpdate(
        chatId,
        {
          name,
          email,
          isPremium,
          algorithmSlug,
          algorithmName,
          chatTitle: finalTitle,
          messages
        },
        { new: true }
      );

      return res.json({
        success: true,
        chatId: updatedChat._id,
        chatTitle: updatedChat.chatTitle,
        updated: true
      });
    }

    // 🔥 ✅ CREATE NEW CHAT
    const newChat = await Chat.create({
      name,
      email,
      isPremium,
      algorithmSlug,
      algorithmName,
      chatTitle: finalTitle,
      messages
    });

    return res.json({
      success: true,
      chatId: newChat._id,
      chatTitle: newChat.chatTitle,
      created: true
    });

  } catch (err) {
    console.error('saveSession error:', err);
    return res.status(500).json({ success: false });
  }
};

exports.getHistory = async (req, res) => {
  try {
    const { email } = req.query;
    const filter = email ? { email } : {};

    const chats = await Chat.find(filter)
      .sort({ createdAt: -1 })
      .select('_id algorithmSlug algorithmName chatTitle messages createdAt');

    return res.json({ success: true, chats });
  } catch (err) {
    console.error('getHistory error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load history' });
  }
};

exports.getChatById = async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.id);
    if (!chat) return res.status(404).json({ success: false, message: 'Chat not found' });
    return res.json({ success: true, chat });
  } catch (err) {
    console.error('getChatById error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load chat' });
  }
};

exports.chatStreamController = async (req, res) => {
  try {
    const { message, messages = [], algorithmName, description } = req.body;
    console.log("REQ BODY:", req.body);

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    // ✅ SAFETY: clean incoming values (NO [object Object])
    const safeString = (val) => {
      if (!val) return "";
      if (typeof val === "string") return val;
      return JSON.stringify(val, null, 2);
    };

    const safeAlgorithmName = safeString(algorithmName);
    const safeDescription = safeString(description);

    console.log("✅ CLEAN INPUT:", safeAlgorithmName, safeDescription);

    // 🔥 SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    res.flushHeaders?.();

    // ✅ Gemini model
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
    });

    // ✅ CLEAN HISTORY (no undefined / empty parts)
    const cleanHistory = (messages || [])
      .map((m) => ({
        role: m.role === "model" ? "model" : "user",
        parts: (m.parts || []).filter(
          (p) => p.text && typeof p.text === "string" && p.text.trim() !== ""
        ),
      }))
      .filter((m) => m.parts.length > 0);

    const chat = model.startChat({
      history: cleanHistory,
    });

    // ✅ SYSTEM PROMPT (STRING ONLY — NO OBJECTS)
//     const systemPrompt = `
// You are an expert Data Structures and Algorithms (DSA) tutor.

// Algorithm Name: ${safeAlgorithmName || "Unknown"}
// Description: ${safeDescription || ""}

// Your job is to explain clearly in simple terms.

// Rules:
// - Never mention "object object"
// - Never talk about missing data
// - Always give clean structured explanation
// `;
    const systemPrompt = `
    You are an expert Data Structures and Algorithms (DSA) tutor.

    Algorithm Name: ${safeAlgorithmName || "Unknown"}
    Description: ${safeDescription || ""}

    Your job is to explain concepts in a clean, structured, and easy-to-read way — similar to how ChatGPT explains.

    ---------------------------------------
    RESPONSE FORMAT RULES (VERY IMPORTANT)
    ---------------------------------------

    1. Use clear section headings using markdown:
      Example:
      ### Concept
      ### How it Works
      ### Example
      ### Time Complexity
      ### Summary

    2. Always break content into small readable chunks:
      - Use bullet points
      - Avoid long paragraphs
      - Add spacing between sections

    3. Code formatting:
      - Always use proper markdown code blocks with language
      - Example:
        \`\`\`javascript
        // code here
        \`\`\`

    4. Explanation style:
      - Start simple → then go deeper
      - Explain like teaching a beginner
      - Avoid jargon unless explained

    5. Lists formatting:
      - Use "-" for bullet points
      - Use numbered steps for processes

    6. Highlight important terms:
      - Use **bold** for key concepts
      - Use \`inline code\` for variables

    7. Math formatting:
      - Use simple readable format (avoid LaTeX like $O(N)$)
      - Instead use: O(N), O(N^2)

    8. DO NOT:
      - Do not output raw JSON
      - Do not say "object object"
      - Do not mention missing data
      - Do not write everything in one paragraph

    ---------------------------------------
    RESPONSE STRUCTURE TEMPLATE
    ---------------------------------------

    Always follow this structure:

    ### Concept
    Short explanation of what it is

    ### How it Works
    Step-by-step explanation

    ### Example
    Explain with a simple example

    ### Code
    Provide clean code

    ### Time Complexity
    - Best Case:
    - Average Case:
    - Worst Case:

    ### Space Complexity

    ### Summary
    Short recap in 2-3 lines

    ---------------------------------------

    Tone:
    - Friendly
    - Clear
    - Teaching-focused
    - Not robotic
    `;

    // ✅ FINAL PROMPT
    const finalPrompt = `${systemPrompt}\n\nUser Question: ${message}`;

    const result = await chat.sendMessageStream(finalPrompt);

    let fullResponse = "";

    for await (const chunk of result.stream) {
      const chunkText = chunk.text();

      if (chunkText) {
        fullResponse += chunkText;

        res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
      }
    }

    // ✅ END STREAM
    res.write(`data: ${JSON.stringify({ text: "[DONE]" })}\n\n`);
    res.end();

  } catch (err) {
    console.error("❌ Gemini streaming error:", err);

    if (!res.headersSent) {
      return res.status(500).json({ error: "Streaming failed" });
    }

    res.write(`data: ${JSON.stringify({ error: "Stream error" })}\n\n`);
    res.end();
  }
};

exports.deleteChat = async (req, res) => {
  try {
    const { chatId } = req.params;

    await ChatModel.findByIdAndDelete(chatId);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
};

// exports.chatStreamController = async (req, res) => {
//   try {
//     // const { message, messages = [] } = req.body;
//     const { message, messages = [], algorithmName, description } = req.body;

//     if (!message) {
//       return res.status(400).json({ error: "Message is required" });
//     }

//     // 🔥 SSE headers (VERY IMPORTANT)
//     res.setHeader("Content-Type", "text/event-stream");
//     res.setHeader("Cache-Control", "no-cache");
//     res.setHeader("Connection", "keep-alive");

//     res.flushHeaders?.();

//     // ✅ Gemini model
//     const model = genAI.getGenerativeModel({
//       model: "gemini-2.5-flash",
//     });

//     const history = (messages || [])
//       .filter(m => m.parts && m.parts.length > 0)
//       .map((m) => ({
//         role: m.role === "model" ? "model" : "user",
//         parts: m.parts,   
//     }));

//     const cleanHistory = (messages || [])
//     .map(m => ({
//       role: m.role === "model" ? "model" : "user",
//       parts: (m.parts || [])
//         .filter(p => p.text && p.text.trim() !== "")
//     }))
//     .filter(m => m.parts.length > 0);

//     const chat = model.startChat({
//     history: cleanHistory,
//     });

//     console.log(algorithmName, description);

//     // 🔥 STREAM RESPONSE
//     // const result = await chat.sendMessageStream(message);
//     const systemPrompt =  `
//     You are an expert Data Structures and Algorithms (DSA) tutor who specializes in explaining concepts in a simple, intuitive, and structured way.
    
//     Your goal is to help students deeply understand algorithms — not just memorize them.
    
//     ---
    
//     ## Context
//     - Algorithm Name: ${algorithmName}
//     - Description: ${description}
    
//     ---
    
//     ## Your Teaching Style
    
//     1. Start with **intuition** (real-world analogy if possible)
//     2. Then explain **how it works step-by-step**
//     3. Provide a **dry run example**
//     4. Explain **time and space complexity**
//     5. Mention **when to use this algorithm**
//     6. Optionally provide **clean code implementation**
    
//     ---
    
//     ## Response JSON Schema
    
//     Your entire output MUST be a valid JSON object:
    
//     {
//       "response": [
//         { "type": "text", "content": "..." },
//         { "type": "code", "content": { "language": "javascript", "code": "..." } }
//       ]
//     }
    
//     ---
    
//     ## Rules
    
//     1. Always return valid JSON (no extra text outside JSON)
//     2. Break explanations into multiple small blocks
//     3. Use simple language (teach like student is beginner)
//     4. Avoid unnecessary theory or jargon
//     5. Use code only when helpful
//     6. If user asks "explain this", assume they mean the given algorithm
    
//     ---
    
//     ## Structure You Should Follow
    
//     Try to structure responses like this:
    
//     1. Intuition
//     2. Step-by-step explanation
//     3. Example / Dry run
//     4. Complexity
//     5. Code (if needed)
    
//     ---
    
//     ## Example Output
    
//     {
//       "response": [
//         { "type": "text", "content": "Let's understand Bubble Sort using a simple idea." },
//         { "type": "text", "content": "It works by repeatedly swapping adjacent elements..." },
//         { "type": "code", "content": { "language": "javascript", "code": "function bubbleSort(arr) { ... }" } }
//       ]
//     }
    
//     ---
    
//     ## IMPORTANT
    
//     - Always stay focused on the given algorithm
//     - If user asks vague questions like "explain this", use the algorithm context
//     - Do NOT output anything outside JSON
//     `

//     const finalPrompt = `${systemPrompt}\n\nUser Question: ${message}`;
//     const result = await chat.sendMessageStream(finalPrompt);

//     let fullResponse = "";

//     for await (const chunk of result.stream) {
//       const chunkText = chunk.text();

//       if (chunkText) {
//         fullResponse += chunkText;

//         // 🔥 Send chunk to frontend
//         // res.write(`data: ${JSON.stringify({ content: chunkText })}\n\n`);
//         res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
//       }
//     }

//     // ✅ End stream
//     // res.write(`data: [DONE]\n\n`);
//     res.write(`data: ${JSON.stringify({ text: "[DONE]" })}\n\n`);
//     res.end();

//   } catch (err) {
//     console.error("Gemini streaming error:", err);

//     if (!res.headersSent) {
//       return res.status(500).json({ error: "Streaming failed" });
//     }

//     res.write(`data: ${JSON.stringify({ error: "Stream error" })}\n\n`);
//     res.end();
//   }
// };