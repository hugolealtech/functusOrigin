/**
 * ============================================================================
 * FUNCTUS v8.1.1 - INFINITY PROTOCOL & GARBAGE COLLECTOR
 * ============================================================================
 */

const Utils = {
    uuid: () => Date.now().toString(36) + Math.random().toString(36).substr(2),
    formatCurrency: (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val),
    toDate: (str) => new Date(str + 'T12:00:00'),
    addMonths: (date, months) => { const d = new Date(date); d.setMonth(d.getMonth() + months); return d; },
    
    // Função aprimorada para cálculo exato de dias (ignora horas/minutos)
    diffDays: (d1, d2) => {
        const date1 = new Date(d1); date1.setHours(0,0,0,0);
        const date2 = new Date(d2); date2.setHours(0,0,0,0);
        return Math.ceil((date1 - date2) / (1000 * 60 * 60 * 24));
    },
    
    getTodayStr: () => new Date().toISOString().split('T')[0],
    formatMonth: (date) => date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
    formatDate: (dateStr) => {
        if(!dateStr) return 'N/A';
        const d = new Date(dateStr.includes('T') ? dateStr : dateStr + 'T12:00:00');
        if(isNaN(d.getTime())) return 'Data Inválida';
        return d.toLocaleDateString('pt-BR');
    },
    strToColor: (str) => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
        const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
        return '#' + '00000'.substring(0, 6 - c.length) + c;
    },
    isExpired: (expStr) => {
        if(!expStr) return false;
        const [y, m] = expStr.split('-').map(Number);
        const expDate = new Date(y, m, 0); 
        return new Date() > expDate;
    },
    year: () => new Date().getFullYear()
};

/**
 * MÓDULO NOVO: GERENCIADOR DE ARMAZENAMENTO (GARBAGE COLLECTOR)
 * Monitora o peso do localStorage para evitar o erro "QuotaExceededError"
 */
const StorageManager = {
    MAX_SIZE: 4.8 * 1024 * 1024, // Limite de Segurança (~4.8MB, navegadores dão crash em 5MB)
    
    getSize() {
        let total = 0;
        for (let x in localStorage) {
            if (localStorage.hasOwnProperty(x)) {
                total += ((localStorage[x].length + x.length) * 2); // *2 para UTF-16
            }
        }
        return total;
    },

    getPercentage() {
        return (this.getSize() / this.MAX_SIZE) * 100;
    },

    checkHealth() {
        const pct = this.getPercentage();
        const el = document.getElementById('storageMeter');
        const txt = document.getElementById('storageText');
        
        if(el && txt) {
            txt.innerText = pct.toFixed(1) + '%';
            el.className = 'storage-pill'; 
            
            if(pct > 95) {
                el.classList.add('critical');
                if(window.app) window.app.triggerCriticalCleanup(); // Aciona emergência
            } else if (pct > 75) {
                el.classList.add('warning');
            }
        }
    }
};

const Store = {
    DB_KEY: 'functus_v8_infinity', 
    
    data: {
        cards: [], 
        expenses: [],
        categories: [
            "Alimentação", "Mercado", "Água/Luz/Net", "Tributos", 
            "Pets", "Moradia", "Lazer", "Viagens", 
            "Educação", "Filhos", "Saúde", "Streaming", "Escritório",
            "Veículo: Combustível", "Veículo: Manutenção" 
        ],
        beneficiaries: ["Geral", "Hugo", "Lívia", "Helena", "Nina", "Lilica"]
    },

    init() {
        const saved = localStorage.getItem(this.DB_KEY);
        if (saved) {
            this.data = JSON.parse(saved);
        } else {
            // Migração de versões anteriores (V7, V6, etc)
            const oldV7 = localStorage.getItem('functus_v7_finale');
            const oldV6 = localStorage.getItem('functus_v6_diamond');
            
            if(oldV7) { this.data = JSON.parse(oldV7); this.save(); }
            else if(oldV6) { this.data = JSON.parse(oldV6); this.migrateData(); this.save(); }
            else { this.seed(); }
        }
        
        this.checkNewYear();
        StorageManager.checkHealth();
    },

    migrateData() {
        this.data.cards.forEach(c => {
            if (c.active !== undefined) { c.status = c.active ? 'active' : 'sleeping'; delete c.active; }
            if (!c.status) c.status = 'active';
            if (!c.limit) c.limit = 5000;
            if (!c.skin) c.skin = 'skin-black';
        });

        this.data.expenses.forEach(e => {
            if (e.type === 'recorrente') {
                if (e.isVariable === undefined) e.isVariable = false;
                if (!e.pausedPeriods) e.pausedPeriods = []; 
                if (!e.terminationDate) e.terminationDate = null; 
            }
            if (!e.variations) e.variations = {};
        });
    },

    save() {
        try {
            localStorage.setItem(this.DB_KEY, JSON.stringify(this.data));
            localStorage.setItem('functus_last_year', new Date().getFullYear());
            StorageManager.checkHealth();
            if (window.app) window.app.render(); 
        } catch (e) {
            // SE O NAVEGADOR GRITAR "QUOTA EXCEEDED", O GARBAGE COLLECTOR ENTRA EM AÇÃO
            alert("ERRO CRÍTICO: Armazenamento Cheio! O Protocolo Fênix será iniciado para limpar dados antigos.");
            if(window.app) window.app.triggerCriticalCleanup();
        }
    },
    
    checkNewYear() {
        const lastYear = localStorage.getItem('functus_last_year');
        const currentYear = new Date().getFullYear();
        if (lastYear && parseInt(lastYear) < currentYear) {
            setTimeout(() => {
                if(window.app) window.app.showNewYearModal(lastYear);
            }, 1500);
        }
    },

    seed() {
        this.data.cards.push({ 
            id: 'c1', name: 'Infinite Demo', brand: 'Visa', issuer: 'XP', 
            lastDigits: '99', limit: 20000, closingDay: 5, dueDay: 10, 
            status: 'active', skin: 'skin-black', expiration: '2030-12' 
        });
        this.save();
    }
};

const Ledger = {
    getCardLimitStatus(cardId) {
        const card = Store.data.cards.find(c => c.id === cardId);
        if (!card) return { total: 0, used: 0, available: 0 };
        
        let used = 0;
        Store.data.expenses.forEach(exp => {
            if (exp.cardId !== cardId) return;
            if (exp.type === 'recorrente') return; 

            const totalAmount = parseFloat(exp.value);
            const totalInst = parseInt(exp.installments) || 1;
            const parcelValue = totalAmount / totalInst;
            const paidCount = exp.paidPeriods ? exp.paidPeriods.length : 0;
            const remainingValue = totalAmount - (paidCount * parcelValue);
            
            if(remainingValue > 0) used += remainingValue;
        });
        
        const limit = parseFloat(card.limit || 0);
        return { total: limit, used: used, available: limit - used };
    },
    
    getMonthlyLedger(year, month, filterCardId = 'ALL') {
        const targetYM = `${year}-${String(month).padStart(2, '0')}`;
        const items = [];
        let total = 0, totalPaid = 0;
        
        // Data de hoje para comparação de status (Cálculo preciso)
        const today = new Date();
        
        Store.data.expenses.forEach(exp => {
            const expDate = Utils.toDate(exp.date);
            let startOffset = 0;
            let dueDate;
            let cardName = 'Dinheiro/Boleto'; 
            
            if (exp.cardId) {
                const card = Store.data.cards.find(c => c.id === exp.cardId);
                if (card) {
                    cardName = card.name;
                    let purchaseDay = expDate.getDate();
                    if (purchaseDay >= card.closingDay) startOffset = 1;
                    dueDate = new Date(year, month - 1, card.dueDay);
                } else {
                     dueDate = new Date(year, month - 1, expDate.getDate());
                }
            } else {
                dueDate = new Date(year, month - 1, expDate.getDate());
                if(exp.type === 'boleto_parcelado') cardName = "Carnê / Boleto";
            }
            
            let isApplicable = false;
            let note = '';
            const totalInst = parseInt(exp.installments) || 1;
            
            if (exp.type === 'recorrente') {
                if (exp.terminationDate && targetYM > exp.terminationDate) return; 
                if (exp.pausedPeriods && exp.pausedPeriods.includes(targetYM)) return; 

                if (targetYM >= exp.date.substring(0, 7)) { 
                    isApplicable = true; 
                    note = 'Recorrente'; 
                }
            } else {
                const firstParcelDate = Utils.addMonths(expDate, startOffset);
                const diff = (year - firstParcelDate.getFullYear()) * 12 + (month - 1 - firstParcelDate.getMonth());
                
                if (diff >= 0 && diff < totalInst) {
                    isApplicable = true;
                    const currentParcel = diff + 1;
                    note = (exp.type === 'parcelado' || exp.type === 'boleto_parcelado') ? `${currentParcel}/${totalInst}` : 'À Vista';
                }
            }

            if (isApplicable) {
                let matchesFilter = true;
                if(filterCardId !== 'ALL') {
                    if(filterCardId === 'BOLETO') {
                        if(exp.cardId) matchesFilter = false;
                    } else {
                        if(exp.cardId !== filterCardId) matchesFilter = false;
                    }
                }

                if(matchesFilter) {
                    let val = parseFloat(exp.value) / totalInst;
                    let isEstimate = false;

                    if (exp.type === 'recorrente' && exp.isVariable) {
                        if (exp.variations && exp.variations[targetYM]) { 
                            val = parseFloat(exp.variations[targetYM]); 
                        } else { 
                            isEstimate = true; 
                        }
                    }

                    const isPaid = exp.paidPeriods && exp.paidPeriods.includes(targetYM);
                    total += val;
                    if(isPaid) totalPaid += val;
                    
                    // =========================================================
                    // LÓGICA DE CORES E STATUS (REFINADA - v8.1.1)
                    // =========================================================
                    const days = Utils.diffDays(dueDate, today);
                    let status = 'status-safe'; // Padrão VERDE (> 5 dias)
                    
                    if(isPaid) {
                        status = 'status-paid'; // CINZA (Pago)
                    } else if(days <= 2) {
                        status = 'status-danger'; // VERMELHO (<= 2 dias, inclui hoje e vencidos)
                    } else if(days <= 5) {
                        status = 'status-warning'; // AMARELO (Entre 3 e 5 dias)
                    }
                    // Se days > 5, mantém 'status-safe' (VERDE)
                    
                    items.push({ 
                        id: exp.id, 
                        desc: exp.description || "Sem Descrição", 
                        val, note, dueDate, status, isPaid, targetYM, cardName, 
                        cat: exp.category, ben: exp.beneficiary, 
                        type: exp.type,
                        cardId: exp.cardId,
                        isVariable: exp.isVariable, isEstimate: isEstimate
                    });
                }
            }
        });
        
        items.sort((a,b) => a.dueDate - b.dueDate);
        return { items, total, totalPaid, totalDue: total - totalPaid };
    },
    
    getDebtEndDate(exp) {
        if (!exp || !exp.date) return 'Data Inválida';
        if (exp.type === 'recorrente') return 'Indeterminado';
        if (exp.type === 'avista' || exp.type === 'cartao_avista') return Utils.formatDate(exp.date);
        
        const total = parseInt(exp.installments);
        const endDate = Utils.addMonths(Utils.toDate(exp.date), total);
        
        if (isNaN(endDate.getTime())) return 'Data Inválida';
        return endDate;
    }
};

const App = {
    tab: 'dashboard',
    dashDate: new Date(),
    plannerFilter: 'ALL', 
    charts: {},
    importedItems: [], // Temporary storage for import

    init() { 
        Store.init(); 
        this.loadTheme();
        this.checkBackupStatus();
        this.render(); 
    },

    toggleTheme() {
        const body = document.body;
        const current = body.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        body.setAttribute('data-theme', next);
        localStorage.setItem('functus_theme', next);
        this.updateThemeIcon(next);
        this.render();
    },
    loadTheme() {
        const saved = localStorage.getItem('functus_theme') || 'light';
        document.body.setAttribute('data-theme', saved);
        this.updateThemeIcon(saved);
    },
    updateThemeIcon(theme) {
        const icon = document.getElementById('themeIcon');
        if(icon) { icon.className = theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon'; }
    },

    checkBackupStatus() {
        const lastBackup = localStorage.getItem('functus_last_backup');
        const btn = document.getElementById('btnBackup');
        if(!btn) return;
        if (!lastBackup) { btn.classList.add('btn-danger-pulse'); return; }
        const days = Utils.diffDays(new Date(), new Date(parseInt(lastBackup)));
        if (days > 15) {
            btn.classList.remove('btn-ghost'); btn.classList.add('btn-danger-pulse');
            btn.title = `Último backup há ${days} dias!`;
        } else {
            btn.classList.remove('btn-danger-pulse'); btn.classList.add('btn-ghost');
        }
    },

    switchTab(t) { 
        this.tab = t; 
        this.plannerFilter = 'ALL'; 
        document.querySelectorAll('.nav-tab').forEach(el => el.classList.remove('active'));
        const activeTab = document.querySelector(`.nav-tab[onclick="app.switchTab('${t}')"]`);
        if(activeTab) activeTab.classList.add('active');
        this.render(); 
    },

    render() {
        const main = document.getElementById('main-content');
        if(!main) return;
        main.innerHTML = '';
        if(this.tab === 'dashboard') this.renderDashboard(main);
        if(this.tab === 'planner') this.renderPlanner(main);
        if(this.tab === 'entries') this.renderEntries(main);
        if(this.tab === 'cards') this.renderCards(main);
    },

    renderDashboard(el) {
        const activeCards = Store.data.cards.filter(c => c.status === 'active' && !Utils.isExpired(c.expiration));
        const limitHtml = activeCards.map(c => {
            const status = Ledger.getCardLimitStatus(c.id);
            const pct = status.total > 0 ? Math.min(100, (status.used / status.total) * 100) : 0;
            let color = '#10b981'; if(pct > 50) color = '#f59e0b'; if(pct > 85) color = '#ef4444'; 
            return `
            <div style="margin-bottom:15px;">
                <div class="limit-info" style="display:flex; justify-content:space-between; margin-bottom:5px; font-size:0.8rem">
                    <span>${c.name}</span><span>${Math.round(pct)}%</span>
                </div>
                <div class="progress-track">
                    <div class="progress-fill" style="width:${pct}%; background:${color}"></div>
                </div>
            </div>`;
        }).join('');

        const d = this.dashDate;
        const curr = Ledger.getMonthlyLedger(d.getFullYear(), d.getMonth()+1);
        const prev = Ledger.getMonthlyLedger(Utils.addMonths(d, -1).getFullYear(), Utils.addMonths(d, -1).getMonth()+1);
        const diff = curr.total - prev.total;

        el.innerHTML = `
            <div class="row">
                <div class="col" style="flex:2">
                    <div class="glass-panel">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px">
                            <button class="btn btn-ghost" onclick="app.navMonth(-1)"><i class="fa-solid fa-chevron-left"></i></button>
                            <div style="text-align:center">
                                <h2 style="margin:0">${Utils.formatMonth(d)}</h2>
                                <small style="color:${diff > 0 ? 'var(--danger)' : 'var(--success)'}">
                                    ${diff > 0 ? '+' : ''}${Utils.formatCurrency(diff)} vs mês anterior
                                </small>
                            </div>
                            <button class="btn btn-ghost" onclick="app.navMonth(1)"><i class="fa-solid fa-chevron-right"></i></button>
                        </div>
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; text-align:center">
                            <div style="padding:15px; border:1px solid var(--glass-border); border-radius:10px;">
                                <div style="font-size:0.8rem; color:var(--text-light)">TOTAL</div>
                                <div style="font-size:1.5rem; font-weight:800; color:var(--primary)">${Utils.formatCurrency(curr.total)}</div>
                            </div>
                            <div style="padding:15px; border:1px solid var(--glass-border); border-radius:10px;">
                                <div style="font-size:0.8rem; color:var(--text-light)">ABERTO</div>
                                <div style="font-size:1.5rem; font-weight:800; color:var(--danger)">${Utils.formatCurrency(curr.totalDue)}</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="row">
                        <div class="col">
                            <div class="glass-panel">
                                <h3>Gastos Menores (<= R$100)</h3>
                                <canvas id="chartNominal" style="max-height:250px"></canvas>
                            </div>
                        </div>
                        <div class="col">
                            <div class="glass-panel">
                                <h3>Gastos Maiores (> R$100)</h3>
                                <canvas id="chartMajor" style="max-height:250px"></canvas>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="col" style="flex:1">
                    <div class="glass-panel">
                        <h3>Limites (Ativos)</h3>
                        ${limitHtml || '<p style="color:var(--text-light)">Sem cartões ativos.</p>'}
                    </div>
                     <div class="glass-panel">
                        <h3>Por Categoria</h3>
                        <canvas id="chartCat" style="max-height:200px"></canvas>
                        <div id="catLegend" class="chart-legend-grid"></div>
                    </div>
                </div>
            </div>
            
            <div class="row">
                <div class="col">
                     <div class="glass-panel">
                        <h3>Ranking Familiar (Quem gasta mais?)</h3>
                        <canvas id="chartBen" style="max-height:200px"></canvas>
                    </div>
                </div>
            </div>`;
        
        setTimeout(() => {
            if (this.charts['cat']) this.charts['cat'].destroy();
            if (this.charts['nom']) this.charts['nom'].destroy();
            if (this.charts['maj']) this.charts['maj'].destroy();
            if (this.charts['ben']) this.charts['ben'].destroy();

            const cats = {}; 
            const bens = {};

            curr.items.forEach(i => {
                cats[i.cat] = (cats[i.cat] || 0) + i.val;
                bens[i.ben] = (bens[i.ben] || 0) + i.val;
            });
            
            // Pie Chart (Categorias)
            const totalVal = Object.values(cats).reduce((a, b) => a + b, 0);
            const ctxCat = document.getElementById('chartCat');
            if(ctxCat) {
                 this.charts['cat'] = new Chart(ctxCat, { 
                     type: 'doughnut', 
                     data: { labels: Object.keys(cats), datasets: [{ data: Object.values(cats), backgroundColor: Object.keys(cats).map(c => Utils.strToColor(c)) }] }, 
                     options: { 
                         plugins: { 
                             legend: { display: false },
                             tooltip: {
                                 callbacks: {
                                     label: function(context) {
                                         let label = context.label || '';
                                         let value = context.raw || 0;
                                         let percentage = totalVal > 0 ? ((value / totalVal) * 100).toFixed(1) + '%' : '0%';
                                         return label + ': ' + Utils.formatCurrency(value) + ' (' + percentage + ')';
                                     }
                                 }
                             }
                         } 
                     } 
                 });
                 const legendContainer = document.getElementById('catLegend');
                 let legendHtml = '';
                 Object.keys(cats).forEach(cat => { 
                     const val = cats[cat];
                     const pct = totalVal > 0 ? ((val / totalVal) * 100).toFixed(1) : 0;
                     legendHtml += `
                        <div class="legend-item" style="justify-content:space-between">
                            <div style="display:flex; align-items:center; gap:6px">
                                <div class="legend-color" style="background:${Utils.strToColor(cat)}"></div>
                                <span>${cat}</span>
                            </div>
                            <span style="font-weight:bold; font-size:0.7rem; color:var(--text-light)">${pct}%</span>
                        </div>`; 
                 });
                 legendContainer.innerHTML = legendHtml;
            }

            // FILTER: Items <= 100 Reais
            const smallItems = curr.items.filter(i => i.val <= 100).sort((a,b) => b.val - a.val).slice(0, 10);
            const largeItems = curr.items.filter(i => i.val > 100).sort((a,b) => b.val - a.val).slice(0, 10);

            const isDark = document.body.getAttribute('data-theme') === 'dark';
            const textColor = isDark ? '#94a3b8' : '#64748b';
            
            const ctxNom = document.getElementById('chartNominal');
            if(ctxNom) {
                this.charts['nom'] = new Chart(ctxNom, { 
                    type: 'bar', 
                    data: { labels: smallItems.map(i => i.desc.substring(0, 15)), datasets: [{ label: 'Valor', data: smallItems.map(i => i.val), backgroundColor: smallItems.map(i => Utils.strToColor(i.cat)), borderRadius: 5 }] }, 
                    options: { indexAxis: 'y', responsive: true, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: textColor } }, y: { ticks: { color: textColor } } } } 
                });
            }

            const ctxMaj = document.getElementById('chartMajor');
            if(ctxMaj) {
                this.charts['maj'] = new Chart(ctxMaj, { 
                    type: 'bar', 
                    data: { labels: largeItems.map(i => i.desc.substring(0, 15)), datasets: [{ label: 'Valor', data: largeItems.map(i => i.val), backgroundColor: largeItems.map(i => Utils.strToColor(i.cat)), borderRadius: 5 }] }, 
                    options: { indexAxis: 'y', responsive: true, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: textColor } }, y: { ticks: { color: textColor } } } } 
                });
            }

            // NEW: Beneficiaries Chart
            const sortedBens = Object.entries(bens).sort((a,b) => b[1] - a[1]);
            const ctxBen = document.getElementById('chartBen');
            if(ctxBen) {
                this.charts['ben'] = new Chart(ctxBen, {
                    type: 'bar',
                    data: { 
                        labels: sortedBens.map(b => b[0]), 
                        datasets: [{ 
                            label: 'Gasto Total', 
                            data: sortedBens.map(b => b[1]), 
                            backgroundColor: sortedBens.map(b => Utils.strToColor(b[0])),
                            borderRadius: 6
                        }] 
                    },
                    options: { responsive: true, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: textColor } }, y: { ticks: { color: textColor } } } }
                });
            }

        }, 100);
    },

    renderEntries(el) {
        const validCards = Store.data.cards.filter(c => c.status === 'active' && !Utils.isExpired(c.expiration));
        let cardOptions = validCards.length === 0 ? '<option value="">Sem cartões válidos!</option>' : validCards.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        
        el.innerHTML = `
            <div class="glass-panel" style="max-width:800px; margin:0 auto">
                <h3>Novo Lançamento</h3>
                
                <label>Atalhos Rápidos:</label>
                <div class="quick-tags">
                    <div class="tag-chip" onclick="app.quickFill('Energia Elétrica', 'Água/Luz/Net')"><i class="fa-solid fa-bolt"></i> Luz</div>
                    <div class="tag-chip" onclick="app.quickFill('Abastecimento', 'Veículo: Combustível', 'avista')"><i class="fa-solid fa-gas-pump"></i> Combustível</div>
                    <div class="tag-chip" onclick="app.quickFill('Internet', 'Água/Luz/Net')"><i class="fa-solid fa-wifi"></i> Internet</div>
                    <div class="tag-chip" onclick="app.quickFill('Netflix', 'Streaming', 'recorrente')"><i class="fa-brands fa-netflix"></i> Netflix</div>
                    <div class="tag-chip" onclick="app.quickFill('Manutenção', 'Veículo: Manutenção', 'avista')"><i class="fa-solid fa-wrench"></i> Manutenção</div>
                </div>

                <form id="entryForm" onsubmit="app.addExpense(event)">
                    <div class="row">
                        <div class="col"><label>Descrição</label><input type="text" name="desc" required></div>
                        <div class="col"><label>Valor</label><input type="number" step="0.01" name="value" required></div>
                    </div>
                    <div class="row">
                        <div class="col">
                            <label>Categoria</label>
                            <select name="category">${Store.data.categories.map(c => `<option>${c}</option>`).join('')}</select>
                        </div>
                        <div class="col">
                            <label>Beneficiário</label>
                            <select name="beneficiary">${Store.data.beneficiaries.map(b => `<option>${b}</option>`).join('')}</select>
                        </div>
                    </div>
                    <div class="row">
                        <div class="col">
                            <label>Tipo</label>
                            <select name="type" onchange="app.toggleType(this.value)">
                                <option value="avista">À vista / Pix</option>
                                <option value="cartao_avista">Cartão (1x)</option>
                                <option value="parcelado">Parcelado (Cartão)</option>
                                <option value="boleto_parcelado">Carnê / Boleto Parcelado</option>
                                <option value="recorrente">Recorrente / Assinatura</option>
                            </select>
                        </div>
                        <div class="col hidden" id="card-select-group">
                            <label>Cartão (Opcional para Recorrente)</label>
                            <select name="cardId">
                                <option value="">-- Sem Cartão (Débito/Boleto) --</option>
                                ${validCards.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                    <div class="row hidden" id="install-group">
                        <div class="col"><label>Parcelas</label><input type="number" name="inst" value="1"></div>
                    </div>
                    <div class="row hidden" id="variable-group">
                        <div class="col">
                            <div class="checkbox-wrapper">
                                <input type="checkbox" name="isVariable">
                                <span>Valor Variável (Luz/Água)</span>
                            </div>
                        </div>
                    </div>
                    <div class="form-group">
                        <label id="dateLabel">Data da Compra</label>
                        <input type="date" name="date" value="${Utils.getTodayStr()}" required>
                    </div>
                    <button type="submit" class="btn btn-primary" style="width:100%">Salvar</button>
                </form>
            </div>`;
    },

    quickFill(desc, cat, typeOverride = 'recorrente') {
        const f = document.getElementById('entryForm');
        f.desc.value = desc; 
        f.category.value = cat; 
        f.type.value = typeOverride;
        this.toggleType(typeOverride); 
        if(typeOverride === 'recorrente') f.isVariable.checked = true;
        
        f.desc.style.borderColor = 'var(--primary)';
        setTimeout(() => f.desc.style.borderColor = 'var(--glass-border)', 500);
    },

    renderCards(el) {
        el.innerHTML = `
            <div class="glass-panel">
                <div style="display:flex; justify-content:space-between; align-items:center; cursor:pointer" onclick="document.getElementById('newCardForm').classList.toggle('hidden')">
                    <h3><i class="fa-solid fa-plus-circle"></i> Gerenciar Cartões</h3><i class="fa-solid fa-chevron-down"></i>
                </div>
                <form id="newCardForm" class="hidden" onsubmit="app.saveCard(event)" style="margin-top:20px">
                    <input type="hidden" name="cardId">
                    <div class="row">
                        <div class="col"><label>Nome</label><input name="name" required></div>
                        <div class="col"><label>Limite</label><input type="number" name="limit" required></div>
                    </div>
                    <div class="row">
                        <div class="col"><label>Fecha</label><input type="number" name="closing" required></div>
                        <div class="col"><label>Vence</label><input type="number" name="due" required></div>
                        <div class="col">
                            <label>Skin</label>
                            <select name="skin">
                                <option value="skin-black">Black</option>
                                <option value="skin-blue">Azul</option>
                                <option value="skin-gold">Gold</option>
                                <option value="skin-purple">Roxo</option>
                                <option value="skin-platinum">Platinum (Novo)</option>
                            </select>
                        </div>
                        <div class="col"><label>Final (4 Dígitos)</label><input name="last" maxlength="4" placeholder="Ex: 9876" required></div>
                    </div>
                    <button class="btn btn-primary" style="margin-top:10px">Salvar</button>
                </form>
            </div>
            <div class="row">
                ${Store.data.cards.map(c => `
                    <div class="col" style="flex:0 0 320px">
                        <div class="credit-card-v3 ${c.skin || 'skin-black'}" style="${c.status === 'sleeping' ? 'filter:grayscale(1); opacity:0.6' : ''}">
                            <div class="card-status-badge">${c.status === 'active' ? 'ATIVO' : 'INATIVO'}</div>
                            <div class="card-chip"></div>
                            <div class="card-contactless"><i class="fa-solid fa-wifi"></i></div>
                            <div>
                                <div style="font-size:0.9rem; letter-spacing:1px; text-transform:uppercase">${c.issuer || 'Banco'}</div>
                                <div style="font-weight:bold; font-size:1.1rem; font-style:italic">${c.brand || 'Card'}</div>
                            </div>
                            <div class="card-number">•••• •••• •••• ${c.lastDigits || '0000'}</div>
                            <div class="card-meta">
                                <div style="display:flex; justify-content:space-between; align-items:flex-end">
                                    <div>
                                        <div class="card-meta-label">TITULAR</div>
                                        <div class="card-holder">${c.name}</div>
                                    </div>
                                    <div style="text-align:right">
                                        <div class="card-meta-label">LIMITE</div>
                                        <div>${Utils.formatCurrency(c.limit)}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div style="text-align:center; margin-top:15px; display:flex; gap:10px; justify-content:center">
                            <button class="btn btn-ghost" onclick="app.editCard('${c.id}')">Editar</button>
                            <button class="btn btn-ghost" onclick="app.toggleCardStatus('${c.id}')">${c.status === 'active' ? 'Adormecer' : 'Ativar'}</button>
                            <button class="btn btn-ghost" onclick="app.openMigrationModal('${c.id}')" title="Migrar Dívida (Perda/Roubo)"><i class="fa-solid fa-arrow-right-arrow-left"></i></button>
                            <button class="btn btn-ghost" onclick="app.cancelCard('${c.id}')" style="color:var(--danger)" title="Cancelar e Acelerar Faturas"><i class="fa-solid fa-ban"></i></button>
                        </div>
                    </div>`).join('')}
            </div>`;
    },

    renderPlanner(el) {
        const d = this.dashDate;
        const activeCards = Store.data.cards.filter(c => c.status === 'active' && !Utils.isExpired(c.expiration));
        
        // 1. CARROSSEL DE CARTÕES
        const cardHtml = activeCards.map(c => {
            const ledger = Ledger.getMonthlyLedger(d.getFullYear(), d.getMonth()+1, c.id);
            const isOpen = ledger.totalDue > 0;
            return `
            <div class="planner-card-container">
                <div class="credit-card-v3 ${c.skin || 'skin-black'}" style="height:160px; padding:20px; box-shadow:0 5px 15px rgba(0,0,0,0.2)">
                     <div class="card-status-badge">FATURA ${Utils.formatMonth(d)}</div>
                     <div class="card-chip" style="transform:scale(0.8); margin:0"></div>
                     <div>
                        <div style="font-size:0.8rem">${c.name}</div>
                        <div style="font-size:1.2rem; font-weight:bold">${Utils.formatCurrency(ledger.totalDue)}</div>
                     </div>
                     <div style="font-size:0.8rem; text-align:right">Vence dia ${c.dueDay}</div>
                </div>
                <div class="planner-card-actions">
                    <button class="btn btn-success btn-sm" onclick="app.batchPay('TOTAL', '${c.id}', '${ledger.items.length > 0 ? ledger.items[0].targetYM : ''}')">Pagar Total</button>
                    <button class="btn btn-info btn-sm" onclick="app.setPlannerFilter('${c.id}')">Pagar Parcial</button>
                </div>
            </div>`;
        }).join('');

        // 2. CARTÃO VIRTUAL "BOLETOS"
        const boletoLedger = Ledger.getMonthlyLedger(d.getFullYear(), d.getMonth()+1, 'BOLETO');
        const boletoHtml = `
            <div class="planner-card-container">
                <div class="credit-card-v3 skin-boleto" style="height:160px; padding:20px; box-shadow:0 5px 15px rgba(0,0,0,0.2)">
                     <div class="card-status-badge">CONTAS & BOLETOS</div>
                     <div style="font-size:2rem; opacity:0.7"><i class="fa-solid fa-barcode"></i></div>
                     <div>
                        <div style="font-size:0.8rem">Água, Luz, Aluguel</div>
                        <div style="font-size:1.2rem; font-weight:bold">${Utils.formatCurrency(boletoLedger.totalDue)}</div>
                     </div>
                     <div style="font-size:0.8rem; text-align:right">Mês: ${Utils.formatMonth(d)}</div>
                </div>
                <div class="planner-card-actions">
                    <button class="btn btn-gold btn-sm" onclick="app.batchPay('BOLETO', 'BOLETO', '${boletoLedger.items.length > 0 ? boletoLedger.items[0].targetYM : ''}')">Quitar Boletos</button>
                    <button class="btn btn-info btn-sm" onclick="app.setPlannerFilter('BOLETO')">Ver Lista</button>
                </div>
            </div>`;
        
        // 3. CARTÃO "PAGAR TUDO"
        const totalLedger = Ledger.getMonthlyLedger(d.getFullYear(), d.getMonth()+1, 'ALL');
        const totalHtml = `
             <div class="planner-card-container">
                <div class="credit-card-v3 skin-black" style="height:160px; padding:20px; box-shadow:0 5px 15px rgba(0,0,0,0.2); background: linear-gradient(135deg, #000 0%, #333 100%); border:1px solid #444">
                     <div class="card-status-badge" style="background:var(--success)">TOTAL MENSAL</div>
                     <div style="font-size:2rem; color:var(--success)"><i class="fa-solid fa-check-double"></i></div>
                     <div>
                        <div style="font-size:0.8rem">Todas as Contas</div>
                        <div style="font-size:1.2rem; font-weight:bold">${Utils.formatCurrency(totalLedger.totalDue)}</div>
                     </div>
                     <div style="font-size:0.8rem; text-align:right">Mês: ${Utils.formatMonth(d)}</div>
                </div>
                <div class="planner-card-actions">
                    <button class="btn btn-dark btn-sm" onclick="app.payAllMonth()">Pagar Mês Inteiro</button>
                </div>
            </div>`;

        // LISTA FILTRADA
        const filteredLedger = Ledger.getMonthlyLedger(d.getFullYear(), d.getMonth()+1, this.plannerFilter);

        el.innerHTML = `
            <div class="glass-panel" style="padding:10px; background:rgba(0,0,0,0.02)">
                <div class="planner-header">
                    <div class="cards-scroll-wrapper">
                        ${cardHtml}
                        ${boletoHtml}
                        ${totalHtml}
                    </div>
                </div>
            </div>

            <div class="glass-panel">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px">
                     <button class="btn btn-ghost" onclick="app.navMonth(-1)"><i class="fa-solid fa-chevron-left"></i></button>
                     <div style="text-align:center">
                        <h3>${Utils.formatMonth(d)}</h3>
                        <small style="color:var(--text-light)">Exibindo: ${this.plannerFilter === 'ALL' ? 'Tudo' : (this.plannerFilter === 'BOLETO' ? 'Boletos' : 'Cartão Selecionado')}</small>
                        ${this.plannerFilter !== 'ALL' ? `<br><button class="btn btn-ghost btn-sm" onclick="app.setPlannerFilter('ALL')">Ver Tudo</button>` : ''}
                     </div>
                     <button class="btn btn-ghost" onclick="app.navMonth(1)"><i class="fa-solid fa-chevron-right"></i></button>
                </div>
                <div>
                    ${filteredLedger.items.map(i => {
                        let actionBtn = i.isPaid ? 
                            `<button class="btn btn-ghost" onclick="app.togglePay('${i.id}', '${i.targetYM}')">Desfazer</button>` : 
                            (i.isEstimate ? `<button class="btn btn-info" onclick="app.confirmValue('${i.id}', '${i.targetYM}', ${i.val})">Definir</button>` : `<button class="btn btn-success" onclick="app.togglePay('${i.id}', '${i.targetYM}')">Pagar</button>`);
                        
                        let manageBtn = '';
                        if(i.type === 'recorrente') {
                            manageBtn = `<button class="btn btn-ghost" onclick="app.manageSubscription('${i.id}', '${i.targetYM}')" title="Gerenciar Assinatura"><i class="fa-solid fa-gear"></i></button>`;
                        }

                        return `
                        <div class="planner-item ${i.status}">
                            <div>
                                <div style="font-weight:700">
                                    ${i.desc} 
                                    <span class="badge-v3" style="background:var(--secondary)">${i.note}</span>
                                </div>
                                <small>${i.cat} • ${i.cardName} • Dia ${i.dueDate.getDate()}</small>
                            </div>
                            <div style="text-align:right; display:flex; gap:5px; align-items:center;">
                                <div style="font-weight:700; margin-right:10px">${i.isEstimate ? '~' : ''}${Utils.formatCurrency(i.val)}</div>
                                ${manageBtn}
                                ${actionBtn}
                            </div>
                        </div>`;
                    }).join('') || '<p style="text-align:center; color:var(--text-light)">Nada aqui.</p>'}
                </div>
            </div>`;
    },

    toggleType(val) {
        const isCard = val.includes('cartao') || val === 'parcelado'; 
        const isRecurrent = val === 'recorrente';
        const isInstallment = val === 'parcelado' || val === 'boleto_parcelado';
        const showCardGroup = isCard || isRecurrent; 

        document.getElementById('card-select-group').classList.toggle('hidden', !showCardGroup);
        document.getElementById('install-group').classList.toggle('hidden', !isInstallment);
        document.getElementById('variable-group').classList.toggle('hidden', !isRecurrent);
        
        const dateLabel = document.getElementById('dateLabel');
        if (isRecurrent) {
            dateLabel.innerText = "Dia de Cobrança (ou Vencimento)";
        } else if (val === 'boleto_parcelado') {
            dateLabel.innerText = "Data do 1º Vencimento";
        } else {
            dateLabel.innerText = "Data da Compra";
        }
    },
    
    addExpense(e) {
        e.preventDefault(); const f = e.target;
        const type = f.type.value;
        const cardId = f.cardId.value;
        if((type.includes('cartao') || type === 'parcelado') && !cardId) return alert("Selecione um cartão para este tipo de compra!");

        Store.data.expenses.push({ 
            id: Utils.uuid(), 
            description: f.desc.value, 
            value: f.value.value, 
            type, 
            category: f.category.value, 
            beneficiary: f.beneficiary.value, 
            date: f.date.value, 
            installments: f.inst ? f.inst.value : 1, 
            cardId: cardId || null, 
            paidPeriods: [],
            pausedPeriods: [],
            terminationDate: null,
            isVariable: f.isVariable ? f.isVariable.checked : false, 
            variations: {} 
        });
        Store.save(); alert("Salvo!"); f.reset(); this.render();
    },

    saveCard(e) {
        e.preventDefault(); const f = e.target; const id = f.cardId.value;
        if(id) {
            const c = Store.data.cards.find(x => x.id === id);
            if(c) { 
                c.name = f.name.value; c.limit = f.limit.value; c.closingDay = f.closing.value; c.dueDay = f.due.value; c.skin = f.skin.value; 
                c.lastDigits = f.last.value; 
            }
        } else {
            Store.data.cards.push({ id: Utils.uuid(), name: f.name.value, limit: f.limit.value, closingDay: f.closing.value, dueDay: f.due.value, skin: f.skin.value, status: 'active', lastDigits: f.last.value || '0000' });
        }
        Store.save(); f.reset(); f.classList.add('hidden'); this.render();
    },

    editCard(id) {
        const c = Store.data.cards.find(x => x.id === id); if(!c) return;
        const f = document.getElementById('newCardForm'); 
        f.classList.remove('hidden');
        f.cardId.value = c.id; f.name.value = c.name; f.limit.value = c.limit; f.closing.value = c.closingDay; f.due.value = c.dueDay; f.skin.value = c.skin;
        f.last.value = c.lastDigits; 
        f.scrollIntoView({behavior: 'smooth'});
    },

    toggleCardStatus(id) {
        const c = Store.data.cards.find(x => x.id === id);
        if(c) { c.status = c.status === 'active' ? 'sleeping' : 'active'; Store.save(); }
    },
    
    cancelCard(id) {
        const card = Store.data.cards.find(x => x.id === id);
        if(!card) return;
        if(!confirm(`Tem certeza que deseja cancelar o cartão ${card.name}?`)) return;
        const accelerate = confirm("Deseja ANTECIPAR todas as faturas futuras para hoje?");
        card.status = 'cancelled';
        if (accelerate) {
            let totalAntecipado = 0; const today = Utils.getTodayStr();
            Store.data.expenses.forEach(exp => {
                if (exp.cardId === id && exp.type === 'parcelado') {
                    const totalInst = parseInt(exp.installments);
                    const paidCount = exp.paidPeriods ? exp.paidPeriods.length : 0;
                    if (paidCount < totalInst) {
                        const parcelValue = parseFloat(exp.value) / totalInst;
                        const remainingInst = totalInst - paidCount;
                        totalAntecipado += parcelValue * remainingInst;
                        exp.description += " (Antecipado)";
                        exp.installments = paidCount; 
                    }
                }
            });
            if (totalAntecipado > 0) {
                Store.data.expenses.push({ id: Utils.uuid(), description: `Antecipação: ${card.name}`, value: totalAntecipado.toFixed(2), type: 'avista', category: 'Tributos', beneficiary: 'Banco', date: today, installments: 1, cardId: null, paidPeriods: [], isVariable: false });
                alert(`Cancelado e ${Utils.formatCurrency(totalAntecipado)} antecipados.`);
            }
        }
        Store.save();
    },

    /* =================================================================
     * MÓDULO: MIGRAÇÃO DE DÍVIDAS (PERDA/ROUBO/NOVO CARTÃO)
     * =================================================================
     */
    openMigrationModal(id) {
        const c = Store.data.cards.find(x => x.id === id);
        const others = Store.data.cards.filter(x => x.id !== id && x.status === 'active');
        if(!others.length) return alert("Você precisa de outro cartão ativo para migrar a dívida!");

        const modalHTML = `
        <div class="modal-overlay" id="migModal">
            <div class="modal-content">
                <h3><i class="fa-solid fa-right-left"></i> Migrar Dívida / Perda de Cartão</h3>
                <p>Transferir todas as compras pendentes de <strong>${c.name}</strong> para:</p>
                <select id="targetCardId" style="margin-bottom:15px">
                    ${others.map(o => `<option value="${o.id}">${o.name}</option>`).join('')}
                </select>
                <div style="margin-bottom:15px; background:rgba(255,0,0,0.1); padding:10px; border-radius:8px; font-size:0.9rem">
                    <input type="checkbox" id="archiveOld" checked>
                    <label for="archiveOld">Arquivar cartão antigo (${c.name}) após migração?</label>
                </div>
                <button class="btn btn-primary" style="width:100%" onclick="app.executeMigration('${id}')">Confirmar Migração</button>
                <button class="btn btn-ghost" style="width:100%; margin-top:5px" onclick="document.getElementById('migModal').remove()">Cancelar</button>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    },

    executeMigration(oldId) {
        const newId = document.getElementById('targetCardId').value;
        const archive = document.getElementById('archiveOld').checked;
        if(!newId) return;

        let count = 0;
        Store.data.expenses.forEach(e => {
            if(e.cardId === oldId) {
                e.cardId = newId;
                count++;
            }
        });

        if(archive) {
            const old = Store.data.cards.find(c => c.id === oldId);
            if(old) old.status = 'cancelled';
        }

        Store.save();
        document.getElementById('migModal').remove();
        alert(`${count} lançamentos transferidos com sucesso!`);
        this.render();
    },

    manageSubscription(id, ym) {
        const exp = Store.data.expenses.find(e => e.id === id);
        if (!exp) return;
        const modalHTML = `
        <div class="modal-overlay" onclick="this.remove()">
            <div class="modal-content" onclick="event.stopPropagation()">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px">
                    <h2 style="margin:0">Gerenciar Assinatura</h2>
                    <button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">X</button>
                </div>
                <div style="margin-bottom:20px">
                    <strong>${exp.description}</strong><br>
                    <small>Mês Referência: ${ym}</small>
                </div>
                <div style="display:grid; gap:10px">
                    <button class="btn btn-info" onclick="app.pauseSubscription('${id}', '${ym}', this)"><i class="fa-solid fa-pause"></i> Pular/Pausar este mês</button>
                    <button class="btn btn-danger-pulse" onclick="app.cancelSubscription('${id}', '${ym}', this)"><i class="fa-solid fa-ban"></i> Cancelar Assinatura</button>
                </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    },

    pauseSubscription(id, ym, btnEl) {
        const exp = Store.data.expenses.find(e => e.id === id);
        if(!exp.pausedPeriods) exp.pausedPeriods = [];
        if (confirm(`Pular ${ym}?`)) { exp.pausedPeriods.push(ym); Store.save(); btnEl.closest('.modal-overlay').remove(); }
    },

    cancelSubscription(id, ym, btnEl) {
        const exp = Store.data.expenses.find(e => e.id === id);
        const [y, m] = ym.split('-').map(Number);
        const date = new Date(y, m - 1, 1); date.setMonth(date.getMonth() - 1); 
        const prevYM = date.toISOString().slice(0, 7); 
        if (confirm(`Cancelar assinatura?`)) { exp.terminationDate = prevYM; Store.save(); btnEl.closest('.modal-overlay').remove(); }
    },

    togglePay(id, ym) {
        const exp = Store.data.expenses.find(e => e.id === id); 
        if(!exp.paidPeriods) exp.paidPeriods = [];
        if(exp.paidPeriods.includes(ym)) { exp.paidPeriods = exp.paidPeriods.filter(x => x !== ym); } 
        else { exp.paidPeriods.push(ym); }
        Store.save();
    },

    setPlannerFilter(filterId) { this.plannerFilter = filterId; this.render(); },

    batchPay(type, cardId, targetYM) {
        if (!targetYM) return alert("Nada pendente.");
        let ledger;
        if (type === 'TOTAL') ledger = Ledger.getMonthlyLedger(this.dashDate.getFullYear(), this.dashDate.getMonth()+1, cardId);
        else if (type === 'BOLETO') ledger = Ledger.getMonthlyLedger(this.dashDate.getFullYear(), this.dashDate.getMonth()+1, 'BOLETO');
        
        if(!confirm("Pagar todos estes itens?")) return;
        ledger.items.forEach(item => {
            if (!item.isPaid) {
                const exp = Store.data.expenses.find(e => e.id === item.id);
                if (exp) { if(!exp.paidPeriods) exp.paidPeriods = []; if(!exp.paidPeriods.includes(item.targetYM)) exp.paidPeriods.push(item.targetYM); }
            }
        });
        Store.save();
    },

    payAllMonth() {
        if(!confirm("Pagar o MÊS INTEIRO?")) return;
        const ledger = Ledger.getMonthlyLedger(this.dashDate.getFullYear(), this.dashDate.getMonth()+1, 'ALL');
        ledger.items.forEach(item => {
            if (!item.isPaid) {
                const exp = Store.data.expenses.find(e => e.id === item.id);
                if(exp) { if(!exp.paidPeriods) exp.paidPeriods = []; if(!exp.paidPeriods.includes(item.targetYM)) exp.paidPeriods.push(item.targetYM); }
            }
        });
        Store.save();
    },

    confirmValue(id, ym, currentVal) {
        const newVal = prompt(`Valor exato?`, currentVal);
        if (newVal) {
            const exp = Store.data.expenses.find(e => e.id === id);
            if(exp) { if(!exp.variations) exp.variations = {}; exp.variations[ym] = parseFloat(newVal.replace(',', '.')); if(!exp.paidPeriods) exp.paidPeriods = []; if(!exp.paidPeriods.includes(ym)) exp.paidPeriods.push(ym); Store.save(); }
        }
    },

    navMonth(dir) { this.dashDate = Utils.addMonths(this.dashDate, dir); this.render(); },
    
    showDebtProjection() {
        const debts = Store.data.expenses.filter(e => e.type === 'parcelado' || e.type === 'boleto_parcelado');
        const list = debts.map(d => {
            const end = Ledger.getDebtEndDate(d); 
            const paid = d.paidPeriods ? d.paidPeriods.length : 0; 
            const total = parseInt(d.installments);
            const endStr = end instanceof Date ? end.toLocaleDateString('pt-BR', {month:'long', year:'numeric'}) : end;
            const progress = (paid / total) * 100;
            return `
            <div style="padding:15px; border-bottom:1px solid var(--glass-border); margin-bottom:10px;">
                <div style="display:flex; justify-content:space-between;">
                    <div><strong>${d.description}</strong><br><small>${paid}/${total} Parcelas</small></div>
                    <div><div style="color:var(--primary); font-weight:bold">${endStr}</div></div>
                </div>
                <div class="progress-track"><div class="progress-fill" style="width:${progress}%; background:var(--accent)"></div></div>
            </div>`;
        }).join('');
        const modalHTML = `<div class="modal-overlay" onclick="this.remove()"><div class="modal-content" onclick="event.stopPropagation()"><h2>Fim da Dívida</h2><div style="max-height:400px; overflow-y:auto">${list || 'Nada ativo.'}</div></div></div>`;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    },

    recommendCard() {
        const active = Store.data.cards.filter(c => c.status === 'active' && !Utils.isExpired(c.expiration));
        if(!active.length) return alert("Sem cartões.");
        const today = new Date(); const day = today.getDate(); let best = null, maxDays = -1;
        active.forEach(c => {
            let dueMonth = (day >= c.closingDay) ? today.getMonth() + 1 : today.getMonth();
            let dueDate = new Date(today.getFullYear(), dueMonth, c.dueDay);
            let diff = Utils.diffDays(dueDate, today);
            if(diff > maxDays) { maxDays = diff; best = c; }
        });
        alert(`🏆 Melhor Escolha: ${best.name} (${maxDays} dias)`);
    },

    /* =================================================================
     * MÓDULO VAVILOV TEXT - IMPORTAÇÃO VIA COLA DE TEXTO (REFINED)
     * =================================================================
     */
    openImportModal() {
        const validCards = Store.data.cards.filter(c => c.status === 'active');
        const modalHTML = `
        <div class="modal-overlay" id="importModal">
            <div class="modal-content">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; border-bottom: 1px solid var(--glass-border); padding-bottom: 15px;">
                    <h2 style="margin:0; color:var(--primary);"><i class="fa-solid fa-paste"></i> Vavilov Text</h2>
                    <button class="btn btn-ghost" onclick="document.getElementById('importModal').remove()">
                        <i class="fa-solid fa-times"></i>
                    </button>
                </div>

                <div style="background: rgba(var(--primary-rgb), 0.05); border: 1px solid var(--glass-border); border-radius: 12px; padding: 15px; margin-bottom: 20px; font-size: 0.9rem;">
                    <h4 style="margin: 0 0 10px 0; color: var(--text-light); text-transform: uppercase; font-size: 0.75rem; letter-spacing: 1px;">
                        <i class="fa-solid fa-circle-info"></i> Padrões de Reconhecimento
                    </h4>
                    
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <i class="fa-regular fa-calendar" style="color:var(--text-light)"></i>
                            <div><strong>Data:</strong> <code style="background:rgba(0,0,0,0.1); padding:2px 6px; border-radius:4px; font-family:monospace">DD/MM</code></div>
                        </div>

                        <div style="display: flex; align-items: center; gap: 8px;">
                            <i class="fa-solid fa-list-ol" style="color:var(--text-light)"></i>
                            <div><strong>Parcela:</strong> <code style="background:rgba(0,0,0,0.1); padding:2px 6px; border-radius:4px; font-family:monospace">01/12</code></div>
                        </div>

                        <div style="display: flex; align-items: center; gap: 8px;">
                            <i class="fa-solid fa-money-bill" style="color:var(--text-light)"></i>
                            <div><strong>Valor:</strong> <code style="background:rgba(0,0,0,0.1); padding:2px 6px; border-radius:4px; font-family:monospace">1.000,00</code></div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <i class="fa-solid fa-font" style="color:var(--text-light)"></i>
                            <div><strong>Desc:</strong> Texto livre</div>
                        </div>
                    </div>
                </div>

                <div class="row">
                    <div class="col">
                        <label>1. Selecione o Cartão de Destino</label>
                        <select id="importCardId">
                            ${validCards.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
                        </select>
                    </div>
                </div>

                <div style="margin: 20px 0;">
                    <label>2. Cole aqui o texto da fatura:</label>
                    <textarea id="importText" rows="6" style="width:100%; font-family:monospace; font-size:0.8rem; background: rgba(0,0,0,0.03);" placeholder="Ex: 15/01 UBER DO BRASIL 15,90..."></textarea>
                    <button class="btn btn-primary" style="margin-top:10px; width:100%" onclick="app.processPastedText()">
                        <i class="fa-solid fa-gears"></i> Processar Texto
                    </button>
                </div>

                <div id="importPreview" style="max-height: 250px; overflow-y: auto; display: none; border-top: 1px solid var(--glass-border); padding-top: 15px;">
                    <h4>Prévia da Importação (<span id="importCount">0</span> itens)</h4>
                    <div id="importList"></div>
                </div>

                <div style="margin-top: 20px; text-align: right;">
                    <button class="btn btn-success" id="btnConfirmImport" style="display:none" onclick="app.confirmImport()">
                        <i class="fa-solid fa-check"></i> Confirmar Importação
                    </button>
                </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    },

    processPastedText() {
        const text = document.getElementById('importText').value;
        if(!text) return alert("Cole algum texto!");
        
        this.importedItems = [];
        
        // REGEX HÍBRIDA (VAVILOV 2.0)
        // 1. Data (DD/MM)
        // 2. Descrição (Pega tudo até encontrar o padrão de parcela ou valor)
        // 3. Parcela Opcional (Aceita 01/12, F01/12, T01/10)
        // 4. Valor (Aceita R$, espaços, negativos, pontos e vírgulas)
        const regex = /(\d{2}\/\d{2})\s+(.*?)(?:\s+([A-Z]?\d{1,2}\/\d{1,2}))?\s+(?:R\$\s*)?(-?[\d\.,]+)/g;
        
        let match;
        const year = new Date().getFullYear(); 
        
        while ((match = regex.exec(text)) !== null) {
            const dateStr = match[1];
            let desc = match[2].trim();
            let instStr = match[3]; 
            let valStr = match[4];

            // Ignorar linhas de saldo/pagamento
            if (desc.includes("SALDO") || desc.includes("PAGAMENTO") || desc.includes("CREDITO")) continue;

            // Tratamento da Parcela (Remove letras como 'F' de 'F05/06')
            let installments = 1;
            if (instStr) {
                // Remove qualquer letra que não seja número ou barra
                const cleanInst = instStr.replace(/[^\d\/]/g, '');
                desc = `${desc} (${cleanInst})`; 
            }

            // Tratamento Inteligente de Valor (Ponto vs Vírgula)
            // Se tiver vírgula, assume formato Brasileiro (1.000,00 -> 1000.00)
            // Se só tiver ponto, assume formato Americano (1000.00)
            let value;
            if (valStr.includes(',')) {
                value = parseFloat(valStr.replace(/\./g, '').replace(',', '.'));
            } else {
                value = parseFloat(valStr);
            }

            const [d, m] = dateStr.split('/');
            // Lógica simples de ano
            const fullDate = `${year}-${m}-${d}`;

            this.importedItems.push({
                date: fullDate,
                desc: desc,
                value: value,
                inst: installments
            });
        }

        this.renderImportPreview();
    },

    renderImportPreview() {
        const list = document.getElementById('importList');
        const count = document.getElementById('importCount');
        const btn = document.getElementById('btnConfirmImport');
        const previewDiv = document.getElementById('importPreview');

        const catOpts = Store.data.categories.map(c => `<option>${c}</option>`).join('');
        const benOpts = Store.data.beneficiaries.map(b => `<option>${b}</option>`).join('');

        list.innerHTML = this.importedItems.map((i, idx) => `
            <div class="import-list-item" id="import-row-${idx}">
                <div><strong>${i.date}</strong></div>
                <div style="font-size:0.8rem">${i.desc}</div>
                <div>${Utils.formatCurrency(i.value)}</div>
                
                <select class="imp-cat">
                    <option value="Outros">Outros</option>
                    ${catOpts}
                </select>
                
                <select class="imp-ben">
                    <option value="Geral">Geral</option>
                    ${benOpts}
                </select>
                
                <div style="text-align:center; cursor:pointer; color:red" onclick="app.removeImportItem(${idx})">X</div>
            </div>
        `).join('');

        count.innerText = this.importedItems.length;
        previewDiv.style.display = 'block';
        if(this.importedItems.length > 0) btn.style.display = 'inline-block';
        else btn.style.display = 'none';
    },

    removeImportItem(idx) {
        this.importedItems.splice(idx, 1);
        this.renderImportPreview();
    },

    confirmImport() {
        const cardId = document.getElementById('importCardId').value;
        if (!cardId) return alert("Selecione um cartão!");

        let addedCount = 0;
        
        // Loop through the rendered DOM rows to capture the selected Category and Beneficiary for each item
        this.importedItems.forEach((item, idx) => {
            const row = document.getElementById(`import-row-${idx}`);
            if(!row) return; // Should not happen if sync is correct

            const selectedCat = row.querySelector('.imp-cat').value;
            const selectedBen = row.querySelector('.imp-ben').value;

            Store.data.expenses.push({
                id: Utils.uuid(),
                description: item.desc,
                value: item.value,
                type: 'cartao_avista', 
                category: selectedCat, 
                beneficiary: selectedBen,
                date: item.date,
                installments: 1,
                cardId: cardId,
                paidPeriods: [],
                pausedPeriods: [],
                isVariable: false,
                variations: {}
            });
            addedCount++;
        });

        Store.save();
        document.getElementById('importModal').remove();
        alert(`${addedCount} lançamentos importados com sucesso!`);
        this.render();
    },

    exportData() { 
        const blob = new Blob([JSON.stringify(Store.data)], {type: "application/json"}); 
        const a = document.createElement('a'); 
        a.href = URL.createObjectURL(blob); 
        a.download = "functus_diamond_backup.json"; 
        a.click(); 
        localStorage.setItem('functus_last_backup', Date.now()); 
        this.checkBackupStatus(); 
    },
    
    importData(input) { 
        const r = new FileReader(); 
        r.onload = e => { 
            Store.data = JSON.parse(e.target.result); 
            Store.migrateData(); 
            Store.save(); 
            location.reload(); 
        }; 
        r.readAsText(input.files[0]); 
    },

    // --- PROTOCOLO FÊNIX (LÓGICA DE LIMPEZA E ANO NOVO) ---

    showNewYearModal(oldYear) {
        const modalHTML = `
        <div class="modal-overlay" id="yearModal" style="z-index:999">
            <div class="modal-content" style="text-align:center">
                <h2><i class="fa-solid fa-champagne-glasses" style="color:gold"></i> Feliz Ano Novo!</h2>
                <p>Bem-vindo a <strong>${Utils.year()}</strong>.</p>
                <p>Para manter o sistema rápido, deseja arquivar as despesas quitadas de ${oldYear}?</p>
                <div style="background:rgba(0,0,0,0.05); padding:15px; border-radius:10px; margin:20px 0; text-align:left; font-size:0.9rem">
                    <strong>Serão arquivados (removidos):</strong><br>
                    • Compras à vista de anos anteriores.<br>
                    • Parcelamentos antigos 100% pagos.<br><br>
                    <strong>Permanecem:</strong><br>
                    • Parcelas a vencer (dívidas ativas).<br>
                    • Tudo do ano atual.
                </div>
                <button class="btn btn-primary" onclick="app.executePurge(); document.getElementById('yearModal').remove()">Sim, Limpar a Casa!</button>
                <button class="btn btn-ghost" onclick="document.getElementById('yearModal').remove()">Agora não</button>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    },

    triggerCriticalCleanup() {
        const modalHTML = `
        <div class="modal-overlay" style="z-index:1000">
            <div class="modal-content" style="border: 2px solid red">
                <h2 style="color:red"><i class="fa-solid fa-triangle-exclamation"></i> ARMAZENAMENTO CRÍTICO</h2>
                <p>O sistema atingiu o limite de segurança do navegador (> 4.8MB).</p>
                <p>Para evitar perda de dados, o <strong>Protocolo Fênix</strong> é obrigatório agora:</p>
                <ol style="text-align:left">
                    <li>Download automático do backup completo.</li>
                    <li>Limpeza de registros antigos e quitados.</li>
                    <li>Reinício do sistema.</li>
                </ol>
                <button class="btn btn-danger" onclick="app.executePurge()">EXECUTAR LIMPEZA AGORA</button>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    },

    executePurge() {
        // 1. Força Backup
        this.exportData("functus_ARCHIVE_FULL");

        const currentYear = new Date().getFullYear();
        const initialCount = Store.data.expenses.length;
        
        // 2. Filtro Lógico (Quem Fica?)
        const newExpenses = Store.data.expenses.filter(exp => {
            const expYear = parseInt(exp.date.split('-')[0]);
            
            // Regra A: Se é do ano atual ou futuro, FICA.
            if (expYear >= currentYear) return true;

            // Regra B: Se é RECORRENTE e ativo (sem data fim), FICA.
            if (exp.type === 'recorrente' && !exp.terminationDate) return true;

            // Regra C: Se é PARCELADO (cartão ou boleto)
            if (exp.type === 'parcelado' || exp.type === 'boleto_parcelado') {
                const totalInst = parseInt(exp.installments);
                const paidCount = exp.paidPeriods ? exp.paidPeriods.length : 0;
                
                // Se AINDA NÃO PAGOU TUDO (dívida ativa), FICA.
                if (paidCount < totalInst) return true;
            }

            // Se falhou nas regras acima (ex: à vista de 2023, ou parcelado quitado de 2024), VAI EMBORA.
            return false; 
        });

        // 3. Aplica e Salva
        Store.data.expenses = newExpenses;
        try {
            localStorage.setItem(Store.DB_KEY, JSON.stringify(Store.data));
            const removed = initialCount - newExpenses.length;
            alert(`Limpeza concluída!\n\n${removed} registros antigos foram arquivados.\nSeu sistema está leve novamente.`);
            location.reload();
        } catch(e) {
            alert("Erro ao salvar após limpeza. Backup manual recomendado.");
        }
    }
};

window.app = App;
App.init();