import { useState, useEffect } from 'react';
import {
    HiOutlineDocumentText,
    HiOutlineCurrencyRupee,
    HiOutlineCalculator,
    HiOutlineCheck,
    HiOutlineExclamation,
    HiOutlineUpload,
    HiOutlineChevronDown,
    HiOutlineChevronUp
} from 'react-icons/hi';
import api from '../../services/api';
import toast from 'react-hot-toast';

const TaxDeclaration = () => {
    const [declaration, setDeclaration] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [calculating, setCalculating] = useState(false);
    const [taxSummary, setTaxSummary] = useState(null);
    const [expandedSections, setExpandedSections] = useState({});

    const currentFY = () => {
        const now = new Date();
        const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
        return `${year}-${year + 1}`;
    };

    useEffect(() => {
        fetchDeclaration();
    }, []);

    const fetchDeclaration = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/salary/tax-declarations/my?financialYear=${currentFY()}`);
            setDeclaration(res.data);
        } catch (error) {
            toast.error('Failed to fetch tax declaration');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            await api.put(`/salary/tax-declarations/${declaration._id}`, declaration);
            toast.success('Declaration saved successfully');
        } catch (error) {
            toast.error('Failed to save declaration');
        } finally {
            setSaving(false);
        }
    };

    const handleCalculate = async () => {
        try {
            setCalculating(true);
            const res = await api.post(`/salary/tax-declarations/${declaration._id}/calculate`);
            setTaxSummary(res.data.taxSummary);
            setDeclaration(res.data.declaration);
            toast.success('Tax calculated successfully');
        } catch (error) {
            toast.error('Failed to calculate tax');
        } finally {
            setCalculating(false);
        }
    };

    const toggleSection = (section) => {
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const updateSection = (section, field, value) => {
        setDeclaration(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                [field]: value
            }
        }));
    };

    const formatCurrency = (num) => new Intl.NumberFormat('en-IN', {
        style: 'currency', currency: 'INR', maximumFractionDigits: 0
    }).format(num || 0);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    const Section80C = [
        { key: 'ppf', label: 'PPF (Public Provident Fund)', max: 150000 },
        { key: 'elss', label: 'ELSS (Equity Linked Savings)', max: 150000 },
        { key: 'lifeInsurance', label: 'Life Insurance Premium', max: 150000 },
        { key: 'nsc', label: 'NSC (National Savings Certificate)', max: 150000 },
        { key: 'tuitionFees', label: 'Children Tuition Fees', max: 150000 },
        { key: 'homeLoanPrincipal', label: 'Home Loan Principal', max: 150000 },
        { key: 'sukanyaSamriddhi', label: 'Sukanya Samriddhi', max: 150000 },
        { key: 'fiveYearFD', label: '5-Year Tax Saving FD', max: 150000 }
    ];

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="page-title">Tax Declaration</h1>
                    <p className="text-secondary-500 mt-1">FY {currentFY()} Investment Declarations</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={handleSave} disabled={saving} className="btn-secondary">
                        {saving ? 'Saving...' : 'Save Draft'}
                    </button>
                    <button onClick={handleCalculate} disabled={calculating} className="btn-primary">
                        <HiOutlineCalculator className="w-5 h-5" />
                        {calculating ? 'Calculating...' : 'Calculate Tax'}
                    </button>
                </div>
            </div>

            {/* Regime Selection */}
            <div className="card p-6">
                <h2 className="text-lg font-bold text-secondary-900 mb-4">Tax Regime</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                        onClick={() => setDeclaration(prev => ({ ...prev, regime: 'old' }))}
                        className={`p-4 rounded-xl border-2 text-left transition-all ${declaration?.regime === 'old'
                                ? 'border-primary-500 bg-primary-50'
                                : 'border-secondary-200 hover:border-secondary-300'
                            }`}
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${declaration?.regime === 'old' ? 'border-primary-500' : 'border-secondary-300'
                                }`}>
                                {declaration?.regime === 'old' && <div className="w-3 h-3 rounded-full bg-primary-500" />}
                            </div>
                            <span className="font-bold text-secondary-900">Old Regime</span>
                        </div>
                        <p className="text-sm text-secondary-500 ml-8">
                            Claim deductions under 80C, 80D, HRA, etc. Higher tax slabs but more exemptions.
                        </p>
                    </button>
                    <button
                        onClick={() => setDeclaration(prev => ({ ...prev, regime: 'new' }))}
                        className={`p-4 rounded-xl border-2 text-left transition-all ${declaration?.regime === 'new'
                                ? 'border-primary-500 bg-primary-50'
                                : 'border-secondary-200 hover:border-secondary-300'
                            }`}
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${declaration?.regime === 'new' ? 'border-primary-500' : 'border-secondary-300'
                                }`}>
                                {declaration?.regime === 'new' && <div className="w-3 h-3 rounded-full bg-primary-500" />}
                            </div>
                            <span className="font-bold text-secondary-900">New Regime</span>
                        </div>
                        <p className="text-sm text-secondary-500 ml-8">
                            Lower tax slabs with limited deductions. Simpler to file.
                        </p>
                    </button>
                </div>
            </div>

            {/* Tax Summary */}
            {taxSummary && (
                <div className="card p-6 bg-gradient-to-br from-primary-500 to-primary-600 text-white">
                    <h2 className="text-lg font-bold mb-4">Tax Summary ({taxSummary.regime === 'new' ? 'New' : 'Old'} Regime)</h2>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div>
                            <p className="text-primary-100 text-sm">Gross Income</p>
                            <p className="text-xl font-bold">{formatCurrency(taxSummary.grossIncome)}</p>
                        </div>
                        <div>
                            <p className="text-primary-100 text-sm">Deductions</p>
                            <p className="text-xl font-bold">{formatCurrency(taxSummary.totalDeductions)}</p>
                        </div>
                        <div>
                            <p className="text-primary-100 text-sm">Taxable Income</p>
                            <p className="text-xl font-bold">{formatCurrency(taxSummary.taxableIncome)}</p>
                        </div>
                        <div>
                            <p className="text-primary-100 text-sm">Total Tax</p>
                            <p className="text-xl font-bold">{formatCurrency(taxSummary.totalTax)}</p>
                        </div>
                        <div>
                            <p className="text-primary-100 text-sm">Monthly TDS</p>
                            <p className="text-xl font-bold">{formatCurrency(taxSummary.monthlyTds)}</p>
                        </div>
                    </div>
                </div>
            )}

            {declaration?.regime === 'old' && (
                <>
                    {/* Section 80C */}
                    <div className="card overflow-hidden">
                        <button
                            onClick={() => toggleSection('section80C')}
                            className="w-full p-4 flex items-center justify-between bg-secondary-50 hover:bg-secondary-100 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                    <HiOutlineDocumentText className="w-5 h-5 text-blue-600" />
                                </div>
                                <div className="text-left">
                                    <h3 className="font-bold text-secondary-900">Section 80C Investments</h3>
                                    <p className="text-sm text-secondary-500">Max limit: ₹1,50,000</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="text-lg font-bold text-primary-600">
                                    {formatCurrency(declaration?.section80C?.totalDeclared || 0)}
                                </span>
                                {expandedSections.section80C ? <HiOutlineChevronUp className="w-5 h-5" /> : <HiOutlineChevronDown className="w-5 h-5" />}
                            </div>
                        </button>
                        {expandedSections.section80C && (
                            <div className="p-4 border-t border-secondary-100">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {Section80C.map(item => (
                                        <div key={item.key}>
                                            <label className="label">{item.label}</label>
                                            <div className="relative">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary-500">₹</span>
                                                <input
                                                    type="number"
                                                    value={declaration?.section80C?.[item.key]?.declared || ''}
                                                    onChange={(e) => {
                                                        const section80C = { ...declaration.section80C };
                                                        section80C[item.key] = { ...section80C[item.key], declared: parseInt(e.target.value) || 0 };
                                                        setDeclaration({ ...declaration, section80C });
                                                    }}
                                                    className="input pl-8"
                                                    placeholder="0"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Section 80D - Health Insurance */}
                    <div className="card overflow-hidden">
                        <button
                            onClick={() => toggleSection('section80D')}
                            className="w-full p-4 flex items-center justify-between bg-secondary-50 hover:bg-secondary-100 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                                    <HiOutlineDocumentText className="w-5 h-5 text-green-600" />
                                </div>
                                <div className="text-left">
                                    <h3 className="font-bold text-secondary-900">Section 80D - Health Insurance</h3>
                                    <p className="text-sm text-secondary-500">Self, Family & Parents</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="text-lg font-bold text-primary-600">
                                    {formatCurrency(declaration?.section80D?.totalDeclared || 0)}
                                </span>
                                {expandedSections.section80D ? <HiOutlineChevronUp className="w-5 h-5" /> : <HiOutlineChevronDown className="w-5 h-5" />}
                            </div>
                        </button>
                        {expandedSections.section80D && (
                            <div className="p-4 border-t border-secondary-100">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="label">Self & Family Premium (Max ₹25,000)</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary-500">₹</span>
                                            <input
                                                type="number"
                                                value={declaration?.section80D?.selfAndFamily?.premium || ''}
                                                onChange={(e) => updateSection('section80D', 'selfAndFamily', { ...declaration.section80D?.selfAndFamily, premium: parseInt(e.target.value) || 0 })}
                                                className="input pl-8"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="label">Parents Premium (Max ₹50,000 if Senior)</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary-500">₹</span>
                                            <input
                                                type="number"
                                                value={declaration?.section80D?.parents?.premium || ''}
                                                onChange={(e) => updateSection('section80D', 'parents', { ...declaration.section80D?.parents, premium: parseInt(e.target.value) || 0 })}
                                                className="input pl-8"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="label">Preventive Health Check-up (Max ₹5,000)</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary-500">₹</span>
                                            <input
                                                type="number"
                                                value={declaration?.section80D?.preventiveHealthCheckup || ''}
                                                onChange={(e) => updateSection('section80D', 'preventiveHealthCheckup', parseInt(e.target.value) || 0)}
                                                className="input pl-8"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* HRA */}
                    <div className="card overflow-hidden">
                        <button
                            onClick={() => toggleSection('hra')}
                            className="w-full p-4 flex items-center justify-between bg-secondary-50 hover:bg-secondary-100 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                                    <HiOutlineCurrencyRupee className="w-5 h-5 text-purple-600" />
                                </div>
                                <div className="text-left">
                                    <h3 className="font-bold text-secondary-900">HRA Exemption</h3>
                                    <p className="text-sm text-secondary-500">House Rent Allowance</p>
                                </div>
                            </div>
                            {expandedSections.hra ? <HiOutlineChevronUp className="w-5 h-5" /> : <HiOutlineChevronDown className="w-5 h-5" />}
                        </button>
                        {expandedSections.hra && (
                            <div className="p-4 border-t border-secondary-100">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="label">Monthly Rent Paid</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary-500">₹</span>
                                            <input
                                                type="number"
                                                value={declaration?.hra?.rentPaidMonthly || ''}
                                                onChange={(e) => updateSection('hra', 'rentPaidMonthly', parseInt(e.target.value) || 0)}
                                                className="input pl-8"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="label">City Type</label>
                                        <select
                                            value={declaration?.hra?.cityType || 'non-metro'}
                                            onChange={(e) => updateSection('hra', 'cityType', e.target.value)}
                                            className="input"
                                        >
                                            <option value="metro">Metro (Delhi, Mumbai, Chennai, Kolkata)</option>
                                            <option value="non-metro">Non-Metro</option>
                                        </select>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="label">Landlord Name</label>
                                        <input
                                            type="text"
                                            value={declaration?.hra?.landlordDetails?.name || ''}
                                            onChange={(e) => updateSection('hra', 'landlordDetails', { ...declaration.hra?.landlordDetails, name: e.target.value })}
                                            className="input"
                                        />
                                    </div>
                                    <div>
                                        <label className="label">Landlord PAN (If rent {'>'} ₹1,00,000/year)</label>
                                        <input
                                            type="text"
                                            value={declaration?.hra?.landlordDetails?.pan || ''}
                                            onChange={(e) => updateSection('hra', 'landlordDetails', { ...declaration.hra?.landlordDetails, pan: e.target.value.toUpperCase() })}
                                            className="input"
                                            maxLength={10}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Home Loan Interest */}
                    <div className="card overflow-hidden">
                        <button
                            onClick={() => toggleSection('section24')}
                            className="w-full p-4 flex items-center justify-between bg-secondary-50 hover:bg-secondary-100 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                                    <HiOutlineCurrencyRupee className="w-5 h-5 text-orange-600" />
                                </div>
                                <div className="text-left">
                                    <h3 className="font-bold text-secondary-900">Section 24 - Home Loan Interest</h3>
                                    <p className="text-sm text-secondary-500">Max ₹2,00,000 for self-occupied</p>
                                </div>
                            </div>
                            {expandedSections.section24 ? <HiOutlineChevronUp className="w-5 h-5" /> : <HiOutlineChevronDown className="w-5 h-5" />}
                        </button>
                        {expandedSections.section24 && (
                            <div className="p-4 border-t border-secondary-100">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="label">Home Loan Interest (Annual)</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary-500">₹</span>
                                            <input
                                                type="number"
                                                value={declaration?.section24?.homeLoanInterest || ''}
                                                onChange={(e) => updateSection('section24', 'homeLoanInterest', parseInt(e.target.value) || 0)}
                                                className="input pl-8"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="label">Property Type</label>
                                        <select
                                            value={declaration?.section24?.propertyType || 'self-occupied'}
                                            onChange={(e) => updateSection('section24', 'propertyType', e.target.value)}
                                            className="input"
                                        >
                                            <option value="self-occupied">Self Occupied</option>
                                            <option value="let-out">Let Out</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Submit Declaration */}
            <div className="card p-6">
                <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${declaration?.status === 'submitted' ? 'bg-green-100' : 'bg-yellow-100'
                        }`}>
                        {declaration?.status === 'submitted' ? (
                            <HiOutlineCheck className="w-6 h-6 text-green-600" />
                        ) : (
                            <HiOutlineExclamation className="w-6 h-6 text-yellow-600" />
                        )}
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-secondary-900">
                            {declaration?.status === 'submitted' ? 'Declaration Submitted' : 'Declaration Pending'}
                        </h3>
                        <p className="text-secondary-500 mt-1">
                            {declaration?.status === 'submitted'
                                ? 'Your tax declaration has been submitted for verification.'
                                : 'Submit your declaration once you have entered all investments. You can update until the final deadline.'}
                        </p>
                    </div>
                    {declaration?.status !== 'submitted' && (
                        <button
                            onClick={async () => {
                                try {
                                    await api.put(`/salary/tax-declarations/${declaration._id}`, { ...declaration, status: 'submitted' });
                                    toast.success('Declaration submitted');
                                    fetchDeclaration();
                                } catch (error) {
                                    toast.error('Failed to submit');
                                }
                            }}
                            className="btn-primary"
                        >
                            Submit Declaration
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TaxDeclaration;
