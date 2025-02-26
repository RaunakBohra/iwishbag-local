// Access countrySettings and customsCategories from scripts.js via global/localStorage, without redeclaring
let countrySettings = window.getCountrySettings ? window.getCountrySettings() : JSON.parse(localStorage.getItem('countrySettings')) || {};
let customsCategories = window.getCustomsCategories ? window.getCustomsCategories() : JSON.parse(localStorage.getItem('customsCategories')) || {
    "electronics": 15,
    "clothing": 5,
    "books": 0,
    "furniture": 10
};

// Function to refresh countrySettings and customsCategories from localStorage
function refreshSettings() {
    countrySettings = window.getCountrySettings ? window.getCountrySettings() : JSON.parse(localStorage.getItem('countrySettings')) || {};
    customsCategories = window.getCustomsCategories ? window.getCustomsCategories() : JSON.parse(localStorage.getItem('customsCategories')) || {
        "electronics": 15,
        "clothing": 5,
        "books": 0,
        "furniture": 10
    };
    console.log('Refreshed countrySettings and customsCategories:', { countrySettings, customsCategories });
}

// Call refresh and expose functions before using them in critical operations, with enhanced debugging
document.addEventListener('DOMContentLoaded', () => {
    console.log('Bulk quotes script loaded');
    refreshSettings(); // Ensure latest settings on load
    // Ensure functions are exposed globally immediately
    window.showBatchQuoteForm = showBatchQuoteForm;
    window.hideBatchQuoteForm = hideBatchQuoteForm;
    console.log('Exposed showBatchQuoteForm:', typeof window.showBatchQuoteForm === 'function' ? 'Function' : 'Not a function');
    console.log('Exposed hideBatchQuoteForm:', typeof window.hideBatchQuoteForm === 'function' ? 'Function' : 'Not a function');
});

// Assume calculateVolumetricWeight, calculateShippingQuotes, convertToUserCurrency, getCurrencySymbol, and updateWeights are available from assets/quote-calculator.js and assets/scripts.js
function showBatchQuoteForm() {
    console.log('showBatchQuoteForm called');
    document.getElementById('batchQuoteForm').style.display = 'block';
    // Reinforce global exposure
    window.showBatchQuoteForm = showBatchQuoteForm;
}

function hideBatchQuoteForm() {
    console.log('hideBatchQuoteForm called');
    document.getElementById('batchQuoteForm').style.display = 'none';
    document.getElementById('batchQuoteForm').reset();
    document.getElementById('batchResults').innerHTML = '';
    // Reinforce global exposure
    window.hideBatchQuoteForm = hideBatchQuoteForm;
}

function exportBatchQuotes(results) {
    const csv = [
        'Country,Weight,Price,Category,SourceTotal,NPRTotal',
        ...results.map(r => `${r.country},${r.weight},${r.price},${r.category},${r.sourceTotal},${r.nprTotal}`)
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'batch_quotes.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    console.log('Exported batch quotes as CSV:', results);
}

document.getElementById('batchQuoteForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    refreshSettings(); // Refresh before processing batch quotes
    const batchQuotes = document.getElementById('batchQuotes').value.split('\n').map(line => line.trim().split(',')).filter(line => line.length === 4);
    let results = [];
    const length = parseFloat(document.getElementById('length').value) || 0;
    const width = parseFloat(document.getElementById('width').value) || 0;
    const height = parseFloat(document.getElementById('height').value) || 0;

    if (batchQuotes.length === 0) {
        alert('Please enter at least one quote in the format: country,weight,price,category');
        return;
    }

    batchQuotes.forEach(([country, weight, price, category]) => {
        if (!country || !weight || !price || !category) {
            console.error(`Invalid batch quote entry: ${country},${weight},${price},${category}`);
            return;
        }
        if (!countrySettings[country]) {
            console.error(`Country ${country} not found in settings`);
            return;
        }
        if (!customsCategories[category]) {
            console.error(`Customs category ${category} not found`);
            return;
        }
        const settings = countrySettings[country] || {};
        const weightNum = parseFloat(weight) || 0;
        const priceNum = parseFloat(price) || 0;
        if (weightNum <= 0 || priceNum <= 0) {
            console.error(`Invalid weight or price for ${country}: weight=${weight}, price=${price}`);
            return;
        }
        const effectiveWeight = updateWeights(weightNum, length, width, height, settings); // Use updated function to calculate effective weight
        const quote = calculateShippingQuotes(
            effectiveWeight, priceNum, 0, // Sales tax auto-populated in form, but default to 0 here for simplicity in batch
            0, // Merchant shipping (assume 0 for simplicity)
            parseFloat(customsCategories[category]) || 0,
            0, 0, 0, 0, // Domestic shipping, handling, discount, insurance (assume 0 for simplicity)
            settings
        );
        const userQuote = convertToUserCurrency(quote, settings, 'NPR');
        results.push({
            country, weight: weightNum, price: priceNum, category,
            sourceTotal: quote.finalTotal.toFixed(2),
            nprTotal: userQuote.finalTotal.toFixed(2)
        });
    });
    const batchResults = document.getElementById('batchResults');
    if (batchResults) {
        batchResults.innerHTML = `
            <h4>Batch Quote Results</h4>
            <table border="1" style="border-collapse: collapse; width: 100%; margin-top: 10px;">
                <thead>
                    <tr>
                        <th>Country</th>
                        <th>Weight</th>
                        <th>Price</th>
                        <th>Category</th>
                        <th>Source Total</th>
                        <th>NPR Total</th>
                    </tr>
                </thead>
                <tbody>${results.map(r => `
                    <tr>
                        <td>${r.country}</td>
                        <td>${r.weight}</td>
                        <td>${r.price}</td>
                        <td>${r.category.charAt(0).toUpperCase() + r.category.slice(1)}</td>
                        <td>${getCurrencySymbol(countrySettings[r.country]?.currency || 'USD')}${r.sourceTotal}</td>
                        <td>${getCurrencySymbol('NPR')}${r.nprTotal}</td>
                    </tr>
                `).join('')}</tbody>
            </table>
            <button onclick="exportBatchQuotes(${JSON.stringify(results)})">Export as CSV</button>
        `;
    } else {
        console.error('batchResults element not found in DOM');
    }
});

// Helper function to calculate effective weight using the updated weights logic from scripts.js
function updateWeights(grossWeight, length, width, height, settings) {
    // Ensure settings is not undefined and provide defaults
    if (!settings) settings = {};
    const weightUnit = settings.weightUnit || 'lbs';
    const divisor = settings.volumetricDivisor !== undefined ? settings.volumetricDivisor : (weightUnit === 'lbs' ? 166 : 6000);
    let volumetricWeight = 0;
    if (length > 0 && width > 0 && height > 0) {
        volumetricWeight = calculateVolumetricWeight(length, width, height, divisor, weightUnit);
    }
    return Math.max(grossWeight, volumetricWeight);
}