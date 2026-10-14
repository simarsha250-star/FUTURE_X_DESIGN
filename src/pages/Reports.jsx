import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Calendar, TrendingUp, DollarSign, Package,
  CheckCircle, Clock, Award, BarChart3, Download,
  Filter, ChevronDown
} from "lucide-react";

export default function Reports() {
  const [orders, setOrders] = useState([]);
  const [period, setPeriod] = useState("today"); // today | week | month | year | all
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "orders"), (snap) => {
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  // ===== DATE RANGE =====
  const getRange = () => {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    if (period === "today") {
      return { start: todayStr, end: todayStr };
    }
    if (period === "week") {
      const d = new Date(today);
      d.setDate(d.getDate() - 6);
      return { start: d.toISOString().split("T")[0], end: todayStr };
    }
    if (period === "month") {
      const d = new Date(today.getFullYear(), today.getMonth(), 1);
      return { start: d.toISOString().split("T")[0], end: todayStr };
    }
    if (period === "year") {
      const d = new Date(today.getFullYear(), 0, 1);
      return { start: d.toISOString().split("T")[0], end: todayStr };
    }
    if (period === "custom") {
      return { start: customStart, end: customEnd };
    }
    return { start: "0000-01-01", end: "9999-12-31" };
  };

  const range = getRange();

  // ===== FILTERED ORDERS =====
  const filtered = orders.filter(o =>
    o.orderDate >= range.start && o.orderDate <= range.end
  );

  // ===== STATS =====
  const totalOrders = filtered.length;
  const completed = filtered.filter(o => o.status === "Completed");
  const pending = filtered.filter(o => o.status !== "Completed");

  const totalRevenue = filtered.reduce((s, o) => s + (Number(o.total) || 0), 0);
  const totalAdvance = filtered.reduce((s, o) => s + (Number(o.advance) || 0), 0);
  const pendingBalance = pending.reduce((s, o) => s + (Number(o.balance) || 0), 0);

  // Cash / Card / Online
  const cashIn = filtered.filter(o => o.paymentMethod === "Cash")
    .reduce((s, o) => s + (Number(o.advance) || 0), 0);
  const cardIn = filtered.filter(o => o.paymentMethod === "Card")
    .reduce((s, o) => s + (Number(o.advance) || 0), 0);
  const onlineIn = filtered.filter(o => o.paymentMethod === "Online")
    .reduce((s, o) => s + (Number(o.advance) || 0), 0);

  // Completion rate
  const completionRate = totalOrders > 0
    ? Math.round((completed.length / totalOrders) * 100)
    : 0;

  // Top customers
  const customerTotals = {};
  filtered.forEach(o => {
    if (o.customer) {
      customerTotals[o.customer] = (customerTotals[o.customer] || 0) + (Number(o.total) || 0);
    }
  });
  const topCustomers = Object.entries(customerTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Best selling sizes
  const sizeCount = {};
  filtered.forEach(o => {
    if (o.size) sizeCount[o.size] = (sizeCount[o.size] || 0) + 1;
  });
  const topSizes = Object.entries(sizeCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // ===== EXPORT CSV =====
  const exportCSV = () => {
    if (filtered.length === 0) return alert("No data to export!");
    const headers = ["Order ID", "Customer", "Phone", "Size", "Order Date", "Due Date", "Total", "Advance", "Balance", "Status", "Payment"];
    const rows = filtered.map(o => [
      o.orderId, o.customer, o.phone || "", o.size, o.orderDate, o.dueDate,
      o.total, o.advance || 0, o.balance, o.status, o.paymentMethod
    ]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fxd-report-${range.start}-to-${range.end}.csv`;
    a.click();
  };

  // ===== PRINT REPORT =====
  const printReport = () => {
    const win = window.open("", "", "width=800,height=900");
    win.document.write(`
      <html><head><title>Report ${range.start} to ${range.end}</title>
      <style>
        body { font-family: Arial; padding: 30px; color: #333; }
        h1 { color: #F59E0B; text-align: center; }
        h2 { border-bottom: 2px solid #F59E0B; padding-bottom: 5px; margin-top: 30px; }
        .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #ddd; }
        .total { font-weight: bold; font-size: 18px; color: #0F172A; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 13px; }
        th { background: #F59E0B; color: white; }
        .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #888; }
      </style></head><body>
      <h1>🌌 FUTURE X DESIGN</h1>
      <p style="text-align:center;">Business Report</p>
      <p style="text-align:center;color:#666;">${range.start} to ${range.end}</p>
      <hr/>

      <h2>📊 Overview</h2>
      <div class="row"><span>Total Orders</span><span>${totalOrders}</span></div>
      <div class="row"><span>✅ Completed</span><span>${completed.length}</span></div>
      <div class="row"><span>⏳ Pending</span><span>${pending.length}</span></div>
      <div class="row"><span>Completion Rate</span><span>${completionRate}%</span></div>

      <h2>💰 Revenue</h2>
      <div class="row"><span>Total Revenue</span><span>Rs. ${totalRevenue.toLocaleString()}</span></div>
      <div class="row"><span>Total Advance</span><span>Rs. ${totalAdvance.toLocaleString()}</span></div>
      <div class="row"><span>Pending Balance</span><span>Rs. ${pendingBalance.toLocaleString()}</span></div>

      <h2>💳 Payment Breakdown</h2>
      <div class="row"><span>Cash</span><span>Rs. ${cashIn.toLocaleString()}</span></div>
      <div class="row"><span>Card</span><span>Rs. ${cardIn.toLocaleString()}</span></div>
      <div class="row"><span>Online</span><span>Rs. ${onlineIn.toLocaleString()}</span></div>

      <h2>🏆 Top Customers</h2>
      <table>
        <tr><th>#</th><th>Customer</th><th>Total Spent</th></tr>
        ${topCustomers.map((c, i) => `<tr><td>${i+1}</td><td>${c[0]}</td><td>Rs. ${c[1].toLocaleString()}</td></tr>`).join("")}
      </table>

      <h2>🖼️ Best Selling Sizes</h2>
      <table>
        <tr><th>#</th><th>Size</th><th>Orders</th></tr>
        ${topSizes.map((s, i) => `<tr><td>${i+1}</td><td>${s[0]}</td><td>${s[1]}</td></tr>`).join("")}
      </table>

      <hr/>
      <p class="footer">Generated: ${new Date().toLocaleString()}</p>
      </body></html>
    `);
    win.document.close();
    win.print();
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
            <h1 className="text-2xl font-bold text-gold">📈 Reports</h1>
            <p className="text-gray-400 text-sm">{range.start} → {range.end}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-medium px-4 py-2.5 rounded-lg"
          >
            <Download size={18} /> CSV
          </button>
          <button
            onClick={printReport}
            className="flex items-center gap-2 bg-gold hover:bg-yellow-500 text-navy font-bold px-4 py-2.5 rounded-lg"
          >
            <Download size={18} /> Print / PDF
          </button>
        </div>
      </div>

      <div className="p-8 max-w-7xl mx-auto">
        {/* Period Selector */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-lg mb-6 flex flex-wrap gap-2 items-center">
          {[
            { id: "today", label: "📅 Today" },
            { id: "week", label: "🗓️ Last 7 Days" },
            { id: "month", label: "📆 This Month" },
            { id: "year", label: "📊 This Year" },
            { id: "all", label: "🌐 All Time" },
          ].map(p => (
            <button
              key={p.id}
              onClick={() => { setPeriod(p.id); setShowCustom(false); }}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition ${
                period === p.id
                  ? "bg-gold text-navy"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200"
              }`}
            >
              {p.label}
            </button>
          ))}
          <button
            onClick={() => setShowCustom(!showCustom)}
            className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-1 ${
              showCustom ? "bg-gold text-navy" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
            }`}
          >
            <Filter size={14} /> Custom
          </button>
        </div>

        {/* Custom Range */}
        {showCustom && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-lg mb-6 flex flex-wrap gap-4 items-center">
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400">Start Date</label>
              <input
                type="date"
                value={customStart}
                onChange={(e) => { setCustomStart(e.target.value); setPeriod("custom"); }}
                className="w-full p-2 border dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg mt-1"
              />
            </div>
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400">End Date</label>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => { setCustomEnd(e.target.value); setPeriod("custom"); }}
                className="w-full p-2 border dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg mt-1"
              />
            </div>
          </div>
        )}

        {/* Top Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <StatBox
            icon={Package}
            label="Total Orders"
            value={totalOrders}
            color="from-blue-500 to-blue-700"
          />
          <StatBox
            icon={DollarSign}
            label="Total Revenue"
            value={`Rs. ${totalRevenue.toLocaleString()}`}
            color="from-gold to-yellow-600"
          />
          <StatBox
            icon={CheckCircle}
            label="Completed"
            value={completed.length}
            sub={`${completionRate}% rate`}
            color="from-green-500 to-green-700"
          />
          <StatBox
            icon={Clock}
            label="Pending"
            value={pending.length}
            sub={`Rs. ${pendingBalance.toLocaleString()}`}
            color="from-orange-500 to-orange-700"
          />
        </div>

        {/* Revenue + Payment */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Revenue Breakdown */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-lg">
            <h3 className="text-lg font-bold dark:text-white mb-4 flex items-center gap-2">
              <TrendingUp className="text-gold" size={20} /> Revenue Breakdown
            </h3>
            <div className="space-y-3">
              <Row label="Total Revenue" value={`Rs. ${totalRevenue.toLocaleString()}`} bold />
              <Row label="Total Advance" value={`Rs. ${totalAdvance.toLocaleString()}`} color="text-green-600" />
              <Row label="Pending Balance" value={`Rs. ${pendingBalance.toLocaleString()}`} color="text-orange-500" />
            </div>

            {/* Progress bar */}
            <div className="mt-6">
              <div className="flex justify-between text-sm mb-2 dark:text-gray-300">
                <span>Collection Rate</span>
                <span className="font-bold text-gold">
                  {totalRevenue > 0 ? Math.round((totalAdvance / totalRevenue) * 100) : 0}%
                </span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-3 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-gold to-yellow-500 rounded-full transition-all"
                  style={{ width: `${totalRevenue > 0 ? (totalAdvance / totalRevenue) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>

          {/* Payment Methods */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-lg">
            <h3 className="text-lg font-bold dark:text-white mb-4 flex items-center gap-2">
              <BarChart3 className="text-gold" size={20} /> Payment Methods
            </h3>
            <div className="space-y-4">
              <PayBar label="💵 Cash" amount={cashIn} total={totalAdvance} color="bg-green-500" />
              <PayBar label="💳 Card" amount={cardIn} total={totalAdvance} color="bg-blue-500" />
              <PayBar label="📱 Online" amount={onlineIn} total={totalAdvance} color="bg-purple-500" />
            </div>
          </div>
        </div>

        {/* Top Customers + Best Sizes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

          {/* Best Sizes */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-lg">
            <h3 className="text-lg font-bold dark:text-white mb-4 flex items-center gap-2">
              🖼️ Best Selling Sizes
            </h3>
            {topSizes.length === 0 ? (
              <p className="text-gray-400 text-center py-6">No data</p>
            ) : (
              <div className="space-y-3">
                {topSizes.map((s, i) => {
                  const max = topSizes[0][1];
                  return (
                    <div key={s[0]}>
                      <div className="flex justify-between text-sm mb-1 dark:text-gray-300">
                        <span className="font-medium">{s[0]}</span>
                        <span className="text-gray-500">{s[1]} orders</span>
                      </div>
                      <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-gold to-yellow-500 rounded-full"
                          style={{ width: `${(s[1] / max) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatBox({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-800">
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-4`}>
        <Icon className="text-white" size={22} />
      </div>
      <p className="text-gray-500 dark:text-gray-400 text-sm">{label}</p>
      <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function Row({ label, value, bold, color }) {
  return (
    <div className="flex justify-between items-center py-2 border-b dark:border-gray-800 last:border-0">
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <span className={`font-bold ${color || "dark:text-white"} ${bold ? "text-lg" : ""}`}>
        {value}
      </span>
    </div>
  );
}

function PayBar({ label, amount, total, color }) {
  const pct = total > 0 ? Math.round((amount / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1.5 dark:text-gray-300">
        <span className="font-medium">{label}</span>
        <span className="font-bold">Rs. {amount.toLocaleString()} ({pct}%)</span>
      </div>
      <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2.5 overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}