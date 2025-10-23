document.addEventListener('DOMContentLoaded', function () {
    // Load entries from localStorage
    let entries = JSON.parse(localStorage.getItem('financeEntries')) || [];

    // existing detail popup
    const closePopupBtn = document.getElementById('closePopupBtn');
    const popupOverlay = document.getElementById('popupOverlay');
    const popupContent = document.getElementById('popupContent');

    function openDetailPopup(entry) {
        if (!popupOverlay || !popupContent) return;

        const typeLabel = entry.type === 'credit' ? 'Credit' : 'Charge';
        const amountClass = entry.type === 'credit' ? 'amount-plus' : 'amount-minus';
        const amountSign = entry.type === 'credit' ? '+' : '-';

        popupContent.innerHTML = `
            <h2>Transaction Details</h2>
            <div style="text-align: left; margin: 1rem 0;">
                <p><strong>Date:</strong> ${entry.date}</p>
                <p><strong>Type:</strong> ${typeLabel}</p>
                <p class="${amountClass}"><strong>Amount:</strong> ${amountSign}$${entry.amount.toFixed(2)}</p>
                <p><strong>Description:</strong> ${entry.description || 'N/A'}</p>
                <p><strong>Category:</strong> ${entry.category || 'N/A'}</p>
            </div>
            <button id="closePopupBtn" class="closePopupBtn">Back</button>
        `;
        popupOverlay.style.display = 'flex';

        // Re-attach close button listener
        const newCloseBtn = document.getElementById('closePopupBtn');
        if (newCloseBtn) newCloseBtn.addEventListener('click', closeOverlay);
    }

    function closeOverlay() {
        if (popupOverlay) popupOverlay.style.display = 'none';
    }

    if (popupOverlay) {
        popupOverlay.addEventListener('click', function (event) {
            if (event.target === popupOverlay) closeOverlay();
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeOverlay();
    });

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

            const typeLabel = entry.type === 'credit' ? 'Credit' : 'Charge';
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

    // Initial render
    renderEntries();

    // new-entry form popup
    const newEntryButton = document.getElementById('new-entry-button');
    const newEntryOverlay = document.getElementById('newEntryOverlay');
    const closeNewEntryBtn = document.getElementById('closeNewEntryBtn');
    const newEntryForm = document.getElementById('newEntryForm');
    const entryDate = document.getElementById('entryDate');

    if (entryDate) {
        // default date to today (YYYY-MM-DD)
        entryDate.value = new Date().toISOString().slice(0, 10);
    }

    function openNewEntry() {
        if (newEntryOverlay) newEntryOverlay.style.display = 'flex';
    }

    function closeNewEntry() {
        if (newEntryOverlay) newEntryOverlay.style.display = 'none';
    }

    if (newEntryButton) newEntryButton.addEventListener('click', function (e) {
        e.preventDefault();
        openNewEntry();
    });

    if (closeNewEntryBtn) closeNewEntryBtn.addEventListener('click', closeNewEntry);

    if (newEntryOverlay) {
        newEntryOverlay.addEventListener('click', function (event) {
            if (event.target === newEntryOverlay) closeNewEntry();
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && newEntryOverlay && newEntryOverlay.style.display === 'flex') closeNewEntry();
    });

    if (newEntryForm) {
        newEntryForm.addEventListener('submit', function (e) {
            e.preventDefault();

            const data = {
                date: newEntryForm.entryDate.value,
                type: newEntryForm.entryType.value,
                amount: parseFloat(newEntryForm.entryAmount.value || 0),
                description: newEntryForm.entryDescription.value.trim(),
                category: newEntryForm.entryCategory.value,
                id: Date.now() // unique ID for each entry
            };

            entries.push(data);
            localStorage.setItem('financeEntries', JSON.stringify(entries));
            renderEntries();

            newEntryForm.reset();
            entryDate.value = new Date().toISOString().slice(0, 10);
            closeNewEntry();
        });
    }

    if (document.getElementById('piechart')) {
        google.charts.load('current', { packages: ['corechart'] });
        google.charts.setOnLoadCallback(drawPie);

        function drawPie() {
            const data = google.visualization.arrayToDataTable([
                ['Category', 'Amount'],
                ['Groceries', 300],
                ['Fun', 120],
                ['School', 220],
                ['Rent', 800]
            ]);

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

    // budget-plans popup

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

    function populateMonthOptions() {
        planMonth.innerHTML = '';
        const today = new Date();
        for (let i = 0; i < 12; i++) {
            const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
            const opt = document.createElement('option');
            opt.value = d.toISOString().slice(0,7);
            opt.textContent = formatMonthLabel(d);
            planMonth.appendChild(opt);
        }
    }

    function createCategoryRow(cat = { name:'', amount:0 }) {
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
                const [y,m] = optVal.split('-');
                tempOpt.textContent = new Date(y, m-1, 1).toLocaleString(undefined, { month:'long', year:'numeric' });
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
            label.textContent = new Date(plan.month + '-01').toLocaleString(undefined, { month:'long', year:'numeric' });
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
        if (!confirm('Delete this plan?')) return;
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
        closeNewPlan();
    });

    // render to starttt!
    renderPlans();

});