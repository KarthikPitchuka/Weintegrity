export const generateCSV = (data, headers) => {
    if (!data || !data.length) {
        return '';
    }

    const csvRows = [];

    // Add headers
    csvRows.push(headers.join(','));

    // format value to handle commas and quotes
    const formatValue = (val) => {
        if (val === null || val === undefined) return '';
        const stringVal = String(val);
        // Escape quotes and wrap in quotes if contains comma
        if (stringVal.includes(',') || stringVal.includes('"') || stringVal.includes('\n')) {
            return `"${stringVal.replace(/"/g, '""')}"`;
        }
        return stringVal;
    };

    // Add data rows
    for (const row of data) {
        const values = headers.map(header => {
            const val = row[header];
            return formatValue(val);
        });
        csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
};
