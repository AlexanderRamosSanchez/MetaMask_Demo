const connectButton = document.getElementById('connectButton');
const accountDisplay = document.getElementById('account');
const balanceDisplay = document.getElementById('balance');
const accountInfo = document.getElementById('accountInfo');
const sendEther = document.getElementById('sendEther');
const sendButton = document.getElementById('sendButton');
const transactionStatus = document.getElementById('transactionStatus');

connectButton.onclick = async () => {
    if (window.ethereum) {
        try {
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const balance = await provider.getBalance(accounts[0]);
            const balanceInEth = ethers.utils.formatEther(balance);

            accountDisplay.innerText = `Cuenta: ${accounts[0]}`;
            balanceDisplay.innerText = `Saldo: ${balanceInEth} ETH`;
            accountInfo.classList.remove('hidden');
            sendEther.classList.remove('hidden');
        } catch (error) {
            console.error(error);
            alert('Error al conectar a MetaMask.');
        }
    } else {
        alert('Por favor, instala MetaMask.');
    }
};

sendButton.onclick = async () => {
    const recipient = document.getElementById('recipient').value;
    const amount = document.getElementById('amount').value;

    if (!ethers.utils.isAddress(recipient)) {
        transactionStatus.innerText = 'Dirección inválida.';
        return;
    }

    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const tx = {
        to: recipient,
        value: ethers.utils.parseEther(amount)
    };

    try {
        const transactionResponse = await signer.sendTransaction(tx);
        await transactionResponse.wait();
        transactionStatus.innerText = 'Transacción enviada con éxito!';
    } catch (error) {
        console.error(error);
        transactionStatus.innerText = 'Error al enviar la transacción.';
    }
};
