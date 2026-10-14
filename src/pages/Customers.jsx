import { useEffect, useState } from "react";
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebase";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Plus, Search, Phone, MessageCircle,
  Edit, Trash2, X, User, Award, TrendingUp, Calendar
} from "lucide-react";

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    name: "", phone: "", address: "", notes: ""
  });
  const navigate = useNavigate();

  useEffect(() => {
    const unsub1 = onSnapshot(collection(db, "customers"), (snap) => {
      setCustomers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsub2 = onSnapshot(collection(db, "orders"), (snap) => {
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => { unsub1(); unsub2(); };
  }, []);

  // Customer එකේ order stats
  const getStats = (phone) => {
    const cOrders = orders.filter(o => o.phone === phone);
    const totalSpent = cOrders.reduce((s, o) => s + (Number(o.total) || 0), 0);
    const pendingBalance = cOrders
      .filter(o => o.status !== "Completed")
      .reduce((s, o) => s + (Number(o.balance) || 0), 0);
    const lastOrder = cOrders.length > 0
      ? cOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0].orderDate
      : null;
    return {
      totalOrders: cOrders.length,
      totalSpent,
      pendingBalance,
      lastOrder,
      orders: cOrders
    };
  };

  const handleSave = async () => {
    if (!form.name || !form.phone) return alert("Name and Phone required!");
    if (editingId) {
      await updateDoc(doc(db, "customers", editingId), form);
    } else {
      await addDoc(collection(db, "customers"), {
        ...form,
        createdAt: new Date().toISOString()
      });
    }
    setShowModal(false);
    setEditingId(null);
    setForm({ name: "", phone: "", address: "", notes: "" });
  };

  const handleEdit = (c) => {
    setForm({
      name: c.name || "", phone: c.phone || "",
      address: c.address || "", notes: c.notes || ""
    });
    setEditingId(c.id);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (confirm("Delete this customer?")) await deleteDoc(doc(db, "customers", id));
  };

  const filtered = customers.filter(c =>
    (c.name || "").toLowerCase().includes(search.toLowerCase()) ||
    (c.phone || "").includes(search)
  );

  const totalCustomers = customers.length;
  const vipCount = customers.filter(c => getStats(c.phone).totalOrders >= 5).length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-navy text-white p-6 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/dashboard")} className="p-2 hover:bg-white/10 rounded-lg">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gold">👥 Customers</h1>
            <p className="text-gray-400 text-sm">{totalCustomers} customers</p>
          </div>
        </div>
        <button
          onClick={() => { setEditingId(null); setForm({ name: "", phone: "", address: "", notes: "" }); setShowModal(true); }}
          className="flex items-center gap-2 bg-gold hover:bg-yellow-500 text-navy font-bold px-5 py-2.5 rounded-lg"
        >
          <Plus size={18} /> New Customer
        </button>
      </div>

      <div className="p-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatBox icon={User} label="Total Customers" value={totalCustomers} color="from-blue-500 to-blue-700" />
          <StatBox icon={Award} label="VIP Customers" value={vipCount} color="from-gold to-yellow-600" />
          <StatBox icon={TrendingUp} label="Repeat Customers"
            value={customers.filter(c => getStats(c.phone).totalOrders > 1).length}
            color="from-green-500 to-green-700" />
        </div>

        {/* Search */}
        <div className="mb-6 relative">
          <Search className="absolute left-3 top-3 text-gray-400" size={18} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or phone..."
            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg dark:text-white focus:outline-none focus:border-gold"
          />
        </div>

        {/* Customers List */}
        {filtered.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-12 text-center shadow-lg">
            <User className="mx-auto text-gray-300 mb-4" size={48} />
            <p className="text-gray-400">No customers yet</p>
            <p className="text-sm text-gray-400 mt-1">Click "New Customer" to add one</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map(c => {
              const s = getStats(c.phone);
              const isVIP = s.totalOrders >= 5;
              return (
                <div key={c.id} className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-lg border border-gray-100 dark:border-gray-800">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white text-lg ${isVIP ? "bg-gradient-to-br from-gold to-yellow-600" : "bg-gradient-to-br from-blue-500 to-blue-700"}`}>
                        {(c.name || "?").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold dark:text-white flex items-center gap-2">
                          {c.name}
                          {isVIP && <span className="text-xs bg-gold/20 text-gold px-2 py-0.5 rounded-full">👑 VIP</span>}
                        </h3>
                        <p className="text-sm text-gray-500">{c.phone}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => handleEdit(c)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                        <Edit size={14} className="text-blue-500" />
                      </button>
                      <button onClick={() => handleDelete(c.id)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                        <Trash2 size={14} className="text-red-500" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2">
                      <p className="text-xs text-gray-500">Orders</p>
                      <p className="font-bold dark:text-white">{s.totalOrders}</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2">
                      <p className="text-xs text-gray-500">Spent</p>
                      <p className="font-bold dark:text-white text-sm">Rs.{s.totalSpent.toLocaleString()}</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2">
                      <p className="text-xs text-gray-500">Pending</p>
                      <p className="font-bold text-orange-500 text-sm">Rs.{s.pendingBalance.toLocaleString()}</p>
                    </div>
                  </div>

                  {s.lastOrder && (
                    <p className="text-xs text-gray-400 mb-3 flex items-center gap-1">
                      <Calendar size={12} /> Last order: {s.lastOrder}
                    </p>
                  )}

                  <div className="flex gap-2">
                    <a href={`tel:${c.phone}`} className="flex-1 flex items-center justify-center gap-1 bg-blue-500/10 text-blue-500 py-2 rounded-lg text-sm font-medium hover:bg-blue-500/20">
                      <Phone size={14} /> Call
                    </a>
                    <a href={`https://wa.me/${c.phone}`} target="_blank" rel="noreferrer" className="flex-1 flex items-center justify-center gap-1 bg-green-500/10 text-green-600 py-2 rounded-lg text-sm font-medium hover:bg-green-500/20">
                      <MessageCircle size={14} /> WhatsApp
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md">
            <div className="flex justify-between mb-4">
              <h3 className="text-xl font-bold dark:text-white">
                {editingId ? "Edit Customer" : "New Customer"}
              </h3>
              <button onClick={() => { setShowModal(false); setEditingId(null); }}>
                <X className="dark:text-white" />
              </button>
            </div>
            <div className="space-y-3">
              <Input label="Name *" value={form.name} onChange={v => setForm({...form, name: v})} />
              <Input label="Phone * (94771234567)" value={form.phone} onChange={v => setForm({...form, phone: v})} />
              <Input label="Address" value={form.address} onChange={v => setForm({...form, address: v})} />
              <div>
                <label className="text-sm dark:text-gray-300">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm({...form, notes: e.target.value})}
                  rows="3"
                  className="w-full p-2 border dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg"
                />
              </div>
              <button onClick={handleSave}
                className="w-full bg-gold hover:bg-yellow-500 text-navy font-bold py-3 rounded-lg mt-2">
                {editingId ? "Update" : "Save"} Customer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatBox({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-lg border border-gray-100 dark:border-gray-800">
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-3`}>
        <Icon className="text-white" size={18} />
      </div>
      <p className="text-gray-500 dark:text-gray-400 text-sm">{label}</p>
      <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">{value}</p>
    </div>
  );
}

function Input({ label, value, onChange, type = "text" }) {
  return (
    <div>
      <label className="text-sm dark:text-gray-300">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full p-2 border dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg"
      />
    </div>
  );
}