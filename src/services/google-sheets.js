/**
 * @module GoogleSheetsService
 * @description Pobieranie danych z Google Sheets
 */

const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');
const config = require('../shared/config');
const logger = require('../shared/logger');

class GoogleSheetsService {
    constructor() {
        this.sheets = null;
        this.auth = null;
    }

    async initialize() {
        if (this.sheets) return;

        try {
            const credentialsPath = path.resolve(process.cwd(), config.google.serviceAccountPath);

            if (!fs.existsSync(credentialsPath)) {
                logger.warn('Google credentials file not found', { path: credentialsPath });
                return false;
            }

            const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf-8'));

            this.auth = new google.auth.GoogleAuth({
                credentials,
                scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
            });

            this.sheets = google.sheets({ version: 'v4', auth: this.auth });
            logger.info('GoogleSheetsService initialized');
            return true;
        } catch (error) {
            logger.error('Failed to initialize GoogleSheetsService', { error: error.message });
            return false;
        }
    }

    async fetchRows() {
        if (!this.sheets) {
            const initialized = await this.initialize();
            if (!initialized) {
                return { success: false, error: 'Nie skonfigurowano Google API', rows: [] };
            }
        }

        const sheetId = config.google.sheetId;
        const sheetName = config.google.sheetName;

        if (!sheetId) {
            logger.warn('GOOGLE_SHEET_ID not configured');
            return { success: false, error: 'Brak GOOGLE_SHEET_ID w konfiguracji', rows: [] };
        }

        try {
            logger.info('Fetching data from Google Sheets', { sheetId, sheetName });

            const response = await this.sheets.spreadsheets.values.get({
                spreadsheetId: sheetId,
                range: `${sheetName}!A:Z` // Pobierz wszystkie kolumny
            });

            const values = response.data.values;
            if (!values || values.length === 0) {
                logger.warn('No data found in sheet');
                return { success: true, rows: [] };
            }

            // First row is header
            const headers = values[0];
            const rows = values.slice(1).map(row => {
                const obj = {};
                headers.forEach((header, i) => {
                    obj[header] = row[i] || '';
                });
                return obj;
            });

            logger.info('Fetched rows from Google Sheets', { count: rows.length });
            return { success: true, rows };

        } catch (error) {
            logger.error('Failed to fetch Google Sheets data', { error: error.message });
            return { success: false, error: error.message, rows: [] };
        }
    }
}

module.exports = new GoogleSheetsService();
