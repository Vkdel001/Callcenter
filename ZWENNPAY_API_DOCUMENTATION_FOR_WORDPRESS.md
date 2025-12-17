# ZwennPay API Documentation for WordPress Plugin Development

## Overview

This documentation provides comprehensive details about the ZwennPay API integration for generating QR codes and processing payments. This information is designed as input for WordPress plugin development to enable QR code generation with proper parameters and authentication.

## Table of Contents

1. [API Endpoint](#api-endpoint)
2. [Authentication](#authentication)
3. [Request Structure](#request-structure)
4. [Response Handling](#response-handling)
5. [QR Code Generation](#qr-code-generation)
6. [Data Sanitization](#data-sanitization)
7. [Error Handling](#error-handling)
8. [WordPress Plugin Implementation Guide](#wordpress-plugin-implementation-guide)
9. [Testing and Validation](#testing-and-validation)

## API Endpoint

**Base URL:** `https://api.zwennpay.com:9425/api/v1.0/Common/GetMerchantQR`

**Method:** `POST`

**Content-Type:** `application/json`

**Accept:** `text/plain`

## Authentication

The ZwennPay API uses merchant-based authentication through Merchant IDs. No API keys or tokens are required in the request headers.

### Merchant ID Configuration

Different merchant IDs are used based on Line of Business (LOB):

```php
$merchant_codes = [
    'life' => '151',
    'health' => '153', 
    'motor' => '155'
];
```

**Default Fallback:** If LOB-specific codes are not configured, use merchant ID `56`.

## Request Structure

### Required Headers

```php
$headers = [
    'Accept: text/plain',
    'Content-Type: application/json'
];
```

### Request Payload

The API expects a JSON payload with the following structure:

```json
{
    "MerchantId": 151,
    "SetTransactionAmount": true,
    "TransactionAmount": "1500.00",
    "SetConvenienceIndicatorTip": false,
    "ConvenienceIndicatorTip": 0,
    "SetConvenienceFeeFixed": false,
    "ConvenienceFeeFixed": 0,
    "SetConvenienceFeePercentage": false,
    "ConvenienceFeePercentage": 0,
    "SetAdditionalBillNumber": true,
    "AdditionalRequiredBillNumber": false,
    "AdditionalBillNumber": "LIFE.2024.001",
    "SetAdditionalMobileNo": true,
    "AdditionalRequiredMobileNo": false,
    "AdditionalMobileNo": "57123456",
    "SetAdditionalStoreLabel": false,
    "AdditionalRequiredStoreLabel": false,
    "AdditionalStoreLabel": "",
    "SetAdditionalLoyaltyNumber": false,
    "AdditionalRequiredLoyaltyNumber": false,
    "AdditionalLoyaltyNumber": "",
    "SetAdditionalReferenceLabel": false,
    "AdditionalRequiredReferenceLabel": false,
    "AdditionalReferenceLabel": "",
    "SetAdditionalCustomerLabel": true,
    "AdditionalRequiredCustomerLabel": false,
    "AdditionalCustomerLabel": "Mr J Smith",
    "SetAdditionalTerminalLabel": false,
    "AdditionalRequiredTerminalLabel": false,
    "AdditionalTerminalLabel": "",
    "SetAdditionalPurposeTransaction": true,
    "AdditionalRequiredPurposeTransaction": false,
    "AdditionalPurposeTransaction": "NIC Life"
}
```

### Key Parameters Explained

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `MerchantId` | integer | Yes | LOB-specific merchant ID (151, 153, 155) |
| `TransactionAmount` | string | Yes | Payment amount as string |
| `AdditionalBillNumber` | string | Yes | Sanitized policy number (see sanitization rules) |
| `AdditionalMobileNo` | string | Yes | Clean mobile number (digits only) |
| `AdditionalCustomerLabel` | string | Yes | Formatted customer name (max 24 chars) |
| `AdditionalPurposeTransaction` | string | Yes | Fixed value: "NIC Life" |

## Response Handling

### Success Response

The API returns a plain text QR data string:

```
00020101021226580014com.zwennpay.qr01151LIFE.2024.0010208150052040005303480...
```

### Error Responses

- **HTTP 400-499:** Client errors (invalid parameters)
- **HTTP 500-599:** Server errors
- **Empty/null response:** Invalid QR data

### Response Validation

```php
function validate_qr_response($qr_data) {
    if (empty($qr_data)) return false;
    if (strtolower($qr_data) === 'null') return false;
    if (strtolower($qr_data) === 'none') return false;
    if (strlen($qr_data) < 10) return false;
    return true;
}
```

## QR Code Generation

### Step 1: Data Sanitization

Before sending to API, sanitize the input data:

#### Policy Number Sanitization
```php
function sanitize_policy_number($policy_number) {
    if (empty($policy_number)) return '';
    
    // Replace hyphens and slashes with dots
    $sanitized = str_replace(['-', '/'], '.', $policy_number);
    
    return $sanitized;
}
```

**Examples:**
- `LIFE-001` → `LIFE.001`
- `HEALTH/2024/001` → `HEALTH.2024.001`
- `M-2024-001` → `M.2024.001`

#### Customer Name Formatting
```php
function format_customer_name($full_name) {
    if (empty($full_name)) return '';
    
    $parts = preg_split('/\s+/', trim($full_name));
    if (empty($parts)) return '';
    
    $titles = ['Mr', 'Mrs', 'Ms', 'Dr', 'Miss', 'Prof', 'Sir', 'Madam'];
    
    $title = '';
    $start_index = 0;
    
    // Check if first part is a title
    if (in_array($parts[0], $titles)) {
        $title = $parts[0];
        $start_index = 1;
    }
    
    // Handle single name case
    if (count($parts) === 1) {
        return substr($parts[0], 0, 24);
    }
    
    // Get first name initial
    $first_name = isset($parts[$start_index]) ? $parts[$start_index] : '';
    $first_initial = strtoupper(substr($first_name, 0, 1));
    
    // Get last name (last word)
    $last_name = end($parts);
    
    // Format: [Title] [FirstInitial] [LastName]
    $formatted = $title ? "$title $first_initial $last_name" : "$first_initial $last_name";
    
    // Truncate if exceeds 24 characters
    if (strlen($formatted) > 24) {
        $formatted = substr($formatted, 0, 24);
    }
    
    return trim($formatted);
}
```

**Examples:**
- `Mr Robert Davis Quatre Bornes` → `Mr R Bornes`
- `Vikram Ronald Kumar` → `V Kumar`
- `Mrs Sarah-Jane Wilson` → `Mrs S Wilson`

#### Mobile Number Cleaning
```php
function clean_mobile_number($mobile) {
    if (empty($mobile)) return '';
    
    // Remove all non-digit characters
    return preg_replace('/[^\d]/', '', $mobile);
}
```

### Step 2: API Request

```php
function generate_zwennpay_qr($customer_data) {
    // Validate required fields
    $required_fields = ['name', 'mobile', 'amountDue', 'policyNumber', 'lineOfBusiness'];
    foreach ($required_fields as $field) {
        if (empty($customer_data[$field])) {
            throw new Exception("Missing required field: $field");
        }
    }
    
    // Get merchant ID based on LOB
    $merchant_id = get_merchant_id_for_lob($customer_data['lineOfBusiness']);
    
    // Sanitize data
    $sanitized_policy = sanitize_policy_number($customer_data['policyNumber']);
    $formatted_name = format_customer_name($customer_data['name']);
    $clean_mobile = clean_mobile_number($customer_data['mobile']);
    
    // Prepare payload
    $payload = [
        'MerchantId' => intval($merchant_id),
        'SetTransactionAmount' => true,
        'TransactionAmount' => strval($customer_data['amountDue']),
        'SetConvenienceIndicatorTip' => false,
        'ConvenienceIndicatorTip' => 0,
        'SetConvenienceFeeFixed' => false,
        'ConvenienceFeeFixed' => 0,
        'SetConvenienceFeePercentage' => false,
        'ConvenienceFeePercentage' => 0,
        'SetAdditionalBillNumber' => true,
        'AdditionalRequiredBillNumber' => false,
        'AdditionalBillNumber' => $sanitized_policy,
        'SetAdditionalMobileNo' => true,
        'AdditionalRequiredMobileNo' => false,
        'AdditionalMobileNo' => $clean_mobile,
        'SetAdditionalStoreLabel' => false,
        'AdditionalRequiredStoreLabel' => false,
        'AdditionalStoreLabel' => '',
        'SetAdditionalLoyaltyNumber' => false,
        'AdditionalRequiredLoyaltyNumber' => false,
        'AdditionalLoyaltyNumber' => '',
        'SetAdditionalReferenceLabel' => false,
        'AdditionalRequiredReferenceLabel' => false,
        'AdditionalReferenceLabel' => '',
        'SetAdditionalCustomerLabel' => true,
        'AdditionalRequiredCustomerLabel' => false,
        'AdditionalCustomerLabel' => $formatted_name,
        'SetAdditionalTerminalLabel' => false,
        'AdditionalRequiredTerminalLabel' => false,
        'AdditionalTerminalLabel' => '',
        'SetAdditionalPurposeTransaction' => true,
        'AdditionalRequiredPurposeTransaction' => false,
        'AdditionalPurposeTransaction' => 'NIC Life'
    ];
    
    // Make API request
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => 'https://api.zwennpay.com:9425/api/v1.0/Common/GetMerchantQR',
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($payload),
        CURLOPT_HTTPHEADER => [
            'Accept: text/plain',
            'Content-Type: application/json'
        ],
        CURLOPT_TIMEOUT => 30,
        CURLOPT_SSL_VERIFYPEER => true
    ]);
    
    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curl_error = curl_error($ch);
    curl_close($ch);
    
    // Handle cURL errors
    if ($curl_error) {
        throw new Exception("cURL Error: $curl_error");
    }
    
    // Handle HTTP errors
    if ($http_code !== 200) {
        throw new Exception("ZwennPay API Error: HTTP $http_code - $response");
    }
    
    // Validate response
    $qr_data = trim($response);
    if (!validate_qr_response($qr_data)) {
        throw new Exception("Invalid QR data received from ZwennPay");
    }
    
    return [
        'success' => true,
        'qr_data' => $qr_data,
        'merchant_id' => $merchant_id,
        'transaction_amount' => $customer_data['amountDue'],
        'line_of_business' => $customer_data['lineOfBusiness']
    ];
}

function get_merchant_id_for_lob($line_of_business) {
    $merchant_codes = [
        'life' => '151',
        'health' => '153',
        'motor' => '155'
    ];
    
    $lob = strtolower(trim($line_of_business));
    
    if (!in_array($lob, ['life', 'health', 'motor'])) {
        throw new Exception("Invalid Line of Business: $line_of_business. Must be one of: life, health, motor");
    }
    
    if (!isset($merchant_codes[$lob])) {
        throw new Exception("Merchant code not configured for LOB: $lob");
    }
    
    return $merchant_codes[$lob];
}
```

### Step 3: QR Code Image Generation

After receiving QR data from ZwennPay API, generate a visual QR code. **Recommended approach is local generation** for better reliability and security:

#### Option A: Local QR Code Generation (Recommended)

```php
// Install PHP QR Code library: composer require endroid/qr-code

use Endroid\QrCode\Builder\Builder;
use Endroid\QrCode\Encoding\Encoding;
use Endroid\QrCode\ErrorCorrectionLevel\ErrorCorrectionLevelLow;
use Endroid\QrCode\Label\Alignment\LabelAlignmentCenter;
use Endroid\QrCode\Label\Font\NotoSans;
use Endroid\QrCode\RoundBlockSizeMode\RoundBlockSizeModeMargin;
use Endroid\QrCode\Writer\PngWriter;

function generate_qr_code_image_local($qr_data, $options = []) {
    $default_options = [
        'size' => 300,
        'margin' => 10,
        'foreground_color' => [0, 0, 0],
        'background_color' => [255, 255, 255],
        'encoding' => 'UTF-8'
    ];
    
    $options = array_merge($default_options, $options);
    
    try {
        $result = Builder::create()
            ->writer(new PngWriter())
            ->data($qr_data)
            ->encoding(new Encoding($options['encoding']))
            ->errorCorrectionLevel(new ErrorCorrectionLevelLow())
            ->size($options['size'])
            ->margin($options['margin'])
            ->roundBlockSizeMode(new RoundBlockSizeModeMargin())
            ->foregroundColor($options['foreground_color'])
            ->backgroundColor($options['background_color'])
            ->build();

        // Return base64 data URL for immediate use
        return 'data:image/png;base64,' . base64_encode($result->getString());
        
    } catch (Exception $e) {
        error_log("Local QR generation failed: " . $e->getMessage());
        // Fallback to external service
        return generate_qr_code_image_external($qr_data, $options);
    }
}
```

#### Option B: External QR Code Generation (Fallback)

```php
function generate_qr_code_image_external($qr_data, $options = []) {
    $default_options = [
        'size' => '300x300',
        'format' => 'png',
        'ecc' => 'L',
        'margin' => 10,
        'qzone' => 2,
        'bgcolor' => 'ffffff',
        'color' => '000000'
    ];
    
    $options = array_merge($default_options, $options);
    
    // Using QR Server API as fallback
    $params = http_build_query([
        'size' => $options['size'],
        'data' => $qr_data,
        'format' => $options['format'],
        'ecc' => $options['ecc'],
        'margin' => $options['margin'],
        'qzone' => $options['qzone'],
        'bgcolor' => $options['bgcolor'],
        'color' => $options['color']
    ]);
    
    $qr_image_url = "https://api.qrserver.com/v1/create-qr-code/?$params";
    
    return $qr_image_url;
}

// Main QR generation function with fallback
function generate_qr_code_image($qr_data, $options = []) {
    // Try local generation first (recommended)
    if (class_exists('Endroid\QrCode\Builder\Builder')) {
        return generate_qr_code_image_local($qr_data, $options);
    }
    
    // Fallback to external service
    return generate_qr_code_image_external($qr_data, $options);
}
```

## Error Handling

### Common Error Scenarios

1. **Network/Connection Errors**
   - CORS issues
   - SSL certificate problems
   - Timeout errors

2. **API Errors**
   - Invalid merchant ID
   - Malformed request payload
   - Server-side errors

3. **Data Validation Errors**
   - Missing required fields
   - Invalid LOB values
   - Empty/null responses

### Error Handling Implementation

```php
function handle_qr_generation_error($error) {
    $error_message = $error->getMessage();
    
    // Log error for debugging
    error_log("ZwennPay QR Generation Error: $error_message");
    
    // Determine error type and provide appropriate response
    if (strpos($error_message, 'cURL') !== false) {
        return [
            'success' => false,
            'error' => 'Network connection error. Please try again.',
            'error_type' => 'network'
        ];
    }
    
    if (strpos($error_message, 'Invalid Line of Business') !== false) {
        return [
            'success' => false,
            'error' => 'Invalid line of business specified.',
            'error_type' => 'validation'
        ];
    }
    
    if (strpos($error_message, 'ZwennPay API Error') !== false) {
        return [
            'success' => false,
            'error' => 'Payment service temporarily unavailable.',
            'error_type' => 'api'
        ];
    }
    
    return [
        'success' => false,
        'error' => 'QR code generation failed. Please try again.',
        'error_type' => 'general'
    ];
}
```

## WordPress Plugin Implementation Guide

### Plugin Structure

```
zwennpay-qr-generator/
├── zwennpay-qr-generator.php (main plugin file)
├── includes/
│   ├── class-zwennpay-api.php
│   ├── class-qr-generator.php
│   └── functions.php
├── admin/
│   ├── admin-page.php
│   └── settings.php
├── public/
│   ├── shortcodes.php
│   └── ajax-handlers.php
└── assets/
    ├── css/
    └── js/
```

### Main Plugin File

```php
<?php
/**
 * Plugin Name: ZwennPay QR Generator
 * Description: Generate QR codes for payments using ZwennPay API
 * Version: 1.0.0
 * Author: Your Name
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Define plugin constants
define('ZWENNPAY_QR_PLUGIN_URL', plugin_dir_url(__FILE__));
define('ZWENNPAY_QR_PLUGIN_PATH', plugin_dir_path(__FILE__));

// Include required files
require_once ZWENNPAY_QR_PLUGIN_PATH . 'includes/class-zwennpay-api.php';
require_once ZWENNPAY_QR_PLUGIN_PATH . 'includes/class-qr-generator.php';
require_once ZWENNPAY_QR_PLUGIN_PATH . 'includes/functions.php';

// Initialize plugin
add_action('plugins_loaded', 'zwennpay_qr_init');

function zwennpay_qr_init() {
    // Initialize classes
    new ZwennPay_API();
    new QR_Generator();
    
    // Add admin menu
    add_action('admin_menu', 'zwennpay_qr_admin_menu');
    
    // Register shortcodes
    add_shortcode('zwennpay_qr_form', 'zwennpay_qr_form_shortcode');
}

function zwennpay_qr_admin_menu() {
    add_options_page(
        'ZwennPay QR Settings',
        'ZwennPay QR',
        'manage_options',
        'zwennpay-qr-settings',
        'zwennpay_qr_settings_page'
    );
}
```

### Shortcode Implementation

```php
function zwennpay_qr_form_shortcode($atts) {
    $atts = shortcode_atts([
        'show_lob' => 'true',
        'default_lob' => 'life',
        'show_amount' => 'true',
        'button_text' => 'Generate QR Code'
    ], $atts);
    
    ob_start();
    ?>
    <div id="zwennpay-qr-form">
        <form id="qr-generation-form">
            <div class="form-group">
                <label for="customer_name">Customer Name *</label>
                <input type="text" id="customer_name" name="customer_name" required maxlength="50">
            </div>
            
            <div class="form-group">
                <label for="policy_number">Policy Number *</label>
                <input type="text" id="policy_number" name="policy_number" required>
            </div>
            
            <div class="form-group">
                <label for="mobile_number">Mobile Number *</label>
                <input type="tel" id="mobile_number" name="mobile_number" required>
            </div>
            
            <?php if ($atts['show_amount'] === 'true'): ?>
            <div class="form-group">
                <label for="amount_due">Amount Due *</label>
                <input type="number" id="amount_due" name="amount_due" step="0.01" min="0" required>
            </div>
            <?php endif; ?>
            
            <?php if ($atts['show_lob'] === 'true'): ?>
            <div class="form-group">
                <label for="line_of_business">Line of Business *</label>
                <select id="line_of_business" name="line_of_business" required>
                    <option value="">Select...</option>
                    <option value="life" <?php selected($atts['default_lob'], 'life'); ?>>Life Insurance</option>
                    <option value="health" <?php selected($atts['default_lob'], 'health'); ?>>Health Insurance</option>
                    <option value="motor" <?php selected($atts['default_lob'], 'motor'); ?>>Motor Insurance</option>
                </select>
            </div>
            <?php endif; ?>
            
            <button type="submit" id="generate-qr-btn"><?php echo esc_html($atts['button_text']); ?></button>
        </form>
        
        <div id="qr-result" style="display: none;">
            <h3>Payment QR Code</h3>
            <div id="qr-code-container"></div>
            <div id="payment-details"></div>
        </div>
        
        <div id="error-message" style="display: none; color: red;"></div>
    </div>
    
    <script>
    jQuery(document).ready(function($) {
        $('#qr-generation-form').on('submit', function(e) {
            e.preventDefault();
            
            var formData = {
                action: 'generate_zwennpay_qr',
                nonce: '<?php echo wp_create_nonce("zwennpay_qr_nonce"); ?>',
                customer_name: $('#customer_name').val(),
                policy_number: $('#policy_number').val(),
                mobile_number: $('#mobile_number').val(),
                amount_due: $('#amount_due').val(),
                line_of_business: $('#line_of_business').val()
            };
            
            $('#generate-qr-btn').prop('disabled', true).text('Generating...');
            $('#error-message').hide();
            $('#qr-result').hide();
            
            $.ajax({
                url: ajaxurl,
                type: 'POST',
                data: formData,
                success: function(response) {
                    if (response.success) {
                        $('#qr-code-container').html('<img src="' + response.data.qr_image_url + '" alt="Payment QR Code">');
                        $('#payment-details').html(
                            '<p><strong>Amount:</strong> MUR ' + response.data.transaction_amount + '</p>' +
                            '<p><strong>Policy:</strong> ' + formData.policy_number + '</p>' +
                            '<p><strong>Merchant ID:</strong> ' + response.data.merchant_id + '</p>'
                        );
                        $('#qr-result').show();
                    } else {
                        $('#error-message').text(response.data.error).show();
                    }
                },
                error: function() {
                    $('#error-message').text('An error occurred. Please try again.').show();
                },
                complete: function() {
                    $('#generate-qr-btn').prop('disabled', false).text('<?php echo esc_js($atts['button_text']); ?>');
                }
            });
        });
    });
    </script>
    <?php
    return ob_get_clean();
}
```

### AJAX Handler

```php
add_action('wp_ajax_generate_zwennpay_qr', 'handle_zwennpay_qr_generation');
add_action('wp_ajax_nopriv_generate_zwennpay_qr', 'handle_zwennpay_qr_generation');

function handle_zwennpay_qr_generation() {
    // Verify nonce
    if (!wp_verify_nonce($_POST['nonce'], 'zwennpay_qr_nonce')) {
        wp_die('Security check failed');
    }
    
    try {
        // Sanitize input data
        $customer_data = [
            'name' => sanitize_text_field($_POST['customer_name']),
            'policyNumber' => sanitize_text_field($_POST['policy_number']),
            'mobile' => sanitize_text_field($_POST['mobile_number']),
            'amountDue' => floatval($_POST['amount_due']),
            'lineOfBusiness' => sanitize_text_field($_POST['line_of_business'])
        ];
        
        // Generate QR code
        $qr_result = generate_zwennpay_qr($customer_data);
        
        if ($qr_result['success']) {
            // Generate QR code image (local generation preferred)
            $qr_image_result = generate_qr_code_image($qr_result['qr_data']);
            
            wp_send_json_success([
                'qr_data' => $qr_result['qr_data'],
                'qr_image_url' => $qr_image_result,
                'merchant_id' => $qr_result['merchant_id'],
                'transaction_amount' => $qr_result['transaction_amount'],
                'line_of_business' => $qr_result['line_of_business'],
                'generation_method' => class_exists('Endroid\QrCode\Builder\Builder') ? 'local' : 'external'
            ]);
        } else {
            wp_send_json_error(['error' => 'QR generation failed']);
        }
        
    } catch (Exception $e) {
        $error_response = handle_qr_generation_error($e);
        wp_send_json_error($error_response);
    }
}
```

## Testing and Validation

### Test Data

Use the following test data to validate your implementation:

```php
$test_customer_data = [
    'name' => 'Mr John Smith',
    'policyNumber' => 'LIFE-2024-001',
    'mobile' => '57123456',
    'amountDue' => 1500.00,
    'lineOfBusiness' => 'life'
];
```

### Expected Results

- **Sanitized Policy:** `LIFE.2024.001`
- **Formatted Name:** `Mr J Smith`
- **Clean Mobile:** `57123456`
- **Merchant ID:** `151`

### Validation Checklist

- [ ] Policy number sanitization works correctly
- [ ] Customer name formatting respects 24-character limit
- [ ] Mobile number cleaning removes non-digits
- [ ] Correct merchant ID selected based on LOB
- [ ] API request payload structure is correct
- [ ] Response validation catches invalid QR data
- [ ] Error handling provides meaningful messages
- [ ] **Local QR code generation works (preferred method)**
- [ ] **External QR fallback works when local generation fails**
- [ ] **QR generation method is logged for debugging**
- [ ] WordPress integration functions properly
- [ ] **Composer dependencies installed correctly**

## QR Code Generation Methods Comparison

| Method | Pros | Cons | Recommended Use |
|--------|------|------|-----------------|
| **Local Generation** | ✅ No external dependencies<br>✅ Faster performance<br>✅ Better security<br>✅ Works offline<br>✅ No data sent to third parties | ❌ Requires PHP library installation<br>❌ Slightly larger plugin size | **Primary method** - Use for all production environments |
| **External Services** | ✅ No library dependencies<br>✅ Smaller plugin size<br>✅ Easy implementation | ❌ Requires internet connection<br>❌ Dependent on external service<br>❌ Potential privacy concerns<br>❌ May have rate limits | **Fallback only** - Use when local generation fails |

### Installation Requirements

For local QR generation, add to your plugin's composer.json:

```json
{
    "require": {
        "endroid/qr-code": "^4.0"
    }
}
```

Then run: `composer install`

## Security Considerations

1. **Input Validation:** Always sanitize and validate user inputs
2. **Nonce Verification:** Use WordPress nonces for AJAX requests
3. **Capability Checks:** Verify user permissions where appropriate
4. **SSL/TLS:** Ensure HTTPS for API communications
5. **Error Logging:** Log errors securely without exposing sensitive data
6. **Local QR Generation:** Prefer local generation to avoid sending payment data to external services
7. **Data Privacy:** When using external QR services, ensure compliance with privacy regulations

## Support and Troubleshooting

### Common Issues

1. **CORS Errors:** Ensure proper headers and SSL configuration
2. **Invalid QR Data:** Check data sanitization and API payload
3. **Network Timeouts:** Implement proper timeout handling
4. **Character Limits:** Respect ZwennPay's field length restrictions
5. **QR Generation Failures:** 
   - Check if Endroid QR Code library is installed for local generation
   - Verify external QR service availability if using fallback
   - Ensure proper error handling between local and external methods
6. **Performance Issues:** Local QR generation is faster than external services

### Debug Mode

Enable debug logging in WordPress:

```php
define('WP_DEBUG', true);
define('WP_DEBUG_LOG', true);
```

## Summary

This documentation provides all necessary information to implement a WordPress plugin that integrates with the ZwennPay API for QR code generation. The implementation follows WordPress best practices and includes:

### Key Features:
- **Local QR Generation (Recommended):** Uses Endroid QR Code library for better performance and security
- **External QR Fallback:** Uses api.qrserver.com when local generation is unavailable
- **Proper Error Handling:** Graceful fallback between generation methods
- **Security Best Practices:** Input validation, nonce verification, and data privacy
- **WordPress Integration:** Shortcodes, AJAX handlers, and admin interfaces

### Advantages of Local QR Generation:
1. **No External Dependencies:** Works without internet connection
2. **Better Performance:** Faster than external API calls
3. **Enhanced Security:** Payment data never leaves your server
4. **Reliability:** No dependency on external service availability
5. **Privacy Compliance:** Better adherence to data protection regulations

The implementation prioritizes local QR generation while maintaining compatibility with external services as a fallback option, ensuring robust and reliable QR code generation for WordPress environments.