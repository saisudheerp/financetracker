import React, { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { supabase } from "../supabaseClient";
import PORTFOLIO_CONFIG from "../config/portfolioConfig";
import { formatINR } from "../utils/currencyUtils";

const PortfolioCharts = ({ holdings, prices, stats }) => {
  const [portfolioGrowthData, setPortfolioGrowthData] = useState([]);
  const [sectorData, setSectorData] = useState([]);
  const [dailyGainLossData, setDailyGainLossData] = useState([]);

  useEffect(() => {
    if (holdings.length > 0 && Object.keys(prices).length > 0) {
      prepareChartData();
    }
  }, [holdings, prices, stats]);

  const prepareChartData = async () => {
    // 1. Portfolio Growth Data - Load from portfolio_history table
    try {
      const { data: historyData, error } = await supabase
        .from("portfolio_history")
        .select("*")
        .order("recorded_at", { ascending: true })
        .limit(30); // Last 30 snapshots

      if (!error && historyData && historyData.length > 0) {
        const growthData = historyData.map((snapshot) => ({
          date: new Date(snapshot.recorded_at).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
          }),
          invested: parseFloat(snapshot.total_invested),
          current: parseFloat(snapshot.total_value),
        }));

        setPortfolioGrowthData(growthData);
        console.log(
          `📊 Loaded ${growthData.length} portfolio snapshots from history`
        );
      } else {
        // Fallback: Use current values if no history exists
        console.log("📊 No history data, using current values");
        const growthData = [
          {
            date: new Date().toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
            }),
            invested: stats.totalInvested,
            current: stats.totalCurrent,
          },
        ];
        setPortfolioGrowthData(growthData);
      }
    } catch (err) {
      console.error("Error loading portfolio history:", err);
      // Fallback to current values
      const growthData = [
        {
          date: new Date().toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
          }),
          invested: stats.totalInvested,
          current: stats.totalCurrent,
        },
      ];
      setPortfolioGrowthData(growthData);
    }

    // 2. Asset Type Allocation Data (Stocks vs Mutual Funds)
    let stocksTotal = 0;
    let mutualFundsTotal = 0;

    holdings.forEach((holding) => {
      const priceData = prices[holding.symbol];
      if (priceData) {
        const currentValue = holding.quantity * priceData.currentPrice;
        if (holding.asset_type === "stock") {
          stocksTotal += currentValue;
        } else if (holding.asset_type === "mutual_fund") {
          mutualFundsTotal += currentValue;
        }
      }
    });

    const assetTypeData = [];
    if (stocksTotal > 0) {
      assetTypeData.push({
        name: "Stocks",
        value: parseFloat(stocksTotal.toFixed(2)),
      });
    }
    if (mutualFundsTotal > 0) {
      assetTypeData.push({
        name: "Mutual Funds",
        value: parseFloat(mutualFundsTotal.toFixed(2)),
      });
    }

    setSectorData(assetTypeData);

    // 3. Daily Gain/Loss by Holding
    const gainLossData = holdings
      .map((holding) => {
        const priceData = prices[holding.symbol];
        if (!priceData) return null;

        const currentValue = holding.quantity * priceData.currentPrice;
        const investedValue = holding.quantity * holding.purchase_price;
        const gainLoss = currentValue - investedValue;

        return {
          name:
            holding.name.length > 20
              ? holding.name.substring(0, 17) + "..."
              : holding.name,
          gainLoss: parseFloat(gainLoss.toFixed(2)),
          color:
            gainLoss >= 0
              ? PORTFOLIO_CONFIG.CHART_COLORS.success
              : PORTFOLIO_CONFIG.CHART_COLORS.danger,
        };
      })
      .filter(Boolean);

    setDailyGainLossData(gainLossData);
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-xl border-2 border-teal-200 dark:border-teal-700">
          <p className="font-semibold text-gray-900 dark:text-gray-100">
            {label}
          </p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}:{" "}
              {typeof entry.value === "number"
                ? `₹${entry.value.toLocaleString("en-IN")}`
                : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Portfolio Growth Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
        <h3 className="font-playfair text-xl font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
          <LineChart className="w-5 h-5 text-teal-600" />
          Portfolio Growth (Last 7 Days)
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={portfolioGrowthData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              stroke="#6b7280"
              style={{ fontSize: "12px" }}
            />
            <YAxis
              stroke="#6b7280"
              style={{ fontSize: "12px" }}
              tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line
              type="monotone"
              dataKey="invested"
              stroke="#f59e0b"
              strokeWidth={2}
              name="Invested"
              dot={{ fill: "#f59e0b", r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="current"
              stroke="#14b8a6"
              strokeWidth={3}
              name="Current Value"
              dot={{ fill: "#14b8a6", r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Asset Type Allocation Pie Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
          <h3 className="font-playfair text-xl font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-teal-600" />
            Asset Allocation (Stocks vs Mutual Funds)
          </h3>
          {sectorData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={sectorData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {sectorData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.name === "Stocks" ? "#14b8a6" : "#8b5cf6"}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>

              {/* Legend */}
              <div className="mt-4 grid grid-cols-2 gap-2">
                {sectorData.map((sector, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{
                        backgroundColor:
                          sector.name === "Stocks"
                            ? "#14b8a6" // Teal for stocks
                            : "#8b5cf6", // Purple for mutual funds
                      }}
                    />
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      {sector.name}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-400">
              <p>No asset data available</p>
            </div>
          )}
        </div>

        {/* Daily Gain/Loss Bar Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
          <h3 className="font-playfair text-xl font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
            <BarChart className="w-5 h-5 text-teal-600" />
            Gain/Loss by Holding
          </h3>
          {dailyGainLossData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={dailyGainLossData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="name"
                  stroke="#6b7280"
                  style={{ fontSize: "10px" }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis
                  stroke="#6b7280"
                  style={{ fontSize: "12px" }}
                  tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="gainLoss" name="Gain/Loss" radius={[8, 8, 0, 0]}>
                  {dailyGainLossData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-400">
              <p>No holdings data available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PortfolioCharts;
