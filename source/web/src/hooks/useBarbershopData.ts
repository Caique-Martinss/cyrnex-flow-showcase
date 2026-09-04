import { useCallback, useEffect, useRef, useState } from 'react';
import { defaultBusinessSettings } from '../app/constants';
import type {
  Appointment,
  BusinessSettings,
  Client,
  DashboardData,
  Expense,
  Professional,
  OnboardingState,
  RetroactiveServiceRequest,
  ScheduleBlock,
  Service,
  WaitlistEntry,
  MemberRole
} from '../domain/types';
import {
  getErrorMessage,
  loadAppointments,
  loadClients,
  loadDashboard,
  loadExpenses,
  loadProfessionals,
  loadRetroactiveRequests,
  loadScheduleBlocks,
  loadServices,
  loadSettings,
  loadWaitlistEntries
} from '../services';

const LIVE_SYNC_INTERVAL_MS = 30_000;

export function useBarbershopData(role: MemberRole) {
  const [settings, setSettings] = useState<BusinessSettings>(
    defaultBusinessSettings
  );
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [scheduleBlocks, setScheduleBlocks] = useState<ScheduleBlock[]>([]);
  const [retroactiveRequests, setRetroactiveRequests] =
    useState<RetroactiveServiceRequest[]>([]);
  const [waitlistEntries, setWaitlistEntries] = useState<WaitlistEntry[]>([]);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [liveSyncing, setLiveSyncing] = useState(false);
  const [syncError, setSyncError] = useState('');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const liveSyncInFlight = useRef(false);

  const refreshData = useCallback(async (showPageLoading = true) => {
    const canAccessFinance = role === 'owner' || role === 'manager';
    const canAccessFullOperations = role === 'owner' || role === 'manager' || role === 'receptionist';
    if (showPageLoading) {
      setLoading(true);
    }

    setPageError('');

    try {
      const [
        settingsData,
        clientData,
        serviceData,
        professionalData,
        appointmentData,
        expenseData,
        blockData,
        retroactiveData,
        waitlistData,
        dashboardData
      ] = await Promise.all([
        loadSettings(),
        canAccessFullOperations ? loadClients() : Promise.resolve([]),
        loadServices(),
        loadProfessionals(),
        canAccessFullOperations ? loadAppointments() : Promise.resolve([]),
        canAccessFinance ? loadExpenses() : Promise.resolve([]),
        canAccessFullOperations ? loadScheduleBlocks() : Promise.resolve([]),
        loadRetroactiveRequests(),
        canAccessFullOperations ? loadWaitlistEntries() : Promise.resolve([]),
        canAccessFinance ? loadDashboard() : Promise.resolve(null)
      ]);

      setSettings(settingsData);
      setClients(clientData);
      setServices(serviceData);
      setProfessionals(professionalData);
      setAppointments(appointmentData);
      setExpenses(expenseData);
      setScheduleBlocks(blockData);
      setRetroactiveRequests(retroactiveData);
      setWaitlistEntries(waitlistData);
      setDashboard(dashboardData);
      setSyncError('');
      setLastSyncedAt(new Date().toISOString());
    } catch (error) {
      setPageError(getErrorMessage(error));
    } finally {
      if (showPageLoading) {
        setLoading(false);
      }
    }
  }, [role]);

  const refreshLiveData = useCallback(async () => {
    if (liveSyncInFlight.current) return;
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;

    const canAccessFinance = role === 'owner' || role === 'manager';
    const canAccessFullOperations = role === 'owner' || role === 'manager' || role === 'receptionist';
    liveSyncInFlight.current = true;
    setLiveSyncing(true);

    try {
      const [appointmentData, clientData, expenseData, blockData, dashboardData] = await Promise.all([
        canAccessFullOperations ? loadAppointments() : Promise.resolve([]),
        canAccessFullOperations ? loadClients() : Promise.resolve([]),
        canAccessFinance ? loadExpenses() : Promise.resolve([]),
        canAccessFullOperations ? loadScheduleBlocks() : Promise.resolve([]),
        canAccessFinance ? loadDashboard() : Promise.resolve(null)
      ]);

      setAppointments(appointmentData);
      setClients(clientData);
      setExpenses(expenseData);
      setScheduleBlocks(blockData);
      setDashboard(dashboardData);
      setSyncError('');
      setLastSyncedAt(new Date().toISOString());
    } catch (error) {
      setSyncError(getErrorMessage(error));
    } finally {
      liveSyncInFlight.current = false;
      setLiveSyncing(false);
    }
  }, [role]);

  useEffect(() => {
    void refreshData();
  }, [refreshData]);

  useEffect(() => {
    const syncWhenVisible = () => {
      if (document.visibilityState !== 'visible') return;
      void refreshLiveData();
    };

    const timer = window.setInterval(syncWhenVisible, LIVE_SYNC_INTERVAL_MS);
    document.addEventListener('visibilitychange', syncWhenVisible);
    window.addEventListener('focus', syncWhenVisible);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', syncWhenVisible);
      window.removeEventListener('focus', syncWhenVisible);
    };
  }, [refreshLiveData]);

  const applyOnboardingState = useCallback((state: OnboardingState) => {
    setSettings(state.settings);
    setServices(state.services);
    setProfessionals(state.professionals);
  }, []);

  return {
    settings,
    clients,
    services,
    professionals,
    appointments,
    expenses,
    scheduleBlocks,
    retroactiveRequests,
    waitlistEntries,
    dashboard,
    loading,
    pageError,
    liveSyncing,
    syncError,
    lastSyncedAt,
    refreshData,
    refreshLiveData,
    applyOnboardingState
  };
}
