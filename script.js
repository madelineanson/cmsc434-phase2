document.addEventListener('DOMContentLoaded', function () {
    // load from LS
    let entries = JSON.parse(localStorage.getItem('financeEntries')) || [];
    let recurringPlans = JSON.parse(localStorage.getItem('recurringPlans')) || [];
    let savingsGoals = JSON.parse(localStorage.getItem('savingsGoals')) || [];

    // the default categories made are used when there's no plan for current month
    const defaultCategories = [
        'Fun', 'Groceries', 'Rent', 'Utilities',
        'Insurance', 'Education', 'Transportation', 'Health'
    ];

    function getCurrentMonthKey() {
        const d = new Date();
        return d.toISOString().slice(0, 7);
    }

    function normalizeStoredPlans() {
        const raw = JSON.parse(localStorage.getItem('budgetPlans') || '[]');
        let changed = false;
        const normalized = raw.map(p => {
            const plan = Object.assign({}, p);
            if (typeof plan.categories === 'string') {
                const parts = plan.categories.split(',').map(s => s.trim()).filter(Boolean);
                plan.categories = parts.map(name => ({ name, amount: 0 }));
                changed = true;
            } else if (Array.isArray(plan.categories)) {
                plan.categories = plan.categories.map(c => {
                    if (typeof c === 'string') return { name: c, amount: 0 };
                    if (c && typeof c === 'object') return { name: (c.name || ''), amount: Number(c.amount) || 0 };
                    return { name: '', amount: 0 };
                });
            } else {
                plan.categories = [];
                changed = true;
            }
            return plan;
        });
        if (changed) localStorage.setItem('budgetPlans', JSON.stringify(normalized));
        return normalized;
    }

    function getCategoriesForMonth(monthKey) {
        const plans = normalizeStoredPlans();
        const plan = plans.find(p => p.month === monthKey);
        if (plan && Array.isArray(plan.categories) && plan.categories.length) {
            return plan.categories.map(c => c.name).filter(Boolean);
        }
        return defaultCategories.slice();
    }

    function populateEntryCategorySelect() {
        const select = document.getElementById('entryCategory');
        if (!select) return;
        const monthKey = getCurrentMonthKey();
        const categories = getCategoriesForMonth(monthKey);

        select.innerHTML = '';
        categories.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = (cat || '').toString().trim().toLowerCase().replace(/\s+/g, '-');
            opt.textContent = cat;
            select.appendChild(opt);
        });
    }

    function populateSavingsGoalSelect() {
        const select = document.getElementById('savingsGoalSelect');
        if (!select) return;
        
        select.innerHTML = '<option value="">Select goal...</option>';
        savingsGoals.forEach(goal => {
            const option = document.createElement('option');
            option.value = goal.id;
            option.textContent = goal.name;
            select.appendChild(option);
        });
    }

    // existing detail popup
    const closePopupBtn = document.getElementById('closePopupBtn');
    const popupOverlay = document.getElementById('popupOverlay');
    const popupContent = document.getElementById('popupContent');

    function closeOverlay() {
        if (popupOverlay) popupOverlay.style.display = 'none';
    }

    // clicking outside popupContent should close the overlay
    if (popupOverlay) {
        popupOverlay.addEventListener('click', function (e) {
            if (e.target === popupOverlay) closeOverlay();
        });
    }

    // close overlay with escape too
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeOverlay();
    });

    function openDetailPopup(entry) {
        if (!popupOverlay || !popupContent) return;

        // recurring text if event is recurring
        let recText = '';
        if (entry.recurringId) {
            const plan = (recurringPlans || []).find(p => p.id === entry.recurringId);
            if (plan && plan.frequency) recText = `(recurring ${plan.frequency})`;
            else recText = '(recurring)';
        } else if (entry.recurring && typeof entry.recurring === 'string') {
            recText = `(recurring ${entry.recurring})`;
        }

        // savings contribution info in the full deatils popup
        let contribText = '';
        if (entry.savingsContribution) {
            contribText = `Contributed $${Number(entry.savingsContribution.amount || 0).toFixed(2)} to goal ${entry.savingsContribution.goalId || ''}`;
        } else if (entry.contribution && entry.contribution.enabled) {
            const v = entry.contribution.value || 0;
            contribText = entry.contribution.type === 'all' ? `Contributed all to goal ${entry.contribution.goalId || ''}` : `Contributed ${v}${entry.contribution.type === 'percent' ? '%' : ''} to goal ${entry.contribution.goalId || ''}`;
        }

        // prepare category / recurring display
        const categoryDisplay = (entry.type === 'credit')
            ? (recText ? `<p class="recurring"><strong>${recText}</strong></p>` : '')
            : `<p><strong>Category:</strong> ${entry.category || 'N/A'}</p>`;

        popupContent.innerHTML = `
            <h2>Transaction Details</h2>
            <div style="text-align:left; margin:1rem 0;">
                <p><strong>Date:</strong> ${entry.date || 'N/A'}</p>
                <p><strong>Type:</strong> ${entry.type === 'credit' ? 'Income' : 'Charge'}</p>
                <p class="${entry.type === 'credit' ? 'amount-plus' : 'amount-minus'}"><strong>Amount:</strong> ${entry.type === 'credit' ? '+' : '-'}$${Number(entry.amount || 0).toFixed(2)}</p>
                <p><strong>Description:</strong> ${entry.description || 'N/A'}</p>
                ${categoryDisplay}
                ${contribText ? `<p class="description"><strong>${contribText}</strong></p>` : ''}
            </div>
            <div style="display:flex; justify-content:center; gap:0.5rem; margin-top:1rem;">
                <button id="editTxnBtn" class="closePopupBtn">Edit</button>
                <button id="deleteTxnBtn" class="closePopupBtn" style="background:#c33">Delete</button>
                <button id="closePopupBtn" class="closePopupBtn">Back</button>
            </div>
        `;
        popupOverlay.style.display = 'flex';

        // wire up buttons
        const editBtn = document.getElementById('editTxnBtn');
        const delBtn = document.getElementById('deleteTxnBtn');
        const backBtn = document.getElementById('closePopupBtn');

        if (backBtn) backBtn.addEventListener('click', closeOverlay);
        if (editBtn) editBtn.addEventListener('click', () => openEditPopup(entry));
        if (delBtn) delBtn.addEventListener('click', () => {
            entries = entries.filter(e => e.id !== entry.id);
            localStorage.setItem('financeEntries', JSON.stringify(entries));
            closeOverlay();
            renderEntries();
        });
    }

    function openEditPopup(entry) {
        if (!popupOverlay || !popupContent) return;

        popupContent.innerHTML = `
            <h2>Edit Transaction</h2>
            <form id="editTxnForm" class="popup-form" style="text-align:left;">
                <label for="editEntryDate">Date</label>
                <input type="date" id="editEntryDate" name="editEntryDate" value="${entry.date || ''}" required>

                <fieldset class="entry-type">
                    <legend>Type</legend>
                    <label><input type="radio" name="editEntryType" value="debit" ${entry.type === 'debit' ? 'checked' : ''}> Charge</label>
                    <label><input type="radio" name="editEntryType" value="credit" ${entry.type === 'credit' ? 'checked' : ''}> Income</label>
                </fieldset>

                <label for="editEntryAmount">Amount</label>
                <input type="number" id="editEntryAmount" name="editEntryAmount" step="0.01" min="0" value="${Number(entry.amount || 0).toFixed(2)}" required>

                <label for="editEntryDescription">Description</label>
                <input type="text" id="editEntryDescription" name="editEntryDescription" maxlength="200" value="${(entry.description || '').replace(/"/g,'&quot;')}">

                <div id="editCategoryRow">
                    <label for="editEntryCategory">Category</label>
                    <select id="editEntryCategory" name="editEntryCategory">
                        <option value="">(None)</option>
                        <option value="groceries">Groceries</option>
                        <option value="fun">Fun</option>
                        <option value="school">School</option>
                        <option value="rent">Rent</option>
                    </select>
                </div>

                <div style="margin-top:1rem; display:flex; gap:0.5rem; align-items:center;">
                    <button type="submit" id="saveEditedBtn" class="popup-form #saveEntryBtn">Save</button>
                    <button type="button" id="cancelEditBtn" class="closePopupBtn">Cancel</button>
                    <button type="button" id="deleteWhileEditingBtn" style="background:#c33; color:#fff; border:none; padding:0.5rem 0.9rem; border-radius:8px;">Delete</button>
                </div>
            </form>
        `;

        // set category select to entry value
        const catSelect = document.getElementById('editEntryCategory');
        if (catSelect) catSelect.value = entry.category || '';

        // hide category row if entry is income
        const editCategoryRow = document.getElementById('editCategoryRow');
        function updateEditCategoryVisibility() {
            const checked = document.querySelector('input[name="editEntryType"]:checked');
            if (!editCategoryRow || !checked) return;
            editCategoryRow.style.display = (checked.value === 'credit') ? 'none' : 'block';
        }
        document.querySelectorAll('input[name="editEntryType"]').forEach(r => r.addEventListener('change', updateEditCategoryVisibility));
        updateEditCategoryVisibility();

        popupOverlay.style.display = 'flex';

        const editForm = document.getElementById('editTxnForm');
        const cancelBtn = document.getElementById('cancelEditBtn');
        const deleteBtn = document.getElementById('deleteWhileEditingBtn');

        editForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const updated = {
                id: entry.id,
                date: document.getElementById('editEntryDate').value,
                type: document.querySelector('input[name="editEntryType"]:checked').value,
                amount: parseFloat(document.getElementById('editEntryAmount').value || 0),
                description: document.getElementById('editEntryDescription').value.trim(),
                category: document.getElementById('editEntryCategory') ? document.getElementById('editEntryCategory').value : ''
            };

            // replace in entries array
            entries = entries.map(en => en.id === entry.id ? Object.assign({}, en, updated) : en);
            localStorage.setItem('financeEntries', JSON.stringify(entries));
            closeOverlay();
            renderEntries();
        });

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => openDetailPopup(entry));
        }

        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                entries = entries.filter(e => e.id !== entry.id);
                localStorage.setItem('financeEntries', JSON.stringify(entries));
                closeOverlay();
                renderEntries();
            });
        }
    }

    // render the most recent 4 entries by date
    function renderEntries() {
        const container = document.getElementById('recent-activity');
        if (!container) return;

        container.innerHTML = ''; // clear current content

        // sort descending by date w/ newest first
        const sorted = (entries || []).slice().sort((a, b) => {
            const da = new Date(a.date || 0);
            const db = new Date(b.date || 0);
            return db - da;
        });

        const recent = sorted.slice(0, 4);

        if (recent.length === 0) {
            const p = document.createElement('p');
            p.style.textAlign = 'center';
            p.style.color = '#555';
            p.textContent = 'No recent activity.';
            container.appendChild(p);
        } else {
            recent.forEach(entry => {
                const btn = document.createElement('button');
                btn.className = 'rounded-rectangle openPopupBtn';
                btn.type = 'button';

                const details = document.createElement('div');
                details.className = 'details';
                const about = document.createElement('div');
                about.className = 'about';

                const dateP = document.createElement('p');
                dateP.className = 'date';
                dateP.textContent = entry.date || '';

                const typeP = document.createElement('p');
                typeP.className = 'charge-or-credit';
                typeP.textContent = (entry.type === 'credit' ? 'Income' : 'Charge');

                const amountP = document.createElement('p');
                amountP.className = (entry.type === 'credit' ? 'amount-plus' : 'amount-minus');
                const sign = (entry.type === 'credit' ? '+' : '-');
                amountP.textContent = `${sign}$${(Number(entry.amount) || 0).toFixed(2)}`;

                details.appendChild(dateP);
                details.appendChild(typeP);
                details.appendChild(amountP);

                const descP = document.createElement('p');
                descP.className = 'description';
                descP.innerHTML = `<strong>Description:</strong> ${entry.description || '—'}`;

                about.appendChild(descP);

                // for income entries do NOT show category
                // show recurring frequency text instead
                if (entry.type === 'credit') {
                    let recText = '';
                    if (entry.recurringId) {
                        const plan = (recurringPlans || []).find(p => p.id === entry.recurringId);
                        if (plan && plan.frequency) recText = `(recurring ${plan.frequency})`;
                        else recText = '(recurring)';
                    } else if (entry.recurring && typeof entry.recurring === 'string') {
                        console.log('entry.recurring:', entry.recurring);
                        recText = `(recurring ${entry.recurring})`;
                    }
                    if (recText) {
                        const recP = document.createElement('p');
                        recP.className = 'recurring';
                        recP.textContent = recText;
                        about.appendChild(recP);
                    }
                } else {
                    if (entry.category) {
                        const catP = document.createElement('p');
                        catP.className = 'category';
                        catP.innerHTML = `<strong>Category:</strong> ${entry.category || '—'}`;
                        about.appendChild(catP);
                    }
                    if (entry.recurringId || entry.recurring) {
                        const recP = document.createElement('p');
                        recP.className = 'recurring';
                        recP.textContent = '(Recurring)';
                        about.appendChild(recP);
                    }
                }

                btn.appendChild(details);
                btn.appendChild(about);

                // open detail popup for this entry
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (typeof openDetailPopup === 'function') openDetailPopup(entry);
                });

                container.appendChild(btn);
            });
        }

        const allBtn = document.createElement('button');
        allBtn.id = 'all-activity-button';
        allBtn.textContent = 'All Activity';
        allBtn.addEventListener('click', () => {
            window.location.href = 'all_activity.html';
        });
        container.appendChild(allBtn);
    }

    // ensure recurring plans generate missed entries up to today
    function advanceDateByFrequency(dateStr, freq) {
        const d = new Date(dateStr + 'T00:00:00');
        switch (freq) {
            case 'daily': d.setDate(d.getDate() + 1); break;
            case 'weekly': d.setDate(d.getDate() + 7); break;
            case 'biweekly': d.setDate(d.getDate() + 14); break;
            case 'monthly': d.setMonth(d.getMonth() + 1); break;
            default: d.setMonth(d.getMonth() + 1);
        }
        return d.toISOString().slice(0, 10);
    }

    function processRecurringPlans() {
        const today = new Date().toISOString().slice(0, 10);
        let changed = false;
        recurringPlans.forEach(plan => {
            // plan is in the format: { id, nextDate (YYYY-MM-DD), frequency, templateEntry }
            while (plan.nextDate && plan.nextDate <= today) {
                const ent = Object.assign({}, plan.templateEntry);
                ent.id = Date.now() + Math.floor(Math.random() * 1000);
                ent.date = plan.nextDate;
                ent.recurringId = plan.id;
                entries.push(ent);
                // advance nextDate
                plan.nextDate = advanceDateByFrequency(plan.nextDate, plan.frequency);
                changed = true;
            }
        });
        if (changed) {
            localStorage.setItem('financeEntries', JSON.stringify(entries));
            localStorage.setItem('recurringPlans', JSON.stringify(recurringPlans));
        }
    }

    // look for recurring transactions before render
    processRecurringPlans();
    renderEntries();

    // new-entry form popup
    const newEntryButton = document.getElementById('new-entry-button');
    const newEntryOverlay = document.getElementById('newEntryOverlay');
    const closeNewEntryBtn = document.getElementById('closeNewEntryBtn');
    const newEntryForm = document.getElementById('newEntryForm');
    const entryDate = document.getElementById('entryDate');

    // income-specific controls
    const incomeOptions = document.getElementById('incomeOptions');
    const entryTypeRadios = document.getElementsByName('entryType');
    const entryRecurringCheckbox = document.getElementById('entryRecurring');
    const recurrenceControls = document.getElementById('recurrenceControls');
    const recurrenceFrequency = document.getElementById('recurrenceFrequency');
    const contributeSavings = document.getElementById('contributeSavings');
    const savingsControls = document.getElementById('savingsControls');
    const savingsGoalSelect = document.getElementById('savingsGoalSelect');
    const savingsContributionType = document.getElementById('savingsContributionType');
    const savingsContributionValue = document.getElementById('savingsContributionValue');

    if (entryDate) {
        entryDate.value = new Date().toISOString().slice(0, 10);
    }

    function showIncomeOptions(show) {
        incomeOptions.style.display = show ? 'block' : 'none';
    }
    // first show/hide depending on user choosing income vs charge
    Array.from(entryTypeRadios).forEach(r => {
        r.addEventListener('change', () => {
            showIncomeOptions(r.value === 'credit' && r.checked);
        });
        if (r.checked && r.value === 'credit') showIncomeOptions(true);
    });

    entryRecurringCheckbox?.addEventListener('change', (e) => {
        recurrenceControls.style.display = e.target.checked ? 'block' : 'none';
    });

    contributeSavings?.addEventListener('change', (e) => {
        savingsControls.style.display = e.target.checked ? 'block' : 'none';
    });

    // open/close popup
    if (newEntryButton) newEntryButton.addEventListener('click', function (e) {
        e.preventDefault();
        if (entryDate) entryDate.value = new Date().toISOString().slice(0, 10);
        newEntryForm.reset();
        showIncomeOptions(false);
        recurrenceControls.style.display = 'none';
        savingsControls.style.display = 'none';
        populateEntryCategorySelect(); // categories should reflect current month's plan
        newEntryOverlay.style.display = 'flex';
    });
    if (closeNewEntryBtn) closeNewEntryBtn.addEventListener('click', function () {
        newEntryOverlay.style.display = 'none';
    });
    if (newEntryOverlay) {
        newEntryOverlay.addEventListener('click', function (event) {
            if (event.target === newEntryOverlay) newEntryOverlay.style.display = 'none';
        });
    }
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') newEntryOverlay.style.display = 'none'; });

    // save new entry (and setup recurring plan if selected)
    newEntryForm?.addEventListener('submit', function (e) {
        e.preventDefault();
        const data = {
            id: Date.now(),
            date: newEntryForm.entryDate.value,
            type: newEntryForm.entryType.value,
            amount: parseFloat(newEntryForm.entryAmount.value || 0),
            description: newEntryForm.entryDescription.value.trim(),
            category: newEntryForm.entryCategory ? newEntryForm.entryCategory.value : ''
        };

        // savings contribution
        if (contributeSavings && contributeSavings.checked) {
            data.contribution = {
                enabled: true,
                goalId: savingsGoalSelect?.value || null,
                type: savingsContributionType?.value || 'all',
                value: parseFloat(savingsContributionValue?.value || 0)
            };
        } else {
            data.contribution = { enabled: false };
        }

        // if income + recurring, create recurringPlan first so we can tag the saved entry with plan.id
        let createdPlan = null;
        if (data.type === 'credit' && entryRecurringCheckbox && entryRecurringCheckbox.checked) {
            const freq = recurrenceFrequency.value || 'monthly';
            const nextDate = advanceDateByFrequency(data.date, freq);
            const plan = {
                id: Date.now() + Math.floor(Math.random()*1000),
                frequency: freq,
                nextDate: nextDate,
                templateEntry: {
                    type: data.type,
                    amount: data.amount,
                    description: data.description,
                    category: data.category,
                    contribution: data.contribution
                }
            };
            recurringPlans.push(plan);
            localStorage.setItem('recurringPlans', JSON.stringify(recurringPlans));
            createdPlan = plan;
        }

        // if created a recurring plan tag the actual saved entry so UI shows "(recurring ...)"
        if (createdPlan) {
            data.recurringId = createdPlan.id;
            data.recurring = createdPlan.frequency;
        }

        entries.push(data);
        localStorage.setItem('financeEntries', JSON.stringify(entries));

        newEntryOverlay.style.display = 'none';
        renderEntries();
    });

    if (document.getElementById('piechart')) {
        google.charts.load('current', { packages: ['corechart'] });
        google.charts.setOnLoadCallback(drawPie);

        function drawPie() {
            const currDay = new Date();
            const currYearMonth = getCurrMonthYr(currDay);
            const currPlan = budgetPlans.find(b => b.month === currYearMonth)
            data = google.visualization.arrayToDataTable([
                ['Category', 'Amount'],
                ['Groceries', 300],
                ['Fun', 120],
                ['School', 220],
                ['Rent', 800]
            ]);

            // if there is a budget plan for the current month, use those categories. if not, keep default
            if (currPlan) {
                entryRows = [['Category', 'Amount']]
                currPlan.categories.forEach(elem => {
                    entryRows.push([elem.name, Number(elem.amount)])
                })
                data = google.visualization.arrayToDataTable(entryRows);
            } 

            const options = {
                backgroundColor: { fill: '#D0E8F5', stroke: '#D0E8F5', strokeWidth: 0 },
                chartArea: { left: '5%', top: '5%', width: '90%', height: '90%' },
                legend: { position: 'none' },
                pieHole: 0,
                //   pieSliceText: 'percentage',
                pieSliceText: 'label',
                pieSliceTextStyle: {
                    fontSize: 18,
                    color: '#ffffff',
                    bold: true
                },
                // later: implement so if the user selects a color close to white, the pieslicetextcolor is dark
                tooltip: { trigger: 'hover', text: 'both' }
            };

            const chart = new google.visualization.PieChart(document.getElementById('piechart'));
            chart.draw(data, options);
        }

        window.addEventListener('resize', () => {
            if (google.visualization && google.visualization.events) drawPie();
        });
    }

    const chartCanvas = document.getElementById('budgetChart');
    if (chartCanvas) {
        const ctx = chartCanvas.getContext('2d');
        let chartInstance = null;

        const timeRangeSelect = document.getElementById('timeRangeSelect');
        const intervalCountInput = document.getElementById('intervalCount');
        const budgetInput = document.getElementById('budgetInput');
        const applyBtn = document.getElementById('applyStatsBtn');
        const totalSpentEl = document.getElementById('totalSpent');
        const budgetPerIntervalEl = document.getElementById('budgetPerInterval');

        function getIntervalLabel(index, timeRange) {
            if (timeRange === 'weekly') return `Week ${index + 1}`;
            if (timeRange === 'monthly') return `Month ${index + 1}`;
            if (timeRange === 'yearly') return `Year ${index + 1}`;
            return `Interval ${index + 1}`;
        }

        const budgetLinePlugin = {
            id: 'budgetLine',
            afterDraw(chart) {
                const { ctx, chartArea: { top, bottom, left, right }, scales: { y } } = chart;
                const budget = chart.config.options.plugins.budgetLine?.budgetValue;
                if (budget === undefined) return;

                const yPos = y.getPixelForValue(budget);
                ctx.save();
                ctx.beginPath();
                ctx.moveTo(left, yPos);
                ctx.lineTo(right, yPos);
                ctx.lineWidth = 2;
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
                ctx.setLineDash([5, 5]);
                ctx.stroke();
                ctx.restore();
            }
        };

        function updateChart() {
            const timeRange = timeRangeSelect.value;
            const intervals = parseInt(intervalCountInput.value);
            const budget = parseFloat(budgetInput.value);
            if (!entries.length) return;

            const now = new Date();
            let intervalLengthMs;
            if (timeRange === 'weekly') intervalLengthMs = 7 * 24 * 60 * 60 * 1000;
            else if (timeRange === 'monthly') intervalLengthMs = 30 * 24 * 60 * 60 * 1000;
            else intervalLengthMs = 365 * 24 * 60 * 60 * 1000;

            // sort by transaction date (newest top)
            const sorted = [...entries].sort((a, b) => new Date(b.date) - new Date(a.date));
            const latestDate = now;
            const earliestDate = new Date(latestDate - intervalLengthMs * intervals);

            const intervalSpending = Array(intervals).fill(0);
            sorted.forEach(entry => {
                const entryDate = new Date(entry.date);
                if (entryDate >= earliestDate && entryDate <= latestDate && entry.type === 'debit') {
                    const diff = latestDate - entryDate;
                    const intervalIndex = Math.floor(diff / intervalLengthMs);
                    if (intervalIndex < intervals) {
                        intervalSpending[intervals - 1 - intervalIndex] += entry.amount;
                    }
                }
            });

            const labels = Array.from({ length: intervals }, (_, i) => getIntervalLabel(i, timeRange));
            const data = intervalSpending.map(v => v);
            const totalSpent = data.reduce((a, b) => a + b, 0);
            totalSpentEl.textContent = `$${totalSpent.toFixed(2)}`;
            budgetPerIntervalEl.textContent = `$${budget.toFixed(2)}`;
            const colors = data.map(v => (v <= budget ? 'rgba(0,150,0,0.7)' : 'rgba(200,0,0,0.7)'));
            const dataset = { label: 'Spending', data, backgroundColor: colors, borderColor: colors, borderWidth: 1 };

            if (chartInstance) {
                chartInstance.destroy();
            }

            chartInstance = new Chart(ctx, {
                type: 'bar',
                data: { labels, datasets: [dataset] },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true,
                            suggestedMax: budget * 2,
                            grid: { color: '#ccc' },
                            ticks: { stepSize: budget / 2 }
                        }
                    },
                    plugins: {
                        legend: { display: false },
                        title: { display: true, text: 'Budget vs Spending Intervals' },
                        budgetLine: { budgetValue: budget }
                    }
                },
                plugins: [budgetLinePlugin]
            });
        }

        applyBtn.addEventListener('click', updateChart);
        updateChart();
    }

    /*
        BUDGET PLANS POP UP 
    */

    const newPlanButton = document.getElementById('new-plan-button');
    const newPlanOverlay = document.getElementById('newPlanOverlay');
    const closeNewPlanBtn = document.getElementById('closeNewPlanBtn');
    const newPlanForm = document.getElementById('newPlanForm');
    const planMonth = document.getElementById('planMonth');
    const planTotal = document.getElementById('planTotal');
    const addCategoryBtn = document.getElementById('addCategoryBtn');
    const categoriesContainer = document.getElementById('categoriesContainer');
    const categoriesWarning = document.getElementById('categoriesWarning');
    const savePlanBtn = document.getElementById('savePlanBtn');
    const deletePlanBtn = document.getElementById('deletePlanBtn');
    const plansList = document.getElementById('plans-list');
    const newPlanTitle = document.getElementById('newPlanTitle');

    let budgetPlans = JSON.parse(localStorage.getItem('budgetPlans')) || [];
    let editingPlanId = null; // null => creating new

    function formatMonthLabel(date) {
        return date.toLocaleString(undefined, { month: 'long', year: 'numeric' });
    }

    function getCurrMonthYr(date) {
        const year = date.getFullYear();
        const month = date.getMonth() + 1; 
        return `${year}-${month.toString()}`;
    }

    function populateMonthOptions() {
        planMonth.innerHTML = '';
        const today = new Date();
        for (let i = 0; i < 12; i++) {
            const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
            const opt = document.createElement('option');
            opt.value = getCurrMonthYr(d)
            opt.textContent = formatMonthLabel(d);
            planMonth.appendChild(opt);
        }
    }

    function createCategoryRow(cat = { name: '', amount: 0 }) {
        const row = document.createElement('div');
        row.className = 'plan-category-row';

        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.placeholder = 'Category name';
        nameInput.value = cat.name;
        nameInput.required = true;

        const amountInput = document.createElement('input');
        amountInput.type = 'number';
        amountInput.min = '0';
        amountInput.step = '0.01';
        amountInput.placeholder = 'Amount';
        amountInput.value = cat.amount || 0;
        amountInput.required = true;

        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'removeCategory';
        removeBtn.textContent = 'Remove';
        removeBtn.addEventListener('click', () => {
            row.remove();
        });

        row.appendChild(nameInput);
        row.appendChild(amountInput);
        row.appendChild(removeBtn);

        return row;
    }

    function openNewPlan(plan = null) {
        populateMonthOptions();
        categoriesContainer.innerHTML = '';
        categoriesWarning.style.display = 'none';
        editingPlanId = null;
        deletePlanBtn.style.display = 'none';
        newPlanTitle.textContent = plan ? 'Edit Plan' : 'New Plan';

        if (plan) {
            editingPlanId = plan.id;
            const optVal = plan.month;
            if (![...planMonth.options].some(o => o.value === optVal)) {
                const tempOpt = document.createElement('option');
                tempOpt.value = optVal;
                const [y, m] = optVal.split('-');
                tempOpt.textContent = new Date(y, m - 1, 1).toLocaleString(undefined, { month: 'long', year: 'numeric' });
                planMonth.appendChild(tempOpt);
            }
            planMonth.value = optVal;
            planTotal.value = plan.total.toFixed(2);
            (plan.categories || []).forEach(c => categoriesContainer.appendChild(createCategoryRow(c)));
            deletePlanBtn.style.display = 'inline-block';
        } else {
            planMonth.selectedIndex = 0;
            planTotal.value = '';
            categoriesContainer.appendChild(createCategoryRow());
        }

        newPlanOverlay.style.display = 'flex';
    }

    function closeNewPlan() {
        newPlanOverlay.style.display = 'none';
    }

    function renderPlans() {
        if (!plansList) return;
        plansList.innerHTML = '';
        if (!budgetPlans.length) {
            plansList.textContent = 'No saved plans.';
            return;
        }
        budgetPlans.forEach(plan => {
            const a = document.createElement('a');
            a.href = '#';
            a.className = 'plan-button';
            a.dataset.id = plan.id;
            const label = document.createElement('span');
            label.className = 'plan-month';
            label.textContent = new Date(plan.month + '-01').toLocaleString(undefined, { month: 'long', year: 'numeric' });
            const icon = document.createElement('i');
            icon.className = 'fa-solid fa-pen-to-square';
            a.appendChild(label);
            a.appendChild(icon);

            a.addEventListener('click', (e) => {
                e.preventDefault();
                openNewPlan(plan);
            });

            plansList.appendChild(a);
        });
    }

    // add category
    addCategoryBtn?.addEventListener('click', () => {
        const count = categoriesContainer.querySelectorAll('.plan-category-row').length;
        if (count >= 10) return;
        categoriesContainer.appendChild(createCategoryRow());
    });

    // open new plan overlay
    newPlanButton?.addEventListener('click', (e) => {
        e.preventDefault();
        openNewPlan(null);
    });

    // close handlers
    closeNewPlanBtn?.addEventListener('click', closeNewPlan);
    newPlanOverlay?.addEventListener('click', (e) => {
        if (e.target === newPlanOverlay) closeNewPlan();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && newPlanOverlay && newPlanOverlay.style.display === 'flex') closeNewPlan();
    });

    // delete plan
    deletePlanBtn?.addEventListener('click', () => {
        if (!editingPlanId) return;
        budgetPlans = budgetPlans.filter(p => p.id !== editingPlanId);
        localStorage.setItem('budgetPlans', JSON.stringify(budgetPlans));
        renderPlans();
        closeNewPlan();
    });

    // save plan (create or update)
    newPlanForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        const monthVal = planMonth.value;
        const totalVal = parseFloat(planTotal.value || 0);
        const categoryRows = Array.from(categoriesContainer.querySelectorAll('.plan-category-row'));
        const categories = categoryRows.map(row => {
            const name = row.querySelector('input[type="text"]').value.trim();
            const amount = parseFloat(row.querySelector('input[type="number"]').value || 0);
            return { name, amount };
        });

        // mandatory fields
        if (categories.length === 0) {
            alert('Add at least one category.');
            return;
        }
        if (categories.some(c => !c.name)) {
            alert('All categories must have a name.');
            return;
        }

        const sum = categories.reduce((s, c) => s + (isNaN(c.amount) ? 0 : c.amount), 0);
        if (Math.abs(sum - totalVal) > 0.009) {
            categoriesWarning.style.display = 'block';
            return;
        }
        categoriesWarning.style.display = 'none';

        const planObj = {
            id: editingPlanId || Date.now(),
            month: monthVal,
            total: totalVal,
            categories
        };

        if (editingPlanId) {
            budgetPlans = budgetPlans.map(p => p.id === editingPlanId ? planObj : p);
        } else {
            budgetPlans.push(planObj);
        }

        localStorage.setItem('budgetPlans', JSON.stringify(budgetPlans));
        renderPlans();
        populateEntryCategorySelect(); // refresh entry categories if plan affects current month
        closeNewPlan();
    });

    // SAVINGS GOALLLLS here!
    
    const newGoalButton = document.getElementById('new-goal-button');
    const newGoalOverlay = document.getElementById('newGoalOverlay');
    const closeNewGoalBtn = document.getElementById('closeNewGoalBtn');
    const newGoalForm = document.getElementById('newGoalForm');

    function getIconForGoal(iconType) {
        const icons = {
            'piggy-bank': '💰',
            'plane': '✈️',
            'home': '🏠',
            'car': '🚗',
            'graduation': '🎓',
            'ring': '💍',
            'umbrella': '☂️'
        };
        return icons[iconType] || '💰';
    }

    function renderSavingsGoals() {
        const container = document.getElementById('savings-goals-list');
        if (!container) return;

        container.innerHTML = '';

        if (savingsGoals.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #666; margin: 2rem;">No savings goals yet. Click + New Goal to create one!</p>';
            return;
        }

        savingsGoals.forEach(goal => {
            const currentAmount = goal.currentAmount || 0;
            const targetAmount = goal.targetAmount || 1;
            const percentage = Math.min((currentAmount / targetAmount) * 100, 100);

            const goalCard = document.createElement('button');
            goalCard.className = 'rounded-rectangle';
            goalCard.innerHTML = `
                <div class="details">
                    <p class="date">${getIconForGoal(goal.icon)}</p>
                    <p class="charge-or-credit">${goal.name}</p>
                    <p class="amount-plus">$${currentAmount.toFixed(2)}</p>
                </div>
                <div class="about">
                    <p class="description"><strong>Target:</strong> $${targetAmount.toFixed(2)}</p>
                    <p class="category"><strong>Progress:</strong> ${percentage.toFixed(0)}%</p>
                </div>
            `;
            container.appendChild(goalCard);
        });
    }

    if (newGoalButton) {
        newGoalButton.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('New goal button clicked');
            if (newGoalOverlay) {
                console.log('Opening overlay');
                newGoalOverlay.style.display = 'flex';
            } else {
                console.log('Overlay not found');
            }
        });
    } else {
        console.log('New goal button not found');
    }

    if (closeNewGoalBtn) {
        closeNewGoalBtn.addEventListener('click', () => {
            if (newGoalOverlay) newGoalOverlay.style.display = 'none';
        });
    }

    if (newGoalOverlay) {
        newGoalOverlay.addEventListener('click', (e) => {
            if (e.target === newGoalOverlay) newGoalOverlay.style.display = 'none';
        });
    }

    if (newGoalForm) {
        newGoalForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const newGoal = {
                id: Date.now(),
                name: newGoalForm.goalName.value.trim(),
                targetAmount: parseFloat(newGoalForm.goalTarget.value),
                icon: newGoalForm.goalIcon.value,
                currentAmount: 0,
                contributions: []
            };

            savingsGoals.push(newGoal);
            localStorage.setItem('savingsGoals', JSON.stringify(savingsGoals));

            renderSavingsGoals();
            populateSavingsGoalSelect();

            newGoalForm.reset();
            if (newGoalOverlay) newGoalOverlay.style.display = 'none';
        });
    }

    renderSavingsGoals();
    populateSavingsGoalSelect();

    // image keyboard placeholders (alpha / numeric)
    (function () {
        const container = document.getElementById('imageKeyboard');
        const img = document.getElementById('keyboardImage');
        if (!container || !img) return;

        const alphaPath = 'assets\\alpha-keyboard.jpg';
        const numericPath = 'assets\\numeric-keyboard.jpg';

        function showKeyboardFor(el) {
            // choose numeric if input type/role indicates numeric
            const isNumeric = el.type === 'number' || el.inputMode === 'numeric' || el.type === 'date' || el.dataset.numeric === 'true';
            img.src = isNumeric ? numericPath : alphaPath;
            container.style.display = 'flex';
        }
        function hideKeyboard() {
            img.src = '';
            container.style.display = 'none';
        }

        // show when any input/textarea is clicked into
        document.addEventListener('focusin', (e) => {
            const el = e.target;
            if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) return;
            if (el.dataset.noKeyboard === 'true') return;
            showKeyboardFor(el);
        });

        // hide when user clicks away
        document.addEventListener('focusout', (e) => {
            setTimeout(() => {
                const active = document.activeElement;
                if (!(active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement)) {
                    hideKeyboard();
                }
            }, 10);
        });

        // also hide when clicking outside inputs
        document.addEventListener('click', (e) => {
            const clickedInput = e.target.closest('input,textarea');
            const clickedKeyboard = e.target.closest('#imageKeyboard');
            if (!clickedInput && !clickedKeyboard) hideKeyboard();
        });

        // hide when overlays close
        const overlays = ['popupOverlay', 'newEntryOverlay', 'newPlanOverlay', 'newGoalOverlay'];
        overlays.forEach(id => {
            const ov = document.getElementById(id);
            if (!ov) return;
            const obs = new MutationObserver(() => {
                const style = getComputedStyle(ov);
                if (style.display === 'none') {
                    // if no input clicked into, hide the keyboard
                    const active = document.activeElement;
                    if (!(active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement)) hideKeyboard();
                }
            });
            obs.observe(ov, { attributes: true, attributeFilter: ['style'] });
        });

    })();

    // hide category options when entry type is income
    (function () {
        function updateCategoryVisibility() {
            const categoryRow = document.getElementById('categoryRow');
            const checked = document.querySelector('input[name="entryType"]:checked');
            if (!categoryRow || !checked) return;
            categoryRow.style.display = (checked.value === 'credit') ? 'none' : 'block';
        }

        document.querySelectorAll('input[name="entryType"]').forEach(r => {
            r.addEventListener('change', updateCategoryVisibility);
        });

        const newEntryOverlay = document.getElementById('newEntryOverlay');
        if (newEntryOverlay) {
            const mo = new MutationObserver(() => {
                if (getComputedStyle(newEntryOverlay).display !== 'none') updateCategoryVisibility();
            });
            mo.observe(newEntryOverlay, { attributes: true, attributeFilter: ['style', 'class'] });
        }

        updateCategoryVisibility();
    })();

    (function () {
        const controlsPresent = document.getElementById('all-activity-controls');
        if (!controlsPresent) return;

        const listEl = document.getElementById('all-activity-list');
        const filterType = document.getElementById('filterType');
        const filterDateFrom = document.getElementById('filterDateFrom');
        const filterDateTo = document.getElementById('filterDateTo');
        const filterCategory = document.getElementById('filterCategory');
        const filterDescription = document.getElementById('filterDescription');
        const filterSort = document.getElementById('filterSort');
        const applyBtn = document.getElementById('applyAllFilters');
        const clearBtn = document.getElementById('clearAllFilters');

        function getUniqueCategories() {
            const cats = new Set();
            (entries || []).forEach(e => {
                if (e.category) cats.add(e.category);
            });
            return Array.from(cats).sort();
        }

        function populateCategoryFilter() {
            filterCategory.innerHTML = '<option value="all">All</option>';
            const cats = getUniqueCategories();
            cats.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c;
                opt.textContent = c;
                filterCategory.appendChild(opt);
            });
        }

        function createCardForEntry(entry) {
            const btn = document.createElement('button');
            btn.className = 'rounded-rectangle openPopupBtn';
            btn.type = 'button';

            const details = document.createElement('div');
            details.className = 'details';
            const about = document.createElement('div');
            about.className = 'about';

            const dateP = document.createElement('p');
            dateP.className = 'date';
            dateP.textContent = entry.date || '';

            const typeP = document.createElement('p');
            typeP.className = 'charge-or-credit';
            typeP.textContent = (entry.type === 'credit' ? 'Credit' : 'Charge');

            const amountP = document.createElement('p');
            amountP.className = (entry.type === 'credit' ? 'amount-plus' : 'amount-minus');
            const sign = (entry.type === 'credit' ? '+' : '-');
            amountP.textContent = `${sign}$${(Number(entry.amount) || 0).toFixed(2)}`;

            details.appendChild(dateP);
            details.appendChild(typeP);
            details.appendChild(amountP);

            const descP = document.createElement('p');
            descP.className = 'description';
            descP.innerHTML = `<strong>Description:</strong> ${entry.description || '—'}`;

            about.appendChild(descP);

            // for income entries do NOT show category
            // show recurring frequency text instead
            // second function doing basically the same as line 113, but idk how to remove it lol
            // they're 2 independent blocks that build the same card, one inside the main renderEntries and one inside the All Activity IIFE
            if (entry.type === 'credit') {
                let recText = '';
                if (entry.recurringId) {
                    const plan = (recurringPlans || []).find(p => p.id === entry.recurringId);
                    if (plan && plan.frequency) recText = `(recurring ${plan.frequency})`;
                    else recText = '(recurring)';
                } else if (entry.recurring && typeof entry.recurring === 'string') {
                    recText = `(recurring ${entry.recurring})`;
                }
                if (recText) {
                    const recP = document.createElement('p');
                    recP.className = 'recurring';
                    recP.textContent = recText;
                    about.appendChild(recP);
                }
            } else {
                if (entry.category) {
                    const catP = document.createElement('p');
                    catP.className = 'category';
                    catP.innerHTML = `<strong>Category:</strong> ${entry.category || '—'}`;
                    about.appendChild(catP);
                }
                if (entry.recurringId || entry.recurring) {
                    const recP = document.createElement('p');
                    recP.className = 'recurring';
                    recP.textContent = '(Recurring)';
                    about.appendChild(recP);
                }
            }

            btn.appendChild(details);
            btn.appendChild(about);

            btn.addEventListener('click', (e) => {
                e.preventDefault();
                if (typeof openDetailPopup === 'function') openDetailPopup(entry);
            });

            return btn;
        }

        function applyAllFilters(returnAll = false) {
            const typeVal = filterType.value;
            const fromVal = filterDateFrom.value;
            const toVal = filterDateTo.value;
            const catVal = filterCategory.value;
            const descVal = (filterDescription.value || '').trim().toLowerCase();
            const sortVal = filterSort.value;

            let results = (entries || []).slice();

            // filter by type
            if (typeVal && typeVal !== 'all') results = results.filter(r => r.type === typeVal);

            // date range
            if (fromVal) {
                const fromDate = new Date(fromVal);
                results = results.filter(r => new Date(r.date) >= fromDate);
            }
            if (toVal) {
                const toDate = new Date(toVal);
                toDate.setHours(23,59,59,999);
                results = results.filter(r => new Date(r.date) <= toDate);
            }

            // category
            if (catVal && catVal !== 'all') results = results.filter(r => r.category === catVal);

            // description search
            if (descVal) results = results.filter(r => (r.description || '').toLowerCase().includes(descVal));

            // sort
            results.sort((a,b) => {
                if (sortVal === 'most-recent') return new Date(b.date) - new Date(a.date);
                if (sortVal === 'least-recent') return new Date(a.date) - new Date(b.date);
                if (sortVal === 'highest-amount') return (Number(b.amount) || 0) - (Number(a.amount) || 0);
                if (sortVal === 'lowest-amount') return (Number(a.amount) || 0) - (Number(b.amount) || 0);
                return new Date(b.date) - new Date(a.date);
            });

            renderAllActivity(results, returnAll ? undefined :  /* limit when called interactively */ undefined);
            return results;
        }

        function renderAllActivity(results) {
            if (!Array.isArray(results)) {
                results = applyAllFilters(true);
            }

            // render all matching results into the list; scrolling is handled by CSS
            listEl.innerHTML = '';
            if (!results.length) {
                const p = document.createElement('p');
                p.style.textAlign = 'center';
                p.style.color = '#666';
                p.style.margin = '2rem';
                p.textContent = 'No activity for selected filters.';
                listEl.appendChild(p);
            } else {
                results.forEach(entry => {
                    listEl.appendChild(createCardForEntry(entry));
                });
            }
        }

        // initial population: categories and show 5 most recent -> now render all but CSS shows ~4 visible
        populateCategoryFilter();
        const initialSorted = (entries || []).slice().sort((a,b) => new Date(b.date) - new Date(a.date));
        renderAllActivity(initialSorted); // <-- render all, CSS will show ~4 and allow scroll

        applyBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const results = applyAllFilters(true);
            renderAllActivity(results); // show all matched results, should be scrollable
        });

        clearBtn.addEventListener('click', (e) => {
            e.preventDefault();
            filterType.value = 'all';
            filterDateFrom.value = '';
            filterDateTo.value = '';
            filterCategory.value = 'all';
            filterDescription.value = '';
            filterSort.value = 'most-recent';
            populateCategoryFilter();
            // top 5
            const sorted = (entries || []).slice().sort((a,b) => new Date(b.date) - new Date(a.date));
            renderAllActivity(sorted.slice(0,5), 5);
        });

        // update category list if entries change (observe LS changes)
        window.addEventListener('storage', (ev) => {
            if (ev.key === 'financeEntries' || ev.key === 'budgetPlans') {
                populateCategoryFilter();
            }
        });

    })();
});