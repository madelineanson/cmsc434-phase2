document.addEventListener('DOMContentLoaded', function () {
    // Load entries from localStorage
    let entries = JSON.parse(localStorage.getItem('financeEntries')) || [];
    let recurringPlans = JSON.parse(localStorage.getItem('recurringPlans')) || [];

    // the default categories made are used when there's no plan for current month
    const defaultCategories = [
        'Fun', 'Groceries', 'Rent', 'Utilities',
        'Insurance', 'Education', 'Transportation', 'Health'
    ];

    function getCurrentMonthKey() {
        // returns YYYY-MM for current month
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

    // close overlay with Escape
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeOverlay();
    });

    function openDetailPopup(entry) {
        if (!popupOverlay || !popupContent) return;

        // view mode: show bigger details + Edit/Delete buttons
        popupContent.innerHTML = `
            <h2>Transaction Details</h2>
            <div style="text-align: left; margin: 1rem 0;">
                <p><strong>Date:</strong> ${entry.date}</p>
                <p><strong>Type:</strong> ${entry.type === 'credit' ? 'Income' : 'Charge'}</p>
                <p class="${entry.type === 'credit' ? 'amount-plus' : 'amount-minus'}"><strong>Amount:</strong> ${entry.type === 'credit' ? '+' : '-'}$${entry.amount.toFixed(2)}</p>
                <p><strong>Description:</strong> ${entry.description || 'N/A'}</p>
                <p><strong>Category:</strong> ${entry.category || 'N/A'}</p>
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

        // build edit form (reuse popup-form styles)
        popupContent.innerHTML = `
            <h2>Edit Transaction</h2>
            <form id="editTxnForm" class="popup-form" style="text-align:left;">
                <label for="editEntryDate">Date</label>
                <input type="date" id="editEntryDate" name="editEntryDate" value="${entry.date}" required>

                <fieldset class="entry-type">
                    <legend>Type</legend>
                    <label><input type="radio" name="editEntryType" value="debit" ${entry.type === 'debit' ? 'checked' : ''}> Charge</label>
                    <label><input type="radio" name="editEntryType" value="credit" ${entry.type === 'credit' ? 'checked' : ''}> Income</label>
                </fieldset>

                <label for="editEntryAmount">Amount</label>
                <input type="number" id="editEntryAmount" name="editEntryAmount" step="0.01" min="0" value="${entry.amount}" required>

                <label for="editEntryDescription">Description</label>
                <input type="text" id="editEntryDescription" name="editEntryDescription" maxlength="200" value="${(entry.description || '').replace(/"/g, '&quot;')}">

                <label for="editEntryCategory">Category</label>
                <select id="editEntryCategory" name="editEntryCategory">
                    <option value="">(None)</option>
                    <option value="groceries">Groceries</option>
                    <option value="fun">Fun</option>
                    <option value="school">School</option>
                    <option value="rent">Rent</option>
                </select>

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

        // show overlay (already visible if coming from view)
        popupOverlay.style.display = 'flex';

        const editForm = document.getElementById('editTxnForm');
        const cancelBtn = document.getElementById('cancelEditBtn');
        const deleteBtn = document.getElementById('deleteWhileEditingBtn');

        // save handler
        editForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const updated = {
                id: entry.id,
                date: document.getElementById('editEntryDate').value,
                type: document.querySelector('input[name="editEntryType"]:checked').value,
                amount: parseFloat(document.getElementById('editEntryAmount').value || 0),
                description: document.getElementById('editEntryDescription').value.trim(),
                category: document.getElementById('editEntryCategory').value
            };

            // replace in entries array
            entries = entries.map(en => en.id === entry.id ? updated : en);
            localStorage.setItem('financeEntries', JSON.stringify(entries));
            closeOverlay();
            renderEntries();
        });

        // cancel -> go back to view mode for same entry
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => openDetailPopup(entry));
        }

        // delete while editing
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                entries = entries.filter(e => e.id !== entry.id);
                localStorage.setItem('financeEntries', JSON.stringify(entries));
                closeOverlay();
                renderEntries();
            });
        }
    }

    // Render entries to the page
    function renderEntries() {
        const container = document.getElementById('recent-activity');
        if (!container) return;

        // Find the "All Activity" button to preserve it
        const allActivityBtn = document.getElementById('all-activity-button');

        // Clear existing entry buttons but keep the "All Activity" button
        const buttons = container.querySelectorAll('.rounded-rectangle');
        buttons.forEach(btn => btn.remove());

        // Sort entries by date (newest first)
        const sortedEntries = [...entries].sort((a, b) => new Date(b.date) - new Date(a.date));

        // Render each entry
        sortedEntries.forEach((entry) => {
            const button = document.createElement('button');
            button.className = 'rounded-rectangle openPopupBtn';

            const typeLabel = entry.type === 'credit' ? 'Income' : 'Charge';
            const amountClass = entry.type === 'credit' ? 'amount-plus' : 'amount-minus';
            const amountSign = entry.type === 'credit' ? '+' : '-';

            button.innerHTML = `
                <div class="details">
                    <p class="date">${entry.date}</p>
                    <p class="charge-or-credit">${typeLabel}</p>
                    <p class="${amountClass}">${amountSign}$${entry.amount.toFixed(2)}</p>
                </div>
                <div class="about">
                    <p class="description"><strong>Description:</strong> ${entry.description || 'N/A'}</p>
                    ${entry.category ? `<p class="category"><strong>Category:</strong> ${entry.category}</p>` : ''}
                </div>
            `;

            button.addEventListener('click', () => openDetailPopup(entry));

            // Insert before the "All Activity" button if it exists
            if (allActivityBtn) {
                container.insertBefore(button, allActivityBtn);
            } else {
                container.appendChild(button);
            }
        });
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
            // plan: { id, nextDate (YYYY-MM-DD), frequency, templateEntry }
            while (plan.nextDate && plan.nextDate <= today) {
                // create a new entry using templateEntry but with the plan.nextDate
                const ent = Object.assign({}, plan.templateEntry);
                ent.id = Date.now() + Math.floor(Math.random() * 1000);
                ent.date = plan.nextDate;
                // mark generatedFromRecurring so UI can show it if needed
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

    // run recurring processing on load before render
    processRecurringPlans();
    // Initial render
    renderEntries();

    // new-entry form popup controls (wiring)
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
    // initial show/hide based on selected radio
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

    // open/close overlay handlers (keep existing logic)
    if (newEntryButton) newEntryButton.addEventListener('click', function (e) {
        e.preventDefault();
        if (entryDate) entryDate.value = new Date().toISOString().slice(0, 10);
        newEntryForm.reset();
        showIncomeOptions(false);
        recurrenceControls.style.display = 'none';
        savingsControls.style.display = 'none';
        populateEntryCategorySelect(); // <-- ensure categories reflect current-month plan
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

    // Save new entry (and setup recurring plan if requested)
    newEntryForm?.addEventListener('submit', function (e) {
        e.preventDefault();
        const data = {
            id: Date.now(),
            date: newEntryForm.entryDate.value,
            type: newEntryForm.entryType.value,
            amount: parseFloat(newEntryForm.entryAmount.value || 0),
            description: newEntryForm.entryDescription.value.trim(),
            category: newEntryForm.entryCategory.value,
        };

        // savings contribution capture
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

        entries.push(data);
        localStorage.setItem('financeEntries', JSON.stringify(entries));

        // If income + recurring, create a recurringPlan entry
        if (data.type === 'credit' && entryRecurringCheckbox && entryRecurringCheckbox.checked) {
            const freq = recurrenceFrequency.value || 'monthly';
            const nextDate = advanceDateByFrequency(data.date, freq); // next occurrence after saved date
            const plan = {
                id: Date.now() + Math.floor(Math.random() * 1000),
                frequency: freq,
                nextDate: nextDate,
                templateEntry: {
                    // template for generated entries (type, amount, description, category, contribution)
                    type: data.type,
                    amount: data.amount,
                    description: data.description,
                    category: data.category,
                    contribution: data.contribution
                }
            };
            recurringPlans.push(plan);
            localStorage.setItem('recurringPlans', JSON.stringify(recurringPlans));
        }

        // close and refresh UI
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
        return `${year}-${month.toString().padStart(2,'0')}`; 
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
        populateEntryCategorySelect(); // <-- refresh entry categories if plan affects current month
        closeNewPlan();
    });

    // render to starttt!
    renderPlans();

    // on page load populate entry categories
    populateEntryCategorySelect();

    // open new-entry overlay (update to populate categories each time)
    if (newEntryButton) newEntryButton.addEventListener('click', function (e) {
        e.preventDefault();
        if (entryDate) entryDate.value = new Date().toISOString().slice(0, 10);
        newEntryForm.reset();
        showIncomeOptions(false);
        recurrenceControls.style.display = 'none';
        savingsControls.style.display = 'none';
        populateEntryCategorySelect(); // <-- ensure categories reflect current-month plan
        newEntryOverlay.style.display = 'flex';
    });

    // virtual keyboard :)
    (function () {
        const VK_ID = 'virtualKeyboard';
        const VK_KEY_CLASS = 'vk-key';

        function createKeyboard() {
            if (document.getElementById(VK_ID)) return;
            const vk = document.createElement('div');
            vk.id = VK_ID;
            vk.innerHTML = `
      <div class="vk-inner">
        <div class="vk-letters">
          <div class="vk-row">
            <div class="${VK_KEY_CLASS}" data-key="q">q</div>
            <div class="${VK_KEY_CLASS}" data-key="w">w</div>
            <div class="${VK_KEY_CLASS}" data-key="e">e</div>
            <div class="${VK_KEY_CLASS}" data-key="r">r</div>
            <div class="${VK_KEY_CLASS}" data-key="t">t</div>
            <div class="${VK_KEY_CLASS}" data-key="y">y</div>
            <div class="${VK_KEY_CLASS}" data-key="u">u</div>
            <div class="${VK_KEY_CLASS}" data-key="i">i</div>
            <div class="${VK_KEY_CLASS}" data-key="o">o</div>
            <div class="${VK_KEY_CLASS}" data-key="p">p</div>
          </div>
          <div class="vk-row">
            <div class="${VK_KEY_CLASS}" data-key="a">a</div>
            <div class="${VK_KEY_CLASS}" data-key="s">s</div>
            <div class="${VK_KEY_CLASS}" data-key="d">d</div>
            <div class="${VK_KEY_CLASS}" data-key="f">f</div>
            <div class="${VK_KEY_CLASS}" data-key="g">g</div>
            <div class="${VK_KEY_CLASS}" data-key="h">h</div>
            <div class="${VK_KEY_CLASS}" data-key="j">j</div>
            <div class="${VK_KEY_CLASS}" data-key="k">k</div>
            <div class="${VK_KEY_CLASS}" data-key="l">l</div>
          </div>
          <div class="vk-row">
            <div class="${VK_KEY_CLASS}" data-fn="left">◀</div>
            <div class="${VK_KEY_CLASS}" data-key="z">z</div>
            <div class="${VK_KEY_CLASS}" data-key="x">x</div>
            <div class="${VK_KEY_CLASS}" data-key="c">c</div>
            <div class="${VK_KEY_CLASS}" data-key="v">v</div>
            <div class="${VK_KEY_CLASS}" data-key="b">b</div>
            <div class="${VK_KEY_CLASS}" data-key="n">n</div>
            <div class="${VK_KEY_CLASS}" data-key="m">m</div>
            <div class="${VK_KEY_CLASS}" data-fn="right">▶</div>
          </div>
          <div class="vk-row vk-row-bottom">
            <div class="${VK_KEY_CLASS} vk-key-wide" data-fn="space">Space</div>
            <div class="${VK_KEY_CLASS}" data-fn="back">⌫</div>
            <div class="${VK_KEY_CLASS}" data-fn="dot">.</div>
            <div class="${VK_KEY_CLASS} vk-key-action" data-fn="enter">Enter</div>
            <div class="${VK_KEY_CLASS} vk-key-done" data-fn="done">Done</div>
          </div>
        </div>

        <div class="vk-numeric" style="display:none;">
          <div class="vk-row">
            <div class="${VK_KEY_CLASS}" data-key="7">7</div>
            <div class="${VK_KEY_CLASS}" data-key="8">8</div>
            <div class="${VK_KEY_CLASS}" data-key="9">9</div>
          </div>
          <div class="vk-row">
            <div class="${VK_KEY_CLASS}" data-key="4">4</div>
            <div class="${VK_KEY_CLASS}" data-key="5">5</div>
            <div class="${VK_KEY_CLASS}" data-key="6">6</div>
          </div>
          <div class="vk-row">
            <div class="${VK_KEY_CLASS}" data-key="1">1</div>
            <div class="${VK_KEY_CLASS}" data-key="2">2</div>
            <div class="${VK_KEY_CLASS}" data-key="3">3</div>
          </div>
          <div class="vk-row vk-row-bottom">
            <div class="${VK_KEY_CLASS} vk-key-wide" data-key="0">0</div>
            <div class="${VK_KEY_CLASS}" data-fn="dot">.</div>
            <div class="${VK_KEY_CLASS}" data-fn="back">⌫</div>
            <div class="${VK_KEY_CLASS} vk-key-action" data-fn="enter">Enter</div>
            <div class="${VK_KEY_CLASS} vk-key-done" data-fn="done">Done</div>
          </div>
        </div>
      </div>
    `;
            vk.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:2000;display:flex;justify-content:center;padding:.4rem;background:linear-gradient(180deg,#3f5474,#4B628B);box-shadow:0 -6px 18px rgba(0,0,0,.35);';
            document.body.appendChild(vk);

            vk.addEventListener('click', (e) => {
                const btn = e.target.closest('.' + VK_KEY_CLASS);
                if (!btn || !VirtualKeyboard.activeInput) return;
                const fn = btn.dataset.fn;
                const key = btn.dataset.key;
                VirtualKeyboard.handleKey(fn, key);
            });
        }

        const VirtualKeyboard = {
            activeInput: null,
            caretPos: 0,
            mode: 'text',
            showFor(input) {
                if (!input) return;
                createKeyboard();
                this.activeInput = input;
                // mark readonly to prevent native mobile keyboard; keep ability to paste programmatically
                try { input.readOnly = true; } catch (e) { }
                this.caretPos = input.value ? input.value.length : 0;
                // determine numeric mode
                this.mode = (input.type === 'number' || input.inputMode === 'numeric' || input.type === 'date') ? 'numeric' : 'text';
                const vk = document.getElementById(VK_ID);
                if (!vk) return;
                vk.querySelector('.vk-letters').style.display = this.mode === 'text' ? 'block' : 'none';
                vk.querySelector('.vk-numeric').style.display = this.mode === 'numeric' ? 'block' : 'none';
                vk.style.display = 'flex';
            },
            hide() {
                if (this.activeInput) {
                    try { this.activeInput.readOnly = false; } catch (e) { }
                }
                this.activeInput = null;
                const vk = document.getElementById(VK_ID);
                if (vk) vk.style.display = 'none';
            },
            insertChar(ch) {
                const input = this.activeInput;
                if (!input) return;
                const v = input.value || '';
                const before = v.slice(0, this.caretPos);
                const after = v.slice(this.caretPos);
                input.value = before + ch + after;
                this.caretPos += ch.length;
                input.dispatchEvent(new Event('input', { bubbles: true }));
            },
            backspace() {
                const input = this.activeInput;
                if (!input || this.caretPos === 0) return;
                const v = input.value || '';
                input.value = v.slice(0, this.caretPos - 1) + v.slice(this.caretPos);
                this.caretPos = Math.max(0, this.caretPos - 1);
                input.dispatchEvent(new Event('input', { bubbles: true }));
            },
            moveLeft() { this.caretPos = Math.max(0, this.caretPos - 1); },
            moveRight() {
                const input = this.activeInput;
                if (!input) return;
                this.caretPos = Math.min((input.value || '').length, this.caretPos + 1);
            },
            handleKey(fn, key) {
                if (!this.activeInput) return;
                if (fn === 'space') this.insertChar(' ');
                else if (fn === 'back') this.backspace();
                else if (fn === 'left') this.moveLeft();
                else if (fn === 'right') this.moveRight();
                else if (fn === 'enter') {
                    const form = this.activeInput.form;
                    if (form) form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                } else if (fn === 'done') this.hide();
                else if (fn === 'dot') this.insertChar('.');
                else if (key) this.insertChar(key);
            }
        };

        // show keyboard for ANY input/textarea focus
        document.addEventListener('focusin', (e) => {
            const el = e.target;
            if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) return;
            // ignore inputs explicitly opting out
            if (el.dataset.noVk === 'true') return;
            VirtualKeyboard.showFor(el);
        });

        // hide when clicking outside inputs and keyboard
        document.addEventListener('click', (e) => {
            const vk = document.getElementById(VK_ID);
            if (!vk || vk.style.display === 'none') return;
            const clickedVK = vk.contains(e.target);
            const clickedInput = e.target.closest('input,textarea');
            if (!clickedVK && !clickedInput) VirtualKeyboard.hide();
        });

        // ensure keyboard hides when inputs blur via code (or overlays close)
        const obs = new MutationObserver(() => {
            const vk = document.getElementById(VK_ID);
            if (!vk) return;
            // hide if no focused input
            const active = document.activeElement;
            if (!(active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement)) VirtualKeyboard.hide();
        });
        obs.observe(document.body, { subtree: true, childList: true, attributes: true });
    })();

});