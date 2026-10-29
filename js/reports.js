// js/reports.js - Motor de reportes, cálculos y visualizaciones gráficas
class ReportsService {
  constructor() {
    this.donutChart = null;
    this.barChart = null;
    this.expenseCatChart = null;
  }

  // Filtrar datos según período
  getFilteredData(period = 'today', customStartDate = null, customEndDate = null) {
    const allTrips = window.storageService.getTrips();
    const allExpenses = window.storageService.getExpenses();
    const allShifts = window.storageService.getShifts();

    const now = new Date();
    let startDate = new Date();
    let endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    if (period === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    } else if (period === 'week') {
      // Últimos 7 días
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 6);
      startDate.setHours(0, 0, 0, 0);
    } else if (period === 'fortnight') {
      // Quincenal: o bien 1 al 15, o 16 al fin de mes actual (o últimos 15 días)
      // Usaremos la quincena natural corriente para mayor precisión contable de chofer
      const currentDay = now.getDate();
      if (currentDay <= 15) {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth(), 15, 23, 59, 59, 999);
      } else {
        startDate = new Date(now.getFullYear(), now.getMonth(), 16, 0, 0, 0, 0);
        // fin de mes
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      }
    } else if (period === 'month') {
      // Mes actual
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (period === 'all') {
      startDate = new Date(2000, 0, 1);
      endDate = new Date(2099, 11, 31, 23, 59, 59);
    } else if (period === 'custom' && customStartDate) {
      startDate = new Date(customStartDate + 'T00:00:00');
      endDate = customEndDate ? new Date(customEndDate + 'T23:59:59') : new Date();
    }

    const startTs = startDate.getTime();
    const endTs = endDate.getTime();

    const trips = allTrips.filter(t => {
      const ts = new Date(t.timestamp).getTime();
      return ts >= startTs && ts <= endTs;
    });

    const expenses = allExpenses.filter(e => {
      const ts = new Date(e.timestamp).getTime();
      return ts >= startTs && ts <= endTs;
    });

    const shifts = allShifts.filter(s => {
      const ts = new Date(s.startTime).getTime();
      return ts >= startTs && ts <= endTs;
    });

    return {
      period,
      startDate,
      endDate,
      trips,
      expenses,
      shifts
    };
  }

  // Calcular métricas
  calculateMetrics(data) {
    const { trips, expenses, shifts } = data;

    // Métricas de viajes
    let totalAppFare = 0; // Lo que facturó la app
    let totalTips = 0; // Propinas adicionales
    let totalCashReceived = 0; // Efectivo bruto dado por clientes
    let totalCashInPocket = 0; // Efectivo neto que entró a bolsillos por viajes
    let totalCardAppEarnings = 0; // Ganancia por tarjeta/app
    let tripCount = trips.length;
    let cashTripsCount = 0;
    let cardTripsCount = 0;

    trips.forEach(t => {
      const fare = Number(t.appFare) || 0;
      const tip = Number(t.tip) || 0;
      const cashDelta = Number(t.cashPocketDelta) || 0;
      const received = Number(t.amountReceived) || fare;

      totalAppFare += fare;
      totalTips += tip;

      if (t.paymentType === 'cash') {
        cashTripsCount++;
        totalCashReceived += received;
        totalCashInPocket += cashDelta;
      } else {
        cardTripsCount++;
        totalCardAppEarnings += fare + tip;
      }
    });

    const grossEarnings = totalAppFare + totalTips; // Ganancia bruta total
    const avgPerTrip = tripCount > 0 ? (grossEarnings / tripCount) : 0;

    // Métricas de gastos
    let totalExpenses = 0;
    let cashExpenses = 0;
    let cardExpenses = 0;
    const expenseByCategory = {
      gasoline: 0,
      food: 0,
      wash: 0,
      maintenance: 0,
      toll: 0,
      phone: 0,
      didi_fee: 0,
      other: 0
    };

    expenses.forEach(e => {
      const amount = Number(e.amount) || 0;
      totalExpenses += amount;
      if (e.paymentMethod === 'cash') {
        cashExpenses += amount;
      } else {
        cardExpenses += amount;
      }

      const cat = expenseByCategory.hasOwnProperty(e.category) ? e.category : 'other';
      expenseByCategory[cat] += amount;
    });

    const netProfit = grossEarnings - totalExpenses; // Ganancia neta real
    const profitMargin = grossEarnings > 0 ? ((netProfit / grossEarnings) * 100) : 0;
    const expenseRatio = grossEarnings > 0 ? ((totalExpenses / grossEarnings) * 100) : (totalExpenses > 0 ? 100 : 0);

    // Turnos en el período
    let totalInitialCash = shifts.reduce((acc, s) => acc + (Number(s.initialCash) || 0), 0);

    return {
      tripCount,
      cashTripsCount,
      cardTripsCount,
      totalAppFare,
      totalTips,
      grossEarnings,
      avgPerTrip,
      totalExpenses,
      cashExpenses,
      cardExpenses,
      netProfit,
      profitMargin,
      expenseRatio,
      expenseByCategory,
      totalCashInPocket,
      totalCardAppEarnings,
      totalInitialCash
    };
  }

  // Renderizar o actualizar los gráficos
  renderCharts(metrics, data) {
    if (typeof Chart === 'undefined') {
      console.warn('Chart.js no está cargado');
      return;
    }

    this.renderDonutChart(metrics);
    this.renderCategoryChart(metrics);
    this.renderTrendChart(data);
  }

  // Gráfica de Donut: Porcentajes de Ganancia Neta vs Gastos
  renderDonutChart(metrics) {
    const canvas = document.getElementById('chartProfitExpenses');
    if (!canvas) return;

    if (this.donutChart) {
      this.donutChart.destroy();
    }

    const netProfit = Math.max(0, metrics.netProfit);
    const expenses = metrics.totalExpenses;

    const hasData = (netProfit + expenses) > 0;
    const displayData = hasData ? [netProfit, expenses] : [1, 0];
    const displayColors = hasData 
      ? ['#10B981', '#EF4444'] 
      : ['#334155', '#1E293B'];
    const labels = hasData 
      ? [`Ganancia Neta (${metrics.profitMargin.toFixed(1)}%)`, `Gastos (${metrics.expenseRatio.toFixed(1)}%)`] 
      : ['Sin datos', ''];

    const ctx = canvas.getContext('2d');
    this.donutChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: displayData,
          backgroundColor: displayColors,
          borderWidth: 2,
          borderColor: '#1E293B',
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: '#94A3B8',
              font: { family: 'system-ui', size: 12, weight: '500' },
              padding: 14
            }
          },
          tooltip: {
            enabled: hasData,
            callbacks: {
              label: function(context) {
                const val = context.parsed;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const pct = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
                return ` ${context.label}: $${val.toLocaleString()} (${pct}%)`;
              }
            }
          }
        },
        cutout: '72%'
      }
    });

    // Actualizar badges de porcentaje
    const profitPctEl = document.getElementById('reportProfitPercentBadge');
    const expensePctEl = document.getElementById('reportExpensePercentBadge');
    if (profitPctEl) {
      profitPctEl.textContent = `${metrics.profitMargin.toFixed(1)}%`;
      profitPctEl.className = `font-bold text-sm ${metrics.profitMargin >= 50 ? 'text-emerald-400' : 'text-amber-400'}`;
    }
    if (expensePctEl) {
      expensePctEl.textContent = `${metrics.expenseRatio.toFixed(1)}%`;
      expensePctEl.className = `font-bold text-sm ${metrics.expenseRatio <= 40 ? 'text-slate-400' : 'text-rose-400'}`;
    }
  }

  // Gráfica de categorías de gastos
  renderCategoryChart(metrics) {
    const canvas = document.getElementById('chartExpenseCategories');
    if (!canvas) return;

    if (this.expenseCatChart) {
      this.expenseCatChart.destroy();
    }

    const catLabels = {
      gasoline: '⛽ Gasolina',
      food: '🌮 Comida',
      wash: '🧼 Lavado',
      maintenance: '🔧 Taller',
      toll: '🛣️ Peajes',
      phone: '📱 Datos/Tel.',
      didi_fee: '💳 Comisión DiDi',
      other: '📦 Otros'
    };

    const categories = Object.keys(metrics.expenseByCategory);
    const values = categories.map(k => metrics.expenseByCategory[k]);
    const totalSpent = values.reduce((a, b) => a + b, 0);

    const activeCategories = [];
    const activeValues = [];
    const colors = [
      '#F97316', '#3B82F6', '#10B981', '#EC4899', 
      '#8B5CF6', '#EAB308', '#6366F1', '#64748B'
    ];
    const activeColors = [];

    categories.forEach((cat, idx) => {
      if (metrics.expenseByCategory[cat] > 0) {
        activeCategories.push(catLabels[cat] || cat);
        activeValues.push(metrics.expenseByCategory[cat]);
        activeColors.push(colors[idx % colors.length]);
      }
    });

    const ctx = canvas.getContext('2d');

    if (activeValues.length === 0) {
      // Empty state
      this.expenseCatChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['Sin gastos registrados'],
          datasets: [{ data: [1], backgroundColor: ['#334155'], borderWidth: 0 }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: { enabled: false }
          },
          cutout: '75%'
        }
      });
      return;
    }

    this.expenseCatChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: activeCategories,
        datasets: [{
          data: activeValues,
          backgroundColor: activeColors,
          borderWidth: 2,
          borderColor: '#1E293B',
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: '#94A3B8',
              font: { family: 'system-ui', size: 11 },
              boxWidth: 12,
              padding: 10
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const val = context.parsed;
                const pct = totalSpent > 0 ? ((val / totalSpent) * 100).toFixed(1) : 0;
                return ` ${context.label}: $${val.toLocaleString()} (${pct}%)`;
              }
            }
          }
        },
        cutout: '65%'
      }
    });
  }

  // Gráfica de tendencia temporal (Ingresos vs Gastos por día o agrupado)
  renderTrendChart(data) {
    const canvas = document.getElementById('chartTrend');
    if (!canvas) return;

    if (this.barChart) {
      this.barChart.destroy();
    }

    // Agrupar por fecha YYYY-MM-DD
    const dayMap = {};

    // Obtener lista ordenada de días dentro del rango
    let start = new Date(data.startDate);
    let end = new Date(data.endDate);

    if (data.period === 'all') {
      // Para vista 'Todo', graficar los últimos 14 días
      end = new Date();
      start = new Date();
      start.setDate(end.getDate() - 13);
    }

    const cur = new Date(start);
    cur.setHours(0, 0, 0, 0);

    const maxDays = 31;
    let dayCount = 0;
    while (cur <= end && dayCount < maxDays) {
      const key = cur.toISOString().split('T')[0];
      dayMap[key] = {
        label: cur.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' }),
        income: 0,
        expenses: 0
      };
      cur.setDate(cur.getDate() + 1);
      dayCount++;
    }

    // Sumar ingresos
    data.trips.forEach(t => {
      const day = t.timestamp.split('T')[0];
      if (dayMap[day]) {
        dayMap[day].income += (Number(t.appFare) || 0) + (Number(t.tip) || 0);
      }
    });

    // Sumar gastos
    data.expenses.forEach(e => {
      const day = e.timestamp.split('T')[0];
      if (dayMap[day]) {
        dayMap[day].expenses += Number(e.amount) || 0;
      }
    });

    const daysKeys = Object.keys(dayMap);
    const labels = daysKeys.map(k => dayMap[k].label);
    const incomeData = daysKeys.map(k => dayMap[k].income);
    const expenseData = daysKeys.map(k => dayMap[k].expenses);

    const ctx = canvas.getContext('2d');
    this.barChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Ganancias Brutas ($)',
            data: incomeData,
            backgroundColor: '#FF7D00',
            borderRadius: 6,
            maxBarThickness: 32
          },
          {
            label: 'Gastos ($)',
            data: expenseData,
            backgroundColor: '#EF4444',
            borderRadius: 6,
            maxBarThickness: 32
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#94A3B8', font: { size: 11 } }
          },
          y: {
            grid: { color: 'rgba(255, 255, 255, 0.06)' },
            ticks: {
              color: '#94A3B8',
              font: { size: 11 },
              callback: val => '$' + val
            }
          }
        },
        plugins: {
          legend: {
            position: 'top',
            labels: { color: '#94A3B8', font: { size: 12 } }
          },
          tooltip: {
            callbacks: {
              label: context => ` ${context.dataset.label}: $${context.parsed.y.toLocaleString()}`
            }
          }
        }
      }
    });
  }
}

window.reportsService = new ReportsService();
