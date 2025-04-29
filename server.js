const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const { Readable } = require('stream');
const math = require('mathjs');
const path = require('path'); // Need path module

const app = express();
const port = 3000;

// --- Configuration ---
const upload = multer({ storage: multer.memoryStorage() }); // Store files in memory
const CHARACTERISTICS_COUNT = 12; // Number of Web3 characteristics

// --- Web3 Characteristics (Order matters for indexing) ---
const characteristics = [
    // These names should ideally match expected CSV headers or be mapped
    'Decentralization', 'Data Ownership', 'Smart Contracts', 'Trustless', 'Immutability',
    'Consensus Mechanism', 'Tokenomics', 'Privacy', 'Disintermediation', 'Self-Sovereign Identity',
    'Openness', 'Community Governance'
];

// --- Helper Functions ---

// Parse CSV from buffer
function parseCsvBuffer(buffer) {
    return new Promise((resolve, reject) => {
        const results = [];
        const stream = Readable.from(buffer.toString());
        stream
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', () => resolve(results))
            .on('error', (error) => reject(error));
    });
}

// --- Kano Calculation Logic ---
function calculateKano(data) {
    // Kano evaluation table (Functional x Dysfunctional -> Category)
    // 1:Like, 2:Must-be, 3:Neutral, 4:Live-with, 5:Dislike
    const kanoEvalTable = {
        // Dysfunctional ->
        // F 1  2  3  4  5
        /*u 1*/ '1': ['Q', 'A', 'A', 'A', 'O'],
        /*n 2*/ '2': ['R', 'I', 'I', 'I', 'M'],
        /*c 3*/ '3': ['R', 'I', 'I', 'I', 'M'],
        /*t 4*/ '4': ['R', 'I', 'I', 'I', 'M'],
        /*i 5*/ '5': ['R', 'R', 'R', 'R', 'Q'],
        /*o */
        /*n */
        /*a */
        /*l */
        /*| */
        /*v */
    };

    const categoryCounts = {}; // { characteristic: { A: 0, O: 0, M: 0, I: 0, R: 0, Q: 0 } }
    characteristics.forEach(char => {
        categoryCounts[char] = { A: 0, O: 0, M: 0, I: 0, R: 0, Q: 0 };
    });

    // Process each participant's response
    data.forEach(row => {
        characteristics.forEach(char => {
            // Dynamically find column names (assuming pattern like 'Characteristic_func' and 'Characteristic_dysfunc')
            // This requires careful naming in the CSV!
            const targetFuncKey = char.toLowerCase().replace(/ /g, '_') + '_func';
            const targetDysfuncKey = char.toLowerCase().replace(/ /g, '_') + '_dysfunc';
            const funcCol = Object.keys(row).find(k => k.toLowerCase() === targetFuncKey);
            const dysfuncCol = Object.keys(row).find(k => k.toLowerCase() === targetDysfuncKey);

            if (!funcCol || !dysfuncCol) {
                // Only log warning if columns are genuinely missing, not just due to imprecise matching
                if (!Object.keys(row).some(k => k.toLowerCase().startsWith(char.toLowerCase().replace(/ /g, '_'))) ) {
                     console.warn(`Warning: Missing columns for characteristic base name ${char} in row:`, row);
                } else {
                    // This case might occur if headers are slightly different but related
                    console.warn(`Warning: Could not find exact match for func/dysfunc columns for ${char}. Found keys:`, Object.keys(row).filter(k => k.toLowerCase().includes(char.toLowerCase().replace(/ /g, '_'))));
                }
                // Still skip if exact columns not found
                 categoryCounts[char]['Q']++; // Count as Questionable if columns missing
                return;
            }

            const funcAnswer = row[funcCol];
            const dysfuncAnswer = row[dysfuncCol];

            if (funcAnswer && dysfuncAnswer && kanoEvalTable[funcAnswer] && kanoEvalTable[funcAnswer][dysfuncAnswer - 1]) {
                const category = kanoEvalTable[funcAnswer][dysfuncAnswer - 1];
                if (categoryCounts[char][category] !== undefined) {
                    categoryCounts[char][category]++;
                }
            } else {
                // Handle invalid or missing answers, maybe count as Q?
                categoryCounts[char]['Q']++;
            }
        });
    });

    // Calculate results (Category, CS, DS)
    const kanoResults = {};
    characteristics.forEach(char => {
        const counts = categoryCounts[char];
        const totalValid = counts.A + counts.O + counts.M + counts.I;
        let dominantCategory = 'I'; // Default to Indifferent
        if (totalValid > 0) {
             // Determine dominant category (simple majority rule)
             let maxCount = 0;
             for (const cat of ['A', 'O', 'M', 'I', 'R']) {
                 if (counts[cat] > maxCount) {
                     maxCount = counts[cat];
                     dominantCategory = cat;
                 }
             }
             // Rule for tie-breaking (e.g., M > O > A > I)
             if (counts.M === maxCount && dominantCategory !== 'M') dominantCategory = 'M';
             if (counts.O === maxCount && dominantCategory !== 'O' && dominantCategory !== 'M') dominantCategory = 'O';
             if (counts.A === maxCount && dominantCategory !== 'A' && dominantCategory !== 'O' && dominantCategory !== 'M') dominantCategory = 'A';

             const CS = (counts.A + counts.O) / totalValid;
             const DS = (counts.O + counts.M) / totalValid * -1;

             kanoResults[char] = {
                 category: dominantCategory,
                 CS: CS.toFixed(3),
                 DS: DS.toFixed(3),
                 counts: counts
             };
        } else {
             kanoResults[char] = {
                 category: 'N/A', // No valid responses
                 CS: 'N/A',
                 DS: 'N/A',
                 counts: counts
             };
        }
    });

    return kanoResults;
}

// --- Fuzzy AHP Calculation Logic ---
function calculateFuzzyAHP(data) {
    const n = CHARACTERISTICS_COUNT;
    if (n !== 12) throw new Error("Fuzzy AHP logic requires exactly 12 characteristics.");

    // 1. Convert Saaty scale to TFNs
    const scaleToTFN = {
        '1': [1, 1, 1],
        '2': [1, 2, 3],
        '3': [2, 3, 4],
        '4': [3, 4, 5],
        '5': [4, 5, 6],
        '6': [5, 6, 7],
        '7': [6, 7, 8],
        '8': [7, 8, 9],
        '9': [8, 9, 9], // Or [9, 9, 9]
    };
    // Inverse scale for values < 1 (handled during aggregation)

    // 2. Build individual fuzzy comparison matrices
    const individualMatrices = data.map(row => {
        const matrix = [];
        for (let i = 0; i < n; i++) {
            matrix[i] = [];
            for (let j = 0; j < n; j++) {
                matrix[i][j] = [1, 1, 1]; // Initialize TFN
            }
        }
        let k = 0;
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                // Find the column name for C(i+1)_vs_C(j+1)
                // This expects CSV headers like 'C1_vs_C2', 'C1_vs_C3', ... 'C11_vs_C12'
                const colName = `C${i + 1}_vs_C${j + 1}`;
                const valueStr = row[colName];

                if (!valueStr || !scaleToTFN[valueStr]) {
                    console.warn(`Warning: Invalid or missing AHP value for ${colName} in row:`, row); // Or throw error?
                     // Default to [1, 1, 1] if missing/invalid?
                     matrix[i][j] = [1, 1, 1];
                     matrix[j][i] = [1, 1, 1];
                     continue;
                }

                const tfn = scaleToTFN[valueStr];
                matrix[i][j] = tfn;
                // Inverse TFN for ji: (1/u, 1/m, 1/l)
                matrix[j][i] = [1 / tfn[2], 1 / tfn[1], 1 / tfn[0]];
                k++;
            }
        }
        // Basic check if expected number of comparisons were found
        if (k !== (n * (n - 1)) / 2) {
            console.warn(`Warning: Incorrect number of pairwise comparisons found (${k} instead of ${(n * (n - 1)) / 2}) in row:`, row);
        }
        return matrix;
    });

    if (individualMatrices.length === 0) {
        throw new Error("No valid participant data found for Fuzzy AHP calculation.");
    }

    // 3. Aggregate individual matrices using geometric mean for TFNs
    const K = individualMatrices.length;
    const aggregatedMatrix = math.identity(n).map(() => Array(n)).toArray();

    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            if (i === j) {
                aggregatedMatrix[i][j] = [1, 1, 1];
                continue;
            }
            let prodL = 1, prodM = 1, prodU = 1;
            individualMatrices.forEach(matrix => {
                const [l, m, u] = matrix[i][j];
                prodL *= l;
                prodM *= m;
                prodU *= u;
            });
            aggregatedMatrix[i][j] = [
                Math.pow(prodL, 1 / K),
                Math.pow(prodM, 1 / K),
                Math.pow(prodU, 1 / K)
            ];
        }
    }

    // 4. Calculate fuzzy weights (zi = geometric mean of row i, wi = zi / sum(zk))
    const fuzzyGeometricMeans = []; // z_i
    let sumFuzzyGeometricMeans = [0, 0, 0]; // Sum(z_k)

    for (let i = 0; i < n; i++) {
        let rowProdL = 1, rowProdM = 1, rowProdU = 1;
        for (let j = 0; j < n; j++) {
            const [l, m, u] = aggregatedMatrix[i][j];
            rowProdL *= l;
            rowProdM *= m;
            rowProdU *= u;
        }
        const zi = [
            Math.pow(rowProdL, 1 / n),
            Math.pow(rowProdM, 1 / n),
            Math.pow(rowProdU, 1 / n)
        ];
        fuzzyGeometricMeans.push(zi);
        sumFuzzyGeometricMeans[0] += zi[0];
        sumFuzzyGeometricMeans[1] += zi[1];
        sumFuzzyGeometricMeans[2] += zi[2];
    }

    // Calculate sum inverse for normalization: (1/sum_u, 1/sum_m, 1/sum_l)
    const sumInv = [1 / sumFuzzyGeometricMeans[2], 1 / sumFuzzyGeometricMeans[1], 1 / sumFuzzyGeometricMeans[0]];

    const fuzzyWeights = fuzzyGeometricMeans.map(zi => {
        // Multiply TFNs: zi * sumInv = (zi_l*sumInv_l, zi_m*sumInv_m, zi_u*sumInv_u)
        return [
            zi[0] * sumInv[0],
            zi[1] * sumInv[1],
            zi[2] * sumInv[2]
        ];
    });

    // 5. Defuzzify weights using centroid method: wi = (wl + wm + wu) / 3
    const crispWeights = fuzzyWeights.map(([wl, wm, wu]) => (wl + wm + wu) / 3);

    // Normalize crisp weights (optional but good practice)
    const sumCrispWeights = crispWeights.reduce((sum, w) => sum + w, 0);
    const normalizedCrispWeights = crispWeights.map(w => w / sumCrispWeights);

    // 6. Consistency Check
    // Defuzzify the aggregated matrix
    const crispAggMatrix = aggregatedMatrix.map(row =>
        row.map(([l, m, u]) => (l + m + u) / 3)
    );

    // Calculate max eigenvalue (lambda_max) using power iteration or mathjs
    let lambdaMax;
    try {
        const eigenvalues = math.eigs(crispAggMatrix).values;
        // Find the eigenvalue with the largest absolute value (which should be real and positive for a consistent PCM)
        lambdaMax = Math.max(...eigenvalues.map(e => Math.abs(math.re(e)))); // Use real part
        if (isNaN(lambdaMax)) throw new Error("Eigenvalue calculation failed");
    } catch (e) {
        console.error("Eigenvalue calculation error:", e);
        lambdaMax = n; // Fallback or signal error
    }

    const CI = (lambdaMax - n) / (n - 1);

    // Random Index (RI) for n=12 is approximately 1.54 (Saaty's values vary slightly)
    const RI = 1.54;
    const CR = RI === 0 ? Infinity : CI / RI;

    return {
        weights: normalizedCrispWeights,
        consistency: {
            lambdaMax: lambdaMax.toFixed(4),
            CI: CI.toFixed(4),
            RI: RI.toFixed(4),
            CR: CR.toFixed(4),
            isConsistent: CR < 0.1 // Common threshold
        },
        // Optionally return intermediate results if needed for debugging
        // fuzzyWeights: fuzzyWeights,
        // aggregatedMatrix: aggregatedMatrix
    };
}

// --- API Endpoints ---

// Serve static files (HTML, CSS, JS)
app.use(express.static('.'));

app.post('/calculate/kano', upload.single('kanoData'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: '未上傳 Kano 資料檔案' });
    }
    try {
        const data = await parseCsvBuffer(req.file.buffer);
        if (!data || data.length === 0) {
            return res.status(400).json({ message: 'CSV 檔案為空或格式錯誤' });
        }
        const results = calculateKano(data);
        res.json(results);
    } catch (error) {
        console.error('Kano calculation error:', error);
        res.status(500).json({ message: `Kano 計算失敗： ${error.message}` });
    }
});

app.post('/calculate/fuzzy-ahp', upload.single('fuzzyAhpData'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: '未上傳 Fuzzy AHP 資料檔案' });
    }
    try {
        const data = await parseCsvBuffer(req.file.buffer);
        if (!data || data.length === 0) {
            return res.status(400).json({ message: 'CSV 檔案為空或格式錯誤' });
        }
        const results = calculateFuzzyAHP(data);
        res.json(results);
    } catch (error) {
        console.error('Fuzzy AHP calculation error:', error);
        res.status(500).json({ message: `Fuzzy AHP 計算失敗： ${error.message}` });
    }
});

// Basic route for root
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

// --- Download Routes ---

app.get('/download/kano', (req, res) => {
    const filePath = path.join(__dirname, 'kano_simulated_data.csv');
    res.download(filePath, 'kano_simulated_data.csv', (err) => {
        if (err) {
            console.error("Error downloading Kano CSV:", err);
            if (!res.headersSent) {
                 res.status(404).send("找不到 Kano 模擬資料檔案 (kano_simulated_data.csv)。請先產生資料。");
            }
        }
    });
});

app.get('/download/fuzzy-ahp', (req, res) => {
    const filePath = path.join(__dirname, 'fuzzy_ahp_simulated_data.csv');
    res.download(filePath, 'fuzzy_ahp_simulated_data.csv', (err) => {
        if (err) {
            console.error("Error downloading Fuzzy AHP CSV:", err);
             if (!res.headersSent) {
                 res.status(404).send("找不到 Fuzzy AHP 模擬資料檔案 (fuzzy_ahp_simulated_data.csv)。請先產生資料。");
             }
        }
    });
});

app.listen(port, () => {
    console.log(`伺服器正在監聽 http://localhost:${port}`);
}); 