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

// Firebase 配置
const firebaseConfig = {
  apiKey: "AIzaSyC856BX7Sl6iHyjDIyOwe4nh5Q1Pea-tvk",
  authDomain: "yermo-acf82.firebaseapp.com",
  databaseURL:
    "https://yermo-acf82-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "yermo-acf82",
  storageBucket: "yermo-acf82.firebasestorage.app",
  messagingSenderId: "802358752702",
  appId: "1:802358752702:web:192c3e5f7f6a9f7f8e35ef",
  measurementId: "G-47QMRFYW7C",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// --------------------------------------------------------
// 2. 資料結構與全域變數
// --------------------------------------------------------
let currentUser = null;
let currentSeat = null;
let menuStatus = {}; // 儲存餐點庫存狀態

// 自定義提示框函數（替代 alert，適配平板）
window.showToast = (message, type = "info", duration = 3000) => {
  const toast = document.getElementById("toast");
  const toastMessage = document.getElementById("toast-message");

  if (!toast || !toastMessage) {
    // 如果找不到元素，回退到 alert
    alert(message);
    return;
  }

  toastMessage.textContent = message;
  toast.className = `toast ${type}`;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
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

// 區域資料 (完全依照需求文字)
const ZONES = [
  {
    id: 1,
    name: "第一區 - 突破自我區",
    seats: 8,
    type: "rect", // 長桌
    desc: `狀態：你今天的能量適合交朋友嗎？那就大膽選擇這區吧！\n\n任務：桌子的中間有療癒卡，請誠心的回想自己最近的狀態，並抽取一張小卡，將內容寫在紙上，並與鄰近的人交換狀態！\n\n提醒：有時候突破是需要一點勇氣，而今天的你選擇這裡就已充滿勇氣，所以不要害怕當主動的那個人，說不定會得到意外的收穫唷！`,
  },
  {
    id: 2,
    name: "第二區 - 自由漂流區",
    seats: 8, // 圓桌6 + 邊桌2
    type: "round",
    desc: `狀態：今天的能量已經耗盡了嗎？請從野陌獲得療癒的力量吧！\n\n任務：放空也好、聽音樂也行，坐累了就起來晃晃吧！整棟建築物都可以盡情探索～\n\n提醒：二樓有個神秘的門，打開後是個能夠好好呼吸的露台；三樓則是植物的家，可以四處瞧瞧！`,
  },
  {
    id: 3,
    name: "第三區 - 看書共存區",
    seats: 6, // 沙發4 + 邊桌2
    type: "sofa",
    desc: `狀態：一直沒有空間好好看書？那就選一個你喜歡的位置，將書打開吧！\n\n任務：任務開始前請專心看書，我們將於22:00 邀請大家分享今天帶來的是什麼書；若不想參與可於活動前更換位置。\n\n提醒：各看各的書再彼此推薦就是最適合i人的讀書會，簡單的分享也是分享，一切活動皆採鼓勵制，請不要有壓力！`,
  },
  {
    id: 4,
    name: "第四區 - 工作寫字區",
    seats: 6, // 3個木桌 * 2
    type: "rect",
    desc: `狀態：你今天的工作或讀書目標尚未達成嗎？辛苦你了！讓我們一起加油加油～\n\n任務：今日進度未完成前，請保持安靜。\n嚴禁講話及交談！\n\n提醒：若需要手機代保管服務，請找老闆！`,
  },
  {
    id: 5,
    name: "第五區 - 冥想占卜區",
    seats: 8, // 2圓桌*2 + 2方桌*2 = 8位
    type: "mix",
    desc: `狀態：最近非常迷惘嗎？或者遲遲無法放鬆下來呢？戴上妳的耳機，進入神奇的世界吧！\n\n任務：老闆會將適合您的影片傳給您，請跟隨影片的內容進行今日的任務！\n\n提醒：一定要戴上你的耳機，請勿影響他人。`,
  },
];

const MENU = {
  drinks: ["美式", "拿鐵", "可可牛奶", "黑糖鮮奶", "伯爵茶", "洋甘菊茶(僅熱)"],
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

// 區域顯示
const zoneContainer = document.getElementById("zone-container");
ZONES.forEach((zone) => {
  const div = document.createElement("div");
  div.className = "zone-card";
  div.innerHTML = `
        <div class="zone-title">${zone.name}</div>
        <div class="zone-desc">${zone.desc}</div>
        <button class="btn outline" style="margin-top:10px; padding:12px; border-radius:8px;" onclick="openZone(${zone.id})">
            選擇此區座位 →
        </button>
    `;
  zoneContainer.appendChild(div);
});

window.openZone = async (zoneId) => {
  const zone = ZONES.find((z) => z.id === zoneId);
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

          if (
            allSeats[seatId] &&
            allSeats[seatId].takenBy &&
            allSeats[seatId].takenBy !== currentUser
          ) {
            btn.classList.add("taken");
            btn.title = "已有人";
          } else {
            btn.onclick = () => selectSeatTemp(seatId, btn);
          }

          // 保持當前選擇
          if (currentSeat === seatId) btn.classList.add("selected");

          grid.appendChild(btn);
        });
      } else if (zoneId === 3) {
        // 第三區特殊排列：1 (空) 3 4 / 2 (空) 5 6
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

            // 第三區：第3、4、5、6號座位是方的
            if (
              seatNum === 3 ||
              seatNum === 4 ||
              seatNum === 5 ||
              seatNum === 6
            )
              btn.classList.add("square");

            if (
              allSeats[seatId] &&
              allSeats[seatId].takenBy &&
              allSeats[seatId].takenBy !== currentUser
            ) {
              btn.classList.add("taken");
              btn.title = "已有人";
            } else {
              btn.onclick = () => selectSeatTemp(seatId, btn);
            }

            // 保持當前選擇
            if (currentSeat === seatId) btn.classList.add("selected");

            grid.appendChild(btn);
          }
        });
      } else if (zoneId === 4) {
        // 第四區特殊排列：1 3 5 / 2 4 6
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

            // 第四區：所有座位都是方的（rect類型）
            btn.classList.add("square");

            if (
              allSeats[seatId] &&
              allSeats[seatId].takenBy &&
              allSeats[seatId].takenBy !== currentUser
            ) {
              btn.classList.add("taken");
              btn.title = "已有人";
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

            if (
              allSeats[seatId] &&
              allSeats[seatId].takenBy &&
              allSeats[seatId].takenBy !== currentUser
            ) {
              btn.classList.add("taken");
              btn.title = "已有人";
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

          if (
            allSeats[seatId] &&
            allSeats[seatId].takenBy &&
            allSeats[seatId].takenBy !== currentUser
          ) {
            btn.classList.add("taken");
            btn.title = "已有人";
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
          // 釋放舊座位
          await set(oldSeatRef, { takenBy: null });
        }
      }
    }

    // 鎖定新座位
    await set(seatRef, { takenBy: currentUser });
    await update(ref(db, "users/" + currentUser), { seat: currentSeat });

    // 檢查訂單狀態
    const orderRef = ref(db, "orders/" + currentUser);
    const orderSnapshot = await get(orderRef);

    if (orderSnapshot.exists()) {
      // 如果已有訂單，更新座位信息
      await update(orderRef, { seat: currentSeat });

      // 檢查是否已出餐
      const orderData = orderSnapshot.val();
      const isServed = orderData.served === true;

      if (isServed) {
        // 已出餐，只能換位置，不進入點餐頁面
        alert("位置已更新！您已出餐完成，無法再次點餐。");
        showPage("p-done");
        return;
      }
    }

    // 未出餐或沒有訂單，進入點餐頁面
    renderMenu();
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

  document.getElementById("loading").style.display = "flex";

  try {
    await set(ref(db, "orders/" + currentUser), {
      seat: currentSeat,
      items: items,
      timestamp: Date.now(),
    });
    await update(ref(db, "users/" + currentUser), { status: "done" });

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

    if (!isServed) {
      alert("請等待餐點出餐完成後，才能更換位置");
      return;
    }

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
    // 檢查用戶是否存在
    const userRef = ref(db, "users/" + inputName);
    const userSnapshot = await get(userRef);

    if (!userSnapshot.exists()) {
      alert("找不到此報到名稱，請確認名稱是否正確");
      nameInput.focus();
      return;
    }

    const userData = userSnapshot.val();
    const userStatus = userData.status || "waiting";

    // 檢查訂單是否存在
    const orderRef = ref(db, "orders/" + inputName);
    const orderSnapshot = await get(orderRef);

    // 如果用戶已付款但沒有訂單，允許繼續完成流程（選擇座位和點餐）
    if (userStatus === "paid" && !orderSnapshot.exists()) {
      currentUser = inputName;
      if (userData.seat) {
        currentSeat = userData.seat;
      }
      nameInput.value = ""; // 清空輸入框
      showPage("p-zones");
      return;
    }

    // 如果有訂單，檢查是否已出餐（換位置的情況）
    if (orderSnapshot.exists()) {
      const orderData = orderSnapshot.val();
      const isServed = orderData.served === true;

      if (!isServed) {
        alert("請等待餐點出餐完成後，才能查看位置表");
        nameInput.focus();
        return;
      }

      // 已出餐，設置為當前用戶並進入區域選擇頁面
      currentUser = inputName;
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
    // 釋放座位
    const seatRef = ref(db, "seats/" + seatId);
    await set(seatRef, { takenBy: null });

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
    if (pwd === "13491349" || pwd === "123") {
      showPage("p-admin");
      loadAdminData();
      renderAdminStock();
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
    if (pwd === "13491349" || pwd === "123") {
      modal.classList.remove("show");
      showPage("p-admin");
      loadAdminData();
      renderAdminStock();
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

console.log("模組加載完成");
console.log("使用 Firebase Realtime Database");
