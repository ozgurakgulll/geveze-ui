import 'reflect-metadata';
import * as mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// ───────── Schema definitions (inline, no DI needed) ─────────
import { UserSchema, UserModel } from '../modules/users/schemas/user.schema';
import { TaskSchema, TaskModel } from '../modules/tasks/schemas/task.schema';
import { PortfolioCompanySchema, PortfolioCompanyModel } from '../modules/portfolio/schemas/portfolio-company.schema';
import { TagSchema, TagModel } from '../modules/tags/schemas/tag.schema';
import { ServiceTypeSchema, ServiceTypeModel } from '../modules/service-types/schemas/service-type.schema';
import { SettingSchema, SettingModel } from '../modules/settings/schemas/setting.schema';

// ───────── Seed data ─────────
const seedUsers = [
  { name: 'Nihat Birgül',       email: 'nihat@geveze.com',  initials: 'NB', color: '#FF6B6B', title: 'Grafik Tasarımcı',       passwordHash: 'seed-hash' },
  { name: 'Selena Serfiçeli',   email: 'selena@geveze.com', initials: 'SS', color: '#4ECDC4', title: 'Grafik Tasarımcı',       passwordHash: 'seed-hash' },
  { name: 'Efecan Dural',       email: 'efecan@geveze.com', initials: 'ED', color: '#45B7D1', title: 'Yönetici',               passwordHash: 'seed-hash' },
  { name: 'Metin Onur',         email: 'metin@geveze.com',  initials: 'MO', color: '#96CEB4', title: 'Videographer',           passwordHash: 'seed-hash' },
  { name: 'Tuğçe Altıparmak',   email: 'tugce@geveze.com',  initials: 'TA', color: '#F59E0B', title: 'Sosyal Medya Yöneticisi',passwordHash: 'seed-hash' },
  { name: 'Kazım Gün',          email: 'kazim@geveze.com',  initials: 'KG', color: '#A78BFA', title: 'Video Editör',           passwordHash: 'seed-hash' },
];

const seedTags = [
  'Analiz', 'Rapor', 'Tasarım', 'UI/UX', 'Backend', 'API', 'Pazarlama',
  'Sosyal Medya', 'Mobile', 'iOS', 'Android', 'Email', 'İçerik', 'Planlama',
  'SEO', 'Video', 'Podcast', 'Fotoğraf', 'Sunum', 'Strateji', 'Kampanya',
  'Marka', 'Copy', 'YouTube', 'LinkedIn', 'TikTok', 'Pinterest', 'Webinar',
  'Influencer', 'Onboarding', 'Reklam', 'UX', 'Rakip', 'Müşteri', 'Logo',
  'Broşür', 'Newsletter', 'Onay',
];

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

const seedSettings: Record<string, unknown> = {
  companyName: 'Geveze Ajans',
  defaultCurrency: 'TRY',
  workingDays: ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'],
};

// Tasks — user indices will be replaced with actual MongoDB IDs after seeding users
const rawTasks = [
  { title: 'Müşteri analizi raporu',      description: 'Q4 müşteri davranış analizi ve raporlaması', status: 'done',        priority: 'high',   assigneeIdx: 0, tags: ['Analiz', 'Rapor'],           progress: 100, dueDate: '2024-01-15', createdAt: '2024-01-01', updatedAt: '2024-01-15' },
  { title: 'Web sitesi tasarımı',          description: 'Yeni landing page tasarımı ve onay süreci',  status: 'in-progress', priority: 'urgent', assigneeIdx: 1, tags: ['Tasarım', 'UI/UX'],          progress: 65,  dueDate: '2024-01-20', createdAt: '2024-01-05', updatedAt: '2024-01-18' },
  { title: 'API entegrasyonu',             description: 'Ödeme sistemi API entegrasyonu ve testleri', status: 'review',      priority: 'high',   assigneeIdx: 2, tags: ['Backend', 'API'],            progress: 90,  dueDate: '2024-01-22', createdAt: '2024-01-08', updatedAt: '2024-01-19' },
  { title: 'Sosyal medya kampanyası',      description: 'Yılbaşı özel kampanya içerikleri',           status: 'brief',       priority: 'medium', assigneeIdx: 3, tags: ['Pazarlama', 'Sosyal Medya'], progress: 0,   dueDate: '2024-01-25', createdAt: '2024-01-10', updatedAt: '2024-01-10' },
  { title: 'Veritabanı optimizasyonu',     description: 'Performans iyileştirmeleri ve indeksleme',   status: 'brief',       priority: 'low',    assigneeIdx: 2, tags: ['Backend'],                   progress: 0,   dueDate: '2024-02-01', createdAt: '2024-01-12', updatedAt: '2024-01-12' },
  { title: 'Kullanıcı araştırması',        description: 'Anket hazırlama ve sonuç analizi',           status: 'in-progress', priority: 'medium', assigneeIdx: 4, tags: ['Analiz', 'UX'],             progress: 40,  dueDate: '2024-01-28', createdAt: '2024-01-14', updatedAt: '2024-01-17' },
  { title: 'Mobil uygulama güncellemesi',  description: 'iOS ve Android için yeni özellikler',        status: 'revision',    priority: 'high',   assigneeIdx: 2, tags: ['Mobile', 'iOS', 'Android'],  progress: 15,  dueDate: '2024-01-30', createdAt: '2024-01-15', updatedAt: '2024-01-16' },
  { title: 'E-posta şablonları',           description: 'Transactional email tasarımları',            status: 'done',        priority: 'low',    assigneeIdx: 1, tags: ['Tasarım', 'Email'],          progress: 100, dueDate: '2024-01-18', createdAt: '2024-01-08', updatedAt: '2024-01-18' },
  { title: 'Q1 İçerik takvimi hazırlığı', description: 'Şubat ayı için sosyal medya içerik planı',  status: 'brief',       priority: 'medium', assigneeIdx: 0, tags: ['İçerik', 'Planlama'],        progress: 0,   dueDate: '2026-02-10', createdAt: '2026-02-06', updatedAt: '2026-02-06' },
  { title: 'Logo revizyonu - Müşteri A',   description: 'Müşteri geri bildirimi doğrultusunda logo güncellemesi', status: 'in-progress', priority: 'high', assigneeIdx: 1, tags: ['Tasarım', 'Logo'], progress: 55, dueDate: '2026-02-12', createdAt: '2026-02-07', updatedAt: '2026-02-09' },
  { title: 'Reels konsept tasarımı',       description: 'İlk çeyrek için Instagram Reels konseptleri', status: 'brief',     priority: 'medium', assigneeIdx: 5, tags: ['Video', 'Sosyal Medya'],     progress: 0,   dueDate: '2026-02-11', createdAt: '2026-02-08', updatedAt: '2026-02-08' },
  { title: 'Blog yazısı SEO optimizasyonu',description: 'Mevcut blog yazılarının anahtar kelime analizi', status: 'in-progress', priority: 'low', assigneeIdx: 4, tags: ['İçerik', 'SEO'],         progress: 40,  dueDate: '2026-02-14', createdAt: '2026-02-09', updatedAt: '2026-02-10' },
  { title: 'Aylık rapor sunumu',           description: 'Ocak ayı performans raporu ve sunum hazırlığı', status: 'review',  priority: 'high',   assigneeIdx: 3, tags: ['Rapor', 'Sunum'],           progress: 90,  dueDate: '2026-02-13', createdAt: '2026-02-10', updatedAt: '2026-02-12' },
  { title: 'Kampanya görselleri revizyonu',description: 'Yeni yıl kampanyası görsellerinde revizyonlar', status: 'revision', priority: 'urgent', assigneeIdx: 2, tags: ['Tasarım', 'Kampanya'],     progress: 20,  dueDate: '2026-02-15', createdAt: '2026-02-11', updatedAt: '2026-02-11' },
  { title: 'Q2 içerik stratejisi',         description: 'Nisan-Haziran içerik planı taslağı',         status: 'brief',       priority: 'high',   assigneeIdx: 3, tags: ['Strateji', 'İçerik'],       progress: 0,   dueDate: '2026-03-25', createdAt: '2026-03-16', updatedAt: '2026-03-16' },
  { title: 'Google Ads performans raporu', description: 'Mart ayı reklam kampanyası özeti',            status: 'in-progress', priority: 'urgent', assigneeIdx: 2, tags: ['Rapor', 'Reklam'],         progress: 55,  dueDate: '2026-04-02', createdAt: '2026-03-19', updatedAt: '2026-03-22' },
  { title: 'Landing page UX incelemesi',   description: 'Dönüşüm oranı iyileştirme önerileri',        status: 'review',      priority: 'medium', assigneeIdx: 0, tags: ['UX', 'Analiz'],             progress: 88,  dueDate: '2026-04-05', createdAt: '2026-03-22', updatedAt: '2026-03-28' },
  { title: 'Nisan ayı takvim onayı',       description: 'İçerik takvimi son kontroller ve yayına alma', status: 'done',      priority: 'high',   assigneeIdx: 3, tags: ['Planlama', 'Onay'],         progress: 100, dueDate: '2026-04-06', createdAt: '2026-03-25', updatedAt: '2026-04-06' },
];

const seedPortfolio = [
  {
    name: 'TechStart AŞ',
    industry: 'Teknoloji',
    status: 'active' as const,
    website: 'https://techstart.example.com',
    servicesTaken: ['Sosyal Medya Yönetimi', 'Grafik Tasarım'],
    description: 'Erken aşama teknoloji girişimi',
    notes: ['İlk ay onboarding tamamlandı', 'Logo revizyonu bekleniyor'],
    assignedTeamMemberIds: [],
    monthlyQuotas: { video: 2, post: 10, story: 16 },
    brandIdentity: { logos: [], colorPalette: ['#1D4ED8', '#E2E8F0'], fonts: ['Inter'], brandTone: 'Professional' },
    contacts: [],
    socialMediaAccounts: [],
    monthlyContentCalendar: [],
    activityLog: [],
  },
  {
    name: 'GreenEarth Organics',
    industry: 'Gıda & Tarım',
    status: 'active' as const,
    servicesTaken: ['Sosyal Medya Yönetimi', 'Video Prodüksiyon', 'Grafik Tasarım'],
    description: 'Organik ürün markası',
    notes: ['İçerik takvimi onaylandı'],
    assignedTeamMemberIds: [],
    monthlyQuotas: { video: 4, post: 12, story: 20 },
    brandIdentity: { logos: [], colorPalette: ['#166534', '#22C55E'], fonts: ['Poppins'], brandTone: 'Friendly' },
    contacts: [],
    socialMediaAccounts: [],
    monthlyContentCalendar: [],
    activityLog: [],
  },
  {
    name: 'MediCare Klinik',
    industry: 'Sağlık',
    status: 'inactive' as const,
    servicesTaken: ['Web Tasarım'],
    description: 'Özel sağlık kliniği',
    notes: [],
    assignedTeamMemberIds: [],
    monthlyQuotas: { video: 0, post: 4, story: 8 },
    brandIdentity: { logos: [], colorPalette: ['#0F766E', '#CCFBF1'], fonts: ['Roboto'], brandTone: 'Professional' },
    contacts: [],
    socialMediaAccounts: [],
    monthlyContentCalendar: [],
    activityLog: [],
  },
];

// ───────── Main ─────────
async function seed() {
  const uri = process.env['MONGODB_URI'] ?? 'mongodb://localhost:27017/geveze';
  console.log(`\n🌱  Connecting to MongoDB: ${uri}`);

  await mongoose.connect(uri);
  console.log('✅  Connected\n');

  const UserModelDb = mongoose.model(UserModel.name, UserSchema);
  const TaskModelDb = mongoose.model(TaskModel.name, TaskSchema);
  const PortfolioModelDb = mongoose.model(PortfolioCompanyModel.name, PortfolioCompanySchema);
  const TagModelDb = mongoose.model(TagModel.name, TagSchema);
  const ServiceTypeModelDb = mongoose.model(ServiceTypeModel.name, ServiceTypeSchema);
  const SettingModelDb = mongoose.model(SettingModel.name, SettingSchema);

  // ── Users ──
  console.log('👤  Seeding users...');
  const upsertedUsers: mongoose.Document[] = [];
  for (const u of seedUsers) {
    const doc = await UserModelDb.findOneAndUpdate(
      { email: u.email },
      u,
      { upsert: true, new: true },
    );
    upsertedUsers.push(doc!);
  }
  console.log(`   ✓ ${upsertedUsers.length} users`);

  // ── Tasks ──
  console.log('📋  Seeding tasks...');
  let taskCount = 0;
  for (const t of rawTasks) {
    const user = upsertedUsers[t.assigneeIdx];
    const uid = (user as mongoose.Document & { _id: mongoose.Types.ObjectId })._id.toString();
    const userName = seedUsers[t.assigneeIdx].name;

    await TaskModelDb.findOneAndUpdate(
      { title: t.title },
      {
        title: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority,
        assigneeId: uid,
        assigneeName: userName,
        tags: t.tags,
        progress: t.progress,
        archived: false,
        dueDate: new Date(t.dueDate),
        activityLog: [],
        attachments: [],
        customFields: {},
        createdAt: new Date(t.createdAt),
        updatedAt: new Date(t.updatedAt),
      },
      { upsert: true, new: true },
    );
    taskCount++;
  }
  console.log(`   ✓ ${taskCount} tasks`);

  // ── Portfolio ──
  console.log('🏢  Seeding portfolio companies...');
  let portCount = 0;
  for (const p of seedPortfolio) {
    await PortfolioModelDb.findOneAndUpdate(
      { name: p.name },
      p,
      { upsert: true, new: true },
    );
    portCount++;
  }
  console.log(`   ✓ ${portCount} portfolio companies`);

  // ── Tags ──
  console.log('🏷️   Seeding tags...');
  for (const name of seedTags) {
    await TagModelDb.findOneAndUpdate({ name }, { name }, { upsert: true });
  }
  console.log(`   ✓ ${seedTags.length} tags`);

  // ── Service types ──
  console.log('🔧  Seeding service types...');
  for (const name of seedServiceTypes) {
    await ServiceTypeModelDb.findOneAndUpdate({ name }, { name }, { upsert: true });
  }
  console.log(`   ✓ ${seedServiceTypes.length} service types`);

  // ── Settings ──
  console.log('⚙️   Seeding settings...');
  for (const [key, value] of Object.entries(seedSettings)) {
    await SettingModelDb.findOneAndUpdate({ key }, { key, value }, { upsert: true });
  }
  console.log(`   ✓ ${Object.keys(seedSettings).length} settings`);

  await mongoose.disconnect();
  console.log('\n🎉  Seed complete!\n');
}

seed().catch(err => {
  console.error('❌  Seed failed:', err);
  process.exit(1);
});
