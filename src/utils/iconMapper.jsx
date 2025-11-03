import React from "react";
import {
  Wallet,
  Briefcase,
  TrendingUp as TrendingUpIcon,
  Gift,
  TrendingDown as TrendingDownIcon,
  Utensils,
  Car,
  Home,
  Pill,
  Film,
  ShoppingCart,
  BookOpen,
  Wrench,
  CreditCard,
  Target,
  Plane,
  Gamepad2,
  Shirt,
  Dumbbell,
  Smartphone,
  FileText,
  Folder,
  DollarSign,
  Coins,
  PiggyBank,
  Building,
  GraduationCap,
  Heart,
  Coffee,
  Zap,
  TrendingUp as ChartUp,
  Package,
  Tag,
} from "lucide-react";

// Map emoji icons to Lucide icons
const iconMap = {
  // Income emojis
  "💰": Wallet,
  "💼": Briefcase,
  "📈": TrendingUpIcon,
  "🎁": Gift,
  "💸": TrendingDownIcon,
  "💵": DollarSign,
  "💴": Coins,
  "💶": PiggyBank,
  "💷": Building,

  // Expense emojis
  "🍔": Utensils,
  "🚗": Car,
  "🏠": Home,
  "💊": Pill,
  "🎬": Film,
  "🛒": ShoppingCart,
  "📚": BookOpen,
  "🔧": Wrench,
  "💳": CreditCard,
  "🎯": Target,
  "✈️": Plane,
  "🎮": Gamepad2,
  "👔": Shirt,
  "🏋️": Dumbbell,
  "📱": Smartphone,
  "📝": FileText,
  "📂": Folder,
  "🎓": GraduationCap,
  "❤️": Heart,
  "☕": Coffee,
  "⚡": Zap,
  "📦": Package,
  "🏷️": Tag,

  // Lucide icon names (for new categories)
  Wallet,
  Briefcase,
  TrendingUp: TrendingUpIcon,
  Gift,
  TrendingDown: TrendingDownIcon,
  Utensils,
  Car,
  Home,
  Pill,
  Film,
  ShoppingCart,
  BookOpen,
  Wrench,
  CreditCard,
  Target,
  Plane,
  Gamepad2,
  Shirt,
  Dumbbell,
  Smartphone,
  FileText,
  Folder,
  DollarSign,
  Coins,
  PiggyBank,
  Building,
  GraduationCap,
  Heart,
  Coffee,
  Zap,
  ChartUp,
  Package,
  Tag,
};

/**
 * Get icon component from emoji or icon name
 * @param {string} iconString - Emoji or Lucide icon name
 * @returns {React.Component} Lucide icon component
 */
export const getIconComponent = (iconString) => {
  if (!iconString) return FileText;

  // Check if it's an emoji (try direct map)
  if (iconMap[iconString]) {
    return iconMap[iconString];
  }

  // Check if it's a Lucide icon name
  if (iconMap[iconString]) {
    return iconMap[iconString];
  }

  // Default fallback
  return FileText;
};

/**
 * Render icon component as React element
 * @param {string} iconString - Emoji or Lucide icon name
 * @param {string} className - Tailwind CSS classes
 * @returns {JSX.Element} Icon component
 */
export const renderIcon = (iconString, className = "w-6 h-6") => {
  const IconComponent = getIconComponent(iconString);
  return <IconComponent className={className} />;
};

export default iconMap;
