import { useEffect, useState } from "react";
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc
} from "firebase/firestore";
import { db } from "../firebase";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Truck, Plus, Search, Edit, Trash2, X, MapPin,
  Phone, User, Calendar, Clock, CheckCircle, Package,
  Navigation, DollarSign, Filter, MessageCircle
} from "lucide-react";

const STATUS_FLOW = [
  { id: "Pending", label: "Pending", color: "bg-gray-500", icon: Clock },
  { id: "Out for Delivery", label: "Out for Delivery", color: "bg-blue-500", icon: Truck },
  { id: "Delivered", label: "Delivered", color: "bg-green-500", icon: CheckCircle },
  { id: "Failed", label: "Failed", color: "bg-red-500", icon: X },
];

export default function Delivery() {
  const [deliveries, setDeliveries] = useState([]);
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterDate, setFilterDate] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const navigate = useNavigate();

  const emptyForm = {
    orderId: "",
    customer: "",
    phone: "",
    address: "",
    deliveryPerson: "",
    deliveryDate: new Date().toISOString().split("T")[0],
    deliveryTime: "",
    status: "Pending",
    cod: "",
    note: ""
  };
  const [form, setForm] = useState(emptyForm);

  // ===== Fetch =====
  useEffect(() => {
    const unsub1 = onSnapshot(collection(db, "deliveries"), (snap) => {
      setDeliveries(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsub2 = onSnapshot(collection(db, "orders"), (snap) => {
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => { unsub1(); unsub2(); };
  }, []);

  // ===== Stats =====
  const totalDeliveries = deliveries.length;
  const pending = deliveries.filter(d => d.status === "Pending").length;
  const outForDelivery = deliveries.filter(d => d.status === "Out for Delivery").length;
  const delivered = deliveries.filter(d => d.status === "Delivered").length;
  const today = new Date().toISOString().split("T")[0];
  const todayDeliveries = deliveries.filter(d => d.deliveryDate === today).length;

  // ===== Filter =====
  const filtered = deliveries.filter(d => {
    const matchSearch = !search ||
      (d.customer || "").toLowerCase().includes(search.toLowerCase()) ||
      (d.orderId || "").toLowerCase().includes(search.toLowerCase()) ||
      (d.phone || "").includes(search) ||
      (d.deliveryPerson || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "All" || d.status === filterStatus;
    const matchDate = !filterDate || d.deliveryDate === filterDate;
    return matchSearch && matchStatus && matchDate;
  }).sort((a, b) => (b.deliveryDate || "").localeCompare(a.deliveryDate || ""));

  // ===== Save =====
  const handleSave = async () => {
    if (!form.customer || !form.phone || !form.address) {
      return alert("Customer, Phone, Address required!");
    }
    const data = {
      ...form,
      cod: form.cod ? Number(form.cod) : 0,
      updatedAt: new Date().toISOString()
    };

    if (editingId) {
      await updateDoc(doc(db, "deliveries", editingId), data);
    } else {
      await addDoc(collection(db, "deliveries"), {
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

  const handleEdit = (d) => {
    setForm({
      orderId: d.orderId || "",
      customer: d.customer || "",
      phone: d.phone || "",
      address: d.address || "",
      deliveryPerson: d.deliveryPerson || "",
      deliveryDate: d.deliveryDate || today,
      deliveryTime: d.deliveryTime || "",
      status: d.status || "Pending",
      cod: d.cod || "",
      note: d.note || ""
    });
    setEditingId(d.id);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (confirm("Delete this delivery?")) await deleteDoc(doc(db, "deliveries", id));
  };

  const updateStatus = async (d, newStatus) => {
    await updateDoc(doc(db, "deliveries", d.id), {
      status: newStatus,
      updatedAt: new Date().toISOString()
    });

    // WhatsApp notify customer
    if (newStatus === "Out for Delivery" && d.phone) {
      const msg = encodeURIComponent(
        `ඔබේ order එක අද deliver වෙනවා! 🚚\nID: ${d.orderId}\nFUTURE X DESIGN 🎨`
      );
      window.open(`https://wa.me/${d.phone}?text=${msg}`, "_blank");
    }
    if (newStatus === "Delivered" && d.phone) {
      const msg = encodeURIComponent(
        `Order එක deliver කළා! ✅\nID: ${d.orderId}\nFUTURE X DESIGN එකට ස්තූතියි 🙏`
      );
      window.open(`https://wa.me/${d.phone}?text=${msg}`, "_blank");
    }
  };

  // ===== Select from Orders =====
  const selectFromOrder = (order) => {
    setForm({
      ...form,
      orderId: order.orderId || "",
      customer: order.customer || "",
      phone: order.phone || "",
      cod: order.balance || "",
      note: `Size: ${order.size} | Balance: Rs. ${order.balance}`
    });
  };

  // ===== WhatsApp customer =====
  const contactWhatsApp = (d) => {
    if (!d.phone) return;
    window.open(`https://wa.me/${d.phone}`, "_blank");
  };

  const statusStyle = (status) => {
    const s = STATUS_FLOW.find(x => x.id === status);
    return s ? s.color : "bg-gray-500";
  };

  const statusLabel = (status) => {
    const s = STATUS_FLOW.find(x => x.id === status);
    return s ? s.label : status;
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
            <h1 className="text-2xl font-bold text-gold">🚚 Delivery</h1>
            <p className="text-gray-400 text-sm">{todayDeliveries} deliveries today</p>
          </div>
        </div>
        <button
          onClick={() => { setEditingId(null); setForm(emptyForm); setShowModal(true); }}
          className="flex items-center gap-2 bg-gold hover:bg-yellow-500 text-navy font-bold px-5 py-2.5 rounded-lg"
        >
          <Plus size={18} /> New Delivery
        </button>
      </div>

      <div className="p-8 max-w-7xl mx-auto">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <StatCard icon={Package} label="Total" value={totalDeliveries} color="from-blue-500 to-blue-700" />
          <StatCard icon={Clock} label="Pending" value={pending} color="from-gray-500 to-gray-700" />
          <StatCard icon={Truck} label="Out for Delivery" value={outForDelivery} color="from-orange-500 to-orange-700" />
          <StatCard icon={CheckCircle} label="Delivered" value={delivered} color="from-green-500 to-green-700" />
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-lg mb-6 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-3 text-gray-400" size={18} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customer, phone, rider..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border dark:border-gray-700 rounded-lg dark:text-white"
            />
          </div>
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="p-2.5 bg-gray-50 dark:bg-gray-800 border dark:border-gray-700 rounded-lg dark:text-white"
          />
          <button
            onClick={() => setFilterDate("")}
            className="px-3 py-2.5 bg-gray-100 dark:bg-gray-800 dark:text-white rounded-lg text-sm"
          >
            Clear Date
          </button>
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="p-2.5 bg-gray-50 dark:bg-gray-800 border dark:border-gray-700 rounded-lg dark:text-white"
            >
              <option>All</option>
              {STATUS_FLOW.map(s => <option key={s.id}>{s.id}</option>)}
            </select>
          </div>
        </div>

        {/* Delivery List */}
        {filtered.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-12 text-center shadow-lg">
            <Truck className="mx-auto text-gray-300 mb-4" size={48} />
            <p className="text-gray-400">No deliveries found</p>
            <p className="text-sm text-gray-400 mt-1">Create your first delivery!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {filtered.map(d => (
              <div key={d.id} className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-lg border border-gray-100 dark:border-gray-800">
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className={`w-12 h-12 rounded-xl ${statusStyle(d.status)} flex items-center justify-center flex-shrink-0`}>
                      <Truck className="text-white" size={22} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-mono text-gold text-sm">{d.orderId}</p>
                      <h3 className="font-bold dark:text-white truncate">{d.customer}</h3>
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs text-white ${statusStyle(d.status)}`}>
                        {statusLabel(d.status)}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => handleEdit(d)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                      <Edit size={14} className="text-blue-500" />
                    </button>
                    <button onClick={() => handleDelete(d.id)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                      <Trash2 size={14} className="text-red-500" />
                    </button>
                  </div>
                </div>

                {/* Info */}
                <div className="space-y-2 text-sm mb-4">
                  <div className="flex items-start gap-2 text-gray-600 dark:text-gray-300">
                    <Phone size={14} className="text-gold mt-0.5 flex-shrink-0" />
                    <a href={`tel:${d.phone}`} className="hover:text-gold">{d.phone}</a>
                  </div>
                  <div className="flex items-start gap-2 text-gray-600 dark:text-gray-300">
                    <MapPin size={14} className="text-gold mt-0.5 flex-shrink-0" />
                    <span>{d.address}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                    <Calendar size={14} className="text-gold" />
                    <span>{d.deliveryDate} {d.deliveryTime && `| ${d.deliveryTime}`}</span>
                  </div>
                  {d.deliveryPerson && (
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                      <User size={14} className="text-gold" />
                      <span>Rider: <b>{d.deliveryPerson}</b></span>
                    </div>
                  )}
                  {d.cod > 0 && (
                    <div className="flex items-center gap-2 text-orange-500 font-bold">
                      <DollarSign size={14} />
                      COD: Rs. {Number(d.cod).toLocaleString()}
                    </div>
                  )}
                  {d.note && (
                    <p className="text-xs text-gray-400">📝 {d.note}</p>
                  )}
                </div>

                {/* Status Buttons */}
                <div className="flex gap-2 mb-3">
                  {STATUS_FLOW.map(s => {
                    if (s.id === d.status) return null;
                    return (
                      <button
                        key={s.id}
                        onClick={() => updateStatus(d, s.id)}
                        className={`flex-1 text-xs font-medium py-2 rounded-lg ${s.color} text-white hover:opacity-90`}
                      >
                        {s.label}
                      </button>
                    );
                  })}
                </div>

                {/* Extra Actions */}
                <div className="flex gap-2 pt-3 border-t dark:border-gray-800">
                  <a
                    href={`https://maps.google.com/?q=${encodeURIComponent(d.address)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 flex items-center justify-center gap-1 bg-blue-500/10 text-blue-500 py-2 rounded-lg text-sm font-medium hover:bg-blue-500/20"
                  >
                    <Navigation size={14} /> Navigate
                  </a>
                  <button
                    onClick={() => contactWhatsApp(d)}
                    className="flex-1 flex items-center justify-center gap-1 bg-green-500/10 text-green-600 py-2 rounded-lg text-sm font-medium hover:bg-green-500/20"
                  >
                    <MessageCircle size={14} /> WhatsApp
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold dark:text-white">
                {editingId ? "✏️ Edit Delivery" : "🚚 New Delivery"}
              </h3>
              <button onClick={closeModal}><X className="dark:text-white" /></button>
            </div>

            {/* Quick Select from Orders */}
            {!editingId && orders.length > 0 && (
              <div className="mb-4">
                <label className="text-sm dark:text-gray-300 flex items-center gap-2 mb-1">
                  <Package size={14} className="text-gold" /> Quick Select from Orders
                </label>
                <select
                  onChange={(e) => {
                    const o = orders.find(x => x.id === e.target.value);
                    if (o) selectFromOrder(o);
                  }}
                  className="w-full p-2 border dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg"
                >
                  <option value="">— Select an order —</option>
                  {orders.slice(0, 20).map(o => (
                    <option key={o.id} value={o.id}>
                      {o.orderId} - {o.customer} ({o.size})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-3">
              <Input label="Order ID" value={form.orderId} onChange={v => setForm({...form, orderId: v})} placeholder="VS-0001" />
              <Input label="Customer *" value={form.customer} onChange={v => setForm({...form, customer: v})} />
              <Input label="Phone * (94xxxxxxx)" value={form.phone} onChange={v => setForm({...form, phone: v})} />
              <div>
                <label className="text-sm dark:text-gray-300">Address *</label>
                <textarea
                  rows="2"
                  value={form.address}
                  onChange={e => setForm({...form, address: e.target.value})}
                  className="w-full p-2 border dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg"
                />
              </div>
              <Input label="Delivery Person (Rider)" value={form.deliveryPerson}
                onChange={v => setForm({...form, deliveryPerson: v})} />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Delivery Date" type="date" value={form.deliveryDate}
                  onChange={v => setForm({...form, deliveryDate: v})} />
                <Input label="Time" type="time" value={form.deliveryTime}
                  onChange={v => setForm({...form, deliveryTime: v})} />
              </div>
              <div>
                <label className="text-sm dark:text-gray-300">Status</label>
                <select value={form.status} onChange={e => setForm({...form, status: e.target.value})}
                  className="w-full p-2 border dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg">
                  {STATUS_FLOW.map(s => <option key={s.id}>{s.id}</option>)}
                </select>
              </div>
              <Input label="COD Amount (Rs.)" type="number" value={form.cod}
                onChange={v => setForm({...form, cod: v})} placeholder="Cash on delivery" />
              <div>
                <label className="text-sm dark:text-gray-300">Note</label>
                <textarea rows="2" value={form.note}
                  onChange={e => setForm({...form, note: e.target.value})}
                  className="w-full p-2 border dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg" />
              </div>
              <button onClick={handleSave}
                className="w-full bg-gold hover:bg-yellow-500 text-navy font-bold py-3 rounded-lg mt-2">
                {editingId ? "Update" : "Save"} Delivery
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