# Kano & Fuzzy AHP 計算 UI (純前端版本)

這個專案提供一個簡單的網頁介面，用於根據上傳的 CSV 資料 **直接在瀏覽器中** 執行 Kano 模型分析和模糊層級分析法 (Fuzzy AHP) 計算。**無需後端伺服器**。

## 功能

- 上傳 Kano 問卷回覆的 CSV 檔案。
- 在瀏覽器端計算每個特性的 Kano 分類 (Attractive, One-dimensional, Must-be, Indifferent, Reverse) 以及 CS (Customer Satisfaction) 和 DS (Customer Dissatisfaction) 係數。
- 上傳 Fuzzy AHP 成對比較問卷回覆的 CSV 檔案。
- 在瀏覽器端將 Saaty 量表評分轉換為三角模糊數 (TFN)。
- 在瀏覽器端使用幾何平均法聚合多位參與者的模糊判斷矩陣。
- 在瀏覽器端使用模糊幾何平均法計算模糊權重。
- 在瀏覽器端將模糊權重去模糊化為清晰權重 (Crisp Weights)。
- 在瀏覽器端計算一致性指標 (CI) 和一致性比率 (CR) 以檢驗 AHP 結果的可靠性。
- 使用表格和圖表視覺化顯示計算結果。

## 技術棧

- **前端:** HTML, CSS, JavaScript (Vanilla JS)
- **CSV 解析:** [PapaParse.js](https://www.papaparse.com/) (透過 CDN)
- **數學計算:** [Math.js](https://mathjs.org/) (透過 CDN)
- **圖表:** [Chart.js](https://www.chartjs.org/) (透過 CDN)

## 使用方法

### 1. 線上瀏覽 (GitHub Pages)

直接訪問以下網址即可使用：
[https://cis2042.github.io/kanofuzzyahp/](https://cis2042.github.io/kanofuzzyahp/)
(部署完成後可能需要幾分鐘生效)

### 2. 本地使用

1.  **複製或下載此專案:**
    將所有檔案 (`index.html`, `style.css`, `script.js` 等) 放在同一個資料夾中。
2.  **直接用瀏覽器開啟 `index.html` 檔案:**
    找到 `index.html` 檔案，直接用您的網頁瀏覽器（如 Chrome, Firefox, Edge）開啟即可。

### 3. (開發用) 產生模擬資料

如果您需要產生模擬的 CSV 資料檔案 (`kano_simulated_data.csv`, `fuzzy_ahp_simulated_data.csv`)：

1.  **確保已安裝 Node.js 和 npm:**
    如果尚未安裝，請至 [Node.js 官網](https://nodejs.org/) 下載並安裝。
2.  **安裝開發依賴:**
    在專案的根目錄下打開終端機或命令提示字元，執行：
    ```bash
    npm install
    ```
    (這會安裝 `generate_data.js` 可能需要的 `mathjs`)
3.  **執行產生指令:**
    ```bash
    npm run generate-data
    ```
    或
    ```bash
    node generate_data.js
    ```
    產生的檔案會出現在專案根目錄。

## 資料格式要求

### Kano CSV 檔案

- 每一列代表一位參與者的回覆。
- **必須有標頭列 (Header Row)**。
- 必須包含每個特性的功能性 (Functional) 和非功能性 (Dysfunctional) 問題的回覆。
- 欄位名稱應遵循模式：`CharacteristicName_func` 和 `CharacteristicName_dysfunc` (**大小寫不敏感**，程式會自動轉換特性名中的空格為底線來匹配)。例如：`Decentralization_func`, `Decentralization_dysfunc`, `Data_Ownership_func`, `Data_Ownership_dysfunc` ...
- 回覆值應為 1 到 5 的數字，對應：1:Like, 2:Must-be, 3:Neutral, 4:Live-with, 5:Dislike。
- 可以包含其他欄位 (例如 `participant_id`)，這些欄位會被忽略。

### Fuzzy AHP CSV 檔案

- 每一列代表一位參與者的回覆。
- **必須有標頭列 (Header Row)**。
- 必須包含所有 66 個成對比較的結果 (12 個特性)。
- 欄位名稱應精確匹配 `C{i}_vs_C{j}` 的格式 (**大小寫不敏感**)，其中 `i` 和 `j` 是特性的索引 (從 1 開始)，且 `i < j`。例如：`C1_vs_C2`, `C1_vs_C3`, ..., `C1_vs_C12`, `C2_vs_C3`, ..., `C11_vs_C12`。
- 回覆值應為 1 到 9 的 Saaty 量表數字。
- 可以包含其他欄位 (例如 `participant_id`)，這些欄位會被忽略。

## 注意事項

- Fuzzy AHP 計算，特別是特徵值計算，可能對輸入資料的品質敏感。不一致的判斷可能導致 CR > 0.1。
- CSV 檔案的編碼建議為 UTF-8。
- 所有計算都在您的瀏覽器中進行，您的資料不會被上傳到任何伺服器。
- 由於計算在瀏覽器執行，處理非常大的 CSV 檔案可能會有效能影響。 