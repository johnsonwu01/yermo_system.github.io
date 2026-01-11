// I人夜店 - 簡單後端 API（使用 JSON 文件存儲，無需資料庫）
const express = require("express");
const cors = require("cors");
const fs = require("fs").promises;
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000; // 支持環境變數
const DATA_FILE = path.join(__dirname, "data.json");

// 中間件
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // 提供靜態文件服務（HTML、CSS、JS）

// 初始化數據文件
async function initDataFile() {
  try {
    await fs.access(DATA_FILE);
    console.log("✓ 數據文件已存在");
  } catch {
    // 文件不存在，創建初始數據
    const initialData = {
      users: {},
      seats: {},
      orders: {},
      menu_status: {},
    };
    await fs.writeFile(DATA_FILE, JSON.stringify(initialData, null, 2));
    console.log("✓ 已創建初始數據文件");
  }
}

// 讀取數據
async function readData() {
  try {
    const data = await fs.readFile(DATA_FILE, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("讀取數據失敗:", error);
    return { users: {}, seats: {}, orders: {}, menu_status: {} };
  }
}

// 寫入數據
async function writeData(data) {
  try {
    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error("寫入數據失敗:", error);
    return false;
  }
}

// ==================== API 路由 ====================

// 獲取所有用戶
app.get("/api/users", async (req, res) => {
  try {
    const data = await readData();
    res.json(data.users || {});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 更新用戶（支持批量）
app.put("/api/users", async (req, res) => {
  try {
    const updates = req.body;
    const data = await readData();
    data.users = { ...data.users, ...updates };
    await writeData(data);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 更新單個用戶
app.put("/api/users/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const updates = req.body;
    const data = await readData();
    if (!data.users[userId]) {
      data.users[userId] = {};
    }
    data.users[userId] = { ...data.users[userId], ...updates };
    await writeData(data);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 獲取所有座位
app.get("/api/seats", async (req, res) => {
  try {
    const data = await readData();
    res.json(data.seats || {});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 更新座位
app.put("/api/seats/:seatId", async (req, res) => {
  try {
    const { seatId } = req.params;
    const updates = req.body;
    const data = await readData();
    data.seats[seatId] = updates;
    await writeData(data);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 獲取所有訂單
app.get("/api/orders", async (req, res) => {
  try {
    const data = await readData();
    res.json(data.orders || {});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 更新訂單狀態（標記出餐完成）- 必須在 /api/orders/:userId 之前定義
app.put("/api/orders/:userId/status", async (req, res) => {
  try {
    const { userId } = req.params;
    const { served } = req.body; // served: true/false
    const data = await readData();
    if (data.orders[userId]) {
      data.orders[userId].served = served;
      if (served) {
        data.orders[userId].servedAt = Date.now();
      } else {
        // 取消標記時清除出餐時間
        delete data.orders[userId].servedAt;
      }
      await writeData(data);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "訂單不存在" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 創建訂單
app.post("/api/orders/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const orderData = req.body;
    const data = await readData();
    data.orders[userId] = orderData;
    await writeData(data);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 獲取菜單狀態
app.get("/api/menu_status", async (req, res) => {
  try {
    const data = await readData();
    res.json(data.menu_status || {});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 更新菜單狀態
app.put("/api/menu_status", async (req, res) => {
  try {
    const updates = req.body;
    const data = await readData();
    data.menu_status = { ...data.menu_status, ...updates };
    await writeData(data);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 重置所有數據（後台功能）
app.delete("/api/reset", async (req, res) => {
  try {
    const data = await readData();
    const resetData = {
      users: {},
      seats: {},
      orders: {},
      menu_status: data.menu_status || {}, // 保留菜單狀態
    };
    await writeData(resetData);
    res.json({ success: true, message: "數據已重置" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 啟動服務器
async function startServer() {
  await initDataFile();
  app.listen(PORT, () => {
    console.log("\n" + "=".repeat(50));
    console.log("🚀 I人夜店 API 服務器已啟動！");
    console.log("=".repeat(50));
    console.log(`📍 本地訪問: http://localhost:${PORT}`);
    console.log(`📱 手機訪問: http://[您的IP地址]:${PORT}`);
    console.log("\n💡 提示：");
    console.log("   - 數據存儲在 data.json 文件中");
    console.log("   - 無需安裝任何資料庫");
    console.log("   - 按 Ctrl+C 停止服務器");
    console.log("=".repeat(50) + "\n");
  });
}

startServer();
