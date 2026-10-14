import { useEffect, useState } from "react";
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc
} from "firebase/firestore";
import { db } from "../firebase";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Package, Plus, Search, Edit, Trash2, X,
  AlertTriangle, TrendingUp, TrendingDown, Boxes,
  DollarSign, Truck, Filter, Minus
} from "lucide-react";

export default function Inventory() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [stockAction, setStockAction] = useState("in"); // in | out
  const [stockQty, setStockQty] = useState("");
  const [stockNote, setStockNote] = useState("");
  const navigate = useNavigate();

  const emptyForm = {
    name: "", category: "Frame", sku: "",
    quantity: "", minStock: "", unitPrice: "",
    supplier: "", notes: ""
  };
  const [form, setForm] = useState(emptyForm);

  // ===== Fetch Items =====
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "inventory"), (snap) => {
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  // ===== Stats =====
  const totalItems = items.length;
  const totalValue = items.reduce((s, i) => s + (Number(i.quantity) * Number(i.unitPrice) || 0), 0);
  const lowStock = items.filter(i => Number(i.quantity) <= Number(i.minStock));
  const outOfStock = items.filter(i => Number(i.quantity) === 0);

  // ===== Categories =====
  const categories = ["All", ...new Set(items.map(i => i.category))];

  // ===== Save (Create/Update) =====
  const handleSave = async () => {
    if (!form.name || !form.quantity || !form.unitPrice) {
      return alert("Name, Quantity, Price required!");
    }
    const data = {
      ...form,
      quantity: Number(form.quantity),
      minStock: Number(form.minStock || 0),
      unitPrice: Number(form.unitPrice),
      updatedAt: new Date().toISOString()
    };

    if (editingId) {
      await updateDoc(doc(db, "inventory", editingId), data);
    } else {
      await addDoc(collection(db, "inventory"), {
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

  const handleEdit = (item) => {
    setForm({
      name: item.name || "",
      category: item.category || "Frame",
      sku: item.sku || "",
      quantity: item.quantity || "",
      minStock: item.minStock || "",
      unitPrice: item.unitPrice || "",
      supplier: item.supplier || "",
      notes: item.notes || ""
    });
    setEditingId(item.id);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (confirm("Delete this item?")) await deleteDoc(doc(db, "inventory", id));
  };

  // ===== Stock In/Out =====
  const openStockModal = (item, action) => {
    setSelectedItem(item);
    setStockAction(action);
    setStockQty("");
    setStockNote("");
    setShowStockModal(true);
  };

  const handleStockUpdate = async () => {
    if (!stockQty || Number(stockQty) <= 0) return alert("Enter valid quantity!");
    const qty = Number(stockQty);
    let newQty = Number(selectedItem.quantity);

    if (stockAction === "in") {
      newQty += qty;
    } else {
      if (qty > newQty) return alert("Not enough stock!");
      newQty -= qty;
    }

    await updateDoc(doc(db, "inventory", selectedItem.id), {
      quantity: newQty,
      updatedAt: new Date().toISOString()
    });

    // Log the transaction
    await addDoc(collection(db, "stockMovements"), {
      itemId: selectedItem.id,
      itemName: selectedItem.name,
      type: stockAction,
      quantity: qty,
      note: stockNote,
      before: selectedItem.quantity,
      after: newQty,
      createdAt: new Date().toISOString()
    });

    setShowStockModal(false);
  };

  // ===== Filter =====
  const filtered = items.filter(i => {
    const matchSearch = (i.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (i.sku || "").toLowerCase().includes(search.toLowerCase()) ||
      (i.supplier || "").toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCategory === "All" || i.category === filterCategory;
    return matchSearch && matchCat;
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-navy text-white p-6 flex justify-between items-center flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/dashboard")} className="p-2 hover:bg-white/10 rounded-lg">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gold">📦 Inventory</h1>
            <p className="text-gray-400 text-sm">{totalItems} items | Stock management</p>
          </div>
        </div>
        <button
          onClick={() => { setEditingId(null); setForm(emptyForm); setShowModal(true); }}
          className="flex items-center gap-2 bg-gold hover:bg-yellow-500 text-navy font-bold px-5 py-2.5 rounded-lg"
        >
          <Plus size={18} /> New Item
        </button>
      </div>

      <div className="p-8 max-w-7xl mx-auto">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <StatCard icon={Boxes} label="Total Items" value={totalItems}
            color="from-blue-500 to-blue-700" />
          <StatCard icon={DollarSign} label="Total Value"
            value={`Rs. ${totalValue.toLocaleString()}`}
            color="from-gold to-yellow-600" />
          <StatCard icon={AlertTriangle} label="Low Stock"
            value={lowStock.length} color="from-orange-500 to-orange-700"
            highlight={lowStock.length > 0} />
          <StatCard icon={X} label="Out of Stock"
            value={outOfStock.length} color="from-red-500 to-red-700"
            highlight={outOfStock.length > 0} />
        </div>

        {/* Low Stock Alert */}
        {lowStock.length > 0 && (
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-2xl p-4 mb-6 flex items-center gap-3">
            <AlertTriangle className="text-orange-500 flex-shrink-0" size={24} />
            <div className="flex-1">
              <p className="font-bold text-orange-500">
                {lowStock.length} item{lowStock.length > 1 ? "s" : ""} need restocking!
              </p>
              <p className="text-sm text-orange-400">
                {lowStock.map(i => i.name).join(", ")}
              </p>
            </div>
          </div>
        )}

        {/* Search + Filter */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-lg mb-6 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-3 text-gray-400" size={18} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, SKU, supplier..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border dark:border-gray-700 rounded-lg dark:text-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-gray-400" />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="p-2.5 bg-gray-50 dark:bg-gray-800 border dark:border-gray-700 rounded-lg dark:text-white"
            >
              {categories.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* Items List */}
        {filtered.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-12 text-center shadow-lg">
            <Package className="mx-auto text-gray-300 mb-4" size={48} />
            <p className="text-gray-400">No items found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map(item => {
              const isLow = Number(item.quantity) <= Number(item.minStock);
              const isOut = Number(item.quantity) === 0;
              return (
                <div key={item.id} className={`bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-lg border-2 transition ${
                  isOut ? "border-red-500/40" :
                  isLow ? "border-orange-500/40" :
                  "border-gray-100 dark:border-gray-800"
                }`}>
                  {/* Header */}
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs bg-gray-100 dark:bg-gray-800 dark:text-gray-300 px-2 py-0.5 rounded-full">
                          {item.category}
                        </span>
                        {isOut && <span className="text-xs bg-red-500/20 text-red-500 px-2 py-0.5 rounded-full">Out</span>}
                        {!isOut && isLow && <span className="text-xs bg-orange-500/20 text-orange-500 px-2 py-0.5 rounded-full">Low</span>}
                      </div>
                      <h3 className="font-bold dark:text-white">{item.name}</h3>
                      {item.sku && <p className="text-xs text-gray-400 font-mono">SKU: {item.sku}</p>}
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => handleEdit(item)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                        <Edit size={14} className="text-blue-500" />
                      </button>
                      <button onClick={() => handleDelete(item.id)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                        <Trash2 size={14} className="text-red-500" />
                      </button>
                    </div>
                  </div>

                  {/* Quantity */}
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 mb-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-xs text-gray-500">In Stock</p>
                        <p className={`text-2xl font-bold ${
                          isOut ? "text-red-500" :
                          isLow ? "text-orange-500" :
                          "text-green-600"
                        }`}>
                          {item.quantity} <span className="text-sm font-normal text-gray-400">units</span>
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Unit Price</p>
                        <p className="font-bold dark:text-white">Rs. {Number(item.unitPrice).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 mt-2">
                      <span>Min: {item.minStock}</span>
                      <span>Value: Rs. {(item.quantity * item.unitPrice).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Supplier */}
                  {item.supplier && (
                    <p className="text-xs text-gray-500 mb-3 flex items-center gap-1">
                      <Truck size={12} /> {item.supplier}
                    </p>
                  )}

                  {/* Stock Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => openStockModal(item, "in")}
                      className="flex-1 flex items-center justify-center gap-1 bg-green-500/10 text-green-600 py-2 rounded-lg text-sm font-medium hover:bg-green-500/20"
                    >
                      <TrendingUp size={14} /> Stock In
                    </button>
                    <button
                      onClick={() => openStockModal(item, "out")}
                      disabled={item.quantity === 0}
                      className="flex-1 flex items-center justify-center gap-1 bg-red-500/10 text-red-500 py-2 rounded-lg text-sm font-medium hover:bg-red-500/20 disabled:opacity-50"
                    >
                      <TrendingDown size={14} /> Stock Out
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Item Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold dark:text-white">
                {editingId ? "✏️ Edit Item" : "🆕 New Item"}
              </h3>
              <button onClick={closeModal}><X className="dark:text-white" /></button>
            </div>
            <div className="space-y-3">
              <Input label="Item Name *" value={form.name} onChange={v => setForm({...form, name: v})} />
              <div>
                <label className="text-sm dark:text-gray-300">Category</label>
                <select value={form.category} onChange={e => setForm({...form, category: e.target.value})}
                  className="w-full p-2 border dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg">
                  {["Frame", "Glass", "Mat", "Backing", "Hardware", "Tools", "Other"].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <Input label="SKU / Code" value={form.sku} onChange={v => setForm({...form, sku: v})} />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Quantity *" type="number" value={form.quantity} onChange={v => setForm({...form, quantity: v})} />
                <Input label="Min Stock" type="number" value={form.minStock} onChange={v => setForm({...form, minStock: v})} />
              </div>
              <Input label="Unit Price (Rs.) *" type="number" value={form.unitPrice} onChange={v => setForm({...form, unitPrice: v})} />
              <Input label="Supplier" value={form.supplier} onChange={v => setForm({...form, supplier: v})} />
              <div>
                <label className="text-sm dark:text-gray-300">Notes</label>
                <textarea rows="2" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})}
                  className="w-full p-2 border dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg" />
              </div>
              <button onClick={handleSave}
                className="w-full bg-gold hover:bg-yellow-500 text-navy font-bold py-3 rounded-lg mt-2">
                {editingId ? "Update" : "Save"} Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stock In/Out Modal */}
      {showStockModal && selectedItem && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold dark:text-white">
                {stockAction === "in" ? "📥 Stock In" : "📤 Stock Out"}
              </h3>
              <button onClick={() => setShowStockModal(false)}><X className="dark:text-white" /></button>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 mb-4">
              <p className="font-bold dark:text-white">{selectedItem.name}</p>
              <p className="text-sm text-gray-500">Current: {selectedItem.quantity} units</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm dark:text-gray-300">Quantity</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setStockQty(Math.max(1, Number(stockQty || 1) - 1).toString())}
                    className="p-2.5 bg-gray-100 dark:bg-gray-800 rounded-lg"
                  >
                    <Minus size={16} className="dark:text-white" />
                  </button>
                  <input
                    type="number"
                    value={stockQty}
                    onChange={e => setStockQty(e.target.value)}
                    placeholder="0"
                    className="flex-1 p-2 border dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg text-center font-bold text-lg"
                  />
                  <button
                    onClick={() => setStockQty((Number(stockQty || 0) + 1).toString())}
                    className="p-2.5 bg-gray-100 dark:bg-gray-800 rounded-lg"
                  >
                    <Plus size={16} className="dark:text-white" />
                  </button>
                </div>
              </div>

              {stockQty && (
                <div className={`p-3 rounded-lg text-sm ${
                  stockAction === "in" ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-500"
                }`}>
                  New stock: <b>
                    {stockAction === "in"
                      ? Number(selectedItem.quantity) + Number(stockQty)
                      : Number(selectedItem.quantity) - Number(stockQty)
                    } units
                  </b>
                </div>
              )}

              <div>
                <label className="text-sm dark:text-gray-300">Note (optional)</label>
                <input value={stockNote} onChange={e => setStockNote(e.target.value)}
                  placeholder="ex: Purchase order #123"
                  className="w-full p-2 border dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg" />
              </div>

              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => setShowStockModal(false)}
                  className="flex-1 py-3 rounded-lg border border-gray-200 dark:border-gray-700 font-bold dark:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStockUpdate}
                  className={`flex-1 py-3 rounded-lg font-bold text-white ${
                    stockAction === "in" ? "bg-green-500 hover:bg-green-600" : "bg-red-500 hover:bg-red-600"
                  }`}
                >
                  {stockAction === "in" ? "Add Stock" : "Remove Stock"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, highlight }) {
  return (
    <div className={`bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-lg border ${
      highlight ? "border-orange-500/40" : "border-gray-100 dark:border-gray-800"
    }`}>
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-4`}>
        <Icon className="text-white" size={22} />
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