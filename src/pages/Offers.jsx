import { useEffect, useState } from "react";
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc
} from "firebase/firestore";
import { db } from "../firebase";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Gift, Plus, Search, Edit, Trash2, X, Copy,
  Check, Calendar, Percent, DollarSign, Award, Users,
  TrendingUp, Clock, Tag, Zap, Crown
} from "lucide-react";

const OFFER_TYPES = [
  { id: "percent", label: "Percentage (%)", icon: Percent },
  { id: "fixed", label: "Fixed Amount (Rs.)", icon: DollarSign },
];

export default function Offers() {
  const [offers, setOffers] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all"); // all | active | expired | used
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const navigate = useNavigate();

  const emptyForm = {
    code: "",
    title: "",
    type: "percent",
    value: "",
    minOrder: "",
    maxUses: "",
    expiry: "",
    description: "",
    active: true
  };
  const [form, setForm] = useState(emptyForm);

  // ===== Fetch =====
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "offers"), (snap) => {
      setOffers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  // ===== Auto-generate code =====
  const genCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "VS";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  // ===== Status =====
  const getStatus = (offer) => {
    const today = new Date().toISOString().split("T")[0];
    if (!offer.active) return "inactive";
    if (offer.expiry && offer.expiry < today) return "expired";
    if (offer.maxUses && (offer.usedCount || 0) >= Number(offer.maxUses)) return "used";
    return "active";
  };

  const statusStyles = {
    active: "bg-green-500/20 text-green-600",
    expired: "bg-red-500/20 text-red-500",
    used: "bg-orange-500/20 text-orange-500",
    inactive: "bg-gray-500/20 text-gray-500"
  };

  // ===== Stats =====
  const activeCount = offers.filter(o => getStatus(o) === "active").length;
  const totalUses = offers.reduce((s, o) => s + (o.usedCount || 0), 0);
  const totalDiscount = offers.reduce((s, o) => s + (o.totalDiscount || 0), 0);

  // ===== Filter =====
  const filtered = offers.filter(o => {
    const matchSearch = !search ||
      (o.code || "").toLowerCase().includes(search.toLowerCase()) ||
      (o.title || "").toLowerCase().includes(search.toLowerCase());
    const status = getStatus(o);
    const matchFilter = filter === "all" || status === filter;
    return matchSearch && matchFilter;
  });

  // ===== Save =====
  const handleSave = async () => {
    if (!form.code || !form.title || !form.value) {
      return alert("Code, Title, Value required!");
    }
    const code = form.code.toUpperCase().trim();
    const data = {
      ...form,
      code,
      value: Number(form.value),
      minOrder: Number(form.minOrder || 0),
      maxUses: form.maxUses ? Number(form.maxUses) : null,
      usedCount: editingId ? (offers.find(o => o.id === editingId)?.usedCount || 0) : 0,
      totalDiscount: editingId ? (offers.find(o => o.id === editingId)?.totalDiscount || 0) : 0,
      updatedAt: new Date().toISOString()
    };

    if (editingId) {
      await updateDoc(doc(db, "offers", editingId), data);
    } else {
      // Check for duplicate
      const exists = offers.find(o => o.code === code);
      if (exists) return alert("Code already exists!");
      await addDoc(collection(db, "offers"), {
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

  const handleEdit = (o) => {
    setForm({
      code: o.code || "",
      title: o.title || "",
      type: o.type || "percent",
      value: o.value || "",
      minOrder: o.minOrder || "",
      maxUses: o.maxUses || "",
      expiry: o.expiry || "",
      description: o.description || "",
      active: o.active !== false
    });
    setEditingId(o.id);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (confirm("Delete this offer?")) await deleteDoc(doc(db, "offers", id));
  };

  const handleToggleActive = async (o) => {
    await updateDoc(doc(db, "offers", o.id), { active: !o.active });
  };

  const copyCode = (code, id) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
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
            <h1 className="text-2xl font-bold text-gold">🎁 Offers & Discounts</h1>
            <p className="text-gray-400 text-sm">Manage promo codes & special offers</p>
          </div>
        </div>
        <button
          onClick={() => {
            setEditingId(null);
            setForm({ ...emptyForm, code: genCode() });
            setShowModal(true);
          }}
          className="flex items-center gap-2 bg-gold hover:bg-yellow-500 text-navy font-bold px-5 py-2.5 rounded-lg"
        >
          <Plus size={18} /> New Offer
        </button>
      </div>

      <div className="p-8 max-w-7xl mx-auto">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <StatCard icon={Gift} label="Total Offers" value={offers.length} color="from-blue-500 to-blue-700" />
          <StatCard icon={Zap} label="Active" value={activeCount} color="from-green-500 to-green-700" />
          <StatCard icon={TrendingUp} label="Total Uses" value={totalUses} color="from-gold to-yellow-600" />
          <StatCard icon={DollarSign} label="Total Discount" value={`Rs. ${totalDiscount.toLocaleString()}`} color="from-red-500 to-red-700" />
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-lg mb-6 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-3 text-gray-400" size={18} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search code or title..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border dark:border-gray-700 rounded-lg dark:text-white"
            />
          </div>
          {[
            { id: "all", label: "All" },
            { id: "active", label: "Active" },
            { id: "expired", label: "Expired" },
            { id: "used", label: "Used Up" },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium ${
                filter === f.id ? "bg-gold text-navy" : "bg-gray-100 dark:bg-gray-800 dark:text-white"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Offers Grid */}
        {filtered.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-12 text-center shadow-lg">
            <Gift className="mx-auto text-gray-300 mb-4" size={48} />
            <p className="text-gray-400">No offers found</p>
            <p className="text-sm text-gray-400 mt-1">Create your first promo code!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(o => {
              const status = getStatus(o);
              const TypeIcon = o.type === "percent" ? Percent : DollarSign;
              const usagePct = o.maxUses ? Math.round(((o.usedCount || 0) / o.maxUses) * 100) : 0;

              return (
                <div key={o.id} className={`bg-white dark:bg-gray-900 rounded-2xl shadow-lg overflow-hidden border-2 transition ${
                  status === "active" ? "border-green-500/30" :
                  status === "expired" ? "border-red-500/30" :
                  "border-gray-100 dark:border-gray-800"
                }`}>
                  {/* Top Banner */}
                  <div className="bg-gradient-to-r from-gold to-yellow-500 p-4 relative">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="text-xs text-navy/70 font-medium">Promo Code</p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-2xl font-bold text-navy tracking-wider font-mono">
                            {o.code}
                          </p>
                          <button
                            onClick={() => copyCode(o.code, o.id)}
                            className="p-1.5 bg-navy/20 hover:bg-navy/30 rounded-lg"
                            title="Copy code"
                          >
                            {copiedId === o.id
                              ? <Check size={14} className="text-navy" />
                              : <Copy size={14} className="text-navy" />}
                          </button>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="bg-white/30 rounded-xl px-3 py-2 backdrop-blur">
                          <TypeIcon size={20} className="text-navy mx-auto" />
                          <p className="text-lg font-bold text-navy">
                            {o.type === "percent" ? `${o.value}%` : `Rs.${o.value}`}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <span className={`inline-block mt-3 px-3 py-1 rounded-full text-xs font-bold ${statusStyles[status]} bg-white/80 backdrop-blur`}>
                      {status === "active" && "✅ Active"}
                      {status === "expired" && "⏰ Expired"}
                      {status === "used" && "🎯 Used Up"}
                      {status === "inactive" && "⏸️ Inactive"}
                    </span>
                  </div>

                  {/* Body */}
                  <div className="p-5">
                    <h3 className="font-bold dark:text-white text-lg">{o.title}</h3>
                    {o.description && (
                      <p className="text-sm text-gray-500 mt-1">{o.description}</p>
                    )}

                    {/* Info Grid */}
                    <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
                      {o.minOrder > 0 && (
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2">
                          <p className="text-gray-500">Min Order</p>
                          <p className="font-bold dark:text-white">Rs. {o.minOrder}</p>
                        </div>
                      )}
                      {o.expiry && (
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2">
                          <p className="text-gray-500 flex items-center gap-1">
                            <Calendar size={10} /> Expiry
                          </p>
                          <p className="font-bold dark:text-white">{o.expiry}</p>
                        </div>
                      )}
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2">
                        <p className="text-gray-500">Used</p>
                        <p className="font-bold dark:text-white">
                          {o.usedCount || 0}{o.maxUses ? ` / ${o.maxUses}` : ""}
                        </p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2">
                        <p className="text-gray-500">Saved</p>
                        <p className="font-bold text-green-600">
                          Rs. {(o.totalDiscount || 0).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* Usage Bar */}
                    {o.maxUses && (
                      <div className="mt-3">
                        <div className="flex justify-between text-xs mb-1 dark:text-gray-400">
                          <span>Usage</span>
                          <span>{usagePct}%</span>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              usagePct >= 100 ? "bg-red-500" :
                              usagePct >= 75 ? "bg-orange-500" :
                              "bg-green-500"
                            }`}
                            style={{ width: `${Math.min(usagePct, 100)}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => handleToggleActive(o)}
                        className={`flex-1 text-xs font-medium py-2 rounded-lg ${
                          o.active
                            ? "bg-orange-500/10 text-orange-500 hover:bg-orange-500/20"
                            : "bg-green-500/10 text-green-600 hover:bg-green-500/20"
                        }`}
                      >
                        {o.active ? "⏸️ Deactivate" : "▶️ Activate"}
                      </button>
                      <button
                        onClick={() => handleEdit(o)}
                        className="p-2 bg-blue-500/10 text-blue-500 rounded-lg hover:bg-blue-500/20"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(o.id)}
                        className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
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
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold dark:text-white">
                {editingId ? "✏️ Edit Offer" : "🎁 New Offer"}
              </h3>
              <button onClick={closeModal}><X className="dark:text-white" /></button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm dark:text-gray-300">Promo Code *</label>
                <div className="flex gap-2">
                  <input
                    value={form.code}
                    onChange={e => setForm({...form, code: e.target.value.toUpperCase()})}
                    className="flex-1 p-2 border dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg font-mono font-bold tracking-wider"
                  />
                  <button
                    onClick={() => setForm({...form, code: genCode()})}
                    className="px-4 bg-gray-100 dark:bg-gray-800 dark:text-white rounded-lg text-sm font-medium"
                  >
                    🎲 Gen
                  </button>
                </div>
              </div>

              <Input label="Title *" value={form.title}
                onChange={v => setForm({...form, title: v})}
                placeholder="ex: Christmas Special" />

              <div>
                <label className="text-sm dark:text-gray-300">Discount Type *</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {OFFER_TYPES.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setForm({...form, type: t.id})}
                      className={`flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium text-sm ${
                        form.type === t.id
                          ? "bg-gold text-navy"
                          : "bg-gray-100 dark:bg-gray-800 dark:text-white"
                      }`}
                    >
                      <t.icon size={14} /> {t.id === "percent" ? "%" : "Rs."}
                    </button>
                  ))}
                </div>
              </div>

              <Input
                label={form.type === "percent" ? "Discount (%) *" : "Discount (Rs.) *"}
                type="number"
                value={form.value}
                onChange={v => setForm({...form, value: v})}
              />

              <div className="grid grid-cols-2 gap-3">
                <Input label="Min Order (Rs.)" type="number" value={form.minOrder}
                  onChange={v => setForm({...form, minOrder: v})} />
                <Input label="Max Uses" type="number" value={form.maxUses}
                  onChange={v => setForm({...form, maxUses: v})} />
              </div>

              <Input label="Expiry Date" type="date" value={form.expiry}
                onChange={v => setForm({...form, expiry: v})} />

              <div>
                <label className="text-sm dark:text-gray-300">Description</label>
                <textarea rows="2" value={form.description}
                  onChange={e => setForm({...form, description: e.target.value})}
                  placeholder="Terms & conditions..."
                  className="w-full p-2 border dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg" />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={e => setForm({...form, active: e.target.checked})}
                  className="w-4 h-4 accent-gold"
                />
                <span className="text-sm dark:text-gray-300">Active (customer can use)</span>
              </label>

              <button onClick={handleSave}
                className="w-full bg-gold hover:bg-yellow-500 text-navy font-bold py-3 rounded-lg mt-2">
                {editingId ? "Update" : "Create"} Offer
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
