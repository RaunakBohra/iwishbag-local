
Introduction
Welcome to eSewa Payment API documentation.
eSewa enables customer to make payment from associated merchant application in secure environment. The payment amount is deposited into their eSewa wallet or bank account.

Whom this is for
Business house and Organization interested on adding online payment facilities to their system and provide a value added to customers.

Intent of Document
This document is intended for partners merchant seeking to integrate and transact with the eSewa. This document can used as a reference in the planning, building, and deploying of applications wishing to integrate eSewa payment system. Contained within are specific implementation details concerning general guidelines, transaction flow and validation process which all partner applications should adhere to. This information should help accelerate the integration efforts of eSewa payment system with merchant application.

This document does not necessarily define specific ways to implement the guidelines and procedures contained within. Vendor, platform, and architectural considerations may influence the manner in which individual systems comply.

The focus of this document is to detail how partner applications establish connectivity to eSewa and outline the transaction process with or without verification process. A full and detailed description of the transactions and associated data elements is included.

Transaction Flow
1. When user choses eSewa as on-line payment option from partner merchant application, then user is temporarily redirected to eSewa ePay login page.

2. User will provide valid credentials on login page.

3. By confirming the transaction, user is accepting the transaction details sent by partner merchants.

4. After each successful transaction, the user is redirected back to partner merchant's success page. If transaction fails due to any reason (which includes user canceling transaction), the user is informed by appropriate failure message and redirected back to partner merchant's failure page.

5. For every successful transaction, the merchant account is credited accordingly and notified via email/SMS regarding transaction.

6. If a response is not received within five minutes, the status check API can be used to confirm the payment.

7. After receiving a response from the status check API, update the payment status accordingly.

System Interaction
The interactions required to complete a transaction followed by transaction verification process are shown below:


Fig: System interaction for payment with transaction verification process
The scenario visualized in above figure shows an overall communication diagram end to end from merchant to eSewa. In general, merchant sends payment request to eSewa for transaction, where user will login with valid credentials and confirms the transaction. Upon confirmation, user is redirected back to merchant’s success page.

The merchant have to send transaction verification request to eSewa after receiving successful payment for filtering potential fraudulent transactions. The eSewa system will response back accordingly with either success or failure message.

HMAC/SHA256
This HMAC implements the HMAC algorithm as defined in RFC 2104 using the message digest function SHA256. The result MAC value will be a base-64 output type.

Input
Input should be string type and the value of Signed_field_names
Parameters(total_amount,transaction_uuid,product_code) should be mandatory and should be in the same order while creating the signature


total_amount=100,transaction_uuid=11-201-13,product_code=EPAYTEST


SecretKey:
SecretKey for every merchant partner will be provided from eSewa
For UAT, SecretKey will be 8gBm/:&EnhH.1/q( Input should be text type.)

Algorithm used for signature generation is SHA-256
Output:
The generated signature should be in base-64 output type. For eg:

Result

4Ov7pCI1zIOdwtV2BRMUNjz1upIlT/COTxfLhWvVurE=


Examples of creating base64 hashes using HMAC SHA256 in different languages:
JAVASCRIPT
PHP
PYTHON
JAVA
JAVAX
<script src="https://cdnjs.cloudflare.com/ajax/libs/crypto-js/3.1.9-1
/crypto-js.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/crypto-js/3.1.9-1
/hmac-sha256.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/crypto-js/3.1.9-1
/enc-base64.min.js"></script>
<script>
 var hash = CryptoJS.HmacSHA256("Message", "secret");
 var hashInBase64 = CryptoJS.enc.Base64.stringify(hash);
 document.write(hashInBase64);
</script>
 
Integration
During this phase, the merchant will use test user credentials to login in eSewa and process the transaction. Adequate balance will be updated to test the user account.
The partner merchant will send request/post form request with various parameters. Some parameters are mandatory(i.e the parameters must be included) while some are optional.
For end-to-end connection, some safety measures are applied while sending requests. The partner merchant should generate a signature using HMAC algorithm. Here's how the signature is to be generated and the generated signature should be sent along with the other request parameter.

For production please use following url:https://epay.esewa.com.np/api/epay/main/v2/form 

Html
<body>
 <form action="https://rc-epay.esewa.com.np/api/epay/main/v2/form" method="POST">
 <input type="text" id="amount" name="amount" value="100" required>
 <input type="text" id="tax_amount" name="tax_amount" value ="10" required>
 <input type="text" id="total_amount" name="total_amount" value="110" required>
 <input type="text" id="transaction_uuid" name="transaction_uuid" value="241028" required>
 <input type="text" id="product_code" name="product_code" value ="EPAYTEST" required>
 <input type="text" id="product_service_charge" name="product_service_charge" value="0" required>
 <input type="text" id="product_delivery_charge" name="product_delivery_charge" value="0" required>
 <input type="text" id="success_url" name="success_url" value="https://developer.esewa.com.np/success" required>
 <input type="text" id="failure_url" name="failure_url" value="https://developer.esewa.com.np/failure" required>
 <input type="text" id="signed_field_names" name="signed_field_names" value="total_amount,transaction_uuid,product_code" required>
 <input type="text" id="signature" name="signature" value="i94zsd3oXF6ZsSr/kGqT4sSzYQzjj1W/waxjWyRwaME=" required>
 <input value="Submit" type="submit">
 </form>
</body>
 
Demo


form-data:
{
"amount": "100",
"failure_url": "https://developer.esewa.com.np/failure",
"product_delivery_charge": "0",
"product_service_charge": "0",
"product_code": "EPAYTEST",
"signature": "i94zsd3oXF6ZsSr/kGqT4sSzYQzjj1W/waxjWyRwaME=",
"signed_field_names": "total_amount,transaction_uuid,product_code",
"success_url": "https://developer.esewa.com.np/success",
"tax_amount": "10",
"total_amount": "110",
"transaction_uuid": "241028"
}
 
Request Param Details:
Parameter Name	Description
amount
                                            	Amount of product
tax_amount
                                            	Tax amount applied on product
product_service_charge
                                            	product_service_charge Service charge by merchant on product
product_delivery_charge
                                            	Delivery charge by merchant on product
product_code
                                            	Merchant code provided by eSewa
total_amount
                                            	Total payment amount including tax, service and deliver charge. [i.e total_amount= amount+ tax_amount+ product_service_charge + product_delivery_charge ]
transaction_uuid
                                            	A unique ID of product, should be unique on every request.Supports alphanumeric and hyphen(-) only
success_url
                                            	a redirect URL of merchant application where customer will be redirected after SUCCESSFUL transaction
failure_url
                                            	a redirect URL of merchant application where customer will be redirected after FAILURE or PENDING transaction
signed_field_names
                                            	Unique field names to be sent which is used for generating signature
signature
                                            	hmac signature generated through above process.

All parameters are required i.e. values should not be null or empty. If tax_amount, product_service_charge & product_delivery_charge are not used for transaction then their respective values should be zero.
 In transaction_uuid , please use alphanumeric characters and hyphen(-) only


Token
After request is being sent, user is redirected to login page where users input eSewaId and Password. A 6-digit verification token is sent to user mobile(SMS or email) depends upon eSewaId used by user.
For now, only for testing purpose token is 123456 to remove the hassle to obtain token each time after login.

After Successful Payment
After successful payment, the user is redirected to the success URL (that you have sent) along with the response parameters encoded in Base64.
Example (Decoded Response Body):

{
  "transaction_code": "000AWEO",
  "status": "COMPLETE",
  "total_amount": 1000.0,
  "transaction_uuid": "250610-162413",
  "product_code": "EPAYTEST",
  "signed_field_names": "transaction_code,status,total_amount,transaction_uuid,product_code,signed_field_names",
  "signature": "62GcfZTmVkzhtUeh+QJ1AqiJrjoWWGof3U+eTPTZ7fA="
} 
Example (Response Body encoded in Base64)
eyJ0cmFuc2FjdGlvbl9jb2RlIjoiMDAwQVdFTyIsInN0YXR1cyI6IkNPTVBMRVRFIiwidG90YWxfYW1vdW50IjoiMTAwMC4wIiwi
dHJhbNhY3Rpb25fdXVpZCI6IjI1MDYxMC0xNjI0MTMiLCJwcm9kdWN0X2NvZGUiOiJFUEFZVEVTVCIsInNpZ25lZF9maWVsZF9uYW1
lcyI6InRyYW5zYWN0aW9uX2NvZGUsc3RhdHVzLHRvdGFsX2Ftb3VudCx0cmFuc2FjdGlvbl91dWlkLHByb2R1Y3RfY29kZSxzaWd
uZWRfZmllbGRfbmFtZXMiLCJzaWduYXR1cmUiOiI2MkdjZlpUbVZremh0VWVoK1FKMUFxaUpyam9XV0dvZjNVK2VUUFRaN2ZBPSJ9 

Make sure you verify the integrity of the response body by comparing the signature that we have sent with the signature that you generate. Signature should be generated the same way the request’s signature was generated.


Status Check
An API for client enquiry when a transaction is initiated and no response is provided from eSewa or received by Merchant. API parameters are product code, transaction uuid and amount client requests for transaction status with product code , tranasction uuid , total amount,reference id and esewa will respond with successful transaction code and status if failed status only.

Testing Url

https://rc.esewa.com.np/api/epay/transaction/status/?product_code=EPAYTEST&total_amount=100&transaction_uuid=123
 
For Production:

https://epay.esewa.com.np/api/epay/transaction/status/?product_code=EPAYTEST&total_amount=100&transaction_uuid=123
 
Response:
{
  "product_code": "EPAYTEST",
  "transaction_uuid": "123",
  "total_amount": 100.0
  "status": "COMPLETE",
  "ref_id": "0001TS9"
} 
Request Parameter Description and Format
Response Types	Response Description	Response Format
PENDING
                                            	Payment Initiated but not been completed yet	
{
"product_code": "EPAYTEST",
"transaction_uuid": "240508-101430",
"total_amount": 100.0,
"status": "PENDING",
"ref_id": null
}

COMPLETE
                                            	Successful Payment	
{
"product_code": "EPAYTEST",
"transaction_uuid": "240508-10108",
"total_amount": 100.0,
"status": "COMPLETE",
"ref_id": "0007G36"
}

FULL_REFUND
                                            	Full Payment refunded to the customer	
{
"product_code": "EPAYTEST",
"transaction_uuid": "240508-101431",
"total_amount": 100,
"status": "FULL_REFUND",
"ref_id": "0007G36"
}

PARTIAL_REFUND
                                            	Partial payment refunded to the customer	
{
"product_code": "EPAYTEST",
"transaction_uuid": "240508-101431",
"total_amount": 100.0,
"status": "PARTIAL_REFUND",
"ref_id": "0007G36"
}

AMBIGUOUS
                                            	Payment is at hult state	
{
"product_code": "EPAYTEST",
"transaction_uuid": "240508-101431",
"total_amount": 100.0,
"status": "AMBIGUOUS",
"ref_id": "0KDL6NA"
}

NOT_FOUND
                                            	Payment terminated at eSewa: Session expired	
{
"product_code": "EPAYTEST",
"transaction_uuid": "240508-101430",
"total_amount": 100.0,
"status": "NOT_FOUND",
"ref_id": null
}

CANCELED
                                            	Canceled/Reversed from eSewa side	
{
"product_code": "EPAYTEST",
"transaction_uuid": "240508-102939",
"total_amount": 10.0,
"status": "CANCELED",
"ref_id": "0KDL6NA"
}

Service is currently unavailable
                                            	Server connection timeout.	
{
"code": 0,
"error_message": "Service is currently
unavailable"
}

FAQ

What is ePay?

What is the work-flow of eSewa ePay?

What are the item I will get for implementing eSewa ePay API?

Does eSewa provide payment integration in mobile applications?

What is the settlement mechanism from eSewa to Merchant Bank Account?

How eSewa provides support up on receiving any trouble because of ePay?

What is supposed to be done if the payment amount is confirmed by eSewa and transaction amount requested by Web application is not equal?

What is the time per session to make successful payment?

Should customer must have eSewa ID and its credential to do payment ?
Credentials & URLs
Each client will also receive a wallet on eSewa (Merchant wallet) from where they can find payments made for their products/services:

Link For Production Mode: https://merchant.esewa.com.np

To make payment with eSewa sdk. One must be a registered eSewa user. For testing phase, the client/merchant can use the following eSewa id and password:

eSewa ID: 9806800001/2/3/4/5
Password: Nepal@123 MPIN: 1122 (for application only)
Token:123456

ABOUT ESEWA

eSewa is a mobile wallet for online and offline payments with a user base of 8 millions, a vast network of 4 hundred thousand agents, and a comprehensive array of services.
It is a one-stop destination for all of your needs like mobile recharge, electricity bills payment,telephone bills payment, booking bus and airlines tickets, buying movie tickets, transferring money, and many more.

COMPANY
About Us
Career
Partner Banks
Contact us
FAQ
POLICIES
Privacy Policy
Terms & Conditions
Report Fraud & Misuse
Transaction Limits
DOWNLOAD APP
 
© 2009- 2025 eSewa.All Rights Reserved.
keep in touch---- 




Introduction
Epay
 Android
 iOS
 Flutter
 WooCommerce
 Prestashop
 Magento
Token
Test credentials
Contact
Test Login Credentials
Credentials
Here are the test credentials & details which are required for developing environment.For production environment we will provide live credentials after successful test transactions.
eSewa ID & Password:
To make payment with eSewa sdk. One must be a registered eSewa user. For testing phase, the client/merchant can use the following eSewa id and password:

eSewa ID: 9806800001/2/3/4/5
Password: Nepal@123
MPIN: 1122 (for application only)
Merchant ID/Service Code: EPAYTEST
Token:123456

For Epay-v2:
Secret Key:8gBm/:&EnhH.1/q

For SDK Integration:
client_id:JB0BBQ4aD0UqIThFJwAKBgAXEUkEGQUBBAwdOgABHD4DChwUAB0R
client_secret:BhwIWQQADhIYSxILExMcAgFXFhcOBwAKBgAXEQ==

ABOUT ESEWA

eSewa is a mobile wallet for online and offline payments with a user base of 8 millions, a vast network of 4 hundred thousand agents, and a comprehensive array of services.
It is a one-stop destination for all of your needs like mobile recharge, electricity bills payment,telephone bills payment, booking bus and airlines tickets, buying movie tickets, transferring money, and many more.

COMPANY
About Us
Career
Partner Banks
Contact us
FAQ
POLICIES
Privacy Policy
Terms & Conditions
Report Fraud & Misuse
Transaction Limits
DOWNLOAD APP
 
© 2009- 2025 eSewa.All Rights Reserved.
keep in touch---- 




Introduction
Epay
 Android
 iOS
 Flutter
 WooCommerce
 Prestashop
 Magento
Token
Overview
Inquiry
Payment
Status Check
Test credentials
Contact
Overview
API, an abbreviation of Application Program Interface, is a set of routines, protocols, and tools for building software applications. The API specifies how software components should interact. Virtually all software has to request other software to do some things for it. To accomplish this, the asking program uses a set of standardized requests, called Application Programming Interface (API). Building an application with no APIs is basically like building a house with no doors. The API for all computing purposes is how we open the blinds and the doors and exchange information.

This documentation is about Token based payment in eSewa. This helps to understand and guide those partners which are intended to integrate token based payment. Token based payment implies, a unique token is generated at the merchant end. Customer enters the token at eSewa for payment, and then request is made to the client against the token generated from merchant. Upon getting the necessary information in response, payment is made from eSewa in next step. This documentation will help to accelerate the integration efforts of client application with eSewa.


Fig: System Interaction with partner/client server for token based payment in eSewa.
The scenario visualized in above figure shows an overall communication from partner/client's Server to eSewa and finally to the partner/client's Server. Number in bracket specifies the order of process that is carried out between partner client and eSewa. Following lays the explanation:

Authentication
eSewa supports two types of Authentication methods
• Basic Authentication: In Basic Authentication, username and password should be provided in header for every request

• Bearer Access Token:In Bearer Token Authentication, the server issues a token after successful authentication. The client includes this token in the HTTP Authorization header for subsequent requests. The server then validates the token to grant access.
URL:{{base_url}}/access-token
Url for login as well as for refreshing token will be same
Method:POST

Sample Request for authentication:
{
"grant_type": "password/refresh_token",
"client_secret": {{base64 encoded client_secret key}},
"username": {{username}},
"password": {{base64 encoded password}}
} 
Name	Description
grantType
                                            	
As for authentication as well as for refresh token URL would be same but would be differentiated by :
a)password: For authentication with username and password
b) refresh_token : For authentication with refresh token

client_secret
                                            	base64 Encoded value of key with length from 32 - 64 characters long.
username
                                            	username provided by client.
password
                                            	password provided by client
Sample Response:
{
 "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJqa1ZhNWI2TzZpNTJIeEdHSUN3NFhVTkFyLWpxSUs3",
 "expires_in": 250,
 "token_type": "Bearer",
 "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJkYTNlYjFjZS0wNGJlLTQ3Y2YtODlkYS02M2M5MDJ",
 "refresh_expires_in": 550
} 
Name	Description
access_token
                                            	accessToken to sent in each request.
expires_in
                                            	integer value in second for how long access_token will be valid.
token_type
                                            	prefix value of access token.
refresh_token
                                            	If access token is expired, with this token access token is fetched.

With above response from client. Esewa send's access Token for Authentication for each request. In Header with key- Authorization.
Key is constructed as :
token_type + “<space>“ + access_token

Refresh Token:
To refresh the token same authentication url is used with following request format :


Sample Request for Refresh Token:
{
"grant_type": "refresh_token",
"refresh_token": {{refresh_token from previous login}},
"client_secret": {{base64 encoded client_secret key}}
} 
Name	Description
grant_type
                                            	refresh_token for refreshing token.
refresh_token
                                            	refresh token from previous login
client_secret
                                            	base64 encoded client_secret key
Sample Response:
{
"access_token": "eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJqa1ZhNWI2TzZpNTJIeEdHSUN3NFhVTkFyLWpxSUs3",
"expires_in": 200,
"token_type": "Bearer",
"refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJkYTNlYjFjZS0wNGJlLTQ3Y2YtODlkYS02M2M5MDJk",
"refresh_expires_in": 400
} 
Inquiry
eSewa calls the partner/client's server with the token entered from user as in process 1.1 shown in figure above. If the required token is valid, response (1.2) is sent to eSewa with the necessary parameters required for payment. If the token is invalid or duplicate, error message is sent from partner/client, which is accordingly displayed to the customer. Below is the API detail-
Request-
Request is made with the unique request id or token generated by client. **Authentication(Basic or Bearer Token) should be provided for every request.
Request can be send in:
1.URL.
Parameters can be send in URL as path variable,as query parameters or by mixture of both
eg:Request URI- client's url/{request_id}
      client's url/{request_id}/{mobile_number}(incase of multiple parameters)
      client's url?{request_id}?{mobile_number}(request in query param)
      client's url/{request_id}?{mobile_number}(request in mixture of both path and query)

2. Header Parameters
Header must always be in JSON format.While header key's value must be in list format.

3. Body Parameters
Parameters in body must be in JSON format.While header key's value must be in list format


Note: Field name either in header, url or in body must always be in snake case i.e if we've field “Customer Id” it must always be as “customer_id”


Description
Field Name	Parameter Type	Field Description
request_id
                                            	String	Individually assigned unique ID for each user.
Response
Below is the response received for the above request made -

{
    "request_id": "",      
    "response_code" : "",
    "response_message": "",
    "amount": ,
    "properties": {
      "name": ""
      //address... and other parameters as per merchants (used as detail)
    }
 } 
where
Field name	Parameter Type	Field Description
request_id
                                            	String	Individually assigned unique ID for each user.
response_message
                                            	String	Success/Error Response message
response_code
                                            	int	This is the response provided by client to eSewa to know the successful completion of any transaction.-0 Success -1 Failed
amount
                                            	double	Total amount to be paid by the customer.
properties
                                            	Map	Fields in properties are dynamic as per clients. Any values may be passed in properties. Key and value both should be String.
Example:Statement Request-
Request URI- client's url/{request_id}
      client's url/{request_id}/{mobile_number}(incase of multiple parameters)
Method type - GET
Path variable - request_id
GET: {{base_url}}/inquiry/12123122(incase of single parameter)
  {{base_url}}/inquiry/12123122/9806800001(incase of multiple parameters)

Case:Success
{
 "request_id": "12123122",      
 "response_code" : 0,
 "response_message": "success",
 "amount": 1000,
 "properties": {
     "customer_name": "Ram Kumar Thapa",
     "address" : "Kathmandu",
     "customer_id": "1A4DDF",
     "invoice_number": "123456789",
     "product_name": "ABC online registration"           
 }
} 
Success Response II(In case of Package Selection)
{
    "amount": 2499,
    "request_id": "abhishek@gmail.com",
    "response_code": 0,
    "response_message": "success",
    "properties": {
        "username": "abhishek@gmail.com",
        "expiry_date": "2027-07-03",
        "phone": "9806800001"
    },
    "packages": [
        {
            "display": "One Month Package. [ 1 Month at 499 ]",
            "value": 499,
            "properties": {
                "package_id": 1
            }
        },
        {
            "display": "Three Months Package. [ 3 Months at 999 ]",
            "value": 999,
            "properties": {
                "package_id": 2
            }
        },
        {
            "display": "1 Year Package. [ 1 Year at 2499 ]",
            "value": 2499,
            "properties": {
                "package_id": 3
            }
        },
        {
            "display": "Special Package: Buy 2 Years, Get 1 Year Free. [ 3 Years at 4999 ]",
            "value": 4999,
            "properties": {
                "package_id": 4
            }
        }
    ]
} 
Case:Failure
{
  "response_code" : 1,
  "response_message" : "Invalid token"    
}
 

Note:- fields in properties are dynamic as per clients. Any values may be passed in properties key and value both should be String


Payment
Request Method type - POST
**Authentication(Basic or Bearer Token) should be provided for every request.

Request
{
 "request_id": "",
 "amount": ,
 "transaction_code": ""
} 
where,
Field Name	Parameter Type	Field Description
request_id
                                            	String	Individually assigned unique ID for each user.
amount
                                            	double	Total amount to be paid by the customer.
transaction_code
                                            	String	Code generated from eSewa during payment.
Response
Below is the response received for the above request made -

{
 "request_id" : "",
 "response_code": "",
 "response_message": "",
 "amount": ,
 "reference_code": ""
} 
where,
Field Name	Parameter Type	Field Description
request_id
                                            	String	Individually assigned unique ID for each user.
response_message
                                            	String	Success/Error Response message
response_code
                                            	int	This is the response provided by client to eSewa to know the successful completion of any transaction. -0 Success -1 Failed
amount
                                            	double	Total amount to be paid by the customer.
reference_code
                                            	String	Client side code, which might be helpful during reconciliation.
Example:Payment Request-
Request URI- client's payment URI
Method type - POST
POST : {{base_url}}/payment

{
  "request_id": "12123122",
  "amount": 1000,
  "transaction_code": "01XV31A",
  "package_id": 1(Incase of package selection)
} 
Case:Success
{
  "request_id": "12123122",
  "response_code": 0,
  "response_message": "Payment successful",
  "amount": 1000,
  "reference_code": "12client34"
} 
Case:Failure
{
  "response_code": 1,
  "response_message": "Invalid token"
} 

Note:- reference_code is generated from clients while making payment .


Status Check
Request Method type - POST
**Authentication(Basic or Bearer Token) should be provided for every request.

Request
{
 "request_id": "",
 "amount": ,
 "transaction_code": ""
} 
where,
Field Name	Parameter Type	Field Description
request_id
                                            	String	Individually assigned unique ID for each user.
amount
                                            	double	Total amount to be paid by the customer.
transaction_code
                                            	String	Code generated from eSewa during payment.
Response
Below is the response received for the above request made -

{
 "request_id" : "",
 "response_code": "",
 "status": "",
 "response_message": "",
 "amount": ,
 "reference_code": ""
} 
where,
Field Name	Parameter Type	Field Description
request_id
                                            	String	Individually assigned unique ID for each user.
response_code
                                            	int	This is the response provided by client to eSewa to know the successful completion of any transaction. -0 Success -1 Failed
status
                                            	String	This shows if transaction is success or Failed in client's end. SUCCESS for success and FAILED for failure should be provided.
response_message
                                            	String	Response error message / Response message
amount
                                            	double	Total amount to be paid by the customer.
reference_code
                                            	String	Client side code, which might be helpful during reconciliation.
Example:Status Check-
Request URI- client's payment URI
Method type - POST
POST : {{base_url}}/status

{
  "request_id": "12123122",
  "amount": 1000,
  "transaction_code": "01XV31A"
} 
Case:Success
{
  "request_id": "1234",
  "response_code": 0,
  "status": "SUCCESS"
  "response_message": "Payment successful",
  "amount": 1000,
  "reference_code": "ABCD"
}  
Case:Failure
{
  "request_id": "1234",
  "response_code": 1,
  "status": "FAILED"
  "response_message": "Payment Not Found",
  "amount": 1000,
  "reference_code": ""
}  
ABOUT ESEWA

eSewa is a mobile wallet for online and offline payments with a user base of 8 millions, a vast network of 4 hundred thousand agents, and a comprehensive array of services.
It is a one-stop destination for all of your needs like mobile recharge, electricity bills payment,telephone bills payment, booking bus and airlines tickets, buying movie tickets, transferring money, and many more.

COMPANY
About Us
Career
Partner Banks
Contact us
FAQ
POLICIES
Privacy Policy
Terms & Conditions
Report Fraud & Misuse
Transaction Limits
DOWNLOAD APP
 
© 2009- 2025 eSewa.All Rights Reserved.
keep in touch---- 



