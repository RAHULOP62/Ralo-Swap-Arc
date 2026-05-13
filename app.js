// 1. Configuration & Keys
const KIT_KEY = 'b11a4116cf8dd565148424da4b9633d2:39d1b5a8bc92e0d2f03d8b739ad7f3cf';
const CLIENT_KEY = '561784262da6308864268e86ebb64a26:473ff86ad2772cd342f6ee090e2e7699';

// Arc Testnet Contract Addresses from Documentation
const TOKENS = {
    USDC: "0x3600000000000000000000000000000000000000", // Native/ERC-20 Interface (6 Decimals)
    EURC: "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a", // 6 Decimals
    USYC: "0xe9185F0c5F296Ed1797AaE4238D26CCaBEadb86C"  // Yield-bearing (6 Decimals)
};

const ARC_CHAIN_ID = "0x4cef52"; // Arc Testnet Chain ID

let provider, signer, userAddress;
let currentTab = 'swap';
let currentFromToken = 'USDC';

// Standard ERC-20 ABI
const minABI = [
    "function balanceOf(address) view returns (uint256)", 
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)"
];

// 2. MetaMask Connection with Chain Switching
async function connectWallet() {
    if (window.ethereum) {
        try {
            provider = new ethers.providers.Web3Provider(window.ethereum);
            
            // Auto-switch to Arc Testnet
            try {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: ARC_CHAIN_ID }],
                });
            } catch (switchError) {
                console.log("Switching failed, manual check needed.");
            }

            await provider.send("eth_requestAccounts", []);
            signer = provider.getSigner();
            userAddress = await signer.getAddress();

            // UI Updates
            const btn = document.getElementById('connectBtn');
            btn.innerText = `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`;
            btn.style.background = "#10b981";
            
            const actionBtn = document.getElementById('actionBtn');
            actionBtn.innerText = currentTab === 'swap' ? "Swap Now" : "Supply Liquidity";
            actionBtn.classList.add('ready');
            actionBtn.disabled = false;

            updateBalances();
        } catch (error) {
            console.error("Connection failed:", error);
        }
    } else {
        alert("Bhai, MetaMask install karlo!");
    }
}

// 3. Tab Switching Logic
function switchTab(tab) {
    currentTab = tab;
    const title = document.getElementById('card-title');
    const swapUI = document.getElementById('swap-ui');
    const historyUI = document.getElementById('history-ui');
    const actionBtn = document.getElementById('actionBtn');

    document.querySelectorAll('.nav-links span').forEach(s => s.classList.remove('active'));
    document.getElementById(`tab-${tab}`).classList.add('active');

    if (tab === 'history') {
        title.innerText = "RALOSCAN History";
        swapUI.style.display = "none";
        historyUI.style.display = "block";
        renderHistory();
    } else {
        swapUI.style.display = "block";
        historyUI.style.display = "none";
        title.innerText = tab === 'liquidity' ? "Add Liquidity" : "Swap Tokens";
        if (userAddress) {
            actionBtn.innerText = tab === 'liquidity' ? "Supply Liquidity" : "Swap Now";
        }
    }
}

// 4. Price & Token Logic (Arc-specific scaling)
function calculatePrice() {
    const fromVal = document.getElementById('fromAmount').value;
    const toInput = document.getElementById('toAmount');
    // Real-world FX simulation (USDC to EURC approx rate)
    const rate = currentFromToken === 'USDC' ? 0.92 : 1.08;
    toInput.value = fromVal > 0 ? (fromVal * rate).toFixed(2) : "";
}

function flipTokens() {
    currentFromToken = (currentFromToken === 'USDC') ? 'EURC' : 'USDC';
    const toToken = (currentFromToken === 'USDC') ? 'EURC' : 'USDC';

    document.getElementById('badge-from').innerHTML = `${currentFromToken === 'USDC' ? '💵 USDC' : '💶 EURC'} <small>▼</small>`;
    document.getElementById('badge-to').innerHTML = `${toToken === 'USDC' ? '💵 USDC' : '💶 EURC'} <small>▼</small>`;
    document.getElementById('route-path').innerText = `${currentFromToken} ➜ StableFX ➜ ${toToken}`;
    
    updateBalances();
    calculatePrice();
}

// 5. Handle Action (StableFX & Backend Call)
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
                userAddress: userAddress,
                network: 'arc-testnet'
            })
        });

        const data = await response.json();
        if (data.success) {
            alert(`${currentTab.toUpperCase()} Success on Arc Testnet!`);
            saveTx(currentTab, amount);
            updateBalances();
        } else {
            alert("Error: " + (data.error || "Execution Failed"));
        }
    } catch (err) {
        alert("Transaction Error on RALOSWAP!");
    } finally {
        actionBtn.innerText = currentTab === 'swap' ? "Swap Now" : "Supply Liquidity";
        actionBtn.disabled = false;
    }
}

// 6. Balance Fetching (Arc-specific 6-decimal handling)
async function updateBalances() {
    if (!userAddress || !provider) return;

    try {
        const usdcContract = new ethers.Contract(TOKENS.USDC, minABI, provider);
        const eurcContract = new ethers.Contract(TOKENS.EURC, minABI, provider);

        const usdcBal = await usdcContract.balanceOf(userAddress);
        const eurcBal = await eurcContract.balanceOf(userAddress);

        // Arc Testnet USDC/EURC use 6 decimals
        document.getElementById('token1-balance').innerText = `Balance: ${parseFloat(ethers.utils.formatUnits(usdcBal, 6)).toFixed(2)} USDC`;
        document.getElementById('token2-balance').innerText = `Balance: ${parseFloat(ethers.utils.formatUnits(eurcBal, 6)).toFixed(2)} EURC`;
    } catch (err) {
        console.error("Balance fetch error:", err);
    }
}

// 7. History Management
function saveTx(type, amount) {
    let history = JSON.parse(localStorage.getItem('ralo_tx')) || [];
    const target = currentFromToken === 'USDC' ? 'EURC' : 'USDC';
    history.unshift({
        type: type.toUpperCase(),
        detail: `${amount} ${currentFromToken} ➜ ${(amount * 0.92).toFixed(2)} ${target}`,
        time: new Date().toLocaleTimeString(),
        status: "Success"
    });
    localStorage.setItem('ralo_tx', JSON.stringify(history));
}

function renderHistory() {
    const list = document.getElementById('history-list');
    const history = JSON.parse(localStorage.getItem('ralo_tx')) || [];
    
    if (history.length === 0) {
        list.innerHTML = `<p style="text-align:center; color:gray; padding:20px;">No history found on RALOSCAN.</p>`;
        return;
    }

    list.innerHTML = history.map(tx => `
        <div class="details-box">
            <div class="detail-row">
                <span class="label"><b>${tx.type}</b></span>
                <span class="value" style="color:#10b981;">${tx.status}</span>
            </div>
            <div class="detail-row">
                <span class="label">${tx.detail}</span>
                <span class="value">${tx.time}</span>
            </div>
        </div>
    `).join('');
}

// Listeners
document.getElementById('connectBtn').addEventListener('click', connectWallet);
document.getElementById('actionBtn').addEventListener('click', handleAction);
