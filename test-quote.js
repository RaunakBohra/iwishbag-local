// test-quote.js
const { handler } = require('./quote-calculator.js');

const event = {
    body: JSON.stringify({
        itemPrice: 100,
        salesTaxPrice: 10,
        merchantShippingPrice: 0,
        productCategoryPer: 15,
        itemWeight: 2,
        price1: 1,
        exchangeRateNPR: 106,
        country: 'US',
        discount: 0,
        handlingCharge: 0,
        domesticShipping: 0,
        insuranceAmount: 0
    })
};

handler(event).then(response => {
    console.log('Response:', JSON.stringify(response, null, 2));
}).catch(error => {
    console.error('Error:', error);
});