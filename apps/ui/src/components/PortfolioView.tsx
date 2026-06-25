import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PortfolioCompanyDialog } from '@/components/PortfolioCompanyDialog';
import { PortfolioDetailView } from '@/components/PortfolioDetailView';
import type {
  PortfolioCompany,
  PortfolioCompanyDraft,
  PortfolioRole,
  PortfolioStatus,
  Task,
} from '@/types';
import { Building2, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

interface PortfolioViewProps {
  companies: PortfolioCompany[];
  selectedCompanyId: string | null;
  currentUserRole: PortfolioRole;
  onSelectCompany: (companyId: string) => void;
  onBackToOverview: () => void;
  onCreateCompany: (payload: PortfolioCompanyDraft) => void;
  onUpdateCompany: (companyId: string, payload: PortfolioCompanyDraft) => void;
  onDeleteCompany: (companyId: string) => void;
  canManageCompanies: boolean;
  serviceTypes: string[];
  onAddServiceType?: (name: string) => void;
  onRemoveServiceType?: (name: string) => void;
  tasks?: Task[];
  onTaskClick?: (taskId: string) => void;
}

const statusMap: Record<PortfolioStatus, { label: string; className: string }> = {
  active: { label: 'Aktif', className: 'bg-emerald-100 text-emerald-700' },
  'on-hold': { label: 'Beklemede', className: 'bg-amber-100 text-amber-700' },
  left: { label: 'Ayrıldı', className: 'bg-gray-200 text-gray-700' },
};

const fmtDate = (value?: string) =>
  value ? format(new Date(value), 'd MMM yyyy', { locale: tr }) : '-';

const getServiceLabel = (s: string): string => {
  const map: Record<string, string> = {
    SEO: 'SEO',
    'Performance Marketing': 'Performans Pazarlaması',
    'Influencer Marketing': 'Influencer Pazarlaması',
  };
  return map[s] ?? s;
};

export function PortfolioView({
  companies,
  selectedCompanyId,
  currentUserRole,
  onSelectCompany,
  onBackToOverview,
  onCreateCompany,
  onUpdateCompany,
  onDeleteCompany,
  canManageCompanies,
  serviceTypes = [],
  onAddServiceType,
  onRemoveServiceType,
  tasks = [],
  onTaskClick,
}: PortfolioViewProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const selectedCompany = useMemo(
    () => companies.find((c) => c.id === selectedCompanyId) ?? null,
    [companies, selectedCompanyId],
  );

  if (selectedCompany) {
    return (
      <PortfolioDetailView
        company={selectedCompany}
        currentUserRole={currentUserRole}
        onBack={onBackToOverview}
        onUpdateCompany={onUpdateCompany}
        onDeleteCompany={onDeleteCompany}
        canManage={canManageCompanies}
        serviceTypes={serviceTypes}
        onAddServiceType={onAddServiceType}
        onRemoveServiceType={onRemoveServiceType}
        tasks={tasks}
        onTaskClick={onTaskClick}
      />
    );
  }

  return (
    <>
      <ScrollArea className="h-full p-6">
        <div className="max-w-7xl mx-auto space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">Portföy</h2>
              <p className="text-sm text-gray-500 mt-1">
                Tüm şirket portföyü, sözleşme ve üretim bilgileri
              </p>
            </div>
            <div className="flex items-center gap-2">
              {canManageCompanies && (
                <Button
                  className="bg-[#6161FF] hover:bg-[#5050E0]"
                  onClick={() => setIsDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Yeni Şirket
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {companies.map((company) => (
              <Card key={company.id} className="border-gray-200 h-full flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{company.name}</CardTitle>
                    <Badge className={(statusMap[company.status] ?? statusMap['on-hold']).className}>
                      {(statusMap[company.status] ?? statusMap['on-hold']).label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col gap-3 text-sm">
                  <div className="text-gray-600">
                    <strong>Başlangıç:</strong> {fmtDate(company.startDate)}
                    <br />
                    <strong>Ayrılış:</strong> {fmtDate(company.exitDate)}
                  </div>

                  <div>
                    <strong className="text-gray-700">Hizmetler:</strong>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {company.servicesTaken.map((service) => (
                        <Badge key={service} variant="secondary" className="text-[11px]">
                          {getServiceLabel(service)}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="text-gray-600">
                    <strong>Kota:</strong> Video {company.monthlyQuotas.video} · Gönderi{' '}
                    {company.monthlyQuotas.post} · Hikaye {company.monthlyQuotas.story} · 3D{' '}
                    {company.monthlyQuotas.render3d ?? 0}
                  </div>

                  <Button
                    className="w-full mt-auto bg-[#6161FF] hover:bg-[#5050E0]"
                    onClick={() => onSelectCompany(company.id)}
                  >
                    <Building2 className="h-4 w-4 mr-2" />
                    Şirket Detayı
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {companies.length === 0 && (
            <Card>
              <CardContent className="py-10 text-center text-sm text-gray-500">
                Şirket bulunamadı.
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>

      {isDialogOpen && (
        <PortfolioCompanyDialog
          open={isDialogOpen}
          mode="create"
          initialCompany={null}
          serviceTypes={serviceTypes}
          onAddServiceType={onAddServiceType}
          onRemoveServiceType={onRemoveServiceType}
          onClose={() => setIsDialogOpen(false)}
          onSubmit={(payload) => {
            onCreateCompany(payload);
            setIsDialogOpen(false);
          }}
        />
      )}
    </>
  );
}
