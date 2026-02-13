import { TrendingUp, TrendingDown } from "lucide-react";

// Stat Card Component
export const StatCard = ({ 
  title, 
  value, 
  subtitle, 
  trend, 
  trendValue, 
  icon: Icon,
  iconBg = "bg-primary/10",
  iconColor = "text-primary",
  className = ""
}) => {
  return (
    <div className={`stat-card animate-slide-up ${className}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{title}</p>
          <p className="stat-card-value">{value}</p>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {Icon && (
          <div className={`w-12 h-12 rounded-xl ${iconBg} flex items-center justify-center`}>
            <Icon className={`w-6 h-6 ${iconColor}`} />
          </div>
        )}
      </div>
      {trend && (
        <div className={`stat-card-trend ${trend === 'up' ? 'positive' : 'negative'}`}>
          {trend === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          <span>{trendValue}</span>
        </div>
      )}
    </div>
  );
};

// Simple Bar Chart Component
export const BarChart = ({ data = [], height = 150, className = "" }) => {
  const maxValue = Math.max(...data.map(d => d.value), 1);
  
  return (
    <div className={`${className}`}>
      <div className="bar-chart" style={{ height }}>
        {data.map((item, index) => (
          <div
            key={index}
            className="bar-chart-bar"
            style={{ 
              height: `${(item.value / maxValue) * 100}%`,
              backgroundColor: item.color || 'hsl(var(--chart-primary))'
            }}
            title={`${item.label}: ${item.value}`}
          />
        ))}
      </div>
      {data.length > 0 && data[0].label && (
        <div className="flex justify-between mt-2 px-1">
          {data.map((item, index) => (
            <span key={index} className="text-xs text-muted-foreground">
              {item.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

// Donut Chart Component
export const DonutChart = ({ 
  value = 0, 
  total = 100, 
  size = 120, 
  strokeWidth = 12,
  color = "hsl(var(--chart-primary))",
  label = "",
  className = ""
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percentage = Math.min((value / total) * 100, 100);
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className={`donut-chart ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      <div className="donut-chart-value">
        <span className="text-2xl font-bold">{Math.round(percentage)}%</span>
        {label && <span className="text-xs text-muted-foreground">{label}</span>}
      </div>
    </div>
  );
};

// Mini Line Chart (Sparkline)
export const Sparkline = ({ data = [], height = 40, color = "hsl(var(--chart-primary))", className = "" }) => {
  if (data.length < 2) return null;
  
  const width = 100;
  const padding = 4;
  const maxValue = Math.max(...data);
  const minValue = Math.min(...data);
  const range = maxValue - minValue || 1;
  
  const points = data.map((value, index) => {
    const x = padding + (index / (data.length - 1)) * (width - 2 * padding);
    const y = height - padding - ((value - minValue) / range) * (height - 2 * padding);
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} className={className}>
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
};

// Progress Bar Component
export const ProgressBar = ({ 
  value = 0, 
  max = 100, 
  color = "bg-primary",
  showLabel = true,
  size = "default",
  className = "" 
}) => {
  const percentage = Math.min((value / max) * 100, 100);
  const heights = {
    sm: "h-1.5",
    default: "h-2",
    lg: "h-3"
  };

  return (
    <div className={className}>
      <div className={`w-full bg-muted rounded-full overflow-hidden ${heights[size]}`}>
        <div 
          className={`${color} ${heights[size]} rounded-full transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <div className="flex justify-between mt-1">
          <span className="text-xs text-muted-foreground">{value}</span>
          <span className="text-xs text-muted-foreground">{max}</span>
        </div>
      )}
    </div>
  );
};

// Legend Component
export const ChartLegend = ({ items = [], className = "" }) => {
  return (
    <div className={`flex flex-wrap gap-4 ${className}`}>
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: item.color }}
          />
          <span className="text-sm text-muted-foreground">{item.label}</span>
        </div>
      ))}
    </div>
  );
};

export default StatCard;
