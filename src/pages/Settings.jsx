import { useEffect, useState } from "react";
import { collection, doc, setDoc, getDoc, onSnapshot } from "firebase/firestore";
import { db, auth } from "../firebase";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Store, DollarSign, User, Palette, MessageCircle,
  FileSpreadsheet, Save, Plus, Trash2, CheckCircle, AlertCircle,
  Sun, Moon, Download, Upload, Shield, Lock, Phone, MapPin,
  Mail, Globe, X, Edit
} from "lucide-react";

export default function Settings() {
  const [activeTab, setActiveTab] = useState("shop");
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Shop Info
  const [shop, setShop] = useState({
    name: "FUTURE X DESIGN",
    phone: "",
    email: "",
    address: "",
    tagline: "Frame & Print Shop"
  });

  // Price List
  const [prices, setPrices] = useState([]);
  const [newPrice, setNewPrice] = useState({ size: "", price: "" });

  // Users
  const [users, setUsers] = useState([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [newUser, setNewUser] = useState({ email: "", role: "cashier", name: "" });

  // Theme
  const [dark, setDark] = useState(() => localStorage.getItem("dark") === "true");

  // Integrations
  const [whatsappKey, setWhatsappKey] = useState(() => localStorage.getItem("wa_key") || "");
  const [sheetUrl, setSheetUrl] = useState(() => localStorage.getItem("sheet_url") || "");

  const showStatus = (type, msg) => {
    setStatus({ type, msg });
    setTimeout(() => setStatus(null), 4000);
  };

  // Load settings from Firestore
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const shopSnap = await getDoc(doc(db, "settings", "shop"));
        if (shopSnap.exists()) setShop(shopSnap.data());

        const pricesSnap = await getDoc(doc(db, "settings", "prices"));
        if (pricesSnap.exists()) setPrices(pricesSnap.data().list || []);
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    loadSettings();

    // Users realtime
    const unsub = onSnapshot(collection(db, "users"), (snap) => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  // Save Shop
  const saveShop = async () => {
    try {
      await setDoc(doc(db, "settings", "shop"), shop);
      showStatus("success", "Shop info saved!");
    } catch (err) {
      showStatus("error", err.message);
    }
  };

  // Save Prices
  const savePrices = async (updatedPrices) => {
    try {
      await setDoc(doc(db, "settings", "prices"), { list: updatedPrices });
    } catch (err) {
      showStatus("error", err.message);
    }
  };

  const addPrice = () => {
    if (!newPrice.size || !newPrice.price) return alert("Fill both fields!");
    const updated = [...prices, { ...newPrice, id: Date.now() }];
    setPrices(updated);
    savePrices(updated);
    setNewPrice({ size: "", price: "" });
    showStatus("success", "Price added!");
  };

  const deletePrice = (id) => {
    const updated = prices.filter(p => p.id !== id);
    setPrices(updated);
    savePrices(updated);
  };

  // Theme
  const toggleTheme = (isDark) => {
    setDark(isDark);
    localStorage.setItem("dark", isDark);
    showStatus("success", `Theme: ${isDark ? "Dark" : "Light"}`);
  };

  // Save Integrations
  const saveIntegrations = () => {
    localStorage.setItem("wa_key", whatsappKey);
    localStorage.setItem("sheet_url", sheetUrl);
    showStatus("success", "Integrations saved!");
  };

  // Add User
  const addUser = async () => {
    if (!newUser.email || !newUser.name) return alert("Email and Name required!");
    try {
      await setDoc(doc(db, "users", newUser.email), {
        ...newUser,
        createdAt: new Date().toISOString()
      });
      setShowUserModal(false);
      setNewUser({ email: "", role: "cashier", name: "" });
      showStatus("success", "User added!");
    } catch (err) {
      showStatus("error", err.message);
    }
  };

  // Delete User
  const deleteUser = async (id) => {
    if (confirm("Delete this user?")) {
      const { deleteDoc } = await import("firebase/firestore");
      await deleteDoc(doc(db, "users", id));
      showStatus("success", "User deleted!");
    }
  };

  // Backup
  const backup = async () => {
    try {
      const { collection: col, getDocs } = await import("firebase/firestore");
      const ordersSnap = await getDocs(col(db, "orders"));
      const customersSnap = await getDocs(col(db, "customers"));

      const backupData = {
        orders: ordersSnap.docs.map(d => ({ id: d.id, ...d.data() })),
        customers: customersSnap.docs.map(d => ({ id: d.id, ...d.data() })),
        shop,
        prices,
        backedUpAt: new Date().toISOString()
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fxd-backup-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      showStatus("success", `Backup: ${backupData.orders.length} orders, ${backupData.customers.length} customers`);
    } catch (err) {
      showStatus("error", err.message);
    }
  };

  // Restore
  const restore = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (!confirm(`Restore ${data.orders?.length || 0} orders + ${data.customers?.length || 0} customers?`)) return;

        const { doc: d, setDoc: sd } = await import("firebase/firestore");

        for (const order of data.orders || []) {
          const { id, ...rest } = order;
          await sd(d(db, "orders", id), rest);
        }
        for (const customer of data.customers || []) {
          const { id, ...rest } = customer;
          await sd(d(db, "customers", id), rest);
        }
        if (data.shop) await sd(d(db, "settings", "shop"), data.shop);
        if (data.prices) await sd(d(db, "settings", "prices"), { list: data.prices });

        showStatus("success", "Restore complete! Refresh the page.");
      } catch (err) {
        showStatus("error", "Invalid backup file!");
      }
    };
    reader.readAsText(file);
  };

  const tabs = [
    { id: "shop", label: "Shop Info", icon: Store },
    { id: "prices", label: "Price List", icon: DollarSign },
    { id: "users", label: "Users", icon: User },
    { id: "theme", label: "Theme", icon: Palette },
    { id: "integrations", label: "Integrations", icon: Globe },
    { id: "backup", label: "Backup", icon: Download },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <p className="text-gray-500">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-navy text-white p-6 flex items-center gap-4">
        <button onClick={() => navigate("/dashboard")} className="p-2 hover:bg-white/10 rounded-lg">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gold">⚙️ Settings</h1>
          <p className="text-gray-400 text-sm">Configure your OMS</p>
        </div>
      </div>

      <div className="p-8 max-w-6xl mx-auto">
        {/* Status */}
        {status && (
          <div className={`mb-6 p-4 rounded-xl flex items-center gap-2 border ${
            status.type === "success"
              ? "bg-green-500/10 border-green-500/30 text-green-600"
              : "bg-red-500/10 border-red-500/30 text-red-500"
          }`}>
            {status.type === "success" ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
            {status.msg}
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-2 shadow-lg mb-6 flex gap-1 overflow-x-auto">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm whitespace-nowrap transition ${
                activeTab === t.id
                  ? "bg-gold text-navy"
                  : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
            >
              <t.icon size={16} /> {t.label}
            </button>
          ))}
        </div>

        {/* ===== SHOP INFO ===== */}
        {activeTab === "shop" && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-lg">
            <h3 className="text-xl font-bold dark:text-white mb-6 flex items-center gap-2">
              <Store className="text-gold" size={22} /> Shop Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field icon={Store} label="Shop Name" value={shop.name}
                onChange={v => setShop({...shop, name: v})} />
              <Field icon={Phone} label="Phone" value={shop.phone}
                onChange={v => setShop({...shop, phone: v})} />
              <Field icon={Mail} label="Email" value={shop.email}
                onChange={v => setShop({...shop, email: v})} />
              <Field icon={Globe} label="Tagline" value={shop.tagline}
                onChange={v => setShop({...shop, tagline: v})} />
              <div className="md:col-span-2">
                <Field icon={MapPin} label="Address" value={shop.address}
                  onChange={v => setShop({...shop, address: v})} />
              </div>
            </div>
            <button onClick={saveShop}
              className="mt-6 bg-gold hover:bg-yellow-500 text-navy font-bold px-6 py-3 rounded-lg flex items-center gap-2">
              <Save size={18} /> Save Shop Info
            </button>
          </div>
        )}

        {/* ===== PRICE LIST ===== */}
        {activeTab === "prices" && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-lg">
            <h3 className="text-xl font-bold dark:text-white mb-6 flex items-center gap-2">
              <DollarSign className="text-gold" size={22} /> Price List
            </h3>

            <div className="flex gap-2 mb-6">
              <input
                placeholder="Size (ex: 12x18)"
                value={newPrice.size}
                onChange={(e) => setNewPrice({...newPrice, size: e.target.value})}
                className="flex-1 p-3 border dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg"
              />
              <input
                placeholder="Price (Rs.)"
                type="number"
                value={newPrice.price}
                onChange={(e) => setNewPrice({...newPrice, price: e.target.value})}
                className="flex-1 p-3 border dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg"
              />
              <button onClick={addPrice}
                className="bg-gold hover:bg-yellow-500 text-navy font-bold px-5 rounded-lg flex items-center gap-2">
                <Plus size={18} /> Add
              </button>
            </div>

            {prices.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No prices yet. Add your first size!</p>
            ) : (
              <div className="space-y-2">
                {prices.map(p => (
                  <div key={p.id} className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div>
                      <p className="font-bold dark:text-white">{p.size}</p>
                      <p className="text-sm text-gray-500">Rs. {p.price}</p>
                    </div>
                    <button onClick={() => deletePrice(p.id)}
                      className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===== USERS ===== */}
        {activeTab === "users" && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-lg">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold dark:text-white flex items-center gap-2">
                <User className="text-gold" size={22} /> Users ({users.length})
              </h3>
              <button onClick={() => setShowUserModal(true)}
                className="bg-gold hover:bg-yellow-500 text-navy font-bold px-5 py-2.5 rounded-lg flex items-center gap-2">
                <Plus size={18} /> Add User
              </button>
            </div>

            <div className="bg-gold/10 border border-gold/30 text-gold text-sm p-3 rounded-lg mb-4">
              💡 Users add කරන්න Firebase Authentication එකෙනුත් කරන්න ඕන. මෙතන only roles track කරයි.
            </div>

            {users.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No users added yet</p>
            ) : (
              <div className="space-y-2">
                {users.map(u => (
                  <div key={u.id} className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gold text-navy flex items-center justify-center font-bold">
                        {(u.name || "?").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold dark:text-white">{u.name}</p>
                        <p className="text-sm text-gray-500">{u.email}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs ${
                        u.role === "admin"
                          ? "bg-gold/20 text-gold"
                          : "bg-blue-500/20 text-blue-500"
                      }`}>
                        {u.role === "admin" ? "👑 Admin" : "💰 Cashier"}
                      </span>
                    </div>
                    <button onClick={() => deleteUser(u.id)}
                      className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===== THEME ===== */}
        {activeTab === "theme" && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-lg">
            <h3 className="text-xl font-bold dark:text-white mb-6 flex items-center gap-2">
              <Palette className="text-gold" size={22} /> Theme
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => toggleTheme(false)}
                className={`p-6 rounded-2xl border-2 transition ${
                  !dark ? "border-gold bg-gold/5" : "border-gray-200 dark:border-gray-700"
                }`}
              >
                <div className="bg-white rounded-lg p-4 mb-3 shadow">
                  <div className="h-3 bg-gold rounded w-1/2 mb-2"></div>
                  <div className="h-2 bg-gray-200 rounded w-3/4"></div>
                </div>
                <p className="font-bold flex items-center justify-center gap-2 dark:text-white">
                  <Sun size={18} /> Light
                </p>
              </button>

              <button
                onClick={() => toggleTheme(true)}
                className={`p-6 rounded-2xl border-2 transition ${
                  dark ? "border-gold bg-gold/5" : "border-gray-200 dark:border-gray-700"
                }`}
              >
                <div className="bg-gray-900 rounded-lg p-4 mb-3 shadow">
                  <div className="h-3 bg-gold rounded w-1/2 mb-2"></div>
                  <div className="h-2 bg-gray-700 rounded w-3/4"></div>
                </div>
                <p className="font-bold flex items-center justify-center gap-2 dark:text-white">
                  <Moon size={18} /> Dark
                </p>
              </button>
            </div>

            <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <h4 className="font-bold dark:text-white mb-3">Color Preview</h4>
              <div className="flex gap-2">
                {["#0F172A", "#F59E0B", "#10B981", "#F97316", "#EF4444"].map(c => (
                  <div key={c} className="flex-1">
                    <div className="h-12 rounded-lg" style={{ background: c }}></div>
                    <p className="text-xs text-center mt-1 dark:text-gray-400">{c}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===== INTEGRATIONS ===== */}
        {activeTab === "integrations" && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-lg">
            <h3 className="text-xl font-bold dark:text-white mb-6 flex items-center gap-2">
              <Globe className="text-gold" size={22} /> Integrations
            </h3>

            <div className="space-y-6">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium dark:text-gray-300 mb-2">
                  <MessageCircle size={16} className="text-green-600" /> WhatsApp API Key
                </label>
                <input
                  value={whatsappKey}
                  onChange={(e) => setWhatsappKey(e.target.value)}
                  placeholder="Twilio / Meta API key"
                  className="w-full p-3 border dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg"
                />
                <p className="text-xs text-gray-400 mt-1">Optional — wa.me links are free</p>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium dark:text-gray-300 mb-2">
                  <FileSpreadsheet size={16} className="text-green-600" /> Google Apps Script URL
                </label>
                <input
                  value={sheetUrl}
                  onChange={(e) => setSheetUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="w-full p-3 border dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg"
                />
                <p className="text-xs text-gray-400 mt-1">From Google Sheet → Apps Script → Deploy</p>
              </div>

              <button onClick={saveIntegrations}
                className="bg-gold hover:bg-yellow-500 text-navy font-bold px-6 py-3 rounded-lg flex items-center gap-2">
                <Save size={18} /> Save Integrations
              </button>
            </div>
          </div>
        )}

        {/* ===== BACKUP ===== */}
        {activeTab === "backup" && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-lg">
              <h3 className="text-xl font-bold dark:text-white mb-6 flex items-center gap-2">
                <Download className="text-gold" size={22} /> Backup & Restore
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button onClick={backup}
                  className="p-6 bg-gradient-to-br from-green-500 to-green-700 text-white rounded-2xl text-left hover:scale-105 transition">
                  <Download size={28} className="mb-3" />
                  <p className="font-bold text-lg">Backup</p>
                  <p className="text-sm opacity-90">Download all data as JSON</p>
                </button>

                <label className="p-6 bg-gradient-to-br from-blue-500 to-blue-700 text-white rounded-2xl text-left hover:scale-105 transition cursor-pointer">
                  <Upload size={28} className="mb-3" />
                  <p className="font-bold text-lg">Restore</p>
                  <p className="text-sm opacity-90">Upload JSON backup</p>
                  <input type="file" accept=".json" onChange={restore} className="hidden" />
                </label>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-lg border-2 border-red-500/30">
              <h3 className="text-xl font-bold text-red-500 mb-4 flex items-center gap-2">
                <Shield size={22} /> Danger Zone
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                මේ actions undo කරන්න බෑ. ප්‍රවේශමෙන් කරන්න.
              </p>
              <button
                onClick={() => {
                  if (confirm("DELETE ALL ORDERS? This cannot be undone!") &&
                      confirm("Are you ABSOLUTELY sure?")) {
                    alert("Safety lock: This feature is disabled. Contact developer.");
                  }
                }}
                className="bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold px-6 py-3 rounded-lg flex items-center gap-2 border border-red-500/30">
                <Lock size={18} /> Delete All Data
              </button>
            </div>
          </div>
        )}
      </div>

      {/* User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md">
            <div className="flex justify-between mb-4">
              <h3 className="text-xl font-bold dark:text-white">Add User</h3>
              <button onClick={() => setShowUserModal(false)}><X className="dark:text-white" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm dark:text-gray-300">Name</label>
                <input value={newUser.name}
                  onChange={e => setNewUser({...newUser, name: e.target.value})}
                  className="w-full p-2 border dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg" />
              </div>
              <div>
                <label className="text-sm dark:text-gray-300">Email</label>
                <input type="email" value={newUser.email}
                  onChange={e => setNewUser({...newUser, email: e.target.value})}
                  className="w-full p-2 border dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg" />
              </div>
              <div>
                <label className="text-sm dark:text-gray-300">Role</label>
                <select value={newUser.role}
                  onChange={e => setNewUser({...newUser, role: e.target.value})}
                  className="w-full p-2 border dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg">
                  <option value="cashier">💰 Cashier</option>
                  <option value="admin">👑 Admin</option>
                </select>
              </div>
              <button onClick={addUser}
                className="w-full bg-gold hover:bg-yellow-500 text-navy font-bold py-3 rounded-lg">
                Add User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ icon: Icon, label, value, onChange, type = "text" }) {
  return (
    <div>
      <label className="flex items-center gap-2 text-sm font-medium dark:text-gray-300 mb-1.5">
        {Icon && <Icon size={14} className="text-gold" />} {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full p-3 border dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg"
      />
    </div>
  );
}