/**
 * İstatistik Tutarlılık Validasyon Scripti
 * Test verisi (initialTasks) ile tüm istatistik hesaplamalarının tutarlılığını doğrular.
 *
 * Çalıştırma: npx tsx scripts/validate-stats.ts
 * Rapor: docs/STATS-VALIDATION-REPORT.md
 */

import { initialTasks, users } from '../src/data/mockData';
import { portfolioCompanies } from '../src/data/portfolioData';
import type { Task } from '../src/types';

// Bugün = 1 Mart 2025 (test verisiyle uyumlu)
const TODAY = new Date('2025-03-01T12:00:00Z');

const inconsistencies: string[] = [];
const warnings: string[] = [];

const companyAssigneeIds = new Map<string, Set<string>>();
portfolioCompanies.forEach((c) => {
  companyAssigneeIds.set(c.id, new Set(c.assignedTeamMemberIds || []));
});

// ----- 1. Temel Sayım Doğrulama -----
function validateBasicCounts() {
  const total = initialTasks.length;
  const byStatus = { brief: 0, 'in-progress': 0, review: 0, revision: 0, done: 0 };
  const byPriority = { low: 0, medium: 0, high: 0, urgent: 0 };

  initialTasks.forEach((t) => {
    byStatus[t.status]++;
    byPriority[t.priority]++;
  });

  const statusSum = Object.values(byStatus).reduce((a, b) => a + b, 0);
  if (statusSum !== total) {
    inconsistencies.push(`Durum toplamı (${statusSum}) ≠ toplam görev (${total})`);
  }

  const prioritySum = Object.values(byPriority).reduce((a, b) => a + b, 0);
  if (prioritySum !== total) {
    inconsistencies.push(`Öncelik toplamı (${prioritySum}) ≠ toplam görev (${total})`);
  }

  return { total, byStatus, byPriority };
}

// ----- 2. Geciken Görev Mantığı -----
function validateOverdue() {
  const overdue = initialTasks.filter(
    (t) => t.dueDate && TODAY > t.dueDate && t.status !== 'done'
  );
  const expected = initialTasks.filter(
    (t) => t.dueDate && new Date(t.dueDate) < TODAY && t.status !== 'done'
  );
  if (overdue.length !== expected.length) {
    inconsistencies.push(`Geciken sayısı tutarsız: hesaplanan=${overdue.length}, beklenen=${expected.length}`);
  }
  // Beklenen geciken: task-12 (due 2025-02-20)
  const task12 = initialTasks.find((t) => t.id === 'task-12');
  if (task12 && (!task12.dueDate || new Date(task12.dueDate) >= TODAY)) {
    inconsistencies.push('task-12 gecikmiş olmalı (due 20 Şubat)');
  }
  return overdue;
}

// ----- 3. PersonView completionTrend (Son 3 ay) -----
function validateCompletionTrend() {
  const months: { name: string; completed: number; assigned: number }[] = [];
  for (let i = 2; i >= 0; i--) {
    const ms = new Date(TODAY.getFullYear(), TODAY.getMonth() - i, 1);
    const me = new Date(TODAY.getFullYear(), TODAY.getMonth() - i + 1, 0, 23, 59, 59);
    const completed = initialTasks.filter(
      (t) => t.status === 'done' && t.updatedAt >= ms && t.updatedAt <= me
    ).length;
    const assigned = initialTasks.filter(
      (t) => t.createdAt >= ms && t.createdAt <= me
    ).length;
    months.push({
      name: `${ms.getMonth() + 1}/${ms.getFullYear()}`,
      completed,
      assigned,
    });
  }
  return months;
}

// ----- 4. PersonView onTimeRate -----
function validateOnTimeRate(tasks: Task[]) {
  const done = tasks.filter((t) => t.status === 'done');
  const onTimeDone = tasks.filter(
    (t) => t.status === 'done' && t.dueDate && t.updatedAt <= t.dueDate
  ).length;
  const lateDone = done.filter(
    (t) => t.dueDate && t.updatedAt > t.dueDate
  );
  return { done: done.length, onTimeDone, lateDone: lateDone.length };
}

// ----- 5. Şirket–Atama Tutarlılığı (portfolioData assignedTeamMemberIds ile) -----
function validateCompanyAssigneeAlignment() {
  initialTasks.forEach((t) => {
    if (!t.portfolioCompanyId || !t.assignee) return;
    const allowedIds = companyAssigneeIds.get(t.portfolioCompanyId);
    if (allowedIds && !allowedIds.has(t.assignee.id)) {
      warnings.push(
        `${t.id} (${t.title}): Atanan=${t.assignee.name} (id ${t.assignee.id}), şirkette atanmıyor (${[...allowedIds].join(',')})`
      );
    }
  });
}

// ----- 6. Tarih Mantığı (createdAt <= updatedAt, vb.) -----
function validateDateLogic() {
  initialTasks.forEach((t) => {
    if (t.createdAt > t.updatedAt) {
      inconsistencies.push(`${t.id}: createdAt (${t.createdAt}) > updatedAt (${t.updatedAt})`);
    }
    if (t.status === 'done' && t.progress !== 100) {
      warnings.push(`${t.id}: status=done ama progress=${t.progress} (100 olmalı)`);
    }
  });
}

// ----- 8. Haftalık Aktivite (AnalyticsView) Tarih Aralıkları -----
function validateWeeklyActivityRanges() {
  const weeks: { start: Date; end: Date; created: number; updated: number }[] = [];
  for (let i = 3; i >= 0; i--) {
    const weekStart = new Date(TODAY.getTime() - (i + 1) * 7 * 86400000);
    const weekEnd = new Date(TODAY.getTime() - i * 7 * 86400000);
    const created = initialTasks.filter(
      (t) => t.createdAt >= weekStart && t.createdAt < weekEnd
    ).length;
    const updated = initialTasks.filter(
      (t) => t.updatedAt >= weekStart && t.updatedAt < weekEnd
    ).length;
    weeks.push({ start: weekStart, end: weekEnd, created, updated });
  }
  return weeks;
}

// ----- 9. Ekip Üyesi Dağılımı -----
function validateTeamDistribution() {
  const byUser: Record<string, number> = {};
  users.forEach((u) => { byUser[u.id] = 0; });
  initialTasks.forEach((t) => {
    if (t.assignee) byUser[t.assignee.id] = (byUser[t.assignee.id] ?? 0) + 1;
  });
  const noTasks = users.filter((u) => !byUser[u.id] || byUser[u.id] === 0);
  if (noTasks.length > 0) {
    warnings.push(`Görevi olmayan ekip üyeleri: ${noTasks.map((u) => u.name).join(', ')}`);
  }
  return byUser;
}

// ----- 10. portfolioCompanyId Geçerliliği -----
function validatePortfolioCompanyIds() {
  const validIds = new Set(portfolioCompanies.map((c) => c.id));
  initialTasks.forEach((t) => {
    if (t.portfolioCompanyId && !validIds.has(t.portfolioCompanyId)) {
      inconsistencies.push(`${t.id}: Geçersiz portfolioCompanyId '${t.portfolioCompanyId}'`);
    }
  });
}

// ----- Çalıştır -----
console.log('=== İstatistik Tutarlılık Validasyonu ===\n');
console.log('Tarih varsayımı: 1 Mart 2025\n');

const basic = validateBasicCounts();
console.log('1. Temel sayımlar:', basic);

const overdue = validateOverdue();
console.log('2. Geciken görevler:', overdue.length, overdue.map((t) => t.title));

const trend = validateCompletionTrend();
console.log('3. Aylık trend (completed/assigned):', trend);

validateDateLogic();
validatePortfolioCompanyIds();
validateCompanyAssigneeAlignment();
validateTeamDistribution();
const weeks = validateWeeklyActivityRanges();
console.log('4. Haftalık aktivite (created/updated):', weeks);

// Kişi bazlı onTimeRate
users.forEach((u) => {
  const userTasks = initialTasks.filter((t) => t.assignee?.id === u.id);
  const ot = validateOnTimeRate(userTasks);
  if (ot.done > 0) {
    console.log(`5. ${u.name} zamanında teslim: ${ot.onTimeDone}/${ot.done} (${ot.lateDone} gecikmeli)`);
  }
});

console.log('\n--- TUTARSIZLIKLAR ---');
if (inconsistencies.length === 0) {
  console.log('Kritik tutarsızlık yok.');
} else {
  inconsistencies.forEach((m) => console.log('❌', m));
}

console.log('\n--- UYARILAR ---');
if (warnings.length === 0) {
  console.log('Uyarı yok.');
} else {
  warnings.forEach((m) => console.log('⚠️', m));
}

process.exit(inconsistencies.length > 0 ? 1 : 0);
