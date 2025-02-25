let countrySettings = JSON.parse(localStorage.getItem('countrySettings')) || {};
let availableSourcingCountries = JSON.parse(localStorage.getItem('availableSourcingCountries')) || [];
let customsCategories = JSON.parse(localStorage.getItem('customsCategories')) || {
    "electronics": 15,
    "clothing": 5,
    "books": 0,
    "furniture": 10
};

console.log('assets/scripts.js loaded successfully');
console.log('Initial customsCategories in scripts.js:', customsCategories);

function populateCountryDropdown(selectId, options, availableOnly = false) {
    const select = document.getElementById(selectId);
    if (!select) {
        console.error(`${selectId} element not found in DOM`);
        return;
    }
    select.innerHTML = '<option value="">-- Select a Country --</option>';
    const countries = availableOnly ? availableSourcingCountries : options;
    for (const country of countries) {
        if (options[country]) {
            const settings = options[country];
            const option = document.createElement('option');
            option.value = country;
            option.textContent = `${country} (${settings.currency})`;
            select.appendChild(option);
        }
    }
}

function populateCustomsDropdown() {
    const select = document.getElementById('customsCategory');
    if (!select) {
        console.error('customsCategory element not found in DOM');
        return;
    }
    select.innerHTML = '<option value="">-- Select Category --</option>';
    console.log('Populating customs dropdown with:', customsCategories);
    for (const category in customsCategories) {
        const percent = customsCategories[category];
        const option = document.createElement('option');
        option.value = category;
        option.textContent = `${category.charAt(0).toUpperCase() + category.slice(1)}`;
        select.appendChild(option);
    }
}

function updateWeightLabel() {
    const country = document.getElementById('quoteCountrySelect')?.value || '';
    const settings = countrySettings[country] || {};
    const weightUnit = settings.weightUnit || 'lbs';
    const weightUnitLabel = document.getElementById('weightUnitLabel');
    if (weightUnitLabel) {
        weightUnitLabel.textContent = weightUnit;
    } else {
        console.error('weightUnitLabel element not found in DOM');
    }
    const weightLabel = document.getElementById('weightLabel');
    if (weightLabel) {
        weightLabel.textContent = `Gross Weight (${weightUnit}):`;
    } else {
        console.error('weightLabel element not found in DOM');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded, initializing quote calculator');
    populateCountryDropdown('quoteCountrySelect', countrySettings, true);
    populateCustomsDropdown();

    const quoteCountrySelect = document.getElementById('quoteCountrySelect');
    if (quoteCountrySelect) {
        quoteCountrySelect.addEventListener('change', (e) => {
            updateWeightLabel();
            // Removed autoPopulateSalesTax call
            document.getElementById('salesTaxPrice').value = '0'; // Set sales tax to 0 by default
        });
    } else {
        console.error('quoteCountrySelect element not found in DOM');
    }

    const itemPrice = document.getElementById('itemPrice');
    if (itemPrice) {
        itemPrice.addEventListener('input', (e) => {
            // Removed autoPopulateSalesTax call
            document.getElementById('salesTaxPrice').value = '0'; // Set sales tax to 0 by default
        });
    } else {
        console.error('itemPrice element not found in DOM');
    }

    const quoteForm = document.getElementById('quoteForm');
    if (quoteForm) {
        quoteForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData.entries());
            const sourceSettings = countrySettings[data.country] || {};
            const userBaseCurrency = 'NPR';
            const grossWeight = parseFloat(data.grossWeight) || 0;

            console.log('Form data submitted:', data);
            console.log('Source settings:', sourceSettings);

            const itemPrice = parseFloat(data.itemPrice) || 0;
            const salesTaxPrice = 0; // Hardcode sales tax to 0, as auto-calculation is removed

            console.log('Calculated values:', { itemPrice, salesTaxPrice, grossWeight });

            const quote = calculateShippingQuotes(
                grossWeight, itemPrice, salesTaxPrice,
                parseFloat(data.merchantShippingPrice) || 0, parseFloat(data.customsCategory) || 0,
                parseFloat(data.domesticShipping) || 0, parseFloat(data.handlingCharge) || 0,
                parseFloat(data.discount) || 0, parseFloat(data.insuranceAmount) || 0, sourceSettings
            );
            console.log('Quote calculated:', quote);

            const userQuote = convertToUserCurrency(quote, sourceSettings, userBaseCurrency);
            console.log('User quote (NPR) calculated:', userQuote);

            const sourceSymbol = getCurrencySymbol(sourceSettings.currency || 'USD');
            const userSymbol = getCurrencySymbol(userBaseCurrency);

            const resultDiv = document.getElementById('result');
            if (resultDiv) {
                resultDiv.innerHTML = `
                    <h3>Quote Results</h3>
                    <p>Approximately it will cost you ${userSymbol}${(userQuote.finalTotal.toFixed(2))}</p>
                    <p>Effective Weight Used: ${grossWeight.toFixed(2)} ${sourceSettings.weightUnit || 'lbs'}</p>
                    <p>Customs Duty: ${customsCategories[data.customsCategory] || 0}% (Category: ${data.customsCategory.charAt(0).toUpperCase() + data.customsCategory.slice(1) || 'None'})</p>
                `;
            } else {
                console.error('result element not found in DOM');
            }
        });
    } else {
        console.error('quoteForm element not found in DOM');
    }
});

function getCurrencySymbol(currency) {
    if (!currency) return '$';
    const symbols = {
        USD: '$',
        NPR: 'NPR',
        INR: '₹',
        CNY: '¥'
    };
    return symbols[currency] || '$';
}