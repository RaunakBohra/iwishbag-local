// Access customsCategories from scripts.js via global/localStorage or local declaration
let customsCategories = window.getCustomsCategories ? window.getCustomsCategories() : JSON.parse(localStorage.getItem('customsCategories')) || {
    "electronics": 15,
    "clothing": 5,
    "books": 0,
    "furniture": 10
};

console.log('manage-customs.js loaded');

function saveCategories() {
    localStorage.setItem('customsCategories', JSON.stringify(customsCategories));
    // Update the global customsCategories if it exists
    if (window.getCustomsCategories && typeof window.getCustomsCategories === 'function') {
        window.getCustomsCategories(customsCategories);
    }
    console.log('Saved customsCategories to localStorage:', customsCategories);
}

function populateCustomsTable() {
    console.log('Populating customs table with:', customsCategories);
    const tbody = document.getElementById('customsTable').getElementsByTagName('tbody')[0];
    if (!tbody) {
        console.error('tbody element not found in DOM');
        return;
    }
    tbody.innerHTML = '';
    for (const category in customsCategories) {
        const percent = customsCategories[category];
        const escapedCategory = category.replace(/'/g, "\\'");
        const row = document.createElement('tr');
        row.innerHTML = `
            <td style="padding: 10px;">${category}</td>
            <td style="padding: 10px;">${percent.toFixed(2)}</td>
            <td style="padding: 10px;">
                <button onclick="editCategory('${escapedCategory}')">Edit</button>
                <button onclick="removeCategory('${escapedCategory}')">Delete</button>
            </td>
        `;
        tbody.appendChild(row);
    }
}

function prepopulateForm(category) {
    document.getElementById('categoryName').value = category || '';
    document.getElementById('customsPercent').value = category ? customsCategories[category] : '';
    if (category) {
        document.getElementById('categoryName').readOnly = true;
        document.getElementById('saveCategoryBtn').style.display = 'none';
        document.getElementById('updateCategoryBtn').style.display = 'block';
    } else {
        document.getElementById('categoryName').readOnly = false;
        document.getElementById('saveCategoryBtn').style.display = 'block';
        document.getElementById('updateCategoryBtn').style.display = 'none';
    }
}

function validateValues(data) {
    if (!data.categoryName || data.categoryName.trim() === '') {
        throw new Error('Category Name is required.');
    }
    if (!data.customsPercent || parseFloat(data.customsPercent) < 0 || parseFloat(data.customsPercent) > 100) {
        throw new Error('Customs Duty must be a percentage between 0 and 100.');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded, initializing manage-customs.js');
    populateCustomsTable();

    document.getElementById('customsForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        const category = data.categoryName.trim().toLowerCase();

        try {
            validateValues(data);
            if (!customsCategories[category]) { // Adding new category
                customsCategories[category] = parseFloat(data.customsPercent);
                saveCategories();
                populateCustomsTable();
                alert(`Added category ${category} with ${data.customsPercent}% customs duty!`);
            } else { // Updating existing category
                customsCategories[category] = parseFloat(data.customsPercent);
                saveCategories();
                populateCustomsTable();
                alert(`Updated category ${category} to ${data.customsPercent}% customs duty!`);
            }
            document.getElementById('customsForm').reset();
            prepopulateForm('');
        } catch (error) {
            alert(error.message);
        }
    });

    window.editCategory = function(category) {
        console.log('Editing category:', category);
        prepopulateForm(category);
    };

    window.removeCategory = function(category) {
        console.log('Removing category:', category);
        if (confirm(`Are you sure you want to remove the category ${category}?`)) {
            delete customsCategories[category];
            saveCategories();
            populateCustomsTable();
            document.getElementById('customsForm').reset();
            prepopulateForm('');
            alert(`${category} removed successfully!`);
        }
    };

    document.getElementById('updateCategoryBtn').addEventListener('click', () => {
        const formData = new FormData(document.getElementById('customsForm'));
        const data = Object.fromEntries(formData.entries());
        const category = document.getElementById('categoryName').value.trim().toLowerCase();

        if (!category || !customsCategories[category]) {
            alert('Please select a valid category to update.');
            return;
        }

        try {
            validateValues(data);
            customsCategories[category] = parseFloat(data.customsPercent);
            saveCategories();
            populateCustomsTable();
            alert(`Updated category ${category} to ${data.customsPercent}% customs duty!`);
            document.getElementById('customsForm').reset();
            prepopulateForm('');
        } catch (error) {
            alert(error.message);
        }
    });

    document.getElementById('cancelBtn').addEventListener('click', () => {
        document.getElementById('customsForm').reset();
        prepopulateForm('');
        populateCustomsTable();
    });
});