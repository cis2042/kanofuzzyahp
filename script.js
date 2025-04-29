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

    calculateKanoButton.addEventListener('click', async () => {
        if (!kanoFileInput.files.length) {
            kanoStatusDiv.textContent = '錯誤：請先選擇 Kano 資料檔案。';
            return;
        }
        const file = kanoFileInput.files[0];
        const formData = new FormData();
        formData.append('kanoData', file);

        kanoStatusDiv.textContent = '正在計算 Kano 結果...';
        kanoTableWrapper.innerHTML = ''; // Clear previous results

        try {
            const response = await fetch('/calculate/kano', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP 錯誤：${response.status}`);
            }

            const results = await response.json();
            renderKanoTable(results);
            kanoStatusDiv.textContent = 'Kano 計算完成。';
        } catch (error) {
            console.error('Kano 計算錯誤:', error);
            kanoStatusDiv.textContent = `計算失敗：${error.message}`;
            renderKanoTable(null); // Clear table on error
        }
    });

    calculateFuzzyAhpButton.addEventListener('click', async () => {
        if (!fuzzyAhpFileInput.files.length) {
            fuzzyAhpStatusDiv.textContent = '錯誤：請先選擇 Fuzzy AHP 資料檔案。';
            return;
        }
        const file = fuzzyAhpFileInput.files[0];
        const formData = new FormData();
        formData.append('fuzzyAhpData', file);

        fuzzyAhpStatusDiv.textContent = '正在計算 Fuzzy AHP 權重...';
        // Clear previous AHP results
        if (fuzzyAhpChartInstance) {
            fuzzyAhpChartInstance.destroy();
            fuzzyAhpChartInstance = null;
        }
        fuzzyAhpConsistencyDiv.innerHTML = '';
        rankingResultsPre.textContent = '';

        try {
            const response = await fetch('/calculate/fuzzy-ahp', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP 錯誤：${response.status}`);
            }

            const results = await response.json();

            // Render Fuzzy AHP Results (Chart & Consistency)
            renderFuzzyAhpResults(results);

            // Render Ranking (remains text)
            const rankedCharacteristics = characteristicsData.map((charData, index) => ({
                name: charData.name,
                weight: results.weights[index]
            }));
            rankedCharacteristics.sort((a, b) => b.weight - a.weight); // Sort descending by weight

            rankingResultsPre.textContent = rankedCharacteristics.map((item, rank) =>
                `${rank + 1}. ${item.name}: ${item.weight.toFixed(4)}`
            ).join('\n');

            fuzzyAhpStatusDiv.textContent = 'Fuzzy AHP 計算完成。';
        } catch (error) {
            console.error('Fuzzy AHP 計算錯誤:', error);
            fuzzyAhpStatusDiv.textContent = `計算失敗：${error.message}`;
            renderFuzzyAhpResults(null); // Clear results on error
            rankingResultsPre.textContent = '';
        }
    });
}); 