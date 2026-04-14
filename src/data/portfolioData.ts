import type {
  ActivityLogItem,
  MonthlyContentQuota,
  PortfolioCategoryGroup,
  PortfolioCompany,
  PortfolioRole,
  PortfolioStatus,
  ServiceType,
} from '@/types';

interface CompanySeed {
  id: string;
  name: string;
  category: string;
  accountManager: 'Nihat' | 'Selena' | 'Internal' | '-';
  status: PortfolioStatus;
  startDate: string;
  exitDate?: string;
  servicesTaken: ServiceType[];
  monthlyQuotas?: Partial<MonthlyContentQuota>;
  notes?: string[];
  exitReason?: string;
}

interface PortfolioCompanyWithCategory extends PortfolioCompany {
  category: string;
}

const privateRoles: PortfolioRole[] = ['admin', 'manager'];

const managerMap: Record<CompanySeed['accountManager'], string[]> = {
  Nihat: ['1'],
  Selena: ['2'],
  Internal: ['3'],
  '-': [],
};

const palettePool = [
  ['#1D4ED8', '#0EA5E9', '#E2E8F0'],
  ['#0F766E', '#14B8A6', '#CCFBF1'],
  ['#7C3AED', '#A78BFA', '#EDE9FE'],
  ['#B45309', '#F59E0B', '#FEF3C7'],
  ['#BE123C', '#F43F5E', '#FFE4E6'],
  ['#166534', '#22C55E', '#DCFCE7'],
];

const toSlug = (value: string) =>
  value
    .toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/İ/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const resolveQuota = (
  services: ServiceType[],
  quota?: Partial<MonthlyContentQuota>
): MonthlyContentQuota => {
  const hasSocial = services.includes('Sosyal Medya Yönetimi');
  const hasVideo = services.includes('Video Prodüksiyon');
  const hasDesign = services.includes('Grafik Tasarım');

  const fallback: MonthlyContentQuota = hasVideo && hasSocial
    ? { video: 4, post: 12, story: 20 }
    : hasSocial && hasDesign
      ? { video: 1, post: 10, story: 16 }
      : hasSocial
        ? { video: 0, post: 8, story: 12 }
        : hasVideo
          ? { video: 3, post: 0, story: 0 }
          : { video: 0, post: 6, story: 0 };

  return {
    video: quota?.video ?? fallback.video,
    post: quota?.post ?? fallback.post,
    story: quota?.story ?? fallback.story,
  };
};

const makeActivityLog = (seed: CompanySeed): ActivityLogItem[] => {
  const createdLog: ActivityLogItem = {
    id: `${seed.id}-log-created`,
    date: `${seed.startDate}T09:00:00Z`,
    author: seed.accountManager === '-' ? 'System' : seed.accountManager,
    action: 'Portfolio created',
    note: `${seed.name} portföy kaydı açıldı.`,
  };

  if (!seed.exitDate || !seed.exitReason) {
    return [createdLog];
  }

  return [
    createdLog,
    {
      id: `${seed.id}-log-exit`,
      date: `${seed.exitDate}T09:00:00Z`,
      author: seed.accountManager === '-' ? 'System' : seed.accountManager,
      action: 'Client exited',
      note: seed.exitReason,
    },
  ];
};

const buildCompany = (seed: CompanySeed, index: number): PortfolioCompanyWithCategory => {
  const slug = toSlug(seed.name);
  const quotas = resolveQuota(seed.servicesTaken, seed.monthlyQuotas);
  const palette = palettePool[index % palettePool.length];

  const baseNotes = [
    `Account Manager: ${seed.accountManager}`,
    ...(seed.notes ?? []),
  ];

  if (seed.exitReason) {
    baseNotes.push(`Exit Reason: ${seed.exitReason}`);
  }

  const hasSocialOrVideo =
    seed.servicesTaken.includes('Sosyal Medya Yönetimi') ||
    seed.servicesTaken.includes('Video Prodüksiyon');

  const socialMediaAccounts = hasSocialOrVideo
    ? [
        {
          platform: 'Instagram',
          handle: `@${slug.replace(/-/g, '')}`,
          url: `https://instagram.com/${slug.replace(/-/g, '')}`,
          visibleTo: privateRoles,
        },
      ]
    : [
        {
          platform: 'LinkedIn',
          handle: seed.name,
          url: `https://linkedin.com/company/${slug}`,
          visibleTo: privateRoles,
        },
      ];

  return {
    id: seed.id,
    category: seed.category,
    name: seed.name,
    status: seed.status,
    startDate: seed.startDate,
    exitDate: seed.exitDate,
    servicesTaken: seed.servicesTaken,
    monthlyQuotas: quotas,
    socialMediaAccounts,
    brandIdentity: {
      logos: [`${slug}-logo.svg`],
      colorPalette: palette,
      fonts: ['Inter', 'Manrope'],
      brandTone: seed.status === 'on-hold' ? 'Paused' : 'Corporate',
    },
    contacts: [
      {
        name: `${seed.name.split(' ')[0]} Yetkilisi`,
        role: 'Müşteri Temsilcisi',
        email: `contact@${slug}.com`,
        phone: '+90 555 000 00 00',
      },
    ],
    assignedTeamMemberIds: managerMap[seed.accountManager],
    monthlyContentCalendar:
      seed.status === 'active'
        ? [
            {
              id: `${seed.id}-cal-1`,
              date: '2026-03-05',
              title: 'Aylık içerik planı kickoff',
              channel: 'Instagram',
              status: 'planned',
            },
            {
              id: `${seed.id}-cal-2`,
              date: '2026-03-12',
              title: 'Onay sonrası yayın paketi',
              channel: 'Instagram',
              status: 'in-production',
            },
          ]
        : [],
    notes: baseNotes,
    activityLog: makeActivityLog(seed),
  };
};

const companySeeds: CompanySeed[] = [
  {
    id: 'arkas-otomotiv',
    name: 'ARKAS OTOMOTİV',
    accountManager: 'Nihat',
    category: 'A',
    status: 'active',
    startDate: '2024-02-15',
    servicesTaken: ['Sosyal Medya Yönetimi', 'Video Prodüksiyon'],
    monthlyQuotas: { video: 4, post: 12, story: 20 },
    notes: ['High corporate approval flow, slow feedback.'],
  },
  {
    id: 'volcar-otomotiv',
    name: 'VOLCAR OTOMOTİV',
    accountManager: 'Nihat',
    category: 'V',
    status: 'left',
    startDate: '2023-01-10',
    exitDate: '2024-09-30',
    servicesTaken: ['Sosyal Medya Yönetimi', 'Performance Marketing'],
    exitReason: 'Budget reduction.',
  },
  {
    id: 'pinea-logistics',
    name: 'PİNEA LOGISTICS',
    accountManager: 'Nihat',
    category: 'P',
    status: 'active',
    startDate: '2023-06-05',
    servicesTaken: ['Sosyal Medya Yönetimi', 'Grafik Tasarım'],
    monthlyQuotas: { post: 8, story: 16 },
  },
  {
    id: 'lemar-logistics',
    name: 'LEMAR LOGISTICS',
    accountManager: 'Nihat',
    category: 'L',
    status: 'on-hold',
    startDate: '2023-09-12',
    servicesTaken: ['Sosyal Medya Yönetimi'],
    notes: ['Seasonal pause.'],
  },
  {
    id: 'cosmos-yapi',
    name: 'COSMOS YAPI',
    accountManager: 'Nihat',
    category: 'C',
    status: 'active',
    startDate: '2025-03-20',
    servicesTaken: ['Kurumsal Kimlik', 'Sosyal Medya Yönetimi'],
  },
  {
    id: '7-kita-petrol',
    name: '7 KITA PETROL',
    accountManager: 'Nihat',
    category: '7',
    status: 'left',
    startDate: '2023-04-01',
    exitDate: '2025-01-15',
    servicesTaken: ['Video Prodüksiyon'],
    exitReason: 'Internal restructuring.',
  },
  {
    id: 'caba-yapi',
    name: 'ÇABA YAPI',
    accountManager: 'Nihat',
    category: 'Ç',
    status: 'active',
    startDate: '2024-11-11',
    servicesTaken: ['Sosyal Medya Yönetimi', 'Video Prodüksiyon'],
  },
  {
    id: 'konyapi-insaat',
    name: 'KONYAPI İNŞAAT',
    accountManager: 'Nihat',
    category: 'K',
    status: 'left',
    startDate: '2023-02-08',
    exitDate: '2024-08-01',
    servicesTaken: ['Grafik Tasarım'],
  },
  {
    id: 'luxarte-by-bicer-mobilya',
    name: 'LUXARTE BY BİÇER MOBİLYA',
    accountManager: 'Nihat',
    category: 'L',
    status: 'active',
    startDate: '2024-05-18',
    servicesTaken: ['Sosyal Medya Yönetimi', 'Video Prodüksiyon'],
  },
  {
    id: 'radisson-blue-aliaga-hotel',
    name: 'RADISSON BLUE ALİAĞA HOTEL',
    accountManager: 'Nihat',
    category: 'R',
    status: 'active',
    startDate: '2023-07-01',
    servicesTaken: ['Sosyal Medya Yönetimi', 'Video Prodüksiyon'],
    notes: ['High brand guideline sensitivity.'],
  },
  {
    id: 'ira-spa',
    name: 'İRA SPA',
    accountManager: 'Nihat',
    category: 'İ',
    status: 'active',
    startDate: '2025-01-22',
    servicesTaken: ['Sosyal Medya Yönetimi'],
  },
  {
    id: 'xsunrayban-plus',
    name: 'XSUNRAYBAN PLUS',
    accountManager: 'Nihat',
    category: 'X',
    status: 'left',
    startDate: '2023-06-14',
    exitDate: '2024-06-30',
    servicesTaken: ['Performance Marketing'],
  },
  {
    id: 'beehivedent',
    name: 'BEEHIVEDENT',
    accountManager: 'Nihat',
    category: 'B',
    status: 'active',
    startDate: '2024-10-03',
    servicesTaken: ['Sosyal Medya Yönetimi', 'Grafik Tasarım'],
  },
  {
    id: 'kisikkoy',
    name: 'KISIKKÖY',
    accountManager: 'Nihat',
    category: 'K',
    status: 'on-hold',
    startDate: '2023-09-09',
    servicesTaken: ['Sosyal Medya Yönetimi'],
  },
  {
    id: 'nikas-balik',
    name: 'NİKAS BALIK',
    accountManager: 'Nihat',
    category: 'N',
    status: 'active',
    startDate: '2024-02-17',
    servicesTaken: ['Sosyal Medya Yönetimi', 'Video Prodüksiyon'],
  },
  {
    id: 'geveze-creative',
    name: 'GEVEZE CREATIVE',
    accountManager: 'Internal',
    category: 'G',
    status: 'active',
    startDate: '2023-01-01',
    servicesTaken: ['İç Projeler'],
    notes: ['Agency internal account.'],
  },
  {
    id: 'egelioglu-petrol',
    name: 'EGELİOĞLU PETROL',
    accountManager: 'Selena',
    category: 'E',
    status: 'active',
    startDate: '2024-05-05',
    servicesTaken: ['Sosyal Medya Yönetimi'],
  },
  {
    id: 'miraikan-agro',
    name: 'MIRAIKAN AGRO',
    accountManager: 'Selena',
    category: 'M',
    status: 'active',
    startDate: '2023-12-12',
    servicesTaken: ['Sosyal Medya Yönetimi', 'Grafik Tasarım'],
  },
  {
    id: 'zbs-elektronik',
    name: 'ZBS ELEKTRONİK',
    accountManager: 'Selena',
    category: 'Z',
    status: 'left',
    startDate: '2023-03-03',
    exitDate: '2025-03-15',
    servicesTaken: ['Video Prodüksiyon'],
  },
  {
    id: 'warmout',
    name: 'WARMOUT',
    accountManager: 'Selena',
    category: 'W',
    status: 'active',
    startDate: '2025-02-01',
    servicesTaken: ['Sosyal Medya Yönetimi'],
  },
  {
    id: 'om-group',
    name: 'OM GROUP',
    accountManager: 'Selena',
    category: 'O',
    status: 'active',
    startDate: '2024-10-10',
    servicesTaken: ['Kurumsal Kimlik', 'Sosyal Medya Yönetimi'],
  },
  {
    id: 'klimera',
    name: 'KLİMERA',
    accountManager: 'Selena',
    category: 'K',
    status: 'on-hold',
    startDate: '2023-06-18',
    servicesTaken: ['Grafik Tasarım'],
  },
  {
    id: 'ibis-hotel',
    name: 'İBİS HOTEL',
    accountManager: 'Selena',
    category: 'İ',
    status: 'active',
    startDate: '2024-07-07',
    servicesTaken: ['Sosyal Medya Yönetimi', 'Video Prodüksiyon'],
  },
  {
    id: 'grax-yapi',
    name: 'GRAX YAPI',
    accountManager: 'Selena',
    category: 'G',
    status: 'active',
    startDate: '2023-09-20',
    servicesTaken: ['Sosyal Medya Yönetimi'],
  },
  {
    id: 'atlantis-yacht',
    name: 'ATLANTİS YACHT',
    accountManager: 'Selena',
    category: 'A',
    status: 'active',
    startDate: '2025-04-11',
    servicesTaken: ['Video Prodüksiyon', 'Sosyal Medya Yönetimi'],
  },
  {
    id: 'perla-pura-hotel',
    name: 'PERLA PURA HOTEL',
    accountManager: 'Selena',
    category: 'P',
    status: 'left',
    startDate: '2023-06-01',
    exitDate: '2024-12-01',
    servicesTaken: ['Sosyal Medya Yönetimi'],
  },
  {
    id: 'barney-gastro',
    name: 'BARNEY GASTRO',
    accountManager: '-',
    category: 'B',
    status: 'active',
    startDate: '2025-02-02',
    servicesTaken: ['Sosyal Medya Yönetimi'],
  },
  {
    id: 'pinoliva-garden',
    name: 'PİNOLİVA GARDEN',
    accountManager: '-',
    category: 'P',
    status: 'active',
    startDate: '2025-03-15',
    servicesTaken: ['Sosyal Medya Yönetimi'],
  },
  {
    id: 'panoroma',
    name: 'PANOROMA',
    accountManager: '-',
    category: 'P',
    status: 'on-hold',
    startDate: '2023-08-10',
    servicesTaken: ['Grafik Tasarım'],
  },
  {
    id: 'uzmanlar-hirdavat',
    name: 'UZMANLAR HIRDAVAT',
    accountManager: 'Nihat',
    category: 'U',
    status: 'active',
    startDate: '2024-01-01',
    servicesTaken: ['Sosyal Medya Yönetimi'],
  },
  {
    id: 'becca-guzellik-salonu',
    name: 'BECCA GÜZELLİK SALONU',
    accountManager: 'Selena',
    category: 'B',
    status: 'active',
    startDate: '2025-02-14',
    servicesTaken: ['Sosyal Medya Yönetimi', 'Video Prodüksiyon'],
  },
];

const companiesWithCategory = companySeeds.map(buildCompany);

export const portfolioCompanies: PortfolioCompany[] = companiesWithCategory.map(
  ({ category, ...company }) => {
    void category;
    return company;
  }
);

const baseAlphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const dynamicCategories = Array.from(
  new Set(companiesWithCategory.map((company) => company.category))
).filter((category) => !baseAlphabet.includes(category));

const categoryOrder = [...baseAlphabet, ...dynamicCategories];

export const portfolioCategoryGroups: PortfolioCategoryGroup[] = categoryOrder.map((letter) => ({
  letter,
  companies: companiesWithCategory
    .filter((company) => company.category === letter)
    .map(({ category, ...company }) => {
      void category;
      return company;
    }),
}));

export const portfolioCompanySchemaExample = {
  id: 'company-id',
  name: 'Company Name',
  status: 'active',
  startDate: '2026-01-01',
  exitDate: '2026-12-31',
  servicesTaken: ['Sosyal Medya Yönetimi', 'Video Prodüksiyon', 'Kurumsal Kimlik'],
  monthlyQuotas: { video: 4, post: 16, story: 24 },
  socialMediaAccounts: [
    {
      platform: 'Instagram',
      handle: '@company',
      url: 'https://instagram.com/company',
      visibleTo: ['admin', 'manager'],
    },
  ],
  brandIdentity: {
    logos: ['logo-primary.svg'],
    colorPalette: ['#111827', '#6366F1'],
    fonts: ['Inter'],
    brandTone: 'Corporate',
  },
  contacts: [
    {
      name: 'Contact Name',
      role: 'Marketing Manager',
      email: 'contact@company.com',
      phone: '+90 500 000 00 00',
    },
  ],
  assignedTeamMemberIds: ['1'],
  monthlyContentCalendar: [
    {
      id: 'plan-id',
      date: '2026-03-15',
      title: 'Campaign Post',
      channel: 'Instagram',
      status: 'planned',
    },
  ],
  notes: ['Internal notes'],
  activityLog: [
    {
      id: 'log-id',
      date: '2026-03-01T10:00:00Z',
      author: 'Team Member',
      action: 'Field updated',
      note: 'Details',
    },
  ],
} as const;
