import express from "express";
import { GoogleGenAI } from "@google/genai";

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json({ limit: "1mb" }));
app.use(express.static("public"));

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error("GEMINI_API_KEY is missing!");
}

const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

const MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";

const EMO_SYSTEM = `
You are EMO, a friendly AI desktop companion.

Rules:
- Be friendly, helpful and concise.
- Answer in Bengali when the user speaks Bengali.
- Answer in English when the user speaks English.
- You can understand mixed Bengali-English.
- Keep spoken answers fairly short.
- Do not use Markdown unless specifically requested.
- Do not pretend to be a real human.
`;

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    service: "EMO AI Companion",
    ai: !!ai,
    model: MODEL
  });
});

app.post("/api/ask", async (req, res) => {
  try {
    if (!ai) {
      return res.status(500).json({
        error: "GEMINI_API_KEY is not configured on Render."
      });
    }

    const message = String(req.body?.message || "").trim();

    if (!message) {
      return res.status(400).json({
        error: "Message is empty."
      });
    }

    const history = Array.isArray(req.body?.history)
      ? req.body.history.slice(-10)
      : [];

    const conversation = history
      .map(item => {
        const role = item.role === "assistant" ? "EMO" : "User";
        return `${role}: ${String(item.text || "").slice(0, 2000)}`;
      })
      .join("\n");

    const prompt = `
${EMO_SYSTEM}

Recent conversation:
${conversation || "(none)"}

User:
${message}

Respond naturally as EMO.
`;

    const response = await ai.models.generateContent({
      model: MODEL,
      contents: prompt
    });

    const answer =
      response.text?.trim() ||
      "Sorry, I couldn't think of an answer.";

    res.json({
      ok: true,
      answer
    });

  } catch (error) {
    console.error("Gemini error:", error);

    res.status(500).json({
      error: "AI request failed.",
      details: process.env.NODE_ENV === "development"
        ? String(error.message || error)
        : undefined
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`EMO server running on port ${PORT}`);
});
