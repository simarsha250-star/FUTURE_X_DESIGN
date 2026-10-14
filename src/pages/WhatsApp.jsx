import { useEffect, useState } from "react";
import { collection, onSnapshot, addDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebase";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, MessageCircle, Send, Plus, Trash2, X,
  Users, Clock, CheckCircle, Search, Phone, Copy
} from "lucide-react";

const DEFAULT_TEMPLATES = [
  {
    id: "t1",
    name: "Order Created",
    text: "ඔබේ order එක ලැබුණා ✅\nID: {orderId}\nDue Date: {dueDate}\nFUTURE X DESIGN 🎨"
  },
  {
    id: "t2",
    name: "Order Complete",
    text: "ඔබේ order එක සූදානම්! 🎉\nID: {orderId}\nFUTURE X DESIGN එකට ස්තූතියි 🙏"
  },
  {
    id: "t3",
    name: "Due Reminder",
    text: "හෙට ඔබේ order එකේ due date! ⏰\nID: {orderId}\nFUTURE X DESIGN 🎨"
  },
  {
    id: "t4",
    name: "Payment Reminder",
    text: "ඔබේ order එකට balance Rs. {balance} ගෙවන්න ඕන 🙏\nID: {orderId}\nFUTURE X DESIGN 🎨"
  },
  {
    id: "t5",
    name: "Thank You",
    text: "FUTURE X DESIGN එකෙන් ස්තූතියි! 🙏\nආයෙම එන්න 🎨"
  }
];

export default function WhatsApp() {
  const [orders, setOrders] = useState([]);
  const [templates, setTemplates] = useState(() => {
    const saved = localStorage.getItem("wa_templates");
    return saved ? JSON.parse(saved) : DEFAULT_TEMPLATES;
  });
  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem("wa_history");
    return saved ? JSON.parse(saved) : [];
  });
  const [search, setSearch] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState(DEFAULT_TEMPLATES[0]);
  const [customMsg, setCustomMsg] = useState("");
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [bulkMode, setBulkMode] = useState(false);
  const [newTemplate, setNewTemplate] = useState({ name: "", text: "" });
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "orders"), (snap) => {
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  // LocalStorage sync
  useEffect(() => {
    localStorage.setItem("wa_templates", JSON.stringify(templates));
  }, [templates]);

  useEffect(() => {
    localStorage.setItem("wa_history", JSON.stringify(history));
  }, [history]);

  // Template variables replace
  const fillTemplate = (template, order) => {
    if (!order) return template;
    return template
      .replace(/{orderId}/g, order.orderId || "")
      .replace(/{customer}/g, order.customer || "")
      .replace(/{dueDate}/g, order.dueDate || "")
      .replace(/{balance}/g, order.balance || "")
      .replace(/{total}/g, order.total || "")
      .replace(/{size}/g, order.size || "");
  };

  const sendWhatsApp = (order, message) => {
    if (!order.phone) return alert("No phone number!");
    const phone = order.phone.replace(/\D/g, "");
    const finalMsg = message || fillTemplate(selectedTemplate.text, order);
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(finalMsg)}`;
    window.open(url, "_blank");

    // Save to history
    setHistory(prev => [{
      id: Date.now(),
      customer: order.customer,
      phone: order.phone,
      orderId: order.orderId,
      message: finalMsg,
      sentAt: new Date().toISOString()
    }, ...prev].slice(0, 50));
  };

  const sendBulk = () => {
    if (selectedOrders.length === 0) return alert("Select at least one order!");
    const selected = orders.filter(o => selectedOrders.includes(o.id));
    if (!confirm(`Send WhatsApp to ${selected.length} customers?`)) return;

    selected.forEach((o, i) => {
      setTimeout(() => sendWhatsApp(o, fillTemplate(selectedTemplate.text, o)), i * 1500);
    });

    setSelectedOrders([]);
    setBulkMode(false);
  };

  const addTemplate = () => {
    if (!newTemplate.name || !newTemplate.text) return alert("Fill both fields!");
    setTemplates(prev => [...prev, { ...newTemplate, id: "t" + Date.now() }]);
    setNewTemplate({ name: "", text: "" });
  };

  const deleteTemplate = (id) => {
    if (confirm("Delete this template?")) {
      setTemplates(prev => prev.filter(t => t.id !== id));
    }
  };

  const filteredOrders = orders.filter(o =>
    (o.customer || "").toLowerCase().includes(search.toLowerCase()) ||
    (o.orderId || "").toLowerCase().includes(search.toLowerCase()) ||
    (o.phone || "").includes(search)
  );

  const toggleOrder = (id) => {
    setSelectedOrders(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
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
            <h1 className="text-2xl font-bold text-gold">💬 WhatsApp Center</h1>
            <p className="text-gray-400 text-sm">Send messages to customers</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setBulkMode(!bulkMode)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-bold ${bulkMode ? "bg-gold text-navy" : "bg-white/10 text-white"}`}
          >
            <Users size={18} /> {bulkMode ? "Bulk Mode ON" : "Bulk Send"}
          </button>
        </div>
      </div>

      <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT — Templates */}
        <div className="lg:col-span-1 space-y-6">
          {/* Selected Template */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold dark:text-white flex items-center gap-2">
                <MessageCircle size={18} className="text-gold" /> Templates
              </h3>
              <button
                onClick={() => setShowTemplateModal(true)}
                className="text-gold text-sm font-medium flex items-center gap-1"
              >
                <Plus size={14} /> New
              </button>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto">
              {templates.map(t => (
                <div
                  key={t.id}
                  onClick={() => { setSelectedTemplate(t); setCustomMsg(""); }}
                  className={`p-3 rounded-lg cursor-pointer border-2 transition ${
                    selectedTemplate.id === t.id
                      ? "border-gold bg-gold/10"
                      : "border-transparent bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <p className="font-semibold dark:text-white text-sm">{t.name}</p>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteTemplate(t.id); }}
                      className="text-red-400 hover:text-red-500"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{t.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Custom Message */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-lg">
            <h3 className="font-bold dark:text-white mb-3">Custom Message</h3>
            <textarea
              value={customMsg}
              onChange={(e) => setCustomMsg(e.target.value)}
              placeholder="Type your own message..."
              rows="4"
              className="w-full p-3 bg-gray-50 dark:bg-gray-800 border dark:border-gray-700 rounded-lg dark:text-white text-sm"
            />
            <p className="text-xs text-gray-400 mt-2">
              💡 Variables: {"{orderId} {customer} {dueDate} {balance}"}
            </p>
          </div>

          {/* History */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-lg">
            <h3 className="font-bold dark:text-white mb-3 flex items-center gap-2">
              <Clock size={16} className="text-gold" /> Recent ({history.length})
            </h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {history.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No messages yet</p>
              ) : (
                history.slice(0, 10).map(h => (
                  <div key={h.id} className="p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex justify-between">
                      <p className="text-sm font-semibold dark:text-white">{h.customer}</p>
                      <CheckCircle size={12} className="text-green-500" />
                    </div>
                    <p className="text-xs text-gray-500 truncate">{h.message}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* RIGHT — Orders */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold dark:text-white">
                {bulkMode ? `Selected: ${selectedOrders.length}` : "Send to Order"}
              </h3>
              {bulkMode && selectedOrders.length > 0 && (
                <button
                  onClick={sendBulk}
                  className="bg-green-500 hover:bg-green-600 text-white font-bold px-4 py-2 rounded-lg flex items-center gap-2"
                >
                  <Send size={16} /> Send All ({selectedOrders.length})
                </button>
              )}
            </div>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-3 text-gray-400" size={18} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search orders..."
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border dark:border-gray-700 rounded-lg dark:text-white"
              />
            </div>

            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {filteredOrders.length === 0 ? (
                <p className="text-center text-gray-400 py-10">No orders found</p>
              ) : (
                filteredOrders.map(o => (
                  <div
                    key={o.id}
                    className={`border-2 rounded-xl p-4 transition ${
                      selectedOrders.includes(o.id)
                        ? "border-gold bg-gold/5"
                        : "border-gray-100 dark:border-gray-800"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-start gap-3">
                        {bulkMode && (
                          <input
                            type="checkbox"
                            checked={selectedOrders.includes(o.id)}
                            onChange={() => toggleOrder(o.id)}
                            className="mt-1 w-4 h-4 accent-gold"
                          />
                        )}
                        <div>
                          <p className="font-mono text-gold text-sm">{o.orderId}</p>
                          <p className="font-bold dark:text-white">{o.customer}</p>
                          <p className="text-sm text-gray-500 flex items-center gap-1">
                            <Phone size={12} /> {o.phone || "No phone"}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {o.size} | Due: {o.dueDate} | Balance: Rs. {o.balance}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        {!bulkMode && (
                          <button
                            onClick={() => sendWhatsApp(o, customMsg || null)}
                            disabled={!o.phone}
                            className="flex items-center gap-2 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white text-sm font-medium px-3 py-1.5 rounded-lg"
                          >
                            <Send size={14} /> Send
                          </button>
                        )}
                        {o.phone && (
                          <button
                            onClick={() => navigator.clipboard.writeText(o.phone)}
                            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gold"
                          >
                            <Copy size={12} /> Copy
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Preview */}
                    {!bulkMode && (
                      <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <p className="text-xs text-gray-400 mb-1">Preview:</p>
                        <p className="text-sm dark:text-gray-300 whitespace-pre-line">
                          {customMsg || fillTemplate(selectedTemplate.text, o)}
                        </p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md">
            <div className="flex justify-between mb-4">
              <h3 className="text-xl font-bold dark:text-white">New Template</h3>
              <button onClick={() => setShowTemplateModal(false)}><X className="dark:text-white" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm dark:text-gray-300">Template Name</label>
                <input
                  value={newTemplate.name}
                  onChange={e => setNewTemplate({...newTemplate, name: e.target.value})}
                  className="w-full p-2 border dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg"
                />
              </div>
              <div>
                <label className="text-sm dark:text-gray-300">Message</label>
                <textarea
                  value={newTemplate.text}
                  onChange={e => setNewTemplate({...newTemplate, text: e.target.value})}
                  rows="4"
                  className="w-full p-2 border dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg"
                />
              </div>
              <p className="text-xs text-gray-400">
                Variables: {"{orderId} {customer} {dueDate} {balance} {total} {size}"}
              </p>
              <button
                onClick={addTemplate}
                className="w-full bg-gold hover:bg-yellow-500 text-navy font-bold py-3 rounded-lg"
              >
                Add Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}