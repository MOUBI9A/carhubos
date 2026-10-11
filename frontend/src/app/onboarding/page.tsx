"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  MapPin,
  Car,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Plus,
  FileSpreadsheet,
  ShieldCheck,
  Sparkles,
  Phone,
  Mail,
  Coins,
  Clock,
  AlertCircle,
  Trash2,
  Check,
} from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useToast } from '@/lib/contexts/ToastContext';
import { Button } from '@/components/ui/Button';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';

const MOROCCAN_CITIES = [
  'Casablanca',
  'Marrakech',
  'Rabat',
  'Tangier',
  'Agadir',
  'Fes',
  'Meknes',
  'Oujda',
  'Tetouan',
  'Nador',
  'Essaouira',
  'El Jadida',
  'Dakhla',
];

interface CarItem {
  id?: string;
  brand: string;
  model: string;
  year: number;
  licensePlate: string;
  pricePerDay: number;
  fuelType?: string;
  gearbox?: string;
}

export default function OnboardingPage() {
  const router = useRouter();
  const { user, refreshUser, logout } = useAuth();
  const { showToast } = useToast();

  const [currentStep, setCurrentStep] = useState(1);
  const [isLoadingState, setIsLoadingState] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1: Agency Profile
  const [agencyName, setAgencyName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [city, setCity] = useState('Casablanca');
  const [address, setAddress] = useState('');
  const [website, setWebsite] = useState('');

  // Step 2: Rental Settings
  const [currency, setCurrency] = useState('MAD');
  const [country, setCountry] = useState('Morocco');
  const [timezone, setTimezone] = useState('Africa/Casablanca');
  const [defaultDeposit, setDefaultDeposit] = useState(5000);

  // Step 3: Fleet Setup
  const [carsList, setCarsList] = useState<CarItem[]>([]);
  const [showAddCarModal, setShowAddCarModal] = useState(false);
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [carBrand, setCarBrand] = useState('Dacia');
  const [carModel, setCarModel] = useState('Logan');
  const [carYear, setCarYear] = useState(new Date().getFullYear());
  const [carPlate, setCarPlate] = useState('');
  const [carPrice, setCarPrice] = useState(300);
  const [carFuel, setCarFuel] = useState('Diesel');
  const [carGearbox, setCarGearbox] = useState('Manual');
  const [isAddingCar, setIsAddingCar] = useState(false);

  // Step 4: Completion State
  const [isCompleteSuccess, setIsCompleteSuccess] = useState(false);

  // Load existing onboarding state from server on mount
  useEffect(() => {
    let isMounted = true;
    const fetchState = async () => {
      try {
        const { data } = await api.get('/onboarding/state');
        if (!isMounted) return;

        if (data.agency) {
          const a = data.agency;
          if (a.name) setAgencyName(a.name);
          if (a.taxId) setTaxId(a.taxId);
          if (a.businessPhone) setBusinessPhone(a.businessPhone);
          if (a.contactEmail) setContactEmail(a.contactEmail);
          if (a.city) setCity(a.city);
          if (a.address) setAddress(a.address);
          if (a.website) setWebsite(a.website);
          if (a.currency) setCurrency(a.currency);
          if (a.country) setCountry(a.country);
          if (a.timezone) setTimezone(a.timezone);
          if (a.defaultDeposit) setDefaultDeposit(Number(a.defaultDeposit) || 5000);

          if (a.onboardingStatus === 'COMPLETED') {
            router.push('/dashboard');
            return;
          }

          if (a.onboardingCurrentStep && a.onboardingCurrentStep >= 1 && a.onboardingCurrentStep <= 4) {
            setCurrentStep(a.onboardingCurrentStep);
          }
        }

        if (data.cars && Array.isArray(data.cars)) {
          setCarsList(data.cars);
        }
      } catch (err: any) {
        // If 403 unverified, api interceptor redirects to /verify-email
      } finally {
        if (isMounted) setIsLoadingState(false);
      }
    };

    fetchState();
    return () => {
      isMounted = false;
    };
  }, [router]);

  // Persist step to backend
  const saveStepData = async (stepToSave: number) => {
    try {
      const payload: any = { step: stepToSave };
      if (stepToSave === 1) {
        payload.agencyProfile = {
          name: agencyName,
          taxId,
          businessPhone,
          contactEmail,
          city,
          address,
          website,
        };
      } else if (stepToSave === 2) {
        payload.rentalSettings = {
          currency,
          country,
          timezone,
          defaultDeposit,
        };
      }
      await api.patch('/onboarding/step', payload);
    } catch (err: any) {
      console.warn('Failed to autosave onboarding step:', err);
    }
  };

  const handleNext = async () => {
    // Validate Step 1
    if (currentStep === 1) {
      if (!agencyName.trim()) {
        showToast('danger', 'Agency Name Required', 'Please provide your agency or trade name.');
        return;
      }
      if (!businessPhone.trim()) {
        showToast('danger', 'Phone Required', 'Please enter a contact phone number.');
        return;
      }
      await saveStepData(1);
      setCurrentStep(2);
      return;
    }

    // Validate Step 2
    if (currentStep === 2) {
      if (!defaultDeposit || defaultDeposit < 0) {
        showToast('danger', 'Invalid Deposit', 'Please specify a valid default deposit amount.');
        return;
      }
      await saveStepData(2);
      setCurrentStep(3);
      return;
    }

    // Validate Step 3
    if (currentStep === 3) {
      if (carsList.length < 1) {
        showToast(
          'danger',
          'Vehicle Required',
          'Please add at least 1 vehicle to your fleet before proceeding.',
        );
        return;
      }
      await saveStepData(3);
      setCurrentStep(4);
      return;
    }

    // Complete Onboarding (Step 4)
    if (currentStep === 4) {
      setIsSubmitting(true);
      try {
        const { data } = await api.post('/onboarding/complete');
        setIsCompleteSuccess(true);
        showToast('success', 'Setup Complete', 'Your agency workspace is now live!');
        await refreshUser();
        setTimeout(() => {
          router.push(data.dashboardUrl || '/dashboard');
        }, 1500);
      } catch (err: any) {
        const msg = err?.response?.data?.message || 'Could not complete onboarding.';
        showToast('danger', 'Error', msg);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  // Add individual vehicle
  const handleAddCar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!carBrand.trim() || !carModel.trim() || !carPlate.trim()) {
      showToast('danger', 'Missing Info', 'Please fill brand, model, and license plate.');
      return;
    }

    setIsAddingCar(true);
    try {
      const { data } = await api.post('/cars', {
        brand: carBrand.trim(),
        model: carModel.trim(),
        year: Number(carYear),
        licensePlate: carPlate.trim(),
        pricePerDay: Number(carPrice),
        fuelType: carFuel,
        gearbox: carGearbox,
        status: 'AVAILABLE',
      });

      setCarsList((prev) => [data, ...prev]);
      setShowAddCarModal(false);
      setCarPlate('');
      showToast('success', 'Car Added', `${carBrand} ${carModel} added to your fleet.`);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to add vehicle.';
      showToast('danger', 'Error', Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setIsAddingCar(false);
    }
  };

  // Bulk CSV Import
  const handleCsvImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvText.trim()) {
      showToast('danger', 'Empty CSV', 'Please paste CSV rows to import.');
      return;
    }

    setIsAddingCar(true);
    try {
      const { data } = await api.post('/onboarding/cars/bulk-csv', {
        csvContent: csvText,
      });

      if (data.cars && Array.isArray(data.cars)) {
        setCarsList((prev) => [...data.cars, ...prev]);
      }
      setShowCsvImport(false);
      setCsvText('');
      showToast(
        'success',
        'Fleet Imported',
        `Successfully imported ${data.importedCount} vehicle(s).`,
      );
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to parse CSV.';
      showToast('danger', 'Import Error', msg);
    } finally {
      setIsAddingCar(false);
    }
  };

  const STEPS = [
    { num: 1, title: 'Agency Profile', icon: Building2 },
    { num: 2, title: 'Rental Policies', icon: Coins },
    { num: 3, title: 'Fleet Setup', icon: Car },
    { num: 4, title: 'Review & Launch', icon: Sparkles },
  ];

  if (isLoadingState) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between">
      {/* Top Header */}
      <header className="border-b border-hairline bg-surface/70 backdrop-blur-md sticky top-0 z-20 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center font-display font-bold text-primary">
            F
          </div>
          <div>
            <h1 className="font-display text-sm font-semibold tracking-tight">Fider OS</h1>
            <p className="text-xs text-text-muted">Agency Workspace Onboarding</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <LocaleSwitcher variant="pills" />
          <button
            onClick={() => logout()}
            className="text-xs text-text-faint hover:text-foreground transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-6 md:p-10 flex flex-col justify-center">
        {/* Progress Stepper */}
        <div className="mb-10">
          <div className="grid grid-cols-4 gap-2 md:gap-4">
            {STEPS.map((s) => {
              const Icon = s.icon;
              const isActive = currentStep === s.num;
              const isDone = currentStep > s.num;

              return (
                <div
                  key={s.num}
                  className={`p-3 md:p-4 rounded-2xl border transition-all ${
                    isActive
                      ? 'bg-surface border-primary shadow-sm'
                      : isDone
                        ? 'bg-surface/50 border-emerald-500/30'
                        : 'bg-surface/20 border-hairline opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-semibold ${
                        isDone
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : isActive
                            ? 'bg-primary text-white'
                            : 'bg-surface-raised text-text-muted'
                      }`}
                    >
                      {isDone ? <Check className="w-3.5 h-3.5" /> : s.num}
                    </div>
                    <span className="text-xs font-semibold hidden md:inline truncate">
                      {s.title}
                    </span>
                  </div>
                  <div
                    className={`h-1 w-full rounded-full ${
                      isDone
                        ? 'bg-emerald-500'
                        : isActive
                          ? 'bg-primary'
                          : 'bg-surface-raised'
                    }`}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Wizard Card */}
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="bg-surface border border-hairline rounded-3xl p-6 md:p-10 shadow-xl"
        >
          {/* ── STEP 1: AGENCY PROFILE ── */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <span className="eyebrow text-primary">Stage 1 of 4</span>
                <h2 className="font-display text-2xl font-semibold text-foreground mt-1 tracking-tight">
                  Agency Profile & Contact
                </h2>
                <p className="text-sm text-text-muted mt-1 leading-relaxed">
                  Provide your agency's operating identity and public contact details.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="text-xs font-medium text-text-muted block mb-1.5">
                    Agency Trade Name <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    value={agencyName}
                    onChange={(e) => setAgencyName(e.target.value)}
                    placeholder="e.g. Atlas Luxury Cars Casablanca"
                    className="w-full bg-surface-raised border border-hairline rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-text-faint outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-text-muted block mb-1.5">
                    Tax ID / ICE / RC
                  </label>
                  <input
                    type="text"
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value)}
                    placeholder="e.g. 001234567000089"
                    className="w-full bg-surface-raised border border-hairline rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-text-faint outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-text-muted block mb-1.5">
                    Operating City <span className="text-danger">*</span>
                  </label>
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full bg-surface-raised border border-hairline rounded-xl px-4 py-3 text-sm text-foreground outline-none focus:border-primary"
                  >
                    {MOROCCAN_CITIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-text-muted block mb-1.5">
                    Business Phone <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    value={businessPhone}
                    onChange={(e) => setBusinessPhone(e.target.value)}
                    placeholder="e.g. +212 522 987654"
                    className="w-full bg-surface-raised border border-hairline rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-text-faint outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-text-muted block mb-1.5">
                    Contact Email
                  </label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="e.g. contact@atlascars.ma"
                    className="w-full bg-surface-raised border border-hairline rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-text-faint outline-none focus:border-primary"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs font-medium text-text-muted block mb-1.5">
                    Physical Address / Branch
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. 42 Boulevard d'Anfa, Maarif"
                    className="w-full bg-surface-raised border border-hairline rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-text-faint outline-none focus:border-primary"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 2: RENTAL SETTINGS ── */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <span className="eyebrow text-primary">Stage 2 of 4</span>
                <h2 className="font-display text-2xl font-semibold text-foreground mt-1 tracking-tight">
                  Rental & Business Policies
                </h2>
                <p className="text-sm text-text-muted mt-1 leading-relaxed">
                  Configure default operational financial settings and security deposit baseline.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-text-muted block mb-1.5">
                    Operational Currency
                  </label>
                  <input
                    type="text"
                    disabled
                    value={`${currency} (Moroccan Dirham)`}
                    className="w-full bg-surface-raised/50 border border-hairline rounded-xl px-4 py-3 text-sm text-text-muted outline-none cursor-not-allowed"
                  />
                  <p className="text-[11px] text-text-faint mt-1">
                    Moroccan tax compliance requires all invoices and contracts in MAD.
                  </p>
                </div>

                <div>
                  <label className="text-xs font-medium text-text-muted block mb-1.5">
                    Default Security Deposit (MAD) <span className="text-danger">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={defaultDeposit}
                    onChange={(e) => setDefaultDeposit(Number(e.target.value))}
                    className="w-full bg-surface-raised border border-hairline rounded-xl px-4 py-3 text-sm text-foreground outline-none focus:border-primary"
                  />
                  <p className="text-[11px] text-text-faint mt-1">
                    Standard caution amount pre-filled when drafting new contracts.
                  </p>
                </div>

                <div>
                  <label className="text-xs font-medium text-text-muted block mb-1.5">Country</label>
                  <input
                    type="text"
                    disabled
                    value={country}
                    className="w-full bg-surface-raised/50 border border-hairline rounded-xl px-4 py-3 text-sm text-text-muted cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-text-muted block mb-1.5">Timezone</label>
                  <input
                    type="text"
                    disabled
                    value={timezone}
                    className="w-full bg-surface-raised/50 border border-hairline rounded-xl px-4 py-3 text-sm text-text-muted cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-surface-raised/60 border border-hairline text-xs text-text-muted space-y-2">
                <div className="flex items-center gap-2 font-medium text-foreground">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Pre-configured Legal Standards
                </div>
                <p>
                  • VAT is automatically configured at Moroccan legal rate of <strong>20% inclusive</strong>.
                </p>
                <p>
                  • Trust Network Guardian verification will automatically inspect customer records before
                  keys are handed over.
                </p>
              </div>
            </div>
          )}

          {/* ── STEP 3: FLEET SETUP ── */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <span className="eyebrow text-primary">Stage 3 of 4</span>
                  <h2 className="font-display text-2xl font-semibold text-foreground mt-1 tracking-tight">
                    Fleet Setup
                  </h2>
                  <p className="text-sm text-text-muted mt-1 leading-relaxed">
                    Register at least 1 vehicle to make your workspace functional from day one.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    className="text-xs py-2 px-3 rounded-xl"
                    onClick={() => setShowCsvImport(!showCsvImport)}
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 me-1.5" />
                    CSV Import
                  </Button>
                  <Button
                    variant="primary"
                    className="text-xs py-2 px-3 rounded-xl"
                    onClick={() => setShowAddCarModal(true)}
                  >
                    <Plus className="w-3.5 h-3.5 me-1.5" />
                    Add Vehicle
                  </Button>
                </div>
              </div>

              {/* Status Banner */}
              {carsList.length === 0 ? (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-300 leading-relaxed">
                    <strong>At least 1 vehicle is required</strong> before completing onboarding. Add
                    your first vehicle using the button above or paste a quick CSV list.
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                  <span className="text-xs font-medium text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    {carsList.length} vehicle{carsList.length > 1 ? 's' : ''} registered and ready for bookings
                  </span>
                  <span className="text-xs text-text-faint">Fleet requirement met ✓</span>
                </div>
              )}

              {/* CSV Import Drawer */}
              {showCsvImport && (
                <div className="p-5 rounded-2xl bg-surface-raised border border-hairline space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                      Paste CSV Fleet Records
                    </h3>
                    <button
                      type="button"
                      onClick={() =>
                        setCsvText(
                          'Dacia,Logan,2024,12345-A-6,300,Diesel,Manual\nRenault,Clio 5,2023,67890-B-1,350,Essence,Automatic\nHyundai,i10,2023,11223-D-7,250,Essence,Manual',
                        )
                      }
                      className="text-xs text-primary hover:underline"
                    >
                      Fill sample template
                    </button>
                  </div>
                  <textarea
                    rows={4}
                    value={csvText}
                    onChange={(e) => setCsvText(e.target.value)}
                    placeholder="Brand,Model,Year,LicensePlate,PricePerDay,FuelType,Gearbox&#10;Dacia,Logan,2024,12345-A-6,300,Diesel,Manual"
                    className="w-full bg-surface border border-hairline rounded-xl p-3 text-xs font-mono text-foreground placeholder:text-text-faint outline-none focus:border-primary"
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      className="text-xs py-1.5 px-3 rounded-lg"
                      onClick={() => setShowCsvImport(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      className="text-xs py-1.5 px-4 rounded-lg"
                      disabled={isAddingCar}
                      onClick={handleCsvImport}
                    >
                      {isAddingCar ? 'Importing…' : 'Import Rows'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Add Car Modal */}
              {showAddCarModal && (
                <div className="p-5 rounded-2xl bg-surface-raised border border-primary/30 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground">Add New Vehicle</h3>
                    <button
                      onClick={() => setShowAddCarModal(false)}
                      className="text-xs text-text-faint hover:text-foreground"
                    >
                      Close
                    </button>
                  </div>

                  <form onSubmit={handleAddCar} className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="text-[11px] text-text-muted block mb-1">Brand</label>
                      <input
                        type="text"
                        required
                        value={carBrand}
                        onChange={(e) => setCarBrand(e.target.value)}
                        placeholder="e.g. Dacia"
                        className="w-full bg-surface border border-hairline rounded-lg px-3 py-2 text-xs text-foreground outline-none focus:border-primary"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-text-muted block mb-1">Model</label>
                      <input
                        type="text"
                        required
                        value={carModel}
                        onChange={(e) => setCarModel(e.target.value)}
                        placeholder="e.g. Logan"
                        className="w-full bg-surface border border-hairline rounded-lg px-3 py-2 text-xs text-foreground outline-none focus:border-primary"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-text-muted block mb-1">Year</label>
                      <input
                        type="number"
                        min="2000"
                        max={new Date().getFullYear() + 1}
                        value={carYear}
                        onChange={(e) => setCarYear(Number(e.target.value))}
                        className="w-full bg-surface border border-hairline rounded-lg px-3 py-2 text-xs text-foreground outline-none focus:border-primary"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-text-muted block mb-1">
                        License Plate <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={carPlate}
                        onChange={(e) => setCarPlate(e.target.value)}
                        placeholder="e.g. 54321-A-6"
                        className="w-full bg-surface border border-hairline rounded-lg px-3 py-2 text-xs text-foreground outline-none focus:border-primary"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-text-muted block mb-1">
                        Price / Day (MAD)
                      </label>
                      <input
                        type="number"
                        min="50"
                        value={carPrice}
                        onChange={(e) => setCarPrice(Number(e.target.value))}
                        className="w-full bg-surface border border-hairline rounded-lg px-3 py-2 text-xs text-foreground outline-none focus:border-primary"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-text-muted block mb-1">Fuel Type</label>
                      <select
                        value={carFuel}
                        onChange={(e) => setCarFuel(e.target.value)}
                        className="w-full bg-surface border border-hairline rounded-lg px-3 py-2 text-xs text-foreground outline-none focus:border-primary"
                      >
                        <option value="Diesel">Diesel</option>
                        <option value="Essence">Essence</option>
                        <option value="Hybrid">Hybrid</option>
                        <option value="Electric">Electric</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] text-text-muted block mb-1">Transmission</label>
                      <select
                        value={carGearbox}
                        onChange={(e) => setCarGearbox(e.target.value)}
                        className="w-full bg-surface border border-hairline rounded-lg px-3 py-2 text-xs text-foreground outline-none focus:border-primary"
                      >
                        <option value="Manual">Manual</option>
                        <option value="Automatic">Automatic</option>
                      </select>
                    </div>

                    <div className="flex items-end">
                      <Button
                        type="submit"
                        variant="primary"
                        disabled={isAddingCar}
                        className="w-full text-xs py-2 rounded-lg justify-center"
                      >
                        {isAddingCar ? 'Saving…' : 'Save Vehicle'}
                      </Button>
                    </div>
                  </form>
                </div>
              )}

              {/* Fleet List Display */}
              <div className="space-y-2">
                {carsList.map((car, idx) => (
                  <div
                    key={car.id || idx}
                    className="flex items-center justify-between p-3.5 rounded-xl bg-surface-raised border border-hairline hover:border-hairline-raised transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                        <Car className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-foreground">
                          {car.brand} {car.model}{' '}
                          <span className="text-xs text-text-muted font-normal">({car.year})</span>
                        </div>
                        <div className="text-xs text-text-muted flex items-center gap-2 mt-0.5">
                          <span className="font-mono bg-surface px-1.5 py-0.5 rounded border border-hairline">
                            {car.licensePlate}
                          </span>
                          <span>•</span>
                          <span>{car.fuelType || 'Diesel'}</span>
                          <span>•</span>
                          <span>{car.gearbox || 'Manual'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-end">
                      <span className="text-sm font-semibold text-foreground">
                        {car.pricePerDay} MAD
                      </span>
                      <span className="text-[11px] text-text-muted block">/ day</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── STEP 4: REVIEW & LAUNCH ── */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <span className="eyebrow text-primary">Stage 4 of 4</span>
                <h2 className="font-display text-2xl font-semibold text-foreground mt-1 tracking-tight">
                  Review & Launch Workspace
                </h2>
                <p className="text-sm text-text-muted mt-1 leading-relaxed">
                  Verify your setup parameters. Once confirmed, your agency dashboard will be
                  unlocked.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Agency Summary */}
                <div className="p-4 rounded-2xl bg-surface-raised border border-hairline space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
                    <Building2 className="w-4 h-4 text-primary" />
                    Agency Entity
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-text-muted">Agency Name:</span>
                      <span className="font-medium text-foreground">{agencyName}</span>
                    </div>
                    {taxId && (
                      <div className="flex justify-between">
                        <span className="text-text-muted">Tax ID / ICE:</span>
                        <span className="font-medium text-foreground">{taxId}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-text-muted">City / Region:</span>
                      <span className="font-medium text-foreground">{city}, Morocco</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Phone:</span>
                      <span className="font-medium text-foreground">{businessPhone}</span>
                    </div>
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="p-4 rounded-2xl bg-surface-raised border border-hairline space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
                    <Coins className="w-4 h-4 text-primary" />
                    Financial & Policies
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-text-muted">Billing Currency:</span>
                      <span className="font-medium text-foreground">MAD</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Default Deposit:</span>
                      <span className="font-medium text-foreground">{defaultDeposit} MAD</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">VAT Standard:</span>
                      <span className="font-medium text-foreground">20% Inclusive</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Timezone:</span>
                      <span className="font-medium text-foreground">Africa/Casablanca</span>
                    </div>
                  </div>
                </div>

                {/* Fleet Summary */}
                <div className="md:col-span-2 p-4 rounded-2xl bg-surface-raised border border-hairline space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
                      <Car className="w-4 h-4 text-primary" />
                      Fleet Ready ({carsList.length} Vehicles)
                    </div>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(3)}
                      className="text-xs text-primary hover:underline"
                    >
                      Edit Fleet
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-1">
                    {carsList.slice(0, 6).map((c, i) => (
                      <div
                        key={i}
                        className="p-2.5 rounded-lg bg-surface border border-hairline text-xs"
                      >
                        <div className="font-semibold text-foreground truncate">
                          {c.brand} {c.model}
                        </div>
                        <div className="text-text-muted flex justify-between mt-1">
                          <span className="font-mono">{c.licensePlate}</span>
                          <span className="font-semibold text-foreground">{c.pricePerDay} MAD</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Ready Banner */}
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <div className="text-xs text-emerald-300 leading-relaxed">
                  All onboarding requirements satisfied. Clicking <strong>Complete Setup</strong> will
                  activate your agency dashboard and unlock all rental operations.
                </div>
              </div>
            </div>
          )}

          {/* Wizard Controls Footer */}
          <div className="mt-8 pt-6 border-t border-hairline flex items-center justify-between">
            {currentStep > 1 ? (
              <Button
                variant="outline"
                className="py-2.5 px-4 rounded-xl"
                onClick={handleBack}
                disabled={isSubmitting}
              >
                <ArrowLeft className="w-4 h-4 me-1.5" />
                Back
              </Button>
            ) : (
              <div />
            )}

            <Button
              variant="primary"
              className="py-2.5 px-6 rounded-xl font-medium"
              onClick={handleNext}
              disabled={isSubmitting || (currentStep === 3 && carsList.length === 0)}
            >
              {isSubmitting ? (
                'Finalizing Setup…'
              ) : currentStep === 4 ? (
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" /> Complete Setup & Launch
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  Continue <ArrowRight className="w-4 h-4 ms-1" />
                </span>
              )}
            </Button>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-text-faint border-t border-hairline">
        Fider OS • Moroccan Car-Rental ERP Platform
      </footer>
    </div>
  );
}
