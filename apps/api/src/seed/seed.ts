import 'reflect-metadata';
import * as mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as bcrypt from 'bcrypt';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { UserSchema, UserModel } from '../modules/users/schemas/user.schema';
import { TaskSchema, TaskModel } from '../modules/tasks/schemas/task.schema';
import { PortfolioCompanySchema, PortfolioCompanyModel } from '../modules/portfolio/schemas/portfolio-company.schema';
import { TagSchema, TagModel } from '../modules/tags/schemas/tag.schema';
import { ServiceTypeSchema, ServiceTypeModel } from '../modules/service-types/schemas/service-type.schema';
import { SettingSchema, SettingModel } from '../modules/settings/schemas/setting.schema';
import { WorkspaceSchema, WorkspaceModel } from '../modules/workspace/schemas/workspace.schema';
import { TimeEntrySchema, TimeEntryModel } from '../modules/time-entries/schemas/time-entry.schema';

// ─── Users ───────────────────────────────────────────────────────────────────
// idx: 0=Nihat, 1=Selena, 2=Efecan, 3=Metin, 4=Tuğçe, 5=Kazım
const seedUsers = [
  { name: 'Nihat Birgül',     email: 'nihat@geveze.com',  initials: 'NB', color: '#FF6B6B', title: 'Grafik Tasarımcı',        role: 'member'  },
  { name: 'Selena Serfiçeli', email: 'selena@geveze.com', initials: 'SS', color: '#4ECDC4', title: 'Grafik Tasarımcı',        role: 'member'  },
  { name: 'Efecan Dural',     email: 'efecan@geveze.com', initials: 'ED', color: '#45B7D1', title: 'Yönetici',                role: 'admin'   },
  { name: 'Metin Onur',       email: 'metin@geveze.com',  initials: 'MO', color: '#96CEB4', title: 'Videographer',            role: 'member'  },
  { name: 'Tuğçe Altıparmak', email: 'tugce@geveze.com',  initials: 'TA', color: '#F59E0B', title: 'Sosyal Medya Yöneticisi', role: 'manager' },
  { name: 'Kazım Gün',        email: 'kazim@geveze.com',  initials: 'KG', color: '#A78BFA', title: 'Video Editör',            role: 'admin'   },
];

// ─── Tags ────────────────────────────────────────────────────────────────────
const seedTags = [
  { name: 'Post',       color: '#3B82F6' },
  { name: 'Story',      color: '#8B5CF6' },
  { name: 'Video',      color: '#EF4444' },
  { name: 'Tasarım',    color: '#F59E0B' },
  { name: 'Kampanya',   color: '#10B981' },
  { name: 'Analiz',     color: '#6366F1' },
  { name: 'Müşteri',    color: '#EC4899' },
  { name: 'Onay',       color: '#14B8A6' },
  { name: 'Reels',      color: '#F43F5E' },
  { name: 'Rapor',      color: '#64748B' },
  { name: 'SEO',        color: '#22C55E' },
  { name: 'Reklam',     color: '#FB923C' },
];

// ─── Service Types ────────────────────────────────────────────────────────────
const seedServiceTypes = [
  'Sosyal Medya Yönetimi',
  'Grafik Tasarım',
  'Video Prodüksiyon',
  'İçerik Yazımı',
  'SEO Optimizasyonu',
  'Google Ads Yönetimi',
  'Web Tasarım',
  'Fotoğrafçılık',
  'E-posta Pazarlama',
  'Influencer Pazarlama',
];

// ─── Settings ─────────────────────────────────────────────────────────────────
const seedSettings: Record<string, unknown> = {
  companyName: 'Geveze Ajans',
  defaultCurrency: 'TRY',
  workingDays: ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'],
};

// ─── Workspaces ──────────────────────────────────────────────────────────────
// idx: 0=Geveze Ajans, 1=Geveze Video, 2=Sosyal Medya
const seedWorkspaces = [
  { name: 'Geveze Ajans',   slug: 'geveze-ajans',   color: '#6161FF', icon: '🏢', description: 'Ana ajans iş akışı ve müşteri yönetimi', creatorIdx: 2 },
  { name: 'Geveze Video',   slug: 'geveze-video',   color: '#EF4444', icon: '🎬', description: 'Video prodüksiyon ve montaj süreçleri',   creatorIdx: 5 },
  { name: 'Sosyal Medya',   slug: 'sosyal-medya',   color: '#10B981', icon: '📱', description: 'Sosyal medya içerik ve kampanya yönetimi', creatorIdx: 4 },
];

// ─── Portfolio Companies (all in Workspace 0 = Geveze Ajans) ─────────────────
// idx: 0=TechStart, 1=GreenEarth, 2=MediCare, 3=FashionCo, 4=UrbanKafe
const seedPortfolio = [
  {
    name: 'TechStart AŞ',
    status: 'active' as const,
    startDate: '2024-03-01',
    servicesTaken: ['Sosyal Medya Yönetimi', 'Google Ads Yönetimi', 'Grafik Tasarım'],
    notes: ['Aylık reklam bütçesi 50K TL', 'Haftalık rapor bekleniyor'],
    monthlyQuotas: { video: 4, post: 16, story: 30, render3d: 0 },
    brandIdentity: { logos: [], colorPalette: ['#1D4ED8', '#E2E8F0'], fonts: ['Inter'], brandTone: 'Professional & Yenilikçi' },
    contacts: [{ name: 'Ahmet Kara', role: 'CEO', email: 'ahmet@techstart.com', phone: '0532 111 2233' }],
    socialMediaAccounts: [{ platform: 'Instagram', handle: '@techstarttr', followers: 12400 }],
    monthlyContentCalendar: [],
    activityLog: [],
    assignedTeamMemberIds: [],
  },
  {
    name: 'GreenEarth Organics',
    status: 'active' as const,
    startDate: '2023-09-01',
    servicesTaken: ['Sosyal Medya Yönetimi', 'Video Prodüksiyon', 'Grafik Tasarım', 'Fotoğrafçılık'],
    notes: ['Organik içerik odaklı', 'Video montaj öncelikli'],
    monthlyQuotas: { video: 8, post: 20, story: 40, render3d: 0 },
    brandIdentity: { logos: [], colorPalette: ['#166534', '#22C55E', '#F0FDF4'], fonts: ['Poppins'], brandTone: 'Doğal & Sıcak' },
    contacts: [{ name: 'Zeynep Yıldız', role: 'Marketing Manager', email: 'zeynep@greenearth.com', phone: '0533 444 5566' }],
    socialMediaAccounts: [
      { platform: 'Instagram', handle: '@greenearthorganic', followers: 28700 },
      { platform: 'YouTube', handle: 'GreenEarth Organics', followers: 4200 },
    ],
    monthlyContentCalendar: [],
    activityLog: [],
    assignedTeamMemberIds: [],
  },
  {
    name: 'MediCare Klinik',
    status: 'on-hold' as const,
    startDate: '2023-06-01',
    exitDate: '2024-06-30',
    servicesTaken: ['Web Tasarım', 'SEO Optimizasyonu'],
    notes: ['Proje beklemede', 'Sözleşme yenileme görüşmeleri devam ediyor'],
    monthlyQuotas: { video: 0, post: 4, story: 8, render3d: 0 },
    brandIdentity: { logos: [], colorPalette: ['#0F766E', '#CCFBF1'], fonts: ['Roboto'], brandTone: 'Güvenilir & Profesyonel' },
    contacts: [{ name: 'Dr. Mehmet Şahin', role: 'Direktör', email: 'mehmet@medicare-klinik.com', phone: '0212 555 6677' }],
    socialMediaAccounts: [],
    monthlyContentCalendar: [],
    activityLog: [],
    assignedTeamMemberIds: [],
  },
  {
    name: 'FashionCo',
    status: 'active' as const,
    startDate: '2025-01-15',
    servicesTaken: ['Sosyal Medya Yönetimi', 'Grafik Tasarım', 'Influencer Pazarlama', 'Fotoğrafçılık'],
    notes: ['Sezon kampanyaları yoğun', 'İnfluencer takibi kritik'],
    monthlyQuotas: { video: 6, post: 24, story: 60, render3d: 2 },
    brandIdentity: { logos: [], colorPalette: ['#0F0F0F', '#F5F5F5', '#C9A96E'], fonts: ['Playfair Display', 'Lato'], brandTone: 'Şık & Premium' },
    contacts: [{ name: 'Elif Demir', role: 'Brand Manager', email: 'elif@fashionco.com', phone: '0544 222 3344' }],
    socialMediaAccounts: [
      { platform: 'Instagram', handle: '@fashioncotu', followers: 87500 },
      { platform: 'TikTok', handle: '@fashionco_tr', followers: 142000 },
    ],
    monthlyContentCalendar: [],
    activityLog: [],
    assignedTeamMemberIds: [],
  },
  {
    name: 'UrbanKafe',
    status: 'active' as const,
    startDate: '2025-04-01',
    servicesTaken: ['Sosyal Medya Yönetimi', 'Fotoğrafçılık', 'Video Prodüksiyon'],
    notes: ['Ambiyans ve ürün fotoğraflarına odaklan', 'Haftalık story şart'],
    monthlyQuotas: { video: 4, post: 12, story: 28, render3d: 0 },
    brandIdentity: { logos: [], colorPalette: ['#78350F', '#FEF3C7', '#D97706'], fonts: ['Nunito'], brandTone: 'Sıcak & Davetkar' },
    contacts: [{ name: 'Can Arslan', role: 'Sahip', email: 'can@urbankafe.com', phone: '0505 888 9900' }],
    socialMediaAccounts: [{ platform: 'Instagram', handle: '@urbankafe_istanbul', followers: 18300 }],
    monthlyContentCalendar: [],
    activityLog: [],
    assignedTeamMemberIds: [],
  },
];

// ─── Tasks ────────────────────────────────────────────────────────────────────
// wsIdx: 0=Ajans, 1=Video, 2=SosyalMedya
// portfolioIdx: 0=TechStart, 1=GreenEarth, 2=MediCare, 3=FashionCo, 4=UrbanKafe, null=no client
// assigneeIdx: 0=Nihat, 1=Selena, 2=Efecan, 3=Metin, 4=Tuğçe, 5=Kazım
const rawTasks = [
  // ── Geveze Ajans (wsIdx=0) ── global idx 0-9
  { wsIdx: 0, portIdx: 0, assigneeIdx: 0, title: 'TechStart sosyal medya stratejisi',   description: 'Q3 sosyal medya strateji belgesi ve içerik planı hazırlama',          status: 'in-progress', priority: 'high',   tags: ['Kampanya'],           progress: 55, due: '2026-07-05', created: '2026-06-10' },
  { wsIdx: 0, portIdx: 1, assigneeIdx: 1, title: 'GreenEarth ürün fotoğraf brief',      description: 'Temmuz ürün çekimi için moodboard ve brief hazırlığı',                  status: 'review',      priority: 'medium', tags: ['Müşteri', 'Onay'],    progress: 90, due: '2026-07-01', created: '2026-06-12' },
  { wsIdx: 0, portIdx: 2, assigneeIdx: 2, title: 'MediCare web site güncellemesi',       description: 'Anasayfa içerik güncellemesi ve SEO revizyonu',                          status: 'brief',       priority: 'low',    tags: ['SEO'],                progress: 0,  due: '2026-07-15', created: '2026-06-20' },
  { wsIdx: 0, portIdx: 3, assigneeIdx: 0, title: 'FashionCo kampanya görselleri',        description: 'Yaz sezonu kampanya için 20 adet post ve story görseli',                 status: 'in-progress', priority: 'urgent', tags: ['Tasarım', 'Kampanya'], progress: 40, due: '2026-06-30', created: '2026-06-15' },
  { wsIdx: 0, portIdx: 4, assigneeIdx: 1, title: 'UrbanKafe menü tasarımı',              description: 'Yaz menüsü için dijital ve fiziksel menü tasarımı',                      status: 'done',        priority: 'medium', tags: ['Tasarım'],            progress: 100, due: '2026-06-15', created: '2026-06-01' },
  { wsIdx: 0, portIdx: null, assigneeIdx: 2, title: 'Haziran müşteri raporu',             description: 'Tüm müşteriler için Haziran ayı performans özeti ve sunumu',             status: 'in-progress', priority: 'high',   tags: ['Rapor'],              progress: 65, due: '2026-07-03', created: '2026-06-22' },
  { wsIdx: 0, portIdx: 0, assigneeIdx: 0, title: 'TechStart Google Ads analizi',         description: 'Haziran reklam kampanyası ROAS analizi ve optimizasyon önerileri',       status: 'review',      priority: 'high',   tags: ['Analiz', 'Reklam'],   progress: 85, due: '2026-07-02', created: '2026-06-18' },
  { wsIdx: 0, portIdx: 3, assigneeIdx: 1, title: 'FashionCo influencer brief',           description: '10 mikro-influencer için kampanya brief ve içerik yönlendirmesi',        status: 'revision',    priority: 'high',   tags: ['Kampanya', 'Müşteri'], progress: 30, due: '2026-06-28', created: '2026-06-20' },
  { wsIdx: 0, portIdx: null, assigneeIdx: 2, title: 'Yeni müşteri teklif şablonu',       description: 'Standartlaştırılmış teklif ve sunum şablonu oluşturma',                  status: 'brief',       priority: 'low',    tags: [],                     progress: 0,  due: '2026-07-10', created: '2026-06-23' },
  { wsIdx: 0, portIdx: 1, assigneeIdx: 1, title: 'GreenEarth e-posta kampanyası',        description: 'Temmuz yeni ürün lansmanı için e-posta serisi tasarımı ve kopyası',      status: 'in-progress', priority: 'medium', tags: ['Kampanya'],           progress: 45, due: '2026-07-08', created: '2026-06-19' },

  // ── Geveze Video (wsIdx=1) ── global idx 10-17
  { wsIdx: 1, portIdx: 0, assigneeIdx: 3, title: 'TechStart tanıtım filmi kurgu',        description: '90 saniyelik kurumsal tanıtım filmi kurgu ve renk düzeltmesi',           status: 'in-progress', priority: 'urgent', tags: ['Video'],              progress: 60, due: '2026-07-01', created: '2026-06-10' },
  { wsIdx: 1, portIdx: 1, assigneeIdx: 3, title: 'GreenEarth ürün videosu montaj',       description: 'Organik ürün serileri için 5 adet kısa tanıtım videosu montajı',         status: 'review',      priority: 'high',   tags: ['Video', 'Müşteri'],   progress: 88, due: '2026-06-30', created: '2026-06-08' },
  { wsIdx: 1, portIdx: 3, assigneeIdx: 3, title: 'FashionCo lookbook çekimi planlama',   description: 'Yaz koleksiyonu lookbook çekimi için plan ve ekipman listesi',            status: 'brief',       priority: 'medium', tags: ['Video'],              progress: 0,  due: '2026-07-10', created: '2026-06-24' },
  { wsIdx: 1, portIdx: null, assigneeIdx: 5, title: 'Haziran Reels paketi',              description: '6 adet template Reels içeriği, genel kullanım için',                     status: 'in-progress', priority: 'medium', tags: ['Reels', 'Video'],     progress: 50, due: '2026-06-30', created: '2026-06-14' },
  { wsIdx: 1, portIdx: 0, assigneeIdx: 5, title: 'TechStart motion graphic',             description: 'Ürün özellikleri için 30 saniyelik motion graphic animasyon',             status: 'done',        priority: 'high',   tags: ['Video', 'Tasarım'],   progress: 100, due: '2026-06-20', created: '2026-06-03' },
  { wsIdx: 1, portIdx: 4, assigneeIdx: 3, title: 'UrbanKafe ambiyans çekimi',            description: 'Kafe iç mekan ve ürün ambiyans videoları çekimi ve montajı',             status: 'in-progress', priority: 'medium', tags: ['Video', 'Müşteri'],   progress: 35, due: '2026-07-05', created: '2026-06-17' },
  { wsIdx: 1, portIdx: null, assigneeIdx: 5, title: 'After Effects template hazırlık',   description: 'Ajans geneli kullanılacak AE başlık ve geçiş template paketi',            status: 'brief',       priority: 'low',    tags: ['Video'],              progress: 0,  due: '2026-07-20', created: '2026-06-25' },
  { wsIdx: 1, portIdx: 1, assigneeIdx: 5, title: 'GreenEarth 30sn reklam spotu',         description: 'Dijital platformlar için 30 saniyelik ürün reklam spotu',                 status: 'revision',    priority: 'high',   tags: ['Video', 'Reklam'],    progress: 25, due: '2026-07-03', created: '2026-06-13' },

  // ── Sosyal Medya (wsIdx=2) ── global idx 18-24
  { wsIdx: 2, portIdx: null, assigneeIdx: 4, title: 'Haziran içerik takvimi yönetimi',   description: 'Tüm müşteriler için Haziran içerik takvimi koordinasyonu ve takibi',     status: 'in-progress', priority: 'high',   tags: ['Onay', 'Kampanya'],   progress: 80, due: '2026-06-30', created: '2026-06-01' },
  { wsIdx: 2, portIdx: 0, assigneeIdx: 4, title: 'TechStart post serileri',               description: 'Haziran boyunca 16 adet teknik içerik postu yayınlama',                  status: 'done',        priority: 'high',   tags: ['Post', 'Müşteri'],    progress: 100, due: '2026-06-25', created: '2026-06-01' },
  { wsIdx: 2, portIdx: 1, assigneeIdx: 1, title: 'GreenEarth story içerikleri',           description: 'Haftalık organik yaşam story serisi içerik üretimi',                     status: 'in-progress', priority: 'medium', tags: ['Story', 'Müşteri'],   progress: 70, due: '2026-06-30', created: '2026-06-05' },
  { wsIdx: 2, portIdx: null, assigneeIdx: 4, title: 'Haziran performans raporu',           description: 'Tüm platformlar için engagement ve büyüme analizi',                      status: 'review',      priority: 'high',   tags: ['Rapor', 'Analiz'],    progress: 92, due: '2026-07-02', created: '2026-06-22' },
  { wsIdx: 2, portIdx: 3, assigneeIdx: 4, title: 'FashionCo kampanya yönetimi',            description: 'Yaz koleksiyonu lansman kampanyası anlık takip ve optimizasyon',         status: 'in-progress', priority: 'urgent', tags: ['Kampanya', 'Müşteri'], progress: 60, due: '2026-07-01', created: '2026-06-15' },
  { wsIdx: 2, portIdx: null, assigneeIdx: 4, title: 'Temmuz içerik planlama toplantısı', description: 'Tüm müşteriler için Temmuz ayı içerik brief ve takvim hazırlığı',        status: 'brief',       priority: 'medium', tags: ['Onay'],               progress: 0,  due: '2026-07-08', created: '2026-06-24' },
  { wsIdx: 2, portIdx: 4, assigneeIdx: 4, title: 'UrbanKafe engagement artışı',           description: 'Organik büyüme için etkileşim stratejisi ve yorum yönetimi',             status: 'revision',    priority: 'medium', tags: ['Analiz', 'Müşteri'],  progress: 20, due: '2026-07-05', created: '2026-06-21' },
];

// ─── Time Entries ─────────────────────────────────────────────────────────────
// Format: [daysAgo, startHour, durationMins, userIdx, wsIdx, taskLocalIdx, portfolioIdx|null]
// taskLocalIdx: local index within that workspace's tasks
// wsIdx: 0=Ajans(10 tasks,0-9), 1=Video(8 tasks,0-7), 2=SM(7 tasks,0-6)
const rawTimeEntryDefs: [number, number, number, number, number, number, number | null][] = [
  // ── Bugün (26 Haz, daysAgo=0) ──
  [0, 9,  90,  0, 0, 3,  3],  // Nihat  → FashionCo kampanya görselleri
  [0, 10, 60,  4, 2, 4,  3],  // Tuğçe  → FashionCo kampanya SM
  [0, 11, 120, 5, 1, 3, null], // Kazım  → Haziran Reels paketi
  [0, 14, 75,  3, 1, 0,  0],  // Metin  → TechStart tanıtım filmi
  [0, 15, 45,  1, 2, 2,  1],  // Selena → GreenEarth story içerikleri

  // ── 25 Haz (daysAgo=1) ──
  [1, 9,  120, 3, 1, 1,  1],  // Metin  → GreenEarth ürün videosu montaj
  [1, 10, 60,  0, 0, 0,  0],  // Nihat  → TechStart SM stratejisi
  [1, 13, 90,  5, 1, 5,  4],  // Kazım  → UrbanKafe ambiyans çekimi
  [1, 14, 45,  4, 2, 0, null], // Tuğçe  → Haziran içerik takvimi

  // ── 24 Haz (daysAgo=2) ──
  [2, 9,  90,  1, 0, 1,  1],  // Selena → GreenEarth fotoğraf brief
  [2, 10, 60,  2, 0, 5, null], // Efecan → Haziran müşteri raporu
  [2, 13, 75,  5, 1, 3, null], // Kazım  → Haziran Reels paketi
  [2, 14, 45,  0, 0, 3,  3],  // Nihat  → FashionCo görseller
  [2, 15, 60,  4, 2, 4,  3],  // Tuğçe  → FashionCo kampanya SM

  // ── 23 Haz (daysAgo=3) ──
  [3, 9,  105, 3, 1, 0,  0],  // Metin  → TechStart tanıtım filmi
  [3, 11, 60,  1, 2, 2,  1],  // Selena → GreenEarth story
  [3, 13, 90,  0, 0, 6,  0],  // Nihat  → TechStart Google Ads analizi
  [3, 15, 45,  2, 0, 8, null], // Efecan → Yeni müşteri teklif şablonu

  // ── 22 Haz (daysAgo=4) ──
  [4, 9,  120, 5, 1, 7,  1],  // Kazım  → GreenEarth reklam spotu
  [4, 11, 60,  4, 2, 3, null], // Tuğçe  → Haziran performans raporu
  [4, 13, 90,  0, 0, 3,  3],  // Nihat  → FashionCo görseller
  [4, 14, 75,  3, 1, 5,  4],  // Metin  → UrbanKafe ambiyans çekimi
  [4, 15, 45,  1, 0, 9,  1],  // Selena → GreenEarth e-posta kampanyası

  // ── 19 Haz (daysAgo=7) ──
  [7, 9,  90,  0, 0, 0,  0],  // Nihat  → TechStart SM stratejisi
  [7, 10, 120, 3, 1, 1,  1],  // Metin  → GreenEarth video montaj
  [7, 13, 60,  4, 2, 4,  3],  // Tuğçe  → FashionCo kampanya SM
  [7, 15, 90,  5, 1, 3, null], // Kazım  → Haziran Reels

  // ── 18 Haz (daysAgo=8) ──
  [8, 9,  60,  2, 0, 5, null], // Efecan → Haziran raporu
  [8, 10, 90,  1, 0, 3,  3],  // Selena → FashionCo görseller
  [8, 13, 120, 5, 1, 0,  0],  // Kazım  → TechStart tanıtım filmi
  [8, 15, 45,  4, 2, 2,  1],  // Tuğçe  → GreenEarth story
  [8, 15, 60,  0, 0, 9,  1],  // Nihat  → GreenEarth e-posta kampanyası

  // ── 17 Haz (daysAgo=9) ──
  [9, 9,  90,  3, 1, 5,  4],  // Metin  → UrbanKafe ambiyans çekimi
  [9, 11, 60,  0, 0, 6,  0],  // Nihat  → TechStart Google Ads
  [9, 13, 75,  4, 2, 0, null], // Tuğçe  → İçerik takvimi
  [9, 15, 90,  5, 1, 7,  1],  // Kazım  → GreenEarth reklam spotu

  // ── 16 Haz (daysAgo=10) ──
  [10, 9,  120, 1, 2, 2,  1], // Selena → GreenEarth story
  [10, 11, 60,  2, 0, 5, null],// Efecan → Rapor
  [10, 13, 90,  3, 1, 0,  0], // Metin  → TechStart tanıtım filmi
  [10, 15, 45,  0, 0, 3,  3], // Nihat  → FashionCo görseller

  // ── 15 Haz (daysAgo=11) ──
  [11, 9,  75,  5, 1, 3, null],// Kazım  → Haziran Reels
  [11, 10, 90,  4, 2, 4,  3], // Tuğçe  → FashionCo kampanya SM
  [11, 13, 60,  0, 0, 0,  0], // Nihat  → TechStart SM stratejisi
  [11, 14, 120, 3, 1, 1,  1], // Metin  → GreenEarth video montaj
  [11, 15, 45,  1, 0, 7,  3], // Selena → FashionCo influencer brief

  // ── 12 Haz (daysAgo=14) ──
  [14, 9,  90,  2, 0, 5, null],// Efecan → Rapor
  [14, 10, 60,  5, 1, 5,  4], // Kazım  → UrbanKafe çekim
  [14, 13, 90,  0, 0, 3,  3], // Nihat  → FashionCo görseller
  [14, 15, 60,  4, 2, 3, null],// Tuğçe  → Haziran performans raporu

  // ── 11 Haz (daysAgo=15) ──
  [15, 9,  120, 3, 1, 0,  0], // Metin  → TechStart tanıtım filmi
  [15, 11, 75,  1, 2, 2,  1], // Selena → GreenEarth story
  [15, 13, 60,  0, 0, 9,  1], // Nihat  → GreenEarth e-posta
  [15, 14, 90,  5, 1, 7,  1], // Kazım  → GreenEarth reklam spotu

  // ── 10 Haz (daysAgo=16) ──
  [16, 9,  60,  4, 2, 0, null],// Tuğçe  → İçerik takvimi
  [16, 10, 90,  2, 0, 6,  0], // Efecan → TechStart Google Ads
  [16, 13, 120, 3, 1, 1,  1], // Metin  → GreenEarth video montaj
  [16, 15, 45,  5, 1, 3, null],// Kazım  → Haziran Reels

  // ── 9 Haz (daysAgo=17) ──
  [17, 9,  75,  0, 0, 3,  3], // Nihat  → FashionCo görseller
  [17, 10, 90,  1, 0, 1,  1], // Selena → GreenEarth fotoğraf brief
  [17, 13, 60,  4, 2, 4,  3], // Tuğçe  → FashionCo SM kampanya
  [17, 14, 90,  5, 1, 5,  4], // Kazım  → UrbanKafe çekim

  // ── 8 Haz (daysAgo=18) ──
  [18, 9,  90,  2, 0, 5, null],// Efecan → Rapor
  [18, 10, 60,  3, 1, 0,  0], // Metin  → TechStart tanıtım filmi
  [18, 13, 75,  0, 0, 0,  0], // Nihat  → TechStart SM stratejisi
  [18, 15, 45,  1, 2, 2,  1], // Selena → GreenEarth story

  // ── 5 Haz (daysAgo=21) ──
  [21, 9,  120, 5, 1, 3, null],// Kazım  → Haziran Reels
  [21, 11, 60,  4, 2, 4,  3], // Tuğçe  → FashionCo SM
  [21, 13, 90,  3, 1, 5,  4], // Metin  → UrbanKafe çekim
  [21, 15, 60,  0, 0, 3,  3], // Nihat  → FashionCo görseller

  // ── 4 Haz (daysAgo=22) ──
  [22, 9,  90,  1, 0, 1,  1], // Selena → GreenEarth fotoğraf brief
  [22, 10, 60,  2, 0, 5, null],// Efecan → Rapor
  [22, 13, 120, 5, 1, 7,  1], // Kazım  → GreenEarth reklam spotu
  [22, 15, 45,  4, 2, 2,  1], // Tuğçe  → GreenEarth story

  // ── 3 Haz (daysAgo=23) ──
  [23, 9,  75,  3, 1, 1,  1], // Metin  → GreenEarth video montaj
  [23, 10, 90,  0, 0, 6,  0], // Nihat  → TechStart Google Ads
  [23, 13, 60,  4, 2, 0, null],// Tuğçe  → İçerik takvimi
  [23, 14, 90,  5, 1, 0,  0], // Kazım  → TechStart tanıtım filmi (ws=Video)

  // ── 2 Haz (daysAgo=24) ──
  [24, 9,  90,  0, 0, 3,  3], // Nihat  → FashionCo görseller
  [24, 10, 60,  1, 2, 2,  1], // Selena → GreenEarth story
  [24, 13, 75,  2, 0, 8, null],// Efecan → Teklif şablonu
  [24, 14, 90,  3, 1, 5,  4], // Metin  → UrbanKafe çekim

  // ── 1 Haz (daysAgo=25) ──
  [25, 9,  60,  5, 1, 3, null],// Kazım  → Haziran Reels
  [25, 10, 90,  4, 2, 4,  3], // Tuğçe  → FashionCo SM kampanya
  [25, 13, 75,  0, 0, 0,  0], // Nihat  → TechStart SM stratejisi
  [25, 15, 60,  1, 0, 9,  1], // Selena → GreenEarth e-posta kampanyası
  [25, 16, 45,  5, 1, 4,  0], // Kazım  → TechStart motion graphic
];

// ─── Main ─────────────────────────────────────────────────────────────────────
async function seed() {
  const uri = process.env['MONGODB_URI'] ?? 'mongodb://localhost:27017/geveze';
  console.log(`\n🌱  Connecting to MongoDB: ${uri}`);
  await mongoose.connect(uri);
  console.log('✅  Connected\n');

  const UserDb         = mongoose.model(UserModel.name, UserSchema);
  const TaskDb         = mongoose.model(TaskModel.name, TaskSchema);
  const PortfolioDb    = mongoose.model(PortfolioCompanyModel.name, PortfolioCompanySchema);
  const TagDb          = mongoose.model(TagModel.name, TagSchema);
  const ServiceTypeDb  = mongoose.model(ServiceTypeModel.name, ServiceTypeSchema);
  const SettingDb      = mongoose.model(SettingModel.name, SettingSchema);
  const WorkspaceDb    = mongoose.model(WorkspaceModel.name, WorkspaceSchema);
  const TimeEntryDb    = mongoose.model(TimeEntryModel.name, TimeEntrySchema);

  // ── 1. Users ──────────────────────────────────────────────────────────────
  console.log('👤  Seeding users...');
  const passwordHash = await bcrypt.hash('geveze123', 10);
  const userDocs: mongoose.Document[] = [];
  for (const u of seedUsers) {
    const doc = await UserDb.findOneAndUpdate(
      { email: u.email },
      { ...u, passwordHash },
      { upsert: true, new: true },
    );
    userDocs.push(doc!);
  }
  const userIds = userDocs.map(d => (d as { _id: mongoose.Types.ObjectId })._id.toString());
  console.log(`   ✓ ${userDocs.length} users  (şifre: geveze123)`);

  // ── 2. Workspaces ─────────────────────────────────────────────────────────
  console.log('🏠  Seeding workspaces...');
  const workspaceDocs: mongoose.Document[] = [];
  for (const w of seedWorkspaces) {
    const creatorId = userIds[w.creatorIdx];
    const members = userIds.map((uid, idx) => ({
      userId: uid,
      role: seedUsers[idx].role === 'admin' ? 'workspace_admin'
          : seedUsers[idx].role === 'manager' ? 'workspace_manager'
          : 'workspace_member',
      permissions: {},
      joinedAt: new Date('2026-01-01'),
      invitedBy: creatorId,
    }));
    const doc = await WorkspaceDb.findOneAndUpdate(
      { slug: w.slug },
      { name: w.name, slug: w.slug, color: w.color, icon: w.icon, description: w.description, createdBy: creatorId, members },
      { upsert: true, new: true },
    );
    workspaceDocs.push(doc!);
  }
  const workspaceIds = workspaceDocs.map(d => (d as { _id: mongoose.Types.ObjectId })._id.toString());
  console.log(`   ✓ ${workspaceDocs.length} workspaces`);

  // ── 3. Portfolio Companies ─────────────────────────────────────────────────
  console.log('🏢  Seeding portfolio companies...');
  await PortfolioDb.deleteMany({});
  const portfolioDocs: mongoose.Document[] = [];
  for (const p of seedPortfolio) {
    const doc = await PortfolioDb.create({
      ...p,
      workspaceId: workspaceIds[0], // all in Geveze Ajans
    });
    portfolioDocs.push(doc);
  }
  const portfolioIds = portfolioDocs.map(d => (d as { _id: mongoose.Types.ObjectId })._id.toString());
  console.log(`   ✓ ${portfolioDocs.length} portfolio companies`);

  // ── 4. Tasks ──────────────────────────────────────────────────────────────
  console.log('📋  Seeding tasks...');
  await TaskDb.deleteMany({});

  // Group tasks by workspace: [ajans(0-9), video(10-17), sm(18-24)]
  const taskDocs: mongoose.Document[] = [];
  for (const t of rawTasks) {
    const assignee = userDocs[t.assigneeIdx] as mongoose.Document & { _id: mongoose.Types.ObjectId };
    const portfolio = t.portIdx != null ? (portfolioDocs[t.portIdx] as mongoose.Document & { _id: mongoose.Types.ObjectId; name: string }) : null;

    const doc = await TaskDb.create({
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      workspaceId: workspaceIds[t.wsIdx],
      assigneeId: assignee._id.toString(),
      assigneeName: seedUsers[t.assigneeIdx].name,
      portfolioCompanyId: portfolio ? portfolio._id.toString() : undefined,
      portfolioCompanyName: portfolio ? seedPortfolio[t.portIdx!].name : undefined,
      dueDate: new Date(t.due),
      progress: t.progress,
      tags: t.tags,
      archived: false,
      customFields: {},
      activityLog: [],
      attachments: [],
      createdAt: new Date(t.created),
      updatedAt: new Date(t.created),
    });
    taskDocs.push(doc);
  }
  console.log(`   ✓ ${taskDocs.length} tasks`);

  // Helper: task global index → document
  // ajans tasks: rawTasks idx 0-9 (wsIdx=0)
  // video tasks: rawTasks idx 10-17 (wsIdx=1)
  // sm tasks:    rawTasks idx 18-24 (wsIdx=2)
  const wsTaskOffset = [0, 10, 18]; // start index in rawTasks/taskDocs for each workspace

  // ── 5. Time Entries ───────────────────────────────────────────────────────
  console.log('⏱️   Seeding time entries...');
  await TimeEntryDb.deleteMany({});

  const today = new Date('2026-06-26T23:59:59Z');
  const timeEntryData: object[] = [];

  for (const [daysAgo, startHour, durationMins, userIdx, wsIdx, taskLocalIdx, portIdx] of rawTimeEntryDefs) {
    const globalTaskIdx = wsTaskOffset[wsIdx] + taskLocalIdx;
    const taskDoc = taskDocs[globalTaskIdx] as mongoose.Document & { _id: mongoose.Types.ObjectId };
    const task = rawTasks[globalTaskIdx];

    const startedAt = new Date(today);
    startedAt.setDate(startedAt.getDate() - daysAgo);
    startedAt.setHours(startHour, 0, 0, 0);
    const stoppedAt = new Date(startedAt.getTime() + durationMins * 60_000);

    const portfolioId = portIdx != null
      ? (portfolioDocs[portIdx] as mongoose.Document & { _id: mongoose.Types.ObjectId })._id.toString()
      : undefined;

    timeEntryData.push({
      taskId: taskDoc._id.toString(),
      taskTitle: task.title,
      userId: userIds[userIdx],
      workspaceId: workspaceIds[wsIdx],
      portfolioCompanyId: portfolioId,
      startedAt,
      stoppedAt,
      minutes: durationMins,
      note: undefined,
    });
  }

  await TimeEntryDb.insertMany(timeEntryData);
  console.log(`   ✓ ${timeEntryData.length} time entries`);

  // ── 6. Tags ───────────────────────────────────────────────────────────────
  console.log('🏷️   Seeding tags...');
  await TagDb.deleteMany({});
  for (const t of seedTags) {
    await TagDb.create(t);
  }
  console.log(`   ✓ ${seedTags.length} tags`);

  // ── 7. Service Types ──────────────────────────────────────────────────────
  console.log('🔧  Seeding service types...');
  await ServiceTypeDb.deleteMany({});
  for (const name of seedServiceTypes) {
    await ServiceTypeDb.create({ name });
  }
  console.log(`   ✓ ${seedServiceTypes.length} service types`);

  // ── 8. Settings ───────────────────────────────────────────────────────────
  console.log('⚙️   Seeding settings...');
  for (const [key, value] of Object.entries(seedSettings)) {
    await SettingDb.findOneAndUpdate({ key }, { key, value }, { upsert: true });
  }
  console.log(`   ✓ ${Object.keys(seedSettings).length} settings`);

  await mongoose.disconnect();

  console.log(`
🎉  Seed tamamlandı!

   Kullanıcılar (şifre: geveze123):
   ┌─────────────────────────────────────────────────────┐
   │  kazim@geveze.com    → Admin   (Video Editör)       │
   │  efecan@geveze.com   → Admin   (Yönetici)           │
   │  tugce@geveze.com    → Manager (SM Yöneticisi)      │
   │  nihat@geveze.com    → Member  (Grafik Tasarımcı)   │
   │  selena@geveze.com   → Member  (Grafik Tasarımcı)   │
   │  metin@geveze.com    → Member  (Videographer)       │
   └─────────────────────────────────────────────────────┘
   Çalışma Alanları: Geveze Ajans · Geveze Video · Sosyal Medya
   Portföy: 5 şirket (4 aktif, 1 beklemede)
   Görevler: ${taskDocs.length} (3 workspace'e dağılmış)
   Süre kayıtları: ${timeEntryData.length} (son 26 gün)
`);
}

seed().catch(err => {
  console.error('❌  Seed başarısız:', err);
  process.exit(1);
});
