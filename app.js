// --------------------------------------------------------
// 1. FIREBASE CONFIG
// --------------------------------------------------------
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getDatabase,
  ref,
  onValue,
  set,
  update,
  get,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

//Firebase 配置 - 正式
// const firebaseConfig = {
//   apiKey: "AIzaSyC856BX7Sl6iHyjDIyOwe4nh5Q1Pea-tvk",
//   authDomain: "yermo-acf82.firebaseapp.com",
//   databaseURL:
//     "https://yermo-acf82-default-rtdb.asia-southeast1.firebasedatabase.app",
//   projectId: "yermo-acf82",
//   storageBucket: "yermo-acf82.firebasestorage.app",
//   messagingSenderId: "802358752702",
//   appId: "1:802358752702:web:192c3e5f7f6a9f7f8e35ef",
//   measurementId: "G-47QMRFYW7C",
// };

//本地測試
const firebaseConfig = {
  apiKey: "AIzaSyAC3oTXktNUrgl331CU4-mnJvNm8paUywE",
  authDomain: "yermonew.firebaseapp.com",
  databaseURL: "https://yermonew-default-rtdb.firebaseio.com",
  projectId: "yermonew",
  storageBucket: "yermonew.firebasestorage.app",
  messagingSenderId: "82246020578",
  appId: "1:82246020578:web:4bb70cbcaa6067d4e61dbb",
  measurementId: "G-7LJVSRRV0M",
};
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// --------------------------------------------------------
// 2. 資料結構與全域變數
// --------------------------------------------------------
let currentUser = null;
let currentSeat = null;
let menuStatus = {}; // 儲存餐點庫存狀態

// HTML 轉義函數（防止 XSS）
function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// 自定義提示框函數（替代 alert，適配平板）
window.showToast = (message, type = "info", duration = 3000) => {
  // 確保 DOM 已加載
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      showToast(message, type, duration);
    });
    return;
  }

  const toast = document.getElementById("toast");
  const toastMessage = document.getElementById("toast-message");

  if (!toast || !toastMessage) {
    // 如果找不到元素，回退到 alert
    console.warn("Toast 元素未找到，使用 alert 替代");
    alert(message);
    return;
  }

  // 清除之前的 timeout（如果有的話）
  if (toast._timeout) {
    clearTimeout(toast._timeout);
  }

  toastMessage.textContent = message;
  toast.className = `toast ${type}`;
  toast.classList.add("show");

  toast._timeout = setTimeout(() => {
    toast.classList.remove("show");
    toast._timeout = null;
  }, duration);
};

// 自定義確認對話框（替代 confirm，適配平板）
window.showConfirm = (message, title = "確認") => {
  return new Promise((resolve) => {
    const modal = document.getElementById("confirm-modal");
    const titleEl = document.getElementById("confirm-title");
    const messageEl = document.getElementById("confirm-message");
    const okBtn = document.getElementById("confirm-ok");
    const cancelBtn = document.getElementById("confirm-cancel");

    if (!modal || !messageEl) {
      // 回退到原生 confirm
      const result = confirm(message);
      resolve(result);
      return;
    }

    // 設置內容
    if (titleEl) titleEl.textContent = title;
    messageEl.textContent = message;
    modal.classList.add("show");

    // 確認按鈕
    const handleOk = () => {
      modal.classList.remove("show");
      resolve(true);
      // 移除事件監聽器
      okBtn.onclick = null;
      cancelBtn.onclick = null;
      modal.onclick = null;
    };

    // 取消按鈕
    const handleCancel = () => {
      modal.classList.remove("show");
      resolve(false);
      // 移除事件監聽器
      okBtn.onclick = null;
      cancelBtn.onclick = null;
      modal.onclick = null;
    };

    // 添加事件監聽器
    okBtn.onclick = handleOk;
    cancelBtn.onclick = handleCancel;

    // 點擊背景關閉（視為取消）
    const handleModalClick = (e) => {
      if (e.target === modal) {
        handleCancel();
      }
    };
    modal.onclick = handleModalClick;
  });
};

// 兼容性：保留 alert 但使用自定義提示框
const originalAlert = window.alert;
window.alert = (message) => {
  showToast(message, "info", 3000);
};

// 區域資料 (預設)
const ZONES = [
  {
    id: 0,
    name: "第零區 - 夜店八卦區（吧檯）",
    seats: 3,
    type: "round", // 長桌
    desc: `狀態：你今天的能量適合交朋友嗎？那就大膽選擇這區吧！\n\n任務：桌子的中間有療癒卡，請誠心的回想自己最近的狀態，並抽取一張小卡，將內容寫在紙上，並與鄰近的人交換狀態！\n\n提醒：有時候突破是需要一點勇氣，而今天的你選擇這裡就已充滿勇氣，所以不要害怕當主動的那個人，說不定會得到意外的收穫唷！`,
  },
  {
    id: 1,
    name: "第一區 - 閒聊工作區（1F亮區）",
    seats: 8,
    type: "rect", // 長桌
    desc: `狀態：你今天的能量適合交朋友嗎？那就大膽選擇這區吧！\n\n任務：桌子的中間有療癒卡，請誠心的回想自己最近的狀態，並抽取一張小卡，將內容寫在紙上，並與鄰近的人交換狀態！\n\n提醒：有時候突破是需要一點勇氣，而今天的你選擇這裡就已充滿勇氣，所以不要害怕當主動的那個人，說不定會得到意外的收穫唷！`,
  },
  {
    id: 2,
    name: "第二區 - 自由漂流區（1F暗區）",
    seats: 8, // 圓桌6 + 邊桌2
    type: "round",
    desc: `狀態：今天的能量已經耗盡了嗎？請從野陌獲得療癒的力量吧！\n\n任務：放空也好、聽音樂也行，坐累了就起來晃晃吧！整棟建築物都可以盡情探索～\n\n提醒：二樓有個神秘的門，打開後是個能夠好好呼吸的露台；三樓則是植物的家，可以四處瞧瞧！`,
  },
  {
    id: 3,
    name: "第三區 - 認真工作區（2F亮區）",
    seats: 6, // 沙發4 + 邊桌2
    type: "sofa",
    desc: `狀態：一直沒有空間好好看書？那就選一個你喜歡的位置，將書打開吧！\n\n任務：任務開始前請專心看書，我們將於22:00 邀請大家分享今天帶來的是什麼書；若不想參與可於活動前更換位置。\n\n提醒：各看各的書再彼此推薦就是最適合i人的讀書會，簡單的分享也是分享，一切活動皆採鼓勵制，請不要有壓力！`,
  },
  {
    id: 4,
    name: "第四區 - 悠閒看書區（2F暗區）",
    seats: 6, // 3個木桌 * 2
    type: "rect",
    desc: `狀態：你今天的工作或讀書目標尚未達成嗎？辛苦你了！讓我們一起加油加油～\n\n任務：今日進度未完成前，請保持安靜。\n嚴禁講話及交談！\n\n提醒：若需要手機代保管服務，請找老闆！`,
  },
  {
    id: 5,
    name: "第五區 - 冥想占卜區（2F大空間）",
    seats: 8, // 2圓桌*2 + 2方桌*2 = 8位
    type: "mix",
    desc: `狀態：最近非常迷惘嗎？或者遲遲無法放鬆下來呢？戴上妳的耳機，進入神奇的世界吧！\n\n任務：老闆會將適合您的影片傳給您，請跟隨影片的內容進行今日的任務！\n\n提醒：一定要戴上你的耳機，請勿影響他人。`,
  },
];

const MENU = {
  drinks: [
    "美式",
    "拿鐵",
    "可可牛奶",
    "黑糖鮮奶茶",
    "伯爵茶",
    "洋甘菊茶(僅熱)",
  ],
  foods: ["細薯條", "肉桂捲", "提拉米蘇"],
};

// --------------------------------------------------------
// 3. 頁面邏輯
// --------------------------------------------------------

// 更新用戶列表的函數（可重複使用）
function updateUserList(users) {
  const listDiv = document.getElementById("user-list");
  if (!listDiv) return;

  listDiv.innerHTML = "";

  const sortedNames = Object.keys(users).sort();

  if (sortedNames.length === 0) {
    listDiv.innerHTML =
      '<p style="text-align:center; color:#444;">(目前無待報到名單，請稍候)</p>';
    return;
  }

  sortedNames.forEach((name) => {
    const status = users[name].status || "waiting"; // waiting, paid, done
    if (status === "waiting") {
      const div = document.createElement("div");
      div.className = "list-item";
      div.textContent = name;
      div.onclick = () => selectUser(name);
      listDiv.appendChild(div);
    }
  });
}

// 初始化：監聽報到名單
function startUsersPolling() {
  const usersRef = ref(db, "users");
  onValue(usersRef, (snapshot) => {
    // 只在報到頁面時才更新列表，避免影響其他頁面
    const checkinPage = document.getElementById("p-checkin");
    if (!checkinPage || !checkinPage.classList.contains("active")) {
      return;
    }

    const users = snapshot.val() || {};
    updateUserList(users);
  });
}

// 監聽庫存狀態
function startMenuStatusPolling() {
  onValue(ref(db, "menu_status"), (snapshot) => {
    menuStatus = snapshot.val() || {};
    // 如果目前在菜單頁，即時更新
    if (document.getElementById("p-menu").classList.contains("active")) {
      renderMenu();
    }
    // 如果在後台，更新庫存列表
    if (document.getElementById("p-admin").classList.contains("active")) {
      renderAdminStock();
    }
  });
}

// 檢查維護模式
function checkMaintenanceMode() {
  const maintenanceRef = ref(db, "system/maintenance");
  onValue(maintenanceRef, (snapshot) => {
    const isMaintenance = snapshot.val() === true;
    const maintenancePage = document.getElementById("p-maintenance");
    const checkinPage = document.getElementById("p-checkin");
    const adminPage = document.getElementById("p-admin");
    const currentActivePage = document.querySelector(".page.active");

    // 如果當前在後台頁面，不影響（後台可以正常操作）
    if (adminPage && adminPage.classList.contains("active")) {
      return;
    }

    // 如果當前在維護頁面，檢查是否需要退出
    if (maintenancePage && maintenancePage.classList.contains("active")) {
      if (!isMaintenance) {
        // 退出維護模式，返回首頁
        showPage("p-checkin");
        // 確保用戶列表更新
        setTimeout(() => {
          const usersRef = ref(db, "users");
          get(usersRef)
            .then((snapshot) => {
              const users = snapshot.val() || {};
              updateUserList(users);
            })
            .catch((error) => {
              console.error("獲取用戶列表失敗:", error);
            });
        }, 100);
      }
      return;
    }

    // 如果不在維護頁面，檢查是否需要進入維護模式
    if (isMaintenance) {
      // 進入維護模式
      if (maintenancePage) {
        showPage("p-maintenance");
      }
    }
  });
}

// 啟動所有監聽
checkMaintenanceMode();
startUsersPolling();
startMenuStatusPolling();

window.selectUser = async (name) => {
  const confirmed = await showConfirm(`確認您是 ${name} 嗎？`, "確認身份");
  if (!confirmed) return;
  currentUser = name;
  showPage("p-payment");
};

// 支付頁面
document.getElementById("btn-staff-confirm").onclick = async () => {
  if (!currentUser) {
    alert("請先選擇用戶");
    return;
  }

  const loadingEl = document.getElementById("loading");
  try {
    if (loadingEl) {
      loadingEl.style.display = "flex";
    }

    await update(ref(db, "users/" + currentUser), { status: "paid" });

    if (loadingEl) {
      loadingEl.style.display = "none";
    }

    showPage("p-zones");
  } catch (error) {
    if (loadingEl) {
      loadingEl.style.display = "none";
    }
    alert("更新失敗，請重試");
    console.error(error);
  }
};

// 解析區域描述，提取狀態、任務、提醒
function parseZoneDesc(desc) {
  const parts = {
    status: "",
    task: "",
    reminder: "",
  };

  if (!desc) return parts;

  const statusMatch = desc.match(/狀態[：:]\s*(.+?)(?=\n\n任務|$)/s);
  const taskMatch = desc.match(/任務[：:]\s*(.+?)(?=\n\n提醒|$)/s);
  const reminderMatch = desc.match(/提醒[：:]\s*(.+?)$/s);

  if (statusMatch) parts.status = statusMatch[1].trim();
  if (taskMatch) parts.task = taskMatch[1].trim();
  if (reminderMatch) parts.reminder = reminderMatch[1].trim();

  return parts;
}

// 組合區域描述
function combineZoneDesc(status, task, reminder) {
  let desc = "";
  if (status) desc += `狀態：${status}`;
  if (task) {
    if (desc) desc += "\n\n";
    desc += `任務：${task}`;
  }
  if (reminder) {
    if (desc) desc += "\n\n";
    desc += `提醒：${reminder}`;
  }
  return desc;
}

// 當前顯示的區域索引（在 availableZones 中的索引）
let currentZoneIndex = 0;
let availableZones = [];

// 根據區域ID找到在 availableZones 中的索引
function findZoneIndexInAvailable(zoneId) {
  return availableZones.findIndex((zone) => zone.id === zoneId);
}

// 區域顯示（從 Firebase 讀取並合併數據）
function renderZones() {
  const zoneContainer = document.getElementById("zone-container");
  const indicatorsContainer = document.getElementById("zone-indicators");
  if (!zoneContainer || !indicatorsContainer) return;

  zoneContainer.innerHTML = "";
  indicatorsContainer.innerHTML = "";
  availableZones = [];

  // 同時讀取區域內容和座位數據
  const zonesRef = ref(db, "zones_content");
  const seatsRef = ref(db, "seats");

  Promise.all([get(zonesRef), get(seatsRef)])
    .then(([zonesSnapshot, seatsSnapshot]) => {
      const zonesContent = zonesSnapshot.exists() ? zonesSnapshot.val() : {};
      const allSeats = seatsSnapshot.exists() ? seatsSnapshot.val() : {};

      ZONES.forEach((zone) => {
        const zoneId = zone.id;

        // 檢查該區域是否整區都被關閉
        const seatIds = getZoneSeatIds(zoneId);
        let allClosed = true;
        if (seatIds.length > 0) {
          for (const seatId of seatIds) {
            if (!allSeats[seatId] || allSeats[seatId].closed !== true) {
              allClosed = false;
              break;
            }
          }
        } else {
          // 如果沒有座位，視為未關閉
          allClosed = false;
        }

        // 如果整區都被關閉，不顯示這個區域
        if (allClosed) {
          return;
        }

        // 記錄可用區域
        availableZones.push(zone);

        const savedContent = zonesContent[zoneId] || {};

        // 優先使用 Firebase 中的內容，如果沒有則使用默認值
        let finalDesc = zone.desc;
        if (savedContent.status || savedContent.task || savedContent.reminder) {
          finalDesc = combineZoneDesc(
            savedContent.status || parseZoneDesc(zone.desc).status,
            savedContent.task || parseZoneDesc(zone.desc).task,
            savedContent.reminder || parseZoneDesc(zone.desc).reminder
          );
        }

        const div = document.createElement("div");
        div.className = "zone-card";
        div.innerHTML = `
            <div class="zone-title">${zone.name}</div>
            <div class="zone-desc">${finalDesc}</div>
            <button class="btn outline" style="margin-top:10px; padding:12px; border-radius:8px;" onclick="openZone(${zoneId})">
                選擇此區座位 →
            </button>
        `;
        zoneContainer.appendChild(div);

        // 創建指示器（使用當前可用區域的索引）
        const indicator = document.createElement("div");
        indicator.className = "zone-indicator";
        const zoneIndex = availableZones.length - 1; // 當前區域在 availableZones 中的索引
        indicator.onclick = () => goToZone(zoneIndex);
        indicatorsContainer.appendChild(indicator);
      });

      // 只在第一次渲染時重置索引，之後保持當前索引（如果還在範圍內）
      if (
        availableZones.length > 0 &&
        (currentZoneIndex >= availableZones.length || currentZoneIndex < 0)
      ) {
        currentZoneIndex = 0;
      }
      // 延遲更新位置，確保DOM已完全渲染
      setTimeout(() => {
        updateZonePosition();
      }, 50);
    })
    .catch((error) => {
      console.error("讀取區域內容失敗:", error);
      // 如果讀取失敗，使用默認值（不檢查座位狀態）
      const zonesRef = ref(db, "zones_content");
      get(zonesRef)
        .then((snapshot) => {
          const zonesContent = snapshot.exists() ? snapshot.val() : {};
          availableZones = [];

          ZONES.forEach((zone) => {
            const zoneId = zone.id;
            availableZones.push(zone);

            const savedContent = zonesContent[zoneId] || {};

            let finalDesc = zone.desc;
            if (
              savedContent.status ||
              savedContent.task ||
              savedContent.reminder
            ) {
              finalDesc = combineZoneDesc(
                savedContent.status || parseZoneDesc(zone.desc).status,
                savedContent.task || parseZoneDesc(zone.desc).task,
                savedContent.reminder || parseZoneDesc(zone.desc).reminder
              );
            }

            const div = document.createElement("div");
            div.className = "zone-card";
            div.innerHTML = `
                <div class="zone-title">${zone.name}</div>
                <div class="zone-desc">${finalDesc}</div>
                <button class="btn outline" style="margin-top:10px; padding:12px; border-radius:8px;" onclick="openZone(${zone.id})">
                    選擇此區座位 →
                </button>
            `;
            zoneContainer.appendChild(div);

            // 創建指示器（使用當前可用區域的索引）
            const indicator = document.createElement("div");
            indicator.className = "zone-indicator";
            const zoneIndex = availableZones.length - 1; // 當前區域在 availableZones 中的索引
            indicator.onclick = () => goToZone(zoneIndex);
            indicatorsContainer.appendChild(indicator);
          });

          // 確保 currentZoneIndex 不超出範圍
          if (currentZoneIndex >= availableZones.length) {
            currentZoneIndex =
              availableZones.length > 0 ? availableZones.length - 1 : 0;
          }
          if (currentZoneIndex < 0) {
            currentZoneIndex = 0;
          }
          // 延遲更新位置，確保DOM已完全渲染
          setTimeout(() => {
            updateZonePosition();
          }, 50);
        })
        .catch((err) => {
          console.error("讀取區域內容失敗:", err);
        });
    });
}

// 切換到指定區域
function goToZone(index) {
  if (index < 0 || index >= availableZones.length) return;
  currentZoneIndex = index;
  updateZonePosition();
}

// 計算當前位置的translate值
function calculateTranslateX(index) {
  const zoneContainer = document.getElementById("zone-container");
  if (!zoneContainer || availableZones.length === 0) return 0;

  // 獲取第一個卡片的實際寬度和margin
  const firstCard = zoneContainer.querySelector(".zone-card");
  if (!firstCard) return 0;

  const cardRect = firstCard.getBoundingClientRect();
  const cardStyle = window.getComputedStyle(firstCard);
  const cardWidth = cardRect.width;
  const cardMarginLeft = parseFloat(cardStyle.marginLeft) || 0;
  const cardMarginRight = parseFloat(cardStyle.marginRight) || 0;
  const cardTotalWidth = cardWidth + cardMarginLeft + cardMarginRight;

  // 獲取容器的padding
  const containerStyle = window.getComputedStyle(zoneContainer);
  const containerPaddingLeft = parseFloat(containerStyle.paddingLeft) || 0;

  // 計算偏移量：每個卡片佔用的總空間 * 索引 + 容器左側padding
  return -index * cardTotalWidth - containerPaddingLeft;
}

// 更新區域位置
function updateZonePosition() {
  const zoneContainer = document.getElementById("zone-container");
  const indicators = document.querySelectorAll(".zone-indicator");

  if (!zoneContainer) return;

  const translateX = calculateTranslateX(currentZoneIndex);
  zoneContainer.style.transform = `translateX(${translateX}px)`;

  // 更新指示器
  indicators.forEach((indicator, index) => {
    if (index === currentZoneIndex) {
      indicator.classList.add("active");
    } else {
      indicator.classList.remove("active");
    }
  });
}

// 滑動功能初始化標記
let zoneSwiperInitialized = false;

// 初始化滑動功能
function initZoneSwiper() {
  const zoneContainer = document.getElementById("zone-container");
  if (!zoneContainer) return;

  // 如果已經初始化過，先移除舊的監聽器
  if (zoneSwiperInitialized) {
    // 重新獲取容器（因為可能已經重新渲染）
    const newContainer = document.getElementById("zone-container");
    if (newContainer && newContainer !== zoneContainer) {
      // 如果容器已經改變，重置標記
      zoneSwiperInitialized = false;
    } else {
      return; // 已經初始化過，不需要重複初始化
    }
  }

  let startX = 0;
  let currentX = 0;
  let isDragging = false;
  let startTranslate = 0;
  let currentTranslate = 0;

  // 觸摸開始
  const touchStartHandler = (e) => {
    startX = e.touches[0].clientX;
    isDragging = true;
    startTranslate = currentTranslate;
    zoneContainer.style.transition = "none";
  };

  // 觸摸移動
  const touchMoveHandler = (e) => {
    if (!isDragging) return;
    currentX = e.touches[0].clientX;
    const diff = currentX - startX;
    currentTranslate = startTranslate + diff;
    zoneContainer.style.transform = `translateX(${currentTranslate}px)`;
  };

  // 觸摸結束
  const touchEndHandler = () => {
    if (!isDragging) return;
    isDragging = false;
    zoneContainer.style.transition = "transform 0.3s ease";

    const threshold = 50; // 滑動閾值
    const diff = currentX - startX;

    if (Math.abs(diff) > threshold) {
      if (diff > 0 && currentZoneIndex > 0) {
        // 向右滑動，顯示上一個區域
        goToZone(currentZoneIndex - 1);
      } else if (diff < 0 && currentZoneIndex < availableZones.length - 1) {
        // 向左滑動，顯示下一個區域
        goToZone(currentZoneIndex + 1);
      } else {
        // 回到當前位置
        updateZonePosition();
      }
    } else {
      // 回到當前位置
      updateZonePosition();
    }

    currentTranslate = calculateTranslateX(currentZoneIndex);
    startTranslate = currentTranslate;
  };

  // 鼠標事件（桌面端支持）
  let mouseStartX = 0;
  let mouseIsDown = false;

  const mouseDownHandler = (e) => {
    mouseStartX = e.clientX;
    mouseIsDown = true;
    startTranslate = currentTranslate;
    zoneContainer.style.transition = "none";
    e.preventDefault();
  };

  const mouseMoveHandler = (e) => {
    if (!mouseIsDown) return;
    const diff = e.clientX - mouseStartX;
    currentTranslate = startTranslate + diff;
    zoneContainer.style.transform = `translateX(${currentTranslate}px)`;
  };

  const mouseUpHandler = (e) => {
    if (!mouseIsDown) return;
    mouseIsDown = false;
    zoneContainer.style.transition = "transform 0.3s ease";

    const threshold = 50;
    const mouseCurrentX = e.clientX;
    const diff = mouseCurrentX - mouseStartX;

    if (Math.abs(diff) > threshold) {
      if (diff > 0 && currentZoneIndex > 0) {
        goToZone(currentZoneIndex - 1);
      } else if (diff < 0 && currentZoneIndex < availableZones.length - 1) {
        goToZone(currentZoneIndex + 1);
      } else {
        updateZonePosition();
      }
    } else {
      updateZonePosition();
    }

    currentTranslate = calculateTranslateX(currentZoneIndex);
    startTranslate = currentTranslate;
  };

  const mouseLeaveHandler = () => {
    if (mouseIsDown) {
      mouseIsDown = false;
      zoneContainer.style.transition = "transform 0.3s ease";
      updateZonePosition();
    }
  };

  // 添加事件監聽器
  zoneContainer.addEventListener("touchstart", touchStartHandler, {
    passive: true,
  });
  zoneContainer.addEventListener("touchmove", touchMoveHandler, {
    passive: true,
  });
  zoneContainer.addEventListener("touchend", touchEndHandler, {
    passive: true,
  });
  zoneContainer.addEventListener("mousedown", mouseDownHandler);
  zoneContainer.addEventListener("mousemove", mouseMoveHandler);
  zoneContainer.addEventListener("mouseup", mouseUpHandler);
  zoneContainer.addEventListener("mouseleave", mouseLeaveHandler);

  // 監聽窗口大小改變，重新計算位置
  let resizeTimeout;
  const resizeHandler = () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      updateZonePosition();
    }, 100);
  };
  window.addEventListener("resize", resizeHandler);

  zoneSwiperInitialized = true;
}

// 初始化區域顯示
renderZones();
initZoneSwiper();

// 監聽座位狀態變化，自動更新區域列表（如果當前在區域選擇頁面）
onValue(ref(db, "seats"), (snapshot) => {
  const currentPage = document.querySelector(".page.active");
  if (currentPage && currentPage.id === "p-zones") {
    renderZones();
  }
});

window.openZone = async (zoneId) => {
  // 檢查訂單狀態，如果未出餐則阻止進入座位選擇頁面
  if (currentUser) {
    try {
      const orderRef = ref(db, "orders/" + currentUser);
      const orderSnapshot = await get(orderRef);
      if (orderSnapshot.exists()) {
        const orderData = orderSnapshot.val();
        const isServed = orderData.served === true;
        if (!isServed) {
          alert("請等待餐點出餐完成後，才能更換座位");
          return;
        }
      }
    } catch (error) {
      console.error("檢查訂單狀態失敗:", error);
    }
  }

  // 從 Firebase 讀取區域內容以獲取最新描述
  let zone = ZONES.find((z) => z.id === zoneId);
  try {
    const zonesRef = ref(db, "zones_content/" + zoneId);
    const snapshot = await get(zonesRef);
    if (snapshot.exists()) {
      const savedContent = snapshot.val();
      const defaultParts = parseZoneDesc(zone.desc);
      zone = {
        ...zone,
        desc: combineZoneDesc(
          savedContent.status || defaultParts.status,
          savedContent.task || defaultParts.task,
          savedContent.reminder || defaultParts.reminder
        ),
      };
    }
  } catch (error) {
    console.error("讀取區域內容失敗:", error);
  }

  document.getElementById("seat-zone-title").textContent = zone.name;
  document.getElementById("btn-confirm-seat").style.display = "none";
  const warning = document.getElementById("seat-warning");
  if (warning) {
    warning.style.display = "none";
  }

  // 渲染座位
  const grid = document.getElementById("seat-grid");
  grid.innerHTML = "";

  onValue(
    ref(db, "seats"),
    (snapshot) => {
      const allSeats = snapshot.val() || {};
      grid.innerHTML = "";

      // 第二區特殊排列：1 2 3 7 / 5 6 4 8
      // 7、8是方的
      if (zoneId === 2) {
        const seatOrder = [1, 2, 3, 7, 5, 6, 4, 8];
        seatOrder.forEach((seatNum) => {
          const seatId = `${zoneId}-${seatNum}`;
          const btn = document.createElement("div");
          btn.className = "seat";
          btn.textContent = seatNum;

          // 第二區：第7、8號座位是方的
          if (seatNum === 7 || seatNum === 8) btn.classList.add("square");

          // 檢查座位是否被關閉
          if (allSeats[seatId] && allSeats[seatId].closed === true) {
            btn.classList.add("closed");
            btn.style.opacity = "0.5";
            btn.style.background = "#333";
            btn.style.border = "2px dashed #666";
            btn.style.cursor = "not-allowed";
            // 顯示「今日未開啟」文字，不改變按鈕大小
            btn.innerHTML = `<div style="font-size: 12px; color: #666; line-height: 1; margin-top: 2px;">今日未開啟</div>`;
          } else if (
            allSeats[seatId] &&
            allSeats[seatId].takenBy &&
            allSeats[seatId].takenBy !== currentUser
          ) {
            btn.classList.add("taken");
          } else {
            btn.onclick = () => selectSeatTemp(seatId, btn);
          }

          // 保持當前選擇
          if (currentSeat === seatId) btn.classList.add("selected");

          grid.appendChild(btn);
        });
      } else if (zoneId === 3) {
        // 第三區特殊排列：1 3 5 / 2 4 6
        // 使用空位來實現3列佈局
        const seatOrder = [1, 3, 5, null, 2, 4, 6, null]; // null 表示空位
        seatOrder.forEach((seatNum) => {
          if (seatNum === null) {
            // 添加空位
            const emptyDiv = document.createElement("div");
            emptyDiv.style.visibility = "hidden"; // 隱藏但佔位
            grid.appendChild(emptyDiv);
          } else {
            const seatId = `${zoneId}-${seatNum}`;
            const btn = document.createElement("div");
            btn.className = "seat";
            btn.textContent = seatNum;

            // 第三區：所有座位都是方的（rect類型）
            btn.classList.add("square");

            // 檢查座位是否被關閉
            if (allSeats[seatId] && allSeats[seatId].closed === true) {
              btn.classList.add("closed");
              btn.style.opacity = "0.5";
              btn.style.background = "#333";
              btn.style.border = "2px dashed #666";
              btn.style.cursor = "not-allowed";
              // 顯示「今日未開啟」文字，不改變按鈕大小
              btn.innerHTML = `<div style="font-size: 12px; color: #666; line-height: 1; margin-top: 2px;">今日未開啟</div>`;
            } else if (
              allSeats[seatId] &&
              allSeats[seatId].takenBy &&
              allSeats[seatId].takenBy !== currentUser
            ) {
              btn.classList.add("taken");
            } else {
              btn.onclick = () => selectSeatTemp(seatId, btn);
            }

            // 保持當前選擇
            if (currentSeat === seatId) btn.classList.add("selected");

            grid.appendChild(btn);
          }
        });
      } else if (zoneId === 4) {
        // 第四區特殊排列：1 (空) 3 4 / 2 (空) 5 6
        const seatOrder = [1, null, 3, 4, 2, null, 5, 6]; // null 表示空位
        seatOrder.forEach((seatNum) => {
          if (seatNum === null) {
            // 添加空位
            const emptyDiv = document.createElement("div");
            emptyDiv.style.visibility = "hidden"; // 隱藏但佔位
            grid.appendChild(emptyDiv);
          } else {
            const seatId = `${zoneId}-${seatNum}`;
            const btn = document.createElement("div");
            btn.className = "seat";
            btn.textContent = seatNum;

            // 第四區：第3、4、5、6號座位是方的
            if (
              seatNum === 3 ||
              seatNum === 4 ||
              seatNum === 5 ||
              seatNum === 6
            )
              btn.classList.add("square");

            // 檢查座位是否被關閉
            if (allSeats[seatId] && allSeats[seatId].closed === true) {
              btn.classList.add("closed");
              btn.style.opacity = "0.5";
              btn.style.background = "#333";
              btn.style.border = "2px dashed #666";
              btn.style.cursor = "not-allowed";
              // 顯示「今日未開啟」文字，不改變按鈕大小
              btn.innerHTML = `<div style="font-size: 12px; color: #666; line-height: 1; margin-top: 2px;">今日未開啟</div>`;
            } else if (
              allSeats[seatId] &&
              allSeats[seatId].takenBy &&
              allSeats[seatId].takenBy !== currentUser
            ) {
              btn.classList.add("taken");
            } else {
              btn.onclick = () => selectSeatTemp(seatId, btn);
            }

            // 保持當前選擇
            if (currentSeat === seatId) btn.classList.add("selected");

            grid.appendChild(btn);
          }
        });
      } else if (zoneId === 5) {
        // 第五區特殊排列：x x 5 6 / 3 4 7 x
        // 5、6、7是方的，3、4是圓的
        const seatOrder = [1, 2, 5, 6, 3, 4, 7, 8]; // null 表示空位
        seatOrder.forEach((seatNum) => {
          if (seatNum === null) {
            // 添加空位
            const emptyDiv = document.createElement("div");
            emptyDiv.style.visibility = "hidden"; // 隱藏但佔位
            grid.appendChild(emptyDiv);
          } else {
            const seatId = `${zoneId}-${seatNum}`;
            const btn = document.createElement("div");
            btn.className = "seat";
            btn.textContent = seatNum;

            // 第五區：第5、6、7號座位是方的，第3、4號是圓的
            if (
              seatNum === 5 ||
              seatNum === 6 ||
              seatNum === 7 ||
              seatNum === 8
            )
              btn.classList.add("square");

            // 檢查座位是否被關閉
            if (allSeats[seatId] && allSeats[seatId].closed === true) {
              btn.classList.add("closed");
              btn.style.opacity = "0.5";
              btn.style.background = "#333";
              btn.style.border = "2px dashed #666";
              btn.style.cursor = "not-allowed";
              // 顯示「今日未開啟」文字，不改變按鈕大小
              btn.innerHTML = `<div style="font-size: 12px; color: #666; line-height: 1; margin-top: 2px;">今日未開啟</div>`;
            } else if (
              allSeats[seatId] &&
              allSeats[seatId].takenBy &&
              allSeats[seatId].takenBy !== currentUser
            ) {
              btn.classList.add("taken");
            } else {
              btn.onclick = () => selectSeatTemp(seatId, btn);
            }

            // 保持當前選擇
            if (currentSeat === seatId) btn.classList.add("selected");

            grid.appendChild(btn);
          }
        });
      } else {
        // 其他區域正常排列
        for (let i = 1; i <= zone.seats; i++) {
          const seatId = `${zoneId}-${i}`;
          const btn = document.createElement("div");
          btn.className = "seat";
          btn.textContent = i;

          if (zone.type === "rect") btn.classList.add("square");

          // 檢查座位是否被關閉
          if (allSeats[seatId] && allSeats[seatId].closed === true) {
            btn.classList.add("closed");
            btn.style.opacity = "0.5";
            btn.style.background = "#333";
            btn.style.border = "2px dashed #666";
            btn.innerHTML = `<div style="font-size: 12px; color: #666; line-height: 1; margin-top: 2px;">今日未開啟</div>`;
          } else if (
            allSeats[seatId] &&
            allSeats[seatId].takenBy &&
            allSeats[seatId].takenBy !== currentUser
          ) {
            btn.classList.add("taken");
          } else {
            btn.onclick = () => selectSeatTemp(seatId, btn);
          }

          // 保持當前選擇
          if (currentSeat === seatId) btn.classList.add("selected");

          grid.appendChild(btn);
        }
      }
    },
    { onlyOnce: true }
  );

  showPage("p-seat");
};

window.selectSeatTemp = (seatId, btnElement) => {
  document
    .querySelectorAll(".seat")
    .forEach((s) => s.classList.remove("selected"));
  btnElement.classList.add("selected");
  currentSeat = seatId;
  document.getElementById("btn-confirm-seat").style.display = "block";
  // 顯示警告
  const warning = document.getElementById("seat-warning");
  if (warning) {
    warning.style.display = "block";
  }
};

document.getElementById("btn-confirm-seat").onclick = async () => {
  try {
    // 二次檢查座位
    const seatRef = ref(db, "seats/" + currentSeat);
    const snapshot = await get(seatRef);
    if (
      snapshot.exists() &&
      snapshot.val().takenBy &&
      snapshot.val().takenBy !== currentUser
    ) {
      alert("哎呀！剛剛有人比您快一步選了這個位置，請重選。");
      const zoneId = parseInt(currentSeat.split("-")[0]);
      openZone(zoneId);
      return;
    }

    // 如果是換位置（已有舊座位），先釋放舊座位
    const userRef = ref(db, "users/" + currentUser);
    const userSnapshot = await get(userRef);
    if (userSnapshot.exists() && userSnapshot.val().seat) {
      const oldSeat = userSnapshot.val().seat;
      if (oldSeat && oldSeat !== currentSeat) {
        // 檢查舊座位是否仍屬於當前用戶
        const oldSeatRef = ref(db, "seats/" + oldSeat);
        const oldSeatSnapshot = await get(oldSeatRef);
        if (
          oldSeatSnapshot.exists() &&
          oldSeatSnapshot.val().takenBy === currentUser
        ) {
          // 釋放舊座位，但保留 closed 狀態等其他屬性
          const oldSeatData = oldSeatSnapshot.val();
          await update(oldSeatRef, { takenBy: null });
        }
      }
    }

    // 鎖定新座位
    await set(seatRef, { takenBy: currentUser });
    await update(ref(db, "users/" + currentUser), { seat: currentSeat });

    // 檢查訂單狀態
    const orderRef = ref(db, "orders/" + currentUser);
    const orderSnapshot = await get(orderRef);

    let existingOrderData = null;
    if (orderSnapshot.exists()) {
      // 如果已有訂單，更新座位信息，並清除已離座標記
      await update(orderRef, { seat: currentSeat, seatReleased: false });

      // 檢查是否已出餐
      existingOrderData = orderSnapshot.val();
      const isServed = existingOrderData.served === true;

      if (isServed) {
        // 已出餐，只能換位置，不進入點餐頁面
        alert("位置已更新！");
        showPage("p-done");
        return;
      }
    }

    // 未出餐或沒有訂單，進入點餐頁面
    renderMenu();

    // 如果有訂單，載入之前的備註
    if (existingOrderData && existingOrderData.note) {
      const noteInput = document.getElementById("order-note");
      if (noteInput) {
        noteInput.value = existingOrderData.note;
      }
    }

    showPage("p-menu");
  } catch (error) {
    alert("選擇座位失敗，請重試");
    console.error(error);
  }
};

// 菜單邏輯
let orderState = {};

function renderMenu() {
  const dContainer = document.getElementById("menu-drinks");
  const fContainer = document.getElementById("menu-foods");
  dContainer.innerHTML = "";
  fContainer.innerHTML = "";

  // 保留已選數量，重新渲染列表
  const oldState = { ...orderState };
  orderState = {};

  // 渲染飲品
  MENU.drinks.forEach((item) => {
    // 初始化 state (如果有舊資料則沿用)
    const isHotOnly = item.includes("僅熱");
    if (oldState[item]) {
      orderState[item] = oldState[item];
    } else {
      orderState[item] = {
        type: "drink",
        temp: isHotOnly ? "hot" : "ice",
        count: 0,
      };
    }

    // 檢查完售
    const isSoldOut = menuStatus[item] === false; // false 代表完售

    const div = document.createElement("div");
    div.className = `menu-item ${isSoldOut ? "sold-out" : ""}`;

    div.innerHTML = `
            <div>
                <div style="font-weight:bold; font-size:16px;">${item}</div>
                <div style="margin-top:8px;">
                    ${
                      !isHotOnly
                        ? `<span class="temp-switch ${
                            orderState[item].temp === "ice" ? "active" : ""
                          }" onclick="toggleTemp('${item}', 'ice', this)">冰</span>`
                        : ""
                    }
                    <span class="temp-switch ${
                      isHotOnly || orderState[item].temp === "hot"
                        ? "active"
                        : ""
                    }" onclick="toggleTemp('${item}', 'hot', this)">熱</span>
                </div>
            </div>
            <div class="menu-controls">
                <button onclick="changeCount('${item}', 'drink', -1)">-</button>
                <span id="count-${item}">${orderState[item].count}</span>
                <button onclick="changeCount('${item}', 'drink', 1)">+</button>
            </div>
        `;
    dContainer.appendChild(div);
  });

  // 渲染餐點
  MENU.foods.forEach((item) => {
    if (oldState[item]) {
      orderState[item] = oldState[item];
    } else {
      orderState[item] = { type: "food", temp: null, count: 0 };
    }

    const isSoldOut = menuStatus[item] === false;

    const div = document.createElement("div");
    div.className = `menu-item ${isSoldOut ? "sold-out" : ""}`;
    div.innerHTML = `
            <div style="font-weight:bold; font-size:16px;">${item}</div>
            <div class="menu-controls">
                <button onclick="changeCount('${item}', 'food', -1)">-</button>
                <span id="count-${item}">${orderState[item].count}</span>
                <button onclick="changeCount('${item}', 'food', 1)">+</button>
            </div>
        `;
    fContainer.appendChild(div);
  });

  updateCartDisplay();
}

window.toggleTemp = (name, temp, btn) => {
  const parent = btn.parentNode;
  parent
    .querySelectorAll(".temp-switch")
    .forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  orderState[name].temp = temp;
};

window.changeCount = (name, type, delta) => {
  const newState = orderState[name].count + delta;
  if (newState < 0) return;

  // 規則檢查: 2飲 或 1飲1餐
  // 先算目前總數 (扣除當前項目舊數量)
  let currentDrink = 0;
  let currentFood = 0;
  Object.keys(orderState).forEach((key) => {
    if (key !== name) {
      if (orderState[key].type === "drink")
        currentDrink += orderState[key].count;
      if (orderState[key].type === "food") currentFood += orderState[key].count;
    }
  });

  // 加入新數量預判
  if (type === "drink") currentDrink += newState;
  if (type === "food") currentFood += newState;

  // 判斷
  const total = currentDrink + currentFood;

  if (delta > 0) {
    // 增加時才檢查上限
    if (total > 2) {
      alert("最多選擇兩項！");
      return;
    }
    if (currentFood > 1) {
      alert("餐點最多只能選一份喔！");
      return;
    }
    if (currentDrink === 0 && currentFood === 2) {
      alert("不能選兩份餐點，請搭配飲料！");
      return;
    }
  }

  orderState[name].count = newState;
  document.getElementById(`count-${name}`).textContent = newState;
  updateCartDisplay();
};

function updateCartDisplay() {
  let d = 0,
    f = 0;
  Object.values(orderState).forEach((o) => {
    if (o.type === "drink") d += o.count;
    if (o.type === "food") f += o.count;
  });
  document.getElementById("select-count-drink").textContent = d;
  document.getElementById("select-count-food").textContent = f;
}

window.submitOrder = async () => {
  let d = 0,
    f = 0;
  let items = [];
  Object.keys(orderState).forEach((key) => {
    const o = orderState[key];
    if (o.count > 0) {
      if (o.type === "drink") d += o.count;
      if (o.type === "food") f += o.count;
      items.push({
        name: key,
        count: o.count,
        temp: o.temp,
        type: o.type,
      });
    }
  });

  // 最終規則檢查
  if ((d === 2 && f === 0) || (d === 1 && f === 1)) {
    // 合格
  } else {
    alert("請選擇：兩杯飲品 或 一飲一餐");
    return;
  }

  // 獲取備註
  const noteInput = document.getElementById("order-note");
  const note = noteInput ? noteInput.value.trim() : "";

  document.getElementById("loading").style.display = "flex";

  try {
    const orderData = {
      seat: currentSeat,
      items: items,
      timestamp: Date.now(),
    };

    // 保存備註（即使為空也保存，這樣可以區分"沒有備註"和"備註為空"）
    // 但為了節省空間，如果為空字符串就不保存
    if (note && note.length > 0) {
      orderData.note = note;
    }

    await set(ref(db, "orders/" + currentUser), orderData);
    await update(ref(db, "users/" + currentUser), { status: "done" });

    // 清空備註輸入框
    if (noteInput) {
      noteInput.value = "";
    }

    document.getElementById("loading").style.display = "none";
    showPage("p-done");
  } catch (e) {
    alert("連線錯誤，請重試");
    document.getElementById("loading").style.display = "none";
    console.error(e);
  }
};

// 檢查訂單狀態並允許換位置（需已出餐）
window.checkAndGoToZones = async () => {
  if (!currentUser) {
    alert("請先完成報到");
    showPage("p-checkin");
    return;
  }

  try {
    // 檢查用戶狀態
    const userRef = ref(db, "users/" + currentUser);
    const userSnapshot = await get(userRef);

    if (!userSnapshot.exists()) {
      alert("找不到用戶資料");
      showPage("p-checkin");
      return;
    }

    const userData = userSnapshot.val();
    const userStatus = userData.status || "waiting";

    // 如果用戶已付款但沒有訂單，允許繼續完成流程
    const orderRef = ref(db, "orders/" + currentUser);
    const orderSnapshot = await get(orderRef);

    if (userStatus === "paid" && !orderSnapshot.exists()) {
      // 已付款但未完成點餐，允許繼續選擇座位和點餐
      if (userData.seat) {
        currentSeat = userData.seat;
      }
      showPage("p-zones");
      return;
    }

    // 如果有訂單，檢查是否已出餐
    if (!orderSnapshot.exists()) {
      alert("您尚未完成點餐，無法更換位置");
      return;
    }

    const orderData = orderSnapshot.val();
    const isServed = orderData.served === true;

    // 已出餐，允許進入區域選擇頁面
    if (orderData.seat) {
      currentSeat = orderData.seat;
    }
    showPage("p-zones");
  } catch (error) {
    console.error("檢查訂單狀態失敗:", error);
    alert("檢查訂單狀態時發生錯誤，請稍後再試");
  }
};

// 在首頁輸入名稱並檢查訂單狀態後進入位置表（需已出餐）
window.checkNameAndGoToZones = async () => {
  const nameInput = document.getElementById("check-seat-name");
  if (!nameInput) {
    alert("找不到輸入框");
    return;
  }

  const inputName = nameInput.value.trim();
  if (!inputName) {
    alert("請輸入您的報到名稱");
    nameInput.focus();
    return;
  }

  try {
    // 獲取所有用戶，進行大小寫不敏感的比對
    const usersRef = ref(db, "users");
    const usersSnapshot = await get(usersRef);

    if (!usersSnapshot.exists()) {
      alert("找不到此報到名稱，請確認名稱是否正確");
      nameInput.focus();
      return;
    }

    const allUsers = usersSnapshot.val() || {};
    // 找到大小寫不敏感匹配的用戶名稱（使用原始 Firebase key）
    const matchedUserName = Object.keys(allUsers).find(
      (name) => name.toLowerCase() === inputName.toLowerCase()
    );

    if (!matchedUserName) {
      alert("找不到此報到名稱，請確認名稱是否正確");
      nameInput.focus();
      return;
    }

    // 使用匹配到的原始用戶名稱
    const userData = allUsers[matchedUserName];
    const userStatus = userData.status || "waiting";

    // 檢查訂單是否存在（使用原始用戶名稱）
    const orderRef = ref(db, "orders/" + matchedUserName);
    const orderSnapshot = await get(orderRef);

    // 如果用戶已付款但沒有訂單，允許繼續完成流程（選擇座位和點餐）
    if (userStatus === "paid" && !orderSnapshot.exists()) {
      currentUser = matchedUserName;
      if (userData.seat) {
        currentSeat = userData.seat;
      }
      nameInput.value = ""; // 清空輸入框
      showPage("p-zones");
      return;
    }

    // 如果有訂單，允許查看位置表（但未出餐時無法選擇座位）
    if (orderSnapshot.exists()) {
      const orderData = orderSnapshot.val();
      currentUser = matchedUserName;
      if (orderData.seat) {
        currentSeat = orderData.seat;
      }
      nameInput.value = ""; // 清空輸入框
      showPage("p-zones");
      return;
    }

    // 如果用戶狀態是 waiting，提示先完成報到
    if (userStatus === "waiting") {
      alert("請先完成報到和付款流程");
      nameInput.focus();
      return;
    }

    // 其他情況，提示無法查看
    alert("您尚未完成點餐，無法查看位置表");
    nameInput.focus();
  } catch (error) {
    console.error("檢查訂單狀態失敗:", error);
    alert("檢查訂單狀態時發生錯誤，請稍後再試");
  }
};

// --------------------------------------------------------
// 4. 後台邏輯
// --------------------------------------------------------

// 新增名單
window.adminAddUsers = async () => {
  console.log("adminAddUsers 函數被調用");

  const textarea = document.getElementById("admin-names");
  if (!textarea) {
    alert("找不到輸入框元素");
    console.error("找不到 #admin-names 元素");
    return;
  }

  const text = textarea.value;
  console.log("輸入的文字:", text);

  // 過濾空行
  const names = text
    .split("\n")
    .map((n) => n.trim())
    .filter((n) => n !== "");

  if (names.length === 0) {
    alert("請輸入至少一個名字");
    return;
  }

  console.log("處理後的名字列表:", names);

  const updates = {};
  names.forEach((n) => {
    // Firebase Key 不能包含 . # $ [ ] /，替換為底線
    const safeName = n.replace(/[.#$[\]\/]/g, "_");
    updates[safeName] = { status: "waiting" };
  });

  console.log("準備寫入的資料:", updates);

  const loadingEl = document.getElementById("loading");

  try {
    if (loadingEl) {
      loadingEl.style.display = "flex";
    }

    console.log("開始寫入 Firebase...");

    await update(ref(db, "users"), updates);

    console.log("Firebase 寫入成功");

    if (loadingEl) {
      loadingEl.style.display = "none";
    }

    alert(`成功新增 ${Object.keys(updates).length} 位名單`);
    textarea.value = "";
    console.log("新增成功");
  } catch (error) {
    console.error("新增失敗:", error);

    if (loadingEl) {
      loadingEl.style.display = "none";
    }

    alert("新增失敗: " + (error.message || "請檢查 Firebase 權限設定"));
  }
};

window.adminClearUsers = async () => {
  const confirmed = await showConfirm(
    "警告：確定要清空所有資料嗎？\n這會刪除所有訂單、座位狀態和報到名單。",
    "確認重置"
  );
  if (confirmed) {
    try {
      await set(ref(db, "users"), null);
      await set(ref(db, "seats"), null);
      await set(ref(db, "orders"), null);
      // menu_status 不清空，保留庫存設定
      alert("活動已重置");
    } catch (error) {
      alert("重置失敗: " + (error.message || "請檢查 Firebase 權限設定"));
      console.error(error);
    }
  }
};

// 訂單過濾狀態
let orderFilter = "all"; // all, pending, served

window.filterOrders = (filter) => {
  orderFilter = filter;

  // 更新按鈕樣式
  document
    .getElementById("filter-all")
    .classList.toggle("active", filter === "all");
  document
    .getElementById("filter-pending")
    .classList.toggle("active", filter === "pending");
  document
    .getElementById("filter-served")
    .classList.toggle("active", filter === "served");

  // 重新渲染訂單列表
  loadAdminData();
};

function loadAdminData() {
  onValue(ref(db, "orders"), (snapshot) => {
    const orders = snapshot.val() || {};
    const container = document.getElementById("admin-orders");
    container.innerHTML = "";

    // 過濾訂單
    let orderList = Object.entries(orders);

    if (orderFilter === "pending") {
      orderList = orderList.filter(([_, data]) => !data.served);
    } else if (orderFilter === "served") {
      orderList = orderList.filter(([_, data]) => data.served);
    }

    // 排序：未出餐的在前，已出餐的在後；同狀態內按時間排序
    orderList.sort((a, b) => {
      const aServed = a[1].served || false;
      const bServed = b[1].served || false;
      if (aServed !== bServed) {
        return aServed ? 1 : -1; // 未出餐在前
      }
      return b[1].timestamp - a[1].timestamp; // 新的在前
    });

    if (orderList.length === 0) {
      container.innerHTML =
        '<div style="color:#666; text-align:center;">尚無訂單</div>';
      return;
    }

    orderList.forEach(([user, data]) => {
      const isServed = data.served || false;
      const div = document.createElement("div");
      div.className = `order-row ${isServed ? "done" : ""}`;

      if (isServed) {
        div.style.opacity = "0.6";
      }

      let itemStr = "";
      if (data.items && Array.isArray(data.items)) {
        data.items.forEach((i) => {
          const tagClass = i.type === "drink" ? "drink" : "food";
          const tempStr =
            i.type === "drink"
              ? i.temp === "ice"
                ? '<span style="color:#06d6a0">[冰]</span>'
                : '<span style="color:#ef233c">[熱]</span>'
              : "";
          itemStr += `<span class="tag ${tagClass}">${i.name} ${tempStr} x${i.count}</span>`;
        });
      }

      // 換算時間
      const time = new Date(data.timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      // 出餐時間
      let servedTimeStr = "";
      if (isServed && data.servedAt) {
        const servedTime = new Date(data.servedAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
        servedTimeStr = `<span style="color:var(--success); font-size:10px; margin-left:5px;">✓ ${servedTime}</span>`;
      }

      // 備註顯示 - 檢查並顯示備註
      let noteStr = "";
      if (data.note !== undefined && data.note !== null) {
        const note = String(data.note).trim();
        if (note.length > 0) {
          noteStr = `<div style="font-size:11px; color:#ffb800; margin-bottom:5px; padding:5px; background:rgba(255,184,0,0.1); border-radius:4px; border-left:3px solid #ffb800;">📝 備註：${escapeHtml(
            note
          )}</div>`;
        }
      }

      div.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
                    <span style="font-size:14px; color:var(--accent-glow); font-weight:bold;">${user}</span>
                    <span style="font-size:11px; color:#aaa;">${time}${servedTimeStr}</span>
                </div>
                <div style="font-size:11px; color:#888; margin-bottom:5px;">座位: ${
                  data.seat
                    ? data.seatReleased
                      ? `已離座`
                      : data.seat
                    : "未選座"
                }</div>
                <div style="margin-bottom:8px;">${itemStr}</div>
                ${noteStr}
                <div style="text-align:right; display:flex; gap:5px; justify-content:flex-end;">
                    ${
                      data.seat && !data.seatReleased
                        ? `<button 
                            class="btn outline" 
                            onclick="releaseSeat('${user}', '${data.seat}')"
                            style="margin:0; padding:6px 12px; font-size:11px; background:#ffb800; color:#000; border-color:#ffb800;"
                          >
                            🪑 離座
                          </button>`
                        : ""
                    }
                    ${
                      !isServed
                        ? `<button 
                            class="btn outline" 
                            onclick="markOrderServed('${user}', true)"
                            style="margin:0; padding:6px 12px; font-size:11px; background:var(--success); color:#000; border-color:var(--success);"
                          >
                            ✓ 已出餐
                          </button>`
                        : `<button 
                            class="btn outline" 
                            onclick="markOrderServed('${user}', false)"
                            style="margin:0; padding:6px 12px; font-size:11px;"
                          >
                            ↺ 取消
                          </button>`
                    }
                </div>
            `;
      container.appendChild(div);
    });
  });
}

// 離座：釋放座位讓其他人可以選擇
window.releaseSeat = async (userId, seatId) => {
  const confirmed = await showConfirm(
    `確定要讓 ${userId} 離座嗎？\n座位 ${seatId} 將被釋放，其他人可以選擇。`,
    "確認離座"
  );

  if (!confirmed) {
    return;
  }

  try {
    // 釋放座位，但保留 closed 狀態等其他屬性
    const seatRef = ref(db, "seats/" + seatId);
    await update(seatRef, { takenBy: null });

    // 清除用戶資料中的座位信息
    const userRef = ref(db, "users/" + userId);
    const userSnapshot = await get(userRef);
    if (userSnapshot.exists()) {
      await update(userRef, { seat: null });
    }

    // 更新訂單中的座位信息（保留原座位信息，但標記為已離座）
    const orderRef = ref(db, "orders/" + userId);
    const orderSnapshot = await get(orderRef);
    if (orderSnapshot.exists()) {
      // 保留原座位信息，添加離座標記
      await update(orderRef, { seatReleased: true });
    }

    showToast("座位已釋放", "success");
    // 立即更新訂單列表
    loadAdminData();
  } catch (error) {
    console.error("釋放座位失敗:", error);
    showToast(
      "釋放座位失敗: " + (error.message || "請檢查 Firebase 權限設定"),
      "error"
    );
  }
};

// 匯出所有訂單到 Excel
window.exportOrdersToExcel = async () => {
  try {
    showToast("正在匯出訂單資料...", "info", 2000);

    // 獲取所有訂單
    const ordersRef = ref(db, "orders");
    const ordersSnapshot = await get(ordersRef);
    const orders = ordersSnapshot.val() || {};

    // 獲取所有用戶資料（用於補充信息）
    const usersRef = ref(db, "users");
    const usersSnapshot = await get(usersRef);
    const users = usersSnapshot.val() || {};

    // 準備 Excel 數據
    const excelData = [];

    // 表頭
    excelData.push([
      "用戶名稱",
      "座位",
      "離座狀態",
      "訂單時間",
      "出餐狀態",
      "出餐時間",
      "飲品項目",
      "餐點項目",
      "總飲品數",
      "總餐點數",
      "備註",
    ]);

    // 處理每個訂單
    Object.entries(orders).forEach(([userId, orderData]) => {
      const userData = users[userId] || {};

      // 處理訂單項目
      const drinks = [];
      const foods = [];
      let drinkCount = 0;
      let foodCount = 0;

      if (orderData.items && Array.isArray(orderData.items)) {
        orderData.items.forEach((item) => {
          const itemName = item.name || "";
          const tempStr =
            item.temp === "ice" ? "[冰]" : item.temp === "hot" ? "[熱]" : "";
          const itemText = `${itemName} ${tempStr} x${item.count || 1}`;

          if (item.type === "drink") {
            drinks.push(itemText);
            drinkCount += item.count || 1;
          } else if (item.type === "food") {
            foods.push(itemText);
            foodCount += item.count || 1;
          }
        });
      }

      // 格式化時間
      const orderTime = orderData.timestamp
        ? new Date(orderData.timestamp).toLocaleString("zh-TW")
        : "";
      const servedTime = orderData.servedAt
        ? new Date(orderData.servedAt).toLocaleString("zh-TW")
        : "";

      // 座位狀態
      const seatStatus = orderData.seatReleased
        ? "已離座"
        : orderData.seat
        ? "在座"
        : "未選座";

      // 出餐狀態
      const servedStatus = orderData.served ? "已出餐" : "待出餐";

      // 備註
      const note = orderData.note ? orderData.note.trim() : "";

      // 添加行數據
      excelData.push([
        userId,
        orderData.seat || "未選座",
        seatStatus,
        orderTime,
        servedStatus,
        servedTime || "",
        drinks.join("; "),
        foods.join("; "),
        drinkCount,
        foodCount,
        note,
      ]);
    });

    // 創建工作簿
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(excelData);

    // 設置列寬
    ws["!cols"] = [
      { wch: 15 }, // 用戶名稱
      { wch: 12 }, // 座位
      { wch: 10 }, // 離座狀態
      { wch: 20 }, // 訂單時間
      { wch: 10 }, // 出餐狀態
      { wch: 20 }, // 出餐時間
      { wch: 40 }, // 飲品項目
      { wch: 30 }, // 餐點項目
      { wch: 12 }, // 總飲品數
      { wch: 12 }, // 總餐點數
      { wch: 30 }, // 備註
    ];

    // 添加工作表
    XLSX.utils.book_append_sheet(wb, ws, "訂單列表");

    // 生成文件名（包含當前日期時間）
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
    const timeStr = now.toTimeString().slice(0, 5).replace(/:/g, "");
    const fileName = `I人夜店訂單_${dateStr}_${timeStr}.xlsx`;

    // 下載文件
    XLSX.writeFile(wb, fileName);

    showToast(`成功匯出 ${Object.keys(orders).length} 筆訂單`, "success");
  } catch (error) {
    console.error("匯出失敗:", error);
    showToast(
      "匯出失敗: " + (error.message || "請檢查 Firebase 權限設定"),
      "error"
    );
  }
};

// 標記訂單為已出餐/取消標記
window.markOrderServed = async (userId, served) => {
  try {
    const orderRef = ref(db, "orders/" + userId);
    const snapshot = await get(orderRef);

    if (!snapshot.exists()) {
      alert("訂單不存在");
      return;
    }

    const updates = { served: served };
    if (served) {
      updates.servedAt = Date.now();
    } else {
      // 取消標記時清除出餐時間
      updates.servedAt = null;
    }

    await update(orderRef, updates);

    // 立即更新訂單列表
    loadAdminData();
  } catch (error) {
    alert("更新訂單狀態失敗: " + (error.message || "請檢查 Firebase 權限設定"));
    console.error(error);
  }
};

// 啟動座位數據監聽（當進入後台時）
let adminSeatsPollingStarted = false;
let seatsDataCache = {};
let ordersDataCache = {};

function startAdminSeatsPolling() {
  // 避免重複註冊監聽器
  if (adminSeatsPollingStarted) return;
  adminSeatsPollingStarted = true;

  const seatsRef = ref(db, "seats");
  const ordersRef = ref(db, "orders");

  // 監聽座位變化
  onValue(seatsRef, (snapshot) => {
    seatsDataCache = snapshot.val() || {};
    // 如果模态框打开，更新显示
    const seatsModal = document.getElementById("seats-modal");
    if (seatsModal && seatsModal.classList.contains("show")) {
      renderAdminSeatsWithData(seatsDataCache, ordersDataCache);
    }
  });

  // 監聽訂單變化
  onValue(ordersRef, (snapshot) => {
    ordersDataCache = snapshot.val() || {};
    // 如果模态框打开，更新显示
    const seatsModal = document.getElementById("seats-modal");
    if (seatsModal && seatsModal.classList.contains("show")) {
      renderAdminSeatsWithData(seatsDataCache, ordersDataCache);
    }
  });
}

// 顯示所有座位模态框
window.showAllSeatsModal = async () => {
  const modal = document.getElementById("seats-modal");
  if (!modal) {
    alert("找不到模态框元素");
    return;
  }

  // 顯示模态框
  modal.classList.add("show");

  // 如果有緩存數據，直接使用；否則獲取數據
  if (
    Object.keys(seatsDataCache).length === 0 ||
    Object.keys(ordersDataCache).length === 0
  ) {
    try {
      const seatsRef = ref(db, "seats");
      const ordersRef = ref(db, "orders");
      const [seatsSnapshot, ordersSnapshot] = await Promise.all([
        get(seatsRef),
        get(ordersRef),
      ]);
      seatsDataCache = seatsSnapshot.val() || {};
      ordersDataCache = ordersSnapshot.val() || {};
    } catch (error) {
      console.error("獲取座位數據失敗:", error);
      showToast("載入座位數據失敗", "error");
      return;
    }
  }

  // 渲染座位數據
  renderAdminSeatsWithData(seatsDataCache, ordersDataCache);
};

// 關閉座位模态框
window.closeSeatsModal = () => {
  const modal = document.getElementById("seats-modal");
  if (modal) {
    modal.classList.remove("show");
  }
};

// 獲取區域內所有座位的 ID
function getZoneSeatIds(zoneId) {
  const zone = ZONES.find((z) => z.id === zoneId);
  if (!zone) return [];

  const seatIds = [];

  if (zoneId === 2) {
    // 第二區特殊排列：1 2 3 7 / 5 6 4 8
    const seatOrder = [1, 2, 3, 7, 5, 6, 4, 8];
    seatOrder.forEach((seatNum) => {
      seatIds.push(`${zoneId}-${seatNum}`);
    });
  } else if (zoneId === 3) {
    // 第三區特殊排列：1 3 5 / 2 4 6
    const seatOrder = [1, 3, 5, null, 2, 4, 6, null];
    seatOrder.forEach((seatNum) => {
      if (seatNum !== null) {
        seatIds.push(`${zoneId}-${seatNum}`);
      }
    });
  } else if (zoneId === 4) {
    // 第四區特殊排列：1 (空) 3 4 / 2 (空) 5 6
    const seatOrder = [1, null, 3, 4, 2, null, 5, 6];
    seatOrder.forEach((seatNum) => {
      if (seatNum !== null) {
        seatIds.push(`${zoneId}-${seatNum}`);
      }
    });
  } else if (zoneId === 5) {
    // 第五區特殊排列：1 2 5 6 / 3 4 7 8
    const seatOrder = [1, 2, 5, 6, 3, 4, 7, 8];
    seatOrder.forEach((seatNum) => {
      seatIds.push(`${zoneId}-${seatNum}`);
    });
  } else {
    // 其他區域正常排列
    for (let seatNum = 1; seatNum <= zone.seats; seatNum++) {
      seatIds.push(`${zoneId}-${seatNum}`);
    }
  }

  return seatIds;
}

// 切換整個區域的座位狀態
window.toggleZoneAllSeats = async (zoneId) => {
  const seatIds = getZoneSeatIds(zoneId);
  if (seatIds.length === 0) return;

  // 獲取當前座位狀態
  const seatsRef = ref(db, "seats");
  const seatsSnapshot = await get(seatsRef);
  const allSeats = seatsSnapshot.val() || {};

  // 檢查區域內所有座位的狀態
  let allClosed = true;
  for (const seatId of seatIds) {
    if (!allSeats[seatId] || allSeats[seatId].closed !== true) {
      allClosed = false;
      break;
    }
  }

  // 決定要設定的狀態（如果全部關閉則開啟，否則關閉）
  const newClosedStatus = !allClosed;

  // 批量更新所有座位
  const updates = {};
  for (const seatId of seatIds) {
    if (!allSeats[seatId]) {
      updates[seatId] = { closed: newClosedStatus };
    } else {
      updates[seatId] = { ...allSeats[seatId], closed: newClosedStatus };
    }
  }

  try {
    await update(seatsRef, updates);
    showToast(
      newClosedStatus ? "已關閉整區" : "已開啟整區",
      newClosedStatus ? "info" : "success"
    );
  } catch (error) {
    console.error("更新座位狀態失敗:", error);
    showToast("更新失敗", "error");
  }
};

// 使用已有數據渲染座位（避免重複獲取）
function renderAdminSeatsWithData(seats, orders) {
  const container = document.getElementById("admin-seats-list");
  if (!container) return;

  container.innerHTML = "";

  // 遍歷所有區域
  ZONES.forEach((zone) => {
    // 創建區域標題容器
    const zoneTitleContainer = document.createElement("div");
    zoneTitleContainer.style.display = "flex";
    zoneTitleContainer.style.justifyContent = "space-between";
    zoneTitleContainer.style.alignItems = "center";
    zoneTitleContainer.style.marginBottom = "10px";

    const zoneTitle = document.createElement("h4");
    zoneTitle.textContent = zone.name;
    zoneTitle.style.margin = "0";
    zoneTitle.style.fontSize = "13px";
    zoneTitle.style.color = "var(--accent-glow)";
    zoneTitle.style.flex = "1";
    zoneTitleContainer.appendChild(zoneTitle);

    // 檢查區域內所有座位的狀態
    const seatIds = getZoneSeatIds(zone.id);
    let allClosed = true;
    if (seatIds.length > 0) {
      for (const seatId of seatIds) {
        if (!seats[seatId] || seats[seatId].closed !== true) {
          allClosed = false;
          break;
        }
      }
    }

    // 創建關閉/開啟整區按鈕
    const toggleZoneBtn = document.createElement("button");
    toggleZoneBtn.className = "btn outline";
    toggleZoneBtn.textContent = allClosed ? "🔓 開啟整區" : "🔒 關閉整區";
    toggleZoneBtn.style.cssText =
      "padding: 2px 6px !important; font-size: 10px !important; margin: 0 !important; flex-shrink: 0; white-space: nowrap; min-width: auto !important; width: auto !important; line-height: 1.2;";
    toggleZoneBtn.onclick = () => toggleZoneAllSeats(zone.id);
    zoneTitleContainer.appendChild(toggleZoneBtn);

    // 創建區域容器
    const zoneDiv = document.createElement("div");
    zoneDiv.style.marginBottom = "15px";
    zoneDiv.style.padding = "12px";
    zoneDiv.style.background = "#1a1a24";
    zoneDiv.style.borderRadius = "8px";
    zoneDiv.style.border = "2px solid rgb(51, 51, 51)";
    zoneDiv.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.3)";

    zoneDiv.appendChild(zoneTitleContainer);

    // 創建座位網格（使用與選擇座位相同的樣式）
    const seatsGrid = document.createElement("div");
    seatsGrid.className = "seat-grid";

    const zoneId = zone.id;

    // 根據區域使用相同的排列邏輯
    if (zoneId === 2) {
      // 第二區特殊排列：1 2 3 7 / 5 6 4 8
      const seatOrder = [1, 2, 3, 7, 5, 6, 4, 8];
      seatOrder.forEach((seatNum) => {
        const seatId = `${zoneId}-${seatNum}`;
        const seatData = seats[seatId] || {};
        const takenBy = seatData.takenBy || null;
        const isClosed = seatData.closed === true;

        let isServed = false;
        if (takenBy && orders[takenBy]) {
          isServed = orders[takenBy].served === true;
        }

        const btn = createSeatElement(
          seatNum,
          seatId,
          takenBy,
          isServed,
          seatNum === 7 || seatNum === 8,
          isClosed
        );
        seatsGrid.appendChild(btn);
      });
    } else if (zoneId === 3) {
      // 第三區特殊排列：1 3 5 / 2 4 6
      const seatOrder = [1, 3, 5, null, 2, 4, 6, null];
      seatOrder.forEach((seatNum) => {
        if (seatNum === null) {
          const emptyDiv = document.createElement("div");
          emptyDiv.style.visibility = "hidden";
          seatsGrid.appendChild(emptyDiv);
        } else {
          const seatId = `${zoneId}-${seatNum}`;
          const seatData = seats[seatId] || {};
          const takenBy = seatData.takenBy || null;
          const isClosed = seatData.closed === true;

          let isServed = false;
          if (takenBy && orders[takenBy]) {
            isServed = orders[takenBy].served === true;
          }

          const btn = createSeatElement(
            seatNum,
            seatId,
            takenBy,
            isServed,
            true,
            isClosed
          );
          seatsGrid.appendChild(btn);
        }
      });
    } else if (zoneId === 4) {
      // 第四區特殊排列：1 (空) 3 4 / 2 (空) 5 6
      const seatOrder = [1, null, 3, 4, 2, null, 5, 6];
      seatOrder.forEach((seatNum) => {
        if (seatNum === null) {
          const emptyDiv = document.createElement("div");
          emptyDiv.style.visibility = "hidden";
          seatsGrid.appendChild(emptyDiv);
        } else {
          const seatId = `${zoneId}-${seatNum}`;
          const seatData = seats[seatId] || {};
          const takenBy = seatData.takenBy || null;
          const isClosed = seatData.closed === true;

          let isServed = false;
          if (takenBy && orders[takenBy]) {
            isServed = orders[takenBy].served === true;
          }

          const btn = createSeatElement(
            seatNum,
            seatId,
            takenBy,
            isServed,
            seatNum === 3 || seatNum === 4 || seatNum === 5 || seatNum === 6,
            isClosed
          );
          seatsGrid.appendChild(btn);
        }
      });
    } else if (zoneId === 5) {
      // 第五區特殊排列：1 2 5 6 / 3 4 7 8
      const seatOrder = [1, 2, 5, 6, 3, 4, 7, 8];
      seatOrder.forEach((seatNum) => {
        const seatId = `${zoneId}-${seatNum}`;
        const seatData = seats[seatId] || {};
        const takenBy = seatData.takenBy || null;
        const isClosed = seatData.closed === true;

        let isServed = false;
        if (takenBy && orders[takenBy]) {
          isServed = orders[takenBy].served === true;
        }

        const btn = createSeatElement(
          seatNum,
          seatId,
          takenBy,
          isServed,
          seatNum === 5 || seatNum === 6 || seatNum === 7 || seatNum === 8,
          isClosed
        );
        seatsGrid.appendChild(btn);
      });
    } else {
      // 其他區域正常排列
      for (let seatNum = 1; seatNum <= zone.seats; seatNum++) {
        const seatId = `${zoneId}-${seatNum}`;
        const seatData = seats[seatId] || {};
        const takenBy = seatData.takenBy || null;
        const isClosed = seatData.closed === true;

        let isServed = false;
        if (takenBy && orders[takenBy]) {
          isServed = orders[takenBy].served === true;
        }

        const btn = createSeatElement(
          seatNum,
          seatId,
          takenBy,
          isServed,
          zone.type === "rect",
          isClosed
        );
        seatsGrid.appendChild(btn);
      }
    }

    zoneDiv.appendChild(seatsGrid);
    container.appendChild(zoneDiv);
  });
}

// 創建座位元素（使用與選擇座位相同的樣式）
function createSeatElement(
  seatNum,
  seatId,
  takenBy,
  isServed,
  isSquare,
  isClosed
) {
  const btn = document.createElement("div");
  btn.className = "seat";
  if (isSquare) btn.classList.add("square");

  // 如果座位被關閉
  if (isClosed) {
    btn.classList.add("closed");
    btn.style.opacity = "0.5";
    btn.style.background = "#333";
    btn.style.border = "2px dashed #666";
    btn.style.cursor = "pointer";

    const content = document.createElement("div");
    content.style.display = "flex";
    content.style.flexDirection = "column";
    content.style.alignItems = "center";
    content.style.justifyContent = "center";
    content.style.width = "100%";
    content.style.height = "100%";
    content.style.padding = "4px";

    const seatNumEl = document.createElement("div");
    seatNumEl.textContent = seatNum;
    seatNumEl.style.fontWeight = "bold";
    seatNumEl.style.fontSize = "14px";
    seatNumEl.style.marginBottom = "5px";
    seatNumEl.style.color = "#888";
    content.appendChild(seatNumEl);

    const closedText = document.createElement("div");
    closedText.textContent = "今日未開啟";
    closedText.style.fontSize = "10px";
    closedText.style.color = "#666";
    closedText.style.textAlign = "center";
    content.appendChild(closedText);

    btn.appendChild(content);

    // 添加點擊事件切換關閉狀態
    btn.onclick = async () => {
      try {
        const seatRef = ref(db, "seats/" + seatId);
        const seatSnapshot = await get(seatRef);
        const currentData = seatSnapshot.exists() ? seatSnapshot.val() : {};

        // 移除關閉標記
        await update(seatRef, { closed: null });
        showToast("座位已開啟", "success");
      } catch (error) {
        console.error("開啟座位失敗:", error);
        showToast("開啟座位失敗", "error");
      }
    };

    return btn;
  }

  // 如果座位被占用
  if (takenBy) {
    btn.classList.add("taken");
    if (isServed) {
      btn.classList.add("served");
    } else {
      btn.classList.add("pending");
    }
    btn.style.position = "relative";

    // 創建內容容器
    const content = document.createElement("div");
    content.style.display = "flex";
    content.style.flexDirection = "column";
    content.style.alignItems = "center";
    content.style.justifyContent = "center";
    content.style.width = "100%";
    content.style.height = "100%";
    content.style.padding = "4px";
    content.style.fontSize = "10px";
    content.style.lineHeight = "1.3";

    // 座位編號
    const seatNumEl = document.createElement("div");
    seatNumEl.textContent = seatNum;
    seatNumEl.style.fontWeight = "bold";
    seatNumEl.style.fontSize = "14px";
    seatNumEl.style.marginBottom = "3px";
    content.appendChild(seatNumEl);

    // 用戶名稱（完整顯示）
    const userNameEl = document.createElement("div");
    userNameEl.textContent = takenBy;
    userNameEl.style.fontSize = "16px";
    userNameEl.style.color = "var(--accent-glow)";
    userNameEl.style.marginBottom = "3px";
    userNameEl.style.wordBreak = "break-word";
    userNameEl.style.textAlign = "center";
    userNameEl.style.lineHeight = "1.2";
    content.appendChild(userNameEl);

    // 出餐狀態
    const statusEl = document.createElement("div");
    if (isServed) {
      statusEl.textContent = "✓";
      statusEl.style.color = "var(--success)";
      statusEl.style.fontSize = "12px";
      statusEl.style.fontWeight = "bold";
    } else {
      statusEl.textContent = "⏳";
      statusEl.style.color = "#ffb800";
      statusEl.style.fontSize = "12px";
      statusEl.style.fontWeight = "bold";
    }
    content.appendChild(statusEl);

    btn.appendChild(content);

    // 添加 title 提示
    btn.title = `${seatId}\n${takenBy}\n${isServed ? "已出餐" : "待出餐"}`;
  } else {
    // 空座位
    btn.textContent = seatNum;
    btn.title = `${seatId} - 空位（點擊可關閉）`;
    btn.style.cursor = "pointer";

    // 添加點擊事件切換關閉狀態
    btn.onclick = async () => {
      try {
        const seatRef = ref(db, "seats/" + seatId);
        // 設置關閉標記
        await update(seatRef, { closed: true });
        showToast("座位已關閉", "info");
      } catch (error) {
        console.error("關閉座位失敗:", error);
        showToast("關閉座位失敗", "error");
      }
    };
  }

  return btn;
}

// 切換前台開關面板
window.toggleMaintenancePanel = () => {
  const panel = document.getElementById("maintenance-panel");
  const toggleBtn = document.getElementById("maintenance-toggle-btn");

  if (!panel || !toggleBtn) return;

  const isVisible = panel.style.display !== "none";

  if (isVisible) {
    panel.style.display = "none";
    toggleBtn.textContent = "⚙️ 前台開關";
  } else {
    panel.style.display = "block";
    toggleBtn.textContent = "⚙️ 前台開關";
  }
};

// 切換位置與區域管理面板
window.toggleSeatsZonesPanel = () => {
  const panel = document.getElementById("seats-zones-panel");
  const toggleBtn = document.getElementById("seats-zones-toggle-btn");

  if (!panel || !toggleBtn) return;

  const isVisible = panel.style.display !== "none";

  if (isVisible) {
    panel.style.display = "none";
    toggleBtn.textContent = "🪑 位置與區域";
  } else {
    panel.style.display = "block";
    toggleBtn.textContent = "🪑 位置與區域";
  }
};

// 切換報到名單面板
window.toggleNamesPanel = () => {
  const panel = document.getElementById("names-panel");
  const toggleBtn = document.getElementById("names-toggle-btn");

  if (!panel || !toggleBtn) return;

  const isVisible = panel.style.display !== "none";

  if (isVisible) {
    panel.style.display = "none";
    toggleBtn.textContent = "📝 報到名單";
  } else {
    panel.style.display = "block";
    toggleBtn.textContent = "📝 報到名單";
  }
};

// 切換區域列表顯示
window.toggleZonesList = () => {
  const container = document.getElementById("admin-zones-list");
  const toggleBtn = document.getElementById("zones-toggle-btn");

  if (!container || !toggleBtn) return;

  const isVisible = container.style.display !== "none";

  if (isVisible) {
    container.style.display = "none";
    toggleBtn.textContent = "✏️ 區域內容管理";
  } else {
    container.style.display = "block";
    toggleBtn.textContent = "✏️ 收合區域管理";
    // 如果列表為空，則渲染
    if (container.innerHTML === "") {
      renderAdminZones();
    }
  }
};

// 區域管理渲染
function renderAdminZones() {
  const container = document.getElementById("admin-zones-list");
  if (!container) return;

  container.innerHTML = "";

  // 從 Firebase 讀取區域內容
  const zonesRef = ref(db, "zones_content");
  get(zonesRef)
    .then((snapshot) => {
      const zonesContent = snapshot.exists() ? snapshot.val() : {};

      ZONES.forEach((zone) => {
        const zoneId = zone.id;
        const savedContent = zonesContent[zoneId] || {};
        const defaultParts = parseZoneDesc(zone.desc);

        // 使用保存的內容或默認值
        const status = savedContent.status || defaultParts.status;
        const task = savedContent.task || defaultParts.task;
        const reminder = savedContent.reminder || defaultParts.reminder;

        const zoneDiv = document.createElement("div");
        zoneDiv.style.marginBottom = "15px";
        zoneDiv.style.padding = "12px";
        zoneDiv.style.background = "#1a1a24";
        zoneDiv.style.borderRadius = "6px";
        zoneDiv.style.border = "1px solid #333";

        zoneDiv.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; gap: 10px;">
          <h4 style="margin: 0; font-size: 14px; color: var(--accent-glow); flex: 1;">${
            zone.name
          }</h4>
          <button 
            class="btn outline" 
            onclick="editZone(${zoneId})"
            style="padding: 2px 6px !important; font-size: 10px !important; margin: 0 !important; flex-shrink: 0; white-space: nowrap; min-width: auto !important; width: auto !important; line-height: 1.2;"
          >
            編輯
          </button>
        </div>
        <div style="font-size: 11px; color: #888; line-height: 1.5;">
          <div style="margin-bottom: 5px;"><strong>狀態：</strong>${status.substring(
            0,
            50
          )}${status.length > 50 ? "..." : ""}</div>
          <div style="margin-bottom: 5px;"><strong>任務：</strong>${task.substring(
            0,
            50
          )}${task.length > 50 ? "..." : ""}</div>
          <div><strong>提醒：</strong>${reminder.substring(0, 50)}${
          reminder.length > 50 ? "..." : ""
        }</div>
        </div>
      `;

        container.appendChild(zoneDiv);
      });
    })
    .catch((error) => {
      console.error("讀取區域內容失敗:", error);
      showToast("載入區域內容失敗", "error");
    });
}

// 編輯區域
window.editZone = async (zoneId) => {
  const modal = document.getElementById("zone-edit-modal");
  const titleEl = document.getElementById("zone-edit-title");
  const statusInput = document.getElementById("zone-edit-status");
  const taskInput = document.getElementById("zone-edit-task");
  const reminderInput = document.getElementById("zone-edit-reminder");
  const saveBtn = document.getElementById("zone-edit-save");
  const cancelBtn = document.getElementById("zone-edit-cancel");

  if (!modal || !statusInput || !taskInput || !reminderInput) {
    alert("找不到編輯區域的元素");
    return;
  }

  const zone = ZONES.find((z) => z.id === zoneId);
  if (!zone) {
    alert("找不到區域");
    return;
  }

  // 從 Firebase 讀取保存的內容
  try {
    const zonesRef = ref(db, "zones_content/" + zoneId);
    const snapshot = await get(zonesRef);
    const savedContent = snapshot.exists() ? snapshot.val() : {};
    const defaultParts = parseZoneDesc(zone.desc);

    // 填充輸入框（優先使用保存的內容）
    statusInput.value = savedContent.status || defaultParts.status;
    taskInput.value = savedContent.task || defaultParts.task;
    reminderInput.value = savedContent.reminder || defaultParts.reminder;
  } catch (error) {
    console.error("讀取區域內容失敗:", error);
    // 如果讀取失敗，使用默認值
    const defaultParts = parseZoneDesc(zone.desc);
    statusInput.value = defaultParts.status;
    taskInput.value = defaultParts.task;
    reminderInput.value = defaultParts.reminder;
  }

  // 設置標題
  if (titleEl) {
    titleEl.textContent = `編輯 ${zone.name}`;
  }

  // 顯示 modal
  modal.classList.add("show");

  // 保存按鈕事件
  const handleSave = async () => {
    const status = statusInput.value.trim();
    const task = taskInput.value.trim();
    const reminder = reminderInput.value.trim();

    if (!status && !task && !reminder) {
      showToast("請至少填寫一項內容", "error");
      return;
    }

    try {
      const zonesRef = ref(db, "zones_content/" + zoneId);
      await update(zonesRef, {
        status: status,
        task: task,
        reminder: reminder,
      });

      modal.classList.remove("show");
      showToast("區域內容已更新", "success");

      // 重新渲染區域管理列表和區域顯示
      renderAdminZones();
      renderZones();

      // 移除事件監聽器
      saveBtn.onclick = null;
      cancelBtn.onclick = null;
      modal.onclick = null;
    } catch (error) {
      console.error("保存區域內容失敗:", error);
      showToast(
        "保存失敗: " + (error.message || "請檢查 Firebase 權限設定"),
        "error"
      );
    }
  };

  // 取消按鈕事件
  const handleCancel = () => {
    modal.classList.remove("show");
    // 移除事件監聽器
    saveBtn.onclick = null;
    cancelBtn.onclick = null;
    modal.onclick = null;
  };

  // 添加事件監聽器
  saveBtn.onclick = handleSave;
  cancelBtn.onclick = handleCancel;

  // 點擊背景關閉
  const handleModalClick = (e) => {
    if (e.target === modal) {
      handleCancel();
    }
  };
  modal.onclick = handleModalClick;
};

// 庫存渲染
function renderAdminStock() {
  const container = document.getElementById("admin-stock-list");
  container.innerHTML = "";

  const allItems = [...MENU.drinks, ...MENU.foods];

  allItems.forEach((item) => {
    const isAvailable = menuStatus[item] !== false; // default true
    const btn = document.createElement("button");
    btn.className = `stock-btn ${isAvailable ? "active" : "out"}`;
    btn.textContent = `${item} ${isAvailable ? "(販售中)" : "(完售)"}`;

    btn.onclick = async () => {
      try {
        await update(ref(db, "menu_status"), {
          [item]: !isAvailable,
        });
      } catch (error) {
        console.error(error);
        alert("更新狀態失敗: " + (error.message || "請檢查 Firebase 權限設定"));
      }
    };
    container.appendChild(btn);
  });
}

window.logoutAdmin = () => {
  showPage("p-checkin");
  // 手動觸發一次用戶列表更新，確保登出後立即顯示最新名單
  setTimeout(() => {
    const usersRef = ref(db, "users");
    get(usersRef)
      .then((snapshot) => {
        const users = snapshot.val() || {};
        updateUserList(users);
      })
      .catch((error) => {
        console.error("獲取用戶列表失敗:", error);
      });
  }, 100);
};

// 切換維護模式
window.toggleMaintenance = async () => {
  const toggle = document.getElementById("maintenance-toggle");
  const statusText = document.getElementById("maintenance-status");
  const slider = document.getElementById("maintenance-slider");
  const sliderThumb = document.getElementById("maintenance-slider-thumb");

  if (!toggle) return;

  const isMaintenance = toggle.checked;

  try {
    await set(ref(db, "system/maintenance"), isMaintenance);

    // 更新 UI
    if (statusText) {
      statusText.textContent = isMaintenance
        ? "狀態：前台已關閉（顯示休息中）"
        : "狀態：前台正常運作";
      statusText.style.color = isMaintenance ? "#ef233c" : "#888";
    }

    if (slider) {
      slider.style.backgroundColor = isMaintenance ? "#ef233c" : "#06d6a0";
    }

    if (sliderThumb) {
      sliderThumb.style.transform = isMaintenance
        ? "translateX(30px)"
        : "translateX(0)";
    }
  } catch (error) {
    console.error("切換維護模式失敗:", error);
    alert("切換失敗: " + (error.message || "請檢查 Firebase 權限設定"));
    // 恢復開關狀態
    toggle.checked = !isMaintenance;
  }
};

// 初始化維護模式開關狀態
function initMaintenanceToggle() {
  const maintenanceRef = ref(db, "system/maintenance");
  onValue(maintenanceRef, (snapshot) => {
    const isMaintenance = snapshot.val() === true;
    const toggle = document.getElementById("maintenance-toggle");
    const statusText = document.getElementById("maintenance-status");
    const slider = document.getElementById("maintenance-slider");
    const sliderThumb = document.getElementById("maintenance-slider-thumb");

    if (toggle) {
      toggle.checked = isMaintenance;
    }

    if (statusText) {
      statusText.textContent = isMaintenance
        ? "狀態：前台已關閉（顯示休息中）"
        : "狀態：前台正常運作";
      statusText.style.color = isMaintenance ? "#ef233c" : "#888";
    }

    if (slider) {
      slider.style.backgroundColor = isMaintenance ? "#ef233c" : "#06d6a0";
    }

    if (sliderThumb) {
      sliderThumb.style.transform = isMaintenance
        ? "translateX(30px)"
        : "translateX(0)";
    }
  });
}

// 當進入後台頁面時初始化開關
window.promptAdmin = () => {
  const modal = document.getElementById("password-modal");
  const input = document.getElementById("password-input");
  const submitBtn = document.getElementById("password-submit");
  const cancelBtn = document.getElementById("password-cancel");

  if (!modal || !input) {
    // 回退到原生 prompt
    const pwd = prompt("請輸入管理員密碼");
    if (pwd === "13491349") {
      showPage("p-admin");
      loadAdminData();
      renderAdminStock();
      startAdminSeatsPolling();
      initMaintenanceToggle();
    } else if (pwd !== null) {
      alert("密碼錯誤");
    }
    return;
  }

  // 顯示 modal
  modal.classList.add("show");
  input.value = "";
  input.focus();

  // 確認按鈕
  const handleSubmit = () => {
    const pwd = input.value.trim();
    if (pwd === "13491349") {
      modal.classList.remove("show");
      showPage("p-admin");
      loadAdminData();
      renderAdminStock();
      startAdminSeatsPolling();
      initMaintenanceToggle();
    } else if (pwd !== "") {
      showToast("密碼錯誤", "error");
      input.value = "";
      input.focus();
    }
  };

  // 取消按鈕
  const handleCancel = () => {
    modal.classList.remove("show");
  };

  // 添加事件監聽器
  submitBtn.onclick = handleSubmit;
  cancelBtn.onclick = handleCancel;

  // 按 Enter 鍵提交
  input.onkeypress = (e) => {
    if (e.key === "Enter") {
      handleSubmit();
    }
  };

  // 點擊背景關閉
  const handleModalClick = (e) => {
    if (e.target === modal) {
      handleCancel();
    }
  };
  modal.onclick = handleModalClick;
};

window.showPage = (id) => {
  // 確保目標頁面存在
  const targetPage = document.getElementById(id);
  if (!targetPage) {
    console.error(`頁面 ${id} 不存在`);
    return;
  }

  // 移除所有頁面的 active 類
  document
    .querySelectorAll(".page")
    .forEach((p) => p.classList.remove("active"));

  // 添加目標頁面的 active 類
  targetPage.classList.add("active");

  // 滾動到頂部
  window.scrollTo(0, 0);

  // 如果切換到區域選擇頁面，立即更新區域列表
  if (id === "p-zones") {
    renderZones();
    // 延遲初始化，確保DOM已更新（如果還沒初始化）
    setTimeout(() => {
      if (!zoneSwiperInitialized) {
        initZoneSwiper();
      }
    }, 100);
  }

  // 如果切換到報到頁面，檢查維護模式狀態
  if (id === "p-checkin") {
    const maintenanceRef = ref(db, "system/maintenance");
    get(maintenanceRef)
      .then((snapshot) => {
        const isMaintenance = snapshot.val() === true;
        if (isMaintenance) {
          // 如果維護模式開啟，切換到維護頁面
          showPage("p-maintenance");
        } else {
          // 如果維護模式關閉，確保顯示報到頁面並更新用戶列表
          setTimeout(() => {
            const usersRef = ref(db, "users");
            get(usersRef)
              .then((snapshot) => {
                const users = snapshot.val() || {};
                updateUserList(users);
              })
              .catch((error) => {
                console.error("獲取用戶列表失敗:", error);
              });
          }, 100);
        }
      })
      .catch((error) => {
        console.error("檢查維護模式失敗:", error);
      });
  }

  console.log(`切換到頁面: ${id}`);
};

// 確保按鈕事件在頁面加載後正確綁定
setTimeout(() => {
  const addUsersBtn = document.querySelector(
    'button[onclick="adminAddUsers()"]'
  );
  if (addUsersBtn) {
    console.log("找到新增名單按鈕，綁定事件監聽器");
    addUsersBtn.addEventListener(
      "click",
      (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log("按鈕被點擊（事件監聽器）");
        if (window.adminAddUsers) {
          window.adminAddUsers();
        }
      },
      true
    );
  }

  const clearUsersBtn = document.querySelector(
    'button[onclick="adminClearUsers()"]'
  );
  if (clearUsersBtn) {
    clearUsersBtn.addEventListener(
      "click",
      (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (window.adminClearUsers) {
          window.adminClearUsers();
        }
      },
      true
    );
  }
}, 100);

// 綁定匯出 Excel 按鈕
setTimeout(() => {
  const exportBtn = document.getElementById("export-excel-btn");
  if (exportBtn) {
    exportBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (window.exportOrdersToExcel) {
        window.exportOrdersToExcel();
      } else {
        console.error("exportOrdersToExcel 函數未定義");
        alert("匯出功能尚未準備就緒，請稍後再試");
      }
    });
  }
}, 200);

// 確保 toast 在頁面加載後可用
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM 加載完成，Toast 已準備就緒");
  });
} else {
  console.log("DOM 已就緒，Toast 已準備就緒");
}

// 點擊背景關閉座位模态框
setTimeout(() => {
  const seatsModal = document.getElementById("seats-modal");
  if (seatsModal) {
    seatsModal.addEventListener("click", (e) => {
      if (e.target === seatsModal) {
        closeSeatsModal();
      }
    });
  }
}, 100);

console.log("模組加載完成");
console.log("使用 Firebase Realtime Database");
