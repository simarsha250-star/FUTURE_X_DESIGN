import { useEffect, useState } from "react";
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc
} from "firebase/firestore";
import { db } from "../firebase";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Plus, Search, Edit, Trash2, X, Filter,
  TrendingDown, Wallet, CreditCard, Receipt, Calendar,
  DollarSign, PieChart, Download, Store
} from "lucide-react";

const CATEGORIES = [
  "Rent", "Salary", "Electricity", "Water", "Internet",
  "Materials", "Transport", "Marketing", "Maintenance",
  "Food", "Tax", "Other"
];

const PAYMENT_METHODS = ["Cash", "Card", "Online", "Bank"];

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterMonth, setFilterMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const navigate = useNavigate();

  const emptyForm = {
    title: "",
    category: "Materials",
    amount: "",
    paymentMethod: "Cash",
    date: new Date().toISOString().split("T")[0],
    note: ""
  };
  const [form, setForm] = useState(emptyForm);

  // ===== Fetch =====
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "expenses"), (snap) => {
      setExpenses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  // ===== Filtered =====
  const filtered = expenses.filter(e => {
    const matchMonth = filterMonth === "all" || (e.date || "").startsWith(filterMonth);
    const matchSearch = !search ||
      (e.title || "").toLowerCase().includes(search.toLowerCase()) ||
      (e.note || "").toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCategory === "All" || e.category === filterCategory;
    return matchMonth && matchSearch && matchCat;
  }).sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  // ===== Stats =====
  const totalExpense = filtered.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const today = new Date().toISOString().split("T")[0];
  const todayExpense = filtered
    .filter(e => e.date === today)
    .reduce((s, e) => s + (Number(e.amount) || 0), 0);

  // Category breakdown
  const categoryTotals = {};
  filtered.forEach(e => {
    categoryTotals[e.category] = (categoryTotals[e.category] || 0) + Number(e.amount);
  });
  const sortedCategories = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1]);

  // Payment breakdown
  const cashTotal = filtered.filter(e => e.paymentMethod === "Cash")
    .reduce((s, e) => s + Number(e.amount), 0);
  const cardTotal = filtered.filter(e => e.paymentMethod === "Card")
    .reduce((s, e) => s + Number(e.amount), 0);
  const onlineTotal = filtered.filter(e => e.paymentMethod === "Online")
    .reduce((s, e) => s + Number(e.amount), 0);
  const bankTotal = filtered.filter(e => e.paymentMethod === "Bank")
    .reduce((s, e) => s + Number(e.amount), 0);

  // ===== Save =====
  const handleSave = async () => {
    if (!form.title || !form.amount) return alert("Title and Amount required!");
    const data = {
      ...form,
      amount: Number(form.amount),
      updatedAt: new Date().toISOString()
    };

    if (editingId) {
      await updateDoc(doc(db, "expenses", editingId), data);
    } else {
      await addDoc(collection(db, "expenses"), {
        ...data,
        createdAt: new Date().toISOString()
      });
    }
    closeModal();
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleEdit = (e) => {
    setForm({
      title: e.title || "",
      category: e.category || "Materials",
      amount: e.amount || "",
      paymentMethod: e.paymentMethod || "Cash",
      date: e.date || today,
      note: e.note || ""
    });
    setEditingId(e.id);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (confirm("Delete this expense?")) await deleteDoc(doc(db, "expenses", id));
  };

  // ===== Export CSV =====
  const exportCSV = () => {
    if (filtered.length === 0) return alert("No data to export!");
    const headers = ["Date", "Title", "Category", "Amount", "Payment", "Note"];
    const rows = filtered.map(e => [
      e.date, `"${e.title}"`, e.category, e.amount, e.paymentMethod, `"${e.note || ""}"`
    ]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fxd-expenses-${filterMonth}.csv`;
    a.click();
  };

  // ===== Category Colors =====
  const catColor = (cat) => {
    const colors = {
      Rent: "bg-purple-500",
      Salary: "bg-blue-500",
      Electricity: "bg-yellow-500",
      Water: "bg-cyan-500",
      Internet: "bg-indigo-500",
      Materials: "bg-gold",
      Transport: "bg-pink-500",
      Marketing: "bg-orange-500",
      Maintenance: "bg-teal-500",
      Food: "bg-red-400",
      Tax: "bg-gray-500",
      Other: "bg-slate-500"
    };
    return colors[cat] || "bg-gray-500";
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
            <h1 className="text-2xl font-bold text-gold">💰 Expenses</h1>
            <p className="text-gray-400 text-sm">Track all shop expenses</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-medium px-4 py-2.5 rounded-lg text-sm"
          >
            <Download size={18} /> CSV
          </button>
          <button
            onClick={() => { setEditingId(null); setForm(emptyForm); setShowModal(true); }}
            className="flex items-center gap-2 bg-gold hover:bg-yellow-500 text-navy font-bold px-5 py-2.5 rounded-lg"
          >
            <Plus size={18} /> New Expense
          </button>
        </div>
      </div>

      <div className="p-8 max-w-7xl mx-auto">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <StatCard icon={TrendingDown} label="Total Expense"
            value={`Rs. ${totalExpense.toLocaleString()}`}
            color="from-red-500 to-red-700" />
          <StatCard icon={Calendar} label="Today"
            value={`Rs. ${todayExpense.toLocaleString()}`}
            color="from-orange-500 to-orange-700" />
          <StatCard icon={Receipt} label="Entries"
            value={filtered.length} color="from-blue-500 to-blue-700" />
          <StatCard icon={PieChart} label="Categories"
            value={sortedCategories.length} color="from-purple-500 to-purple-700" />
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-lg mb-6 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-3 text-gray-400" size={18} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search expenses..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border dark:border-gray-700 rounded-lg dark:text-white"
            />
          </div>
          <input
            type="month"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="p-2.5 bg-gray-50 dark:bg-gray-800 border dark:border-gray-700 rounded-lg dark:text-white"
          />
          <button
            onClick={() => setFilterMonth("all")}
            className={`px-4 py-2.5 rounded-lg text-sm font-medium ${
              filterMonth === "all" ? "bg-gold text-navy" : "bg-gray-100 dark:bg-gray-800 dark:text-white"
            }`}
          >
            All Time
          </button>
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-gray-400" />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="p-2.5 bg-gray-50 dark:bg-gray-800 border dark:border-gray-700 rounded-lg dark:text-white"
            >
              <option>All</option>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Category Breakdown */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-lg">
            <h3 className="text-lg font-bold dark:text-white mb-4 flex items-center gap-2">
              <PieChart className="text-gold" size={20} /> Category Breakdown
            </h3>
            {sortedCategories.length === 0 ? (
              <p className="text-gray-400 text-center py-6">No data</p>
            ) : (
              <div className="space-y-3">
                {sortedCategories.map(([cat, amt]) => {
                  const pct = totalExpense > 0 ? (amt / totalExpense) * 100 : 0;
                  return (
                    <div key={cat}>
                      <div className="flex justify-between text-sm mb-1 dark:text-gray-300">
                        <span className="font-medium">{cat}</span>
                        <span className="text-gray-500">
                          Rs. {amt.toLocaleString()} ({Math.round(pct)}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2.5 overflow-hidden">
                        <div
                          className={`h-full ${catColor(cat)} rounded-full transition-all`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Payment Methods */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-lg">
            <h3 className="text-lg font-bold dark:text-white mb-4 flex items-center gap-2">
              <Wallet className="text-gold" size={20} /> Payment Methods
            </h3>
            <div className="space-y-4">
              <PayRow icon={Wallet} label="Cash" amount={cashTotal} total={totalExpense} color="bg-green-500" />
              <PayRow icon={CreditCard} label="Card" amount={cardTotal} total={totalExpense} color="bg-blue-500" />
              <PayRow icon={DollarSign} label="Online" amount={onlineTotal} total={totalExpense} color="bg-purple-500" />
              <PayRow icon={Store} label="Bank" amount={bankTotal} total={totalExpense} color="bg-orange-500" />
            </div>
          </div>
        </div>

        {/* Expenses List */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-lg">
          <h3 className="text-lg font-bold dark:text-white mb-4">
            Expenses ({filtered.length})
          </h3>

          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <Receipt className="mx-auto text-gray-300 mb-4" size={48} />
              <p className="text-gray-400">No expenses found</p>
              <p className="text-sm text-gray-400 mt-1">Add your first expense!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(e => (
                <div key={e.id} className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-750 transition">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className={`w-10 h-10 rounded-xl ${catColor(e.category)} flex items-center justify-center flex-shrink-0`}>
                      <Receipt className="text-white" size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold dark:text-white truncate">{e.title}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                        <span className="px-2 py-0.5 bg-white dark:bg-gray-900 rounded-full">
                          {e.category}
                        </span>
                        <span>📅 {e.date}</span>
                        <span>💳 {e.paymentMethod}</span>
                      </div>
                      {e.note && (
                        <p className="text-xs text-gray-400 mt-1 truncate">📝 {e.note}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 ml-3">
                    <p className="font-bold text-red-500 text-lg whitespace-nowrap">
                      - Rs. {Number(e.amount).toLocaleString()}
                    </p>
                    <div className="flex gap-1">
                      <button onClick={() => handleEdit(e)}
                        className="p-2 hover:bg-blue-500/10 rounded-lg">
                        <Edit size={14} className="text-blue-500" />
                      </button>
                      <button onClick={() => handleDelete(e.id)}
                        className="p-2 hover:bg-red-500/10 rounded-lg">
                        <Trash2 size={14} className="text-red-500" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Total */}
              <div className="flex justify-between items-center p-4 bg-gold/10 border border-gold/30 rounded-xl mt-4">
                <p className="font-bold dark:text-white">Total</p>
                <p className="font-bold text-gold text-xl">
                  Rs. {totalExpense.toLocaleString()}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold dark:text-white">
                {editingId ? "✏️ Edit Expense" : "🆕 New Expense"}
              </h3>
              <button onClick={closeModal}><X className="dark:text-white" /></button>
            </div>

            <div className="space-y-3">
              <Input label="Title *" value={form.title} onChange={v => setForm({...form, title: v})} placeholder="ex: Electricity bill" />

              <div>
                <label className="text-sm dark:text-gray-300">Category</label>
                <select value={form.category} onChange={e => setForm({...form, category: e.target.value})}
                  className="w-full p-2 border dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg">
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>

              <Input label="Amount (Rs.) *" type="number" value={form.amount} onChange={v => setForm({...form, amount: v})} />

              <div>
                <label className="text-sm dark:text-gray-300">Payment Method</label>
                <select value={form.paymentMethod} onChange={e => setForm({...form, paymentMethod: e.target.value})}
                  className="w-full p-2 border dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg">
                  {PAYMENT_METHODS.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>

              <Input label="Date" type="date" value={form.date} onChange={v => setForm({...form, date: v})} />

              <div>
                <label className="text-sm dark:text-gray-300">Note (optional)</label>
                <textarea rows="2" value={form.note} onChange={e => setForm({...form, note: e.target.value})}
                  placeholder="Additional details..."
                  className="w-full p-2 border dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg" />
              </div>

              <button onClick={handleSave}
                className="w-full bg-gold hover:bg-yellow-500 text-navy font-bold py-3 rounded-lg mt-2">
                {editingId ? "Update" : "Save"} Expense
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-800">
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-4`}>
        <Icon className="text-white" size={22} />
      </div>
      <p className="text-gray-500 dark:text-gray-400 text-sm">{label}</p>
      <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">{value}</p>
    </div>
  );
}

function PayRow({ icon: Icon, label, amount, total, color }) {
  const pct = total > 0 ? Math.round((amount / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1.5 dark:text-gray-300">
        <span className="font-medium flex items-center gap-2">
          <Icon size={14} /> {label}
        </span>
        <span className="font-bold">Rs. {amount.toLocaleString()} ({pct}%)</span>
      </div>
      <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2.5 overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type = "text", placeholder = "" }) {
  return (
    <div>
      <label className="text-sm dark:text-gray-300">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full p-2 border dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg"
      />
    </div>
  );
}