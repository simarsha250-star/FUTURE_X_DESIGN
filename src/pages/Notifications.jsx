import { useEffect, useState } from "react";
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, query, orderBy, where, writeBatch
} from "firebase/firestore";
import { db, auth } from "../firebase";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Bell, BellOff, CheckCircle, Trash2, AlertTriangle,
  Clock, Info, Check, CheckCheck, Filter, Moon
} from "lucide-react";

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState("all"); // all | unread | due | overdue
  const [permission, setPermission] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );
  const navigate = useNavigate();

  // ===== Fetch Notifications =====
  useEffect(() => {
    const q = query(collection(db, "notifications"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  // ===== Fetch Orders (for auto-generating) =====
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "orders"), (snap) => {
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  // ===== Request Browser Permission =====
  const requestPermission = async () => {
    if (typeof Notification === "undefined") return alert("Browser doesn't support!");
    const perm = await Notification.requestPermission();
    setPermission(perm);
    if (perm === "granted") {
      showBrowserNotification("FUTURE X DESIGN", "Notifications enabled! 🎉");
    }
  };

  const showBrowserNotification = (title, body) => {
    if (Notification.permission === "granted") {
      new Notification(title, { body, icon: "/favicon.ico" });
    }
  };

  // ===== Create Notification =====
  const createNotification = async (type, title, message, link = null) => {
    try {
      await addDoc(collection(db, "notifications"), {
        type, // info | warning | danger | success
        title,
        message,
        link,
        read: false,
        user: auth.currentUser?.email || "system",
        createdAt: new Date().toISOString()
      });
      showBrowserNotification(title, message);
    } catch (err) {
      console.error(err);
    }
  };

  // ===== AUTO GENERATE from Orders =====
  useEffect(() => {
    if (orders.length === 0 || notifications.length === -1) return;

    const today = new Date().toISOString().split("T")[0];

    const checkAndGenerate = async () => {
      // Due today
      const dueToday = orders.filter(o =>
        o.dueDate === today && o.status !== "Completed"
      );

      // Overdue
      const overdue = orders.filter(o =>
        o.dueDate && o.dueDate < today && o.status !== "Completed"
      );

      // Avoid duplicate — check if already created for today
      const existingTitles = notifications
        .filter(n => n.createdAt?.startsWith(today))
        .map(n => n.title);

      for (const o of dueToday) {
        const title = `Due Today: ${o.orderId}`;
        if (!existingTitles.includes(title)) {
          await createNotification(
            "warning",
            title,
            `${o.customer} - ${o.size} (Rs. ${o.balance})`,
            "/orders"
          );
        }
      }

      for (const o of overdue) {
        const title = `Overdue: ${o.orderId}`;
        if (!existingTitles.includes(title)) {
          await createNotification(
            "danger",
            title,
            `${o.customer} - Due was ${o.dueDate}`,
            "/orders"
          );
        }
      }
    };

    checkAndGenerate();
  }, [orders]);

  // ===== Mark as Read =====
  const markRead = async (id) => {
    await updateDoc(doc(db, "notifications", id), { read: true });
  };

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.read);
    if (unread.length === 0) return alert("All caught up! ✅");
    const batch = writeBatch(db);
    unread.forEach(n => {
      batch.update(doc(db, "notifications", n.id), { read: true });
    });
    await batch.commit();
  };

  // ===== Delete =====
  const deleteOne = async (id) => {
    await deleteDoc(doc(db, "notifications", id));
  };

  const clearAll = async () => {
    if (!confirm("Delete all notifications?")) return;
    const batch = writeBatch(db);
    notifications.forEach(n => {
      batch.delete(doc(db, "notifications", n.id));
    });
    await batch.commit();
  };

  // ===== Filter =====
  const filtered = notifications.filter(n => {
    if (filter === "unread") return !n.read;
    if (filter === "due") return n.type === "warning";
    if (filter === "overdue") return n.type === "danger";
    return true;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  // ===== Test Notification =====
  const sendTest = () => {
    createNotification(
      "info",
      "Test Notification",
      "This is a test notification from FUTURE X DESIGN OMS 🎉",
      "/dashboard"
    );
  };

  const typeStyles = {
    info: { bg: "bg-blue-500/10", border: "border-blue-500/30", color: "text-blue-500", icon: Info },
    warning: { bg: "bg-orange-500/10", border: "border-orange-500/30", color: "text-orange-500", icon: AlertTriangle },
    danger: { bg: "bg-red-500/10", border: "border-red-500/30", color: "text-red-500", icon: AlertTriangle },
    success: { bg: "bg-green-500/10", border: "border-green-500/30", color: "text-green-500", icon: CheckCircle },
  };

  const timeAgo = (iso) => {
    if (!iso) return "";
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
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
            <h1 className="text-2xl font-bold text-gold flex items-center gap-2">
              🔔 Notifications
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-sm px-2 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </h1>
            <p className="text-gray-400 text-sm">Stay updated with your shop</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={sendTest}
            className="bg-white/10 hover:bg-white/20 text-white font-medium px-4 py-2.5 rounded-lg text-sm"
          >
            🧪 Test
          </button>
          <button
            onClick={markAllRead}
            className="bg-white/10 hover:bg-white/20 text-white font-medium px-4 py-2.5 rounded-lg text-sm flex items-center gap-2"
          >
            <CheckCheck size={16} /> Read All
          </button>
          <button
            onClick={clearAll}
            className="bg-red-500/20 hover:bg-red-500/30 text-red-400 font-medium px-4 py-2.5 rounded-lg text-sm flex items-center gap-2"
          >
            <Trash2 size={16} /> Clear
          </button>
        </div>
      </div>

      <div className="p-8 max-w-4xl mx-auto">
        {/* Permission Banner */}
        {permission !== "granted" && (
          <div className="bg-gold/10 border border-gold/30 rounded-2xl p-4 mb-6 flex items-center gap-3">
            <Bell className="text-gold flex-shrink-0" size={24} />
            <div className="flex-1">
              <p className="font-bold text-gold">Enable Browser Notifications</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Desktop alerts ලබාගන්න permission දෙන්න
              </p>
            </div>
            <button
              onClick={requestPermission}
              className="bg-gold hover:bg-yellow-500 text-navy font-bold px-5 py-2.5 rounded-lg"
            >
              Enable
            </button>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-2 shadow-lg mb-6 flex gap-1 overflow-x-auto">
          {[
            { id: "all", label: "All", count: notifications.length },
            { id: "unread", label: "Unread", count: unreadCount },
            { id: "due", label: "Due Today", count: notifications.filter(n => n.type === "warning").length },
            { id: "overdue", label: "Overdue", count: notifications.filter(n => n.type === "danger").length },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setFilter(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm whitespace-nowrap transition ${
                filter === t.id
                  ? "bg-gold text-navy"
                  : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
            >
              {t.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                filter === t.id ? "bg-navy/20" : "bg-gray-100 dark:bg-gray-800"
              }`}>
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {/* Notifications List */}
        {filtered.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-12 text-center shadow-lg">
            <BellOff className="mx-auto text-gray-300 mb-4" size={48} />
            <p className="text-gray-400 font-medium">No notifications</p>
            <p className="text-sm text-gray-400 mt-1">
              {filter === "all" ? "You're all caught up! 🎉" : "Try different filter"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(n => {
              const style = typeStyles[n.type] || typeStyles.info;
              const Icon = style.icon;
              return (
                <div
                  key={n.id}
                  className={`bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-lg border-l-4 transition ${
                    n.read ? "border-gray-200 dark:border-gray-800 opacity-70" : "border-gold"
                  }`}
                >
                  <div className="flex gap-4">
                    <div className={`w-10 h-10 rounded-xl ${style.bg} flex items-center justify-center flex-shrink-0`}>
                      <Icon className={style.color} size={20} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1">
                          <h3 className={`font-bold ${n.read ? "text-gray-500 dark:text-gray-400" : "dark:text-white"}`}>
                            {n.title}
                            {!n.read && (
                              <span className="ml-2 inline-block w-2 h-2 bg-gold rounded-full"></span>
                            )}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{n.message}</p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                            <span className="flex items-center gap-1">
                              <Clock size={12} /> {timeAgo(n.createdAt)}
                            </span>
                            {n.user && <span>👤 {n.user.split("@")[0]}</span>}
                          </div>
                        </div>

                        <div className="flex gap-1 flex-shrink-0">
                          {!n.read && (
                            <button
                              onClick={() => markRead(n.id)}
                              title="Mark as read"
                              className="p-2 hover:bg-green-500/10 text-green-500 rounded-lg"
                            >
                              <Check size={16} />
                            </button>
                          )}
                          <button
                            onClick={() => deleteOne(n.id)}
                            title="Delete"
                            className="p-2 hover:bg-red-500/10 text-red-500 rounded-lg"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      {n.link && (
                        <button
                          onClick={() => navigate(n.link)}
                          className="text-xs text-gold font-medium mt-3 hover:underline"
                        >
                          Open →
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}