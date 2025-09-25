# Test Plan for Bulk Messaging Functionality

## Features Implemented

### 1. WhatsApp Bulk Messaging
- ✅ Opens WhatsApp Web with pre-filled message
- ✅ Copies formatted phone numbers to clipboard automatically
- ✅ Shows detailed instructions for creating broadcast list
- ✅ Formats Israeli phone numbers correctly (adds 972 country code)
- ✅ Displays selected leads with phone numbers

### 2. Email Bulk Messaging  
- ✅ Creates single email with all recipients in "To" field
- ✅ Filters out leads without email addresses
- ✅ Shows error if no valid email addresses found
- ✅ Displays selected leads with email addresses

### 3. UI Improvements
- ✅ Shows explanation of bulk messaging behavior
- ✅ Displays list of selected leads with contact info
- ✅ Copy button for phone numbers/emails
- ✅ Better visual feedback and instructions

## How to Test

1. **Navigate to Leads page**
2. **Select multiple leads** using checkboxes
3. **Click "שלח הודעות" button**
4. **Choose message type** (WhatsApp or Email)
5. **Select template or write custom message**
6. **Click "שלח הודעות"**

### WhatsApp Testing
- Should open WhatsApp Web
- Phone numbers should be copied to clipboard
- Instructions should appear for creating broadcast list

### Email Testing  
- Should open email client with all recipients in "To" field
- All selected leads with emails should be included
- Message should be personalized with first lead's info

## Expected Behavior

- **WhatsApp**: Single message opens with instructions to create broadcast list
- **Email**: Single email with multiple recipients in "To" field
- **UI**: Clear feedback and easy copying of contact information
