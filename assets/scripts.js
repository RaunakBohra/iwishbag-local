// Load settings from localStorage or use empty defaults
let countrySettings = JSON.parse(localStorage.getItem('countrySettings')) || {};
let availableSourcingCountries = JSON.parse(localStorage.getItem('availableSourcingCountries')) || [];

console.log('assets/scripts.js loaded successfully');

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
            option.textContent = `${country} (${settings.currency}, ${settings.weightUnit}, Sales Tax: ${settings.salesTax || 0}%, Min Shipping: $${settings.minShipping || 0})`;
            select.appendChild(option);
        }
    }
}

function updateWeightLabel() {
    const country = document.getElementById('quoteCountrySelect')?.value || '';
    const settings = countrySettings[country] || {};
    const weightUnit = settings.weightUnit || 'lbs';
    const weightUnitLabel = document.getElementById('weightUnitLabel');
    if (!weightUnitLabel) {
        console.error('weightUnitLabel element not found in DOM');
        return;
    }
    weightUnitLabel.textContent = weightUnit;
    const weightLabel = document.getElementById('weightLabel');
    if (!weightLabel) {
        console.error('weightLabel element not found in DOM');
        return;
    }
    weightLabel.textContent = `Weight (${weightUnit}):`;
    const weightTypeSelect = document.getElementById('weightType');
    if (weightTypeSelect) {
        weightTypeSelect.value = weightUnit;
        weightTypeSelect.disabled = true;
    } else {
        console.error('weightType element not found in DOM');
    }
}

function autoPopulateSalesTax(country, productPrice) {
    const settings = countrySettings[country] || {};
    const salesTaxPercent = settings.salesTax || 0;
    const salesTaxField = document.getElementById('salesTaxPrice');
    if (!salesTaxField) {
        console.error('salesTaxPrice element not found in DOM');
        return;
    }
    const price = parseFloat(productPrice) || 0;
    if (salesTaxPercent > 0 && price > 0) {
        const salesTaxAmount = (price * (salesTaxPercent / 100)).toFixed(2);
        salesTaxField.value = salesTaxAmount;
        console.log(`Auto-populated sales tax for ${country}: $${salesTaxAmount} (from ${price} * ${salesTaxPercent}%)`);
    } else {
        salesTaxField.value = '';
        console.log(`No sales tax auto-populated for ${country} (salesTaxPercent: ${salesTaxPercent}, productPrice: ${productPrice})`);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded, initializing quote calculator');
    populateCountryDropdown('quoteCountrySelect', countrySettings, true);

    const weightType = document.getElementById('weightType');
    if (weightType) {
        weightType.addEventListener('change', (e) => {
            const volumetricFields = document.getElementById('volumetricFields');
            if (!volumetricFields) {
                console.error('volumetricFields element not found in DOM');
                return;
            }
            volumetricFields.style.display = e.target.value === 'volumetric' ? 'block' : 'none';
            if (e.target.value === 'actual') {
                const itemWeight = document.getElementById('itemWeight');
                if (itemWeight) {
                    itemWeight.style.display = 'block';
                    updateWeightLabel();
                } else {
                    console.error('itemWeight element not found in DOM');
                }
            } else {
                const itemWeight = document.getElementById('itemWeight');
                if (itemWeight) {
                    console.error('itemPrice element not found in DOM - ensure the script is loaded after the form.');
                    itemWeight.style.display = 'none';
                } else {
                    
                    console.error('itemWeight element not found in DOM');
                }
            }
        });
    } else {
        console.error('weightType element not found in DOM');
    }

    const quoteCountrySelect = document.getElementById('quoteCountrySelect');
    if (quoteCountrySelect) {
        quoteCountrySelect.addEventListener('change', (e) => {
            updateWeightLabel();
            const productPrice = document.getElementById('itemPrice')?.value || '';
            autoPopulateSalesTax(e.target.value, productPrice);
        });
    } else {
        console.error('quoteCountrySelect element not found in DOM');
    }

    const itemPrice = document.getElementById('itemPrice');
    if (itemPrice) {
        itemPrice.addEventListener('input', (e) => {
            const country = document.getElementById('quoteCountrySelect')?.value || '';
            autoPopulateSalesTax(country, e.target.value);
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
            let itemWeight = parseFloat(data.itemWeight) || 0;

            console.log('Form data submitted:', data);
            console.log('Source settings:', sourceSettings);

            if (data.weightType === 'volumetric' && data.length && data.width && data.height && data.volumetricDivisor) {
                const length = parseFloat(data.length) || 0;
                const width = parseFloat(data.width) || 0;
                const height = parseFloat(data.height) || 0;
                const divisor = parseFloat(data.volumetricDivisor) || (sourceSettings.weightUnit === 'lbs' ? 166 : 6000);
                itemWeight = calculateVolumetricWeight(length, width, height, divisor, sourceSettings.weightUnit || 'lbs');
            }

            if (sourceSettings.weightUnit === 'kg') {
                itemWeight *= 2.20462;
            }

            const itemPrice = parseFloat(data.itemPrice) || 0;
            const salesTaxPrice = data.salesTaxPrice ? parseFloat(data.salesTaxPrice) || 0 : 0;

            console.log('Calculated values:', { itemPrice, salesTaxPrice, itemWeight });

            const quote = calculateShippingQuotes(
                itemWeight, itemPrice, salesTaxPrice,
                parseFloat(data.merchantShippingPrice) || 0, parseFloat(data.customs) || 0,
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
                    <table border="1" style="border-collapse: collapse; width: 100%; margin-top: 20px;">
                        <thead>
                            <tr>
                                <th style="padding: 10px;">Item</th>
                                <th style="padding: 10px;">${sourceSettings.currency || 'USD'} (Sourcing)</th>
                                <th style="padding: 10px;">NPR (User)</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style="padding: 10px;">Product Price</td>
                                <td>${sourceSymbol}${(quote.itemPrice.toFixed(2))}</td>
                                <td>${userSymbol}${(userQuote.itemPrice.toFixed(2))}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px;">Sales Tax</td>
                                <td>${sourceSymbol}${(quote.salesTaxPrice.toFixed(2))}</td>
                                <td>${userSymbol}${(userQuote.salesTaxPrice.toFixed(2))}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px;">Merchant Shipping</td>
                                <td>${sourceSymbol}${(quote.merchantShippingPrice.toFixed(2))}</td>
                                <td>${userSymbol}${(userQuote.merchantShippingPrice.toFixed(2))}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px;">International Shipping</td>
                                <td>${sourceSymbol}${(quote.interNationalShipping.toFixed(2))}</td>
                                <td>${userSymbol}${(userQuote.interNationalShipping.toFixed(2))}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px;">Customs Duty</td>
                                <td>${sourceSymbol}${(quote.customsAndECS.toFixed(2))}</td>
                                <td>${userSymbol}${(userQuote.customsAndECS.toFixed(2))}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px;">Domestic Shipping</td>
                                <td>${sourceSymbol}${(quote.domesticShipping.toFixed(2))}</td>
                                <td>${userSymbol}${(userQuote.domesticShipping.toFixed(2))}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px;">Handling Charge</td>
                                <td>${sourceSymbol}${(quote.handlingCharge.toFixed(2))}</td>
                                <td>${userSymbol}${(userQuote.handlingCharge.toFixed(2))}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px;">Payment Gateway Fee</td>
                                <td>${sourceSymbol}${(quote.paymentGatewayFee.toFixed(2))}</td>
                                <td>${userSymbol}${(userQuote.paymentGatewayFee.toFixed(2))}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px;">Discount</td>
                                <td>${sourceSymbol}${(quote.discount.toFixed(2))}</td>
                                <td>${userSymbol}${(userQuote.discount.toFixed(2))}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px;">Insurance Amount</td>
                                <td>${sourceSymbol}${(quote.insuranceAmount.toFixed(2))}</td>
                                <td>${userSymbol}${(userQuote.insuranceAmount.toFixed(2))}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px;">VAT (13%)</td>
                                <td>${sourceSymbol}${(quote.vat.toFixed(2))}</td>
                                <td>${userSymbol}${(userQuote.vat.toFixed(2))}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px;">Subtotal</td>
                                <td>${sourceSymbol}${(quote.subTotal.toFixed(2))}</td>
                                <td>${userSymbol}${(userQuote.subTotal.toFixed(2))}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px;">Final Total</td>
                                <td>${sourceSymbol}${(quote.finalTotal.toFixed(2))}</td>
                                <td>${userSymbol}${(userQuote.finalTotal.toFixed(2))}</td>
                            </tr>
                        </tbody>
                    </table>
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