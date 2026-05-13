// --- CONFIGURATION ---
const ARC_TESTNET = {
    chainId: "0x4CEF52", // 5042002
    chainName: "Arc Testnet",
    nativeCurrency: {
        name: "USDC",
        symbol: "USDC",
        decimals: 18
    },
    rpcUrls: ["https://rpc.testnet.arc.network"],
    blockExplorerUrls: ["https://testnet.arcscan.app"]
};

// Circle Docs ke mutabiq application-level par 6 decimals use hote hain
const USDC_DECIMALS = 6; 
let provider, signer, userAddress;

// 1. WALLET CONNECTION LOGIC
async function connectWallet() {
    if (typeof window.ethereum !== 'undefined') {
        try {
            // Requesting Accounts
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            userAddress = accounts[0];

            // Network Switch/Add Logic
            try {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: ARC_TESTNET.chainId }],
                });
            } catch (switchError) {
                if (switchError.code === 4902) {
                    await window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [ARC_TESTNET],
                    });
                }
            }

            // Setup Ethers
            provider = new ethers.providers.Web3Provider(window.ethereum);
            signer = provider.getSigner();

            // Update UI
            updateUIConnected();
            fetchBalance();

        } catch (error) {
            console.error("User rejected connection", error);
        }
    } else {
        alert("MetaMask install karein!");
    }
}

// 2. UI UPDATE AFTER CONNECTION
function updateUIConnected() {
    const btn = document.getElementById('connectWallet');
    const swapBtn = document.getElementById('swapBtn');
    
    btn.innerText = userAddress.slice(0, 6) + "..." + userAddress.slice(-4);
    btn.classList.add('text-[#d4ff33]');
    
    swapBtn.innerText = "Review Swap";
    swapBtn.classList.remove('opacity-50');
}

// 3. FETCH BALANCE (Native USDC 18-decimal display as 6)
async function fetchBalance() {
    try {
        const balance = await provider.getBalance(userAddress);
        // Display using 6 decimals as per Circle App Kit best practices
        const formatted = ethers.utils.formatUnits(balance, 18); 
        document.getElementById('usdcBalance').innerText = parseFloat(formatted).toFixed(2);
    } catch (err) {
        console.log("Balance error:", err);
    }
}

// 4. ESTIMATE SWAP RATE (Logic based on Circle Docs)
const inputAmount = document.getElementById('inputAmount');
const outputAmount = document.getElementById('outputAmount');

inputAmount.addEventListener('input', async (e) => {
    const val = e.target.value;
    if (val > 0) {
        // Simulation of kit.estimateSwap()
        // Asli rate Fetch karne ke liye Circle Kit Key zaroori hai
        const rate = 0.9214; 
        const estimatedOutput = val * rate;
        
        outputAmount.value = estimatedOutput.toFixed(4);
        document.getElementById('minReceived').innerText = (estimatedOutput * 0.99).toFixed(4); // 1% Slippage
        document.getElementById('rateDisplay').innerText = rate;
    } else {
        outputAmount.value = "";
        document.getElementById('minReceived').innerText = "0.00";
    }
});

// 5. EXECUTE SWAP (Placeholder for Circle kit.swap)
async function handleSwap() {
    if (!userAddress) {
        connectWallet();
        return;
    }

    const amount = inputAmount.value;
    if (!amount) return;

    try {
        const swapBtn = document.getElementById('swapBtn');
        swapBtn.innerText = "Processing Transaction...";
        swapBtn.disabled = true;

        // Yahan Circle SDK ka 'kit.swap' call hoga
        console.log("Initiating swap on Arc Testnet for:", amount);
        
        // Transaction Simulation
        setTimeout(() => {
            alert("Swap Successful on Arc Testnet!");
            swapBtn.innerText = "Swap Success";
            swapBtn.disabled = false;
            fetchBalance();
        }, 3000);

    } catch (error) {
        console.error("Swap failed", error);
        alert("Transaction failed!");
    }
}

// Event Listeners
document.getElementById('connectWallet').addEventListener('click', connectWallet);
document.getElementById('swapBtn').addEventListener('click', handleSwap);
