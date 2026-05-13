// 1. Configuration & Keys
const KIT_KEY = 'b11a4116cf8dd565148424da4b9633d2:39d1b5a8bc92e0d2f03d8b739ad7f3cf';
const CLIENT_KEY = '561784262da6308864268e86ebb64a26:473ff86ad2772cd342f6ee090e2e7699';

// Arc Testnet Token Addresses
const TOKENS = {
    tUSDC: "0x28E49B36C1c6fD16ad81aB152488f37C93b3D8CA",
    tARC: "0xe66a11cb4b147F208e6d81B7540bfc83E1680c78"
};

let provider, signer, userAddress;
let currentTab = 'swap';
let currentFromToken = 'tUSDC';

// Standard ERC-20 ABI to read balance
const minABI = ["function balanceOf(address) view returns (uint256)", "function decimals() view returns (uint8)"];

// 2. MetaMask Connection
async function connectWallet() {
    if (window.ethereum) {
        try {
            provider = new ethers.providers.Web3Provider(window.ethereum);
            await provider.send("eth_requestAccounts", []);
            signer = provider.getSigner();
            userAddress = await signer.getAddress();

            // UI Updates
            const btn = document.getElementById('connectBtn');
            btn.innerText = `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`;
            btn.style.background = "#059669";
            
            const actionBtn = document.getElementById('actionBtn');
            actionBtn.innerText = currentTab === 'swap' ? "Swap Now" : "Supply Liquidity";
            actionBtn.classList.add('ready');
            actionBtn.disabled = false;

            console.log("RALOSWAP Connected:", userAddress);
            updateBalances();
        } catch (error) {
            console.error("User rejected connection");
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

// 4. Price & Token Logic
function calculatePrice() {
    const fromVal = document.getElementById('fromAmount').value;
    const toInput = document.getElementById('toAmount');
    // Simulation: 1 tUSDC = 1.5 tARC
    const rate = currentFromToken === 'tUSDC' ? 1.5 : 0.66;
    toInput.value = fromVal > 0 ? (fromVal * rate).toFixed(4) : "";
}

function flipTokens() {
    currentFromToken = (currentFromToken === 'tUSDC') ? 'tARC' : 'tUSDC';
    const toToken = (currentFromToken === 'tUSDC') ? 'tARC' : 'tUSDC';

    document.getElementById('badge-from').innerHTML = `${currentFromToken === 'tUSDC' ? '💵 tUSDC' : '🌀 tARC'} <small>▼</small>`;
    document.getElementById('badge-to').innerHTML = `${toToken === 'tUSDC' ? '💵 tUSDC' : '🌀 tARC'} <small>▼</small>`;
    document.getElementById('route-path').innerText = `${currentFromToken} ➜ ${toToken}`;
    
    updateBalances();
    calculatePrice();
}

// 5. Handle Action (Backend API Call)
async function handleAction() {
    if (!userAddress) return connectWallet();
    
    const amount = document.getElementById('fromAmount').value;
    if (!amount || amount <= 0) return alert("Valid amount daalo!");

    const actionBtn = document.getElementById('actionBtn');
    actionBtn.innerText = "Processing...";
    actionBtn.disabled = true;

    try {
        // Calling your Vercel/Node.js Backend
        const response = await fetch('/api/swap', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                walletId: "YOUR_CIRCLE_WALLET_ID", // Backend uses this for Developer Controlled Wallets
                fromSymbol: currentFromToken,
                amount: amount,
                userAddress: userAddress // For verification
            })
        });

        const data = await response.json();
        if (data.success) {
            alert(`${currentTab.toUpperCase()} Successful!`);
            saveTx(currentTab, amount);
            updateBalances();
        } else {
            alert("Error: " + (data.error || "Transaction Failed"));
        }
    } catch (err) {
        alert("Transaction Error on RALOSWAP!");
    } finally {
        actionBtn.innerText = currentTab === 'swap' ? "Swap Now" : "Supply Liquidity";
        actionBtn.disabled = false;
    }
}

// 6. Balance Fetching (Using Ethers)
async function updateBalances() {
    if (!userAddress || !provider) return;

    try {
        const tUSDCContract = new ethers.Contract(TOKENS.tUSDC, minABI, provider);
        const tARCContract = new ethers.Contract(TOKENS.tARC, minABI, provider);

        const usdcBal = await tUSDCContract.balanceOf(userAddress);
        const arcBal = await tARCContract.balanceOf(userAddress);

        document.getElementById('balance-from').innerText = `Balance: ${parseFloat(ethers.utils.formatUnits(usdcBal, 18)).toFixed(2)} tUSDC`;
        document.getElementById('balance-to').innerText = `Balance: ${parseFloat(ethers.utils.formatUnits(arcBal, 18)).toFixed(2)} tARC`;
    } catch (err) {
        console.error("Balance fetch error:", err);
    }
}

// 7. History Management
function saveTx(type, amount) {
    let history = JSON.parse(localStorage.getItem('ralo_tx')) || [];
    history.unshift({
        type: type.toUpperCase(),
        detail: `${amount} ${currentFromToken} ➜ ${(amount * 1.5).toFixed(2)} ${currentFromToken === 'tUSDC' ? 'tARC' : 'tUSDC'}`,
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

// Event Listeners
document.getElementById('connectBtn').addEventListener('click', connectWallet);
document.getElementById('actionBtn').addEventListener('click', handleAction);
