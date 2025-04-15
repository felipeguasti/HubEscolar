const express = require('express');
require('dotenv').config();
const axios = require('axios');
const router = express.Router();

const OLLAMA_AI_URL = process.env.OLLAMA_AI_URL;

router.post("/response", async (req, res) => {
  const { text } = req.body;
  try {
    const response = await axios.post(OLLAMA_AI_URL, {
      model: "llama3",
      prompt: text,
      stream: false,
    });
    const respData = response.data.response.toString();
    res.send(respData);
  } catch (error) {
    console.error("Erro ao comunicar com o Ollama:", error);
    res.status(500).send("Erro ao gerar resposta da IA.");
  }
});

module.exports = router;