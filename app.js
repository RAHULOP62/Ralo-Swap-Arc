// 1. Arc Network Config
const ARC_CONFIG = {
    chainId: '0x32', // 50 in Decimal
    chainName: 'Arc Testnet',
    nativeCurrency: { name: 'ARC', symbol: 'ARC', decimals: 18 },
    rpcUrls: ['https://rpc-testnet.arc.network/'],
    blockExplorerUrls: ['https://explorer-testnet.arc.network/']
};

const TOKENS = {
    USDC: { address: "0x3600000000000000000000000000000000000000", symbol: "USDC", color: "bg-blue-500" },
    EURC: { address: "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a", symbol: "EURC", color: "bg-emerald-500" }
};

let provider, signer, userAddress;
let currentFrom = 'USDC';
let isCorrectNetwork = false;

// 2. Connect & Network Logic
async function connectWallet() {
    if (!window.ethereum) {
        alert("Bhai MetaMask install karo!");
        return;
    }

    try {
        provider = new ethers.providers.Web3Provider(window.ethereum);
        
        // Network Check
        const { chainId } = await provider.getNetwork();
        if (chainId !== 50) {
            try {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: ARC_CONFIG.chainId }],
                });
            } catch (err) {
                if (err.code === 4902) {
                    await window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [ARC_CONFIG],
                    });
                } else {
                    alert("Please switch to Arc Testnet!");
                    return;
                }
            }
        }

        const accounts = await provider.send("eth_requestAccounts", []);
        userAddress = accounts[0];
        signer = provider.getSigner();
        isCorrectNetwork = true;

        updateUI();
        updateBalances();
        
    } catch (err) {
        console.error("Connection failed", err);
    }
}

// 3. UI Updates
function updateUI() {
    const btn = document.getElementById('connectBtn');
    if (userAddress) {
        btn.innerText = `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`;
        const actionBtn = document.getElementById('actionBtn');
        actionBtn.innerText = "Swap Now";
        actionBtn.disabled = false;
    }

    const from = TOKENS[currentFrom];
    const to = currentFrom === 'USDC' ? TOKENS.EURC : TOKENS.USDC;

    document.getElementById('badge-from').innerHTML = `<div class="w-6 h-6 rounded-full ${from.color}"></div> ${from.symbol}`;
    document.getElementById('badge-to').innerHTML = `<div class="w-6 h-6 rounded-full ${to.color}"></div> ${to.symbol}`;
    
    const rate = currentFrom === 'USDC' ? 0.92 : 1.08;
    document.getElementById('rate-value').innerText = `1 ${from.symbol} = ${rate} ${to.symbol}`;
    document.getElementById('route-path').innerText = `${from.symbol} ➜ StableFX ➜ ${to.symbol}`;
}

async function updateBalances() {
    if (!userAddress) return;
    const abi = ["function balanceOf(address) view returns (uint256)"];
    
    try {
        const usdcContract = new ethers.Contract(TOKENS.USDC.address, abi, provider);
        const eurcContract = new ethers.Contract(TOKENS.EURC.address, abi, provider);

        const uBal = await usdcContract.balanceOf(userAddress);
        const eBal = await eurcContract.balanceOf(userAddress);

        document.getElementById('token1-balance').innerText = `Balance: ${currentFrom === 'USDC' ? ethers.utils.formatUnits(uBal, 6) : ethers.utils.formatUnits(eBal, 6)}`;
        document.getElementById('token2-balance').innerText = `Balance: ${currentFrom === 'USDC' ? ethers.utils.formatUnits(eBal, 6) : ethers.utils.formatUnits(uBal, 6)}`;
    } catch (e) {
        console.log("Balance fetch error", e);
    }
}

// 4. Action Logic
function calculatePrice() {
    const val = document.getElementById('fromAmount').value;
    const rate = currentFrom === 'USDC' ? 0.92 : 1.08;
    document.getElementById('toAmount').value = val > 0 ? (val * rate).toFixed(2) : "";
}

function flipTokens() {
    currentFrom = currentFrom === 'USDC' ? 'EURC' : 'USDC';
    updateUI();
    updateBalances();
    calculatePrice();
}

async function handleAction() {
    if (!userAddress) {
        connectWallet();
        return;
    }

    const amount = document.getElementById('fromAmount').value;
    if (!amount || amount <= 0) {
        alert("Amount toh daalo!");
        return;
    }

    const btn = document.getElementById('actionBtn');
    btn.innerText = "Processing...";
    btn.disabled = true;

    try {
        // Real Transaction Trigger (0 content transfer for gas test)
        const tx = await signer.sendTransaction({
            to: userAddress,
            value: 0
        });
        await tx.wait();
        alert("Swap Successful on Arc Testnet!");
    } catch (e) {
        console.error(e);
        alert("Transaction failed!");
    } finally {
        btn.innerText = "Swap Now";
        btn.disabled = false;
        updateBalances();
    }
}

document.getElementById('connectBtn').addEventListener('click', connectWallet);
