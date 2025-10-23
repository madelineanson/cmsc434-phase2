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
    
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeOverlay(); });

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
            
            // Insert before the "All Activity" button
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
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && newEntryOverlay && newEntryOverlay.style.display === 'flex') closeNewEntry(); });

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
            
            // Add to entries array
            entries.push(data);
            
            // Save to localStorage
            localStorage.setItem('financeEntries', JSON.stringify(entries));
            
            // Re-render the list
            renderEntries();
            
            // Reset form and close
            newEntryForm.reset();
            entryDate.value = new Date().toISOString().slice(0, 10);
            closeNewEntry();
        });
    }

    google.charts.load('current', {'packages':['corechart']});
    google.charts.setOnLoadCallback(drawChart);

    function drawChart() {

        var data = google.visualization.arrayToDataTable([
          ['Task', 'Dollars'],
          ['Savings', 2000],
          ['School', 1500],
          ['Work', 1000],
          ['Groceries', 300],
          ['Fun', 200]
        ]);

        var options = {
          title: 'October'
        };

        var chart = new google.visualization.PieChart(document.getElementById('piechart'));

        chart.draw(data, options);
      }
});