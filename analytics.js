const { generateForecast2026 } = require('../src/forecast_engine');
const dump = require('../src/embedded_dataset');

let memoryCache = null;

function getCachedData() {
  if (memoryCache) return memoryCache;

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
}

module.exports = (req, res) => {
  try {
    const growthModifier = parseFloat(req.query?.growth) || 1.15;
    const selectedNiche = req.query?.niche || 'ALL';
    const cache = getCachedData();

    const dynamicForecast = generateForecast2026(cache.rawHistorical, growthModifier, selectedNiche);

    res.status(200).json({
      success: true,
      dataSource: cache.dataSource,
      lastUpdated: cache.lastUpdated,
      forecast2026: dynamicForecast
    });
  } catch (err) {
    console.error('API Analytics Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};
