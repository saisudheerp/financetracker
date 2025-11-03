import React, { useState, useEffect } from "react";
import { X, Search, TrendingUp, DollarSign } from "lucide-react";
import PORTFOLIO_CONFIG from "../config/portfolioConfig";
import { searchMutualFunds } from "../utils/portfolioService";

const AddHoldingModal = ({ isOpen, onClose, onSave, editData }) => {
  const [formData, setFormData] = useState({
    asset_type: "stock",
    symbol: "",
    name: "",
    quantity: "",
    purchase_price: "",
    purchase_date: new Date().toISOString().split("T")[0],
    sector: "",
    exchange: "NSE",
  });

  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (editData) {
      setFormData({
        asset_type: editData.asset_type,
        symbol: editData.symbol,
        name: editData.name,
        quantity: editData.quantity,
        purchase_price: editData.purchase_price,
        purchase_date: editData.purchase_date,
        sector: editData.sector || "",
        exchange: editData.exchange || "NSE",
      });
    } else {
      // Reset form
      setFormData({
        asset_type: "stock",
        symbol: "",
        name: "",
        quantity: "",
        purchase_price: "",
        purchase_date: new Date().toISOString().split("T")[0],
        sector: "",
        exchange: "NSE",
      });
    }
  }, [editData, isOpen]);

  useEffect(() => {
    if (searchQuery && formData.asset_type === "mutual_fund") {
      searchMutualFunds(searchQuery).then((results) => {
        setSearchResults(results);
      });
    } else if (searchQuery && formData.asset_type === "stock") {
      const filtered = PORTFOLIO_CONFIG.POPULAR_STOCKS.filter(
        (stock) =>
          stock.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          stock.symbol.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setSearchResults(filtered);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, formData.asset_type]);

  const handleSelectStock = (stock) => {
    setFormData({
      ...formData,
      symbol: stock.symbol,
      name: stock.name,
      sector: stock.sector || "",
    });
    setShowSearch(false);
    setSearchQuery("");
  };

  const handleSelectMF = (fund) => {
    setFormData({
      ...formData,
      symbol: fund.code,
      name: fund.name,
      sector: fund.category || "",
    });
    setShowSearch(false);
    setSearchQuery("");
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validate
    if (
      !formData.symbol ||
      !formData.name ||
      !formData.quantity ||
      !formData.purchase_price
    ) {
      alert("Please fill all required fields");
      return;
    }

    // Format symbol for stocks
    let finalSymbol = formData.symbol;
    if (formData.asset_type === "stock" && !finalSymbol.includes(".")) {
      finalSymbol = `${finalSymbol}.${
        formData.exchange === "NSE" ? "NS" : "BO"
      }`;
    }

    const dataToSave = {
      ...formData,
      symbol: finalSymbol,
      quantity: parseFloat(formData.quantity),
      purchase_price: parseFloat(formData.purchase_price),
    };

    onSave(dataToSave);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-teal-600 to-cyan-600 dark:from-teal-700 dark:to-cyan-700 p-6 rounded-t-3xl flex items-center justify-between">
          <div>
            <h2 className="font-playfair text-2xl font-bold text-white">
              {editData ? "Edit Holding" : "Add New Holding"}
            </h2>
            <p className="text-teal-100 text-sm mt-1">
              Track your stocks and mutual funds
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 p-2 rounded-full transition-all"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Asset Type Selection */}
          <div className="space-y-2">
            <label className="font-poppins text-sm font-semibold text-gray-700 dark:text-gray-300">
              Asset Type *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() =>
                  setFormData({ ...formData, asset_type: "stock" })
                }
                className={`p-4 rounded-xl border-2 transition-all ${
                  formData.asset_type === "stock"
                    ? "border-teal-500 bg-teal-50 dark:bg-teal-900/20"
                    : "border-gray-300 dark:border-gray-600"
                }`}
              >
                <TrendingUp
                  className={`w-6 h-6 mx-auto mb-2 ${
                    formData.asset_type === "stock"
                      ? "text-teal-600"
                      : "text-gray-400"
                  }`}
                />
                <span
                  className={`font-semibold ${
                    formData.asset_type === "stock"
                      ? "text-teal-700 dark:text-teal-400"
                      : "text-gray-600 dark:text-gray-400"
                  }`}
                >
                  Stock
                </span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setFormData({ ...formData, asset_type: "mutual_fund" })
                }
                className={`p-4 rounded-xl border-2 transition-all ${
                  formData.asset_type === "mutual_fund"
                    ? "border-teal-500 bg-teal-50 dark:bg-teal-900/20"
                    : "border-gray-300 dark:border-gray-600"
                }`}
              >
                <DollarSign
                  className={`w-6 h-6 mx-auto mb-2 ${
                    formData.asset_type === "mutual_fund"
                      ? "text-teal-600"
                      : "text-gray-400"
                  }`}
                />
                <span
                  className={`font-semibold ${
                    formData.asset_type === "mutual_fund"
                      ? "text-teal-700 dark:text-teal-400"
                      : "text-gray-600 dark:text-gray-400"
                  }`}
                >
                  Mutual Fund
                </span>
              </button>
            </div>
          </div>

          {/* Exchange (only for stocks) */}
          {formData.asset_type === "stock" && (
            <div className="space-y-2">
              <label className="font-poppins text-sm font-semibold text-gray-700 dark:text-gray-300">
                Exchange *
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, exchange: "NSE" })}
                  className={`p-3 rounded-lg border-2 font-semibold transition-all ${
                    formData.exchange === "NSE"
                      ? "border-teal-500 bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400"
                      : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400"
                  }`}
                >
                  NSE
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, exchange: "BSE" })}
                  className={`p-3 rounded-lg border-2 font-semibold transition-all ${
                    formData.exchange === "BSE"
                      ? "border-teal-500 bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400"
                      : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400"
                  }`}
                >
                  BSE
                </button>
              </div>
            </div>
          )}

          {/* Search for Symbol */}
          <div className="space-y-2">
            <label className="font-poppins text-sm font-semibold text-gray-700 dark:text-gray-300">
              Search {formData.asset_type === "stock" ? "Stock" : "Mutual Fund"}{" "}
              *
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSearch(true);
                }}
                onFocus={() => setShowSearch(true)}
                placeholder={`Search by name or ${
                  formData.asset_type === "stock" ? "symbol" : "code"
                }...`}
                className="w-full px-4 py-3 pl-10 rounded-lg border-2 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 dark:focus:ring-teal-800"
              />
              <Search className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />

              {/* Search Results Dropdown */}
              {showSearch && searchResults.length > 0 && (
                <div className="absolute z-10 w-full mt-2 bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                  {searchResults.map((result, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() =>
                        formData.asset_type === "stock"
                          ? handleSelectStock(result)
                          : handleSelectMF(result)
                      }
                      className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors border-b dark:border-gray-600 last:border-b-0"
                    >
                      <div className="font-semibold text-gray-900 dark:text-gray-100">
                        {result.name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2 mt-1">
                        <span>
                          {formData.asset_type === "stock"
                            ? result.symbol
                            : result.code}
                        </span>
                        {result.sector && <span>• {result.sector}</span>}
                        {result.category && <span>• {result.category}</span>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Symbol (manual entry) */}
          <div className="space-y-2">
            <label className="font-poppins text-sm font-semibold text-gray-700 dark:text-gray-300">
              {formData.asset_type === "stock" ? "Symbol" : "Scheme Code"} *
            </label>
            <input
              type="text"
              value={formData.symbol}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  symbol: e.target.value.toUpperCase(),
                })
              }
              placeholder={
                formData.asset_type === "stock"
                  ? "e.g., RELIANCE"
                  : "e.g., 120503"
              }
              className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 dark:focus:ring-teal-800"
              required
            />
          </div>

          {/* Name */}
          <div className="space-y-2">
            <label className="font-poppins text-sm font-semibold text-gray-700 dark:text-gray-300">
              Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="Company or Fund Name"
              className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 dark:focus:ring-teal-800"
              required
            />
          </div>

          {/* Quantity and Purchase Price */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="font-poppins text-sm font-semibold text-gray-700 dark:text-gray-300">
                Quantity *
              </label>
              <input
                type="number"
                step="0.0001"
                value={formData.quantity}
                onChange={(e) =>
                  setFormData({ ...formData, quantity: e.target.value })
                }
                placeholder="0"
                className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 dark:focus:ring-teal-800"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="font-poppins text-sm font-semibold text-gray-700 dark:text-gray-300">
                Purchase Price (₹) *
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.purchase_price}
                onChange={(e) =>
                  setFormData({ ...formData, purchase_price: e.target.value })
                }
                placeholder="0.00"
                className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 dark:focus:ring-teal-800"
                required
              />
            </div>
          </div>

          {/* Purchase Date and Sector */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="font-poppins text-sm font-semibold text-gray-700 dark:text-gray-300">
                Purchase Date *
              </label>
              <input
                type="date"
                value={formData.purchase_date}
                onChange={(e) =>
                  setFormData({ ...formData, purchase_date: e.target.value })
                }
                className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 dark:focus:ring-teal-800"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="font-poppins text-sm font-semibold text-gray-700 dark:text-gray-300">
                Sector/Category
              </label>
              <input
                type="text"
                value={formData.sector}
                onChange={(e) =>
                  setFormData({ ...formData, sector: e.target.value })
                }
                placeholder="e.g., Banking, IT, FMCG"
                className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 dark:focus:ring-teal-800"
              />
            </div>
          </div>

          {/* Investment Summary */}
          {formData.quantity && formData.purchase_price && (
            <div className="bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 p-4 rounded-xl border-2 border-teal-200 dark:border-teal-800">
              <div className="flex justify-between items-center">
                <span className="font-poppins text-sm text-gray-600 dark:text-gray-400">
                  Total Investment:
                </span>
                <span className="font-oswald text-2xl font-bold text-teal-700 dark:text-teal-400">
                  ₹
                  {(
                    parseFloat(formData.quantity) *
                    parseFloat(formData.purchase_price)
                  ).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-3 rounded-xl font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white py-3 rounded-xl font-semibold transition-all shadow-lg"
            >
              {editData ? "Update Holding" : "Add Holding"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddHoldingModal;
