/**
 * Express Server for Black Friday 2026 Predictions Landing Page
 * Designed for both Local execution and Vercel Serverless Function deployment
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

// Safe in-memory dataset loader
let memoryCache = null;

function getCachedData() {
  if (memoryCache) {
    return memoryCache;
  }

  try {
    if (fs.existsSync(CACHE_FILE)) {
      const raw = fs.readFileSync(CACHE_FILE, 'utf-8');
      memoryCache = JSON.parse(raw);
      return memoryCache;
    }
  } catch (e) {
    console.warn('Could not read cache file, fallback to extractAndCacheData:', e.message);
  }

  // Fallback extraction from real_bq_dump.json
  memoryCache = extractAndCacheData();
  return memoryCache;
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
    console.error('Analytics API Error:', err);
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
    console.error('Chat API Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/refresh-bq', async (req, res) => {
  try {
    console.log('Manual refresh requested...');
    const updated = await extractAndCacheData();
    memoryCache = updated;
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

// Explicit root route serving index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server locally if not running on Vercel
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🔥 Black Friday 2026 Prediction Dashboard Running!`);
    console.log(`🌐 URL: http://localhost:${PORT}`);
    console.log(`====================================================`);
  });
}

// Export Express app for Vercel Serverless Handler
module.exports = app;
