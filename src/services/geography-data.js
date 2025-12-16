/**
 * @module GeographyData
 * @description Dannye geograficzne (Regiony i Miasta) dla LarpGothic API
 */

const REGIONS = {
    1: 'Khorinis',
    2: 'Myrtana',
    3: 'Varant',
    4: 'Archolos',
    5: 'Nordmar',
    6: 'Wyspy Południowe',
    7: 'Wschodni Archipelag'
};

const CITIES = [
    { id: 1, region: 1, name: "Miasto Khorinis" },
    { id: 2, region: 1, name: "Farmy" },
    { id: 3, region: 2, name: "Ardea" },
    { id: 4, region: 2, name: "Cape Dun" },
    { id: 5, region: 2, name: "Montera" },
    { id: 6, region: 2, name: "Vengard" },
    { id: 7, region: 2, name: "Silden" },
    { id: 8, region: 2, name: "Geldern" },
    { id: 9, region: 2, name: "Faring" },
    { id: 10, region: 2, name: "Gotha" },
    { id: 11, region: 2, name: "Trelis" },
    { id: 12, region: 3, name: "Ishtar" },
    { id: 13, region: 3, name: "Mora Sul" },
    { id: 14, region: 3, name: "Bakaresh" },
    { id: 15, region: 3, name: "Braga" },
    { id: 16, region: 3, name: "Ben Erai" },
    { id: 17, region: 3, name: "Lago" },
    { id: 18, region: 3, name: "Ben Sala" },
    { id: 19, region: 4, name: "Miasto Archolos" },
    { id: 20, region: 4, name: "SIlbach" },
    { id: 21, region: 4, name: "Wilcze Leże" },
    { id: 22, region: 4, name: "Winnica Rity" },
    { id: 23, region: 4, name: "Winnica Valerio" },
    { id: 24, region: 5, name: "Klan Młota" },
    { id: 25, region: 5, name: "Klan Ognia" },
    { id: 26, region: 5, name: "Klan Wilka" },
    { id: 27, region: 6, name: "Wyspy Południowe" },
    { id: 28, region: 7, name: "Wschodni Archipelag" }
];

module.exports = {
    REGIONS,
    CITIES
};
