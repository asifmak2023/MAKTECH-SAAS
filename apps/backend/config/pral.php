<?php

return [
    'use_sandbox' => env('PRAL_USE_SANDBOX', true),

    'production' => [
        'base_url' => env('PRAL_PRODUCTION_BASE_URL', 'https://gw.fbr.gov.pk'),
        'token' => env('PRAL_PRODUCTION_TOKEN'),
    ],

    'sandbox' => [
        'base_url' => env('PRAL_SANDBOX_BASE_URL', 'https://gw.fbr.gov.pk'),
        'token' => env('PRAL_SANDBOX_TOKEN'),
    ],

    'timeout' => (int) env('PRAL_TIMEOUT', 30),

    'cache_ttl' => (int) env('PRAL_CACHE_TTL', 86400),

    'endpoints' => [
        'validate' => '/di_data/v1/di/validateinvoicedata',
        'submit' => '/di_data/v1/di/postinvoicedata',
        'hs_codes' => '/pdi/v1/itemdesccode',
        'uoms' => '/pdi/v1/uom',
        'sale_types' => '/pdi/v1/transtypecode',
        'provinces' => '/pdi/v1/provinces',
        'doc_types' => '/pdi/v1/doctypecode',
        'sro_schedule' => '/pdi/v1/sroschedule',
        'sro_item' => '/pdi/v1/sroitemdesc',
        'sale_type_to_rate' => '/pdi/v2/SaleTypeToRate',
    ],

    /*
    | Sandbox DI endpoints carry the "_sb" suffix. Production and sandbox routing
    | is otherwise identical, so we keep two URL sets and select on the active
    | environment so credentials can never silently cross environments.
    */
    'sandbox_endpoints' => [
        'validate' => '/di_data/v1/di/validateinvoicedata_sb',
        'submit' => '/di_data/v1/di/postinvoicedata_sb',
    ],

    'error_codes' => [
        '0001' => 'Please provide a valid seller NTN or CNIC.',
        '0002' => 'Please provide a valid buyer NTN or CNIC.',
        '0003' => 'Please select a valid invoice type.',
        '0004' => 'Please provide a valid invoice date.',
        '0005' => 'Please select a valid HS Code for each item.',
        '0006' => 'Please select a valid unit of measure (UoM).',
        '0007' => 'Please select a valid rate for the selected sale type.',
        '0008' => 'Please provide quantity for each line item.',
        '0009' => 'Please provide value of sales excluding sales tax.',
        '0010' => 'Please provide a valid sale type.',
        '0011' => 'Buyer registration type is required.',
        '0012' => 'Seller business name is required.',
        '0013' => 'Buyer business name is required.',
        '0014' => 'Seller province is required.',
        '0015' => 'Buyer province is required.',
        '0016' => 'Sales tax applicable amount is invalid.',
        '0017' => 'Invoice already submitted to FBR.',
        '0018' => 'Authentication failed. Check your PRAL token.',
        '0019' => 'Scenario ID is required for sandbox invoices.',
        '0020' => 'Provide rate.',
        '0046' => 'Provided rate is not correct for the selected sale type.',
        '0058' => 'Buyer and seller registration numbers are the same.',
        '0071' => 'Provided buyer NTN/CNIC is invalid.',
        '0077' => 'A valid SRO/Schedule number is mandatory where the rate is not 18%.',
        '0078' => 'A valid item serial number is mandatory where an SRO/Schedule number is provided.',
        '0082' => 'Provided seller registration number does not belong to a registered person.',
        '0100' => 'Provided buyer is not registered for sales tax.',
        '0108' => 'Seller registration number is not in a valid format.',
        '0300' => 'Provided numeric values are invalid.',
        '0401' => 'Unauthorized access: the token is not authorized for this seller registration number, or the registration number format is invalid.',
    ],
];
