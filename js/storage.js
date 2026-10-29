// js/storage.js - Gestión de almacenamiento local robusto para ContaDriver
const STORAGE_KEYS = {
  SHIFTS: 'contadriver_shifts',
  TRIPS: 'contadriver_trips',
  EXPENSES: 'contadriver_expenses',
  SETTINGS: 'contadriver_settings',
  ACTIVE_SHIFT_ID: 'contadriver_active_shift_id'
};

const DEFAULT_SETTINGS = {
  currency: '$',
  theme: 'dark',
  soundEnabled: true,
  vibrateEnabled: true,
  dailyGoal: 1500,
  defaultPaymentType: 'cash',
  userName: 'Conductor'
};

class StorageService {
  constructor() {
    this.init();
  }

  init() {
    if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
      this.saveSettings(DEFAULT_SETTINGS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.SHIFTS)) {
      localStorage.setItem(STORAGE_KEYS.SHIFTS, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.TRIPS)) {
      localStorage.setItem(STORAGE_KEYS.TRIPS, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.EXPENSES)) {
      localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify([]));
    }
  }

  // --- SETTINGS ---
  getSettings() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
    } catch (e) {
      console.error('Error reading settings:', e);
      return DEFAULT_SETTINGS;
    }
  }

  saveSettings(settings) {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
      return true;
    } catch (e) {
      console.error('Error saving settings:', e);
      return false;
    }
  }

  // --- SHIFTS (TURNOS) ---
  getShifts() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.SHIFTS) || '[]');
    } catch (e) {
      console.error('Error reading shifts:', e);
      return [];
    }
  }

  getActiveShift() {
    const activeId = localStorage.getItem(STORAGE_KEYS.ACTIVE_SHIFT_ID);
    if (!activeId) return null;
    const shifts = this.getShifts();
    return shifts.find(s => s.id === activeId && s.status === 'active') || null;
  }

  startShift({ initialCash, initialOdometer = 0, dailyGoal = 1500, notes = '' }) {
    const shifts = this.getShifts();
    
    // Close any previous active shift if left open
    const currentActive = this.getActiveShift();
    if (currentActive) {
      this.closeShift(currentActive.id, { notes: 'Cierre automático al iniciar nuevo turno' });
    }

    const newShift = {
      id: 'shift_' + Date.now(),
      date: new Date().toISOString().split('T')[0],
      startTime: new Date().toISOString(),
      endTime: null,
      status: 'active',
      initialCash: Number(initialCash) || 0,
      initialOdometer: Number(initialOdometer) || 0,
      finalOdometer: null,
      dailyGoal: Number(dailyGoal) || 1500,
      notes: notes || '',
      closingSummary: null
    };

    shifts.unshift(newShift);
    localStorage.setItem(STORAGE_KEYS.SHIFTS, JSON.stringify(shifts));
    localStorage.setItem(STORAGE_KEYS.ACTIVE_SHIFT_ID, newShift.id);
    return newShift;
  }

  updateActiveShiftBaseCash(amount) {
    const active = this.getActiveShift();
    if (!active) return null;
    return this.updateShift(active.id, { initialCash: Number(amount) || 0 });
  }

  updateShift(shiftId, updates) {
    const shifts = this.getShifts();
    const index = shifts.findIndex(s => s.id === shiftId);
    if (index === -1) return null;
    shifts[index] = { ...shifts[index], ...updates };
    localStorage.setItem(STORAGE_KEYS.SHIFTS, JSON.stringify(shifts));
    return shifts[index];
  }

  closeShift(shiftId, { finalOdometer = null, closingNotes = '', countedCash = null, cashDifference = null, summary = null } = {}) {
    const shifts = this.getShifts();
    const index = shifts.findIndex(s => s.id === shiftId);
    if (index === -1) return null;

    shifts[index].status = 'closed';
    shifts[index].endTime = new Date().toISOString();
    if (finalOdometer !== null) shifts[index].finalOdometer = Number(finalOdometer);
    if (closingNotes) shifts[index].closingNotes = closingNotes;
    if (countedCash !== null) shifts[index].countedCash = Number(countedCash);
    if (cashDifference !== null) shifts[index].cashDifference = Number(cashDifference);
    if (summary) shifts[index].closingSummary = summary;

    localStorage.setItem(STORAGE_KEYS.SHIFTS, JSON.stringify(shifts));
    if (localStorage.getItem(STORAGE_KEYS.ACTIVE_SHIFT_ID) === shiftId) {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_SHIFT_ID);
    }
    return shifts[index];
  }

  // --- TRIPS (VIAJES) ---
  getTrips() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.TRIPS) || '[]');
    } catch (e) {
      console.error('Error reading trips:', e);
      return [];
    }
  }

  addTrip(tripData) {
    const trips = this.getTrips();
    const activeShift = this.getActiveShift();

    const newTrip = {
      id: 'trip_' + Date.now(),
      shiftId: activeShift ? activeShift.id : (tripData.shiftId || 'no_shift'),
      timestamp: tripData.timestamp || new Date().toISOString(),
      appFare: Number(tripData.appFare) || 0, // Lo que dice la app DiDi
      paymentType: tripData.paymentType || 'cash', // 'cash' | 'card'
      amountReceived: Number(tripData.amountReceived) || Number(tripData.appFare) || 0, // Lo que dio el cliente
      isExact: !!tripData.isExact, // Si pagó exacto
      tip: Number(tripData.tip) || 0, // Propina
      changeGiven: Number(tripData.changeGiven) || 0, // Cambio devuelto
      cashPocketDelta: Number(tripData.cashPocketDelta) || 0, // Dinero real que entra al bolsillo físico
      notes: tripData.notes || ''
    };

    trips.unshift(newTrip);
    localStorage.setItem(STORAGE_KEYS.TRIPS, JSON.stringify(trips));
    return newTrip;
  }

  updateTrip(tripId, updates) {
    const trips = this.getTrips();
    const index = trips.findIndex(t => t.id === tripId);
    if (index === -1) return null;
    trips[index] = { ...trips[index], ...updates };
    localStorage.setItem(STORAGE_KEYS.TRIPS, JSON.stringify(trips));
    return trips[index];
  }

  deleteTrip(tripId) {
    let trips = this.getTrips();
    trips = trips.filter(t => t.id !== tripId);
    localStorage.setItem(STORAGE_KEYS.TRIPS, JSON.stringify(trips));
    return true;
  }

  // --- EXPENSES (GASTOS) ---
  getExpenses() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.EXPENSES) || '[]');
    } catch (e) {
      console.error('Error reading expenses:', e);
      return [];
    }
  }

  addExpense(expenseData) {
    const expenses = this.getExpenses();
    const activeShift = this.getActiveShift();

    const newExpense = {
      id: 'exp_' + Date.now(),
      shiftId: activeShift ? activeShift.id : (expenseData.shiftId || 'no_shift'),
      timestamp: expenseData.timestamp || new Date().toISOString(),
      category: expenseData.category || 'gasoline',
      amount: Number(expenseData.amount) || 0,
      paymentMethod: expenseData.paymentMethod || 'cash', // 'cash' (descuenta de bolsillos) | 'card'
      description: expenseData.description || ''
    };

    expenses.unshift(newExpense);
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));
    return newExpense;
  }

  updateExpense(expenseId, updates) {
    const expenses = this.getExpenses();
    const index = expenses.findIndex(e => e.id === expenseId);
    if (index === -1) return null;
    expenses[index] = { ...expenses[index], ...updates };
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));
    return expenses[index];
  }

  deleteExpense(expenseId) {
    let expenses = this.getExpenses();
    expenses = expenses.filter(e => e.id !== expenseId);
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));
    return true;
  }

  // --- BACKUP & RESTORE ---
  exportAllData() {
    return {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      settings: this.getSettings(),
      shifts: this.getShifts(),
      trips: this.getTrips(),
      expenses: this.getExpenses(),
      activeShiftId: localStorage.getItem(STORAGE_KEYS.ACTIVE_SHIFT_ID)
    };
  }

  importAllData(data) {
    try {
      if (!data || typeof data !== 'object') throw new Error('Formato inválido');
      if (data.settings) localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(data.settings));
      if (Array.isArray(data.shifts)) localStorage.setItem(STORAGE_KEYS.SHIFTS, JSON.stringify(data.shifts));
      if (Array.isArray(data.trips)) localStorage.setItem(STORAGE_KEYS.TRIPS, JSON.stringify(data.trips));
      if (Array.isArray(data.expenses)) localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(data.expenses));
      if (data.activeShiftId) {
        localStorage.setItem(STORAGE_KEYS.ACTIVE_SHIFT_ID, data.activeShiftId);
      } else {
        localStorage.removeItem(STORAGE_KEYS.ACTIVE_SHIFT_ID);
      }
      return true;
    } catch (e) {
      console.error('Error importing data:', e);
      return false;
    }
  }

  clearAllData() {
    localStorage.removeItem(STORAGE_KEYS.SHIFTS);
    localStorage.removeItem(STORAGE_KEYS.TRIPS);
    localStorage.removeItem(STORAGE_KEYS.EXPENSES);
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_SHIFT_ID);
    this.init();
    return true;
  }
}

// Global instance
window.storageService = new StorageService();
