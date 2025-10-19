# AI Budget Tracker (React Native Edition)

全端就緒的 **AI 智能記帳行動應用**，以 React Native + Expo + TypeScript + Tailwind (nativewind) 打造。支援 Android 與 iOS，整合 SQLite 離線儲存、AI 助理、挑戰機制、訂閱升級與雲端同步。部署採 **EAS Build** 流程。

---

## 🚀 初始化與開發

```bash
# 建立專案
npx create-expo-app ai-budget-tracker-rn -t expo-template-blank-typescript
cd ai-budget-tracker-rn

# 安裝主要依賴
npm install nativewind react-query zustand expo-sqlite expo-file-system expo-camera expo-image-picker expo-notifications react-native-chart-kit react-native-svg @react-navigation/native @react-navigation/bottom-tabs

# 安裝開發工具（依團隊情況取用）
npm install -D jest @testing-library/react-native detox typescript

# 初始化 EAS
npx eas init
```

---

## 📁 專案結構

```
app/
 ├── (tabs)/
 │   ├── ledger/        # 記帳核心 CRUD + 表單 Modal
 │   ├── analytics/     # 儀表板 (折線、圓餅、長條)
 │   ├── assistant/     # AI 助理聊天介面
 │   ├── challenges/    # 挑戰與成就系統
 │   └── upgrade/       # 方案升級 (RevenueCat / Billing Node)
 │
 ├── admin/             # 管理員介面 (dev 模式)
 ├── _layout.tsx        # Stack + Tabs 導覽結構
 │
lib/
 ├── db/ledger.ts       # SQLite schema 與 CRUD
 ├── ai/client.ts       # AI 端點串接 + fallback
 ├── billing/index.ts   # Billing Node 串接 (checkout / portal)
 ├── challenge/utils.ts # 挑戰邏輯與成就
 ├── sync/client.ts     # 雲端同步 API
 └── store.ts           # Zustand 全域狀態
```

---

## ⚙️ 環境變數與設定 (`app.config.js`)

```js
export default {
  expo: {
    name: "AI Budget Tracker",
    slug: "ai-budget-tracker",
    version: "1.0.0",
    platforms: ["ios", "android"],
    extra: {
      EXPO_PUBLIC_SYNC_ENDPOINT: process.env.EXPO_PUBLIC_SYNC_ENDPOINT,
      EXPO_PUBLIC_AI_ENDPOINT: process.env.EXPO_PUBLIC_AI_ENDPOINT,
      EXPO_PUBLIC_RC_APPLE_KEY: process.env.EXPO_PUBLIC_RC_APPLE_KEY,
      EXPO_PUBLIC_RC_GOOGLE_KEY: process.env.EXPO_PUBLIC_RC_GOOGLE_KEY,
      EXPO_PUBLIC_BILLING_ENDPOINT: process.env.EXPO_PUBLIC_BILLING_ENDPOINT,
      EXPO_PUBLIC_ENABLE_ADMIN_CONSOLE: process.env.EXPO_PUBLIC_ENABLE_ADMIN_CONSOLE
    }
  }
};
```

> **行為規則**：未設定端點會自動退化為離線模式；AI 端點失效時，會自動使用本地規則引擎 fallback。方案升級必須命中金流節點 (`EXPO_PUBLIC_BILLING_ENDPOINT`)，否則按鈕會被停用。

**`.env.example`**

```env
EXPO_PUBLIC_SYNC_ENDPOINT=
EXPO_PUBLIC_AI_ENDPOINT=
EXPO_PUBLIC_RC_APPLE_KEY=
EXPO_PUBLIC_RC_GOOGLE_KEY=
EXPO_PUBLIC_BILLING_ENDPOINT=
EXPO_PUBLIC_ENABLE_ADMIN_CONSOLE=false
```

---

## 🔌 端點契約（最小實作）

### `/sync` 端點

* `GET /sync` → 回傳：

```json
{ "records": [ { "id": "r1", "type":"expense", "amount": 120, "currency": "TWD", "category": "food", "note": "lunch", "date": "2025-10-19T12:03:00Z", "tags":["🥪"], "createdAt":"...", "updatedAt":"..." } ] }
```

* `POST /sync` → 上送：

```json
{ "records": [ /* 同上結構，前端全量或增量上送 */ ] }
```

* 錯誤格式（通用）：

```json
{ "ok": false, "error": "SYNC_CONFLICT|INVALID_PAYLOAD|SERVER_ERROR", "message": "..." }
```

### `/ai/query` 端點

* `POST /ai/query`：

```json
{ "question": "我這週餐飲花多少？", "ledger": { "records": [/* 最多 500 筆 */] }, "plan": "free|pro|enterprise" }
```

* 回傳：

```json
{ "reply": "你這週餐飲共 NT$560，比上週多 15%。建議每週上限 400。", "meta": { "tokens": 123, "latencyMs": 850 } }
```

* 範例 429：`{ "error":"RATE_LIMIT", "resetAt":"2025-10-20T00:00:00Z" }`

### Billing 端點（前端呼叫）

* `POST /billing/checkout`：`{ "plan":"pro", "cycle":"monthly", "userId":"u123" }` → `{ "redirectUrl":"https://..." }`
* `GET /billing/portal?userId=u123`：`{ "portalUrl":"https://..." }`
* Webhook（後端自有）：同步 `trial_started|active|past_due|canceled`

---

## 🗃️ SQLite Schema（簡述）

* `records(id TEXT PK, type TEXT, amount REAL, currency TEXT, category TEXT, note TEXT, date TEXT, tags TEXT, createdAt TEXT, updatedAt TEXT, deleted INTEGER, dirty INTEGER)`
* `meta(k TEXT PK, v TEXT)`

**同步策略**

* 首啟：本地優先；若設定 `SYNC_ENDPOINT` → 背景 GET 合併
* 上傳：POST 最近修改（`updatedAt` 大於最後同步時間）
* 合併：`last-write-wins` + 產生 `conflicts[]`（Admin 檢視）
* 離線：寫入本地、標記 `dirty=1`，網路恢復再 flush

---

## 💰 訂閱 / 方案（RevenueCat + Billing Node）

| 方案         | 權限            | 限制                |
| ---------- | ------------- | ----------------- |
| Free       | 基礎記帳 / 分析     | AI 每日 5 次、挑戰卡 3 張 |
| Pro        | 無限 AI / 完整分析  | 解鎖 匯出、主題、挑戰無上限    |
| Enterprise | 團隊帳本 / API 同步 | 自訂 endpoint 與多使用者 |

**狀態機**：`trial_started → active → past_due/canceled → free`

> **注意**：行動裝置上啟動升級必須透過 `EXPO_PUBLIC_BILLING_ENDPOINT` 觸發後端結帳流程；若未設定，前端會鎖定按鈕避免客戶端直接切換方案。開發者可透過 Admin Console 以 bypass 模式測試方案行為。

---

## 🔔 通知策略（expo-notifications）

* 每日 20:30：未記帳提醒
* 週日 18:00：AI 週報摘要（若 AI 端點可用）
* 超支預警：分類達 80% 預算 → 本機通知

---

## 🎨 UI 導覽（高保真流程）

* `Tabs`

  1. **Ledger**：列表 + `+` 浮動按鈕 → 全螢幕表單（語音/相機）
  2. **Assistant**：聊天氣泡、輸入列（送出/麥克風/相機）
  3. **Analytics**：KPI（本月支出、連續天數、Top 類別）＋ 三圖表
  4. **Challenges**：卡片橫滑、自訂月上限、進度條顏色
  5. **Upgrade**：方案比較、月/年切換、購買/還原、狀態徽章
* 全域：頂部方案徽章（Free/Pro/Trial X 日）、底部同步狀態（成功/失敗/重試）

---

## 📅 六週任務排程（交付節點）

**W1｜腳手架 & 基礎**

* Expo + nativewind + Zustand + React Query
* Tabs 導覽、色彩/字體（C 風格：黑底＋霓虹藍/綠）
* SQLite 初始化、資料層封裝（CRUD、索引、分頁）

**W2｜記帳 & 儀表板**

* Ledger 列表、`+` 表單（金額、分類、日期、備註、標籤）
* 語音輸入（STT）與相機收據照片存檔
* Analytics 三圖表與 KPI 卡片；CSV 匯出到檔案系統

**W3｜AI 助理 & fallback**

* Chat UI、loading/錯誤/限額（Free=5次/日）
* `AI_ENDPOINT` 串接；無端點→本地規則引擎
* 週報摘要生成與分享（文字/CSV）

**W4｜挑戰 & 通知**

* 內建 3 張挑戰＋自訂月上限；進度條顏色：安全/警示/超標
* expo-notifications：每日提醒、超支預警、週報
* 成就徽章與主題切換（Pro 解鎖更多主題）

**W5｜方案/付費**

* RevenueCat 整合、方案 gating（UI/權限）
* 升級流程、還原購買、狀態同步（需金流節點）
* Admin（dev）：資料總覽、端點健康檢查、清空/匯出

**W6｜穩定度 & 交付**

* 錯誤復原（同步重試、AI 回退）、效能壓測（1k 筆）
* 測試：Jest（聚合/格式/限制）、RTL（主要流程）、Detox（E2E）
* EAS Build：Internal Test（Android + iOS）

---

## 🧪 測試與驗收

**單元（Jest）**：金額格式、分類聚合、CSV 匯出、計費 gating。

**整合（Testing Library）**：新增→刪除→儀表板更新；同步錯誤→手動重試成功；AI 端點不可用→fallback 回覆。

**E2E（Detox）**：啟動→記帳→升級→同步→通知。

**MVP 驗收標準**

* 冷啟動 < 2.5s；列表滾動 60fps（1,000 筆）
* 離線 CRUD 正常、網路恢復自動同步
* Free/Pro 行為清楚（AI 次數/匯出/挑戰）
* AI 端點不可用時 100% fallback 成功（明確提示）
* 通知與訂閱狀態可靠、可關閉

---

## 📦 EAS Build / 提交流程

```bash
# 登入與設定
npx eas login
npx eas build:configure

# 建置 Android + iOS
npx eas build --platform all

# 測試發佈（需設定對應 store 憑證）
npx eas submit --platform android
npx eas submit --platform ios
```

**上架建議**

* Android → Play Console：Internal Testing track
* iOS → TestFlight / App Store Connect：Internal Test group

---

## 🧭 未來擴充

* Firebase Auth 登入與多裝置同步
* LLM Proxy（OpenAI/Claude，限流與金鑰管理）
* 訂閱 Webhook：權限一致性校驗
* 月報/年報 PDF、Email 週報
* CI/CD（GitHub Actions + EAS CLI）
