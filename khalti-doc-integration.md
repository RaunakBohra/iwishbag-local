Introduction¶
What is Khalti Payment Gateway(KPG)?¶
Khalti Payment Gateway (KPG) is a comprehensive payment solution, digital wallet, and API provider designed specifically for online services in Nepal. Whether you have a web application or a mobile application, integrating KPG enables you to seamlessly accept online payments. This documentation serves as your comprehensive guide through the integration process.

By incorporating the KPG ePayment Gateway (for web) and SDKs (for mobile), you can accept payments from various sources:

Khalti users.
eBanking users of our partner banks.
Mobile banking users of our mobile banking partner banks.
SCT/VISA card holders.
connectIPS users.
Integration with Khalti Payment Gateway (KPG) streamlines the process of receiving online payments by eliminating the need to integrate individually with multiple banks.

Features¶
For consumers¶
Multiple Payment Options: Provides various payment options for customers.

Secured Transactions: Utilizes 2-step authentication (Khalti Pin and Khalti Password) for enhanced security. Transaction processing is disabled after multiple incorrect pin attempts.

For merchants¶
Highly Secure and Easy Integrations: Offers seamless integration with strong security measures.
SDK Availability: SDKs are available for Web Flutter and Android.
Merchant Dashboard: Allows merchants to view transactions, issue refunds, filter and download reports, etc.
Multi-User System: Supports multiple users within a single account.
Real-Time Balance Updates: Provides real-time updates on balances in the Merchant Dashboard for every successful customer transaction.
Flexibility in Fund Transfer: Amount collected in the Merchant Dashboard can be deposited or transferred to bank accounts at any time.
Support¶
For any inquiries regarding Khalti Payment Gateway, feel free to reach out to us through:

Mobile (Viber / Whatsapp / Skype): 9801165557, 9801890085
Email: merchant@khalti.com
We are here to assist you with any questions or concerns you may have.

Getting Started
This document serves as a comprehensive guide to integrating the Khalti Payment Gateway (KPG) into your system. The integration process involves signing up as a merchant, understanding the integration methods for web and mobile, and transitioning to a live environment after successful testing.

1. Signup as a Merchant in Khalti
2. ePayment Gateway Integration
2.1. Web
2.2. Mobile
3. Test Environment
4. Going Live
1. Signup as a Merchant in Khalti¶
Before proceeding with the integration, it's essential to understand the terms used throughout the documentation:

Merchant : Online business services such as e-commerce websites, ISP online payment portals, or online movie ticket platforms seeking to receive online payments via KPG.
If you're new to Khalti Payment Gateway service, familiarize yourself with its offerings by reading here for a better understanding.

To initiate the integration process, sign up as a merchant account :

Create a merchant account
2. ePayment Gateway Integration¶
The integration process varies depending on whether you're integrating KPG on a web or mobile platform. Follow the steps outlined below accordingly:

2.1. Web Checkout¶
Khalti payment overview The payment process flow of KPG Web Checkout is as follows:

Merchant requests Khalti to initiate the online payment.
Khalti system returns with pidx and payment_url.
The user must be redirected to payment_url.
After payment, callback is received from Khalti system.
Merchant side must hit the lookup API to get the status of the transaction.
If you are looking to integrate KPG on web application, then the integration must be done by integrating the web checkout. Please follow the documentation here to proceed Web Checkout.

Checkout provides all the necessary Uls and perform necessary processes to initiate and confirm the payment.

2.2. Mobile Checkout¶
Khalti payment overview

The payment process flow of KPG SDK (Android & Flutter) is as follows:

Merchant requests Khalti to initiate the online payment.
Khalti system returns with pidx and payment_url.
The merchant system must pass pidx, keys and return URL in client side SDK (Android and Flutter) for initiating the online payment.
After payment, the return message is obtained on the client side along with extra SDK offerings.

Merchant side must hit the lookup API to get the status of the transaction.

Note

The return url must be same while generating PIDX and in SDK To get callback or SDK offering

If you are looking to integrate KPG in mobile, then the integration must be done by integrating the provided SDKs. Please follow the documentation here to proceed:

Android SDK
Flutter SDK
Checkout provides all the necessary Uls and perform necessary processes to initiate and confirm the payment.

3. Test Environment¶
Access Information

For Sandbox Access

Signup from here as a merchant.

URL : https://dev.khalti.com/
Server Side Authorization Key : Live secret key
Client Side Authorization Key (Android / Flutter SDK): Live public key

Test Credentials for sandbox environment

Test Khalti ID for 9800000000 9800000001 9800000002 9800000003 9800000004 9800000005

Test MPIN 1111

Test OTP 987654

Important

Payment via E-Banking and Debit/Credit card is not supported in the test environment. However, after successful integration with KPG, this functionality will be enabled.

4. Going Live¶
After a successful integration test, a live merchant account must be created from here. The merchant must replace the Sandbox URL and authorization key with productions. Live keys will be generated in the merchant dashboard.

Access Information

For Production

Signup from here as a merchant.

URL : https://khalti.com/
Server Side Authorization Key : Live secret key
Client Side Authorization Key (Android / Flutter SDK): Live public key

Important

Even after successful integration, you won't be able to receive payments above NPR 200 per transaction. Fill the KYC form and contact us at 9801890085 / 9801856440 / 9801165558 / 9801165557 to remove the limits and accept payments without restrictions.

Web Checkout (KPG-2)¶
This documentation details the process of implementing the latest e-Payment Checkout platform released by Khalti.

How it works?¶
User visits the merchant's website to make some purchase
A unique purchase_order_id is generated at merchant's system
Payment request is made to Khalti providing the purchase_order_id, amount in paisa and return_url
User is redirected to the epayment portal (eg. https://pay.khalti.com)
After payment is made by the user, a successful callback is made to the return_url
The merchant website can optionally confirm the payment received
The merchant website then proceeds other steps after payment confirmation
Getting Started¶
There is no special installation plugin or SDK required for this provided you are able to make a POST request from your web application. However, we shall come up with handy plugins in coming days.

Tip

A merchant account is required for integration.

Access Information

For Sandbox Access

Signup from here as a merchant.

Please use 987654 as login OTP for sandbox env.

For Production Access

Please visit here

Test Credentials for sandbox environment

Test Khalti ID for 9800000000 9800000001 9800000002 9800000003 9800000004 9800000005

Test MPIN 1111

Test OTP 987654

Demo Flow for Checkout

Pay with Khalti

API Authorization¶
HTTP Authorization for api requests is done using Auth Keys. Auth Key must be passed in the header for authorization in the following format

{
    "Authorization": "Key <LIVE_SECRET_KEY>"  
}  
Tip

Use live_secret_key from test-admin.khalti.com during sandbox testing and use live_secret_key from admin.khalti.com for production environments.

API Endpoints¶
API Endpoints

Sandbox

https://dev.khalti.com/api/v2/

Production

https://khalti.com/api/v2/

Initiating a Payment request¶
Every payment request should be first initiated from the merchant as a server side POST request. Upon success, a unique request identifier is provided called pidx that should be used for any future references

URL	Method	Authorization	Format
/epayment/initiate/	POST	Required	application/json
JSON Payload Details¶
Field	Required	Description
return_url	Yes	
Landing page after the transaction.
Field must contain a URL.
website_url	Yes	
The URL of the website.
Field must contain a URL.
amount	Yes	
Total payable amount excluding the service charge.
Amount must be passed in Paisa
purchase_order_id	Yes	Unique identifier for the transaction generated by merchant
purchase_order_name	Yes	This is the name of the product.
customer_info	No	This field represents to whom the txn is going to be billed to.
amount_breakdown	No	Any number of labels and amounts can be passed but the sum of amount_breakdown.amount mount be equal to amount.
product_details	No	No of set is unlimited
Sample Request Payload¶
{
  "return_url": "https://example.com/payment/",
  "website_url": "https://example.com/",
  "amount": 1300,
  "purchase_order_id": "test12",
  "purchase_order_name": "test",
  "customer_info": {
      "name": "Khalti Bahadur",
      "email": "example@gmail.com",
      "phone": "9800000123"
  },
  "amount_breakdown": [
      {
          "label": "Mark Price",
          "amount": 1000
      },
      {
          "label": "VAT",
          "amount": 300
      }
  ],
  "product_details": [
      {
          "identity": "1234567890",
          "name": "Khalti logo",
          "total_price": 1300,
          "quantity": 1,
   "unit_price": 1300
      }
  ],
  "merchant_username": "merchant_name",
  "merchant_extra": "merchant_extra"
}
Additionally Configuration also accepts attribute starting with merchant_ that can be used to pass additional (meta) data.
merchant_name: This is merchant name

merchant_extra: This is extra data

The additional data starting with merchant_ is returned in success response payload.

Examples


cURL
php
python
C#
NodeJs
curl --location 'https://dev.khalti.com/api/v2/epayment/initiate/' \
--header 'Authorization: key 05bf95cc57244045b8df5fad06748dab' \
--header 'Content-Type: application/json' \
--data-raw '{
"return_url": "http://example.com/",
"website_url": "http://example.com/",
"amount": "1000",
"purchase_order_id": "Ordwer01",
"purchase_order_name": "Test",
"customer_info": {
    "name": "Test Bahadur",
    "email": "test@khalti.com",
    "phone": "9800000001"
}
}'

Success Response

    {
        "pidx": "bZQLD9wRVWo4CdESSfuSsB",
        "payment_url": "https://test-pay.khalti.com/?pidx=bZQLD9wRVWo4CdESSfuSsB",
        "expires_at": "2023-05-25T16:26:16.471649+05:45",
        "expires_in": 1800
    }
After getting the success response, the user should be redirected to the payment_url obtained in the success response.

Error Responses¶
return_url is blank

{
    "return_url": [
        "This field may not be blank."
    ],
    "error_key": "validation_error"
}
return_url is invalid

{
    "return_url": [
        "Enter a valid URL."
    ],
    "error_key": "validation_error"
}
website_url is blank

{
    "website_url": [
        "This field may not be blank."
    ],
    "error_key": "validation_error"
}
website_url is invalid

{
    "website_url": [
        "Enter a valid URL."
    ],
    "error_key": "validation_error"
}
Amount is less than 10

{
    "amount": [
        "Amount should be greater than Rs. 10, that is 1000 paisa."
    ],
    "error_key": "validation_error"
}
Amount is invalid

{
    "amount": [
        "A valid integer is required."
    ],
    "error_key": "validation_error"
}
purchase_order_id is blank

{
    "purchase_order_id": [
        "This field may not be blank."
    ],
    "error_key": "validation_error"
}
purchase_order_name is blank

{
    "purchase_order_name": [
        "This field may not be blank."
    ],
    "error_key": "validation_error"
}
Amount breakdown doesn't total to the amount passed

{
    "amount": [
        "Amount Breakdown mismatch."
    ],
    "error_key": "validation_error"
}
Payment Success Callback¶
After the user completes the payment, the success response is obtained in the return URL specified during payment initiate. Sample of success response return URL.

The callback url return_url should support GET method
User shall be redirected to the return_url with following parameters for confirmation
pidx - The initial payment identifier
status - Status of the transaction
Completed - Transaction is success
Pending - Transaction is in pending state, request for lookup API.
User canceled - Transaction has been canceled by user.
transaction_id - The transaction identifier at Khalti
tidx - Same value as transaction id
amount - Amount paid in paisa
mobile - Payer KHALTI ID
purchase_order_id - The initial purchase_order_id provided during payment initiate
purchase_order_name - The initial purchase_order_name provided during payment initiate
total_amount - Same value as amount
There is no further step required to complete the payment, however merchant can process with their own validation and confirmation steps if required
It's recommended that during implementation, payment lookup API is checked for confirmation after the redirect callback is received
Sample Callback Request¶
Success transaction callback

http://example.com/?pidx=bZQLD9wRVWo4CdESSfuSsB
&txnId=4H7AhoXDJWg5WjrcPT9ixW
&amount=1000
&total_amount=1000
&status=Completed
&mobile=98XXXXX904
&tidx=4H7AhoXDJWg5WjrcPT9ixW
&purchase_order_id=test12
&purchase_order_name=test
&transaction_id=4H7AhoXDJWg5WjrcPT9ixW
Canceled transaction callback

http://example.com/?pidx=bZQLD9wRVWo4CdESSfuSsB
&transaction_id=
&tidx=
&amount=1000
&total_amount=1000
&mobile=
&status=User canceled
&purchase_order_id=test12
&purchase_order_name=test
Important

Please use the lookup API for the final validation of the transaction.
Khalti payment link expires in 60 minutes in production (default).
Payment Verification (Lookup)¶
After a callback is received, You can use the pidx provided earlier, to lookup and reassure the payment status.

URL	Method	Authorization	Format
/epayment/lookup/	POST	Required	application/json
Request Data¶
{
   "pidx": "HT6o6PEZRWFJ5ygavzHWd5"
}
Success Response¶
{
   "pidx": "HT6o6PEZRWFJ5ygavzHWd5",
   "total_amount": 1000,
   "status": "Completed",
   "transaction_id": "GFq9PFS7b2iYvL8Lir9oXe",
   "fee": 0,
   "refunded": false
}
Pending Response¶
{
   "pidx": "HT6o6PEZRWFJ5ygavzHWd5",
   "total_amount": 1000,
   "status": "Pending",
   "transaction_id": null,
   "fee": 0,
   "refunded": false
}
Initiated Response¶
{
   "pidx": "HT6o6PEZRWFJ5ygavzHWd5",
   "total_amount": 1000,
   "status": "Initiated",
   "transaction_id": null,
   "fee": 0,
   "refunded": false
}
Refunded Response¶
{
   "pidx": "HT6o6PEZRWFJ5ygavzHWd5",
   "total_amount": 1000,
   "status": "Refunded",
   "transaction_id": "GFq9PFS7b2iYvL8Lir9oXe",
   "fee": 0,
   "refunded": true
}
Expired Response¶
{
   "pidx": "H889Er9gq4j92oCrePrDwf",
   "total_amount": 1000,
   "status": "Expired",
   "transaction_id": null,
   "fee": 0,
   "refunded": false
}
Canceled Response¶
{
   "pidx": "vNTeXkSEaEXK2J4i7cQU6e",
   "total_amount": 1000,
   "status": "User canceled",
   "transaction_id": null,
   "fee": 0,
   "refunded": false
}
Payment Status Code¶
Status	Status Code	
Completed	200	
Pending	200	
Expired	400	
Initiated	200	
Refunded	200	
User canceled	400	
Partially Refunded	200	
Lookup Payload Details¶
Status	Description	
pidx	This is the payment id of the transaction.	
total_amount	This is the total amount of the transaction	
status	Completed - Transaction is success
Pending - Transaction is failed or is in pending state
Refunded - Transaction has been refunded
Expired - This payment link has expired
User canceled - Transaction has been canceled by the user
Partially refunded - Transaction has been partially refunded by the user	
transaction_id	This is the transaction id for the transaction.
This is the unique identifier.	
fee	The fee that has been set for the merchant.	
refunded	True - The transaction has been refunded.
False - The transaction has not been refunded.	
Lookup status¶
Field	Description	
Completed	Provide service to user.	
Pending	Hold, do not provide service. And contact Khalti team.	
Refunded	Transaction has been refunded to user. Do not provide service.	
Expired	User have not made the payment, Do not provide the service.	
User canceled	User have canceled the payment, Do not provide the service.	
Important

Only the status with Completed must be treated as success.
Status Canceled , Expired , Failed must be treated as failed.
If any negative consequences occur due to incomplete API integration or providing service without checking lookup status, Khalti won’t be accountable for any such losses.
For status other than these, hold the transaction and contact KHALTI team.
Payment link expires in 60 minutes in production.
Generic Errors¶
When an incorrect Authorization key is passed.¶
{
   "detail": "Invalid token.",
   "status_code": 401
}
If incorrect pidx is passed.¶
{
   "detail": "Not found.",
   "error_key": "validation_error"
}
If key is not passed as prefix in Authorization key¶
{
    "detail": "Authentication credentials were not provided.",
    "status_code": 401
}
Ebanking and Mobile Banking¶
This documentation details the process of implementing the latest e-Payment eBanking Checkout and Mobile Banking platform released by Khalti.

1. Get Bank List¶
This API provides the bank list. The request signature for initiation is as follows:

ebanking URL : https://khalti.com/api/v5/bank/?payment_type=ebanking
Mbanking URL :https://khalti.com/api/v5/bank/?payment_type=mobilecheckout
Method: GET
Authorization : Not Required
The response contains list of banks with the details as shown below.

{
  "total_pages": 1,
  "total_records": 14,
  "next": null,
  "previous": null,
  "record_range": [1, 14],
  "current_page": 1,
  "records": [
    {
      "idx": "UZmPqTDkdhKmukdZe2gVWZ",
      "name": "Agricultural Development Bank Limited",
      "short_name": "ADBL",
      "logo": "https://khalti-static.s3.ap-south-1.amazonaws.com/media/bank-logo/adbl.png",
      "swift_code": "ADBLNPKA",
      "has_cardpayment": false,
      "address": "Singhadurbar, Kathmandu",
      "ebanking_url": "",
      "has_ebanking": true,
      "has_mobile_checkout": true,
      "has_direct_withdraw": true,
      "has_nchl": false,
      "has_mobile_banking": false,
      "play_store": "",
      "app_store": "",
      "branches": []
    }
  ]
}
2. Initiate transaction¶
Every payment request should be first initiated from the merchant as a server side POST request. Upon success, a unique request identifier is provided called pidx that should be used for any future references.

URL : https://khalti.com/api/v2/epayment/initiate/
Method : POST
Authorization : Required
For more information click here.

Sample Request Payload¶
{
    "return_url": "https://testing.com/",
    "website_url": "https://testing.com/",
    "amount": "10000",
    "ttl": 1000,
    "bank": "ayCEFuEpkmkjBj3WVWRh32",
    "modes": [
        "MOBILE_BANKING"
    ],
        "purchase_order_id": "wakanada_01",
        "purchase_order_name": "wakanda 02",
    "customer_info": {
        "name": "test shrestha",
        "email": "example@gmail.com",
        "phone": "9801856451"
    },
    "amount_breakdown": [
        {
            "label": "Mark Price",
            "amount": "10000"
        },
        {
            "label": "VAT",
            "amount": 0
        }
    ],
    "product_details": [
        {
            "identity": "shark_1",
            "name": "shark_2",
            "total_price": 10000,
            "quantity": 1,
            "unit_price": 10000
        }
    ]
}
Success Response

    {
        "pidx": "bZQLD9wRVWo4CdESSfuSsB",
        "payment_url": "https://test-pay.khalti.com/?pidx=bZQLD9wRVWo4CdESSfuSsB",
        "expires_at": "2023-05-25T16:26:16.471649+05:45",
        "expires_in": 1800
    }
After getting the success response, the user should be redirected to the payment_url obtained in the success response.

Error Responses¶
return_url is blank

{
    "return_url": [
        "This field may not be blank."
    ],
    "error_key": "validation_error"
}
return_url is invalid

{
    "return_url": [
        "Enter a valid URL."
    ],
    "error_key": "validation_error"
}
website_url is blank

{
    "website_url": [
        "This field may not be blank."
    ],
    "error_key": "validation_error"
}
website_url is invalid

{
    "website_url": [
        "Enter a valid URL."
    ],
    "error_key": "validation_error"
}
Amount is less than 10

{
    "amount": [
        "Amount should be greater than Rs. 100, that is 10000 paisa."
    ],
    "error_key": "validation_error"
}
Amount is invalid

{
    "amount": [
        "A valid integer is required."
    ],
    "error_key": "validation_error"
}
purchase_order_id is blank

{
    "purchase_order_id": [
        "This field may not be blank."
    ],
    "error_key": "validation_error"
}
purchase_order_name is blank

{
    "purchase_order_name": [
        "This field may not be blank."
    ],
    "error_key": "validation_error"
}
Amount breakdown doesn't total to the amount passed

{
    "amount": [
        "Amount Breakdown mismatch."
    ],
    "error_key": "validation_error"
}
Payment Success Callback¶
After the user completes the payment, the success response is obtained in the return URL specified during payment initiate. Sample of success response return URL.

The callback url return_url should support GET method
User shall be redirected to the return_url with following parameters for confirmation
pidx - The initial payment identifier
status - Status of the transaction
Completed - Transaction is success
Pending - Transaction is in pending state, request for lookup API.
User canceled - Transaction has been canceled by user.
transactionid - _The transaction identifier at Khalti
tidx - Same value as transaction id
amount - Amount paid in paisa
mobile - Payer KHALTI ID
purchaseorder_id - _The initial purchase_order_id provided during payment initiate
purchaseorder_name - _The initial purchase_order_name provided during payment initiate
totalamount - _Same value as amount
There is no further step required to complete the payment, however merchant can process with their own validation and confirmation steps if required
It's recommended that during implementation, payment lookup API is checked for confirmation after the redirect callback is received
Sample Callback Request¶
Success transaction callback
http://example.com/?pidx=bZQLD9wRVWo4CdESSfuSsB
&txnId=4H7AhoXDJWg5WjrcPT9ixW
&amount=10000
&total_amount=10000
&status=Completed
&mobile=98XXXXX904
&tidx=4H7AhoXDJWg5WjrcPT9ixW
&purchase_order_id=test12
&purchase_order_name=test
&transaction_id=4H7AhoXDJWg5WjrcPT9ixW
Canceled transaction callback
http://example.com/?pidx=bZQLD9wRVWo4CdESSfuSsB
&transaction_id=
&tidx=
&amount=10000
&total_amount=10000
&mobile=
&status=User canceled
&purchase_order_id=test12
&purchase_order_name=test
!!! Important + Please use the lookup API for the final validation of the transaction. + Khalti payment link expires in 60 minutes in production (default).

Payment Verification (Lookup)¶
After a callback is received, You can use the pidx provided earlier, to lookup and reassure the payment status.

URL	Method	Authorization	Format
/epayment/lookup/	POST	Required	application/json
Request Data¶
{
  "pidx": "HT6o6PEZRWFJ5ygavzHWd5"
}
Success Response¶
{
  "pidx": "HT6o6PEZRWFJ5ygavzHWd5",
  "total_amount": 10000,
  "status": "Completed",
  "transaction_id": "GFq9PFS7b2iYvL8Lir9oXe",
  "fee": 0,
  "refunded": false
}
Pending Response¶
{
  "pidx": "HT6o6PEZRWFJ5ygavzHWd5",
  "total_amount": 10000,
  "status": "Pending",
  "transaction_id": null,
  "fee": 0,
  "refunded": false
}
Initiated Response¶
{
  "pidx": "HT6o6PEZRWFJ5ygavzHWd5",
  "total_amount": 10000,
  "status": "Initiated",
  "transaction_id": null,
  "fee": 0,
  "refunded": false
}
Refunded Response¶
{
  "pidx": "HT6o6PEZRWFJ5ygavzHWd5",
  "total_amount": 10000,
  "status": "Refunded",
  "transaction_id": "GFq9PFS7b2iYvL8Lir9oXe",
  "fee": 0,
  "refunded": true
}
Expired Response¶
{
  "pidx": "H889Er9gq4j92oCrePrDwf",
  "total_amount": 10000,
  "status": "Expired",
  "transaction_id": null,
  "fee": 0,
  "refunded": false
}
Canceled Response¶
{
  "pidx": "vNTeXkSEaEXK2J4i7cQU6e",
  "total_amount": 10000,
  "status": "User canceled",
  "transaction_id": null,
  "fee": 0,
  "refunded": false
}
Payment Status Code¶
Status	Status Code	
Completed	200	
Pending	200	
Expired	400	
Initiated	200	
Refunded	200	
User canceled	400	
Partially Refunded	200	
Lookup Payload Details¶
Status	Description	
pidx	This is the payment id of the transaction.	
total_amount	This is the total amount of the transaction	
status	Completed - Transaction is success
Pending - Transaction is failed or is in pending state
Refunded - Transaction has been refunded
Expired - This payment link has expired
User canceled - Transaction has been canceled by the user
Partially refunded - Transaction has been partially refunded by the user	
transaction_id	This is the transaction id for the transaction.
This is the unique identifier.	
fee	The fee that has been set for the merchant.	
refunded	True - The transaction has been refunded.
False - The transaction has not been refunded.	
Lookup status¶
Field	Description	
Completed	Provide service to user.	
Pending	Hold, do not provide service. And contact Khalti team.	
Refunded	Transaction has been refunded to user. Do not provide service.	
Expired	User have not made the payment, Do not provide the service.	
User canceled	User have canceled the payment, Do not provide the service.	
Important

Only the status with Completed must be treated as success. + Status Canceled , Expired , Failed must be treated as failed. + If any negative consequences occur due to incomplete API integration or providing service without checking lookup status, Khalti won’t be accountable for any such losses.
For status other than these, hold the transaction and contact KHALTI team. + Payment link expires in 60 minutes in production.
Generic Errors¶
When an incorrect Authorization key is passed.¶
{
  "detail": "Invalid token.",
  "status_code": 401
}
If incorrect pidx is passed.¶
{
  "detail": "Not found.",
  "error_key": "validation_error"
}
If key is not passed as prefix in Authorization key¶
{
  "detail": "Authentication credentials were not provided.",
  "status_code": 401
}
 

Copyright © 2025 IME Khalti Limited
Made with Material for MkDocs
Refund API¶
The Refund API allows merchants to process refunds for transactions. Refunds can be either full or partial and apply to both wallet and banking transactions.

API Endpoints¶
API Endpoints

Sandbox

https://dev.khalti.com/api/merchant-transaction/{{transaction_id}}/refund/

Production

https://khalti.com/api/merchant-transaction/{{transaction_id}}/refund/

Note

The transaction_id will be obtained from Payment Lookup.

Request Parameters¶
Wallet Refund¶
Full Refund¶
For a full refund, no additional parameters are required.

Partial Refund¶
For a partial refund, the following parameters are required:

Amount: The amount to be refunded.
Note

The amount should be in paisa.

Example Request (Partial Refund)

{
    "amount": 50.00
}
Bank Refund¶
Full Refund¶
For a full refund, the following parameter is required:

Mobile: The mobile number associated with the Khalti account.
Example Request (Full Refund)

{
    "mobile": "1234567890"
}
Partial Refund¶
For a partial refund, the following parameters are required:

Mobile: The mobile number associated with the Khalti account.
Amount: The amount to be refunded.
Example Request (Partial Refund)

{
    "mobile": "1234567890",
    "amount": 75.00
}
Success Response

{
    "detail": "Transaction refund successful."
}
This documentation provides a comprehensive guide for using the Refund API to process both full and partial refunds for wallet and banking transactions.
FAQ's¶
1. How can I sign up as a merchant?¶
Please go this link for a merchant sign up

2. How to integrate KPG?¶
Based on your requirement please visit following links for Khalti integration:

Web integration
Android integration
Flutter integration
Khalti integration via plugins
For WooCommerce
3. What to do after a successful test transaction ?¶
After a successful test transaction, you will able to accept payments live. However, before going live, please contact our team for the necessary coordination

4. Does Khalti have SDK for hybrid Apps?¶
We do have SDK for Flutter. But for hybrid apps based on other frameworks, we don't have a specific SDK. Find options in Client Integration, which support Khalti checkout integration with your app.

5. Can I share merchant keys?¶
Secret key must not be shared with anyone. Ensure it does not get leaked by any means. If you key got compromised you can regenerate new one from your merchant dashboard.

6. What is Khalti mPIN?¶
Khalti mPIN is the four digit pin, used by the user while making payment of third party transactions.

It can created or changed at the Transaction Pin section under Account in khalti web and Settings in khalti app.

7. I need to refund payment to the user. How can I refund a transaction?¶
You can refund the payment to the user from your dashboard.

Gotchas¶
CORS issues¶
If you are getting CORS issues, read the docs again very thoroughly. You need to call verification API from your server to verify, so it is necessary to pass the data to your server first.

Server errors¶
If you get error response "Fee not found." while testing, check your fee and set fee between Rs. 10 to Rs. 200. If you are using live keys contact merchant support to find your transaction limits.

Payment errors¶
If you get error response "Amount must be less than 200." while testing, check you have complete all the contract process. If you are using live keys contact merchant support for further details.

Frame Options and Clickjacking protection¶
Refused to display 'https://khalti.com/payment/widget/' in a frame because it set 'X-Frame-Options' to 'deny'.

You are using HTTP response header 'X-Frame-Options' that avoids <iframe> rendering when you set it to 'deny'. But Khalti gateway uses iframe payment form, to accept payment from Khalti you need to allow iframe at least for khalti.com. You have a configuration option 'allow-from' with x-frame-options to allow from a specific domain. You can simply do this in your server configuration:

X-Frame-Options "allow-from https://khalti.com"
But using x-frame-options is not an internet standard. It is almost absolute; modern browsers like chrome and safari don't support it. The recommended way is to use 'frame-ancestors' CSP rule. (legacy browsers like IE do not support it ). So also for this error:

Refused to display 'https://khalti.com/payment/widget/' in a frame because an ancestor violates the following Content Security Policy directive: "frame-ancestors 'none'".

You need to configure the server as:

Content-Security-Policy frame-ancestors 'self' khalti.com *.khalti.com
One can use both the options for full browser compatibility. So, please change your server configuration accordingly.