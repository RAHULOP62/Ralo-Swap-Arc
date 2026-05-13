// 1. Configuration & Initialization
const KIT_KEY = 'b11a4116cf8dd565148424da4b9633d2:39d1b5a8bc92e0d2f03d8b739ad7f3cf';
const CLIENT_KEY = 'YOUR_CLIENT_KEY_HERE'; // Dashboard ke 3rd option se generate karle
const PROJECT_ID = 'YOUR_PROJECT_ID_HERE'; // Browser URL se nikal le

let userWalletId = null;
let txHistory = JSON.parse(localStorage.getItem('arc_tx_history')) || [];

// Arc App Kit Setup
const arcAppKit = new ArcAppKit({
    appKitKey: KIT_KEY,
    clientKey: CLIENT_KEY,
    network: 'arc-testnet'
});

// 2. UI Elements
const connectBtn = document.getElementById('connectBtn');
const swapBtn = document.getElementById('swapBtn');
const fromAmount = document.getElementById('fromAmount');
const toAmount = document.getElementById('toAmount');
const navLinks = document.querySelectorAll('.nav-links span');

// 3. Tab Navigation Logic
navLinks.forEach(link => {
    link.addEventListener('click', () => {
        navLinks.forEach(s => s.classList.remove('active'));
        link.classList.add('active');
        const tab = link.innerText.toLowerCase();
        updateUIForTab(tab);
    });
});

function updateUIForTab(tab) {
    const cardHeader = document.querySelector('.card-header h3');
    if (tab === 'liquidity') {
        cardHeader.innerText = 'Add Liquidity';
        swapBtn.innerText = userWalletId ? 'Supply' : 'Connect Wallet';
    } else if (tab === 'history') {
        renderHistory();
    } else {
        cardHeader.innerText = 'Swap Tokens';
        swapBtn.innerText = userWalletId ? 'Swap' : 'Connect Wallet First';
    }
}

// 4. Wallet Connection
connectBtn.addEventListener('click', async () => {
    try {
        const wallet = await arcAppKit.connect();
        userWalletId = wallet.id;
        connectBtn.innerText = `Connected: ${wallet.address.slice(0,6)}...`;
        swapBtn.innerText = 'Swap';
        swapBtn.style.background = 'var(--primary)';
        console.log("Wallet Connected:", userWalletId);
    } catch (err) {
        alert("Connection Failed: " + err.message);
    }
});

// 5. Swap Logic (Backend API Call)
swapBtn.addEventListener('click', async () => {
    if (!userWalletId) return alert("Pehle wallet connect karo!");
    
    const amount = fromAmount.value;
    if (!amount || amount <= 0) return alert("Sahi amount daalo!");

    swapBtn.innerText = "Processing...";
    swapBtn.disabled = true;

    try {
        // Tumhare Vercel API ko call kar raha hai
        const response = await fetch('/api/swap', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                walletId: userWalletId,
                fromSymbol: 'tUSDC', // Logic: ETH/ARC replacement
                amount: amount
            })
        });

        const result = await response.json();
        
        if (result.success) {
            alert("Transaction Success!");
            addTxToHistory("SWAP", `Swapped ${amount} ETH for ARC`);
            fromAmount.value = "";
            toAmount.value = "";
        } else {
            alert("Error: " + result.error);
        }
    } catch (err) {
        alert("Request Failed: " + err.message);
    } finally {
        swapBtn.innerText = "Swap";
        swapBtn.disabled = false;
    }
});

// 6. Price Calculation Simulation
fromAmount.addEventListener('input', (e) => {
    const val = e.target.value;
    if (val) {
        // Testnet simulation: 1 ETH = 2500 ARC
        toAmount.value = (val * 2500).toFixed(2);
    } else {
        toAmount.value = "";
    }
});

// 7. History Management
function addTxToHistory(type, desc) {
    const newTx = {
        type,
        desc,
        date: new Date().toLocaleString(),
        status: 'Completed'
    };
    txHistory.unshift(newTx);
    localStorage.setItem('arc_tx_history', JSON.stringify(txHistory));
}

function renderHistory() {
    const container = document.querySelector('.main-content');
    let html = `<div class="swap-card"><h3>Transaction History</h3>`;
    
    if (txHistory.length === 0) {
        html += `<p style="color:var(--subtext); font-size:14px;">No transactions yet.</p>`;
    } else {
        txHistory.forEach(tx => {
            html += `
                <div class="details-box" style="margin-bottom:10px;">
                    <div class="detail-row"><b>${tx.type}</b> <span>${tx.status}</span></div>
                    <div class="detail-row"><small>${tx.desc}</small> <small>${tx.date}</small></div>
                </div>`;
        });
    }
    html += `<button onclick="window.location.reload()" class="swap-button">Back to Swap</button></div>`;
    container.innerHTML = html;
}
