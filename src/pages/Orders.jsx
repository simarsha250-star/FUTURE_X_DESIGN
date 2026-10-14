import { useEffect, useState } from "react";
import {
  collection, addDoc, updateDoc, doc, onSnapshot, deleteDoc
} from "firebase/firestore";
import { db } from "../firebase";
import {
  Plus, Printer, CheckCircle, Trash2, X, ChevronLeft, ChevronRight,
  Edit, Save, ArrowLeft, Search, Filter, MessageCircle, Phone
} from "lucide-react";
import { useNavigate } from "react-router-dom";

// ✅ Phone format helper — හැම format එකක්ම 94771234567 වලට
const formatPhone = (phone) => {
  if (!phone) return "";

  // 1. Digits විතරක් ගන්න (+ , 0, spaces, dashes ඔක්කොම අයින් කරන්න)
  let p = String(phone).replace(/\D/g, "");

  // 2. Empty නම් return
  if (!p) return "";

  // 3. "0" එකෙන් පටන් ගන්නවා නම් → 0 අයින් කරලා 94 දාන්න
  if (p.startsWith("0")) {
    p = "94" + p.substring(1);
  }
  // 4. "94" එකෙන් පටන් ගන්නේ නැත්නම් → 94 දාන්න
  else if (!p.startsWith("94")) {
    p = "94" + p;
  }

  // 5. අන්තිමට digit count බලන්න (Sri Lanka = 94 + 9 digits = 11 digits)
  // අඩු නම්, error message එකක් console එකට
  if (p.length !== 11) {
    console.warn(`⚠️ Phone number length issue: "${phone}" → "${p}" (${p.length} digits)`);
  }

  return p;
};

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [showFilters, setShowFilters] = useState(false);
  const navigate = useNavigate();

  const emptyForm = {
    customer: "", phone: "", size: "12x18",
    dueDate: "", total: "", advance: "",
    status: "Pending", paymentMethod: "Cash"
  };

  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "orders"), (snap) => {
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const genOrderId = () => `VS-${String(orders.length + 1).padStart(4, "0")}`;

  // ===== CREATE or UPDATE =====
  const handleSave = async () => {
    if (!form.customer || !form.dueDate || !form.total) {
      return alert("Fill required fields!");
    }
    const balance = Number(form.total) - Number(form.advance || 0);

    if (editingId) {
      await updateDoc(doc(db, "orders", editingId), {
        ...form,
        balance,
        updatedAt: new Date().toISOString()
      });
    } else {
      await addDoc(collection(db, "orders"), {
        ...form,
        orderId: genOrderId(),
        balance,
        orderDate: selectedDate,
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

  // ===== EDIT =====
  const handleEdit = (o) => {
    setForm({
      customer: o.customer || "",
      phone: o.phone || "",
      size: o.size || "12x18",
      dueDate: o.dueDate || "",
      total: o.total || "",
      advance: o.advance || "",
      status: o.status || "Pending",
      paymentMethod: o.paymentMethod || "Cash"
    });
    setEditingId(o.id);
    setShowModal(true);
  };

  // ===== COMPLETE + WhatsApp =====
  const handleComplete = async (o) => {
    await updateDoc(doc(db, "orders", o.id), { status: "Completed" });

    const msg = encodeURIComponent(
      `ඔබේ order එක සම්පූර්ණයි! ✅\nID: ${o.orderId}\nFUTURE X DESIGN 🎨`
    );

    if (o.phone) {
      const phone = formatPhone(o.phone);
      console.log("📱 Original:", o.phone, "→ Formatted:", phone);
      if (phone.length !== 11) {
        alert(`⚠️ Phone number issue: "${o.phone}"\nFormatted: "${phone}"\n\nSri Lanka number එක 94 + 9 digits වෙන්න ඕන (11 digits).`);
      }
      window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
    } else {
      alert("⚠️ No phone number!");
    }
  };

  // ===== WhatsApp Only (status change නෑ) =====
  const sendWhatsApp = (o) => {
    if (!o.phone) return alert("⚠️ No phone number!");

    const msg = encodeURIComponent(
      `Hi ${o.customer}! 👋\n\n` +
      `ඔබේ order එකේ විස්තර:\n` +
      `ID: ${o.orderId}\n` +
      `Size: ${o.size}\n` +
      `Due: ${o.dueDate}\n` +
      `Balance: Rs. ${o.balance}\n\n` +
      `FUTURE X DESIGN 🎨`
    );

    const phone = formatPhone(o.phone);
    console.log("📱 Original:", o.phone, "→ Formatted:", phone);
    if (phone.length !== 11) {
      alert(`⚠️ Phone number issue: "${o.phone}"\nFormatted: "${phone}"\n\nSri Lanka number එක 94 + 9 digits වෙන්න ඕන (11 digits).`);
    }
    window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
  };

  // ===== DELETE =====
  const handleDelete = async (id) => {
    if (confirm("Delete this order?")) await deleteDoc(doc(db, "orders", id));
  };

  // ===== PRINT =====
  const handlePrint = (o) => {
    const win = window.open("", "", "width=400,height=600");
    win.document.write(`
      <html><head><title>Invoice ${o.orderId}</title>
      <style>
        body { font-family: Arial; padding: 20px; }
        h2 { color: #F59E0B; }
        p { margin: 6px 0; }
        hr { border: 1px dashed #ccc; margin: 15px 0; }
      </style></head><body>
      <h2>🌌 FUTURE X DESIGN</h2>
      <hr/>
      <p><b>Order ID:</b> ${o.orderId}</p>
      <p><b>Customer:</b> ${o.customer}</p>
      <p><b>Phone:</b> ${o.phone || "-"}</p>
      <p><b>Size:</b> ${o.size}</p>
      <p><b>Order Date:</b> ${o.orderDate}</p>
      <p><b>Due Date:</b> ${o.dueDate}</p>
      <hr/>
      <p><b>Total:</b> Rs. ${o.total}</p>
      <p><b>Advance:</b> Rs. ${o.advance}</p>
      <p><b>Balance:</b> Rs. ${o.balance}</p>
      <p><b>Status:</b> ${o.status}</p>
      <hr/>
      <p style="text-align:center;font-size:12px;color:#888;">Thank you! 🙏</p>
      </body></html>
    `);
    win.document.close();
    win.print();
  };

  // ===== CALENDAR =====
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  const monthName = currentMonth.toLocaleString("default", { month: "long", year: "numeric" });

  // ===== FILTER & SEARCH =====
  const dayOrders = orders.filter(o => {
    const matchesDate = search ? true : o.orderDate === selectedDate;
    const matchesSearch = !search || (
      (o.customer || "").toLowerCase().includes(search.toLowerCase()) ||
      (o.orderId || "").toLowerCase().includes(search.toLowerCase()) ||
      (o.phone || "").includes(search)
    );
    const matchesFilter = filterStatus === "All" || o.status === filterStatus;
    return matchesDate && matchesSearch && matchesFilter;
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-8">
      <button onClick={() => navigate("/dashboard")}
        className="mb-4 text-sm text-gray-500 hover:text-gold flex items-center gap-1">
        <ArrowLeft size={14} /> Back to Dashboard
      </button>

      <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
        <h1 className="text-3xl font-bold dark:text-white">📅 Orders</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-white font-medium px-4 py-2.5 rounded-lg"
          >
            <Filter size={18} /> Filter
          </button>
          <button
            onClick={() => { setEditingId(null); setForm(emptyForm); setShowModal(true); }}
            className="flex items-center gap-2 bg-gold hover:bg-yellow-500 text-navy font-bold px-5 py-2.5 rounded-lg"
          >
            <Plus size={18} /> New Order
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      {showFilters && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 mb-6 shadow-lg">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 text-gray-400" size={18} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, phone, ID..."
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border dark:border-gray-700 rounded-lg dark:text-white"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="p-2.5 bg-gray-50 dark:bg-gray-800 border dark:border-gray-700 rounded-lg dark:text-white"
            >
              <option>All</option>
              <option>Pending</option>
              <option>Completed</option>
            </select>
            <div className="flex gap-2">
              <button
                onClick={() => setSearch(new Date().toISOString().split("T")[0])}
                className="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-white rounded-lg py-2.5 text-sm"
              >
                Today
              </button>
              <button
                onClick={() => { setSearch(""); setFilterStatus("All"); }}
                className="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-white rounded-lg py-2.5 text-sm"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}>
              <ChevronLeft className="dark:text-white" />
            </button>
            <h3 className="font-bold dark:text-white">{monthName}</h3>
            <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}>
              <ChevronRight className="dark:text-white" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500 mb-2">
            {["S","M","T","W","T","F","S"].map((d,i) => <div key={i}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array(firstDay).fill(null).map((_, i) => <div key={i}></div>)}
            {Array(daysInMonth).fill(null).map((_, i) => {
              const day = i + 1;
              const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth()+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
              const dayOrds = orders.filter(o => o.orderDate === dateStr);
              const hasPending = dayOrds.some(o => o.status !== "Completed");
              const hasCompleted = dayOrds.some(o => o.status === "Completed");
              const isSelected = selectedDate === dateStr;
              return (
                <button
                  key={day}
                  onClick={() => { setSelectedDate(dateStr); setSearch(""); }}
                  className={`aspect-square rounded-lg text-sm relative ${
                    isSelected ? "bg-gold text-navy font-bold"
                    : "hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-white"
                  }`}
                >
                  {day}
                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                    {hasPending && !isSelected && <span className="w-1.5 h-1.5 bg-orange-500 rounded-full"></span>}
                    {hasCompleted && !isSelected && <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex gap-3 mt-4 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-orange-500 rounded-full"></span> Pending
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span> Completed
            </div>
          </div>
        </div>

        {/* Orders List */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold dark:text-white">
              {search ? `Search Results (${dayOrders.length})` : `Orders on ${selectedDate} (${dayOrders.length})`}
            </h3>
          </div>
          {dayOrders.length === 0 ? (
            <p className="text-gray-400 text-center py-10">No orders found</p>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {dayOrders.map(o => (
                <div key={o.id} className="border dark:border-gray-700 rounded-xl p-4 flex justify-between items-start hover:border-gold transition">
                  <div className="flex-1">
                    <p className="font-mono text-gold text-sm">{o.orderId}</p>
                    <p className="font-bold dark:text-white">{o.customer}</p>
                    <p className="text-sm text-gray-500">
                      {o.phone ? `📞 ${o.phone} | ` : ""}{o.size}
                    </p>
                    <p className="text-sm text-gray-500">Due: {o.dueDate}</p>
                    <p className="text-sm dark:text-gray-300">
                      Total: Rs. {o.total} | Advance: Rs. {o.advance} | <span className="font-bold">Balance: Rs. {o.balance}</span>
                    </p>
                    <div className="flex gap-2 mt-2">
                      <span className={`px-3 py-1 rounded-full text-xs ${
                        o.status === "Completed"
                          ? "bg-green-500/20 text-green-600"
                          : "bg-orange-500/20 text-orange-600"
                      }`}>{o.status}</span>
                      <span className="px-3 py-1 rounded-full text-xs bg-gray-100 dark:bg-gray-800 dark:text-gray-300">
                        {o.paymentMethod}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 ml-3">
                    <button onClick={() => handleEdit(o)} title="Edit"
                      className="p-2 bg-blue-500/20 text-blue-500 rounded-lg hover:bg-blue-500/30">
                      <Edit size={16} />
                    </button>
                    <button onClick={() => handlePrint(o)} title="Print"
                      className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg dark:text-white">
                      <Printer size={16} />
                    </button>
                    <button onClick={() => sendWhatsApp(o)} title="WhatsApp"
                      className="p-2 bg-green-500/20 text-green-600 rounded-lg hover:bg-green-500/30">
                      <MessageCircle size={16} />
                    </button>
                    {o.status !== "Completed" && (
                      <button onClick={() => handleComplete(o)} title="Complete"
                        className="p-2 bg-emerald-500/20 text-emerald-600 rounded-lg hover:bg-emerald-500/30">
                        <CheckCircle size={16} />
                      </button>
                    )}
                    <button onClick={() => handleDelete(o.id)} title="Delete"
                      className="p-2 bg-red-500/20 text-red-500 rounded-lg hover:bg-red-500/30">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
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
                {editingId ? "✏️ Edit Order" : "🆕 New Order"}
              </h3>
              <button onClick={closeModal}><X className="dark:text-white" /></button>
            </div>

            {editingId && (
              <div className="bg-gold/10 border border-gold/30 text-gold text-sm p-3 rounded-lg mb-4">
                💡 Editing existing order. Save කරාම update වෙනවා.
              </div>
            )}

            <div className="space-y-3">
              <Input label="Customer *" value={form.customer} onChange={v => setForm({...form, customer: v})} />

              <div>
                <label className="text-sm dark:text-gray-300 flex items-center gap-1">
                  <Phone size={12} /> Phone (WhatsApp)
                </label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={e => setForm({...form, phone: e.target.value})}
                  placeholder="+94771234567 / 0771234567"
                  className="w-full p-2 border dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg"
                />
                <p className="text-xs text-gray-400 mt-1">
                  💡 හැම format එකක්ම වැඩ කරනවා (+94, 0, 94)
                </p>
              </div>

              <div>
                <label className="text-sm dark:text-gray-300">Size</label>
                <select value={form.size} onChange={e => setForm({...form, size: e.target.value})}
                  className="w-full p-2 border dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg">
                  {["12x18","8x10","10x15","16x20","A4","A3"].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>

              <Input label="Due Date *" type="date" value={form.dueDate} onChange={v => setForm({...form, dueDate: v})} />
              <Input label="Total (Rs.) *" type="number" value={form.total} onChange={v => setForm({...form, total: v})} />
              <Input label="Advance (Rs.)" type="number" value={form.advance} onChange={v => setForm({...form, advance: v})} />

              {form.total && (
                <div className="bg-green-500/10 border border-green-500/30 text-green-600 text-sm p-3 rounded-lg">
                  Balance: <b>Rs. {Number(form.total) - Number(form.advance || 0)}</b>
                </div>
              )}

              <div>
                <label className="text-sm dark:text-gray-300">Payment Method</label>
                <select value={form.paymentMethod} onChange={e => setForm({...form, paymentMethod: e.target.value})}
                  className="w-full p-2 border dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg">
                  {["Cash","Card","Online"].map(p => <option key={p}>{p}</option>)}
                </select>
              </div>

              {editingId && (
                <div>
                  <label className="text-sm dark:text-gray-300">Status</label>
                  <select value={form.status} onChange={e => setForm({...form, status: e.target.value})}
                    className="w-full p-2 border dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg">
                    {["Pending","Completed"].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              )}

              <button onClick={handleSave}
                className="w-full bg-gold hover:bg-yellow-500 text-navy font-bold py-3 rounded-lg mt-2 flex items-center justify-center gap-2">
                {editingId ? <><Save size={18} /> Update Order</> : <><Plus size={18} /> Save Order</>}
              </button>
            </div>
          </div>
        </div>
      )}
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