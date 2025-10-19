# Maintenance Guide

保持 AI Budget Tracker (React Native Edition) 穩定運行的日常維護指南。

## 1. 版本管理與分支策略

- 使用 `main` 作為穩定分支，所有開發以 `feature/*` 或 `fix/*` 分支進行。
- 每次提交 PR 前請執行 `expo-doctor` 及 Jest 測試（若環境允許），確保原生設定與依賴沒有衝突。
- 上線前建立 Git Tag（例如 `v1.0.0`）對應 EAS Build，以利日後回溯。

## 2. 依賴更新

- Expo SDK：每季檢查一次，遵循官方升級指南（`npx expo upgrade`）。
- Native 模組：確認與最新 Expo 版本相容後再更新，避免破壞 build。
- JavaScript 套件：使用 `npm outdated` 檢視，再分批更新並跑測試。

## 3. 資料庫與同步

- SQLite schema 更新需寫成 migration（`ALTER TABLE` 或 `CREATE TABLE IF NOT EXISTS`）。
- 版本升級時若新增欄位，務必同步更新 `/sync` 端點 payload。
- 定期檢查 `dirty` 紀錄是否累積，若長期同步失敗請檢視網路設定或衝突處理。

## 4. AI 與金流

- 監控 AI 端點延遲（`latencyMs`）與錯誤率，必要時啟用多個 Region 的備援。
- 金流節點須實作 Webhook 以更新方案狀態，並驗證簽章防止偽造請求。
- RevenueCat／App Store 內購更新時，請同步調整方案權限與限制（AI 次數、挑戰數量）。

## 5. 測試與品質

- 單元測試：針對聚合函式、AI 使用額度、計費 gating 撰寫 Jest 測試。
- UI 測試：使用 React Native Testing Library 驗證主要流程（新增紀錄、升級方案、AI fallback）。
- E2E：以 Detox 於 Android / iOS 模擬器執行，每次重大更新至少跑一次。

## 6. 文件與支援

- README、Network Guide、Maintenance Guide 需同步更新版本號與端點說明。
- 建立支援通路（如 Zendesk、Intercom），將常見問題分類：同步失敗、AI 無回應、付款未更新。
- 若客戶通報資料遺失，請依循 GDPR / 個資規範處理，並記錄在事故報告。

## 7. 監控與警示

- 收集核心指標：同步成功率、AI 回覆延遲、金流成功率。
- 透過 Sentry / Bugsnag 監控原生崩潰與 JavaScript 錯誤。
- 設定雲端端點（Sync / AI / Billing）的 uptime 檢測，超過 SLA 立即通知維運。

## 8. 部署工作流

1. Merge PR → GitHub Actions 觸發 lint / test / build。
2. 建立 EAS Build (`npx eas build --platform all`) 並於 Internal Test 測試。
3. 測試通過後 `npx eas submit` 發佈至 Play Console / App Store Connect。
4. 完成發布公告與版本記錄，並更新維運排程。

---

遵循以上流程，可確保行動 App、外部端點與金流服務在快速迭代下仍維持高可用性。
