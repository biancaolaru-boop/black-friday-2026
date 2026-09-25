/**
 * Express Server for Black Friday 2026 Predictions Landing Page
 * Full Root-level & Subfolder fallback compatibility for Vercel Serverless Functions
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Safe imports with fallback paths (root vs src/)
let generateForecast2026 = null;
try {
  generateForecast2026 = require('./src/forecast_engine').generateForecast2026;
} catch (e) {
  try {
    generateForecast2026 = require('./forecast_engine').generateForecast2026;
  } catch (err) {
    console.error('Could not load forecast_engine:', err.message);
  }
}

let handleAIChatQuestion = null;
try {
  handleAIChatQuestion = require('./src/ai_assistant').handleAIChatQuestion;
} catch (e) {
  try {
    handleAIChatQuestion = require('./ai_assistant').handleAIChatQuestion;
  } catch (err) {
    console.error('Could not load ai_assistant:', err.message);
  }
}

// Import embedded dataset directly from root or src
let dump = null;
try {
  dump = require('./embedded_dataset.js');
} catch (e) {
  try {
    dump = require('./src/embedded_dataset.js');
  } catch (err) {
    console.error('Could not load embedded dataset:', err.message);
  }
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve static assets from both root and public
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname));

// Safe dataset formatter
let memoryCache = null;

function getCachedData() {
  if (memoryCache) return memoryCache;

  if (!dump) {
    throw new Error('Embedded BigQuery dataset not found');
  }

  const historicalData = {
    dailyComparison: (dump.dailyRows || []).map(r => ({
      year: r.year,
      day_of_week_num: r.day_of_week_num,
      day_name: r.day_name,
      full_date: r.full_date ? (r.full_date.value || r.full_date) : '',
      total_clicks: Number(r.total_clicks || 0),
      total_sales: Number(r.total_sales || 0),
      total_sales_val: Number(r.total_sales_val || 0),
      total_commission_val: Number(r.total_commission_val || 0)
    })),
    hourlyHeatmap: (dump.hourlyRows || []).map(r => ({
      hour_of_day: Number(r.hour_of_day),
      year: Number(r.year),
      date: r.date ? (r.date.value || r.date) : '',
      sales_count: Number(r.sales_count || 0),
      total_commission: Number(r.total_commission || 0),
      total_order_value: Number(r.total_order_value || 0)
    })),
    nicheBreakdown: (dump.nicheRows || []).map(r => ({
      niche_category: r.niche_category,
      year: Number(r.year),
      total_clicks: Number(r.total_clicks || 0),
      total_sales: Number(r.total_sales || 0),
      total_sales_val: Number(r.total_sales_val || 0),
      total_commissions: Number(r.total_commissions || 0)
    }))
  };

  if (!generateForecast2026) {
    throw new Error('generateForecast2026 engine function is missing');
  }

  const forecast2026 = generateForecast2026(historicalData, 1.15);
  memoryCache = {
    dataSource: 'BigQuery Real Production Data (performant-bi-and-analytics, EU)',
    lastUpdated: new Date().toISOString(),
    rawHistorical: historicalData,
    forecast2026
  };
  return memoryCache;
}

// API Routes
app.get('/api/analytics', (req, res) => {
  try {
    const growthModifier = parseFloat(req.query.growth) || 1.15;
    const selectedNiche = req.query.niche || 'ALL';
    const cache = getCachedData();

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
    const { question, growth, niche } = req.body || {};
    const growthModifier = parseFloat(growth) || 1.15;
    const selectedNiche = niche || 'ALL';
    const cache = getCachedData();
    const dynamicForecast = generateForecast2026(cache.rawHistorical, growthModifier, selectedNiche);

    if (!handleAIChatQuestion) {
      return res.json({ success: true, reply: 'Asistentul AI este în mentenanță.' });
    }

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

// Explicit root route serving index.html from root or public
app.get('*', (req, res) => {
  const rootIndex = path.join(__dirname, 'index.html');
  const publicIndex = path.join(__dirname, 'public', 'index.html');

  if (fs.existsSync(rootIndex)) {
    return res.sendFile(rootIndex);
  } else if (fs.existsSync(publicIndex)) {
    return res.sendFile(publicIndex);
  }
  res.status(404).send('index.html not found');
});

// Start Server locally if run directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🔥 Black Friday 2026 Prediction Dashboard Running!`);
    console.log(`🌐 URL: http://localhost:${PORT}`);
    console.log(`====================================================`);
  });
}

// Export Express app for Vercel
module.exports = app;
