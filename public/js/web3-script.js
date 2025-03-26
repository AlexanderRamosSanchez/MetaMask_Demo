const connectButton = document.getElementById('connectButton');
const disconnectButton = document.getElementById('disconnectButton');
const accountDisplay = document.getElementById('account');
const balanceDisplay = document.getElementById('balance');
const accountInfo = document.getElementById('accountInfo');
const sendEther = document.getElementById('sendEther');
const sendButton = document.getElementById('sendButton');
const transactionStatus = document.getElementById('transactionStatus');

let web3;
let account;

connectButton.onclick = async () => {
if (typeof window.ethereum !== 'undefined') {
try {
await window.ethereum.request({ method: 'eth_requestAccounts' });
web3 = new Web3(window.ethereum);
account = (await web3.eth.getAccounts())[0];
const balance = await web3.eth.getBalance(account);
const balanceInEth = web3.utils.fromWei(balance, 'ether');

        accountDisplay.innerText = `Cuenta: ${account}`;
        balanceDisplay.innerText = `Saldo: ${balanceInEth} ETH`;
        accountInfo.classList.remove('hidden');
        sendEther.classList.remove('hidden');
        connectButton.classList.add('hidden');
        disconnectButton.classList.remove('hidden');
    } catch (error) {
        console.error(error);
        alert('Error al conectar a MetaMask.');
    }
} else {
    alert('Por favor, instala MetaMask.');
}
};

disconnectButton.onclick = async () => {
try {
await window.ethereum.disconnect();
accountDisplay.innerText = '';
balanceDisplay.innerText = '';
accountInfo.classList.add('hidden');
sendEther.classList.add('hidden');
connectButton.classList.remove('hidden');
disconnectButton.classList.add('hidden');
} catch (error) {
console.error(error);
alert('Error al desconectar de MetaMask.');
}
};

sendButton.onclick = async () => {
const recipient = document.getElementById('recipient').value;
const amount = document.getElementById('amount').value;

if (!web3.utils.isAddress(recipient)) {
    transactionStatus.innerText = 'Dirección inválida.';
    return;
}

try {
    const tx = {
        to: recipient,
        value: web3.utils.toWei(amount, 'ether')
    };
    const transactionReceipt = await web3.eth.sendTransaction(tx);
    transactionStatus.innerText = 'Transacción enviada con éxito!';
} catch (error) {
    console.error(error);
    transactionStatus.innerText = 'Error al enviar la transacción.';
}
};