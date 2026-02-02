/**
 * Payroll Calculation Service
 * Handles all payroll calculations according to Indian tax laws
 */

// Indian Income Tax Slabs for FY 2024-25 (New Regime)
const NEW_TAX_SLABS = [
    { min: 0, max: 300000, rate: 0 },
    { min: 300000, max: 600000, rate: 5 },
    { min: 600000, max: 900000, rate: 10 },
    { min: 900000, max: 1200000, rate: 15 },
    { min: 1200000, max: 1500000, rate: 20 },
    { min: 1500000, max: Infinity, rate: 30 }
];

// Old Tax Regime Slabs
const OLD_TAX_SLABS = [
    { min: 0, max: 250000, rate: 0 },
    { min: 250000, max: 500000, rate: 5 },
    { min: 500000, max: 1000000, rate: 20 },
    { min: 1000000, max: Infinity, rate: 30 }
];

// Professional Tax Slabs (Karnataka example - varies by state)
const PROFESSIONAL_TAX_SLABS = [
    { min: 0, max: 15000, amount: 0 },
    { min: 15001, max: Infinity, amount: 200 }
];

// Constants
const PF_CEILING = 15000; // PF calculated on max 15000 basic
const ESI_CEILING = 21000; // ESI applicable if gross <= 21000
const STANDARD_DEDUCTION = 50000; // Annual standard deduction

/**
 * Calculate monthly Professional Tax based on gross salary
 */
export const calculateProfessionalTax = (grossSalary) => {
    for (const slab of PROFESSIONAL_TAX_SLABS) {
        if (grossSalary > slab.min && grossSalary <= slab.max) {
            return slab.amount;
        }
    }
    return 200; // Max PT
};

/**
 * Calculate Provident Fund contribution
 */
export const calculatePF = (basicPay, pfPercentage = 12, ceilingApplied = true) => {
    const baseAmount = ceilingApplied ? Math.min(basicPay, PF_CEILING) : basicPay;
    return Math.round(baseAmount * pfPercentage / 100);
};

/**
 * Calculate ESI contribution
 */
export const calculateESI = (grossSalary, esiPercentage = 0.75) => {
    if (grossSalary > ESI_CEILING) {
        return 0; // Not applicable
    }
    return Math.round(grossSalary * esiPercentage / 100);
};

/**
 * Calculate Income Tax (TDS) - Simplified monthly calculation
 */
export const calculateIncomeTax = (annualTaxableIncome, taxRegime = 'new') => {
    const slabs = taxRegime === 'new' ? NEW_TAX_SLABS : OLD_TAX_SLABS;
    let tax = 0;
    let remainingIncome = annualTaxableIncome;

    for (const slab of slabs) {
        if (remainingIncome <= 0) break;

        const slabWidth = slab.max - slab.min;
        const taxableInSlab = Math.min(remainingIncome, slabWidth);
        tax += taxableInSlab * slab.rate / 100;
        remainingIncome -= taxableInSlab;
    }

    // Add 4% Health & Education Cess
    tax = tax * 1.04;

    return Math.round(tax);
};

/**
 * Calculate Loss of Pay deduction
 */
export const calculateLOP = (grossSalary, totalWorkingDays, lopDays) => {
    if (totalWorkingDays <= 0 || lopDays <= 0) return 0;
    const perDaySalary = grossSalary / totalWorkingDays;
    return Math.round(perDaySalary * lopDays);
};

/**
 * Calculate Overtime amount
 */
export const calculateOvertime = (basicPay, overtimeHours, overtimeMultiplier = 2) => {
    if (overtimeHours <= 0) return 0;
    // Assuming 8 hours/day, 26 working days
    const hourlyRate = basicPay / (26 * 8);
    return Math.round(hourlyRate * overtimeMultiplier * overtimeHours);
};

/**
 * Convert number to words (Indian format)
 */
export const numberToWords = (num) => {
    if (num === 0) return 'Zero Rupees Only';

    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
        'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
        'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const convertLessThanThousand = (n) => {
        if (n === 0) return '';
        if (n < 20) return ones[n];
        if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
        return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convertLessThanThousand(n % 100) : '');
    };

    const roundedNum = Math.round(num);
    let result = '';

    if (roundedNum >= 10000000) {
        result += convertLessThanThousand(Math.floor(roundedNum / 10000000)) + ' Crore ';
        num = roundedNum % 10000000;
    }
    if (num >= 100000) {
        result += convertLessThanThousand(Math.floor(num / 100000)) + ' Lakh ';
        num = num % 100000;
    }
    if (num >= 1000) {
        result += convertLessThanThousand(Math.floor(num / 1000)) + ' Thousand ';
        num = num % 1000;
    }
    if (num > 0) {
        result += convertLessThanThousand(num);
    }

    return result.trim() + ' Rupees Only';
};

/**
 * Calculate complete payroll for an employee
 */
export const calculatePayroll = (salaryStructure, attendanceData, additionalInputs = {}) => {
    const {
        basicPay = 0,
        hra: directHra,
        hraPercentage = 40,
        da: directDa,
        daPercentage = 0,
        specialAllowance = 0,
        conveyanceAllowance = 0,
        medicalAllowance = 0,
        lta = 0,
        otherAllowances = [],
        pfEnabled = true,
        pfPercentage = 12,
        employerPfPercentage = 12,
        esiEnabled = false,
        esiPercentage = 0.75,
        employerEsiPercentage = 3.25,
        professionalTax = 200,
        overtimeRate = 0,
        isOvertimeEligible = false
    } = salaryStructure;

    const {
        totalWorkingDays = 26,
        daysWorked = 26,
        lopDays = 0,
        overtimeHours = 0
    } = attendanceData;

    const {
        bonus = 0,
        incentives = 0,
        arrears = 0,
        reimbursements = 0,
        loanDeduction = 0,
        advanceDeduction = 0,
        otherDeductions = [],
        taxRegime = 'new'
    } = additionalInputs;

    // Calculate HRA: use direct value if available, otherwise calculate from percentage
    const hra = (directHra && directHra > 0) ? directHra : Math.round((basicPay || 0) * (hraPercentage || 0) / 100);

    // Calculate DA: use direct value if available, otherwise calculate from percentage
    const da = (directDa && directDa > 0) ? directDa : Math.round((basicPay || 0) * (daPercentage || 0) / 100);

    // Calculate Earnings
    const otherAllowanceAmount = Array.isArray(otherAllowances)
        ? otherAllowances.reduce((sum, a) => sum + (a.amount || 0), 0)
        : 0;

    let overtimeAmount = 0;
    if (isOvertimeEligible && overtimeHours > 0) {
        overtimeAmount = overtimeRate ? overtimeRate * overtimeHours : calculateOvertime(basicPay, overtimeHours);
    }

    const grossEarnings =
        (basicPay || 0) + (hra || 0) + (da || 0) + (specialAllowance || 0) +
        (conveyanceAllowance || 0) + (medicalAllowance || 0) + (lta || 0) +
        otherAllowanceAmount + overtimeAmount +
        (bonus || 0) + (incentives || 0) + (arrears || 0) + (reimbursements || 0);

    // Calculate Deductions
    const pfDeduction = pfEnabled ? calculatePF(basicPay || 0, pfPercentage) : 0;
    const esiDeduction = esiEnabled ? calculateESI(grossEarnings, esiPercentage) : 0;
    const lopDeduction = calculateLOP(grossEarnings, totalWorkingDays, lopDays);

    // Calculate annual taxable income for TDS
    const annualGross = grossEarnings * 12;
    const annualPF = pfDeduction * 12;
    const taxableIncome = annualGross - annualPF - STANDARD_DEDUCTION;
    const annualTax = calculateIncomeTax(Math.max(0, taxableIncome), taxRegime);
    const monthlyTds = Math.round(annualTax / 12);

    const otherDeductionsAmount = Array.isArray(otherDeductions)
        ? otherDeductions.reduce((sum, d) => sum + (d.amount || 0), 0)
        : 0;

    const totalDeductions =
        pfDeduction + esiDeduction + (professionalTax || 0) +
        monthlyTds + lopDeduction + (loanDeduction || 0) +
        (advanceDeduction || 0) + otherDeductionsAmount;

    // Calculate Employer Contributions
    const employerPf = pfEnabled ? calculatePF(basicPay || 0, employerPfPercentage) : 0;
    const employerEsi = esiEnabled ? Math.round(grossEarnings * (employerEsiPercentage || 0) / 100) : 0;

    // Net Salary
    const netSalary = grossEarnings - totalDeductions;

    return {
        earnings: {
            basicPay: basicPay || 0,
            hra: hra || 0,
            da: da || 0,
            specialAllowance: specialAllowance || 0,
            conveyanceAllowance: conveyanceAllowance || 0,
            medicalAllowance: medicalAllowance || 0,
            lta: lta || 0,
            overtimeHours: overtimeHours || 0,
            overtimeAmount: overtimeAmount || 0,
            bonus: bonus || 0,
            incentives: incentives || 0,
            arrears: arrears || 0,
            reimbursements: reimbursements || 0,
            otherEarnings: Array.isArray(otherAllowances) ? otherAllowances.map(a => ({ name: a.name, amount: a.amount })) : []
        },
        deductions: {
            pf: pfDeduction || 0,
            esi: esiDeduction || 0,
            professionalTax: professionalTax || 0,
            incomeTax: monthlyTds || 0,
            lop: lopDeduction || 0,
            loanDeduction: loanDeduction || 0,
            advanceDeduction: advanceDeduction || 0,
            otherDeductions: otherDeductions || []
        },
        employerContributions: {
            pf: employerPf || 0,
            esi: employerEsi || 0,
            gratuity: Math.round((basicPay || 0) * 0.0481) // 4.81% of basic
        },
        grossEarnings: grossEarnings || 0,
        totalDeductions: totalDeductions || 0,
        netSalary: netSalary || 0,
        netSalaryInWords: numberToWords(netSalary || 0)
    };
};

/**
 * Get month name from number
 */
export const getMonthName = (monthNumber) => {
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[monthNumber - 1] || '';
};

/**
 * Get days in a month
 */
export const getDaysInMonth = (month, year) => {
    return new Date(year, month, 0).getDate();
};

/**
 * Calculate working days in a month (excluding weekends)
 */
export const calculateWorkingDays = (month, year, holidays = []) => {
    const daysInMonth = getDaysInMonth(month, year);
    let workingDays = 0;
    let weekends = 0;

    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month - 1, day);
        const dayOfWeek = date.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            workingDays++;
        } else {
            weekends++;
        }
    }

    return {
        totalDays: daysInMonth,
        workingDays: workingDays - holidays.length,
        weekends,
        holidays: holidays.length
    };
};

export default {
    calculateProfessionalTax,
    calculatePF,
    calculateESI,
    calculateIncomeTax,
    calculateLOP,
    calculateOvertime,
    calculatePayroll,
    numberToWords,
    getMonthName,
    getDaysInMonth,
    calculateWorkingDays
};
