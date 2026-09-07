<?php

/*
| Sandbox scenario catalogue. Payloads live in resources/fbr/scenarios/{id}.json
| and mirror the official PRAL "DI Scenarios JSON for Sandbox Testing" fixtures.
| The descriptions below match the PRAL DI API technical documentation v1.12.
*/

return [
    'SN001' => ['name' => 'Goods at standard rate', 'sale_type' => 'Goods at Standard Rate', 'buyer' => 'Registered'],
    'SN002' => ['name' => 'Goods at standard rate', 'sale_type' => 'Goods at Standard Rate', 'buyer' => 'Unregistered'],
    'SN003' => ['name' => 'Sale of steel (melted & re-rolled)', 'sale_type' => 'Steel Melting and re-rolling', 'buyer' => 'Registered'],
    'SN004' => ['name' => 'Sale of steel scrap by ship breakers', 'sale_type' => 'Ship breaking', 'buyer' => 'Registered'],
    'SN005' => ['name' => 'Reduced rate goods (Eighth Schedule)', 'sale_type' => 'Goods at Reduced Rate', 'buyer' => 'Registered'],
    'SN006' => ['name' => 'Exempt goods (Sixth Schedule)', 'sale_type' => 'Exempt Goods', 'buyer' => 'Registered'],
    'SN007' => ['name' => 'Zero-rated goods (Fifth Schedule)', 'sale_type' => 'Goods at zero-rate', 'buyer' => 'Registered'],
    'SN008' => ['name' => 'Third Schedule goods', 'sale_type' => '3rd Schedule Goods', 'buyer' => 'Registered'],
    'SN011' => ['name' => 'Toll manufacturing (steel sector)', 'sale_type' => 'Toll Manufacturing', 'buyer' => 'Registered'],
    'SN012' => ['name' => 'Petroleum products', 'sale_type' => 'Petroleum Products', 'buyer' => 'Registered'],
    'SN013' => ['name' => 'Electricity supply to retailers', 'sale_type' => 'Electricity Supply to Retailers', 'buyer' => 'Registered'],
    'SN014' => ['name' => 'Gas supply to CNG stations', 'sale_type' => 'Gas to CNG stations', 'buyer' => 'Registered'],
    'SN015' => ['name' => 'Mobile phones', 'sale_type' => 'Mobile Phones', 'buyer' => 'Registered'],
    'SN016' => ['name' => 'Processing / conversion of goods', 'sale_type' => 'Processing/ Conversion of Goods', 'buyer' => 'Registered'],
    'SN017' => ['name' => 'Goods with FED in ST mode', 'sale_type' => 'Goods (FED in ST Mode)', 'buyer' => 'Registered'],
    'SN018' => ['name' => 'Services with FED in ST mode', 'sale_type' => 'Services (FED in ST Mode)', 'buyer' => 'Registered'],
    'SN019' => ['name' => 'Services', 'sale_type' => 'Services', 'buyer' => 'Registered'],
    'SN020' => ['name' => 'Electric vehicles', 'sale_type' => 'Electric Vehicle', 'buyer' => 'Registered'],
    'SN021' => ['name' => 'Cement / concrete block', 'sale_type' => 'Cement /Concrete Block', 'buyer' => 'Registered'],
    'SN022' => ['name' => 'Potassium chlorate', 'sale_type' => 'Potassium Chlorate', 'buyer' => 'Registered'],
    'SN023' => ['name' => 'CNG sales', 'sale_type' => 'CNG Sales', 'buyer' => 'Registered'],
    'SN024' => ['name' => 'Goods under SRO 297(I)/2023', 'sale_type' => 'Goods as per SRO.297(I)/2023', 'buyer' => 'Registered'],
    'SN025' => ['name' => 'Drugs at fixed ST rate (Eighth Sched. sr. 81)', 'sale_type' => 'Non-Adjustable Supplies', 'buyer' => 'Registered'],
    'SN026' => ['name' => 'Sale to end consumer (retailer)', 'sale_type' => 'Goods at Standard Rate', 'buyer' => 'Unregistered'],
    'SN027' => ['name' => '3rd Schedule sale to end consumer (retailer)', 'sale_type' => '3rd Schedule Goods', 'buyer' => 'Unregistered'],
    'SN028' => ['name' => 'Reduced rate sale to end consumer (retailer)', 'sale_type' => 'Goods at Reduced Rate', 'buyer' => 'Unregistered'],
];
