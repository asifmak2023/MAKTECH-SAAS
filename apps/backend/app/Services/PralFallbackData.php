<?php

namespace App\Services;

class PralFallbackData
{
    public static function provinces(): array
    {
        return [
            ['stateProvinceCode' => 2, 'stateProvinceDesc' => 'Balochistan'],
            ['stateProvinceCode' => 4, 'stateProvinceDesc' => 'Punjab'],
            ['stateProvinceCode' => 5, 'stateProvinceDesc' => 'Sindh'],
            ['stateProvinceCode' => 6, 'stateProvinceDesc' => 'Khyber Pakhtunkhwa'],
            ['stateProvinceCode' => 7, 'stateProvinceDesc' => 'Islamabad Capital Territory'],
            ['stateProvinceCode' => 8, 'stateProvinceDesc' => 'Azad Jammu & Kashmir'],
            ['stateProvinceCode' => 9, 'stateProvinceDesc' => 'Gilgit Baltistan'],
        ];
    }

    public static function saleTypes(): array
    {
        return [
            ['transactioN_TYPE_ID' => 1, 'transactioN_DESC' => 'Goods at standard rate (default)'],
            ['transactioN_TYPE_ID' => 2, 'transactioN_DESC' => 'Goods at Reduced Rate'],
            ['transactioN_TYPE_ID' => 3, 'transactioN_DESC' => 'Goods at zero-rate'],
            ['transactioN_TYPE_ID' => 4, 'transactioN_DESC' => 'Exempt goods'],
            ['transactioN_TYPE_ID' => 5, 'transactioN_DESC' => 'Services'],
        ];
    }

    public static function uoms(): array
    {
        return [
            ['uom' => 'Numbers, pieces, units', 'description' => 'Numbers, pieces, units'],
            ['uom' => 'Kilogram', 'description' => 'Kilogram'],
            ['uom' => 'Litre', 'description' => 'Litre'],
            ['uom' => 'Meter', 'description' => 'Meter'],
            ['uom' => 'Square Metre', 'description' => 'Square Metre'],
            ['uom' => 'Pack', 'description' => 'Pack'],
            ['uom' => 'Dozen', 'description' => 'Dozen'],
        ];
    }

    public static function hsCodes(): array
    {
        return [
            ['hS_CODE' => '0101.2100', 'description' => 'Live horses - pure-bred breeding animals'],
            ['hS_CODE' => '2402.2000', 'description' => 'Cigarettes containing tobacco'],
            ['hS_CODE' => '2710.1911', 'description' => 'Motor spirit'],
            ['hS_CODE' => '3004.9099', 'description' => 'Medicaments'],
            ['hS_CODE' => '5208.5200', 'description' => 'Woven cotton fabrics'],
            ['hS_CODE' => '8471.3000', 'description' => 'Portable automatic data processing machines'],
            ['hS_CODE' => '8703.2190', 'description' => 'Motor cars'],
            ['hS_CODE' => '9403.6000', 'description' => 'Wooden furniture'],
        ];
    }

    public static function docTypes(): array
    {
        return [
            ['docType' => 'Sale Invoice'],
            ['docType' => 'Debit Note'],
        ];
    }

    public static function rates(): array
    {
        return [
            ['rate' => '18%', 'value' => 18],
            ['rate' => '17%', 'value' => 17],
            ['rate' => '16%', 'value' => 16],
            ['rate' => '5%', 'value' => 5],
            ['rate' => '0%', 'value' => 0],
            ['rate' => 'Exempt', 'value' => 0],
        ];
    }
}
