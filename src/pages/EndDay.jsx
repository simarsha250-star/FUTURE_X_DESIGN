import { useEffect, useState } from "react";
import { collection, onSnapshot, addDoc } from "firebase/firestore";
import { db, auth } from "../firebase";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Moon, Printer, Lock, TrendingUp, TrendingDown,
  Wallet, CreditCard, Smartphone, CheckCircle, Clock,
  Package, DollarSign, Calendar
} from "lucide-react";

export default function EndDay() {
  const [orders, setOrders] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saved, setSaved] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "orders"), (snap) => {
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  // ඒ දවසේ orders
  const dayOrders = orders.filter(o => o.orderDate === selectedDate);
  const completed = dayOrders.filter(o => o.status === "Completed");
  const pending = dayOrders.filter(o => o.status !== "Completed");

  // Payment breakdown
  const cashOrders = dayOrders.filter(o => o.paymentMethod === "Cash");
  const cardOrders = dayOrders.filter(o => o.paymentMethod === "Card");
  const onlineOrders = dayOrders.filter(o => o.paymentMethod === "Online");

  const cashIn = cashOrders.reduce((s, o) => s + (Number(o.advance) || 0), 0);
  const cardIn = cardOrders.reduce((s, o) => s + (Number(o.advance) || 0), 0);
  const onlineIn = onlineOrders.reduce((s, o) => s + (Number(o.advance) || 0), 0);
  const totalIn = cashIn + cardIn + onlineIn;

  const totalRevenue = dayOrders.reduce((s, o) => s + (Number(o.total) || 0), 0);
  const pendingBalance = pending.reduce((s, o) => s + (Number(o.balance) || 0), 0);

  const handleEndDay = async () => {
    try {
      await addDoc(collection(db, "endDayReports"), {
        date: selectedDate,
        totalOrders: dayOrders.length,
        completed: completed.length,
        pending: pending.length,
        cashIn,
        cardIn,
        onlineIn,
        totalIn,
        totalRevenue,
        pendingBalance,
        cashier: auth.currentUser?.email || "unknown",
        createdAt: new Date().toISOString()
      });
      setSaved(true);
      setShowConfirm(false);
      setTimeout(() => setSaved(false), 4000);
    } catch (err) {
      alert("Error saving report: " + err.message);
    }
  };

  const handlePrint = () => {
    const win = window.open("", "", "width=600,height=800");
    win.document.write(`
      <html><head><title>End Day Report - ${selectedDate}</title>
      <style>
        body { font-family: Arial; padding: 30px; color: #333; }
        h1 { color: #F59E0B; text-align: center; }
        h2 { border-bottom: 2px solid #F59E0B; padding-bottom: 5px; }
        .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #ddd; }
        .total { font-weight: bold; font-size: 18px; color: #0F172A; }
        .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #888; }
      </style></head><body>
      <h1>🌌 FUTURE X DESIGN</h1>
      <p style="text-align:center;">End Day Report</p>
      <p style="text-align:center;color:#666;">Date: ${selectedDate}</p>
      <hr/>
      <h2>📊 Orders Summary</h2>
      <div class="row"><span>Total Orders</span><span>${dayOrders.length}</span></div>
      <div class="row"><span>✅ Completed</span><span>${completed.length}</span></div>
      <div class="row"><span>⏳ Pending</span><span>${pending.length}</span></div>
      <h2>💰 Payment Breakdown</h2>
      <div class="row"><span>Cash</span><span>Rs. ${cashIn.toLocaleString()}</span></div>
      <div class="row"><span>Card</span><span>Rs. ${cardIn.toLocaleString()}</span></div>
      <div class="row"><span>Online</span><span>Rs. ${onlineIn.toLocaleString()}</span></div>
      <div class="row total"><span>Total In</span><span>Rs. ${totalIn.toLocaleString()}</span></div>
      <h2>📈 Revenue</h2>
      <div class="row"><span>Total Revenue</span><span>Rs. ${totalRevenue.toLocaleString()}</span></div>
      <div class="row"><span>Pending Balance</span><span>Rs. ${pendingBalance.toLocaleString()}</span></div>
      <hr/>
      <p class="footer">Cashier: ${auth.currentUser?.email || "unknown"}</p>
      <p class="footer">Generated: ${new Date().toLocaleString()}</p>
      </body></html>
    `);
    win.document.close();
    win.print();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-navy text-white p-6 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/dashboard")} className="p-2 hover:bg-white/10 rounded-lg">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gold flex items-center gap-2">
              <Moon size={22} /> End Day
            </h1>
            <p className="text-gray-400 text-sm">Close the day & save summary</p>
          </div>
        </div>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="bg-white/10 border border-white/20 text-white px-4 py-2 rounded-lg"
        />
      </div>

      <div className="p-8 max-w-6xl mx-auto">
        {/* Success banner */}
        {saved && (
          <div className="bg-green-500/20 border border-green-500 text-green-600 p-4 rounded-xl mb-6 flex items-center gap-2">
            <CheckCircle size={20} /> Report saved successfully!
          </div>
        )}

        {/* Date display */}
        <div className="bg-gradient-to-r from-gold to-yellow-600 rounded-2xl p-6 mb-6 text-navy">
          <p className="text-sm font-medium opacity-80">📅 Report Date</p>
          <p className="text-3xl font-bold mt-1">
            {new Date(selectedDate).toLocaleDateString("en-US", {
              weekday: "long", year: "numeric", month: "long", day: "numeric"
            })}
          </p>
        </div>

        {/* Big Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <BigCard
            icon={Wallet}
            label="Cashier Balance"
            value={`Rs. ${totalIn.toLocaleString()}`}
            color="from-gold to-yellow-600"
            big
          />
          <BigCard
            icon={Package}
            label="Total Orders"
            value={dayOrders.length}
            color="from-blue-500 to-blue-700"
          />
          <BigCard
            icon={CheckCircle}
            label="Completed"
            value={completed.length}
            color="from-green-500 to-green-700"
          />
          <BigCard
            icon={Clock}
            label="Pending"
            value={pending.length}
            color="from-orange-500 to-orange-700"
          />
        </div>

        {/* Payment Breakdown */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-lg mb-6">
          <h3 className="text-xl font-bold dark:text-white mb-4 flex items-center gap-2">
            <DollarSign size={20} className="text-gold" /> Payment Breakdown
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <PayRow
              icon={Wallet}
              label="Cash"
              count={cashOrders.length}
              amount={cashIn}
              color="text-green-600"
            />
            <PayRow
              icon={CreditCard}
              label="Card"
              count={cardOrders.length}
              amount={cardIn}
              color="text-blue-600"
            />
            <PayRow
              icon={Smartphone}
              label="Online"
              count={onlineOrders.length}
              amount={onlineIn}
              color="text-purple-600"
            />
          </div>

          <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-4 bg-gold/10 rounded-xl">
              <span className="font-medium dark:text-white">💰 Total Cash In</span>
              <span className="text-xl font-bold text-gold">Rs. {totalIn.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-red-500/10 rounded-xl">
              <span className="font-medium dark:text-white">⏳ Pending Balance</span>
              <span className="text-xl font-bold text-red-500">Rs. {pendingBalance.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Revenue Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <SummaryCard
            icon={TrendingUp}
            label="Total Revenue"
            value={`Rs. ${totalRevenue.toLocaleString()}`}
            sub={`${dayOrders.length} orders`}
            color="text-green-600"
          />
          <SummaryCard
            icon={TrendingDown}
            label="Pending Balance"
            value={`Rs. ${pendingBalance.toLocaleString()}`}
            sub={`${pending.length} pending orders`}
            color="text-orange-500"
          />
          <SummaryCard
            icon={TrendingUp}
            label="Completion Rate"
            value={dayOrders.length > 0
              ? `${Math.round((completed.length / dayOrders.length) * 100)}%`
              : "0%"}
            sub={`${completed.length}/${dayOrders.length} completed`}
            color="text-blue-600"
          />
        </div>

        {/* Actions */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-lg">
          <h3 className="text-lg font-bold dark:text-white mb-4">Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={handlePrint}
              className="flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-xl"
            >
              <Printer size={18} /> Print Report
            </button>
            <button
              onClick={() => setShowConfirm(true)}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-gold to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 text-navy font-bold py-3 rounded-xl"
            >
              <Lock size={18} /> End Day & Save
            </button>
          </div>
        </div>
      </div>

      {/* Confirm Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-gold/20 flex items-center justify-center">
                <Moon className="text-gold" size={32} />
              </div>
            </div>
            <h3 className="text-xl font-bold dark:text-white text-center mb-2">
              End Day?
            </h3>
            <p className="text-gray-500 text-center text-sm mb-6">
              {selectedDate} දවසේ summary එක save වෙනවා. මේක ආයෙ වෙනස් කරන්න බෑ.
            </p>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 mb-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-500">Total Orders</span>
                <span className="font-bold dark:text-white">{dayOrders.length}</span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-500">Cashier Balance</span>
                <span className="font-bold text-gold">Rs. {totalIn.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Pending</span>
                <span className="font-bold text-orange-500">{pending.length}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-700 font-bold dark:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleEndDay}
                className="flex-1 py-3 rounded-xl bg-gold hover:bg-yellow-500 text-navy font-bold"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BigCard({ icon: Icon, label, value, color, big }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-800">
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-4`}>
        <Icon className="text-white" size={22} />
      </div>
      <p className="text-gray-500 dark:text-gray-400 text-sm">{label}</p>
      <p className={`font-bold text-gray-800 dark:text-white mt-1 ${big ? "text-2xl" : "text-2xl"}`}>
        {value}
      </p>
    </div>
  );
}

function PayRow({ icon: Icon, label, count, amount, color }) {
  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
      <div className="flex items-center gap-3">
        <Icon size={20} className={color} />
        <div>
          <p className="font-medium dark:text-white">{label}</p>
          <p className="text-xs text-gray-500">{count} orders</p>
        </div>
      </div>
      <p className={`font-bold ${color}`}>Rs. {amount.toLocaleString()}</p>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-lg">
      <Icon size={22} className={color} />
      <p className="text-gray-500 dark:text-gray-400 text-sm mt-3">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
      <p className="text-xs text-gray-400 mt-1">{sub}</p>
    </div>
  );
}