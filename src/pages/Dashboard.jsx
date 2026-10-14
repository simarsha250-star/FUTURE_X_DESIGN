import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db, auth } from "../firebase";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Calendar, Users, MessageCircle,
  BarChart3, Settings, LogOut, Search, Bell, Moon, Sun,
  Wallet, Package, Clock, CheckCircle, TrendingUp,
  AlertCircle, Plus, ArrowRight, Award, FileSpreadsheet,
  DollarSign, Gift, Truck
} from "lucide-react";
import { signOut } from "firebase/auth";

export default function Dashboard() {
  const [orders, setOrders] = useState([]);
  const [dark, setDark] = useState(() => localStorage.getItem("dark") === "true");
  const [search, setSearch] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  // Dark mode save
  useEffect(() => {
    localStorage.setItem("dark", dark);
  }, [dark]);

  // Orders realtime
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "orders"), (snap) => {
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const today = new Date().toISOString().split("T")[0];

  // ===== STATS =====
  const todayOrders = orders.filter(o => o.orderDate === today);
  const pending = orders.filter(o => o.status === "Pending");
  const completed = orders.filter(o => o.status === "Completed");

  // Due Today & Overdue
  const dueToday = orders.filter(o => o.dueDate === today && o.status !== "Completed");
  const overdue = orders.filter(o =>
    o.dueDate && o.dueDate < today && o.status !== "Completed"
  );

  // ✅ Cashier Balance = අද complete වුණ orders වල advance එකේ එකතුව
  const cashierBalance = todayOrders
    .filter(o => o.status === "Completed")
    .reduce((sum, o) => sum + (Number(o.advance) || 0), 0);

  // ✅ Today's Revenue = අද තියෙන හැම order එකේම advance එකේ එකතුව
  const todayRevenue = todayOrders.reduce((sum, o) => sum + (Number(o.advance) || 0), 0);

  // Completion Rate
  const completionRate = orders.length > 0
    ? Math.round((completed.length / orders.length) * 100)
    : 0;

  // ✅ Top Customer - total එකෙන් හොඳම customer
  const customerTotals = {};
  orders.forEach(o => {
    if (o.customer && o.customer.trim()) {
      const name = o.customer.trim();
      customerTotals[name] = (customerTotals[name] || 0) + (Number(o.total) || 0);
    }
  });
  const sortedCustomers = Object.entries(customerTotals).sort((a, b) => b[1] - a[1]);
  const topCustomer = sortedCustomers[0];

  // Weekly chart data
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().split("T")[0];
    const dayOrders = orders.filter(o => o.orderDate === dateStr);
    const revenue = dayOrders.reduce((s, o) => s + (Number(o.advance) || 0), 0);
    return {
      date: dateStr,
      day: d.toLocaleDateString("en-US", { weekday: "short" }),
      count: dayOrders.length,
      revenue
    };
  });
  const maxRevenue = Math.max(...last7Days.map(d => d.revenue), 1);

  // Notifications
  const notifications = [
    ...dueToday.map(o => ({
      id: o.id + "-due", type: "warning",
      title: "Due Today",
      message: `${o.customer} - ${o.orderId} (${o.size})`
    })),
    ...overdue.map(o => ({
      id: o.id + "-over", type: "danger",
      title: "Overdue",
      message: `${o.customer} - ${o.orderId} (Due: ${o.dueDate})`
    })),
    ...pending.slice(0, 3).map(o => ({
      id: o.id + "-pend", type: "info",
      title: "Pending Order",
      message: `${o.customer} - Rs. ${o.balance}`
    }))
  ].slice(0, 10);

  const unreadCount = dueToday.length + overdue.length;

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  // ✅ Search - customer, orderId, phone තුනෙන්ම හොයනවා
  const filteredOrders = orders
    .filter(o => {
      if (!search.trim()) return true;
      const s = search.toLowerCase().trim();
      return (
        (o.customer || "").toLowerCase().includes(s) ||
        (o.orderId || "").toLowerCase().includes(s) ||
        (o.phone || "").toLowerCase().includes(s) ||
        (o.size || "").toLowerCase().includes(s)
      );
    })
    .slice(0, 8);

  const sidebarItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
    { icon: Calendar, label: "Orders", path: "/orders" },
    { icon: Users, label: "Customers", path: "/customers" },
    { icon: MessageCircle, label: "WhatsApp", path: "/whatsapp" },
    { icon: BarChart3, label: "Reports", path: "/reports" },
    { icon: FileSpreadsheet, label: "Google Sheet", path: "/google-sheet" },
    { icon: Bell, label: "Notifications", path: "/notifications" },
    { icon: Package, label: "Inventory", path: "/inventory" },
    { icon: DollarSign, label: "Expenses", path: "/expenses" },
    { icon: Gift, label: "Offers", path: "/offers" },
    { icon: Truck, label: "Delivery", path: "/delivery" },
    { icon: Moon, label: "End Day", path: "/end-day" },
    { icon: Settings, label: "Settings", path: "/settings" },
  ];

  return (
    <div className={`min-h-screen flex ${dark ? "dark bg-gray-950" : "bg-gray-50"}`}>
      {/* Mobile menu button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-gold text-navy rounded-lg shadow-lg"
      >
        {sidebarOpen ? "✕" : "☰"}
      </button>

      {/* Sidebar */}
      <aside className={`w-64 bg-navy text-white p-6 flex flex-col fixed h-full z-40 transition-transform ${
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      } lg:translate-x-0`}>
        <h1 className="text-2xl font-bold text-gold mb-10">FUTURE X DESIGN</h1>
        <nav className="space-y-1 flex-1 overflow-y-auto">
          {sidebarItems.map((item) => (
            <button
              key={item.label}
              onClick={() => { navigate(item.path); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition text-sm ${
                item.path === "/dashboard"
                  ? "bg-gold/20 text-gold"
                  : "text-gray-300 hover:bg-white/10 hover:text-gold"
              }`}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="border-t border-white/10 pt-4 mt-2">
          <div className="flex items-center gap-3 mb-3 px-2">
            <div className="w-9 h-9 rounded-full bg-gold text-navy flex items-center justify-center font-bold">
              {(auth.currentUser?.email || "A").charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{auth.currentUser?.email || "Admin"}</p>
              <p className="text-[10px] text-gray-400">Admin</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-red-500/20 text-red-400 transition text-sm"
          >
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
        ></div>
      )}

      {/* Main */}
      <main className="flex-1 lg:ml-64 p-4 lg:p-8 overflow-y-auto">
        {/* Topbar */}
        <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
          <div className="ml-12 lg:ml-0">
            <h2 className="text-2xl lg:text-3xl font-bold text-gray-800 dark:text-white">Dashboard</h2>
            <p className="text-gray-500 text-sm mt-1">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long", month: "long", day: "numeric"
              })}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search orders..."
                className="pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm dark:text-white focus:outline-none focus:border-gold w-full sm:w-64"
              />
            </div>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2.5 bg-white dark:bg-gray-800 rounded-lg relative hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <Bell size={20} className="text-gray-600 dark:text-gray-300" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-800 z-30 max-h-96 overflow-y-auto">
                  <div className="p-4 border-b dark:border-gray-800 flex justify-between items-center sticky top-0 bg-white dark:bg-gray-900">
                    <h3 className="font-bold dark:text-white">Notifications</h3>
                    <span className="text-xs bg-gold/20 text-gold px-2 py-1 rounded-full">
                      {notifications.length}
                    </span>
                  </div>
                  {notifications.length === 0 ? (
                    <p className="p-6 text-center text-gray-400 text-sm">No notifications 🎉</p>
                  ) : (
                    notifications.map(n => (
                      <div key={n.id} className="p-3 border-b dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800">
                        <div className="flex items-start gap-2">
                          <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                            n.type === "danger" ? "bg-red-500" :
                            n.type === "warning" ? "bg-orange-500" : "bg-blue-500"
                          }`} />
                          <div className="flex-1">
                            <p className="text-sm font-semibold dark:text-white">{n.title}</p>
                            <p className="text-xs text-gray-500">{n.message}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  <button
                    onClick={() => { navigate("/notifications"); setShowNotifications(false); }}
                    className="w-full p-3 text-center text-sm text-gold font-bold hover:bg-gold/10"
                  >
                    View All →
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => setDark(!dark)}
              className="p-2.5 bg-white dark:bg-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              {dark ? <Sun size={20} className="text-gold" /> : <Moon size={20} />}
            </button>
          </div>
        </div>

        {/* Overdue Alert */}
        {overdue.length > 0 && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 mb-6 flex items-center gap-3">
            <AlertCircle className="text-red-500 flex-shrink-0" size={24} />
            <div className="flex-1">
              <p className="font-bold text-red-500">
                {overdue.length} Overdue Order{overdue.length > 1 ? "s" : ""}!
              </p>
              <p className="text-sm text-red-400">Check orders page to review.</p>
            </div>
            <button
              onClick={() => navigate("/orders")}
              className="bg-red-500 hover:bg-red-600 text-white text-sm font-bold px-4 py-2 rounded-lg flex items-center gap-1"
            >
              View <ArrowRight size={14} />
            </button>
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex gap-3 mb-6 flex-wrap">
          <button
            onClick={() => navigate("/orders")}
            className="flex items-center gap-2 bg-gold hover:bg-yellow-500 text-navy font-bold px-5 py-2.5 rounded-lg"
          >
            <Plus size={18} /> New Order
          </button>
          <button
            onClick={() => navigate("/end-day")}
            className="flex items-center gap-2 bg-navy text-white font-bold px-5 py-2.5 rounded-lg hover:bg-navy/90"
          >
            <Moon size={18} /> End Day
          </button>
          <button
            onClick={() => navigate("/google-sheet")}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold px-5 py-2.5 rounded-lg"
          >
            <FileSpreadsheet size={18} /> Sync Sheet
          </button>
          <button
            onClick={() => navigate("/delivery")}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-lg"
          >
            <Truck size={18} /> Delivery
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <StatCard
            icon={Wallet}
            label="Cashier Balance"
            value={`Rs. ${cashierBalance.toLocaleString()}`}
            color="from-yellow-400 to-yellow-600"
            sub="Today completed"
          />
          <StatCard
            icon={Package}
            label="Today's Orders"
            value={todayOrders.length}
            color="from-blue-500 to-blue-700"
            sub={`Rs. ${todayRevenue.toLocaleString()} revenue`}
          />
          <StatCard
            icon={Clock}
            label="Pending"
            value={pending.length}
            color="from-orange-400 to-orange-600"
            sub={`${dueToday.length} due today`}
          />
          <StatCard
            icon={CheckCircle}
            label="Completed"
            value={completed.length}
            color="from-green-500 to-green-700"
            sub={`${completionRate}% rate`}
          />
        </div>

        {/* Second Row Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <MiniCard
            icon={TrendingUp}
            label="Today Revenue"
            value={`Rs. ${todayRevenue.toLocaleString()}`}
            color="text-green-600"
          />
          <MiniCard
            icon={Award}
            label="Top Customer"
            value={topCustomer ? topCustomer[0] : "—"}
            sub={topCustomer ? `Rs. ${topCustomer[1].toLocaleString()}` : "No data"}
            color="text-gold"
          />
          <MiniCard
            icon={AlertCircle}
            label="Due Today"
            value={dueToday.length}
            color="text-orange-500"
          />
        </div>

        {/* Weekly Chart */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-lg mb-6">
          <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-6">
            📈 Last 7 Days Revenue
          </h3>
          <div className="flex items-end justify-between gap-3 h-48">
            {last7Days.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <div className="text-xs font-semibold text-gray-500">
                  Rs.{d.revenue > 999 ? (d.revenue / 1000).toFixed(1) + "k" : d.revenue}
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-t-lg overflow-hidden flex-1 flex items-end">
                  <div
                    className="w-full bg-gradient-to-t from-gold to-yellow-400 rounded-t-lg transition-all"
                    style={{ height: `${(d.revenue / maxRevenue) * 100}%`, minHeight: d.revenue > 0 ? "8px" : "2px" }}
                  />
                </div>
                <div className="text-xs font-medium dark:text-gray-400">{d.day}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-gray-800 dark:text-white">
              {search ? `Search Results (${filteredOrders.length})` : "Recent Orders"}
            </h3>
            <button
              onClick={() => navigate("/orders")}
              className="text-sm text-gold font-medium hover:underline flex items-center gap-1"
            >
              View All <ArrowRight size={14} />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 dark:text-gray-400 border-b dark:border-gray-700">
                  <th className="pb-3">Order ID</th>
                  <th className="pb-3">Customer</th>
                  <th className="pb-3">Size</th>
                  <th className="pb-3">Due Date</th>
                  <th className="pb-3">Balance</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((o) => (
                  <tr key={o.id} className="border-b dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="py-3 font-mono text-gold">{o.orderId}</td>
                    <td className="py-3">{o.customer}</td>
                    <td className="py-3">{o.size}</td>
                    <td className={`py-3 ${
                      o.dueDate === today && o.status !== "Completed" ? "text-orange-500 font-bold" :
                      o.dueDate < today && o.status !== "Completed" ? "text-red-500 font-bold" : ""
                    }`}>
                      {o.dueDate}
                    </td>
                    <td className="py-3">Rs. {o.balance}</td>
                    <td className="py-3">
                      <span className={`px-3 py-1 rounded-full text-xs ${
                        o.status === "Completed"
                          ? "bg-green-500/20 text-green-600"
                          : "bg-orange-500/20 text-orange-600"
                      }`}>
                        {o.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {filteredOrders.length === 0 && (
                  <tr>
                    <td colSpan="6" className="text-center py-8 text-gray-400">
                      {search ? "No results found 🔍" : "No orders yet. Create your first order! 📦"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, sub }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-800 hover:shadow-xl transition">
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-4`}>
        <Icon className="text-white" size={22} />
      </div>
      <p className="text-gray-500 dark:text-gray-400 text-sm">{label}</p>
      <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function MiniCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-lg border border-gray-100 dark:border-gray-800">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-gray-500 dark:text-gray-400 text-xs">{label}</p>
          <p className={`text-lg font-bold mt-1 truncate ${color}`}>{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
        <Icon size={28} className={`${color} flex-shrink-0 ml-2`} />
      </div>
    </div>
  );
}