const fs = require('fs');

const NUM_PARTICIPANTS = 300;
const NUM_CHARACTERISTICS = 12;

// --- Web3 Characteristics (Names for column generation) ---
const characteristics = [
    'Decentralization', 'Data_Ownership', 'Smart_Contracts', 'Trustless', 'Immutability',
    'Consensus_Mechanism', 'Tokenomics', 'Privacy', 'Disintermediation', 'Self_Sovereign_Identity',
    'Openness', 'Community_Governance'
];

// Helper function to generate random integer between min and max (inclusive)
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// --- Generate Kano Data ---
let kanoCsvContent = 'participant_id';
characteristics.forEach(char => {
    kanoCsvContent += `,${char}_func,${char}_dysfunc`;
});
kanoCsvContent += '\n';

for (let i = 1; i <= NUM_PARTICIPANTS; i++) {
    let row = `${i}`;
    characteristics.forEach(() => {
        const funcAnswer = getRandomInt(1, 5);
        const dysfuncAnswer = getRandomInt(1, 5);
        row += `,${funcAnswer},${dysfuncAnswer}`;
    });
    kanoCsvContent += row + '\n';
}

fs.writeFileSync('kano_simulated_data.csv', kanoCsvContent);
console.log('Generated kano_simulated_data.csv');

// --- Generate Fuzzy AHP Data ---
let ahpCsvContent = 'participant_id';
const comparisonHeaders = [];
for (let i = 0; i < NUM_CHARACTERISTICS; i++) {
    for (let j = i + 1; j < NUM_CHARACTERISTICS; j++) {
        const header = `C${i + 1}_vs_C${j + 1}`;
        ahpCsvContent += `,${header}`;
        comparisonHeaders.push(header);
    }
}
ahpCsvContent += '\n';

for (let i = 1; i <= NUM_PARTICIPANTS; i++) {
    let row = `${i}`;
    comparisonHeaders.forEach(() => {
        const rating = getRandomInt(1, 9);
        row += `,${rating}`;
    });
    ahpCsvContent += row + '\n';
}

fs.writeFileSync('fuzzy_ahp_simulated_data.csv', ahpCsvContent);
console.log('Generated fuzzy_ahp_simulated_data.csv'); 