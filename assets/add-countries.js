console.log('add-countries.js loaded');

// Load settings from localStorage or use empty defaults
let countrySettings = JSON.parse(localStorage.getItem('countrySettings')) || {};
let availableSourcingCountries = JSON.parse(localStorage.getItem('availableSourcingCountries')) || [];

if (availableSourcingCountries.length === 0 && Object.keys(countrySettings).length > 0) {
    availableSourcingCountries = Object.keys(countrySettings);
    saveSourcingCountries();
    console.log('Synchronized availableSourcingCountries with countrySettings:', availableSourcingCountries);
}

function saveSettings() {
    localStorage.setItem('countrySettings', JSON.stringify(countrySettings));
    console.log('Saved countrySettings to localStorage:', countrySettings);
}
function saveSourcingCountries() {
    localStorage.setItem('availableSourcingCountries', JSON.stringify(availableSourcingCountries));
    console.log('Saved availableSourcingCountries to localStorage:', availableSourcingCountries);
}

function populateCountryTable() {
    console.log('Populating country table with:', { countrySettings, availableSourcingCountries });
    const tbody = document.getElementById('countriesTable').getElementsByTagName('tbody')[0];
    tbody.innerHTML = '';
    const countriesToDisplay = availableSourcingCountries.length > 0 ? availableSourcingCountries : Object.keys(countrySettings);
    for (const country of countriesToDisplay) {
        if (countrySettings[country]) {
            const settings = countrySettings[country];
            const row = document.createElement('tr');
            row.innerHTML = `
                <td style="padding: 10px;">${country}</td>
                <td style="padding: 10px;">${settings.currency || '-'}</td>
                <td style="padding: 10px;">${settings.weightUnit || '-'}</td>
                <td style="padding: 10px;">${(settings.exchangeRateNPR || 0).toFixed(2)}</td>
                <td style="padding: 10px;">${(settings.salesTax || 0).toFixed(2)}</td>
                <td style="padding: 10px;">${(settings.minShipping || 0).toFixed(2)}</td>
                <td style="padding: 10px;">${(settings.additionalShipping || 0).toFixed(2)}</td>
                <td style="padding: 10px;">${(settings.additionalWeight || 0).toFixed(2)}</td>
                <td style="padding: 10px;">${(settings.paymentGatewayFixedFee || 0).toFixed(2)}</td>
                <td style="padding: 10px;">${(settings.paymentGatewayPercentFee || 0).toFixed(2)}</td>
                <td style="padding: 10px;">
                    <button onclick="editCountry('${country}')">Edit</button>
                    <button onclick="removeCountry('${country}')">Delete</button>
                </td>
            `;
            tbody.appendChild(row);
        }
    }
}

function prepopulateForm(country) {
    const settings = countrySettings[country] || {};
    document.getElementById('countryName').value = country || '';
    document.getElementById('exchangeRateNPR').value = settings.exchangeRateNPR || '';
    document.getElementById('weightUnit').value = settings.weightUnit || 'lbs';
    document.getElementById('currency').value = settings.currency || '';
    document.getElementById('salesTax').value = settings.salesTax || '';
    document.getElementById('minShipping').value = settings.minShipping || '';
    document.getElementById('additionalShipping').value = settings.additionalShipping || '';
    document.getElementById('additionalWeight').value = settings.additionalWeight || '';
    document.getElementById('paymentGatewayFixedFee').value = settings.paymentGatewayFixedFee || '0';
    document.getElementById('paymentGatewayPercentFee').value = settings.paymentGatewayPercentFee || '0';
    if (country) {
        document.getElementById('countryName').readOnly = true;
        document.getElementById('saveCountryBtn').style.display = 'none';
        document.getElementById('updateCountryBtn').style.display = 'block';
    } else {
        document.getElementById('countryName').readOnly = false;
        document.getElementById('saveCountryBtn').style.display = 'block';
        document.getElementById('updateCountryBtn').style.display = 'none';
    }
}

function validatePositiveValues(data) {
    const requiredFields = ['exchangeRateNPR', 'minShipping', 'additionalWeight'];
    const optionalFields = ['salesTax', 'additionalShipping', 'paymentGatewayFixedFee', 'paymentGatewayPercentFee'];
    for (const field of requiredFields) {
        if (!data[field] || parseFloat(data[field]) <= 0) {
            throw new Error(`${field.replace('NPR', '').replace('Shipping', ' ').replace('Weight', ' ').replace('Tax', ' Tax')} must be a positive value and is required.`);
        }
    }
    for (const field of optionalFields) {
        if (data[field] && parseFloat(data[field]) < 0) {
            throw new Error(`${field.replace('Shipping', ' ').replace('Tax', ' Tax')} must be a non-negative value if provided.`);
        }
    }
    if (data.salesTax && parseFloat(data.salesTax) > 100) {
        throw new Error('Sales Tax must not exceed 100%.');
    }
    if (data.additionalShipping && parseFloat(data.additionalShipping) > 100) {
        throw new Error('Additional Shipping must not exceed 100%.');
    }
    if (data.paymentGatewayPercentFee && parseFloat(data.paymentGatewayPercentFee) > 100) {
        throw new Error('Payment Gateway Percentage Fee must not exceed 100%.');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    populateCountryTable();

    document.getElementById('countriesForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        const country = data.countryName.trim().toUpperCase();

        if (!country) {
            alert('Please enter a valid country name.');
            return;
        }

        try {
            validatePositiveValues(data);
            if (!countrySettings[country]) {
                countrySettings[country] = {
                    exchangeRateNPR: parseFloat(data.exchangeRateNPR),
                    weightUnit: data.weightUnit,
                    currency: data.currency,
                    salesTax: data.salesTax ? parseFloat(data.salesTax) : 0,
                    minShipping: parseFloat(data.minShipping),
                    additionalShipping: data.additionalShipping ? parseFloat(data.additionalShipping) : 0,
                    additionalWeight: parseFloat(data.additionalWeight),
                    volumetricDivisor: data.weightUnit === 'lbs' ? 166 : 6000,
                    paymentGatewayFixedFee: data.paymentGatewayFixedFee ? parseFloat(data.paymentGatewayFixedFee) : 0,
                    paymentGatewayPercentFee: data.paymentGatewayPercentFee ? parseFloat(data.paymentGatewayPercentFee) : 0
                };
                if (!availableSourcingCountries.includes(country)) {
                    availableSourcingCountries.push(country);
                }
                saveSettings();
                saveSourcingCountries();
                populateCountryTable();
                alert(`Added ${country} with the provided settings!`);
            } else {
                countrySettings[country] = {
                    ...countrySettings[country],
                    exchangeRateNPR: parseFloat(data.exchangeRateNPR),
                    weightUnit: data.weightUnit,
                    currency: data.currency,
                    salesTax: data.salesTax ? parseFloat(data.salesTax) : 0,
                    minShipping: parseFloat(data.minShipping),
                    additionalShipping: data.additionalShipping ? parseFloat(data.additionalShipping) : 0,
                    additionalWeight: parseFloat(data.additionalWeight),
                    volumetricDivisor: data.weightUnit === 'lbs' ? 166 : 6000,
                    paymentGatewayFixedFee: data.paymentGatewayFixedFee ? parseFloat(data.paymentGatewayFixedFee) : 0,
                    paymentGatewayPercentFee: data.paymentGatewayPercentFee ? parseFloat(data.paymentGatewayPercentFee) : 0
                };
                saveSettings();
                populateCountryTable();
                alert(`Updated settings for ${country}!`);
            }
            document.getElementById('countriesForm').reset();
            prepopulateForm('');
        } catch (error) {
            alert(error.message);
        }
    });

    window.editCountry = function(country) {
        prepopulateForm(country);
        populateCountryTable();
    };

    window.removeCountry = function(country) {
        if (confirm(`Are you sure you want to remove ${country} as a country?`)) {
            delete countrySettings[country];
            const index = availableSourcingCountries.indexOf(country);
            if (index !== -1) {
                availableSourcingCountries.splice(index, 1);
                saveSettings();
                saveSourcingCountries();
                populateCountryTable();
                document.getElementById('countriesForm').reset();
                prepopulateForm('');
                alert(`${country} removed as a country!`);
            }
        }
    };

    document.getElementById('updateCountryBtn').addEventListener('click', () => {
        const formData = new FormData(document.getElementById('countriesForm'));
        const data = Object.fromEntries(formData.entries());
        const country = document.getElementById('countryName').value.trim().toUpperCase();

        if (!country || !countrySettings[country]) {
            alert('Please select a valid country to update.');
            return;
        }

        try {
            validatePositiveValues(data);
            countrySettings[country] = {
                ...countrySettings[country],
                exchangeRateNPR: parseFloat(data.exchangeRateNPR),
                weightUnit: data.weightUnit,
                currency: data.currency,
                salesTax: data.salesTax ? parseFloat(data.salesTax) : 0,
                minShipping: parseFloat(data.minShipping),
                additionalShipping: data.additionalShipping ? parseFloat(data.additionalShipping) : 0,
                additionalWeight: parseFloat(data.additionalWeight),
                volumetricDivisor: data.weightUnit === 'lbs' ? 166 : 6000,
                paymentGatewayFixedFee: data.paymentGatewayFixedFee ? parseFloat(data.paymentGatewayFixedFee) : 0,
                paymentGatewayPercentFee: data.paymentGatewayPercentFee ? parseFloat(data.paymentGatewayPercentFee) : 0
            };
            saveSettings();
            populateCountryTable();
            alert(`Updated settings for ${country}!`);
            document.getElementById('countriesForm').reset();
            prepopulateForm('');
        } catch (error) {
            alert(error.message);
        }
    });

    document.getElementById('cancelBtn').addEventListener('click', () => {
        document.getElementById('countriesForm').reset();
        prepopulateForm('');
    
        const countrySelect = document.getElementById('countrySelect');
        if (countrySelect) {
            countrySelect.value = '';
        }
    
        populateCountryTable();
    });

    // Add Clear All Data button functionality
    document.getElementById('clearDataBtn').addEventListener('click', () => {
        if (confirm('Are you sure you want to clear all data? This will remove all saved countries and settings.')) {
            localStorage.clear();
            countrySettings = {};
            availableSourcingCountries = [];
            populateCountryTable();
            document.getElementById('countriesForm').reset();
            prepopulateForm('');
            alert('All data cleared successfully!');
        }
    });
});