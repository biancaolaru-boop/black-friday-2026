/**
 * Express Server for Black Friday 2026 Predictions Landing Page
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const { extractAndCacheData, CACHE_FILE } = require('./scripts/extract_bq_data');
const { generateForecast2026 } = require('./src/forecast_engine');
const { handleAIChatQuestion } = require('./src/ai_assistant');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Helper to load cached dataset
function getCachedData() {
  if (!fs.existsSync(CACHE_FILE)) {
    return extractAndCacheData();
  }
  const raw = fs.readFileSync(CACHE_FILE, 'utf-8');
  return JSON.parse(raw);
}

// API Routes
app.get('/api/analytics', (req, res) => {
  try {
    const growthModifier = parseFloat(req.query.growth) || 1.15;
    const selectedNiche = req.query.niche || 'ALL';
    const cache = getCachedData();

    // Re-calculate forecast with dynamic growth modifier and selected niche filter
    const dynamicForecast = generateForecast2026(cache.rawHistorical, growthModifier, selectedNiche);

    res.json({
      success: true,
      dataSource: cache.dataSource,
      lastUpdated: cache.lastUpdated,
      forecast2026: dynamicForecast
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/chat', (req, res) => {
  try {
    const { question, growth, niche } = req.body;
    const growthModifier = parseFloat(growth) || 1.15;
    const selectedNiche = niche || 'ALL';
    const cache = getCachedData();
    const dynamicForecast = generateForecast2026(cache.rawHistorical, growthModifier, selectedNiche);

    const response = handleAIChatQuestion(question || '', dynamicForecast);

    res.json({
      success: true,
      reply: response.answer,
      relatedTopics: response.relatedTopics
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/refresh-bq', async (req, res) => {
  try {
    console.log('Manual refresh requested...');
    const updated = await extractAndCacheData();
    res.json({
      success: true,
      message: 'Dataset refreshed successfully from BigQuery!',
      dataSource: updated.dataSource,
      lastUpdated: updated.lastUpdated
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🔥 Black Friday 2026 Prediction Dashboard Running!`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log(`====================================================`);

  // Ensure dataset cache exists on server startup
  if (!fs.existsSync(CACHE_FILE)) {
    extractAndCacheData();
  }
});
