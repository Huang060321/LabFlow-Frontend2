if (sessionStorage.getItem("labflowRole") !== "teacher") {
  window.location.replace("index.html");
}
document.getElementById("teacherName").textContent =
  sessionStorage.getItem("labflowUser") || "教师";
function logout() {
  sessionStorage.removeItem("labflowUser");
  sessionStorage.removeItem("labflowRole");
  location.href = "index.html";
}
function showTeacherPage(id) {
  document.querySelectorAll(".teacher-section").forEach(section => {
    section.classList.add("hidden");
  });
  document.getElementById(id).classList.remove("hidden");
  renderTeacherData();
}
function renderTeacherData() {
  renderOverview();
  renderTeacherBookings();
  renderTeacherRepairs();
  renderEquipment();
}
function renderOverview() {
  const data = getData();
  const pending = data.reservations.filter(
    r => r.status === "pending"
  ).length;
  const approved = data.reservations.filter(
    r => r.status === "approved"
  ).length;
  const rejected = data.reservations.filter(
    r => r.status === "rejected"
  ).length;
  const pendingRepairs = data.repairs.filter(
    r => r.status === "pending"
  ).length;
  document.getElementById("totalDevices").textContent =
    data.devices.length;
  document.getElementById("pendingBookings").textContent = pending;
  document.getElementById("pendingRepairs").textContent =
    pendingRepairs;
  document.getElementById("approvedBookings").textContent =
    approved;
  const total = data.reservations.length;
  const groups = [
    ["待审核", pending],
    ["已通过", approved],
    ["已拒绝", rejected]
  ];
  document.getElementById("usageChart").innerHTML =
    groups.map(([name, count]) => {
      const percent = total ? (count / total) * 100 : 0;
      return `
        <div class="chart-row">
          <span>${name}</span>
          <div class="chart-track">
            <div class="chart-fill"
                 style="width:${percent}%"></div>
          </div>
          <strong>${count}</strong>
        </div>
      `;
    }).join("");
}
function renderTeacherBookings() {
  const data = getData();
  document.getElementById("bookingTable").innerHTML =
    data.reservations.map(r => `
      <tr>
        <td>${escapeHTML(r.student)}</td>
        <td>${escapeHTML(r.deviceName)}</td>
        <td>${escapeHTML(r.date)}</td>
        <td>${escapeHTML(r.start)} - ${escapeHTML(r.end)}</td>
        <td>
          <span class="status ${r.status}">
            ${getStatusText(r.status)}
          </span>
        </td>
        <td>
          ${r.status === "pending" ? `
            <button class="small-btn"
                    onclick="reviewBooking('${r.id}', 'approved')">
              通过
            </button>
            <button class="small-btn danger-btn"
                    onclick="reviewBooking('${r.id}', 'rejected')">
              拒绝
            </button>
          ` : "已处理"}
        </td>
      </tr>
    `).join("") ||
    '<tr><td colspan="6">暂无预约申请</td></tr>';
}
function reviewBooking(id, status) {
  const data = getData();
  const booking = data.reservations.find(r => r.id === id);
  if (!booking || booking.status !== "pending") return;
  if (status === "approved") {
    const device = data.devices.find(
      d => d.id === booking.deviceId
    );
    if (!device || device.status === "maintenance") {
      alert("该设备维修中，不能批准预约！");
      return;
    }
    const conflict = data.reservations.some(r =>
      r.id !== booking.id &&
      r.deviceId === booking.deviceId &&
      r.date === booking.date &&
      r.status === "approved" &&
      booking.start < r.end &&
      booking.end > r.start
    );
    if (conflict) {
      alert("与其他已批准预约冲突！");
      return;
    }
  }
  booking.status = status;
  saveData(data);
  renderTeacherData();
  alert(status === "approved" ? "预约已通过！" : "预约已拒绝！");
}
function renderTeacherRepairs() {
  const data = getData();
  document.getElementById("teacherRepairList").innerHTML =
    data.repairs.map(r => `
      <div class="record-card">
        <h3>${escapeHTML(r.deviceName)}</h3>
        <p>报修学生：${escapeHTML(r.student)}</p>
        <p>故障描述：${escapeHTML(r.description)}</p>
        <p>提交时间：${escapeHTML(r.date)}</p>
        <p>状态：
          <span class="status ${r.status}">
            ${getStatusText(r.status)}
          </span>
        </p>
        ${r.photo
          ? `<img class="repair-image" src="${r.photo}"
                  alt="故障照片">`
          : ""}
        ${r.status === "pending" ? `
          <button class="small-btn"
                  onclick="updateRepair('${r.id}', 'processing')">
            开始维修
          </button>
        ` : ""}
        ${r.status === "processing" ? `
          <button class="small-btn"
                  onclick="updateRepair('${r.id}', 'completed')">
            维修完成
          </button>
        ` : ""}
      </div>
    `).join("") || "<p>暂无报修记录。</p>";
}
function updateRepair(id, status) {
  const data = getData();
  const repair = data.repairs.find(r => r.id === id);
  if (!repair) return;
  if (status === "processing" && repair.status !== "pending") return;
  if (status === "completed" && repair.status !== "processing") return;
  repair.status = status;
  const device = data.devices.find(
    d => d.id === repair.deviceId
  );
  if (device) {
    if (status === "processing") {
      device.status = "maintenance";
    } else {
      const otherActiveRepair = data.repairs.some(r =>
        r.id !== repair.id &&
        r.deviceId === repair.deviceId &&
        r.status === "processing"
      );
      if (!otherActiveRepair) {
        device.status = "available";
      }
    }
  }
  saveData(data);
  renderTeacherData();
  alert("报修状态已更新！");
}
function renderEquipment() {
  const data = getData();
  document.getElementById("equipmentTable").innerHTML =
    data.devices.map(d => {
      const status = getEffectiveStatus(d, data);
      return `
        <tr>
          <td>${d.id}</td>
          <td>${escapeHTML(d.name)}</td>
          <td>${escapeHTML(d.room)}</td>
          <td>
            <span class="status ${status}">
              ${getStatusText(status)}
            </span>
          </td>
          <td>
            <button class="small-btn"
                    onclick="setDeviceStatus(${d.id}, 'available')">
              设为空闲
            </button>
            <button class="small-btn danger-btn"
                    onclick="setDeviceStatus(${d.id}, 'maintenance')">
              设为维修
            </button>
            <button class="small-btn danger-btn"
                    onclick="deleteDevice(${d.id})">
              删除
            </button>
          </td>
        </tr>
      `;
    }).join("");
}
function setDeviceStatus(id, status) {
  const data = getData();
  const device = data.devices.find(d => d.id === id);
  if (!device) return;
  device.status = status;
  saveData(data);
  renderTeacherData();
}
// 新增设备：展开/收起表单
function toggleAddDevice() {
  document.getElementById("addDeviceForm")
    .classList.toggle("hidden");
}
// 新增设备：保存
function addDevice() {
  const name = document.getElementById("newDeviceName")
    .value.trim();
  const room = document.getElementById("newDeviceRoom")
    .value.trim();
  const desc = document.getElementById("newDeviceDesc")
    .value.trim();
  if (!name || !room || !desc) {
    alert("请完整填写设备名称、实验室和描述！");
    return;
  }
  const data = getData();
  const maxId = data.devices.reduce(
    (max, d) => Math.max(max, d.id), 0
  );
  data.devices.push({
    id: maxId + 1,
    name,
    room,
    status: "available",
    description: desc
  });
  saveData(data);
  ["newDeviceName", "newDeviceRoom", "newDeviceDesc"]
    .forEach(id => { document.getElementById(id).value = ""; });
  document.getElementById("addDeviceForm").classList.add("hidden");
  renderTeacherData();
  alert("设备已添加！");
}
// 删除设备：有未完结预约/报修时禁止删除
function deleteDevice(id) {
  const data = getData();
  const device = data.devices.find(d => d.id === id);
  if (!device) return;
  const hasActive = data.reservations.some(r =>
    r.deviceId === id &&
    ["pending", "approved"].includes(r.status)
  ) || data.repairs.some(r =>
    r.deviceId === id &&
    ["pending", "processing"].includes(r.status)
  );
  if (hasActive) {
    alert("该设备存在未完结的预约或报修，暂不能删除！");
    return;
  }
  if (!confirm(`确定删除设备「${device.name}」吗？该操作不可恢复。`)) {
    return;
  }
  data.devices = data.devices.filter(d => d.id !== id);
  saveData(data);
  renderTeacherData();
  alert("设备已删除！");
}
renderTeacherData();
// 学生端或另一个教师标签页修改数据后刷新界面
window.addEventListener("storage", renderTeacherData);
