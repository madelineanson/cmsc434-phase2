document.addEventListener('DOMContentLoaded', function () {
    // existing detail popup
    const openPopupBtns = document.querySelectorAll('.openPopupBtn');
    const closePopupBtn = document.getElementById('closePopupBtn');
    const popupOverlay = document.getElementById('popupOverlay');

    if (popupOverlay && openPopupBtns.length > 0) {
        function openOverlay() { popupOverlay.style.display = 'flex'; }
        function closeOverlay() { popupOverlay.style.display = 'none'; }

        openPopupBtns.forEach(btn => btn.addEventListener('click', openOverlay));
        if (closePopupBtn) closePopupBtn.addEventListener('click', closeOverlay);
        popupOverlay.addEventListener('click', function (event) {
            if (event.target === popupOverlay) closeOverlay();
        });
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeOverlay(); });
    }

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
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeNewEntry(); });

    if (newEntryForm) {
        newEntryForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const data = {
                date: newEntryForm.entryDate.value,
                type: newEntryForm.entryType.value,
                amount: parseFloat(newEntryForm.entryAmount.value || 0),
                description: newEntryForm.entryDescription.value.trim(),
                category: newEntryForm.entryCategory.value
            };
            console.log('New entry submitted:', data);
            // TODO: later append to the rectangles. for now just close and reset.
            newEntryForm.reset();
            entryDate.value = new Date().toISOString().slice(0, 10);
            closeNewEntry();
        });
    }
});