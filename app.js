// 1. Arc Network Stablecoin Addresses
const TOKENS = {
    USDC: "0x3600000000000000000000000000000000000000",
    EURC: "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a"
};

let provider, signer, userAddress;
let currentFromToken = 'USDC';

// 2. Connect Wallet (Address formatting 0x1234...abcd)
async function connectWallet() {
    if (!window.ethereum) {
        alert("Bhai MetaMask install karo!");
        return;
    }

    try {
        // Init Provider
        provider = new ethers.providers.Web3Provider(window.ethereum);
        
        // Request Accounts
        const accounts = await provider.send("eth_requestAccounts", []);
        userAddress = accounts[0];
        signer = provider.getSigner();

        // UI Update: Address Format (0x1234...abcd)
        const btn = document.getElementById('connectBtn');
        const shortAddr = `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`;
        btn.innerText = shortAddr;
        btn.style.background = "#10b981"; 

        // Enable Action Button
        const actionBtn = document.getElementById('actionBtn');
        actionBtn.innerText = "Swap Now";
        actionBtn.classList.add('ready');
        actionBtn.disabled = false;

        // Load Initial Tokens
        setupUI();
        updateBalances();
        
    } catch (err) {
        console.error("Connection error", err);
    }
}

// 3. UI Token Display
function setupUI() {
    const toToken = currentFromToken === 'USDC' ? 'EURC' : 'USDC';
    document.getElementById('badge-from').innerHTML = `${currentFromToken === 'USDC' ? '💵 USDC' : '💶 EURC'} <small>▼</small>`;
    document.getElementById('badge-to').innerHTML = `${toToken === 'USDC' ? '💵 USDC' : '💶 EURC'} <small>▼</small>`;
    document.getElementById('route-path').innerText = `${currentFromToken} ➜ StableFX ➜ ${toToken}`;
}

// 4. Balance Fetching (6 Decimals for Arc)
async function updateBalances() {
    if (!userAddress || !provider) return;
    const abi = ["function balanceOf(address) view returns (uint256)"];
    
    try {
        const usdcContract = new ethers.Contract(TOKENS.USDC, abi, provider);
        const eurcContract = new ethers.Contract(TOKENS.EURC, abi, provider);

        const uBal = await usdcContract.balanceOf(userAddress);
        const eBal = await eurcContract.balanceOf(userAddress);

        document.getElementById('token1-balance').innerText = `Balance: ${parseFloat(ethers.utils.formatUnits(uBal, 6)).toFixed(2)} USDC`;
        document.getElementById('token2-balance').innerText = `Balance: ${parseFloat(ethers.utils.formatUnits(eBal, 6)).toFixed(2)} EURC`;
    } catch (e) {
        console.log("Balance fetch error", e);
    }
}

// 5. Flip Logic
function flipTokens() {
    currentFromToken = currentFromToken === 'USDC' ? 'EURC' : 'USDC';
    setupUI();
    updateBalances();
}

// 6. Price Calculation
function calculatePrice() {
    const val = document.getElementById('fromAmount').value;
    const rate = currentFromToken === 'USDC' ? 0.92 : 1.08;
    document.getElementById('toAmount').value = val > 0 ? (val * rate).toFixed(2) : "";
}

// Tab Switch
function switchTab(tab) {
    document.querySelectorAll('.nav-links span').forEach(s => s.classList.remove('active'));
    document.getElementById(`tab-${tab}`).classList.add('active');
    document.getElementById('swap-ui').style.display = tab === 'history' ? 'none' : 'block';
    document.getElementById('history-ui').style.display = tab === 'history' ? 'block' : 'none';
}

// Action Listener
document.getElementById('connectBtn').addEventListener('click', connectWallet);
