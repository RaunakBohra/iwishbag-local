// Initialize on DOM load and ensure functions are globally available
document.addEventListener('DOMContentLoaded', () => {
    console.log('Bulk quotes script loaded');
    window.showBatchQuoteForm = showBatchQuoteForm;
    window.hideBatchQuoteForm = hideBatchQuoteForm;
});
// Load necessary data from localStorag// Assume calculateVolumetricWeight, calculateShippingQuotes, convertToUserCurrency, getCurrencySymbol, updateWeights, and validateQuoteForm are available from assets/quote-calculator.js and assets/scripts.js
function showBatchQuoteForm() {
    document.getElementById('batchQuoteForm').style.display = 'block';
    // Ensure this function is globally available
    window.showBatchQuoteForm = showBatchQuoteForm;
}

function hideBatchQuoteForm() {
    document.getElementById('batchQuoteForm').style.display = 'none';
    document.getElementById('batchQuoteForm').reset();
    document.getElementById('batchResults').innerHTML = '';
    // Ensure this function is globally available
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

function validateQuoteForm() {
    const country = document.getElementById('quoteCountrySelect').value;
    const grossWeight = parseFloat(document.getElementById('grossWeight').value) || 0;
    const itemPrice = parseFloat(document.getElementById('itemPrice').value) || 0;
    const customsCategory = document.getElementById('customsCategory').value;

    if (!country) {
        alert('Please select a sourcing country.');
        return false;
    }
    if (grossWeight <= 0) {
        alert('Gross weight must be greater than 0.');
        return false;
    }
    if (itemPrice <= 0) {
        alert('Product price must be greater than 0.');
        return false;
    }
    if (!customsCategory) {
        alert('Please select a customs category.');
        return false;
    }
    return true;
}

document.getElementById('batchQuoteForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!validateQuoteForm()) return;
    const batchQuotes = document.getElementById('batchQuotes').value.split('\n').map(line => line.trim().split(',')).filter(line => line.length === 4);
    let results = [];
    const length = parseFloat(document.getElementById('length').value) || 0;
    const width = parseFloat(document.getElementById('width').value) || 0;
    const height = parseFloat(document.getElementById('height').value) || 0;
    batchQuotes.forEach(([country, weight, price, category]) => {
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
    const divisor = settings.volumetricDivisor || (settings.weightUnit === 'lbs' ? 166 : 6000);
    let volumetricWeight = 0;
    if (length > 0 && width > 0 && height > 0) {
        volumetricWeight = calculateVolumetricWeight(length, width, height, divisor, settings.weightUnit || 'lbs');
    }
    return Math.max(grossWeight, volumetricWeight);
}

