// js/app.js - Controlador principal de la aplicación ContaDriver DiDi
// Funciones globales seguras para cerrar y abrir modales
window.closeModal = function(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('modal-hidden');
  }
};

window.showModal = function(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('modal-hidden');
  }
};

class ContaDriverApp {
  constructor() {
    this.currentTab = 'dashboard';
    this.activeReportPeriod = 'today';
    this.historyFilter = 'all';

    // Trip form state
    this.tripForm = {
      paymentType: 'cash', // 'cash' | 'card'
      diffDecision: 'tip', // 'tip' | 'change'
      isExact: false
    };

    // Expense form state
    this.expenseForm = {
      category: 'gasoline',
      paymentMethod: 'cash'
    };

    this.categories = [
      { id: 'gasoline', label: 'Gasolina', icon: 'fuel', color: 'text-amber-400' },
      { id: 'food', label: 'Comida', icon: 'utensils', color: 'text-orange-400' },
      { id: 'wash', label: 'Lavado', icon: 'droplets', color: 'text-blue-400' },
      { id: 'maintenance', label: 'Taller', icon: 'wrench', color: 'text-purple-400' },
      { id: 'toll', label: 'Casetas', icon: 'milestone', color: 'text-yellow-400' },
      { id: 'phone', label: 'Datos/Tel', icon: 'smartphone', color: 'text-cyan-400' },
      { id: 'didi_fee', label: 'Deuda DiDi', icon: 'credit-card', color: 'text-rose-400' },
      { id: 'other', label: 'Otros', icon: 'tag', color: 'text-slate-400' }
    ];

    this.init();
  }

  init() {
    // Ensure active shift exists
    let activeShift = window.storageService.getActiveShift();
    if (!activeShift) {
      // Create initial active shift if first time
      const settings = window.storageService.getSettings();
      activeShift = window.storageService.startShift({
        initialCash: 0,
        dailyGoal: settings.dailyGoal || 1500
      });
    }

    this.renderExpenseCategories();
    this.loadSettingsUI();
    this.refreshAll();

    // Event listeners
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeAllModals();
      }
    });
  }

  // --- TABS NAVIGATION ---
  switchTab(tabName) {
    window.feedbackService.playClick();
    this.currentTab = tabName;

    // View containers
    const vDash = document.getElementById('viewDashboard');
    const vRep = document.getElementById('viewReports');
    const vHist = document.getElementById('viewHistory');

    // Buttons
    const btnDash = document.getElementById('tabBtnDashboard');
    const btnRep = document.getElementById('tabBtnReports');
    const btnHist = document.getElementById('tabBtnHistory');

    // Reset styles
    [btnDash, btnRep, btnHist].forEach(btn => {
      btn.className = 'tab-button flex items-center justify-center space-x-2 py-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition';
    });

    vDash.classList.add('hidden');
    vRep.classList.add('hidden');
    vHist.classList.add('hidden');

    if (tabName === 'dashboard') {
      vDash.classList.remove('hidden');
      btnDash.className = 'tab-button flex items-center justify-center space-x-2 py-2.5 rounded-lg bg-didi text-white shadow-md transition';
      this.refreshDashboard();
    } else if (tabName === 'reports') {
      vRep.classList.remove('hidden');
      btnRep.className = 'tab-button flex items-center justify-center space-x-2 py-2.5 rounded-lg bg-didi text-white shadow-md transition';
      this.refreshReports();
    } else if (tabName === 'history') {
      vHist.classList.remove('hidden');
      btnHist.className = 'tab-button flex items-center justify-center space-x-2 py-2.5 rounded-lg bg-didi text-white shadow-md transition';
      this.refreshHistory();
    }

    lucide.createIcons();
  }

  // --- REFRESH EVERYTHING ---
  refreshAll() {
    this.refreshHeader();
    this.refreshDashboard();
    if (this.currentTab === 'reports') this.refreshReports();
    if (this.currentTab === 'history') this.refreshHistory();
  }

  // --- HEADER & SHIFT STATUS ---
  refreshHeader() {
    const activeShift = window.storageService.getActiveShift();
    const baseEl = document.getElementById('headerInitialCash');
    const statusTextEl = document.getElementById('shiftStatusText');

    if (activeShift) {
      baseEl.textContent = `$${(activeShift.initialCash || 0).toLocaleString()}`;
      statusTextEl.textContent = `Turno de hoy (${activeShift.date})`;
    } else {
      baseEl.textContent = '$0';
      statusTextEl.textContent = 'Sin turno activo';
    }
  }

  // --- DASHBOARD DATA CALCULATION ---
  refreshDashboard() {
    this.refreshHeader();

    const activeShift = window.storageService.getActiveShift();
    const initialCash = activeShift ? Number(activeShift.initialCash) || 0 : 0;
    const dailyGoal = activeShift ? Number(activeShift.dailyGoal) || 1500 : 1500;

    // Filter today's trips and expenses
    const todayData = window.reportsService.getFilteredData('today');
    const metrics = window.reportsService.calculateMetrics(todayData);

    // Cálculos cruciales:
    // 1. Dinero en Bolsillo = Base Inicial + Efectivo neto entrado por viajes - Gastos pagados en efectivo
    const pocketCashNow = initialCash + metrics.totalCashInPocket - metrics.cashExpenses;

    // 2. Facturado por la App (Tarifas DiDi de todos los viajes de hoy)
    const totalAppFare = metrics.totalAppFare;

    // 3. Propinas
    const totalTips = metrics.totalTips;

    // 4. Ganancia Bruta (App + Propinas)
    const grossEarnings = metrics.grossEarnings;

    // 5. Ganancia Neta (Bruto - Gastos)
    const netProfit = metrics.netProfit;

    // Actualizar elementos del Dashboard
    const pocketEl = document.getElementById('dashPocketTotal');
    const baseCashEl = document.getElementById('dashBaseCash');
    const cashCollectedEl = document.getElementById('dashCashCollected');
    const cashSpentEl = document.getElementById('dashCashSpent');

    if (pocketEl) {
      pocketEl.textContent = `$${pocketCashNow.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      if (pocketCashNow < 0) {
        pocketEl.classList.replace('text-emerald-400', 'text-rose-400');
      } else {
        pocketEl.classList.replace('text-rose-400', 'text-emerald-400');
      }
    }
    if (baseCashEl) baseCashEl.textContent = `$${initialCash.toLocaleString()}`;
    if (cashCollectedEl) cashCollectedEl.textContent = `+$${metrics.totalCashInPocket.toLocaleString()}`;
    if (cashSpentEl) cashSpentEl.textContent = `-$${metrics.cashExpenses.toLocaleString()}`;

    // Card DiDi App
    const didiTotalEl = document.getElementById('dashDidiTotal');
    const tripBadgeEl = document.getElementById('dashTripCountBadge');
    const tipsTotalEl = document.getElementById('dashTipsTotal');
    const expensesTotalEl = document.getElementById('dashExpensesTotal');
    const netProfitEl = document.getElementById('dashNetProfit');

    if (didiTotalEl) didiTotalEl.textContent = `$${totalAppFare.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (tripBadgeEl) tripBadgeEl.textContent = `${metrics.tripCount} ${metrics.tripCount === 1 ? 'viaje' : 'viajes'}`;
    if (tipsTotalEl) tipsTotalEl.textContent = `+$${totalTips.toLocaleString()}`;
    if (expensesTotalEl) expensesTotalEl.textContent = `-$${metrics.totalExpenses.toLocaleString()}`;
    if (netProfitEl) {
      netProfitEl.textContent = `$${netProfit.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      netProfitEl.className = `font-extrabold ${netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`;
    }

    // Goal progress
    const goalCurrentEl = document.getElementById('goalCurrentAmount');
    const goalTargetEl = document.getElementById('goalTargetAmount');
    const goalPercentEl = document.getElementById('goalPercentText');
    const goalBarEl = document.getElementById('goalProgressBar');

    if (goalCurrentEl) goalCurrentEl.textContent = `$${grossEarnings.toLocaleString()}`;
    if (goalTargetEl) goalTargetEl.textContent = `$${dailyGoal.toLocaleString()}`;

    const goalPct = dailyGoal > 0 ? Math.min(100, Math.round((grossEarnings / dailyGoal) * 100)) : 0;
    if (goalPercentEl) goalPercentEl.textContent = `(${goalPct}%)`;
    if (goalBarEl) goalBarEl.style.width = `${goalPct}%`;

    // Render Recent Activity (Today)
    this.renderRecentTodayActivity(todayData);
  }

  // --- RECENT TODAY ACTIVITY LIST ---
  renderRecentTodayActivity(todayData) {
    const listEl = document.getElementById('dashRecentList');
    const countEl = document.getElementById('dashTodayCount');
    if (!listEl) return;

    // Combine trips and expenses, sorted by timestamp descending
    const combined = [
      ...todayData.trips.map(t => ({ ...t, _type: 'trip' })),
      ...todayData.expenses.map(e => ({ ...e, _type: 'expense' }))
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    if (countEl) countEl.textContent = `${combined.length} movimientos`;

    if (combined.length === 0) {
      listEl.innerHTML = `
        <div class="py-8 text-center text-slate-500 text-xs">
          <i data-lucide="car" class="w-8 h-8 mx-auto mb-2 text-slate-600"></i>
          Aún no has registrado viajes ni gastos hoy.<br>Presiona los botones naranjas o rojos de arriba para comenzar.
        </div>
      `;
      lucide.createIcons();
      return;
    }

    listEl.innerHTML = combined.slice(0, 8).map(item => {
      const timeStr = new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      if (item._type === 'trip') {
        const isCash = item.paymentType === 'cash';
        const tipBadge = item.tip > 0 ? `<span class="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold text-[10px] ml-1">+Propina $${item.tip}</span>` : '';
        const exactBadge = item.isExact ? `<span class="px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 text-[10px] ml-1">Exacto</span>` : '';
        
        return `
          <div class="pt-2.5 pb-1 flex items-center justify-between">
            <div class="flex items-center space-x-3">
              <div class="w-8 h-8 rounded-lg ${isCash ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/30' : 'bg-amber-950/80 text-didi border border-didi/30'} flex items-center justify-center text-xs">
                <i data-lucide="${isCash ? 'banknote' : 'credit-card'}" class="w-4 h-4"></i>
              </div>
              <div>
                <div class="flex items-center text-xs font-bold text-white">
                  <span>Viaje DiDi ${item.notes ? `• ${item.notes}` : ''}</span>
                  ${tipBadge}
                  ${exactBadge}
                </div>
                <div class="text-[11px] text-slate-400">
                  <span>${timeStr}</span> • 
                  <span class="${isCash ? 'text-emerald-400 font-semibold' : 'text-slate-400'}">${isCash ? 'Efectivo en mano' : 'Tarjeta DiDi'}</span>
                </div>
              </div>
            </div>
            <div class="text-right">
              <span class="block text-sm font-extrabold text-white badge-currency">$${(Number(item.appFare) + Number(item.tip)).toLocaleString()}</span>
              <span class="text-[10px] text-slate-500">App: $${Number(item.appFare).toLocaleString()}</span>
            </div>
          </div>
        `;
      } else {
        // Gasto
        const catInfo = this.categories.find(c => c.id === item.category) || { label: 'Gasto', icon: 'tag' };
        const isCash = item.paymentMethod === 'cash';

        return `
          <div class="pt-2.5 pb-1 flex items-center justify-between">
            <div class="flex items-center space-x-3">
              <div class="w-8 h-8 rounded-lg bg-rose-950/80 text-rose-400 border border-rose-500/30 flex items-center justify-center text-xs">
                <i data-lucide="${catInfo.icon || 'fuel'}" class="w-4 h-4"></i>
              </div>
              <div>
                <div class="text-xs font-bold text-rose-300">
                  ${catInfo.label} ${item.description ? `• ${item.description}` : ''}
                </div>
                <div class="text-[11px] text-slate-400">
                  <span>${timeStr}</span> • 
                  <span>${isCash ? 'Pagado con efectivo' : 'Pagado con tarjeta'}</span>
                </div>
              </div>
            </div>
            <div class="text-right">
              <span class="block text-sm font-extrabold text-rose-400 badge-currency">-$${Number(item.amount).toLocaleString()}</span>
              <span class="text-[10px] ${isCash ? 'text-rose-500/80' : 'text-slate-500'}">${isCash ? 'Descontó de bolsillo' : 'Tarjeta'}</span>
            </div>
          </div>
        `;
      }
    }).join('');

    lucide.createIcons();
  }

  // --- TRIP MODAL & LOGIC ---
  openTripModal() {
    window.feedbackService.playClick();
    this.tripForm = {
      paymentType: 'cash',
      diffDecision: 'tip',
      isExact: false
    };

    document.getElementById('inputAppFare').value = '';
    document.getElementById('inputAmountReceived').value = '';
    document.getElementById('inputTripNotes').value = '';
    
    this.setTripPaymentType('cash');
    this.updateTripLivePreview();

    this.showModal('modalTrip');
    setTimeout(() => {
      document.getElementById('inputAppFare').focus();
    }, 200);
  }

  setTripPaymentType(type) {
    window.feedbackService.playClick();
    this.tripForm.paymentType = type;
    const btnCash = document.getElementById('btnTripPayCash');
    const btnCard = document.getElementById('btnTripPayCard');
    const cashSection = document.getElementById('cashPaymentSection');

    if (type === 'cash') {
      btnCash.className = 'btn-quick-touch py-2.5 px-3 rounded-xl border-2 border-emerald-500 bg-emerald-950/40 text-emerald-300 font-bold text-sm flex items-center justify-center gap-2 transition';
      btnCard.className = 'btn-quick-touch py-2.5 px-3 rounded-xl border-2 border-dark-border bg-dark-card text-slate-400 font-semibold text-sm flex items-center justify-center gap-2 hover:border-slate-500 transition';
      cashSection.classList.remove('hidden');
    } else {
      btnCard.className = 'btn-quick-touch py-2.5 px-3 rounded-xl border-2 border-amber-500 bg-amber-950/40 text-amber-300 font-bold text-sm flex items-center justify-center gap-2 transition';
      btnCash.className = 'btn-quick-touch py-2.5 px-3 rounded-xl border-2 border-dark-border bg-dark-card text-slate-400 font-semibold text-sm flex items-center justify-center gap-2 hover:border-slate-500 transition';
      cashSection.classList.add('hidden');
    }

    this.updateTripLivePreview();
  }

  onTripFareInput() {
    const fare = parseFloat(document.getElementById('inputAppFare').value) || 0;
    const receivedInput = document.getElementById('inputAmountReceived');
    
    // Si estaba marcado como pago exacto o recibido vacío, sincronizar automáticamente
    if (this.tripForm.isExact || !receivedInput.value) {
      receivedInput.value = fare > 0 ? fare : '';
    }

    this.updateTripLivePreview();
  }

  onTripReceivedInput() {
    this.tripForm.isExact = false;
    this.updateTripLivePreview();
  }

  // Botón "Pago Exacto" requerido por el usuario
  setExactPayment() {
    window.feedbackService.playClick();
    const fare = parseFloat(document.getElementById('inputAppFare').value) || 0;
    const receivedInput = document.getElementById('inputAmountReceived');
    
    receivedInput.value = fare > 0 ? fare : '';
    this.tripForm.isExact = true;
    this.updateTripLivePreview();
    this.showToast('Marcado como Pago Exacto');
  }

  quickAddBill(billValue) {
    window.feedbackService.playClick();
    const receivedInput = document.getElementById('inputAmountReceived');
    receivedInput.value = billValue;
    this.tripForm.isExact = false;
    this.updateTripLivePreview();
  }

  setDiffDecision(decision) {
    window.feedbackService.playClick();
    this.tripForm.diffDecision = decision;
    const btnTip = document.getElementById('btnDiffIsTip');
    const btnChange = document.getElementById('btnDiffIsChange');

    if (decision === 'tip') {
      btnTip.className = 'p-2 rounded-lg bg-amber-500/20 border-2 border-amber-500 text-amber-300 font-bold text-[11px] text-center flex flex-col items-center';
      btnChange.className = 'p-2 rounded-lg bg-slate-700/60 border-2 border-transparent text-slate-300 font-semibold text-[11px] text-center flex flex-col items-center hover:bg-slate-700';
    } else {
      btnChange.className = 'p-2 rounded-lg bg-blue-500/20 border-2 border-blue-500 text-blue-300 font-bold text-[11px] text-center flex flex-col items-center';
      btnTip.className = 'p-2 rounded-lg bg-slate-700/60 border-2 border-transparent text-slate-300 font-semibold text-[11px] text-center flex flex-col items-center hover:bg-slate-700';
    }

    this.updateTripLivePreview();
  }

  updateTripLivePreview() {
    const fare = parseFloat(document.getElementById('inputAppFare').value) || 0;
    const isCash = this.tripForm.paymentType === 'cash';
    let received = parseFloat(document.getElementById('inputAmountReceived').value) || 0;

    const previewApp = document.getElementById('previewAppFare');
    const previewPocket = document.getElementById('previewPocketCash');
    const tripDiffNotice = document.getElementById('tripDiffNotice');
    const diffText = document.getElementById('diffAmountText');

    let tip = 0;
    let changeGiven = 0;
    let pocketDelta = 0;

    if (!isCash) {
      // Tarjeta: bolsillo no recibe efectivo físico
      pocketDelta = 0;
      tripDiffNotice.classList.add('hidden');
    } else {
      // Si el cliente dio más de lo que marca la app (ej: tarifa 80, dio 100)
      if (received > fare && fare > 0) {
        const diff = received - fare;
        tripDiffNotice.classList.remove('hidden');
        diffText.textContent = `+$${diff.toFixed(2)}`;

        if (this.tripForm.diffDecision === 'tip') {
          tip = diff;
          changeGiven = 0;
          pocketDelta = received; // Se queda con el billete completo de $100
        } else {
          tip = 0;
          changeGiven = diff;
          pocketDelta = fare; // Devolvió los $20, entra al bolsillo la tarifa de $80
        }
      } else {
        tripDiffNotice.classList.add('hidden');
        pocketDelta = received > 0 ? received : fare;
      }
    }

    previewApp.textContent = `$${fare.toFixed(2)}`;
    previewPocket.textContent = isCash ? `+$${pocketDelta.toFixed(2)}` : '$0.00 (Tarjeta)';

    return { fare, received, tip, changeGiven, pocketDelta, isCash };
  }

  saveTrip() {
    const calc = this.updateTripLivePreview();
    if (calc.fare <= 0) {
      this.showToast('Por favor ingresa el valor de la tarifa DiDi', 'error');
      document.getElementById('inputAppFare').focus();
      return;
    }

    const notes = document.getElementById('inputTripNotes').value.trim();

    window.storageService.addTrip({
      appFare: calc.fare,
      paymentType: this.tripForm.paymentType,
      amountReceived: calc.isCash ? calc.received : calc.fare,
      isExact: this.tripForm.isExact || (calc.received === calc.fare),
      tip: calc.tip,
      changeGiven: calc.changeGiven,
      cashPocketDelta: calc.pocketDelta,
      notes: notes
    });

    window.feedbackService.playCashSuccess();
    this.closeModal('modalTrip');
    this.refreshAll();
    
    const tipMsg = calc.tip > 0 ? ` (+ $${calc.tip} propina)` : '';
    this.showToast(`✅ Viaje guardado: $${calc.fare}${tipMsg}`);
  }

  // --- EXPENSE MODAL & LOGIC ---
  renderExpenseCategories() {
    const container = document.getElementById('expenseCategoryGrid');
    if (!container) return;

    container.innerHTML = this.categories.map(cat => `
      <button type="button" onclick="app.selectExpenseCategory('${cat.id}')" id="catBtn_${cat.id}" 
        class="cat-btn btn-quick-touch p-2.5 rounded-xl border ${this.expenseForm.category === cat.id ? 'border-rose-500 bg-rose-950/40' : 'border-dark-border bg-dark-card hover:bg-slate-800'} flex flex-col items-center justify-center gap-1 transition">
        <i data-lucide="${cat.icon}" class="w-5 h-5 ${cat.color}"></i>
        <span class="text-[10px] font-bold text-slate-200 text-center leading-tight">${cat.label}</span>
      </button>
    `).join('');

    lucide.createIcons();
  }

  selectExpenseCategory(catId) {
    window.feedbackService.playClick();
    this.expenseForm.category = catId;
    this.renderExpenseCategories();
  }

  openExpenseModal() {
    window.feedbackService.playClick();
    document.getElementById('inputExpenseAmount').value = '';
    document.getElementById('inputExpenseDesc').value = '';
    this.setExpensePaymentMethod('cash');
    this.selectExpenseCategory('gasoline');
    this.showModal('modalExpense');
    setTimeout(() => {
      document.getElementById('inputExpenseAmount').focus();
    }, 200);
  }

  setExpensePaymentMethod(method) {
    window.feedbackService.playClick();
    this.expenseForm.paymentMethod = method;
    const btnCash = document.getElementById('btnExpPayCash');
    const btnCard = document.getElementById('btnExpPayCard');
    const impactText = document.getElementById('expenseCashImpactText');

    if (method === 'cash') {
      btnCash.className = 'btn-quick-touch py-2.5 px-3 rounded-xl border-2 border-rose-500 bg-rose-950/40 text-rose-300 font-bold text-xs flex items-center justify-center gap-1.5';
      btnCard.className = 'btn-quick-touch py-2.5 px-3 rounded-xl border-2 border-dark-border bg-dark-card text-slate-400 font-semibold text-xs flex items-center justify-center gap-1.5 hover:border-slate-500';
      impactText.textContent = '* Descontará directamente del dinero físico que tienes en los bolsillos.';
      impactText.className = 'text-[10px] text-rose-400 mt-1';
    } else {
      btnCard.className = 'btn-quick-touch py-2.5 px-3 rounded-xl border-2 border-blue-500 bg-blue-950/40 text-blue-300 font-bold text-xs flex items-center justify-center gap-1.5';
      btnCash.className = 'btn-quick-touch py-2.5 px-3 rounded-xl border-2 border-dark-border bg-dark-card text-slate-400 font-semibold text-xs flex items-center justify-center gap-1.5 hover:border-slate-500';
      impactText.textContent = '* Pagado con tarjeta/banco: se cuenta como gasto, pero NO resta del efectivo que traes en mano.';
      impactText.className = 'text-[10px] text-blue-400 mt-1';
    }
  }

  saveExpense() {
    const amount = parseFloat(document.getElementById('inputExpenseAmount').value) || 0;
    if (amount <= 0) {
      this.showToast('Ingresa un monto de gasto válido', 'error');
      document.getElementById('inputExpenseAmount').focus();
      return;
    }

    const desc = document.getElementById('inputExpenseDesc').value.trim();

    window.storageService.addExpense({
      amount: amount,
      category: this.expenseForm.category,
      paymentMethod: this.expenseForm.paymentMethod,
      description: desc
    });

    window.feedbackService.playExpenseSound();
    this.closeModal('modalExpense');
    this.refreshAll();
    this.showToast(`⛽ Gasto registrado: -$${amount.toLocaleString()}`);
  }

  // --- INITIAL CASH & SHIFT MANAGEMENT ---
  openShiftModal() {
    window.feedbackService.playClick();
    const activeShift = window.storageService.getActiveShift();
    const inputBase = document.getElementById('inputShiftBaseCash');
    const inputGoal = document.getElementById('inputShiftGoal');
    const inputOdo = document.getElementById('inputShiftOdometer');

    if (activeShift) {
      inputBase.value = activeShift.initialCash || '';
      inputGoal.value = activeShift.dailyGoal || 1500;
      inputOdo.value = activeShift.initialOdometer || '';
    } else {
      inputBase.value = '';
      inputGoal.value = 1500;
      inputOdo.value = '';
    }

    this.showModal('modalShift');
    setTimeout(() => inputBase.focus(), 200);
  }

  saveShiftConfig() {
    const baseAmount = parseFloat(document.getElementById('inputShiftBaseCash').value) || 0;
    const goal = parseFloat(document.getElementById('inputShiftGoal').value) || 1500;
    const odo = parseFloat(document.getElementById('inputShiftOdometer').value) || 0;

    let activeShift = window.storageService.getActiveShift();
    if (!activeShift) {
      activeShift = window.storageService.startShift({
        initialCash: baseAmount,
        dailyGoal: goal,
        initialOdometer: odo
      });
    } else {
      window.storageService.updateShift(activeShift.id, {
        initialCash: baseAmount,
        dailyGoal: goal,
        initialOdometer: odo
      });
    }

    window.feedbackService.playCashSuccess();
    this.closeModal('modalShift');
    this.refreshAll();
    this.showToast(`Base de efectivo actualizada: $${baseAmount.toLocaleString()}`);
  }

  // --- ARQUEO & CUADRE DE BOLSILLO ---
  openArqueoModal() {
    window.feedbackService.playClick();
    const activeShift = window.storageService.getActiveShift();
    const initialCash = activeShift ? Number(activeShift.initialCash) || 0 : 0;

    const todayData = window.reportsService.getFilteredData('today');
    const metrics = window.reportsService.calculateMetrics(todayData);

    const pocketExpected = initialCash + metrics.totalCashInPocket - metrics.cashExpenses;

    document.getElementById('arqBaseCash').textContent = `$${initialCash.toLocaleString()}`;
    document.getElementById('arqTripsCash').textContent = `+$${metrics.totalCashInPocket.toLocaleString()}`;
    document.getElementById('arqExpensesCash').textContent = `-$${metrics.cashExpenses.toLocaleString()}`;
    document.getElementById('arqExpectedCash').textContent = `$${pocketExpected.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;

    document.getElementById('inputCountedCash').value = '';
    document.getElementById('arqResultBox').classList.add('hidden');

    this.showModal('modalArqueo');
    setTimeout(() => document.getElementById('inputCountedCash').focus(), 200);
  }

  calculateArqueoDiff() {
    const activeShift = window.storageService.getActiveShift();
    const initialCash = activeShift ? Number(activeShift.initialCash) || 0 : 0;
    const todayData = window.reportsService.getFilteredData('today');
    const metrics = window.reportsService.calculateMetrics(todayData);
    const expected = initialCash + metrics.totalCashInPocket - metrics.cashExpenses;

    const countedInput = document.getElementById('inputCountedCash');
    const counted = parseFloat(countedInput.value);

    const resBox = document.getElementById('arqResultBox');
    const resTitle = document.getElementById('arqResultTitle');
    const resDetail = document.getElementById('arqResultDetail');

    if (isNaN(counted)) {
      resBox.classList.add('hidden');
      return;
    }

    resBox.classList.remove('hidden');
    const diff = counted - expected;

    if (Math.abs(diff) < 0.05) {
      resBox.className = 'p-3 rounded-xl border border-emerald-500/50 bg-emerald-950/40 text-emerald-300 text-center space-y-1';
      resTitle.textContent = '✨ ¡Cuadre Perfecto!';
      resDetail.textContent = 'El efectivo que contaste coincide exactamente con las cuentas registradas.';
    } else if (diff > 0) {
      resBox.className = 'p-3 rounded-xl border border-amber-500/50 bg-amber-950/40 text-amber-300 text-center space-y-1';
      resTitle.textContent = `💵 Te sobran: +$${diff.toFixed(2)}`;
      resDetail.textContent = 'Tienes más dinero en la mano de lo calculado. Posiblemente recibiste alguna propina que no registraste.';
    } else {
      resBox.className = 'p-3 rounded-xl border border-rose-500/50 bg-rose-950/40 text-rose-300 text-center space-y-1';
      resTitle.textContent = `⚠️ Te faltan: -$${Math.abs(diff).toFixed(2)}`;
      resDetail.textContent = 'Tienes menos dinero en la mano del calculado. Revisa si tuviste algún gasto en efectivo no anotado o diste cambio de más.';
    }
  }

  closeShiftDefinitive() {
    const activeShift = window.storageService.getActiveShift();
    if (!activeShift) return;

    if (!confirm('¿Deseas finalizar el turno de hoy? Esto guardará el arqueo y te permitirá iniciar un nuevo día mañana.')) {
      return;
    }

    const countedInput = document.getElementById('inputCountedCash');
    const counted = parseFloat(countedInput.value) || null;

    window.storageService.closeShift(activeShift.id, {
      countedCash: counted,
      closingNotes: 'Cierre de turno realizado'
    });

    this.closeModal('modalArqueo');
    this.refreshAll();
    this.showToast('Turno finalizado con éxito');
  }

  promptDailyGoal() {
    const activeShift = window.storageService.getActiveShift();
    const currentGoal = activeShift ? activeShift.dailyGoal || 1500 : 1500;
    const newGoal = prompt('Ingresa tu meta de ganancia para hoy ($):', currentGoal);
    if (newGoal && !isNaN(newGoal)) {
      if (activeShift) {
        window.storageService.updateShift(activeShift.id, { dailyGoal: Number(newGoal) });
      }
      this.refreshAll();
      this.showToast(`Nueva meta fijada: $${Number(newGoal).toLocaleString()}`);
    }
  }

  // --- REPORTS VIEW ---
  changeReportPeriod(period) {
    window.feedbackService.playClick();
    this.activeReportPeriod = period;

    ['today', 'week', 'fortnight', 'month', 'all'].forEach(p => {
      const btn = document.getElementById(`periodBtn${p.charAt(0).toUpperCase() + p.slice(1)}`);
      if (btn) {
        if (p === period) {
          btn.className = 'flex-1 min-w-[70px] py-2 text-xs font-bold rounded-lg bg-didi text-white transition';
        } else {
          btn.className = 'flex-1 min-w-[70px] py-2 text-xs font-bold rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition';
        }
      }
    });

    this.refreshReports();
  }

  refreshReports() {
    const data = window.reportsService.getFilteredData(this.activeReportPeriod);
    const metrics = window.reportsService.calculateMetrics(data);

    // Label de rango
    const rangeLabel = document.getElementById('reportDateRangeLabel');
    if (rangeLabel) {
      if (this.activeReportPeriod === 'all') {
        rangeLabel.textContent = 'Historial completo acumulado';
      } else {
        const s = data.startDate.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
        const e = data.endDate.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
        rangeLabel.textContent = this.activeReportPeriod === 'today' ? `Hoy (${s})` : `${s} - ${e}`;
      }
    }

    // KPI cards
    document.getElementById('repAppTotal').textContent = `$${metrics.totalAppFare.toLocaleString()}`;
    document.getElementById('repAppTrips').textContent = `${metrics.tripCount} viajes (${metrics.cashTripsCount} cash / ${metrics.cardTripsCount} tarjeta)`;
    document.getElementById('repTipsTotal').textContent = `+$${metrics.totalTips.toLocaleString()}`;
    document.getElementById('repExpensesTotal').textContent = `-$${metrics.totalExpenses.toLocaleString()}`;
    document.getElementById('repCashExpenses').textContent = `$${metrics.cashExpenses.toLocaleString()} en efectivo`;
    
    const repNetProfit = document.getElementById('repNetProfit');
    repNetProfit.textContent = `$${metrics.netProfit.toLocaleString()}`;
    repNetProfit.className = `text-xl font-black ${metrics.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'} badge-currency`;

    document.getElementById('repNetMargin').textContent = `${metrics.profitMargin.toFixed(1)}% de margen neto`;

    // Charts labels
    const chartNetVal = document.getElementById('chartLabelNetVal');
    const chartExpVal = document.getElementById('chartLabelExpVal');
    if (chartNetVal) chartNetVal.textContent = `$${metrics.netProfit.toLocaleString()} (${metrics.profitMargin.toFixed(1)}%)`;
    if (chartExpVal) chartExpVal.textContent = `$${metrics.totalExpenses.toLocaleString()} (${metrics.expenseRatio.toFixed(1)}%)`;

    // Render Chart.js
    window.reportsService.renderCharts(metrics, data);
  }

  // --- HISTORY VIEW ---
  setHistoryFilter(filter) {
    window.feedbackService.playClick();
    this.historyFilter = filter;
    
    const btnAll = document.getElementById('histFilterAll');
    const btnTrips = document.getElementById('histFilterTrips');
    const btnExp = document.getElementById('histFilterExpenses');

    [btnAll, btnTrips, btnExp].forEach(b => {
      b.className = 'px-3 py-1.5 rounded-md text-xs font-bold text-slate-400 hover:text-white';
    });

    if (filter === 'all') btnAll.className = 'px-3 py-1.5 rounded-md text-xs font-bold bg-didi text-white';
    if (filter === 'trips') btnTrips.className = 'px-3 py-1.5 rounded-md text-xs font-bold bg-didi text-white';
    if (filter === 'expenses') btnExp.className = 'px-3 py-1.5 rounded-md text-xs font-bold bg-didi text-white';

    this.refreshHistory();
  }

  refreshHistory() {
    const container = document.getElementById('historyListContainer');
    const countEl = document.getElementById('historyItemsCount');
    if (!container) return;

    const trips = window.storageService.getTrips();
    const expenses = window.storageService.getExpenses();

    let items = [];
    if (this.historyFilter === 'all' || this.historyFilter === 'trips') {
      items = items.concat(trips.map(t => ({ ...t, _type: 'trip' })));
    }
    if (this.historyFilter === 'all' || this.historyFilter === 'expenses') {
      items = items.concat(expenses.map(e => ({ ...e, _type: 'expense' })));
    }

    items.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    if (countEl) countEl.textContent = `${items.length} registros`;

    if (items.length === 0) {
      container.innerHTML = `
        <div class="py-12 text-center text-slate-500 text-xs">
          <i data-lucide="inbox" class="w-8 h-8 mx-auto mb-2 text-slate-600"></i>
          No hay movimientos registrados en este filtro.
        </div>
      `;
      lucide.createIcons();
      return;
    }

    container.innerHTML = items.map(item => {
      const dateObj = new Date(item.timestamp);
      const dateStr = dateObj.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
      const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      if (item._type === 'trip') {
        const isCash = item.paymentType === 'cash';
        return `
          <div class="p-3.5 flex items-center justify-between hover:bg-slate-800/40 transition">
            <div class="flex items-center space-x-3">
              <div class="w-9 h-9 rounded-xl ${isCash ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/30' : 'bg-amber-950/80 text-didi border border-didi/30'} flex items-center justify-center">
                <i data-lucide="${isCash ? 'banknote' : 'credit-card'}" class="w-4 h-4"></i>
              </div>
              <div>
                <div class="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>Viaje DiDi</span>
                  ${item.tip > 0 ? `<span class="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[10px]">+Propina $${item.tip}</span>` : ''}
                  ${item.isExact ? `<span class="px-1.5 py-0.2 rounded bg-slate-700 text-slate-300 text-[10px]">Exacto</span>` : ''}
                </div>
                <div class="text-[11px] text-slate-400">
                  ${dateStr} ${timeStr} • ${isCash ? 'Cobro en Efectivo' : 'Tarjeta DiDi'}
                  ${item.notes ? `• "${item.notes}"` : ''}
                </div>
              </div>
            </div>
            <div class="flex items-center space-x-3">
              <div class="text-right">
                <span class="block text-sm font-extrabold text-white badge-currency">$${(Number(item.appFare) + Number(item.tip)).toLocaleString()}</span>
                <span class="text-[10px] text-slate-500">App: $${Number(item.appFare).toLocaleString()}</span>
              </div>
              <button onclick="app.deleteItem('trip', '${item.id}')" title="Eliminar registro" class="p-1.5 text-slate-500 hover:text-rose-400 transition">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
              </button>
            </div>
          </div>
        `;
      } else {
        const catInfo = this.categories.find(c => c.id === item.category) || { label: 'Gasto', icon: 'tag' };
        const isCash = item.paymentMethod === 'cash';
        return `
          <div class="p-3.5 flex items-center justify-between hover:bg-slate-800/40 transition">
            <div class="flex items-center space-x-3">
              <div class="w-9 h-9 rounded-xl bg-rose-950/80 text-rose-400 border border-rose-500/30 flex items-center justify-center">
                <i data-lucide="${catInfo.icon || 'fuel'}" class="w-4 h-4"></i>
              </div>
              <div>
                <div class="text-xs font-bold text-rose-300">
                  ${catInfo.label} ${item.description ? `• ${item.description}` : ''}
                </div>
                <div class="text-[11px] text-slate-400">
                  ${dateStr} ${timeStr} • ${isCash ? 'Efectivo (Bolsillo)' : 'Tarjeta'}
                </div>
              </div>
            </div>
            <div class="flex items-center space-x-3">
              <div class="text-right">
                <span class="block text-sm font-extrabold text-rose-400 badge-currency">-$${Number(item.amount).toLocaleString()}</span>
                <span class="text-[10px] text-slate-500">${isCash ? 'Bolsillo' : 'Tarjeta'}</span>
              </div>
              <button onclick="app.deleteItem('expense', '${item.id}')" title="Eliminar registro" class="p-1.5 text-slate-500 hover:text-rose-400 transition">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
              </button>
            </div>
          </div>
        `;
      }
    }).join('');

    lucide.createIcons();
  }

  deleteItem(type, id) {
    if (!confirm('¿Estás seguro de eliminar este registro?')) return;
    if (type === 'trip') {
      window.storageService.deleteTrip(id);
    } else {
      window.storageService.deleteExpense(id);
    }
    this.refreshAll();
    this.showToast('Registro eliminado');
  }

  // --- EXPORT TO CSV (EXCEL) ---
  exportReportCSV() {
    const data = window.reportsService.getFilteredData(this.activeReportPeriod);
    
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Tipo,Fecha,Hora,Tarifa_App_DiDi,Propina,Total_Viaje,Tipo_Pago,Efectivo_Bolsillo,Categoria_Gasto,Monto_Gasto,Metodo_Pago_Gasto,Descripcion_Notas\r\n';

    // Agregar viajes
    data.trips.forEach(t => {
      const d = new Date(t.timestamp);
      const date = d.toISOString().split('T')[0];
      const time = d.toTimeString().split(' ')[0];
      const total = (Number(t.appFare) || 0) + (Number(t.tip) || 0);
      csvContent += `Viaje,${date},${time},${t.appFare},${t.tip},${total},${t.paymentType},${t.cashPocketDelta},,,,${(t.notes || '').replace(/,/g, ' ')}\r\n`;
    });

    // Agregar gastos
    data.expenses.forEach(e => {
      const d = new Date(e.timestamp);
      const date = d.toISOString().split('T')[0];
      const time = d.toTimeString().split(' ')[0];
      csvContent += `Gasto,${date},${time},,,,,,,${e.category},${e.amount},${e.paymentMethod},${(e.description || '').replace(/,/g, ' ')}\r\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ContaDriver_Reporte_${this.activeReportPeriod}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    this.showToast('Reporte CSV descargado para Excel');
  }

  // --- SETTINGS & BACKUP ---
  loadSettingsUI() {
    const settings = window.storageService.getSettings();
    const chkSound = document.getElementById('chkSound');
    const chkVibrate = document.getElementById('chkVibrate');
    if (chkSound) chkSound.checked = !!settings.soundEnabled;
    if (chkVibrate) chkVibrate.checked = !!settings.vibrateEnabled;
  }

  toggleSound(enabled) {
    const settings = window.storageService.getSettings();
    settings.soundEnabled = enabled;
    window.storageService.saveSettings(settings);
    if (enabled) window.feedbackService.playCashSuccess();
  }

  toggleVibrate(enabled) {
    const settings = window.storageService.getSettings();
    settings.vibrateEnabled = enabled;
    window.storageService.saveSettings(settings);
    if (enabled) window.feedbackService.vibrate(50);
  }

  exportBackupJSON() {
    const data = window.storageService.exportAllData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ContaDriver_Backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    this.showToast('Copia de seguridad descargada');
  }

  importBackupJSON(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target.result);
        if (window.storageService.importAllData(json)) {
          this.closeModal('modalSettings');
          this.refreshAll();
          this.showToast('Copia restaurada exitosamente');
        } else {
          alert('El archivo no tiene el formato correcto.');
        }
      } catch (err) {
        alert('Error al leer el archivo JSON.');
      }
    };
    reader.readAsText(file);
  }

  // --- MODALS HELPER ---
  showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('modal-hidden');
    }
  }

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('modal-hidden');
    }
  }

  closeAllModals() {
    ['modalTrip', 'modalExpense', 'modalShift', 'modalArqueo', 'modalSettings'].forEach(id => {
      this.closeModal(id);
    });
  }

  // --- TOAST NOTIFICATIONS ---
  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'px-4 py-2 rounded-xl bg-slate-900/95 text-white border border-dark-border shadow-xl text-xs font-semibold flex items-center space-x-2 animate-bounce transition';
    toast.innerHTML = `<span>${message}</span>`;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new ContaDriverApp();

  // Attach button triggers
  const btnOpenShift = document.getElementById('btnOpenShiftModal');
  if (btnOpenShift) btnOpenShift.addEventListener('click', () => window.app.openShiftModal());

  const shiftStatusInd = document.getElementById('shiftStatusIndicator');
  if (shiftStatusInd) shiftStatusInd.addEventListener('click', () => window.app.openShiftModal());

  const btnOpenSettings = document.getElementById('btnOpenSettings');
  if (btnOpenSettings) btnOpenSettings.addEventListener('click', () => window.app.showModal('modalSettings'));
});
