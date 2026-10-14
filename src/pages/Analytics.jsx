import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, TrendingUp, TrendingDown, DollarSign, Users,
  Package, Clock, Award, BarChart3, PieChart, Activity,
  Calendar, Zap, Target, ArrowUpRight, ArrowDownRight,
  Download, Filter
} from "lucide-react";

export default function Analytics() {
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [range, setRange] = useState(30); // 7 | 30 | 90
  const navigate = useNavigate();

  useEffect(() => {
    const unsub1 = onSnapshot(collection(db, "orders"), (snap) => {
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsub2 = onSnapshot(collection(db, "customers"), (snap) => {
      setCustomers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsub3 = onSnapshot(collection(db, "expenses"), (snap) => {
      setExpenses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => { unsub1(); unsub2(); unsub3(); };
  }, []);

  // ===== DATE RANGES =====
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const rangeStart = new Date(today);
  rangeStart.setDate(rangeStart.getDate() - range);

  const prevRangeStart = new Date(rangeStart);
  prevRangeStart.setDate(prevRangeStart.getDate() - range);
  const prevRangeEnd = new Date(rangeStart);
  prevRangeEnd.setDate(prevRangeEnd.getDate() - 1);

  const rangeStartStr = rangeStart.toISOString().split("T")[0];
  const prevStartStr = prevRangeStart.toISOString().split("T")[0];
  const prevEndStr = prevRangeEnd.toISOString().split("T")[0];

  // Current period orders
  const currentOrders = orders.filter(o =>
    o.orderDate >= rangeStartStr && o.orderDate <= todayStr
  );

  // Previous period orders
  const prevOrders = orders.filter(o =>
    o.orderDate >= prevStartStr && o.orderDate <= prevEndStr
  );

  // ===== STATS =====
  const totalRevenue = currentOrders.reduce((s, o) => s + (Number(o.advance) || 0), 0);
  const prevRevenue = prevOrders.reduce((s, o) => s + (Number(o.advance) || 0), 0);
  const revenueGrowth = prevRevenue > 0
    ? Math.round(((totalRevenue - prevRevenue) / prevRevenue) * 100)
    : 0;

  const totalOrders = currentOrders.length;
  const prevTotalOrders = prevOrders.length;
  const orderGrowth = prevTotalOrders > 0
    ? Math.round(((totalOrders - prevTotalOrders) / prevTotalOrders) * 100)
    : 0;

  const completedCount = currentOrders.filter(o => o.status === "Completed").length;
  const avgOrderValue = totalOrders > 0
    ? Math.round(currentOrders.reduce((s, o) => s + Number(o.total), 0) / totalOrders)
    : 0;
  const prevAvgOrderValue = prevTotalOrders > 0
    ? Math.round(prevOrders.reduce((s, o) => s + Number(o.total), 0) / prevTotalOrders)
    : 0;
  const avgGrowth = prevAvgOrderValue > 0
    ? Math.round(((avgOrderValue - prevAvgOrderValue) / prevAvgOrderValue) * 100)
    : 0;

  // Total expenses in range
  const currentExpenses = expenses.filter(e =>
    e.date >= rangeStartStr && e.date <= todayStr
  ).reduce((s, e) => s + Number(e.amount), 0);

  const profit = totalRevenue - currentExpenses;

  // ===== DAILY REVENUE CHART =====
  const dailyData = Array.from({ length: Math.min(range, 30) }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (Math.min(range, 30) - 1 - i));
    const dateStr = d.toISOString().split("T")[0];
    const dayOrders = orders.filter(o => o.orderDate === dateStr);
    const revenue = dayOrders.reduce((s, o) => s + (Number(o.advance) || 0), 0);
    return {
      date: dateStr,
      day: d.getDate(),
      month: d.toLocaleDateString("en-US", { month: "short" }),
      revenue,
      count: dayOrders.length
    };
  });
  const maxDaily = Math.max(...dailyData.map(d => d.revenue), 1);

  // ===== TOP CUSTOMERS =====
  const custTotals = {};
  currentOrders.forEach(o => {
    if (o.customer) {
      custTotals[o.customer] = (custTotals[o.customer] || 0) + Number(o.total);
    }
  });
  const topCustomers = Object.entries(custTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // ===== SIZE BREAKDOWN =====
  const sizeCount = {};
  currentOrders.forEach(o => {
    if (o.size) sizeCount[o.size] = (sizeCount[o.size] || 0) + 1;
  });
  const topSizes = Object.entries(sizeCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  // ===== PAYMENT BREAKDOWN =====
  const paymentTotals = { Cash: 0, Card: 0, Online: 0 };
  currentOrders.forEach(o => {
    paymentTotals[o.paymentMethod] = (paymentTotals[o.paymentMethod] || 0) + Number(o.advance);
  });

  // ===== HOURLY PEAK (by order time) =====
  const hourCount = {};
  currentOrders.forEach(o => {
    if (o.createdAt) {
      const h = new Date(o.createdAt).getHours();
      hourCount[h] = (hourCount[h] || 0) + 1;
    }
  });
  const peakHours = Object.entries(hourCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  // ===== WEEKLY PATTERN =====
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dayCount = [0, 0, 0, 0, 0, 0, 0];
  currentOrders.forEach(o => {
    if (o.orderDate) {
      const d = new Date(o.orderDate).getDay();
      dayCount[d]++;
    }
  });
  const maxDay = Math.max(...dayCount, 1);

  // ===== NEW vs RETURNING CUSTOMERS =====
  const customerFirstOrder = {};
  orders.forEach(o => {
    if (o.customer && (!customerFirstOrder[o.customer] || o.orderDate < customerFirstOrder[o.customer])) {
      customerFirstOrder[o.customer] = o.orderDate;
    }
  });
  const newCustomers = Object.entries(customerFirstOrder)
    .filter(([_, date]) => date >= rangeStartStr).length;
  const returningCustomers = currentOrders
    .filter(o => customerFirstOrder[o.customer] < rangeStartStr)
    .map(o => o.customer)
    .filter((v, i, a) => a.indexOf(v) === i).length;

  // ===== EXPORT REPORT =====
  const exportReport = () => {
    const data = {
      period: `${rangeStartStr} to ${todayStr}`,
      range: `${range} days`,
      totalRevenue,
      revenueGrowth: `${revenueGrowth}%`,
      totalOrders,
      orderGrowth: `${orderGrowth}%`,
      avgOrderValue,
      totalExpenses: currentExpenses,
      profit,
      topCustomers: topCustomers.map(c => ({ customer: c[0], total: c[1] })),
      topSizes: topSizes.map(s => ({ size: s[0], count: s[1] })),
      paymentBreakdown: paymentTotals,
      newCustomers,
      returningCustomers
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fxd-analytics-${rangeStartStr}-to-${todayStr}.json`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-navy text-white p-6 flex justify-between items-center flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/dashboard")} className="p-2 hover:bg-white/10 rounded-lg">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gold">📊 Analytics</h1>
            <p className="text-gray-400 text-sm">Business insights & trends</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportReport}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-medium px-4 py-2.5 rounded-lg text-sm"
          >
            <Download size={18} /> Export
          </button>
        </div>
      </div>

      <div className="p-8 max-w-7xl mx-auto">
        {/* Range Selector */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-lg mb-6 flex flex-wrap gap-2 items-center">
          <span className="text-sm text-gray-500 dark:text-gray-400 font-medium flex items-center gap-2">
            <Calendar size={16} /> Period:
          </span>
          {[
            { id: 7, label: "Last 7 Days" },
            { id: 30, label: "Last 30 Days" },
            { id: 90, label: "Last 90 Days" },
          ].map(r => (
            <button
              key={r.id}
              onClick={() => setRange(r.id)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition ${
                range === r.id
                  ? "bg-gold text-navy"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <KPICard
            icon={DollarSign}
            label="Total Revenue"
            value={`Rs. ${totalRevenue.toLocaleString()}`}
            growth={revenueGrowth}
            color="from-gold to-yellow-600"
          />
          <KPICard
            icon={Package}
            label="Total Orders"
            value={totalOrders}
            growth={orderGrowth}
            color="from-blue-500 to-blue-700"
          />
          <KPICard
            icon={Target}
            label="Avg Order Value"
            value={`Rs. ${avgOrderValue.toLocaleString()}`}
            growth={avgGrowth}
            color="from-purple-500 to-purple-700"
          />
          <KPICard
            icon={TrendingUp}
            label="Net Profit"
            value={`Rs. ${profit.toLocaleString()}`}
            growth={null}
            sub={`Revenue: ${totalRevenue.toLocaleString()} | Expenses: ${currentExpenses.toLocaleString()}`}
            color="from-green-500 to-green-700"
          />
        </div>

        {/* Daily Revenue Chart */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-lg mb-6">
          <h3 className="text-lg font-bold dark:text-white mb-6 flex items-center gap-2">
            <Activity className="text-gold" size={20} /> Daily Revenue Trend
          </h3>
          <div className="flex items-end justify-between gap-1 h-56 overflow-x-auto">
            {dailyData.map((d, i) => (
              <div key={i} className="flex-1 min-w-[20px] flex flex-col items-center gap-1 group">
                <div className="text-[10px] font-semibold text-gray-500 opacity-0 group-hover:opacity-100 transition">
                  Rs.{d.revenue}
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-t overflow-hidden flex-1 flex items-end">
                  <div
                    className="w-full bg-gradient-to-t from-gold to-yellow-400 rounded-t transition-all hover:from-yellow-500"
                    style={{
                      height: `${(d.revenue / maxDaily) * 100}%`,
                      minHeight: d.revenue > 0 ? "4px" : "1px"
                    }}
                  />
                </div>
                {dailyData.length <= 15 && (
                  <div className="text-[10px] dark:text-gray-400">{d.day}</div>
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-3">
            <span>{dailyData[0]?.month} {dailyData[0]?.day}</span>
            <span>Today</span>
          </div>
        </div>

        {/* 2-Column Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Top Customers */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-lg">
            <h3 className="text-lg font-bold dark:text-white mb-4 flex items-center gap-2">
              <Award className="text-gold" size={20} /> Top Customers
            </h3>
            {topCustomers.length === 0 ? (
              <p className="text-gray-400 text-center py-6">No data</p>
            ) : (
              <div className="space-y-3">
                {topCustomers.map((c, i) => (
                  <div key={c[0]} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        i === 0 ? "bg-gold text-navy" :
                        i === 1 ? "bg-gray-300 text-navy" :
                        i === 2 ? "bg-orange-400 text-white" :
                        "bg-gray-100 dark:bg-gray-700 dark:text-white"
                      }`}>
                        {i + 1}
                      </span>
                      <span className="font-medium dark:text-white">{c[0]}</span>
                    </div>
                    <span className="font-bold text-gold">Rs. {c[1].toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Best Selling Sizes */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-lg">
            <h3 className="text-lg font-bold dark:text-white mb-4 flex items-center gap-2">
              <Package className="text-gold" size={20} /> Best Selling Sizes
            </h3>
            {topSizes.length === 0 ? (
              <p className="text-gray-400 text-center py-6">No data</p>
            ) : (
              <div className="space-y-3">
                {topSizes.map((s, i) => {
                  const max = topSizes[0][1];
                  const pct = (s[1] / max) * 100;
                  return (
                    <div key={s[0]}>
                      <div className="flex justify-between text-sm mb-1 dark:text-gray-300">
                        <span className="font-medium">{s[0]}</span>
                        <span className="text-gray-500">{s[1]} orders</span>
                      </div>
                      <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-gold to-yellow-500 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* 3-Column Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Payment Methods */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-lg">
            <h3 className="text-lg font-bold dark:text-white mb-4 flex items-center gap-2">
              <PieChart className="text-gold" size={20} /> Payment Methods
            </h3>
            <div className="space-y-4">
              {Object.entries(paymentTotals).map(([method, amt]) => {
                const pct = totalRevenue > 0 ? Math.round((amt / totalRevenue) * 100) : 0;
                const colors = {
                  Cash: "bg-green-500",
                  Card: "bg-blue-500",
                  Online: "bg-purple-500"
                };
                return (
                  <div key={method}>
                    <div className="flex justify-between text-sm mb-1.5 dark:text-gray-300">
                      <span className="font-medium">{method}</span>
                      <span className="font-bold">Rs. {amt.toLocaleString()} ({pct}%)</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2.5 overflow-hidden">
                      <div className={`h-full ${colors[method]} rounded-full`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Weekly Pattern */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-lg">
            <h3 className="text-lg font-bold dark:text-white mb-4 flex items-center gap-2">
              <Calendar className="text-gold" size={20} /> Busiest Days
            </h3>
            <div className="flex items-end justify-between gap-2 h-40">
              {dayCount.map((count, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                  <div className="text-xs font-semibold text-gray-500">{count}</div>
                  <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-t overflow-hidden flex-1 flex items-end">
                    <div
                      className="w-full bg-gradient-to-t from-gold to-yellow-400 rounded-t"
                      style={{ height: `${(count / maxDay) * 100}%`, minHeight: count > 0 ? "4px" : "1px" }}
                    />
                  </div>
                  <div className="text-[10px] font-medium dark:text-gray-400">{dayNames[i]}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Customer Growth */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-lg">
            <h3 className="text-lg font-bold dark:text-white mb-4 flex items-center gap-2">
              <Users className="text-gold" size={20} /> Customers
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-500/10 rounded-lg">
                <div>
                  <p className="text-xs text-gray-500">New</p>
                  <p className="text-2xl font-bold text-green-600">{newCustomers}</p>
                </div>
                <ArrowUpRight className="text-green-600" size={28} />
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-500/10 rounded-lg">
                <div>
                  <p className="text-xs text-gray-500">Returning</p>
                  <p className="text-2xl font-bold text-blue-600">{returningCustomers}</p>
                </div>
                <Activity className="text-blue-600" size={28} />
              </div>
              <div className="flex items-center justify-between p-3 bg-gold/10 rounded-lg">
                <div>
                  <p className="text-xs text-gray-500">Total Customers</p>
                  <p className="text-2xl font-bold text-gold">{customers.length}</p>
                </div>
                <Users className="text-gold" size={28} />
              </div>
            </div>
          </div>
        </div>

        {/* Peak Hours */}
        {peakHours.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-lg">
            <h3 className="text-lg font-bold dark:text-white mb-4 flex items-center gap-2">
              <Clock className="text-gold" size={20} /> Peak Hours
            </h3>
            <div className="grid grid-cols-3 gap-4">
              {peakHours.map((h, i) => {
                const hour = Number(h[0]);
                const display = hour === 0 ? "12 AM" :
                  hour < 12 ? `${hour} AM` :
                  hour === 12 ? "12 PM" :
                  `${hour - 12} PM`;
                return (
                  <div key={h[0]} className={`text-center p-4 rounded-xl ${
                    i === 0 ? "bg-gold/20" : "bg-gray-50 dark:bg-gray-800"
                  }`}>
                    <Zap className={i === 0 ? "text-gold mx-auto mb-2" : "text-gray-400 mx-auto mb-2"} size={24} />
                    <p className="font-bold dark:text-white">{display}</p>
                    <p className="text-sm text-gray-500">{h[1]} orders</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function KPICard({ icon: Icon, label, value, growth, sub, color }) {
  const isPositive = growth > 0;
  const isNegative = growth < 0;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-800">
      <div className="flex justify-between items-start mb-4">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center`}>
          <Icon className="text-white" size={22} />
        </div>
        {growth !== null && growth !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${
            isPositive ? "bg-green-500/20 text-green-600" :
            isNegative ? "bg-red-500/20 text-red-500" :
            "bg-gray-500/20 text-gray-500"
          }`}>
            {isPositive ? <ArrowUpRight size={12} /> : isNegative ? <ArrowDownRight size={12} /> : null}
            {isPositive ? "+" : ""}{growth}%
          </div>
        )}
      </div>
      <p className="text-gray-500 dark:text-gray-400 text-sm">{label}</p>
      <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-2">{sub}</p>}
    </div>
  );
}