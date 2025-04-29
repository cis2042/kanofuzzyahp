document.addEventListener('DOMContentLoaded', () => {
    const kanoFileInput = document.getElementById('kano-file');
    const calculateKanoButton = document.getElementById('calculate-kano');
    const kanoStatusDiv = document.getElementById('kano-status');
    // Get the container for Kano results
    const kanoTableWrapper = document.getElementById('kano-table-wrapper');

    const fuzzyAhpFileInput = document.getElementById('fuzzy-ahp-file');
    const calculateFuzzyAhpButton = document.getElementById('calculate-fuzzy-ahp');
    const fuzzyAhpStatusDiv = document.getElementById('fuzzy-ahp-status');
    // Get containers for Fuzzy AHP results
    const fuzzyAhpChartCanvas = document.getElementById('fuzzy-ahp-weights-chart');
    const fuzzyAhpConsistencyDiv = document.getElementById('fuzzy-ahp-consistency');
    const rankingResultsPre = document.getElementById('ranking-results');

    // --- Web3 Characteristics (Match order in server.js) ---
    // Using an object array for easier mapping between EN name (key) and display name
    const characteristicsData = [
      { key: "Decentralization", name: "Decentralization (去中心化)" },
      { key: "Data Ownership", name: "Data Ownership (資料主權)" },
      { key: "Smart Contracts", name: "Smart Contracts (智能合約)" },
      { key: "Trustless", name: "Trustless (去信任化)" },
      { key: "Immutability", name: "Immutability (不可篡改)" },
      { key: "Consensus Mechanism", name: "Consensus Mechanism (共識機制)" },
      { key: "Tokenomics", name: "Tokenomics (代幣經濟)" },
      { key: "Privacy", name: "Privacy (隱私保護)" },
      { key: "Disintermediation", name: "Disintermediation (去中介化)" },
      { key: "Self-Sovereign Identity", name: "Self-Sovereign Identity (自主身份)" },
      { key: "Openness", name: "Openness (開放性)" },
      { key: "Community Governance", name: "Community Governance (社群治理)" }
    ];
    const characteristicsMap = Object.fromEntries(characteristicsData.map(c => [c.key, c.name]));
    const characteristicsDisplayOrder = characteristicsData.map(c => c.key);

    let fuzzyAhpChartInstance = null; // To hold the chart instance

    // --- Kano Category Mapping ---
    const kanoCategoryMap = {
        'A': '吸引屬性 (A)',
        'O': '一維屬性 (O)',
        'M': '必備屬性 (M)',
        'I': '無差異屬性 (I)',
        'R': '反向屬性 (R)',
        'Q': '有問題回答 (Q)',
        'N/A': '無有效資料 (N/A)'
    };

    // --- Helper: Read file content --- (New)
    function readFileContent(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => resolve(event.target.result);
            reader.onerror = (error) => reject(error);
            reader.readAsText(file); // Read as text for CSV parsing
        });
    }

    // --- Helper: Parse CSV text --- (New)
    function parseCsvText(text) {
        return new Promise((resolve, reject) => {
            Papa.parse(text, {
                header: true, // Assume first row is header
                skipEmptyLines: true,
                dynamicTyping: false, // Keep values as strings for now
                complete: (results) => {
                    if (results.errors.length > 0) {
                        console.error('CSV Parsing Errors:', results.errors);
                        // Handle partial data? For now, reject on error.
                        reject(new Error(`CSV 解析錯誤: ${results.errors[0].message}`));
                    }
                    resolve(results.data);
                },
                error: (error) => reject(error)
            });
        });
    }

    // --- Kano Calculation Logic (Moved from server.js) ---
    function calculateKano(data) {
        // Kano evaluation table (Functional x Dysfunctional -> Category)
        const kanoEvalTable = {
            '1': ['Q', 'A', 'A', 'A', 'O'], '2': ['R', 'I', 'I', 'I', 'M'],
            '3': ['R', 'I', 'I', 'I', 'M'], '4': ['R', 'I', 'I', 'I', 'M'],
            '5': ['R', 'R', 'R', 'R', 'Q']
        };

        const categoryCounts = {};
        characteristicsData.forEach(charData => {
            categoryCounts[charData.key] = { A: 0, O: 0, M: 0, I: 0, R: 0, Q: 0 };
        });

        data.forEach(row => {
            characteristicsData.forEach(charData => {
                const charKey = charData.key;
                // Use the exact key generated in generate_data.js (with underscores)
                const funcColKey = charKey.replace(/ /g, '_') + '_func';
                const dysfuncColKey = charKey.replace(/ /g, '_') + '_dysfunc';

                // Find columns in the row data (case-insensitive header matching)
                let funcCol, dysfuncCol;
                for (const header in row) {
                    if (header.toLowerCase() === funcColKey.toLowerCase()) {
                        funcCol = header;
                    }
                    if (header.toLowerCase() === dysfuncColKey.toLowerCase()) {
                        dysfuncCol = header;
                    }
                }

                if (!funcCol || !dysfuncCol) {
                    console.warn(`警告：在資料列中找不到特性 '${charKey}' 的功能性/非功能性欄位。檢查 CSV 標頭是否為 '${funcColKey}' 和 '${dysfuncColKey}'。`, row);
                    categoryCounts[charKey]['Q']++;
                    return;
                }

                const funcAnswer = String(row[funcCol]).trim(); // Ensure string for table lookup
                const dysfuncAnswer = String(row[dysfuncCol]).trim();
                const funcAnswerInt = parseInt(funcAnswer, 10);

                if (funcAnswer && dysfuncAnswer && kanoEvalTable[funcAnswer] && funcAnswerInt >= 1 && funcAnswerInt <= 5) {
                     const dysfuncAnswerInt = parseInt(dysfuncAnswer, 10);
                     if (dysfuncAnswerInt >= 1 && dysfuncAnswerInt <= 5){
                        const category = kanoEvalTable[funcAnswer][dysfuncAnswerInt - 1];
                        if (categoryCounts[charKey][category] !== undefined) {
                            categoryCounts[charKey][category]++;
                        }
                    } else {
                         categoryCounts[charKey]['Q']++;
                    }
                } else {
                    categoryCounts[charKey]['Q']++;
                }
            });
        });

        const kanoResults = {};
        characteristicsData.forEach(charData => {
            const charKey = charData.key;
            const counts = categoryCounts[charKey];
            const totalValid = counts.A + counts.O + counts.M + counts.I;
            let dominantCategory = 'I';
            if (totalValid > 0) {
                let maxCount = 0;
                ['A', 'O', 'M', 'I', 'R'].forEach(cat => {
                    if (counts[cat] > maxCount) {
                        maxCount = counts[cat];
                        dominantCategory = cat;
                    }
                });
                 // Tie-breaking rule M > O > A > I
                 if (counts.M === maxCount && dominantCategory !== 'M') dominantCategory = 'M';
                 if (counts.O === maxCount && dominantCategory !== 'O' && dominantCategory !== 'M') dominantCategory = 'O';
                 if (counts.A === maxCount && dominantCategory !== 'A' && dominantCategory !== 'O' && dominantCategory !== 'M') dominantCategory = 'A';

                const CS = (counts.A + counts.O) / totalValid;
                const DS = (counts.O + counts.M) / totalValid * -1;
                kanoResults[charKey] = {
                    category: dominantCategory, CS: CS.toFixed(3), DS: DS.toFixed(3), counts: counts
                };
            } else {
                kanoResults[charKey] = {
                    category: 'N/A', CS: 'N/A', DS: 'N/A', counts: counts
                };
            }
        });
        return kanoResults;
    }

    // --- Fuzzy AHP Calculation Logic (Moved from server.js) ---
    function calculateFuzzyAHP(data) {
        const n = characteristicsData.length;
        if (n !== 12) throw new Error("Fuzzy AHP 邏輯需要正好 12 個特性。");

        const scaleToTFN = {
            '1': [1, 1, 1], '2': [1, 2, 3], '3': [2, 3, 4], '4': [3, 4, 5],
            '5': [4, 5, 6], '6': [5, 6, 7], '7': [6, 7, 8], '8': [7, 8, 9], '9': [8, 9, 9]
        };

        const individualMatrices = data.map(row => {
            const matrix = [];
            for (let i = 0; i < n; i++) {
                matrix[i] = [];
                for (let j = 0; j < n; j++) {
                    matrix[i][j] = [1, 1, 1];
                }
            }
            let k = 0;
            for (let i = 0; i < n; i++) {
                for (let j = i + 1; j < n; j++) {
                    const colNameExpected = `C${i + 1}_vs_C${j + 1}`;
                    let colNameActual = null;
                     // Find actual column name (case-insensitive)
                     for(const header in row) {
                         if (header.toLowerCase() === colNameExpected.toLowerCase()) {
                             colNameActual = header;
                             break;
                         }
                     }

                    if (!colNameActual) {
                        console.warn(`警告：找不到 AHP 比較欄位 ${colNameExpected}。`, row);
                        // Keep matrix[i][j] and matrix[j][i] as [1,1,1]
                        continue; // Skip to next comparison
                    }

                    const valueStr = String(row[colNameActual]).trim();

                    if (!valueStr || !scaleToTFN[valueStr]) {
                        console.warn(`警告：欄位 ${colNameActual} 的 AHP 值無效 (${valueStr})。`, row);
                         // Keep matrix[i][j] and matrix[j][i] as [1,1,1]
                        continue;
                    }

                    const tfn = scaleToTFN[valueStr];
                    matrix[i][j] = tfn;
                    matrix[j][i] = [1 / tfn[2], 1 / tfn[1], 1 / tfn[0]];
                    k++;
                }
            }
            if (k !== (n * (n - 1)) / 2) {
                console.warn(`警告：處理的成對比較數量 (${k}) 不正確，預期為 ${(n * (n - 1)) / 2}。`, row);
            }
            return matrix;
        });

        if (individualMatrices.length === 0) {
            throw new Error("找不到有效的參與者資料進行 Fuzzy AHP 計算。");
        }

        const K = individualMatrices.length;
        const aggregatedMatrix = [];
        for (let i = 0; i < n; i++) {
             aggregatedMatrix[i] = [];
             for (let j = 0; j < n; j++) {
                 aggregatedMatrix[i][j] = [0, 0, 0]; // Initialize for sum/prod
             }
         }

        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                if (i === j) {
                    aggregatedMatrix[i][j] = [1, 1, 1];
                    continue;
                }
                let prodL = 1, prodM = 1, prodU = 1;
                let validCount = 0;
                individualMatrices.forEach(matrix => {
                    // Check if matrix[i][j] exists and is valid TFN before multiplying
                    if (matrix && matrix[i] && matrix[i][j] && Array.isArray(matrix[i][j]) && matrix[i][j].length === 3) {
                        const [l, m, u] = matrix[i][j];
                         if(typeof l === 'number' && typeof m === 'number' && typeof u === 'number') {
                            prodL *= l;
                            prodM *= m;
                            prodU *= u;
                            validCount++;
                         } else {
                             console.warn(`Skipping invalid TFN in aggregation at [${i}][${j}]:`, matrix[i][j]);
                         }
                    } else {
                         console.warn(`Skipping invalid matrix structure in aggregation at [${i}][${j}].`);
                    }
                });
                 if (validCount === 0) {
                     console.error(`Error: No valid matrices to aggregate for element [${i}][${j}]`);
                     // Handle error - maybe default to [1,1,1] or throw?
                     aggregatedMatrix[i][j] = [1, 1, 1];
                 } else {
                     aggregatedMatrix[i][j] = [
                         Math.pow(prodL, 1 / validCount),
                         Math.pow(prodM, 1 / validCount),
                         Math.pow(prodU, 1 / validCount)
                     ];
                 }
            }
        }

        const fuzzyGeometricMeans = [];
        let sumFuzzyGeometricMeans = [0, 0, 0];

        for (let i = 0; i < n; i++) {
            let rowProdL = 1, rowProdM = 1, rowProdU = 1;
            for (let j = 0; j < n; j++) {
                const [l, m, u] = aggregatedMatrix[i][j];
                rowProdL *= l; rowProdM *= m; rowProdU *= u;
            }
            const zi = [Math.pow(rowProdL, 1 / n), Math.pow(rowProdM, 1 / n), Math.pow(rowProdU, 1 / n)];
            fuzzyGeometricMeans.push(zi);
            sumFuzzyGeometricMeans[0] += zi[0];
            sumFuzzyGeometricMeans[1] += zi[1];
            sumFuzzyGeometricMeans[2] += zi[2];
        }

        const sumInv = [1 / sumFuzzyGeometricMeans[2], 1 / sumFuzzyGeometricMeans[1], 1 / sumFuzzyGeometricMeans[0]];
        const fuzzyWeights = fuzzyGeometricMeans.map(zi => [
            zi[0] * sumInv[0], zi[1] * sumInv[1], zi[2] * sumInv[2]
        ]);

        const crispWeights = fuzzyWeights.map(([wl, wm, wu]) => (wl + wm + wu) / 3);
        const sumCrispWeights = crispWeights.reduce((sum, w) => sum + w, 0);
        const normalizedCrispWeights = crispWeights.map(w => w / sumCrispWeights);

        // Defuzzify aggregated matrix for consistency check
         const crispAggMatrixData = aggregatedMatrix.map(aggRow =>
             aggRow.map(([l, m, u]) => (l + m + u) / 3)
         );
         // Use mathjs for eigenvalue calculation
         const crispAggMatrix = math.matrix(crispAggMatrixData);

        let lambdaMax = n;
        let CI = 0, CR = 0, isConsistent = true;
        try {
            // Ensure the matrix is square for eigenvalue calculation
            if (crispAggMatrix.size().length === 2 && crispAggMatrix.size()[0] === n && crispAggMatrix.size()[1] === n) {
                 const eigenvalues = math.eigs(crispAggMatrix).values;
                 lambdaMax = Math.max(...eigenvalues.map(e => Math.abs(math.re(e))));
                if (isNaN(lambdaMax)) throw new Error("特徵值計算失敗 (NaN)");

                CI = (lambdaMax - n) / (n - 1);
                const RI = 1.54; // For n=12
                CR = (RI === 0 || isNaN(CI)) ? Infinity : CI / RI;
                isConsistent = CR < 0.1;
            } else {
                throw new Error("去模糊化後的聚合矩陣不是有效的方陣");
            }
        } catch (e) {
            console.error("一致性檢查錯誤:", e);
             lambdaMax = '錯誤'; CI = '錯誤'; CR = '錯誤'; isConsistent = false;
        }

        return {
            weights: normalizedCrispWeights,
            consistency: {
                lambdaMax: typeof lambdaMax === 'number' ? lambdaMax.toFixed(4) : lambdaMax,
                CI: typeof CI === 'number' ? CI.toFixed(4) : CI,
                RI: (1.54).toFixed(4),
                CR: typeof CR === 'number' ? CR.toFixed(4) : CR,
                isConsistent: isConsistent
            }
        };
    }

    // --- Function to render Kano results table ---
    function renderKanoTable(results) {
        kanoTableWrapper.innerHTML = ''; // Clear previous table
        if (!results || Object.keys(results).length === 0) {
            kanoTableWrapper.innerHTML = '<p>沒有計算結果可顯示。</p>';
            return;
        }

        const table = document.createElement('table');
        table.className = 'results-table'; // Add class for styling
        const thead = table.createTHead();
        const headerRow = thead.insertRow();
        const headers = ['特性', '主要分類', 'CS 係數', 'DS 係數', '吸引 (A)', '一維 (O)', '必備 (M)', '無差異 (I)', '反向 (R)', '問題 (Q)'];
        headers.forEach(text => {
            const th = document.createElement('th');
            th.textContent = text;
            headerRow.appendChild(th);
        });

        const tbody = table.createTBody();
        // Ensure characteristics are displayed in the defined order
        characteristicsDisplayOrder.forEach(charKey => {
            const result = results[charKey];
            if (!result) return; // Skip if result for this characteristic doesn't exist

            const row = tbody.insertRow();
            const charName = characteristicsMap[charKey] || charKey; // Use display name
            const categoryDisplay = kanoCategoryMap[result.category] || result.category;
            const counts = result.counts || { A: 0, O: 0, M: 0, I: 0, R: 0, Q: 0 };
            const rowData = [
                charName,
                categoryDisplay,
                result.CS,
                result.DS,
                counts.A,
                counts.O,
                counts.M,
                counts.I,
                counts.R,
                counts.Q
            ];
            rowData.forEach(text => {
                const cell = row.insertCell();
                cell.textContent = text;
            });
        });

        kanoTableWrapper.appendChild(table);
    }

    // --- Function to render Fuzzy AHP results ---
    function renderFuzzyAhpResults(results) {
        fuzzyAhpConsistencyDiv.innerHTML = ''; // Clear previous consistency info
        // Destroy previous chart if it exists
        if (fuzzyAhpChartInstance) {
            fuzzyAhpChartInstance.destroy();
            fuzzyAhpChartInstance = null;
        }

        if (!results || !results.weights || !results.consistency) {
            fuzzyAhpConsistencyDiv.innerHTML = '<p>沒有計算結果可顯示。</p>';
            return;
        }

        // 1. Render Consistency Info
        const cons = results.consistency;
        const consistencyText = `
            <h4>一致性檢驗結果：</h4>
            <ul>
                <li>最大特徵值 (λmax): ${cons.lambdaMax}</li>
                <li>一致性指標 (CI): ${cons.CI}</li>
                <li>隨機指標 (RI) (n=12): ${cons.RI}</li>
                <li>一致性比率 (CR): ${cons.CR}</li>
                <li>是否通過一致性檢驗 (CR < 0.1): ${cons.isConsistent ? '是' : '否'}</li>
            </ul>
            ${!cons.isConsistent ? '<p style="color: red;">警告：一致性比率 (CR) > 0.1，表示問卷填答可能存在較大矛盾，結果參考價值降低。</p>' : ''}
        `;
        fuzzyAhpConsistencyDiv.innerHTML = consistencyText;

        // 2. Render Weights Chart
        const ctx = fuzzyAhpChartCanvas.getContext('2d');
        const chartLabels = characteristicsData.map(c => c.name);
        const chartData = results.weights;

        fuzzyAhpChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: chartLabels,
                datasets: [{
                    label: '特性權重',
                    data: chartData,
                    backgroundColor: 'rgba(52, 152, 219, 0.7)',
                    borderColor: 'rgba(41, 128, 185, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                indexAxis: 'y', // Display labels on Y axis for better readability
                scales: {
                    x: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: '權重值'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false // Hide legend as there's only one dataset
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.x !== null) {
                                    label += context.parsed.x.toFixed(4);
                                }
                                return label;
                            }
                        }
                    }
                },
                 maintainAspectRatio: false // Allow chart to resize vertically
            }
        });
    }

    // --- Update Event Listeners --- (Modified)
    calculateKanoButton.addEventListener('click', async () => {
        if (!kanoFileInput.files.length) {
            kanoStatusDiv.textContent = '錯誤：請先選擇 Kano 資料檔案。';
            return;
        }
        const file = kanoFileInput.files[0];
        kanoStatusDiv.textContent = '正在讀取和解析 Kano 資料...';
        kanoTableWrapper.innerHTML = ''; // Clear previous results

        try {
            const fileText = await readFileContent(file);
            const data = await parseCsvText(fileText);
            kanoStatusDiv.textContent = '正在計算 Kano 結果...';
            const results = calculateKano(data);
            renderKanoTable(results);
            kanoStatusDiv.textContent = 'Kano 計算完成。';
        } catch (error) {
            console.error('Kano 處理錯誤:', error);
            kanoStatusDiv.textContent = `處理失敗：${error.message}`;
            renderKanoTable(null); // Clear table on error
        }
    });

    calculateFuzzyAhpButton.addEventListener('click', async () => {
        if (!fuzzyAhpFileInput.files.length) {
            fuzzyAhpStatusDiv.textContent = '錯誤：請先選擇 Fuzzy AHP 資料檔案。';
            return;
        }
        const file = fuzzyAhpFileInput.files[0];
        fuzzyAhpStatusDiv.textContent = '正在讀取和解析 Fuzzy AHP 資料...';
        // Clear previous AHP results
        if (fuzzyAhpChartInstance) {
            fuzzyAhpChartInstance.destroy();
            fuzzyAhpChartInstance = null;
        }
        fuzzyAhpConsistencyDiv.innerHTML = '';
        rankingResultsPre.textContent = '';

        try {
            const fileText = await readFileContent(file);
            const data = await parseCsvText(fileText);
            fuzzyAhpStatusDiv.textContent = '正在計算 Fuzzy AHP 權重...';
            const results = calculateFuzzyAHP(data);
            renderFuzzyAhpResults(results);

            // Render Ranking (remains text)
            const rankedCharacteristics = characteristicsData.map((charData, index) => ({
                name: charData.name,
                weight: results.weights ? results.weights[index] : 0 // Handle potential error in results
            }));
            rankedCharacteristics.sort((a, b) => b.weight - a.weight); // Sort descending by weight

            rankingResultsPre.textContent = rankedCharacteristics.map((item, rank) =>
                `${rank + 1}. ${item.name}: ${item.weight.toFixed(4)}`
            ).join('\n');

            fuzzyAhpStatusDiv.textContent = 'Fuzzy AHP 計算完成。';
        } catch (error) {
            console.error('Fuzzy AHP 處理錯誤:', error);
            fuzzyAhpStatusDiv.textContent = `處理失敗：${error.message}`;
            renderFuzzyAhpResults(null); // Clear results on error
            rankingResultsPre.textContent = '';
        }
    });
}); 