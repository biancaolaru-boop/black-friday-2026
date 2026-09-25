/**
 * Vercel Serverless Function API Entrypoint
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const { generateForecast2026 } = require('../src/forecast_engine');
const { handleAIChatQuestion } = require('../src/ai_assistant');

const app = express();

app.use(cors());
app.use(express.json());

// In-memory cache for BQ dataset
let memoryCache = null;

function getCachedData() {
  if (memoryCache) {
    return memoryCache;
  }

  // Path resolution for Vercel Serverless environment
  const possiblePaths = [
    path.join(__dirname, '../data/black_friday_analytics.json'),
    path.join(process.cwd(), 'data/black_friday_analytics.json'),
    path.join(__dirname, '../data/real_bq_dump.json'),
    path.join(process.cwd(), 'data/real_bq_dump.json')
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      try {
        const raw = fs.readFileSync(p, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed.rawHistorical) {
          memoryCache = parsed;
          return memoryCache;
        } else if (parsed.dailyRows) {
          // Format from raw_bq_dump.json
          const historicalData = {
            dailyComparison: parsed.dailyRows.map(r => ({
              year: r.year,
              day_of_week_num: r.day_of_week_num,
              day_name: r.day_name,
              full_date: r.full_date.value || r.full_date,
              total_clicks: Number(r.total_clicks || 0),
              total_sales: Number(r.total_sales || 0),
              total_sales_val: Number(r.total_sales_val || 0),
              total_commission_val: Number(r.total_commission_val || 0)
            })),
            hourlyHeatmap: parsed.hourlyRows.map(r => ({
              hour_of_day: Number(r.hour_of_day),
              year: Number(r.year),
              date: r.date.value || r.date,
              sales_count: Number(r.sales_count || 0),
              total_commission: Number(r.total_commission || 0),
              total_order_value: Number(r.total_order_value || 0)
            })),
            nicheBreakdown: parsed.nicheRows.map(r => ({
              niche_category: r.niche_category,
              year: Number(r.year),
              total_clicks: Number(r.total_clicks || 0),
              total_sales: Number(r.total_sales || 0),
              total_sales_val: Number(r.total_sales_val || 0),
              total_commissions: Number(r.total_commissions || 0)
            }))
          };

          const forecast2026 = generateForecast2026(historicalData, 1.15);
          memoryCache = {
            dataSource: 'BigQuery Real Production Data (performant-bi-and-analytics, EU)',
            lastUpdated: new Date().toISOString(),
            rawHistorical: historicalData,
            forecast2026
          };
          return memoryCache;
        }
      } catch (err) {
        console.warn(`Error parsing ${p}:`, err.message);
      }
    }
  }

  throw new Error('Dataset file not found in Vercel serverless bundle');
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

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

module.exports = app;
