const { generateForecast2026 } = require('../src/forecast_engine');
const { handleAIChatQuestion } = require('../src/ai_assistant');

let memoryCache = null;

function getCachedData() {
  if (memoryCache) return memoryCache;

  try {
    const rawData = require('../data/black_friday_analytics.json');
    if (rawData && rawData.rawHistorical) {
      memoryCache = rawData;
      return memoryCache;
    }
  } catch (e) {
    console.warn('Fallback to real_bq_dump.json:', e.message);
  }

  try {
    const dump = require('../data/real_bq_dump.json');
    const historicalData = {
      dailyComparison: dump.dailyRows.map(r => ({
        year: r.year,
        day_of_week_num: r.day_of_week_num,
        day_name: r.day_name,
        full_date: r.full_date.value || r.full_date,
        total_clicks: Number(r.total_clicks || 0),
        total_sales: Number(r.total_sales || 0),
        total_sales_val: Number(r.total_sales_val || 0),
        total_commission_val: Number(r.total_commission_val || 0)
      })),
      hourlyHeatmap: dump.hourlyRows.map(r => ({
        hour_of_day: Number(r.hour_of_day),
        year: Number(r.year),
        date: r.date.value || r.date,
        sales_count: Number(r.sales_count || 0),
        total_commission: Number(r.total_commission || 0),
        total_order_value: Number(r.total_order_value || 0)
      })),
      nicheBreakdown: dump.nicheRows.map(r => ({
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
  } catch (err) {
    throw new Error('Dataset file not found in Vercel bundle: ' + err.message);
  }
}

module.exports = (req, res) => {
  try {
    const { question, growth, niche } = req.body || {};
    const growthModifier = parseFloat(growth) || 1.15;
    const selectedNiche = niche || 'ALL';
    const cache = getCachedData();
    const dynamicForecast = generateForecast2026(cache.rawHistorical, growthModifier, selectedNiche);

    const response = handleAIChatQuestion(question || '', dynamicForecast);

    res.status(200).json({
      success: true,
      reply: response.answer,
      relatedTopics: response.relatedTopics
    });
  } catch (err) {
    console.error('API Chat Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};
