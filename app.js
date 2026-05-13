// 1. Configuration - Keys Integrated
const KIT_KEY = 'b11a4116cf8dd565148424da4b9633d2:39d1b5a8bc92e0d2f03d8b739ad7f3cf';
const CLIENT_KEY = '561784262da6308864268e86ebb64a26:473ff86ad2772cd342f6ee090e2e7699';

let provider, signer, userAddress;
let currentTab = 'swap';

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
            actionBtn.innerText = "Swap Now";
            actionBtn.classList.add('ready');
            actionBtn.disabled = false;

            console.log("RALOSWAP: Connected to MetaMask", userAddress);
            updateBalances();
        } catch (error) {
            console.error("Connection failed", error);
        }
    } else {
        alert("Bhai, MetaMask install karlo pehle!");
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

// 4. Price Calculation
function calculatePrice() {
    const fromVal = document.getElementById('fromAmount').value;
    const toInput = document.getElementById('toAmount');
    toInput.value = fromVal > 0 ? (fromVal * 2500).toFixed(2) : "";
}

// 5. Action Execution (Swap/Liquidity)
async function handleAction() {
    if (!userAddress) return connectWallet();
    
    const amount = document.getElementById('fromAmount').value;
    if (!amount || amount <= 0) return alert("Sahi amount daalo!");

    const actionBtn = document.getElementById('actionBtn');
    actionBtn.innerText = "Processing...";
    actionBtn.disabled = true;

    try {
        // Backend API call to Circle logic
        const response = await fetch('/api/swap', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userAddress: userAddress,
                amount: amount,
                type: currentTab,
                clientKey: CLIENT_KEY // Verification for backend
            })
        });

        const data = await response.json();
        if (data.success) {
            alert(`${currentTab.toUpperCase()} Successful!`);
            saveTx(currentTab, amount);
        } else {
            alert("Error: " + data.error);
        }
    } catch (err) {
        alert("Transaction Failed on RALOSWAP!");
    } finally {
        actionBtn.innerText = currentTab === 'swap' ? "Swap Now" : "Supply Liquidity";
        actionBtn.disabled = false;
    }
}

// 6. History Management
function saveTx(type, amount) {
    let history = JSON.parse(localStorage.getItem('ralo_tx')) || [];
    history.unshift({
        type: type.toUpperCase(),
        detail: `${amount} ETH ➜ ARC`,
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

async function updateBalances() {
    if (!provider) return;
    const balance = await provider.getBalance(userAddress);
    document.getElementById('eth-balance').innerText = `Balance: ${parseFloat(ethers.utils.formatEther(balance)).toFixed(4)} ETH`;
}

// Listeners
document.getElementById('connectBtn').addEventListener('click', connectWallet);
document.getElementById('actionBtn').addEventListener('click', handleAction);
