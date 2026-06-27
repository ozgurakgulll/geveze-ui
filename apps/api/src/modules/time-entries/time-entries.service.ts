import { Injectable, ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TimeEntryModel, TimeEntryDocument } from './schemas/time-entry.schema';
import type { TimeEntry, TimeEntryStats } from '@geveze/shared';

function toEntry(doc: Record<string, unknown>): TimeEntry {
  const { _id, __v, ...rest } = doc;
  return {
    id: String((_id as { toString(): string })?.toString()),
    taskId: String(rest['taskId']),
    taskTitle: rest['taskTitle'] ? String(rest['taskTitle']) : undefined,
    userId: String(rest['userId']),
    workspaceId: String(rest['workspaceId'] ?? ''),
    portfolioCompanyId: rest['portfolioCompanyId'] ? String(rest['portfolioCompanyId']) : undefined,
    startedAt: (rest['startedAt'] instanceof Date ? rest['startedAt'] : new Date(rest['startedAt'] as string)).toISOString(),
    stoppedAt: rest['stoppedAt']
      ? (rest['stoppedAt'] instanceof Date ? rest['stoppedAt'] : new Date(rest['stoppedAt'] as string)).toISOString()
      : undefined,
    minutes: rest['minutes'] != null ? Number(rest['minutes']) : undefined,
    note: rest['note'] ? String(rest['note']) : undefined,
    createdAt: (rest['createdAt'] instanceof Date ? rest['createdAt'] : new Date(rest['createdAt'] as string)).toISOString(),
  };
}

@Injectable()
export class TimeEntriesService {
  constructor(
    @InjectModel(TimeEntryModel.name)
    private readonly model: Model<TimeEntryDocument>,
  ) {}

  // ── Aktif timer ─────────────────────────────────────────────────────────────

  async getActive(userId: string): Promise<TimeEntry | null> {
    const doc = await this.model
      .findOne({ userId, stoppedAt: null })
      .lean()
      .exec();
    return doc ? toEntry(doc as Record<string, unknown>) : null;
  }

  async start(
    userId: string,
    taskId: string,
    taskTitle: string,
    workspaceId?: string,
    portfolioCompanyId?: string,
  ): Promise<TimeEntry> {
    const existing = await this.getActive(userId);
    if (existing) {
      throw new ConflictException('Zaten aktif bir zamanlayıcı var. Önce durdurun.');
    }
    const doc = await this.model.create({
      taskId,
      taskTitle,
      userId,
      workspaceId,
      portfolioCompanyId,
      startedAt: new Date(),
    });
    return toEntry(doc.toObject() as unknown as Record<string, unknown>);
  }

  async stop(userId: string, note?: string): Promise<TimeEntry> {
    const active = await this.model.findOne({ userId, stoppedAt: null }).exec();
    if (!active) throw new NotFoundException('Aktif zamanlayıcı bulunamadı');

    const now = new Date();
    const minutes = Math.round((now.getTime() - active.startedAt.getTime()) / 60_000);
    active.stoppedAt = now;
    active.minutes = minutes > 0 ? minutes : 1;
    if (note) active.note = note;
    const saved = await active.save();
    return toEntry(saved.toObject() as unknown as Record<string, unknown>);
  }

  // ── Manuel kayıt ────────────────────────────────────────────────────────────

  async createManual(
    userId: string,
    taskId: string,
    taskTitle: string,
    minutes: number,
    date: string,
    note?: string,
    workspaceId?: string,
    portfolioCompanyId?: string,
  ): Promise<TimeEntry> {
    const startedAt = new Date(date);
    const stoppedAt = new Date(startedAt.getTime() + minutes * 60_000);
    const doc = await this.model.create({
      taskId, taskTitle, userId, workspaceId, portfolioCompanyId,
      startedAt, stoppedAt, minutes, note,
    });
    return toEntry(doc.toObject() as unknown as Record<string, unknown>);
  }

  // ── Listeleme ────────────────────────────────────────────────────────────────

  async findByTask(taskId: string): Promise<TimeEntry[]> {
    const docs = await this.model
      .find({ taskId, stoppedAt: { $ne: null } })
      .sort({ startedAt: -1 })
      .lean()
      .exec();
    return (docs as Record<string, unknown>[]).map(toEntry);
  }

  async findByUser(
    userId: string,
    from?: string,
    to?: string,
    workspaceId?: string,
  ): Promise<TimeEntry[]> {
    const query: Record<string, unknown> = { userId, stoppedAt: { $ne: null } };
    if (workspaceId) query['workspaceId'] = workspaceId;
    if (from || to) {
      const range: Record<string, Date> = {};
      if (from) range['$gte'] = new Date(from);
      if (to) range['$lte'] = new Date(to);
      query['startedAt'] = range;
    }
    const docs = await this.model.find(query).sort({ startedAt: -1 }).lean().exec();
    return (docs as Record<string, unknown>[]).map(toEntry);
  }

  async remove(id: string, userId: string, isAdmin: boolean): Promise<void> {
    const entry = await this.model.findById(id).exec();
    if (!entry) throw new NotFoundException('Kayıt bulunamadı');
    if (!isAdmin && entry.userId !== userId) throw new ForbiddenException('Başkasının kaydını silemezsiniz');
    await entry.deleteOne();
  }

  // ── İstatistikler ────────────────────────────────────────────────────────────

  async stats(filter: {
    workspaceId?: string;
    userId?: string;
    portfolioCompanyId?: string;
    from?: string;
    to?: string;
  }): Promise<TimeEntryStats> {
    const match: Record<string, unknown> = { stoppedAt: { $ne: null }, minutes: { $gt: 0 } };
    if (filter.workspaceId) match['workspaceId'] = filter.workspaceId;
    if (filter.userId) match['userId'] = filter.userId;
    if (filter.portfolioCompanyId) match['portfolioCompanyId'] = filter.portfolioCompanyId;
    if (filter.from || filter.to) {
      const range: Record<string, Date> = {};
      if (filter.from) range['$gte'] = new Date(filter.from);
      if (filter.to) range['$lte'] = new Date(filter.to);
      match['startedAt'] = range;
    }

    const [totalResult, byUser, byTask, byPortfolio, byDay] = await Promise.all([
      this.model.aggregate([{ $match: match }, { $group: { _id: null, total: { $sum: '$minutes' } } }]),
      this.model.aggregate([
        { $match: match },
        { $group: { _id: '$userId', minutes: { $sum: '$minutes' } } },
        { $sort: { minutes: -1 } },
        { $addFields: { userIdObj: { $toObjectId: '$_id' } } },
        { $lookup: { from: 'users', localField: 'userIdObj', foreignField: '_id', as: 'userDoc' } },
        { $addFields: { userName: { $ifNull: [{ $arrayElemAt: ['$userDoc.name', 0] }, '$_id'] } } },
        { $project: { userDoc: 0, userIdObj: 0 } },
      ]),
      this.model.aggregate([
        { $match: match },
        { $group: { _id: { taskId: '$taskId', taskTitle: '$taskTitle' }, minutes: { $sum: '$minutes' } } },
        { $sort: { minutes: -1 } },
        { $limit: 20 },
      ]),
      this.model.aggregate([
        { $match: { ...match, portfolioCompanyId: { $exists: true, $ne: null } } },
        { $group: { _id: '$portfolioCompanyId', minutes: { $sum: '$minutes' } } },
        { $sort: { minutes: -1 } },
        { $addFields: { companyIdObj: { $toObjectId: '$_id' } } },
        { $lookup: { from: 'portfolio_companies', localField: 'companyIdObj', foreignField: '_id', as: 'companyDoc' } },
        { $addFields: { companyName: { $ifNull: [{ $arrayElemAt: ['$companyDoc.name', 0] }, '$_id'] } } },
        { $project: { companyDoc: 0, companyIdObj: 0 } },
      ]),
      this.model.aggregate([
        { $match: match },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$startedAt' } },
            minutes: { $sum: '$minutes' },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    return {
      totalMinutes: totalResult[0]?.total ?? 0,
      byUser: (byUser as { _id: string; userName: string; minutes: number }[]).map(r => ({
        userId: r._id,
        userName: r.userName,
        minutes: r.minutes,
      })),
      byTask: (byTask as { _id: { taskId: string; taskTitle?: string }; minutes: number }[]).map(r => ({
        taskId: r._id.taskId,
        taskTitle: r._id.taskTitle ?? r._id.taskId,
        minutes: r.minutes,
      })),
      byPortfolio: (byPortfolio as { _id: string; companyName: string; minutes: number }[]).map(r => ({
        portfolioCompanyId: r._id,
        portfolioCompanyName: r.companyName,
        minutes: r.minutes,
      })),
      byDay: (byDay as { _id: string; minutes: number }[]).map(r => ({
        date: r._id,
        minutes: r.minutes,
      })),
    };
  }
}
