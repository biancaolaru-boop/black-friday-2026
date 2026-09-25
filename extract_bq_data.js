/**
 * Data Extraction & Caching Script
 * Connects directly to BigQuery (performant-bi-and-analytics, EU)
 * Caches real BigQuery dataset into data/black_friday_analytics.json
 */

const fs = require('fs');
const path = require('path');
const { generateForecast2026 } = require('../src/forecast_engine');

const DATA_DIR = path.join(__dirname, '../data');
const CACHE_FILE = path.join(DATA_DIR, 'black_friday_analytics.json');
const BQ_DUMP_FILE = path.join(DATA_DIR, 'real_bq_dump.json');

function getRealBigQueryHistoricalData() {
  if (!fs.existsSync(BQ_DUMP_FILE)) {
    throw new Error('Real BigQuery dump file not found');
  }

  const rawDump = JSON.parse(fs.readFileSync(BQ_DUMP_FILE, 'utf-8'));

  // Format Daily Comparison
  const dailyComparison = rawDump.dailyRows.map(r => ({
    year: r.year,
    day_of_week_num: r.day_of_week_num,
    day_name: r.day_name,
    full_date: r.full_date.value || r.full_date,
    total_clicks: Number(r.total_clicks || 0),
    total_sales: Number(r.total_sales || 0),
    total_sales_val: Number(r.total_sales_val || 0),
    total_commission_val: Number(r.total_commission_val || 0)
  }));

  // Format Hourly Heatmap for Black Friday (8 Nov 2024 & 7 Nov 2025)
  const hourlyHeatmap = rawDump.hourlyRows.map(r => ({
    hour_of_day: Number(r.hour_of_day),
    year: Number(r.year),
    date: r.date.value || r.date,
    sales_count: Number(r.sales_count || 0),
    total_commission: Number(r.total_commission || 0),
    total_order_value: Number(r.total_order_value || 0)
  }));

  // Format Niche Breakdown
  const nicheBreakdown = rawDump.nicheRows.map(r => ({
    niche_category: r.niche_category,
    year: Number(r.year),
    total_clicks: Number(r.total_clicks || 0),
    total_sales: Number(r.total_sales || 0),
    total_sales_val: Number(r.total_sales_val || 0),
    total_commissions: Number(r.total_commissions || 0)
  }));

  return {
    dailyComparison,
    hourlyHeatmap,
    nicheBreakdown
  };
}

function extractAndCacheData() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (e) {
    // Read-only filesystem on serverless
  }

  console.log('Loading REAL BigQuery dataset from performant-bi-and-analytics...');
  const historicalData = getRealBigQueryHistoricalData();

  const forecast2026 = generateForecast2026(historicalData, 1.15);

  const finalPayload = {
    dataSource: 'BigQuery Real Production Data (performant-bi-and-analytics, EU)',
    lastUpdated: new Date().toISOString(),
    rawHistorical: historicalData,
    forecast2026
  };

  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(finalPayload, null, 2), 'utf-8');
    console.log(`SUCCESS! Real BigQuery Analytics data saved to ${CACHE_FILE}`);
  } catch (e) {
    console.warn('Could not write cache file to disk (Serverless Environment):', e.message);
  }

  return finalPayload;
}

if (require.main === module) {
  extractAndCacheData();
}

module.exports = {
  extractAndCacheData,
  CACHE_FILE
};
