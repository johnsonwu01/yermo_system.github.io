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

// 啟動所有監聽
startUsersPolling();
startMenuStatusPolling();

window.selectUser = (name) => {
  if (!confirm(`確認您是 ${name} 嗎？`)) return;
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

      for (let i = 1; i <= zone.seats; i++) {
        const seatId = `${zoneId}-${i}`;
        const btn = document.createElement("div");
        btn.className = "seat";
        btn.textContent = i;

        // 第五區有圓桌有方桌的視覺區分 (前4圓, 後4方)
        if (zoneId === 5 && i > 4) btn.classList.add("square");
        else if (zone.type === "rect") btn.classList.add("square");

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

    // 鎖定座位
    await set(seatRef, { takenBy: currentUser });
    await update(ref(db, "users/" + currentUser), { seat: currentSeat });

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

// --------------------------------------------------------
// 4. 後台邏輯
// --------------------------------------------------------
window.promptAdmin = () => {
  const pwd = prompt("請輸入管理員密碼");
  if (pwd === "13491349" || pwd === "123") {
    showPage("p-admin");
    loadAdminData();
    renderAdminStock();
  } else if (pwd !== null) {
    alert("密碼錯誤");
  }
};

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
  if (
    confirm(
      "警告：確定要清空所有資料嗎？\n這會刪除所有訂單、座位狀態和報到名單。"
    )
  ) {
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
                }</div>
                <div style="margin-bottom:8px;">${itemStr}</div>
                <div style="text-align:right;">
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
