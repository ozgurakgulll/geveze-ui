/**
 * Faz 2 Migration — Mevcut verilere workspaceId ekle
 *
 * Kullanım:
 *   node apps/api/scripts/migrate-workspace.js
 *
 * Bu script:
 * 1. "default" slug'ına sahip workspace'i bulur (veya yoksa oluşturur)
 * 2. Tüm kullanıcıları workspace members listesine ekler
 * 3. tasks, portfolio_companies, tags, service_types, settings
 *    koleksiyonlarındaki workspaceId eksik olan kayıtları günceller
 */

const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/geveze';

async function main() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  console.log('MongoDB bağlantısı kuruldu:', MONGODB_URI);

  const db = client.db();

  // ── 1. Default workspace'i bul veya oluştur ─────────────────────────────────
  let workspace = await db.collection('workspaces').findOne({ slug: 'default' });

  if (!workspace) {
    // companyName'i settings'ten al
    const companyNameSetting = await db.collection('settings').findOne({ key: 'companyName' });
    const name = companyNameSetting?.value ?? 'Geveze';

    // İlk admin kullanıcıyı bul
    const adminUser = await db.collection('users').findOne({ role: 'admin' });
    const createdBy = adminUser?._id?.toString() ?? 'system';

    const result = await db.collection('workspaces').insertOne({
      name,
      slug: 'default',
      description: 'Varsayılan çalışma alanı',
      color: '#6161FF',
      createdBy,
      deletedAt: null,
      members: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    workspace = await db.collection('workspaces').findOne({ _id: result.insertedId });
    console.log('✅ Default workspace oluşturuldu:', workspace._id.toString());
  } else {
    console.log('✅ Default workspace mevcut:', workspace._id.toString());
  }

  const workspaceId = workspace._id.toString();

  // ── 2. Tüm kullanıcıları workspace'e ekle ────────────────────────────────────
  const users = await db.collection('users').find().toArray();
  const existingMemberIds = (workspace.members ?? []).map(m => m.userId);

  const newMembers = users
    .filter(u => !existingMemberIds.includes(u._id.toString()))
    .map(u => ({
      userId: u._id.toString(),
      role: u.role === 'admin' ? 'workspace_admin'
          : u.role === 'manager' ? 'workspace_manager'
          : 'workspace_member',
      permissions: u.permissions ?? {
        canViewAnalytics: false,
        canViewArchive: true,
        canViewTrash: true,
        canManagePortfolio: false,
        canCreateTasks: true,
        canDeleteTasks: false,
        canEditOthersTasks: false,
      },
      joinedAt: u.createdAt ?? new Date(),
    }));

  if (newMembers.length > 0) {
    await db.collection('workspaces').updateOne(
      { _id: workspace._id },
      { $push: { members: { $each: newMembers } } },
    );
    console.log(`✅ ${newMembers.length} kullanıcı workspace'e eklendi`);
  } else {
    console.log('ℹ️  Tüm kullanıcılar zaten workspace üyesi');
  }

  // ── 3. Kaynaklara workspaceId ekle ───────────────────────────────────────────
  const collections = ['tasks', 'portfolio_companies', 'tags', 'service_types'];

  for (const col of collections) {
    const result = await db.collection(col).updateMany(
      { workspaceId: { $exists: false } },
      { $set: { workspaceId } },
    );
    console.log(`✅ ${col}: ${result.modifiedCount} kayıt güncellendi`);
  }

  // Settings: workspaceId'si olmayan global key'leri işaretle
  const settingsResult = await db.collection('settings').updateMany(
    { workspaceId: { $exists: false } },
    { $set: { workspaceId } },
  );
  console.log(`✅ settings: ${settingsResult.modifiedCount} kayıt güncellendi`);

  await client.close();
  console.log('\n🎉 Migration tamamlandı!');
  console.log(`   workspaceId: ${workspaceId}`);
}

main().catch(err => {
  console.error('❌ Migration hatası:', err);
  process.exit(1);
});
