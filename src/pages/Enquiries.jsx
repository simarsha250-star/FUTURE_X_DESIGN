import { useEffect, useState } from "react";
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc
} from "firebase/firestore";
import { db } from "../firebase";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Phone, Plus, Search, Edit, Trash2, X, Filter,
  MessageCircle, User, Calendar, Clock, CheckCircle, XCircle,
  TrendingUp, Target, DollarSign, Zap, ArrowRight, Globe,
  Facebook, Instagram, Store, Users
} from "lucide-react";

const SOURCES = [
  { id: "Walk-in", icon: Store, color: "bg-blue-500" },
  { id: "Call", icon: Phone, color: "bg-green-500" },
  { id: "WhatsApp", icon: MessageCircle, color: "bg-emerald-500" },
  { id: "Facebook", icon: Facebook, color: "bg-blue-600" },
  { id: "Instagram", icon: Instagram, color: "bg-pink-500" },
  { id: "Website", icon: Globe, color: "bg-purple-500" },
  { id: "Referral", icon: Users, color: "bg-orange-500" },
  { id: "Other", icon: Zap, color: "bg-gray-500" }
];

const STATUSES = [
  { id: "New", color: "bg-blue-500", icon: Zap },
  { id: "Contacted", color: "bg-yellow-500", icon: Phone },
  { id: "Quoted", color: "bg-orange-500", icon: DollarSign },
  { id: "Won", color: "bg-green-500", icon: CheckCircle },
  { id: "Lost", color: "bg-red-500", icon: XCircle }
];

export default function Enquiries() {
  const [enquiries, setEnquiries] = useState([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterSource, setFilterSource] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedEnquiry, setSelectedEnquiry] = useState(null);
  const navigate = useNavigate();

  const emptyForm = {
    name: "",
    phone: "",
    source: "Walk-in",
    status: "New",
    requirement: "",
    budget: "",
    followUpDate: "",
    note: ""
  };
  const [form, setForm] = useState(emptyForm);

  const convertForm = {
    size: "12x18",
    dueDate: "",
    total: "",
    advance: "",
    paymentMethod: "Cash"
  };
  const [convertData, setConvertData] = useState(convertForm);

  // ===== Fetch =====
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "enquiries"), (snap) => {
      setEnquiries(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  // ===== Stats =====
  const total = enquiries.length;
  const newLeads = enquiries.filter(e => e.status === "New").length;
  const wonLeads = enquiries.filter(e => e.status === "Won").length;
  const conversionRate = total > 0 ? Math.round((wonLeads / total) * 100) : 0;

  const today = new Date().toISOString().split("T")[0];
  const followUpToday = enquiries.filter(e =>
    e.followUpDate === today && e.status !== "Won" && e.status !== "Lost"
  );

  // ===== Filter =====
  const filtered = enquiries.filter(e => {
    const matchSearch = !search ||
      (e.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (e.phone || "").includes(search) ||
      (e.requirement || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "All" || e.status === filterStatus;
    const matchSource = filterSource === "All" || e.source === filterSource;
    return matchSearch && matchStatus && matchSource;
  });

  // ===== Save =====
  const handleSave = async () => {
    if (!form.name || !form.phone) {
      return alert("Name and Phone required!");
    }
    const data = {
      ...form,
      budget: form.budget ? Number(form.budget) : 0,
      updatedAt: new Date().toISOString()
    };

    if (editingId) {
      await updateDoc(doc(db, "enquiries", editingId), data);
    } else {
      await addDoc(collection(db, "enquiries"), {
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
      name: e.name || "",
      phone: e.phone || "",
      source: e.source || "Walk-in",
      status: e.status || "New",
      requirement: e.requirement || "",
      budget: e.budget || "",
      followUpDate: e.followUpDate || "",
      note: e.note || ""
    });
    setEditingId(e.id);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (confirm("Delete this enquiry?")) await deleteDoc(doc(db, "enquiries", id));
  };

  const updateStatus = async (e, status) => {
    await updateDoc(doc(db, "enquiries", e.id), {
      status,
      updatedAt: new Date().toISOString()
    });
  };

  // ===== Convert to Order =====
  const openConvert = (enquiry) => {
    setSelectedEnquiry(enquiry);
    setConvertData({
      ...convertForm,
      total: enquiry.budget || "",
      dueDate: ""
    });
    setShowConvertModal(true);
  };

  const handleConvert = async () => {
    if (!convertData.total || !convertData.dueDate) {
      return alert("Total and Due Date required!");
    }
    const balance = Number(convertData.total) - Number(convertData.advance || 0);
    const orderId = `VS-${String(Date.now()).slice(-4)}`;

    // Create order
    await addDoc(collection(db, "orders"), {
      orderId,
      customer: selectedEnquiry.name,
      phone: selectedEnquiry.phone,
      size: convertData.size,
      orderDate: today,
      dueDate: convertData.dueDate,
      total: Number(convertData.total),
      advance: Number(convertData.advance || 0),
      balance,
      status: "Pending",
      paymentMethod: convertData.paymentMethod,
      createdAt: new Date().toISOString(),
      fromEnquiry: selectedEnquiry.id
    });

    // Update enquiry
    await updateDoc(doc(db, "enquiries", selectedEnquiry.id), {
      status: "Won",
      convertedToOrder: orderId,
      updatedAt: new Date().toISOString()
    });

    // WhatsApp notify
    const msg = encodeURIComponent(
      `ඔබේ order එක ලැබුණා ✅\nID: ${orderId}\nDue: ${convertData.dueDate}\nFUTURE X DESIGN 🎨`
    );
    if (selectedEnquiry.phone) {
      window.open(`https://wa.me/${selectedEnquiry.phone}?text=${msg}`, "_blank");
    }

    setShowConvertModal(false);
    alert(`✅ Order created: ${orderId}`);
    navigate("/orders");
  };

  const getSourceStyle = (sourceId) => {
    const s = SOURCES.find(x => x.id === sourceId);
    return s || SOURCES[SOURCES.length - 1];
  };

  const getStatusStyle = (statusId) => {
    return STATUSES.find(x => x.id === statusId) || STATUSES[0];
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
            <h1 className="text-2xl font-bold text-gold">📞 Enquiries / Leads</h1>
            <p className="text-gray-400 text-sm">{total} total leads</p>
          </div>
        </div>
        <button
          onClick={() => { setEditingId(null); setForm(emptyForm); setShowModal(true); }}
          className="flex items-center gap-2 bg-gold hover:bg-yellow-500 text-navy font-bold px-5 py-2.5 rounded-lg"
        >
          <Plus size={18} /> New Enquiry
        </button>
      </div>

      <div className="p-8 max-w-7xl mx-auto">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <StatCard icon={Target} label="Total Leads" value={total} color="from-blue-500 to-blue-700" />
          <StatCard icon={Zap} label="New" value={newLeads} color="from-gold to-yellow-600" />
          <StatCard icon={CheckCircle} label="Won" value={wonLeads} color="from-green-500 to-green-700" />
          <StatCard icon={TrendingUp} label="Conversion" value={`${conversionRate}%`} color="from-purple-500 to-purple-700" />
        </div>

        {/* Follow-up Today Alert */}
        {followUpToday.length > 0 && (
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-2xl p-4 mb-6 flex items-center gap-3">
            <Clock className="text-orange-500 flex-shrink-0" size={24} />
            <div className="flex-1">
              <p className="font-bold text-orange-500">
                {followUpToday.length} follow-up{followUpToday.length > 1 ? "s" : ""} due today!
              </p>
              <p className="text-sm text-orange-400">
                {followUpToday.map(e => e.name).join(", ")}
              </p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-lg mb-6 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-3 text-gray-400" size={18} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, phone, requirement..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border dark:border-gray-700 rounded-lg dark:text-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="p-2.5 bg-gray-50 dark:bg-gray-800 border dark:border-gray-700 rounded-lg dark:text-white"
            >
              <option>All</option>
              {STATUSES.map(s => <option key={s.id}>{s.id}</option>)}
            </select>
          </div>
          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
            className="p-2.5 bg-gray-50 dark:bg-gray-800 border dark:border-gray-700 rounded-lg dark:text-white"
          >
            <option>All</option>
            {SOURCES.map(s => <option key={s.id}>{s.id}</option>)}
          </select>
        </div>

        {/* Leads List */}
        {filtered.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-12 text-center shadow-lg">
            <Target className="mx-auto text-gray-300 mb-4" size={48} />
            <p className="text-gray-400">No enquiries found</p>
            <p className="text-sm text-gray-400 mt-1">Add your first lead!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {filtered.map(e => {
              const src = getSourceStyle(e.source);
              const stat = getStatusStyle(e.status);
              const SrcIcon = src.icon;
              const StatIcon = stat.icon;
              const followUpDue = e.followUpDate === today &&
                e.status !== "Won" && e.status !== "Lost";

              return (
                <div key={e.id} className={`bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-lg border-2 transition ${
                  followUpDue ? "border-orange-500/40" : "border-gray-100 dark:border-gray-800"
                }`}>
                  {/* Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`w-12 h-12 rounded-xl ${src.color} flex items-center justify-center flex-shrink-0`}>
                        <SrcIcon className="text-white" size={20} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold dark:text-white text-lg truncate">{e.name}</h3>
                        <p className="text-sm text-gray-500 flex items-center gap-2">
                          <Phone size={12} /> {e.phone}
                        </p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs text-white ${stat.color}`}>
                            <StatIcon size={10} /> {e.status}
                          </span>
                          <span className="text-xs text-gray-400">{e.source}</span>
                          {followUpDue && (
                            <span className="text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full">
                              ⏰ Follow-up
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => handleEdit(e)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                        <Edit size={14} className="text-blue-500" />
                      </button>
                      <button onClick={() => handleDelete(e.id)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                        <Trash2 size={14} className="text-red-500" />
                      </button>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="space-y-2 text-sm mb-4">
                    {e.requirement && (
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                        <p className="text-xs text-gray-500 mb-1">Requirement</p>
                        <p className="dark:text-white">{e.requirement}</p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      {e.budget > 0 && (
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2">
                          <p className="text-xs text-gray-500">Budget</p>
                          <p className="font-bold dark:text-white">Rs. {Number(e.budget).toLocaleString()}</p>
                        </div>
                      )}
                      {e.followUpDate && (
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2">
                          <p className="text-xs text-gray-500">Follow-up</p>
                          <p className="font-bold dark:text-white text-xs">{e.followUpDate}</p>
                        </div>
                      )}
                    </div>
                    {e.note && (
                      <p className="text-xs text-gray-400">📝 {e.note}</p>
                    )}
                  </div>

                  {/* Status Buttons */}
                  {e.status !== "Won" && e.status !== "Lost" && (
                    <div className="flex gap-1.5 mb-3 flex-wrap">
                      {STATUSES.filter(s => s.id !== e.status && s.id !== "Won" && s.id !== "Lost").map(s => (
                        <button
                          key={s.id}
                          onClick={() => updateStatus(e, s.id)}
                          className="text-xs bg-gray-100 dark:bg-gray-800 dark:text-white px-3 py-1.5 rounded-lg hover:bg-gray-200"
                        >
                          {s.id}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-3 border-t dark:border-gray-800">
                    <a
                      href={`tel:${e.phone}`}
                      className="flex-1 flex items-center justify-center gap-1 bg-blue-500/10 text-blue-500 py-2 rounded-lg text-sm font-medium hover:bg-blue-500/20"
                    >
                      <Phone size={14} /> Call
                    </a>
                    <a
                      href={`https://wa.me/${e.phone}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 flex items-center justify-center gap-1 bg-green-500/10 text-green-600 py-2 rounded-lg text-sm font-medium hover:bg-green-500/20"
                    >
                      <MessageCircle size={14} /> WhatsApp
                    </a>
                    {e.status !== "Won" && (
                      <button
                        onClick={() => openConvert(e)}
                        className="flex-1 flex items-center justify-center gap-1 bg-gold hover:bg-yellow-500 text-navy py-2 rounded-lg text-sm font-bold"
                      >
                        <ArrowRight size={14} /> Convert
                      </button>
                    )}
                    {e.status === "Won" && (
                      <button
                        onClick={() => updateStatus(e, "Lost")}
                        className="text-xs text-red-500 hover:underline px-2"
                      >
                        Mark Lost
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Enquiry Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold dark:text-white">
                {editingId ? "✏️ Edit Enquiry" : "📞 New Enquiry"}
              </h3>
              <button onClick={closeModal}><X className="dark:text-white" /></button>
            </div>

            <div className="space-y-3">
              <Input label="Name *" value={form.name} onChange={v => setForm({...form, name: v})} />
              <Input label="Phone * (94xxxxxxx)" value={form.phone} onChange={v => setForm({...form, phone: v})} />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm dark:text-gray-300">Source</label>
                  <select value={form.source} onChange={e => setForm({...form, source: e.target.value})}
                    className="w-full p-2 border dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg">
                    {SOURCES.map(s => <option key={s.id}>{s.id}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm dark:text-gray-300">Status</label>
                  <select value={form.status} onChange={e => setForm({...form, status: e.target.value})}
                    className="w-full p-2 border dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg">
                    {STATUSES.map(s => <option key={s.id}>{s.id}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm dark:text-gray-300">Requirement</label>
                <textarea rows="2" value={form.requirement}
                  onChange={e => setForm({...form, requirement: e.target.value})}
                  placeholder="ex: 12x18 frame for wedding photo"
                  className="w-full p-2 border dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input label="Budget (Rs.)" type="number" value={form.budget}
                  onChange={v => setForm({...form, budget: v})} />
                <Input label="Follow-up Date" type="date" value={form.followUpDate}
                  onChange={v => setForm({...form, followUpDate: v})} />
              </div>

              <div>
                <label className="text-sm dark:text-gray-300">Note</label>
                <textarea rows="2" value={form.note}
                  onChange={e => setForm({...form, note: e.target.value})}
                  className="w-full p-2 border dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg" />
              </div>

              <button onClick={handleSave}
                className="w-full bg-gold hover:bg-yellow-500 text-navy font-bold py-3 rounded-lg mt-2">
                {editingId ? "Update" : "Save"} Enquiry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Convert to Order Modal */}
      {showConvertModal && selectedEnquiry && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold dark:text-white">🎯 Convert to Order</h3>
              <button onClick={() => setShowConvertModal(false)}><X className="dark:text-white" /></button>
            </div>

            <div className="bg-gold/10 border border-gold/30 rounded-xl p-4 mb-4">
              <p className="font-bold dark:text-white">{selectedEnquiry.name}</p>
              <p className="text-sm text-gray-500">📞 {selectedEnquiry.phone}</p>
              {selectedEnquiry.requirement && (
                <p className="text-sm mt-2 dark:text-gray-300">{selectedEnquiry.requirement}</p>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm dark:text-gray-300">Size</label>
                <select value={convertData.size} onChange={e => setConvertData({...convertData, size: e.target.value})}
                  className="w-full p-2 border dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg">
                  {["12x18","8x10","10x15","16x20","A4","A3"].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <Input label="Due Date *" type="date" value={convertData.dueDate}
                onChange={v => setConvertData({...convertData, dueDate: v})} />
              <Input label="Total (Rs.) *" type="number" value={convertData.total}
                onChange={v => setConvertData({...convertData, total: v})} />
              <Input label="Advance (Rs.)" type="number" value={convertData.advance}
                onChange={v => setConvertData({...convertData, advance: v})} />

              {convertData.total && (
                <div className="bg-green-500/10 border border-green-500/30 text-green-600 text-sm p-3 rounded-lg">
                  Balance: <b>Rs. {Number(convertData.total) - Number(convertData.advance || 0)}</b>
                </div>
              )}

              <div>
                <label className="text-sm dark:text-gray-300">Payment Method</label>
                <select value={convertData.paymentMethod}
                  onChange={e => setConvertData({...convertData, paymentMethod: e.target.value})}
                  className="w-full p-2 border dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg">
                  {["Cash","Card","Online"].map(p => <option key={p}>{p}</option>)}
                </select>
              </div>

              <button onClick={handleConvert}
                className="w-full bg-gold hover:bg-yellow-500 text-navy font-bold py-3 rounded-lg mt-2">
                ✅ Create Order & Send WhatsApp
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