'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@barokah/ui';
import { AlertBanner, LoadingSkeleton, PageHeader } from '@/components/dashboard/dashboard-ui';
import { IntegrationsSection } from '@/components/dashboard/settings/IntegrationsSection';
import { SettingsTabs, type SettingsTabId } from '@/components/dashboard/settings/settings-ui';
import {
  KasirPosSection,
  LoyaltySection,
  OnlineStorefrontSection,
  OutletSection,
  PembayaranSection,
  PromoSection,
  TokoTenantSection,
} from '@/components/dashboard/settings/settings-sections';
import { testMidtransConnection } from '@/lib/settings-api';
import { useTenantSettingsQuery, useUpdateTenantSettingsMutation } from '@/hooks/useTenantSettings';
import { fetchMe, type AuthUser } from '@/lib/auth';
import { useOutletSelection } from '@/lib/outlet-selection-state';
import { fetchOutlets, type ReportOutlet } from '@/lib/reports';
import { fetchPromotions, type PromoRuleView } from '@/lib/promotions-api';

const SETTINGS_TAB_IDS: SettingsTabId[] = [
  'toko',
  'kasir',
  'loyalty',
  'promo',
  'pembayaran',
  'online',
  'outlet',
  'integrasi',
];

function parseSettingsTab(value: string | null): SettingsTabId {
  if (value && SETTINGS_TAB_IDS.includes(value as SettingsTabId)) {
    return value as SettingsTabId;
  }
  return 'toko';
}

export function SettingsPageClient({ tab }: { tab?: string }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<SettingsTabId>(() => parseSettingsTab(tab ?? null));
  const { selectedOutletId } = useOutletSelection();

  useEffect(() => {
    setActiveTab(parseSettingsTab(tab ?? null));
  }, [tab]);

  const handleTabChange = useCallback(
    (tab: SettingsTabId) => {
      setActiveTab(tab);
      router.push(`/dashboard/settings?tab=${tab}`);
    },
    [router],
  );
  const [user, setUser] = useState<AuthUser | null>(null);
  const [outlets, setOutlets] = useState<ReportOutlet[]>([]);
  const [promos, setPromos] = useState<PromoRuleView[]>([]);
  const [promosLoading, setPromosLoading] = useState(true);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);

  const [ppnEnabled, setPpnEnabled] = useState(false);
  const [ppnRate, setPpnRate] = useState('11');
  const [loyaltyEnabled, setLoyaltyEnabled] = useState(true);
  const [earnRate, setEarnRate] = useState('10000');
  const [redeemEnabled, setRedeemEnabled] = useState(true);
  const [redeemValue, setRedeemValue] = useState('1000');
  const [redeemMaxPercent, setRedeemMaxPercent] = useState('50');
  const [defaultCreditTermsDays, setDefaultCreditTermsDays] = useState(30);
  const [midtransKeyInput, setMidtransKeyInput] = useState('');
  const [midtransProduction, setMidtransProduction] = useState(false);
  const [weeklyReportEmail, setWeeklyReportEmail] = useState(false);

  const [toast, setToast] = useState<{ variant: 'success' | 'error'; message: string } | null>(null);
  const [testingMidtrans, setTestingMidtrans] = useState(false);
  const [midtransTestMessage, setMidtransTestMessage] = useState<string | null>(null);

  const settingsQuery = useTenantSettingsQuery();
  const updateMutation = useUpdateTenantSettingsMutation();

  const isOwner = user?.role === 'OWNER';
  const isManager = user?.role === 'MANAGER';
  const canEdit = isOwner || isManager;

  const settings = settingsQuery.data ?? null;

  const syncFormFromSettings = useCallback(() => {
    if (!settings) return;
    setPpnEnabled(settings.ppnEnabled);
    setPpnRate(String(settings.ppnRatePercent));
    setLoyaltyEnabled(settings.loyaltyPointsEnabled);
    setEarnRate(String(settings.loyaltyEarnRateIdr));
    setRedeemEnabled(settings.loyaltyRedeemEnabled);
    setRedeemValue(String(settings.loyaltyRedeemValueIdr));
    setRedeemMaxPercent(String(settings.loyaltyRedeemMaxPercent));
    setDefaultCreditTermsDays(settings.defaultCreditTermsDays);
    setMidtransProduction(settings.midtrans.isProduction);
    setWeeklyReportEmail(settings.weeklyReportEmailEnabled);
  }, [settings]);

  useEffect(() => {
    syncFormFromSettings();
  }, [syncFormFromSettings]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const loadBootstrap = useCallback(async () => {
    setBootstrapError(null);
    setPromosLoading(true);
    try {
      const [me, outletsRes, promoList] = await Promise.all([
        fetchMe(),
        fetchOutlets(),
        fetchPromotions().catch(() => [] as PromoRuleView[]),
      ]);
      setUser(me);
      setOutlets(outletsRes?.outlets ?? []);
      setPromos(promoList);
    } catch (err) {
      setBootstrapError(err instanceof Error ? err.message : 'Gagal memuat profil pengguna.');
    } finally {
      setPromosLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBootstrap();
  }, [loadBootstrap]);

  async function handleSavePpn() {
    if (!canEdit) return;
    try {
      await updateMutation.mutateAsync({
        ppnEnabled,
        ppnRatePercent: Number(ppnRate),
      });
      setToast({ variant: 'success', message: 'Pengaturan PPN berhasil disimpan.' });
    } catch (err) {
      setToast({
        variant: 'error',
        message: err instanceof Error ? err.message : 'Gagal menyimpan PPN.',
      });
    }
  }

  async function handleSaveLoyalty() {
    if (!canEdit) return;
    try {
      await updateMutation.mutateAsync({
        loyaltyPointsEnabled: loyaltyEnabled,
        loyaltyEarnRateIdr: Number(earnRate),
        loyaltyRedeemEnabled: redeemEnabled,
        loyaltyRedeemValueIdr: Number(redeemValue),
        loyaltyRedeemMaxPercent: Number(redeemMaxPercent),
      });
      setToast({ variant: 'success', message: 'Pengaturan loyalty berhasil disimpan.' });
    } catch (err) {
      setToast({
        variant: 'error',
        message: err instanceof Error ? err.message : 'Gagal menyimpan loyalty.',
      });
    }
  }

  async function handleSaveCreditTerms() {
    if (!canEdit) return;
    try {
      await updateMutation.mutateAsync({ defaultCreditTermsDays });
      setToast({ variant: 'success', message: 'Jatuh tempo piutang default berhasil disimpan.' });
    } catch (err) {
      setToast({
        variant: 'error',
        message: err instanceof Error ? err.message : 'Gagal menyimpan jatuh tempo.',
      });
    }
  }

  async function handleSaveMidtrans() {
    if (!isOwner) return;
    try {
      await updateMutation.mutateAsync({
        midtransIsProduction: midtransProduction,
        weeklyReportEmailEnabled: weeklyReportEmail,
        ...(midtransKeyInput.trim() ? { midtransServerKey: midtransKeyInput.trim() } : {}),
      });
      setMidtransKeyInput('');
      setToast({ variant: 'success', message: 'Pengaturan Midtrans berhasil disimpan.' });
    } catch (err) {
      setToast({
        variant: 'error',
        message: err instanceof Error ? err.message : 'Gagal menyimpan Midtrans.',
      });
    }
  }

  async function handleTestMidtrans() {
    setTestingMidtrans(true);
    setMidtransTestMessage(null);
    try {
      const result = await testMidtransConnection();
      setMidtransTestMessage(result.message);
    } catch (err) {
      setMidtransTestMessage(err instanceof Error ? err.message : 'Uji koneksi Midtrans gagal.');
    } finally {
      setTestingMidtrans(false);
    }
  }

  const loading = settingsQuery.isLoading && !settings;
  const queryError =
    bootstrapError ??
    (settingsQuery.isError
      ? settingsQuery.error instanceof Error
        ? settingsQuery.error.message
        : 'Gagal memuat pengaturan tenant.'
      : null);

  function renderActiveSection() {
    switch (activeTab) {
      case 'toko':
        return (
          <TokoTenantSection
            user={user}
            settings={settings}
            canEdit={canEdit}
            ppnEnabled={ppnEnabled}
            ppnRate={ppnRate}
            onPpnEnabledChange={setPpnEnabled}
            onPpnRateChange={setPpnRate}
            onSave={() => void handleSavePpn()}
            saving={updateMutation.isPending}
          />
        );
      case 'kasir':
        return (
          <KasirPosSection
            settings={settings}
            canEdit={canEdit}
            defaultCreditTermsDays={defaultCreditTermsDays}
            onDefaultCreditTermsDaysChange={setDefaultCreditTermsDays}
            onSaveCreditTerms={() => void handleSaveCreditTerms()}
            saving={updateMutation.isPending}
          />
        );
      case 'loyalty':
        return (
          <LoyaltySection
            settings={settings}
            canEdit={canEdit}
            loyaltyEnabled={loyaltyEnabled}
            earnRate={earnRate}
            redeemEnabled={redeemEnabled}
            redeemValue={redeemValue}
            redeemMaxPercent={redeemMaxPercent}
            onLoyaltyEnabledChange={setLoyaltyEnabled}
            onEarnRateChange={setEarnRate}
            onRedeemEnabledChange={setRedeemEnabled}
            onRedeemValueChange={setRedeemValue}
            onRedeemMaxPercentChange={setRedeemMaxPercent}
            onSave={() => void handleSaveLoyalty()}
            saving={updateMutation.isPending}
          />
        );
      case 'promo':
        return <PromoSection promos={promos} loading={promosLoading} />;
      case 'pembayaran':
        return (
          <PembayaranSection
            settings={settings}
            isOwner={isOwner}
            canEditMidtrans={isOwner}
            midtransProduction={midtransProduction}
            midtransKeyInput={midtransKeyInput}
            weeklyReportEmail={weeklyReportEmail}
            onMidtransProductionChange={setMidtransProduction}
            onMidtransKeyInputChange={setMidtransKeyInput}
            onWeeklyReportEmailChange={setWeeklyReportEmail}
            onSaveMidtrans={() => void handleSaveMidtrans()}
            onTestMidtrans={handleTestMidtrans}
            saving={updateMutation.isPending}
            testing={testingMidtrans}
            testMessage={midtransTestMessage}
          />
        );
      case 'online':
        return <OnlineStorefrontSection user={user} />;
      case 'outlet':
        return <OutletSection outlets={outlets} selectedOutletId={selectedOutletId} />;
      case 'integrasi':
        return <IntegrationsSection embedded />;
      default:
        return null;
    }
  }

  return (
    <div style={{ maxWidth: 960, display: 'grid', gap: '1.25rem' }}>
      <PageHeader
        title="Pengaturan Aplikasi"
        description="Kelola konfigurasi tenant, kasir, loyalty, pembayaran, dan storefront dalam satu tempat."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Pengaturan' },
        ]}
        actions={
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              void loadBootstrap();
              void settingsQuery.refetch();
            }}
            disabled={loading || settingsQuery.isFetching}
          >
            Muat ulang
          </Button>
        }
      />

      {queryError ? (
        <AlertBanner
          variant="error"
          onRetry={() => {
            void loadBootstrap();
            void settingsQuery.refetch();
          }}
        >
          {queryError}
        </AlertBanner>
      ) : null}

      {toast ? <AlertBanner variant={toast.variant}>{toast.message}</AlertBanner> : null}

      {!canEdit && user ? (
        <AlertBanner variant="info">
          Peran {user.role === 'CASHIER' ? 'Kasir' : user.role} — halaman ini hanya baca. Hubungi Pemilik atau
          Manajer untuk mengubah pengaturan.
        </AlertBanner>
      ) : null}

      <SettingsTabs activeTab={activeTab} onTabChange={handleTabChange} />

      {loading && activeTab !== 'integrasi' ? (
        <div style={{ padding: '1.25rem', borderRadius: 12, border: '1px solid #e2e8f0', background: '#fff' }}>
          <LoadingSkeleton rows={5} />
        </div>
      ) : (
        renderActiveSection()
      )}
    </div>
  );
}
