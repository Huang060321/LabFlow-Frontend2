if (sessionStorage.getItem("labflowRole") !== "student") {
  window.location.replace("index.html");
}
const student = sessionStorage.getItem("labflowUser") || "同学";
let selectedDeviceId = null;
document.getElementById("studentName").textContent = student;
document.getElementById("bookDate").min = dateKey();
document.getElementById("bookDate").value = dateKey();
function logout() {
  sessionStorage.removeItem("labflowUser");
  sessionStorage.removeItem("labflowRole");
  location.href = "index.html";
}
function showSection(id) {
  document.querySelectorAll(".page-section").forEach(section => {
    section.classList.add("hidden");
  });
  document.getElementById(id).classList.remove("hidden");
  if (id === "devices") renderDevices();
  if (id === "myBookings") renderBookings();
  if (id === "myRepairs") renderRepairs();
}
function renderDevices() {
  const data = getData();
  const keyword = document.getElementById("searchInput")
    .value.trim().toLowerCase();
  const devices = data.devices.filter(device =>
    device.name.toLowerCase().includes(keyword) ||
    device.room.toLowerCase().includes(keyword)
  );
  document.getElementById("deviceList").innerHTML =
    devices.map(device => {
      const status = getEffectiveStatus(device, data);
      return `
        <div class="device-card">
          <div class="device-icon">🔬</div>
          <h3>${escapeHTML(device.name)}</h3>
          <p>📍 ${escapeHTML(device.room)}</p>
          <span class="status ${status}">
            ${getStatusText(status)}
          </span>
          <button class="primary-btn"
                  onclick="openDevice(${device.id})">
            查看详情
          </button>
        </div>
      `;
    }).join("") || "<p>没有找到相关设备。</p>";
}
function openDevice(id) {
  selectedDeviceId = id;
  const data = getData();
  const device = data.devices.find(item => item.id === id);
  if (!device) return;
  document.getElementById("detailName").textContent = device.name;
  document.getElementById("detailRoom").textContent =
    "📍 " + device.room;
  document.getElementById("detailDescription").textContent =
    device.description;
  document.getElementById("detailStatus").textContent =
    getStatusText(getEffectiveStatus(device, data));
  document.getElementById("repairDescription").value = "";
  document.getElementById("repairPhoto").value = "";
  renderSlots();
  showSection("detail");
}
function getBookingConflict(data, deviceId, date, start, end) {
  return data.reservations.some(r =>
    r.deviceId === deviceId &&
    r.date === date &&
    r.status !== "cancelled" &&
    ["pending", "approved"].includes(r.status) &&
    start < r.end &&
    end > r.start
  );
}
function renderSlots() {
  if (selectedDeviceId === null) return;
  const data = getData();
  const date = document.getElementById("bookDate").value;
  const start = document.getElementById("bookStart").value;
  const end = document.getElementById("bookEnd").value;
  const conflict = getBookingConflict(
    data, selectedDeviceId, date, start, end
  );
  const message = document.getElementById("slotMessage");
  if (!date || start >= end) {
    message.textContent = "请选择正确的开始和结束时间。";
  } else if (conflict) {
    message.textContent = "该时间段已有预约申请，请选择其他时间。";
  } else {
    message.textContent = "该时间段目前可以申请预约。";
  }
}
function submitBooking() {
  const data = getData();
  const device = data.devices.find(d => d.id === selectedDeviceId);
  const date = document.getElementById("bookDate").value;
  const start = document.getElementById("bookStart").value;
  const end = document.getElementById("bookEnd").value;
  if (!device || device.status === "maintenance") {
    alert("设备维修中，暂不可预约！");
    return;
  }
  if (!date || date < dateKey() || start >= end) {
    alert("请选择有效的预约日期和时间！");
    return;
  }
  if (new Date(`${date}T${start}`) <= new Date()) {
    alert("不能预约已经过去的时段！");
    return;
  }
  if (getBookingConflict(data, selectedDeviceId, date, start, end)) {
    alert("预约时间冲突，请重新选择！");
    return;
  }
  data.reservations.push({
    id: makeId(),
    student,
    deviceId: selectedDeviceId,
    deviceName: device.name,
    date,
    start,
    end,
    status: "pending"
  });
  saveData(data);
  alert("预约申请已提交，等待教师审核。");
  showSection("myBookings");
}
function renderBookings() {
  const data = getData();
  const mine = data.reservations.filter(r => r.student === student);
  document.getElementById("bookingList").innerHTML =
    mine.map(r => `
      <div class="record-card">
        <h3>${escapeHTML(r.deviceName)}</h3>
        <p>预约日期：${escapeHTML(r.date)}</p>
        <p>使用时间：${escapeHTML(r.start)} - ${escapeHTML(r.end)}</p>
        <span class="status ${r.status}">
          ${getStatusText(r.status)}
        </span>
        ${["pending", "approved"].includes(r.status) ? `
          <button class="small-btn danger-btn"
                  onclick="cancelBooking('${r.id}')">
            取消预约
          </button>
        ` : ""}
      </div>
    `).join("") || "<p>暂无预约记录。</p>";
}
function cancelBooking(id) {
  const data = getData();
  const booking = data.reservations.find(r => r.id === id);
  if (!booking || booking.student !== student) return;
  if (!["pending", "approved"].includes(booking.status)) {
    alert("当前状态的预约无法取消！");
    return;
  }
  // 已通过的预约，一旦开始使用则不允许取消
  if (booking.status === "approved") {
    const now = new Date();
    const start = new Date(booking.date + "T" + booking.start);
    if (now >= start) {
      alert("该预约已开始使用，无法取消！");
      return;
    }
  }
  if (!confirm(
    `确定取消「${booking.deviceName}」${booking.date} 的预约吗？`
  )) {
    return;
  }
  booking.status = "cancelled";
  saveData(data);
  renderBookings();
  alert("预约已取消！");
}
function submitRepair() {
  const data = getData();
  const device = data.devices.find(d => d.id === selectedDeviceId);
  const description = document.getElementById(
    "repairDescription"
  ).value.trim();
  const file = document.getElementById("repairPhoto").files[0];
  if (!device || !description) {
    alert("请填写故障描述！");
    return;
  }
  if (file && (!file.type.startsWith("image/") ||
      file.size > 2 * 1024 * 1024)) {
    alert("请选择小于 2MB 的图片！");
    return;
  }
  function finish(photo) {
    data.repairs.push({
      id: makeId(),
      student,
      deviceId: device.id,
      deviceName: device.name,
      description,
      photo,
      status: "pending",
      date: new Date().toLocaleString("zh-CN")
    });
    try {
      saveData(data);
      alert("报修申请已提交！");
      showSection("myRepairs");
    } catch (e) {
      alert("浏览器存储空间不足，请使用更小的图片。");
    }
  }
  if (file) {
    const reader = new FileReader();
    reader.onload = () => finish(reader.result);
    reader.readAsDataURL(file);
  } else {
    finish("");
  }
}
function renderRepairs() {
  const data = getData();
  const mine = data.repairs.filter(r => r.student === student);
  document.getElementById("repairList").innerHTML =
    mine.map(r => `
      <div class="record-card">
        <h3>${escapeHTML(r.deviceName)}</h3>
        <p>${escapeHTML(r.description)}</p>
        <p>提交时间：${escapeHTML(r.date)}</p>
        <span class="status ${r.status}">
          ${getStatusText(r.status)}
        </span>
        ${r.photo
          ? `<img class="repair-image" src="${r.photo}"
                  alt="故障照片">`
          : ""}
      </div>
    `).join("") || "<p>暂无报修记录。</p>";
}
// 扫码原型：可通过二维码中的设备编号模拟进入详情
function scanCode() {
  const value = prompt(
    "演示扫码：请输入设备编号（1-5）"
  );
  if (value === null) return;
  const device = getData().devices.find(
    d => d.id === Number(value)
  );
  if (!device) {
    alert("未找到该设备！");
    return;
  }
  openDevice(device.id);
}
// 支持网址：student.html?device=1
const params = new URLSearchParams(location.search);
const deviceId = Number(params.get("device"));
renderDevices();
if (deviceId && getData().devices.some(d => d.id === deviceId)) {
  openDevice(deviceId);
}
