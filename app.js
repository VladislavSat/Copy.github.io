// Основная логика приложения для учета копирайтинга
// Владислав, 2026

// Получаем элементы DOM
const form = document.getElementById('orderForm');
const clientsForm = document.getElementById('clientsForm');
const ordersList = document.getElementById('ordersList');
const totalIncomeEl = document.getElementById('totalIncome');
const totalDebtEl = document.getElementById('totalDebt');
const totalTaxEl = document.getElementById('totalTax');
const clientSelect = document.getElementById('clientSelect');
const dateFilter = document.getElementById('dateFilter');
const clientFilter = document.getElementById('clientFilter');
const createBackupBtn = document.getElementById('createBackup');
const importDataBtn = document.getElementById('importData');
const restoreBackupBtn = document.getElementById('restoreBackup');
const clearDataBtn = document.getElementById('clearData');
const importFileInput = document.getElementById('importFileInput');
const costCalculator = document.getElementById('costCalculator');
const baseCostEl = document.getElementById('baseCost');
const taxAmountEl = document.getElementById('taxAmount');
const finalCostEl = document.getElementById('finalCost');
const taxLine = document.getElementById('taxLine');
const addOrderBtn = document.getElementById('addOrderBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const saveIndicator = document.getElementById('saveIndicator');
const saveStatus = document.getElementById('saveStatus');

// Модальные окна
const deleteModal = document.getElementById('deleteModal');
const importModal = document.getElementById('importModal');
const restoreModal = document.getElementById('restoreModal');
const clearModal = document.getElementById('clearModal');

// Глобальные переменные
let orders = [];
let clients = [];
let currentPeriodFilter = 'all';
let currentClientFilter = 'all';
let editingOrderId = null;
let isEditing = false;
let orderToDelete = null;
let importData = null;

// Инициализация приложения
function initApp() {
  loadData();
  renderClients();
  renderPeriodFilter();
  renderClientFilter();
  renderOrders();
  updateStats();
  setupEventListeners();
  updateCostCalculator();
}

// Загрузка данных из localStorage
function loadData() {
  try {
    // Загружаем заказы
    const storedOrders = localStorage.getItem('copywriting_orders');
    if (storedOrders) {
      orders = JSON.parse(storedOrders).map(order => ({
        id: order.id || generateId(),
        title: order.title,
        symbols: order.symbols,
        price: order.price,
        clientId: order.clientId,
        paid: order.paid || false,
        createdAt: order.createdAt || new Date().toISOString(),
        updatedAt: order.updatedAt || new Date().toISOString()
      }));
      
      // Сортируем по дате создания (новые сверху)
      orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    
    // Загружаем клиентов
    const storedClients = localStorage.getItem('copywriting_clients');
    if (storedClients) {
      clients = JSON.parse(storedClients);
    }
    
    // Загружаем бэкап если нет основных данных
    const backupOrders = localStorage.getItem('copywriting_orders_backup');
    if (backupOrders && orders.length === 0) {
      orders = JSON.parse(backupOrders);
      // Сортируем бэкап тоже
      orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      saveData();
    }
    
    // Инициализируем пустые массивы если нет данных
    if (!orders) orders = [];
    if (!clients) clients = [];
    
  } catch (e) {
    console.error('Ошибка загрузки данных:', e);
    orders = [];
    clients = [];
  }
}

// Генерация уникального ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Сохранение данных
function saveData() {
  try {
    // Перед сохранением сортируем заказы (новые сверху)
    orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    localStorage.setItem('copywriting_orders', JSON.stringify(orders));
    localStorage.setItem('copywriting_orders_backup', JSON.stringify(orders));
    localStorage.setItem('copywriting_clients', JSON.stringify(clients));
    showSaveStatus('✓ Данные сохранены', 'success');
  } catch (e) {
    console.error('Ошибка сохранения:', e);
    showSaveStatus('✗ Ошибка сохранения', 'error');
  }
}

// Показ статуса сохранения
function showSaveStatus(message, type = 'success') {
  saveStatus.textContent = message;
  saveIndicator.className = 'save-indicator';
  saveIndicator.classList.add(`save-indicator--${type}`);
  saveIndicator.style.display = 'block';
  
  setTimeout(() => {
    saveIndicator.style.display = 'none';
  }, 3000);
}

// Показать toast уведомление
function showToast(message, type = 'info') {
  const toastContainer = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.innerHTML = `
    <div class="toast__header">
      <div class="toast__title">${type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ️'} Уведомление</div>
      <button class="toast__close" onclick="this.parentElement.parentElement.remove()">×</button>
    </div>
    <p class="toast__message">${message}</p>
  `;
  
  toastContainer.appendChild(toast);
  
  // Показать с анимацией
  setTimeout(() => toast.classList.add('show'), 10);
  
  // Автоматическое удаление
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 5000);
}

// Расчет базовой стоимости (без налога)
function calculateBaseTotal(symbols, price) {
  return (symbols * price) / 1000;
}

// Расчет налога 6%
function calculateTax(baseTotal) {
  return baseTotal * 0.06;
}

// Расчет итоговой стоимости с учетом налога
function calculateTotal(symbols, price, isLegalEntity = false) {
  const baseTotal = calculateBaseTotal(symbols, price);
  if (isLegalEntity) {
    // Для юрлица: базовая стоимость + 6% налог
    return baseTotal + calculateTax(baseTotal);
  }
  return baseTotal; // Для физлица без налога
}

// Обновление статистики
function updateStats(filteredOrders = orders) {
  const paidOrders = filteredOrders.filter(o => o.paid);
  const unpaidOrders = filteredOrders.filter(o => !o.paid);
  
  const totalIncome = paidOrders.reduce((sum, o) => {
    const client = clients.find(c => c.id === o.clientId);
    const isLegal = client ? client.isLegalEntity : false;
    return sum + calculateTotal(o.symbols, o.price, isLegal);
  }, 0);
  
  const clientDebt = unpaidOrders.reduce((sum, o) => {
    const client = clients.find(c => c.id === o.clientId);
    const isLegal = client ? client.isLegalEntity : false;
    return sum + calculateTotal(o.symbols, o.price, isLegal);
  }, 0);
  
  const taxToPay = paidOrders.reduce((sum, o) => {
    const client = clients.find(c => c.id === o.clientId);
    if (client && client.isLegalEntity) {
      const baseTotal = calculateBaseTotal(o.symbols, o.price);
      return sum + calculateTax(baseTotal);
    }
    return sum;
  }, 0);
  
  totalIncomeEl.textContent = totalIncome.toFixed(2) + ' ₽';
  totalDebtEl.textContent = clientDebt.toFixed(2) + ' ₽';
  totalTaxEl.textContent = taxToPay.toFixed(2) + ' ₽';
}

// Отрисовка списка клиентов
function renderClients() {
  clientSelect.innerHTML = '<option value="">Выберите клиента</option>';
  const clientsList = document.getElementById('clientsList');
  
  if (clients.length === 0) {
    clientsList.innerHTML = '<div class="empty-state"><p>Нет клиентов. Добавьте первого!</p></div>';
    return;
  }
  
  // Очищаем список клиентов
  clientsList.innerHTML = '';
  
  clients.forEach(client => {
    // Добавляем в select формы
    const option = document.createElement('option');
    option.value = client.id;
    option.textContent = `${client.isLegalEntity ? '🏢 Юр. лицо' : '👤 Физ. лицо'} ${client.name}`;
    clientSelect.appendChild(option);
    
    // Добавляем карточку клиента
    const clientCard = document.createElement('div');
    clientCard.className = 'client-card';
    clientCard.innerHTML = `
      <div class="client-info">
        <div class="client-icon">${client.isLegalEntity ? '🏢' : '👤'}</div>
        <div>
          <div class="client-name">${client.name}</div>
          <div style="font-size: 12px; color: ${client.isLegalEntity ? 'var(--color-warning)' : 'var(--color-text-secondary)'};">
            ${client.isLegalEntity ? 'Юридическое лицо (+6% налог)' : 'Физическое лицо (без налога)'}
          </div>
          <div style="font-size: 11px; color: var(--color-text-secondary); margin-top: 4px;">
            Создан: ${new Date(client.createdAt).toLocaleDateString('ru-RU')}
            ${client.updatedAt ? `<br>Обновлен: ${new Date(client.updatedAt).toLocaleDateString('ru-RU')}` : ''}
          </div>
        </div>
      </div>
      <div style="display: flex; gap: 8px;">
        <button onclick="editClientHandler('${client.id}')" class="btn btn--sm btn--edit">✏️</button>
        <button onclick="deleteClientHandler('${client.id}')" class="btn btn--sm btn--error">🗑️</button>
      </div>
    `;
    
    clientsList.appendChild(clientCard);
  });
  
  // Обновляем калькулятор, если выбран клиент
  updateCostCalculator();
}

// Редактирование клиента - ГЛОБАЛЬНАЯ ФУНКЦИЯ
function editClientHandler(clientId) {
  const client = clients.find(c => c.id === clientId);
  if (!client) {
    showToast('Клиент не найден', 'error');
    return;
  }
  
  // Создаем диалоговое окно для редактирования
  const newName = prompt('Введите новое имя клиента:', client.name);
  if (!newName || newName.trim() === '') {
    showToast('Имя клиента не может быть пустым', 'error');
    return;
  }
  
  // Спрашиваем тип клиента
  const isLegalEntity = confirm(`Клиент "${newName.trim()}" является юридическим лицом?\n\nНажмите:\n• "OK" - Юридическое лицо (+6% налог)\n• "Отмена" - Физическое лицо (без налога)`);
  
  // Обновляем данные клиента
  client.name = newName.trim();
  client.isLegalEntity = isLegalEntity;
  client.updatedAt = new Date().toISOString();
  
  saveData();
  renderClients();
  renderClientFilter();
  renderOrders();
  
  showToast(`Клиент "${client.name}" обновлен (${isLegalEntity ? 'Юридическое лицо' : 'Физическое лицо'})`, 'success');
}

// Удаление клиента - ГЛОБАЛЬНАЯ ФУНКЦИЯ
function deleteClientHandler(clientId) {
  const client = clients.find(c => c.id === clientId);
  if (!client) return;
  
  // Проверяем, есть ли у клиента заказы
  const clientOrders = orders.filter(o => o.clientId === clientId);
  
  if (clientOrders.length > 0) {
    if (!confirm(`Клиент "${client.name}" имеет ${clientOrders.length} заказ(ов).\n\nУдалить клиента и все его заказы?`)) {
      return;
    }
    // Удаляем заказы клиента
    orders = orders.filter(o => o.clientId !== clientId);
  } else {
    if (!confirm(`Удалить клиента "${client.name}"?`)) {
      return;
    }
  }
  
  // Удаляем клиента
  clients = clients.filter(c => c.id !== clientId);
  saveData();
  renderClients();
  renderClientFilter();
  renderOrders();
  showToast('Клиент удален', 'success');
}

// Отрисовка фильтра по периодам
function renderPeriodFilter() {
  const periods = getAvailablePeriods();
  dateFilter.innerHTML = '<option value="all">Все периоды</option>';
  periods.forEach(period => {
    const option = document.createElement('option');
    option.value = period;
    option.textContent = formatPeriod(period);
    dateFilter.appendChild(option);
  });
}

// Отрисовка фильтра по клиентам
function renderClientFilter() {
  const availableClients = getClientsWithOrders();
  clientFilter.innerHTML = '<option value="all">Все клиенты</option>';
  availableClients.forEach(clientId => {
    const client = clients.find(c => c.id === clientId);
    if (client) {
      const option = document.createElement('option');
      option.value = client.id;
      option.textContent = `${client.isLegalEntity ? '🏢 Юр. лицо' : '👤 Физ. лицо'} ${client.name}`;
      clientFilter.appendChild(option);
    }
  });
}

// Форматирование периода (YYYY-MM → Месяц Год)
function formatPeriod(period) {
  const [year, month] = period.split('-');
  const monthNames = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ];
  return `${monthNames[parseInt(month) - 1]} ${year}`;
}

// Получение доступных периодов
function getAvailablePeriods() {
  const periods = orders.map(o => new Date(o.createdAt).toISOString().slice(0, 7));
  return [...new Set(periods)].sort().reverse();
}

// Получение клиентов с заказами
function getClientsWithOrders() {
  return [...new Set(orders.map(o => o.clientId))];
}

// Фильтрация заказов
function getFilteredOrders() {
  const filtered = orders.filter(order => {
    const periodMatch = currentPeriodFilter === 'all' || 
      new Date(order.createdAt).toISOString().slice(0, 7) === currentPeriodFilter;
    
    const clientMatch = currentClientFilter === 'all' || order.clientId === currentClientFilter;
    
    return periodMatch && clientMatch;
  });
  
  // Сортируем от новых к старым
  return filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

// Отрисовка заказов
function renderOrders() {
  const filteredOrders = getFilteredOrders();
  ordersList.innerHTML = '';
  
  if (filteredOrders.length === 0) {
    ordersList.innerHTML = `
      <div class="empty-state" id="emptyState">
        <div class="empty-state__icon">📝</div>
        <h3>Нет заказов</h3>
        <p>${currentPeriodFilter !== 'all' || currentClientFilter !== 'all' ? 
          'Попробуйте изменить фильтры' : 
          'Добавьте первый заказ!'}</p>
      </div>
    `;
    updateStats(filteredOrders);
    return;
  }
  
  filteredOrders.forEach(order => {
    const client = clients.find(c => c.id === order.clientId);
    const isLegal = client ? client.isLegalEntity : false;
    const baseTotal = calculateBaseTotal(order.symbols, order.price);
    const tax = isLegal ? calculateTax(baseTotal) : 0;
    const total = calculateTotal(order.symbols, order.price, isLegal);
    
    const orderCard = document.createElement('div');
    orderCard.className = `order-card ${order.paid ? 'order-card--paid' : ''} ${order.id === editingOrderId ? 'order-card--editing' : ''}`;
    orderCard.innerHTML = `
      <div class="order-card__header">
        <div>
          <div class="order-card__title">${order.title}</div>
          <div class="order-card__date">
            ${new Date(order.createdAt).toLocaleDateString('ru-RU')}
            ${client ? ` • ${client.isLegalEntity ? '🏢 Юр. лицо' : '👤 Физ. лицо'} ${client.name}` : ' • ❓ Неизвестный клиент'}
          </div>
        </div>
        <div class="status-indicator status-indicator--${order.paid ? 'paid' : 'unpaid'}">
          ${order.paid ? 'Оплачено' : 'Не оплачено'}
        </div>
      </div>
      
      <div class="order-card__info">
        <div class="order-card__info-item">
          Количество символов
          <span class="order-card__info-value">${order.symbols.toLocaleString('ru-RU')}</span>
        </div>
        <div class="order-card__info-item">
          Цена за 1000 символов
          <span class="order-card__info-value">${order.price.toFixed(2)} ₽</span>
        </div>
        <div class="order-card__info-item">
          Базовая стоимость
          <span class="order-card__info-value">${baseTotal.toFixed(2)} ₽</span>
        </div>
        ${isLegal ? `
          <div class="order-card__info-item" style="color: var(--color-warning);">
            Налог 6%
            <span class="order-card__info-value">+${tax.toFixed(2)} ₽</span>
          </div>
        ` : ''}
      </div>
      
      <div class="order-card__total" style="font-size: 1.5rem; color: var(--color-primary);">
        ИТОГО: ${total.toFixed(2)} ₽
        ${isLegal ? '<div style="font-size: 0.9rem; color: var(--color-text-secondary);">(включая 6% налог)</div>' : ''}
      </div>
      
      <div class="order-card__actions">
        <button onclick="togglePaidHandler('${order.id}')" class="btn ${order.paid ? 'btn--warning' : 'btn--success'}">
          ${order.paid ? '❌ Отметить как неоплаченное' : '✓ Отметить как оплаченное'}
        </button>
        <button onclick="editOrderHandler('${order.id}')" class="btn btn--edit">✏️ Редактировать</button>
        <button onclick="showDeleteModalHandler('${order.id}', '${order.title.replace(/'/g, "\\'")}')" class="btn btn--error">🗑️ Удалить</button>
      </div>
    `;
    
    ordersList.appendChild(orderCard);
  });
  
  updateStats(filteredOrders);
}

// Переключение статуса оплаты - ГЛОБАЛЬНАЯ ФУНКЦИЯ
function togglePaidHandler(id) {
  const order = orders.find(o => o.id === id);
  if (order) {
    order.paid = !order.paid;
    order.updatedAt = new Date().toISOString();
    saveData();
    renderOrders();
    showToast(`Заказ "${order.title}" отмечен как ${order.paid ? 'оплаченный' : 'неоплаченный'}`, 'success');
  }
}

// Редактирование заказа - ГЛОБАЛЬНАЯ ФУНКЦИЯ
function editOrderHandler(id) {
  const order = orders.find(o => o.id === id);
  if (order) {
    editingOrderId = id;
    isEditing = true;
    
    // Заполняем форму
    document.getElementById('title').value = order.title;
    document.getElementById('symbols').value = order.symbols;
    document.getElementById('price').value = order.price;
    clientSelect.value = order.clientId;
    
    // Обновляем UI
    document.querySelector('.form-section').classList.add('form-section--editing');
    cancelEditBtn.style.display = 'inline-flex';
    addOrderBtn.textContent = '💾 Сохранить изменения';
    addOrderBtn.classList.add('btn--save-changes');
    
    // Обновляем калькулятор
    updateCostCalculator();
    
    // Прокручиваем к форме
    document.querySelector('.form-section').scrollIntoView({ behavior: 'smooth' });
    document.getElementById('title').focus();
    
    showToast('Режим редактирования заказа', 'info');
  }
}

// Показать модальное окно удаления - ГЛОБАЛЬНАЯ ФУНКЦИЯ
function showDeleteModalHandler(orderId, orderTitle) {
  orderToDelete = orderId;
  document.getElementById('deleteOrderTitle').textContent = orderTitle;
  showModal(deleteModal);
}

// Отмена редактирования - ГЛОБАЛЬНАЯ ФУНКЦИЯ
function cancelEditHandler() {
  editingOrderId = null;
  isEditing = false;
  
  // Сбрасываем форму
  form.reset();
  
  // Обновляем UI
  document.querySelector('.form-section').classList.remove('form-section--editing');
  cancelEditBtn.style.display = 'none';
  addOrderBtn.textContent = 'Добавить заказ';
  addOrderBtn.classList.remove('btn--save-changes');
  
  // Обновляем калькулятор
  updateCostCalculator();
  
  showToast('Редактирование отменено', 'info');
}

// Обновление калькулятора стоимости
function updateCostCalculator() {
  const symbols = parseInt(document.getElementById('symbols').value) || 0;
  const price = parseFloat(document.getElementById('price').value) || 0;
  const clientId = clientSelect.value;
  const client = clients.find(c => c.id === clientId);
  const isLegal = client ? client.isLegalEntity : false;
  
  if (symbols > 0 && price > 0) {
    const baseTotal = calculateBaseTotal(symbols, price);
    const tax = isLegal ? calculateTax(baseTotal) : 0;
    const finalTotal = isLegal ? baseTotal + tax : baseTotal;
    
    baseCostEl.textContent = baseTotal.toFixed(2) + ' ₽';
    taxAmountEl.textContent = '+' + tax.toFixed(2) + ' ₽';
    finalCostEl.textContent = finalTotal.toFixed(2) + ' ₽';
    
    // Показать/скрыть строку с налогом
    taxLine.style.display = isLegal ? 'flex' : 'none';
    costCalculator.style.display = 'block';
  } else {
    costCalculator.style.display = 'none';
  }
  
  // Включить/выключить кнопку добавления
  const title = document.getElementById('title').value.trim();
  addOrderBtn.disabled = !(title && symbols > 0 && price > 0 && clientId);
}

// Установка обработчиков событий
function setupEventListeners() {
  // Форма добавления клиента
  clientsForm.addEventListener('submit', handleClientFormSubmit);
  
  // Форма заказа
  form.addEventListener('submit', handleOrderFormSubmit);
  cancelEditBtn.addEventListener('click', cancelEditHandler);
  
  // Поля для калькулятора
  document.getElementById('symbols').addEventListener('input', updateCostCalculator);
  document.getElementById('price').addEventListener('input', updateCostCalculator);
  clientSelect.addEventListener('change', updateCostCalculator);
  document.getElementById('title').addEventListener('input', updateCostCalculator);
  
  // Фильтры
  dateFilter.addEventListener('change', (e) => {
    currentPeriodFilter = e.target.value;
    renderOrders();
  });
  
  clientFilter.addEventListener('change', (e) => {
    currentClientFilter = e.target.value;
    renderOrders();
  });
  
  // Управление данными
  createBackupBtn.addEventListener('click', createBackup);
  importDataBtn.addEventListener('click', () => importFileInput.click());
  importFileInput.addEventListener('change', handleImportFile);
  restoreBackupBtn.addEventListener('click', () => showModal(restoreModal));
  clearDataBtn.addEventListener('click', () => showModal(clearModal));
  
  // Модальные окна
  setupModalListeners();
  
  // Сохранение при закрытии
  window.addEventListener('beforeunload', () => {
    saveData();
  });
}

// Настройка обработчиков модальных окон
function setupModalListeners() {
  // Модалка удаления
  document.getElementById('cancelDelete').addEventListener('click', () => hideModal(deleteModal));
  document.getElementById('confirmDelete').addEventListener('click', confirmDelete);
  
  // Модалка импорта
  document.getElementById('cancelImport').addEventListener('click', () => hideModal(importModal));
  document.getElementById('confirmImport').addEventListener('click', confirmImport);
  
  // Модалка восстановления
  document.getElementById('cancelRestore').addEventListener('click', () => hideModal(restoreModal));
  document.getElementById('confirmRestore').addEventListener('click', confirmRestore);
  
  // Модалка очистки
  document.getElementById('cancelClear').addEventListener('click', () => hideModal(clearModal));
  document.getElementById('confirmClear').addEventListener('click', confirmClear);
}

// Управление модальными окнами
function showModal(modal) {
  modal.style.display = 'flex';
  setTimeout(() => modal.classList.add('active'), 10);
}

function hideModal(modal) {
  modal.classList.remove('active');
  setTimeout(() => {
    modal.style.display = 'none';
  }, 300);
}

// Обработка формы клиента
function handleClientFormSubmit(e) {
  e.preventDefault();
  
  const clientName = document.getElementById('clientName').value.trim();
  const isCompany = document.getElementById('isCompany').checked;
  
  if (!clientName) {
    showToast('Введите имя клиента', 'error');
    return;
  }
  
  // Проверяем, есть ли уже клиент с таким именем
  if (clients.some(c => c.name.toLowerCase() === clientName.toLowerCase())) {
    showToast('Клиент с таким именем уже существует', 'error');
    return;
  }
  
  const newClient = {
    id: generateId(),
    name: clientName,
    isLegalEntity: isCompany,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  clients.push(newClient);
  saveData();
  renderClients();
  renderClientFilter();
  updateCostCalculator();
  
  // Очищаем форму
  clientsForm.reset();
  document.getElementById('clientName').focus();
  
  showToast(`Клиент "${clientName}" добавлен`, 'success');
}

// Обработка формы заказа
function handleOrderFormSubmit(e) {
  e.preventDefault();
  
  const title = document.getElementById('title').value.trim();
  const symbols = parseInt(document.getElementById('symbols').value);
  const price = parseFloat(document.getElementById('price').value);
  const clientId = clientSelect.value;
  const client = clients.find(c => c.id === clientId);
  
  if (!title || symbols <= 0 || price <= 0 || !clientId) {
    showToast('Заполните все поля корректно', 'error');
    return;
  }
  
  const now = new Date().toISOString();
  
  if (editingOrderId) {
    // Обновление заказа
    const orderIndex = orders.findIndex(o => o.id === editingOrderId);
    if (orderIndex !== -1) {
      orders[orderIndex] = {
        ...orders[orderIndex],
        title,
        symbols,
        price,
        clientId,
        updatedAt: now
      };
    }
    cancelEditHandler();
    showToast('Заказ обновлен', 'success');
  } else {
    // Новый заказ - добавляем В НАЧАЛО массива
    const newOrder = {
      id: generateId(),
      title,
      symbols,
      price,
      clientId,
      paid: false,
      createdAt: now,
      updatedAt: now
    };
    
    // Добавляем в начало массива (новые заказы будут сверху)
    orders.unshift(newOrder);
    showToast('Заказ добавлен', 'success');
  }
  
  saveData();
  form.reset();
  renderOrders();
  renderPeriodFilter();
  renderClientFilter();
  updateCostCalculator();
  document.getElementById('title').focus();
}

// Подтверждение удаления заказа
function confirmDelete() {
  if (orderToDelete) {
    const order = orders.find(o => o.id === orderToDelete);
    if (order) {
      orders = orders.filter(o => o.id !== orderToDelete);
      saveData();
      renderOrders();
      renderPeriodFilter();
      renderClientFilter();
      hideModal(deleteModal);
      showToast(`Заказ "${order.title}" удален`, 'success');
      orderToDelete = null;
    }
  }
}

// Создание бэкапа
function createBackup() {
  const data = {
    orders: orders,
    clients: clients,
    exportedAt: new Date().toISOString(),
    version: '1.0'
  };
  
  const dataStr = JSON.stringify(data, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `copywriting_backup_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  
  showToast('Резервная копия создана и скачана', 'success');
}

// Обработка импорта файла
function handleImportFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = function(event) {
    try {
      const data = JSON.parse(event.target.result);
      
      // Проверяем структуру файла
      if (!data.orders || !data.clients) {
        showToast('Неправильный формат файла', 'error');
        return;
      }
      
      importData = data;
      showModal(importModal);
    } catch (error) {
      showToast('Ошибка чтения файла', 'error');
    }
  };
  reader.readAsText(file);
  
  // Сбрасываем значение input
  e.target.value = '';
}

// Подтверждение импорта
function confirmImport() {
  if (importData) {
    orders = importData.orders.map(order => ({
      ...order,
      id: order.id || generateId(),
      createdAt: order.createdAt || new Date().toISOString(),
      updatedAt: order.updatedAt || new Date().toISOString()
    }));
    
    // Сортируем по дате (новые сверху)
    orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    clients = importData.clients.map(client => ({
      ...client,
      id: client.id || generateId(),
      createdAt: client.createdAt || new Date().toISOString(),
      updatedAt: client.updatedAt || new Date().toISOString()
    }));
    
    saveData();
    renderClients();
    renderPeriodFilter();
    renderClientFilter();
    renderOrders();
    hideModal(importModal);
    showToast('Данные успешно импортированы', 'success');
    importData = null;
  }
}

// Подтверждение восстановления
function confirmRestore() {
  const backupOrders = localStorage.getItem('copywriting_orders_backup');
  if (backupOrders) {
    orders = JSON.parse(backupOrders);
    // Сортируем по дате (новые сверху)
    orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    saveData();
    renderOrders();
    renderPeriodFilter();
    renderClientFilter();
    hideModal(restoreModal);
    showToast('Данные восстановлены из резервной копии', 'success');
  } else {
    showToast('Резервная копия не найдена', 'error');
    hideModal(restoreModal);
  }
}

// Подтверждение очистки
function confirmClear() {
  if (confirm('Вы уверены? Это действие нельзя отменить! Все данные будут удалены.')) {
    orders = [];
    clients = [];
    saveData();
    renderClients();
    renderOrders();
    renderPeriodFilter();
    renderClientFilter();
    hideModal(clearModal);
    showToast('Все данные очищены', 'warning');
  } else {
    hideModal(clearModal);
  }
}

// Делаем функции глобально доступными
window.editClientHandler = editClientHandler;
window.deleteClientHandler = deleteClientHandler;
window.togglePaidHandler = togglePaidHandler;
window.editOrderHandler = editOrderHandler;
window.showDeleteModalHandler = showDeleteModalHandler;
window.cancelEditHandler = cancelEditHandler;

// Инициализация при загрузке DOM
document.addEventListener('DOMContentLoaded', initApp);