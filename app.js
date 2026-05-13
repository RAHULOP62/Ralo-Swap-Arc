// 1. Configuration & Keys
const ETHERS_CDN = "https://cdn.ethers.io/lib/ethers-5.2.umd.min.js";
const KIT_KEY = 'b11a4116cf8dd565148424da4b9633d2:39d1b5a8bc92e0d2f03d8b739ad7f3cf';
const CLIENT_KEY = '561784262da6308864268e86ebb64a26:473ff86ad2772cd342f6ee090e2e7699';

// Arc Testnet Contract Addresses
const TOKENS = {
    USDC: "0x3600000000000000000000000000000000000000", 
    EURC: "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a", 
    USYC: "0xe9185F0c5F296Ed1797AaE4238D26CCaBEadb86C"  
};

const ARC_CHAIN_ID = "0x4cef52"; // Arc Testnet
let provider, signer, userAddress;
let currentTab = 'swap';
let currentFromToken = 'USDC';

// Ethers Loader
function loadEthers() {
    return new Promise((resolve, reject) => {
        if (window.ethers) { resolve(); return; }
        const script = document.createElement("script");
        script.src = ETHERS_CDN;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Ethers load failed"));
        document.head.appendChild(script);
    });
}

// 2. MetaMask Connection with Auto-Chain Switch
async function connectWallet() {
    try {
        await loadEthers();
        if (!window.ethereum) return alert("MetaMask install karo bhai!");

        provider = new ethers.providers.Web3Provider(window.ethereum);

        // Auto-switch to Arc Testnet
        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: ARC_CHAIN_ID }],
            });
        } catch (err) {
            if (err.code === 4902) alert("Arc Testnet MetaMask mein add karo!");
        }

        const accounts = await provider.send("eth_requestAccounts", []);
        userAddress = accounts[0];
        signer = provider.getSigner();

        // UI Updates: Address Short Form (0x1234...abcd)
        const btn = document.getElementById('connectBtn');
        btn.innerText = `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`;
        btn.style.background = "#10b981";
        
        const actionBtn = document.getElementById('actionBtn');
        actionBtn.innerText = currentTab === 'swap' ? "Swap Now" : "Supply Liquidity";
        actionBtn.classList.add('ready');
        actionBtn.disabled = false;

        // Initialize UI with tokens
        setupUI();
        updateBalances();
    } catch (error) {
        console.error("Connection error:", error);
    }
}

// 3. Tab Switching Logic
function switchTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.nav-links span').forEach(s => s.classList.remove('active'));
    document.getElementById(`tab-${tab}`).classList.add('active');
    
    document.getElementById('card-title').innerText = tab === 'liquidity' ? "Add Liquidity" : (tab === 'history' ? "RALOSCAN History" : "Swap Tokens");
    document.getElementById('swap-ui').style.display = tab === 'history' ? 'none' : 'block';
    document.getElementById('history-ui').style.display = tab === 'history' ? 'block' : 'none';
    
    if (userAddress) {
        document.getElementById('actionBtn').innerText = tab === 'liquidity' ? "Supply Liquidity" : "Swap Now";
    }
    if (tab === 'history') renderHistory();
}

// 4. Price & Token UI Logic
function calculatePrice() {
    const val = document.getElementById('fromAmount').value;
    const rate = currentFromToken === 'USDC' ? 0.92 : 1.08;
    document.getElementById('toAmount').value = val > 0 ? (val * rate).toFixed(2) : "";
}

function setupUI() {
    const toToken = currentFromToken === 'USDC' ? 'EURC' : 'USDC';
    document.getElementById('badge-from').innerHTML = `${currentFromToken === 'USDC' ? '💵 USDC' : '💶 EURC'} <small>▼</small>`;
    document.getElementById('badge-to').innerHTML = `${toToken === 'USDC' ? '💵 USDC' : '💶 EURC'} <small>▼</small>`;
    document.getElementById('route-path').innerText = `${currentFromToken} ➜ StableFX ➜ ${toToken}`;
}

function flipTokens() {
    currentFromToken = (currentFromToken === 'USDC') ? 'EURC' : 'USDC';
    setupUI();
    updateBalances();
    calculatePrice();
}

// 5. Handle Action (Backend API Call)
async function handleAction() {
    if (!userAddress) return connectWallet();
    const amount = document.getElementById('fromAmount').value;
    if (!amount || amount <= 0) return alert("Sahi amount daalo!");

    const actionBtn = document.getElementById('actionBtn');
    actionBtn.innerText = "Processing...";
    actionBtn.disabled = true;

    try {
        const response = await fetch('/api/swap', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                walletId: "YOUR_CIRCLE_WALLET_ID",
                fromSymbol: currentFromToken,
                amount: amount,
                userAddress: userAddress
            })
        });

        const data = await response.json();
        if (data.success) {
            alert("Success on Arc Testnet!");
            saveTx(currentTab, amount);
            updateBalances();
        } else {
            alert("Error: " + (data.error || "Failed"));
        }
    } catch (err) {
        alert("Transaction Failed!");
    } finally {
        actionBtn.innerText = currentTab === 'swap' ? "Swap Now" : "Supply Liquidity";
        actionBtn.disabled = false;
    }
}

// 6. Balance Fetching (Standard 6 Decimals for Arc)
async function updateBalances() {
    if (!userAddress || !provider) return;
    const minABI = ["function balanceOf(address) view returns (uint256)"];
    
    try {
        const usdcContract = new ethers.Contract(TOKENS.USDC, minABI, provider);
        const eurcContract = new ethers.Contract(TOKENS.EURC, minABI, provider);

        const uBal = await usdcContract.balanceOf(userAddress);
        const eBal = await eurcContract.balanceOf(userAddress);

        document.getElementById('token1-balance').innerText = `Balance: ${parseFloat(ethers.utils.formatUnits(uBal, 6)).toFixed(2)} USDC`;
        document.getElementById('token2-balance').innerText = `Balance: ${parseFloat(ethers.utils.formatUnits(eBal, 6)).toFixed(2)} EURC`;
    } catch (e) {
        console.error("Balance error:", e);
    }
}

// 7. History Management
function saveTx(type, amount) {
    let history = JSON.parse(localStorage.getItem('ralo_tx')) || [];
    history.unshift({
        type: type.toUpperCase(),
        detail: `${amount} ${currentFromToken} ➜ Arc Network`,
        time: new Date().toLocaleTimeString(),
        status: "Success"
    });
    localStorage.setItem('ralo_tx', JSON.stringify(history));
}

function renderHistory() {
    const list = document.getElementById('history-list');
    const history = JSON.parse(localStorage.getItem('ralo_tx')) || [];
    list.innerHTML = history.map(tx => `
        <div class="details-box">
            <div class="detail-row"><b>${tx.type}</b> <span style="color:#10b981;">${tx.status}</span></div>
            <div class="detail-row"><span>${tx.detail}</span> <span>${tx.time}</span></div>
        </div>
    `).join('') || `<p style="text-align:center; padding:20px;">No history.</p>`;
}

// Initial Listeners
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('connectBtn').addEventListener('click', connectWallet);
    document.getElementById('actionBtn').addEventListener('click', handleAction);
});
