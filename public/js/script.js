// Variables globales
let provider, signer, currentAccount, currentChainId;
const ethPrice = 3500; // Valor ficticio para conversión a USD

// Almacenar transacciones realizadas en esta sesión
let sessionTransactions = [];

// Inicializar tooltips de Bootstrap
document.addEventListener('DOMContentLoaded', function() {
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Verificar si MetaMask está instalado al cargar la página
    checkIfMetaMaskInstalled();

    // Verificar si ya hay una conexión activa
    if (window.ethereum && window.ethereum.selectedAddress) {
        connectWallet();
    }
});

// Referencias a elementos DOM frecuentes
const connectButton = document.getElementById('connectButton');
const accountDisplay = document.getElementById('account');
const balanceDisplay = document.getElementById('balance');
const balanceUSD = document.getElementById('balanceUSD');
const accountInfo = document.getElementById('accountInfo');
const connectSection = document.getElementById('connectSection');
const sendButton = document.getElementById('sendButton');
const transactionStatus = document.getElementById('transactionStatus');
const ethBalanceDisplay = document.getElementById('ethBalance');
const ethValueDisplay = document.getElementById('ethValue');
const networkStatus = document.getElementById('networkStatus');
const currentNetworkDisplay = document.getElementById('currentNetwork');
const transactionsList = document.getElementById('transactionsList');
const maxBalanceDisplay = document.getElementById('maxBalance');

// Mapping de ID de red a nombres
const networkNames = {
    1: 'Ethereum Mainnet',
    11155111: 'Sepolia Testnet',
    42161: 'Arbitrum One',
    137: 'Polygon',
    56: 'BNB Smart Chain',
    10: 'Optimism',
    17000: 'Ethereum Holesky' // Añadido Holesky con su chainId correcto
};

// Agregar event listeners
connectButton.addEventListener('click', connectWallet);
document.getElementById('sendForm').addEventListener('submit', sendTransaction);
document.getElementById('copyAddress').addEventListener('click', copyAddressToClipboard);
document.getElementById('refreshBalance').addEventListener('click', updateWalletInfo);
document.getElementById('refreshHistory').addEventListener('click', loadTransactionHistory);
document.getElementById('disconnectButton').addEventListener('click', disconnectWallet);
document.getElementById('switchNetworkButton').addEventListener('click', openNetworkModal);
document.getElementById('amount').addEventListener('input', updateMaxAmountInfo);

// Delegación de eventos para los elementos de la lista de redes
document.querySelector('#networkModal .list-group').addEventListener('click', function (e) {
    if (e.target.classList.contains('list-group-item-action')) {
        const chainId = e.target.getAttribute('data-chainid');
        switchNetwork(chainId);
        const networkModal = bootstrap.Modal.getInstance(document.getElementById('networkModal'));
        networkModal.hide();
    }
});

// Función para verificar si MetaMask está instalado
function checkIfMetaMaskInstalled() {
    if (!window.ethereum) {
        connectButton.textContent = 'Instalar MetaMask';
        connectButton.addEventListener('click', () => {
            window.open('https://metamask.io/download.html', '_blank');
        });
        return false;
    }
    return true;
}

// Conexión a MetaMask
async function connectWallet() {
    if (!checkIfMetaMaskInstalled()) return;

    try {
        // Solicitar cuentas
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        currentAccount = accounts[0];

        // Configurar provider y signer
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();

        // Actualizar la interfaz de usuario
        connectSection.classList.add('hidden');
        accountInfo.classList.remove('hidden');

        // Cargar información de la wallet
        updateWalletInfo();
        updateNetworkInfo();
        loadTransactionHistory();

        // Registrar event listeners para cambios en MetaMask
        window.ethereum.on('accountsChanged', handleAccountsChanged);
        window.ethereum.on('chainChanged', handleChainChanged);

    } catch (error) {
        console.error('Error al conectar con MetaMask:', error);
        showAlert('Error al conectar a MetaMask: ' + error.message, 'danger');
    }
}

// Actualizar información de la wallet
async function updateWalletInfo() {
    try {
        // Obtener balance
        const balance = await provider.getBalance(currentAccount);
        const balanceInEth = ethers.utils.formatEther(balance);
        const balanceFormatted = parseFloat(balanceInEth).toFixed(4);
        const usdValue = (parseFloat(balanceInEth) * ethPrice).toFixed(2);

        // Actualizar interfaz
        accountDisplay.textContent = formatAddress(currentAccount);
        balanceDisplay.textContent = `${balanceFormatted} ETH`;
        balanceUSD.textContent = `≈ $${usdValue} USD`;

        // Actualizar en la sección de tokens
        ethBalanceDisplay.textContent = `${balanceFormatted} ETH`;
        ethValueDisplay.textContent = `$${usdValue} USD`;
        maxBalanceDisplay.textContent = `Balance disponible: ${balanceFormatted} ETH`;

    } catch (error) {
        console.error('Error al actualizar información de la wallet:', error);
    }
}

// Actualizar información de la red
async function updateNetworkInfo() {
    try {
        const network = await provider.getNetwork();
        currentChainId = network.chainId;
        const networkName = networkNames[currentChainId] || `Red #${currentChainId}`;

        // Definir colores y clases según la red
        let badgeClass = 'bg-secondary';
        if (currentChainId === 1) badgeClass = 'bg-success';
        else if ([11155111, 42161, 137, 56, 10].includes(currentChainId)) badgeClass = 'bg-info';

        networkStatus.innerHTML = `<span class="badge ${badgeClass} network-badge">
                                  <i class="fas fa-globe me-1"></i>${networkName}</span>`;
        currentNetworkDisplay.textContent = networkName;

    } catch (error) {
        console.error('Error al obtener información de la red:', error);
    }
}

// Modificar la función sendTransaction para guardar las transacciones exitosas
async function sendTransaction(e) {
    e.preventDefault();

    const recipient = document.getElementById('recipient').value;
    const amount = document.getElementById('amount').value;
    const gasPrice = document.getElementById('gasPrice').value;

    // Validar dirección
    if (!ethers.utils.isAddress(recipient)) {
        document.getElementById('recipient').classList.add('is-invalid');
        return;
    } else {
        document.getElementById('recipient').classList.remove('is-invalid');
    }

    // Mostrar estado pendiente
    transactionStatus.textContent = 'Preparando transacción...';
    transactionStatus.className = 'alert alert-info';
    transactionStatus.classList.remove('hidden');

    try {
        // Preparar transacción
        const tx = {
            to: recipient,
            value: ethers.utils.parseEther(amount)
        };

        // Añadir precio de gas personalizado si se especificó
        if (gasPrice) {
            tx.gasPrice = ethers.utils.parseUnits(gasPrice, 'gwei');
        }

        // Enviar transacción
        transactionStatus.textContent = 'Esperando confirmación en MetaMask...';
        const transactionResponse = await signer.sendTransaction(tx);

        transactionStatus.innerHTML = `
            <div class="d-flex align-items-center">
                <div class="spinner-border spinner-border-sm me-2" role="status"></div>
                <div>Transacción enviada! Esperando confirmación...</div>
            </div>
            <div class="mt-2">
                <small>Hash de la transacción:</small><br>
                <a href="${getEtherscanUrl(currentChainId)}/tx/${transactionResponse.hash}" target="_blank" class="text-break">
                    ${transactionResponse.hash}
                </a>
            </div>
        `;

        // Esperar por la confirmación
        const receipt = await transactionResponse.wait();

        // Transacción confirmada
        transactionStatus.className = 'alert alert-success';
        transactionStatus.innerHTML = `
            <div>
                <i class="fas fa-check-circle me-2"></i>
                <strong>Transacción confirmada!</strong>
            </div>
            <div class="mt-2">
                <small>Hash de la transacción:</small><br>
                <a href="${getEtherscanUrl(currentChainId)}/tx/${receipt.transactionHash}" target="_blank" class="text-break">
                    ${receipt.transactionHash}
                </a>
            </div>
        `;

        // Guardar la transacción en el historial de sesión
        const txInfo = {
            hash: receipt.transactionHash,
            from: currentAccount,
            to: recipient,
            value: ethers.utils.parseEther(amount),
            timestamp: Math.floor(Date.now() / 1000),
            confirmed: true
        };
        
        sessionTransactions.unshift(txInfo); // Añadir al principio del array
        
        // Limpiar el formulario
        document.getElementById('recipient').value = '';
        document.getElementById('amount').value = '';
        document.getElementById('gasPrice').value = '';

        // Actualizar balance
        updateWalletInfo();

        // Actualizar historial de transacciones
        loadTransactionHistory();

    } catch (error) {
        console.error('Error al enviar la transacción:', error);
        transactionStatus.className = 'alert alert-danger';
        transactionStatus.innerHTML = `
            <i class="fas fa-exclamation-circle me-2"></i>
            <strong>Error al enviar la transacción:</strong><br>
            ${error.message}
        `;
    }
}

// Función mejorada para cargar el historial de transacciones
async function loadTransactionHistory() {
    const loadingTransactions = document.getElementById('loadingTransactions');
    const noTransactions = document.getElementById('noTransactions');

    loadingTransactions.classList.remove('hidden');
    transactionsList.innerHTML = '';
    noTransactions.classList.add('hidden');

    try {
        // Crear un mensaje informativo para el usuario
        const infoElement = document.createElement('div');
        infoElement.className = 'alert alert-info mb-4';
        infoElement.innerHTML = `
            <i class="fas fa-info-circle me-2"></i>
            <strong>Información:</strong> Para ver tu historial completo de transacciones, 
            puedes visitar el explorador de bloques de la red actual.
        `;
        transactionsList.appendChild(infoElement);

        // Añadir un enlace al explorador de bloques
        const explorerLink = document.createElement('div');
        explorerLink.className = 'text-center mb-4';
        explorerLink.innerHTML = `
            <a href="${getEtherscanUrl(currentChainId)}/address/${currentAccount}" 
               target="_blank" class="btn btn-primary">
                <i class="fas fa-external-link-alt me-2"></i>
                Ver historial completo en el explorador
            </a>
        `;
        transactionsList.appendChild(explorerLink);
        
        // Mostrar las transacciones de la sesión actual primero
        if (sessionTransactions.length > 0) {
            const sessionTitle = document.createElement('h5');
            sessionTitle.className = 'mt-4 mb-3';
            sessionTitle.innerHTML = '<i class="fas fa-clock me-2"></i>Transacciones de esta sesión';
            transactionsList.appendChild(sessionTitle);
            
            sessionTransactions.forEach(tx => {
                renderTransaction(tx, true);
            });
        }
        
        // Intentar obtener transacciones adicionales de la blockchain
        let blockchainTxs = [];
        
        try {
            // Intentar obtener transacciones recientes
            const network = await provider.getNetwork();
            
            // Intentar usar la API de Etherscan para Holesky si estamos en esa red
            if (network.chainId === 17000) {
                // Para Holesky, podemos intentar usar su API si está disponible
                try {
                    const holeskyApiUrl = `https://api-holesky.etherscan.io/api?module=account&action=txlist&address=${currentAccount}&startblock=0&endblock=99999999&sort=desc`;
                    const response = await fetch(holeskyApiUrl);
                    const data = await response.json();
                    
                    if (data.status === '1' && data.result.length > 0) {
                        blockchainTxs = data.result.slice(0, 5); // Limitar a 5 transacciones
                    }
                } catch (e) {
                    console.log("Error al obtener transacciones de Holesky API:", e);
                }
            } else {
                // Para otras redes, intentar obtener transacciones del proveedor
                try {
                    blockchainTxs = await provider.getHistory(currentAccount);
                    blockchainTxs = blockchainTxs.slice(0, 5); // Limitar a 5 transacciones
                } catch (e) {
                    console.log("Error al obtener historial del proveedor:", e);
                }
            }
            
            // Si tenemos transacciones de la blockchain, mostrarlas
            if (blockchainTxs.length > 0) {
                const blockchainTitle = document.createElement('h5');
                blockchainTitle.className = 'mt-4 mb-3';
                blockchainTitle.innerHTML = '<i class="fas fa-history me-2"></i>Transacciones de la blockchain';
                transactionsList.appendChild(blockchainTitle);
                
                // Filtrar para no mostrar transacciones que ya están en la sesión
                const sessionTxHashes = sessionTransactions.map(tx => tx.hash.toLowerCase());
                
                blockchainTxs.forEach(tx => {
                    // Solo mostrar si no está ya en las transacciones de sesión
                    if (!tx.hash || !sessionTxHashes.includes(tx.hash.toLowerCase())) {
                        renderTransaction(tx, false);
                    }
                });
            }
        } catch (e) {
            console.error("Error al obtener transacciones de la blockchain:", e);
        }
        
        // Si no hay transacciones para mostrar
        if (sessionTransactions.length === 0 && blockchainTxs.length === 0) {
            const noTxMsg = document.createElement('div');
            noTxMsg.className = 'alert alert-light text-center my-4';
            noTxMsg.innerHTML = `
                <i class="fas fa-search me-2"></i>
                No se encontraron transacciones recientes en esta red.
            `;
            transactionsList.appendChild(noTxMsg);
        }

        loadingTransactions.classList.add('hidden');
    } catch (error) {
        console.error('Error al cargar el historial de transacciones:', error);
        loadingTransactions.classList.add('hidden');
        
        // Mostrar mensaje de error más descriptivo
        const errorElement = document.createElement('div');
        errorElement.className = 'alert alert-warning';
        errorElement.innerHTML = `
            <i class="fas fa-exclamation-triangle me-2"></i>
            No se pudo cargar el historial completo. Visita el explorador de bloques para ver tus transacciones.
            <div class="mt-3">
                <a href="${getEtherscanUrl(currentChainId)}/address/${currentAccount}" 
                   target="_blank" class="btn btn-sm btn-outline-primary">
                    Abrir en explorador
                </a>
            </div>
        `;
        transactionsList.appendChild(errorElement);
    }
}

// Función mejorada para renderizar una transacción
function renderTransaction(tx, isSessionTx) {
    const txElement = document.createElement('div');
    txElement.className = 'transaction-item p-3 mb-3 border rounded';
    
    if (isSessionTx) {
        txElement.classList.add('border-primary', 'bg-light');
    }

    // Determinar si es una transacción recibida o enviada
    const isReceived = tx.to && tx.to.toLowerCase() === currentAccount.toLowerCase();
    const icon = isReceived ? 'fa-arrow-down' : 'fa-arrow-up';
    const txType = isReceived ? 'Recibido' : 'Enviado';
    
    // Formatear el valor en ETH
    let value = '0';
    if (tx.value) {
        value = ethers.utils.formatEther(tx.value);
    }
    
    // Formatear la fecha
    let dateText = 'Reciente';
    if (tx.timestamp) {
        dateText = formatDate(new Date(tx.timestamp * 1000));
    }

    txElement.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-2">
            <div>
                <span class="badge ${isReceived ? 'bg-success' : 'bg-primary'} me-2">
                    <i class="fas ${icon}"></i> ${txType}
                </span>
                <span class="text-muted small">${dateText}</span>
                ${isSessionTx ? '<span class="badge bg-info ms-2">Esta sesión</span>' : ''}
            </div>
            <div class="${isReceived ? 'text-success' : ''}">
                <strong>${isReceived ? '+' : '-'}${parseFloat(value).toFixed(4)} ETH</strong>
            </div>
        </div>
        <div class="d-flex justify-content-between align-items-center">
            <div class="small text-muted">
                ${isReceived ? 'De' : 'Para'}: ${formatAddress(isReceived ? tx.from : tx.to)}
            </div>
            <a href="${getEtherscanUrl(currentChainId)}/tx/${tx.hash}" target="_blank" class="btn btn-sm btn-outline-secondary">
                <i class="fas fa-external-link-alt me-1"></i>Ver
            </a>
        </div>
    `;

    transactionsList.appendChild(txElement);
}

// Actualizar la función getEtherscanUrl para incluir Holesky
function getEtherscanUrl(chainId) {
    switch (chainId) {
        case 1: return 'https://etherscan.io';
        case 11155111: return 'https://sepolia.etherscan.io';
        case 137: return 'https://polygonscan.com';
        case 56: return 'https://bscscan.com';
        case 42161: return 'https://arbiscan.io';
        case 10: return 'https://optimistic.etherscan.io';
        case 17000: return 'https://holesky.etherscan.io'; // Añadido Holesky
        default: return 'https://etherscan.io';
    }
}
// Manejo de cambio de cuenta en MetaMask
function handleAccountsChanged(accounts) {
    if (accounts.length === 0) {
        // MetaMask está bloqueado o el usuario se ha desconectado
        disconnectWallet();
    } else if (accounts[0] !== currentAccount) {
        // Cambio de cuenta
        currentAccount = accounts[0];
        updateWalletInfo();
        accountDisplay.textContent = formatAddress(currentAccount);
        loadTransactionHistory();
    }
}

// Manejo de cambio de red en MetaMask
function handleChainChanged(chainId) {
    // Recargar la página para actualizar todo el estado
    window.location.reload();
}

// Abrir modal para cambiar de red
function openNetworkModal() {
    const networkModal = new bootstrap.Modal(document.getElementById('networkModal'));
    networkModal.show();
}

// Intentar cambiar de red
async function switchNetwork(chainId) {
    try {
        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x' + parseInt(chainId).toString(16) }],
        });
    } catch (error) {
        console.error('Error al cambiar de red:', error);
        showAlert('No se pudo cambiar de red: ' + error.message, 'danger');
    }
}

// Desconectar wallet
function disconnectWallet() {
    accountInfo.classList.add('hidden');
    connectSection.classList.remove('hidden');
    currentAccount = null;

    // Limpiar event listeners de MetaMask
    if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
    }

    // Reiniciar interfaz
    transactionsList.innerHTML = '';
    document.getElementById('otherTokens').innerHTML = '';
    document.getElementById('transactionStatus').className = 'alert hidden';
}

// Copiar dirección al portapapeles
function copyAddressToClipboard() {
    navigator.clipboard.writeText(currentAccount)
        .then(() => {
            const tooltip = bootstrap.Tooltip.getInstance(document.getElementById('copyAddress'));
            document.getElementById('copyAddress').setAttribute('data-bs-original-title', '¡Copiado!');
            tooltip.show();

            setTimeout(() => {
                document.getElementById('copyAddress').setAttribute('data-bs-original-title', 'Copiar dirección');
            }, 2000);
        });
}

// Actualizar información de cantidad máxima
function updateMaxAmountInfo() {
    const amountInput = document.getElementById('amount');
    const tokenSelect = document.getElementById('tokenSelect');

    // Solo para ETH por ahora
    if (tokenSelect.value === 'eth') {
        const balance = balanceDisplay.textContent.split(' ')[0];
        maxBalanceDisplay.textContent = `Balance disponible: ${balance} ETH`;
    }
}

// Funciones de utilidad

// Formatear dirección (acortar para mostrar)
function formatAddress(address) {
    return address ? address.substring(0, 6) + '...' + address.substring(address.length - 4) : '';
}

// Formatear fecha
function formatDate(date) {
    if (!date) return 'Fecha desconocida';
    
    const now = new Date();
    const diffMinutes = Math.floor((now - date) / (1000 * 60));

    if (diffMinutes < 1) return 'Hace unos segundos';
    if (diffMinutes < 60) return `Hace ${diffMinutes} minutos`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `Hace ${diffHours} horas`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return `Hace ${diffDays} días`;

    // Si es más antiguo, mostrar la fecha
    return date.toLocaleDateString();
}

// Mostrar alerta
function showAlert(message, type) {
    const alertElement = document.createElement('div');
    alertElement.className = `alert alert-${type} alert-dismissible fade show`;
    alertElement.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;

    document.querySelector('.container').prepend(alertElement);

    // Auto-eliminar después de 5 segundos
    setTimeout(() => {
        if (alertElement.parentNode) {
            alertElement.parentNode.removeChild(alertElement);
        }
    }, 5000);
}