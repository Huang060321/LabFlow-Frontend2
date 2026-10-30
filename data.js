const DB_KEY = "labflow_db_v1";
const initialData = {
  devices: [
    {
      id: 1,
      name: "数字示波器",
      room: "实验楼 A201",
      status: "available",
      description: "用于测量和观察电子信号"
    },
    {
      id: 2,
      name: "直流稳压电源",
      room: "实验楼 A201",
      status: "available",
      description: "为电子实验提供稳定电源"
    },
    {
      id: 3,
      name: "焊台",
      room: "实验楼 B102",
      status: "maintenance",
      description: "用于电子元器件焊接"
    },
    {
      id: 4,
      name: "信号发生器",
      room: "实验楼 A203",
      status: "available",
      description: "用于产生测试信号"
    },
    {
      id: 5,
      name: "数字万用表",
      room: "实验楼 B105",
      status: "available",
      description: "用于测量电压、电流和电阻"
    }
  ],
  reservations: [],
  repairs: []
};
function getData() {
  const saved = localStorage.getItem(DB_KEY);
  if (!saved) {
    localStorage.setItem(DB_KEY, JSON.stringify(initialData));
    return JSON.parse(JSON.stringify(initialData));
  }
  try {
    return JSON.parse(saved);
  } catch (error) {
    alert("数据读取异常，请检查浏览器存储。");
    throw error;
  }
}
function saveData(data) {
  localStorage.setItem(DB_KEY, JSON.stringify(data));
}
function getStatusText(status) {
  const labels = {
    available: "空闲",
    reserved: "已预约",
    maintenance: "维修中",
    pending: "待审核",
    approved: "已通过",
    rejected: "已拒绝",
    cancelled: "已取消",
    processing: "处理中",
    completed: "已完成"
  };
  return labels[status] || status;
}
function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}
function dateKey() {
  const now = new Date();
  const local = new Date(
    now.getTime() - now.getTimezoneOffset() * 60000
  );
  return local.toISOString().slice(0, 10);
}
function makeId() {
  return Date.now() + Math.random().toString(36).slice(2, 8);
}
function getEffectiveStatus(device, data) {
  if (device.status === "maintenance") return "maintenance";
  const now = new Date();
  const inUse = data.reservations.some(r => {
    if (r.deviceId !== device.id || r.status !== "approved") {
      return false;
    }
    const start = new Date(r.date + "T" + r.start);
    const end = new Date(r.date + "T" + r.end);
    return start <= now && now < end;
  });
  return inUse ? "reserved" : "available";
}
