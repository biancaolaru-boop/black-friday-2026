/**
 * Forecast Engine for Black Friday 2026 Predictions
 * Period: 2026-11-02 to 2026-11-08 (Monday to Sunday)
 * Based on historical purchase behavior, hourly spikes, and niche growth rates from 2024 & 2025.
 */

function generateForecast2026(historicalData, growthModifier = 1.15, selectedNiche = 'ALL') {
  const { dailyComparison, hourlyHeatmap, nicheBreakdown } = historicalData;

  // 1. Process Niche/Category Breakdown first to compute shares
  const nichesMap = {};
  nicheBreakdown.forEach((item) => {
    const category = item.niche_category || 'General E-Commerce';
    if (!nichesMap[category]) {
      nichesMap[category] = { category, y2024Val: 0, y2025Val: 0 };
    }
    if (item.year === 2024) nichesMap[category].y2024Val += Number(item.total_sales_val) || 0;
    if (item.year === 2025) nichesMap[category].y2025Val += Number(item.total_sales_val) || 0;
  });

  const allNicheProcessed = Object.values(nichesMap)
    .filter((n) => !n.category.toLowerCase().includes('all others') && !n.category.toLowerCase().includes('undefined'))
    .map((n) => {
      const growth = n.y2024Val > 0 ? (n.y2025Val - n.y2024Val) / n.y2024Val : 0.15;
      const y2026Val = Math.round(n.y2025Val * growthModifier);
      return {
        category: n.category,
        y2024Val: Math.round(n.y2024Val),
        y2025Val: Math.round(n.y2025Val),
        y2026ForecastVal: y2026Val,
        growthRateYoY: Math.round(growth * 100)
      };
    }).sort((a, b) => b.y2026ForecastVal - a.y2026ForecastVal);

  const grandTotal2026Forecast = allNicheProcessed.reduce((acc, n) => acc + n.y2026ForecastVal, 0);

  // Determine Niche Share Factor if filtered
  let nicheShareFactor = 1.0;
  let activeNicheObj = null;

  if (selectedNiche && selectedNiche !== 'ALL') {
    activeNicheObj = allNicheProcessed.find(n => 
      n.category.toLowerCase() === selectedNiche.toLowerCase() ||
      n.category.toLowerCase().includes(selectedNiche.toLowerCase()) ||
      selectedNiche.toLowerCase().includes(n.category.toLowerCase())
    );
    if (activeNicheObj && grandTotal2026Forecast > 0) {
      nicheShareFactor = activeNicheObj.y2026ForecastVal / grandTotal2026Forecast;
    }
  }

  // 2. Process Daily Growth Trends
  const daysMap = {
    1: { name: 'Duminică', dayCode: 'Sun' },
    2: { name: 'Luni', dayCode: 'Mon' },
    3: { name: 'Marți', dayCode: 'Tue' },
    4: { name: 'Miercuri', dayCode: 'Wed' },
    5: { name: 'Joi', dayCode: 'Thu' },
    6: { name: 'Vineri (Black Friday)', dayCode: 'Fri' },
    7: { name: 'Sâmbătă', dayCode: 'Sat' }
  };

  const weekSequence = [2, 3, 4, 5, 6, 7, 1];

  const dailyProcessed = weekSequence.map((dayNum) => {
    const d2024 = dailyComparison.find(
      (r) => r.year === 2024 && Number(r.day_of_week_num) === dayNum
    ) || { total_clicks: 0, total_sales: 0, total_sales_val: 0, total_commission_val: 0 };

    const d2025 = dailyComparison.find(
      (r) => r.year === 2025 && Number(r.day_of_week_num) === dayNum
    ) || { total_clicks: 0, total_sales: 0, total_sales_val: 0, total_commission_val: 0 };

    const salesVal2024 = Math.round((Number(d2024.total_sales_val) || 1) * nicheShareFactor);
    const salesVal2025 = Math.round((Number(d2025.total_sales_val) || salesVal2024 * 1.12) * nicheShareFactor);

    const forecastedSalesVal = Math.round(salesVal2025 * growthModifier);
    const forecastedSalesCount = Math.round((Number(d2025.total_sales) || 1000) * nicheShareFactor * (forecastedSalesVal / (salesVal2025 || 1)));
    const forecastedClicks = Math.round((Number(d2025.total_clicks) || 20000) * nicheShareFactor * (forecastedSalesVal / (salesVal2025 || 1)));
    const forecastedCommissions = Math.round(forecastedSalesVal * 0.08);

    return {
      dayNum,
      dayName: daysMap[dayNum].name,
      dayCode: daysMap[dayNum].dayCode,
      y2024: {
        clicks: Math.round((Number(d2024.total_clicks) || 0) * nicheShareFactor),
        salesCount: Math.round((Number(d2024.total_sales) || 0) * nicheShareFactor),
        salesVal: salesVal2024,
        commissions: Math.round((Number(d2024.total_commission_val) || 0) * nicheShareFactor)
      },
      y2025: {
        clicks: Math.round((Number(d2025.total_clicks) || 0) * nicheShareFactor),
        salesCount: Math.round((Number(d2025.total_sales) || 0) * nicheShareFactor),
        salesVal: salesVal2025,
        commissions: Math.round((Number(d2025.total_commission_val) || 0) * nicheShareFactor)
      },
      y2026Forecast: {
        clicks: forecastedClicks,
        salesCount: forecastedSalesCount,
        salesVal: forecastedSalesVal,
        commissions: forecastedCommissions
      }
    };
  });

  // 3. Process Hourly Distribution with category-specific curve shape
  let hourlyProfileWeight = (h) => 1.0;
  if (selectedNiche && selectedNiche !== 'ALL') {
    const s = selectedNiche.toLowerCase();
    if (s.includes('fashion') || s.includes('beauty')) {
      // Fashion & Beauty: lower midnight spike, higher morning (09-12) & evening (20-22)
      hourlyProfileWeight = (h) => {
        if (h >= 0 && h <= 2) return 0.65;
        if (h >= 9 && h <= 12) return 1.35;
        if (h >= 20 && h <= 22) return 1.30;
        return 0.95;
      };
    } else if (s.includes('it&c') || s.includes('electronics')) {
      // IT&C: massive midnight launch spike (00-02), strong morning (09-11)
      hourlyProfileWeight = (h) => {
        if (h >= 0 && h <= 2) return 1.50;
        if (h >= 9 && h <= 11) return 1.25;
        if (h >= 13 && h <= 17) return 0.75;
        return 0.90;
      };
    }
  }

  const hoursArray = Array.from({ length: 24 }, (_, i) => i);
  const hourlyProcessed = hoursArray.map((hour) => {
    const h2024 = hourlyHeatmap.find((r) => r.year === 2024 && Number(r.hour_of_day) === hour) || { sales_count: 0, total_order_value: 0 };
    const h2025 = hourlyHeatmap.find((r) => r.year === 2025 && Number(r.hour_of_day) === hour) || { sales_count: 0, total_order_value: 0 };

    const hw = hourlyProfileWeight(hour);
    const val2024 = Math.round((Number(h2024.total_order_value) || 1) * nicheShareFactor * hw);
    const val2025 = Math.round((Number(h2025.total_order_value) || val2024 * 1.1) * nicheShareFactor * hw);

    const hourlyGrowthRate = (val2025 - val2024) / (val2024 || 1);
    const forecastVal = Math.round(val2025 * growthModifier);

    return {
      hour: `${String(hour).padStart(2, '0')}:00`,
      hourNum: hour,
      salesVal2024: val2024,
      salesVal2025: val2025,
      salesVal2026Forecast: forecastVal,
      hourlyGrowthYoY: Math.round(hourlyGrowthRate * 100),
      isPeak: hour >= 0 && hour <= 2 || hour >= 8 && hour <= 11 || hour >= 19 && hour <= 22
    };
  });

  // 4. Calculate Totals & Summary KPIs
  const total2024 = dailyProcessed.reduce((acc, d) => acc + d.y2024.salesVal, 0);
  const total2025 = dailyProcessed.reduce((acc, d) => acc + d.y2025.salesVal, 0);
  const total2026Forecast = dailyProcessed.reduce((acc, d) => acc + d.y2026Forecast.salesVal, 0);

  const totalCommissions2026 = dailyProcessed.reduce((acc, d) => acc + d.y2026Forecast.commissions, 0);
  const totalClicks2026 = dailyProcessed.reduce((acc, d) => acc + d.y2026Forecast.clicks, 0);
  const totalSalesCount2026 = dailyProcessed.reduce((acc, d) => acc + d.y2026Forecast.salesCount, 0);

  // 5. Strategic Modules
  const totalSalesVal = total2026Forecast;
  const totalSalesCount = totalSalesCount2026;

  let mobilePct = 76;
  if (selectedNiche && selectedNiche !== 'ALL') {
    const s = selectedNiche.toLowerCase();
    if (s.includes('fashion')) mobilePct = 84;
    else if (s.includes('beauty')) mobilePct = 82;
    else if (s.includes('kids') || s.includes('toys')) mobilePct = 80;
    else if (s.includes('it&c') || s.includes('electronics')) mobilePct = 68;
    else if (s.includes('home') || s.includes('garden')) mobilePct = 72;
    else if (s.includes('auto')) mobilePct = 70;
    else if (s.includes('book') || s.includes('media')) mobilePct = 78;
    else mobilePct = 75;
  }
  const desktopPct = 100 - mobilePct;

  const deviceMix = [
    { device: 'Dispozitive Mobile (App & Web)', percentage: mobilePct, salesVal: Math.round(totalSalesVal * (mobilePct / 100)), icon: '📱' },
    { device: 'Desktop / Laptop', percentage: desktopPct, salesVal: Math.round(totalSalesVal * (desktopPct / 100)), icon: '💻' }
  ];

  const aovByCategory = [
    { category: 'IT&C & Electronics (Strict Friday)', aovRON: 229 },
    { category: 'Automotive', aovRON: 209 },
    { category: 'Home & Garden', aovRON: 179 },
    { category: 'Sports & Outdoors', aovRON: 114 },
    { category: 'Fashion & Apparel', aovRON: 88 },
    { category: 'Beauty & Cosmetics', aovRON: 83 },
    { category: 'Babies Kids & Toys', aovRON: 74 },
    { category: 'Pet Supplies', aovRON: 58 },
    { category: 'Pharma & Health', aovRON: 37 },
    { category: 'Books & Media', aovRON: 30 }
  ];

  // Module 3: Category-specific Financial Health (Approval / Rejection Rates)
  let appRate = 88.9;
  if (selectedNiche && selectedNiche !== 'ALL') {
    const s = selectedNiche.toLowerCase();
    if (s.includes('fashion')) appRate = 83.5;
    else if (s.includes('beauty')) appRate = 91.2;
    else if (s.includes('it&c') || s.includes('electronics')) appRate = 92.4;
    else if (s.includes('kids') || s.includes('toys')) appRate = 88.0;
    else if (s.includes('book') || s.includes('media')) appRate = 94.5;
    else if (s.includes('home') || s.includes('garden')) appRate = 89.5;
    else if (s.includes('auto')) appRate = 90.1;
  }
  const cancRate = Number((100 - appRate).toFixed(1));

  const financialHealth = {
    approvedRatePct: appRate,
    approvedSalesVal: Math.round(totalSalesVal * (appRate / 100)),
    approvedCommissionsVal: Math.round(totalCommissions2026 * (appRate / 100)),
    canceledRatePct: cancRate,
    canceledSalesVal: Math.round(totalSalesVal * (cancRate / 100))
  };

  // Module 4: Category-specific Publisher Mix
  let publisherMix = [];
  const sNiche = (selectedNiche || '').toLowerCase();
  if (sNiche.includes('fashion')) {
    publisherMix = [
      { type: 'Social Media & Content Creators', percentage: 36, salesVal: Math.round(totalSalesVal * 0.36) },
      { type: 'Coupons & Vouchers', percentage: 24, salesVal: Math.round(totalSalesVal * 0.24) },
      { type: 'Google Shopping Ads (CSS)', percentage: 20, salesVal: Math.round(totalSalesVal * 0.20) },
      { type: 'Cashbacks & Loyalty', percentage: 12, salesVal: Math.round(totalSalesVal * 0.12) },
      { type: 'Google Ads - Search', percentage: 8, salesVal: Math.round(totalSalesVal * 0.08) }
    ];
  } else if (sNiche.includes('it&c') || sNiche.includes('electronics')) {
    publisherMix = [
      { type: 'Google Shopping Ads (CSS)', percentage: 64, salesVal: Math.round(totalSalesVal * 0.64) },
      { type: 'Google Ads - Search', percentage: 18, salesVal: Math.round(totalSalesVal * 0.18) },
      { type: 'Product Aggregators (Comparatoare)', percentage: 8, salesVal: Math.round(totalSalesVal * 0.08) },
      { type: 'Cashbacks & Loyalty', percentage: 6, salesVal: Math.round(totalSalesVal * 0.06) },
      { type: 'Coupons & Vouchers', percentage: 4, salesVal: Math.round(totalSalesVal * 0.04) }
    ];
  } else if (sNiche.includes('beauty')) {
    publisherMix = [
      { type: 'Social Media & Influencer Content', percentage: 40, salesVal: Math.round(totalSalesVal * 0.40) },
      { type: 'Google Shopping Ads (CSS)', percentage: 22, salesVal: Math.round(totalSalesVal * 0.22) },
      { type: 'Coupons & Vouchers', percentage: 20, salesVal: Math.round(totalSalesVal * 0.20) },
      { type: 'Cashbacks & Loyalty', percentage: 18, salesVal: Math.round(totalSalesVal * 0.18) }
    ];
  } else {
    publisherMix = [
      { type: 'Google Shopping Ads (CSS)', percentage: 58, salesVal: Math.round(totalSalesVal * 0.58) },
      { type: 'Coupons & Vouchers', percentage: 12, salesVal: Math.round(totalSalesVal * 0.12) },
      { type: 'Cashbacks & Loyalty', percentage: 11, salesVal: Math.round(totalSalesVal * 0.11) },
      { type: 'Google Ads - Search', percentage: 9, salesVal: Math.round(totalSalesVal * 0.09) },
      { type: 'Product Aggregators', percentage: 4, salesVal: Math.round(totalSalesVal * 0.04) },
      { type: 'Social Media & Content', percentage: 6, salesVal: Math.round(totalSalesVal * 0.06) }
    ];
  }

  // Module 5: Category-specific Voucher Penetration
  let vPct = 14;
  if (sNiche.includes('fashion')) vPct = 32;
  else if (sNiche.includes('beauty')) vPct = 28;
  else if (sNiche.includes('it&c') || sNiche.includes('electronics')) vPct = 11;
  else if (sNiche.includes('book') || sNiche.includes('media')) vPct = 22;
  else if (sNiche.includes('home') || sNiche.includes('garden')) vPct = 18;

  const directPct = 100 - vPct;

  const voucherStats = {
    voucherOrdersPct: vPct,
    voucherOrdersCount: Math.round(totalSalesCount * (vPct / 100)),
    directDiscountOrdersPct: directPct,
    directDiscountOrdersCount: Math.round(totalSalesCount * (directPct / 100))
  };

  return {
    forecastMeta: {
      targetPeriod: '2026-11-02 - 2026-11-08',
      targetYear: 2026,
      selectedNiche: selectedNiche,
      generatedAt: new Date().toISOString(),
      growthModifier
    },
    summaryKPIs: {
      totalSalesVal2024: total2024,
      totalSalesVal2025: total2025,
      totalSalesVal2026Forecast: total2026Forecast,
      yoyGrowth2025Vs2024: Math.round(((total2025 - total2024) / (total2024 || 1)) * 100),
      projectedGrowth2026Vs2025: Math.round(((total2026Forecast - total2025) / (total2025 || 1)) * 100),
      totalCommissions2026Forecast: totalCommissions2026,
      totalClicks2026Forecast: totalClicks2026,
      totalSalesCount2026Forecast: totalSalesCount2026,
      peakHourDay: '00:00 (Noaptea de Black Friday) & 09:00 - 11:00 (Morning Rush)'
    },
    dailySequence: dailyProcessed,
    hourlyHeatmap: hourlyProcessed,
    nicheBreakdown: allNicheProcessed,
    deviceMix,
    aovByCategory,
    financialHealth,
    publisherMix,
    voucherStats
  };
}

module.exports = {
  generateForecast2026
};
