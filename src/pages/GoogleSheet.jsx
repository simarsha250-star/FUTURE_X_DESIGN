import { useEffect, useState } from "react";
import { collection, onSnapshot, addDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, FileSpreadsheet, RefreshCw, CheckCircle,
  AlertCircle, Download, Upload, Link as LinkIcon,
  Save, ExternalLink, Clock
} from "lucide-react";

export default function GoogleSheet() {
  const [orders, setOrders] = useState([]);
  const [scriptUrl, setScriptUrl] = useState(
    () => localStorage.getItem("sheet_url") || ""
  );
  const [urlInput, setUrlInput] = useState(scriptUrl);
  const [syncing, setSyncing] = useState(false);
  const [syncingId, setSyncingId] = useState(null);
  const [status, setStatus] = useState(null); // { type: "success"|"error", msg }
  const [lastSync, setLastSync] = useState(
    () => localStorage.getItem("sheet_last_sync") || null
  );
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "orders"), (snap) => {
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const showStatus = (type, msg) => {
    setStatus({ type, msg });
    setTimeout(() => setStatus(null), 4000);
  };

  // ===== SAVE URL =====
  const saveUrl = () => {
    if (!urlInput.startsWith("https://script.google.com/")) {
      return showStatus("error", "Invalid Apps Script URL!");
    }
    localStorage.setItem("sheet_url", urlInput);
    setScriptUrl(urlInput);
    showStatus("success", "URL saved successfully!");
  };

  // ===== SYNC ONE ORDER =====
  const syncOne = async (order) => {
    if (!scriptUrl) return showStatus("error", "Set Apps Script URL first!");
    setSyncingId(order.id);
    try {
      const res = await fetch(scriptUrl, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(order)
      });
      showStatus("success", `${order.orderId} synced!`);
    } catch (err) {
      showStatus("error", `Failed: ${err.message}`);
    }
    setSyncingId(null);
  };

  // ===== SYNC ALL =====
  const syncAll = async () => {
    if (!scriptUrl) return showStatus("error", "Set Apps Script URL first!");
    if (orders.length === 0) return showStatus("error", "No orders to sync!");
    if (!confirm(`Sync ${orders.length} orders to Google Sheet?`)) return;

    setSyncing(true);
    let success = 0;
    let failed = 0;

    for (const order of orders) {
      try {
        await fetch(scriptUrl, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(order)
        });
        success++;
      } catch (err) {
        failed++;
      }
      // Rate limit
      await new Promise(r => setTimeout(r, 300));
    }

    const now = new Date().toLocaleString();
    localStorage.setItem("sheet_last_sync", now);
    setLastSync(now);
    setSyncing(false);
    showStatus("success", `✅ ${success} synced, ❌ ${failed} failed`);
  };

  // ===== EXPORT CSV =====
  const exportCSV = () => {
    if (orders.length === 0) return alert("No orders to export!");
    const headers = ["Order ID", "Customer", "Phone", "Size", "Order Date", "Due Date", "Total", "Advance", "Balance", "Status", "Payment"];
    const rows = orders.map(o => [
      o.orderId, o.customer, o.phone || "", o.size, o.orderDate, o.dueDate,
      o.total, o.advance || 0, o.balance, o.status, o.paymentMethod
    ]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fxd-orders-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    showStatus("success", "CSV downloaded!");
  };

  // ===== IMPORT FROM SHEET =====
  const importFromSheet = async () => {
    if (!scriptUrl) return showStatus("error", "Set Apps Script URL first!");
    if (!confirm("Import orders from Google Sheet? Existing orders will update.")) return;

    setSyncing(true);
    try {
      const res = await fetch(scriptUrl);
      const data = await res.json();

      if (!data.orders || data.orders.length === 0) {
        setSyncing(false);
        return showStatus("error", "No data in sheet!");
      }

      let imported = 0;
      for (const row of data.orders) {
        // Skip if no order ID
        if (!row["Order ID"]) continue;

        // Check if exists in Firestore
        const existing = orders.find(o => o.orderId === row["Order ID"]);

        const orderData = {
          orderId: row["Order ID"],
          customer: row["Customer"],
          phone: String(row["Phone"] || ""),
          size: row["Size"],
          orderDate: row["Order Date"],
          dueDate: row["Due Date"],
          total: Number(row["Total"]) || 0,
          advance: Number(row["Advance"]) || 0,
          balance: Number(row["Balance"]) || 0,
          status: row["Status"] || "Pending",
          paymentMethod: row["Payment"] || "Cash",
          updatedAt: new Date().toISOString()
        };

        if (!existing) {
          await addDoc(collection(db, "orders"), {
            ...orderData,
            createdAt: new Date().toISOString()
          });
          imported++;
        }
      }

      showStatus("success", `✅ Imported ${imported} new orders!`);
    } catch (err) {
      showStatus("error", `Import failed: ${err.message}`);
    }
    setSyncing(false);
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
            <h1 className="text-2xl font-bold text-gold">📗 Google Sheet Sync</h1>
            <p className="text-gray-400 text-sm">Backup orders to spreadsheet</p>
          </div>
        </div>
      </div>

      <div className="p-8 max-w-5xl mx-auto">
        {/* Status Banner */}
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

        {/* Setup Section */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-lg mb-6">
          <h3 className="text-lg font-bold dark:text-white mb-4 flex items-center gap-2">
            <LinkIcon className="text-gold" size={20} /> Setup
          </h3>

          <div className="bg-gold/10 border border-gold/30 rounded-xl p-4 mb-4">
            <p className="text-sm text-gold font-medium mb-2">📋 Step-by-Step:</p>
            <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-1 ml-4 list-decimal">
              <li>අලුත් Google Sheet එකක් හදන්න (sheets.new)</li>
              <li>Extensions → Apps Script open කරන්න</li>
              <li>අපි දුන්න code එක paste කරන්න</li>
              <li>Deploy → New deployment → Web app</li>
              <li>"Who has access" → <b>Anyone</b> select කරන්න</li>
              <li>Deploy කරලා URL එක copy කරන්න</li>
              <li>පහළ paste කරලා Save කරන්න</li>
            </ol>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://script.google.com/macros/s/.../exec"
              className="flex-1 p-3 border dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg text-sm"
            />
            <button
              onClick={saveUrl}
              className="flex items-center gap-2 bg-gold hover:bg-yellow-500 text-navy font-bold px-5 py-3 rounded-lg"
            >
              <Save size={18} /> Save
            </button>
          </div>

          {scriptUrl && (
            <div className="flex items-center gap-2 mt-3 text-sm text-green-600">
              <CheckCircle size={16} /> URL configured
              <a
                href={scriptUrl}
                target="_blank"
                rel="noreferrer"
                className="ml-2 text-gold hover:underline flex items-center gap-1"
              >
                Test URL <ExternalLink size={12} />
              </a>
            </div>
          )}

          {lastSync && (
            <p className="text-xs text-gray-400 mt-3 flex items-center gap-1">
              <Clock size={12} /> Last sync: {lastSync}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <ActionCard
            icon={RefreshCw}
            label="Sync All Orders"
            sub={`${orders.length} orders`}
            onClick={syncAll}
            disabled={syncing || !scriptUrl}
            loading={syncing}
            color="from-gold to-yellow-600"
          />
          <ActionCard
            icon={Download}
            label="Export CSV"
            sub="Download to device"
            onClick={exportCSV}
            disabled={orders.length === 0}
            color="from-blue-500 to-blue-700"
          />
          <ActionCard
            icon={Upload}
            label="Import from Sheet"
            sub="Restore from sheet"
            onClick={importFromSheet}
            disabled={syncing || !scriptUrl}
            color="from-green-500 to-green-700"
          />
        </div>

        {/* Preview Table */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold dark:text-white flex items-center gap-2">
              <FileSpreadsheet className="text-gold" size={20} /> Preview ({orders.length})
            </h3>
          </div>

          {orders.length === 0 ? (
            <p className="text-gray-400 text-center py-10">No orders to preview</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 dark:text-gray-400 border-b dark:border-gray-700">
                    <th className="pb-3">Order ID</th>
                    <th className="pb-3">Customer</th>
                    <th className="pb-3">Size</th>
                    <th className="pb-3">Due Date</th>
                    <th className="pb-3">Balance</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.slice(0, 15).map(o => (
                    <tr key={o.id} className="border-b dark:border-gray-800 text-gray-700 dark:text-gray-300">
                      <td className="py-3 font-mono text-gold">{o.orderId}</td>
                      <td className="py-3">{o.customer}</td>
                      <td className="py-3">{o.size}</td>
                      <td className="py-3">{o.dueDate}</td>
                      <td className="py-3">Rs. {o.balance}</td>
                      <td className="py-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          o.status === "Completed"
                            ? "bg-green-500/20 text-green-600"
                            : "bg-orange-500/20 text-orange-600"
                        }`}>
                          {o.status}
                        </span>
                      </td>
                      <td className="py-3">
                        <button
                          onClick={() => syncOne(o)}
                          disabled={!scriptUrl || syncingId === o.id}
                          className="text-xs bg-gold/20 text-gold px-3 py-1 rounded-lg hover:bg-gold/30 disabled:opacity-50"
                        >
                          {syncingId === o.id ? "..." : "Sync"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {orders.length > 15 && (
                <p className="text-center text-xs text-gray-400 mt-3">
                  Showing 15 of {orders.length}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ActionCard({ icon: Icon, label, sub, onClick, disabled, loading, color }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-lg border border-gray-100 dark:border-gray-800 text-left hover:shadow-xl transition disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-3`}>
        <Icon className={`text-white ${loading ? "animate-spin" : ""}`} size={22} />
      </div>
      <p className="font-bold dark:text-white">{label}</p>
      <p className="text-xs text-gray-500 mt-1">{sub}</p>
    </button>
  );
}