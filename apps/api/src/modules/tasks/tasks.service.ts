import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery } from 'mongoose';
import { TaskModel, TaskDocument } from './schemas/task.schema';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import type { Task, ActivityLogItem } from '@geveze/shared';

export interface TaskFilters {
  archived?: boolean;
  assigneeId?: string;
  status?: string;
}

@Injectable()
export class TasksService {
  constructor(
    @InjectModel(TaskModel.name)
    private readonly taskModel: Model<TaskDocument>,
  ) {}

  async findAll(filters: TaskFilters = {}): Promise<Task[]> {
    const query: FilterQuery<TaskDocument> = { deletedAt: null };

    if (filters.archived !== undefined) {
      query['archived'] = filters.archived;
    } else {
      query['archived'] = { $ne: true };
    }

    if (filters.assigneeId) query['assigneeId'] = filters.assigneeId;
    if (filters.status) query['status'] = filters.status;

    const docs = await this.taskModel.find(query).sort({ createdAt: -1 }).lean().exec();
    return docs.map(this.toTask);
  }

  async findAllArchived(): Promise<Task[]> {
    const docs = await this.taskModel.find({ archived: true, deletedAt: null }).sort({ updatedAt: -1 }).lean().exec();
    return docs.map(this.toTask);
  }

  async findDeleted(): Promise<Task[]> {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const docs = await this.taskModel
      .find({ deletedAt: { $ne: null, $gte: cutoff } })
      .sort({ deletedAt: -1 })
      .lean()
      .exec();
    return docs.map(this.toTask);
  }

  async restoreDeleted(id: string): Promise<Task> {
    const doc = await this.taskModel
      .findByIdAndUpdate(
        id,
        { deletedAt: null, archived: false, $push: { activityLog: this.makeLog('Görev geri alındı', 'Son silinenlerden geri yüklendi') } },
        { new: true },
      )
      .lean()
      .exec();
    if (!doc) throw new NotFoundException(`Task ${id} bulunamadı`);
    return this.toTask(doc);
  }

  async permanentDelete(id: string): Promise<void> {
    const result = await this.taskModel.findByIdAndDelete(id).exec();
    if (!result) throw new NotFoundException(`Task ${id} bulunamadı`);
  }

  async cleanupExpiredDeleted(): Promise<number> {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const result = await this.taskModel.deleteMany({ deletedAt: { $lt: cutoff } }).exec();
    return result.deletedCount ?? 0;
  }

  async findById(id: string): Promise<Task> {
    const doc = await this.taskModel.findById(id).lean().exec();
    if (!doc) throw new NotFoundException(`Task ${id} bulunamadı`);
    return this.toTask(doc);
  }

  async create(dto: CreateTaskDto): Promise<Task> {
    const now = new Date().toISOString();
    const doc = await this.taskModel.create({
      ...dto,
      tags: dto.tags ?? [],
      customFields: dto.customFields ?? {},
      progress: 0,
      archived: false,
      activityLog: [
        this.makeLog('Görev oluşturuldu', `"${dto.title}" oluşturuldu.`),
      ],
    });
    void now;
    return this.toTask(doc.toJSON() as Record<string, unknown>);
  }

  async update(id: string, dto: UpdateTaskDto): Promise<Task> {
    const existing = await this.taskModel.findById(id).exec();
    if (!existing) throw new NotFoundException(`Task ${id} bulunamadı`);

    const { activityLog: newLogs, ...rest } = dto;

    Object.assign(existing, rest);

    if (newLogs?.length) {
      existing.activityLog = [
        ...(existing.activityLog ?? []),
        ...newLogs,
      ] as ActivityLogItem[];
    }

    const saved = await existing.save();
    return this.toTask(saved.toJSON() as Record<string, unknown>);
  }

  async remove(id: string): Promise<void> {
    const doc = await this.taskModel.findByIdAndUpdate(
      id,
      { deletedAt: new Date(), $push: { activityLog: this.makeLog('Görev silindi', 'Son silinenler klasörüne taşındı (30 gün)') } },
    ).exec();
    if (!doc) throw new NotFoundException(`Task ${id} bulunamadı`);
  }

  async setArchived(id: string, archived: boolean): Promise<Task> {
    const action = archived ? 'Görev arşivlendi' : 'Arşivden çıkarıldı';
    const note   = archived ? 'Ana listeden gizlendi' : 'Ana listelere geri alındı';

    const doc = await this.taskModel
      .findByIdAndUpdate(
        id,
        { archived, $push: { activityLog: this.makeLog(action, note) } },
        { new: true },
      )
      .lean()
      .exec();

    if (!doc) throw new NotFoundException(`Task ${id} bulunamadı`);
    return this.toTask(doc);
  }

  async bulkDelete(ids: string[]): Promise<void> {
    await this.taskModel.updateMany(
      { _id: { $in: ids } },
      { deletedAt: new Date(), $push: { activityLog: this.makeLog('Görev silindi', 'Son silinenler klasörüne taşındı (toplu, 30 gün)') } },
    ).exec();
  }

  async bulkReassign(ids: string[], assigneeId: string, assigneeName?: string): Promise<void> {
    await this.taskModel
      .updateMany(
        { _id: { $in: ids } },
        {
          assigneeId,
          ...(assigneeName ? { assigneeName } : {}),
          $push: {
            activityLog: this.makeLog(
              'Atanan kişi değiştirildi',
              `${assigneeName ?? assigneeId} kişisine devredildi (toplu)`,
            ),
          },
        },
      )
      .exec();
  }

  async bulkArchive(ids: string[]): Promise<void> {
    await this.taskModel
      .updateMany(
        { _id: { $in: ids } },
        {
          archived: true,
          $push: {
            activityLog: this.makeLog('Görev arşivlendi', 'Ana listeden gizlendi (toplu)'),
          },
        },
      )
      .exec();
  }

  async addAttachment(taskId: string, attachment: {
    id: string; name: string; type: string; size: number; data: string; uploadedAt: string;
  }): Promise<Task> {
    const doc = await this.taskModel
      .findByIdAndUpdate(
        taskId,
        {
          $push: {
            attachments: attachment,
            activityLog: this.makeLog('Belge eklendi', attachment.name),
          },
        },
        { new: true },
      )
      .lean()
      .exec();
    if (!doc) throw new NotFoundException(`Task ${taskId} bulunamadı`);
    return this.toTask(doc);
  }

  async removeAttachment(taskId: string, attachmentId: string): Promise<Task> {
    const doc = await this.taskModel
      .findByIdAndUpdate(
        taskId,
        { $pull: { attachments: { id: attachmentId } } },
        { new: true },
      )
      .lean()
      .exec();
    if (!doc) throw new NotFoundException(`Task ${taskId} bulunamadı`);
    return this.toTask(doc);
  }

  /** Seed için — varsa güncelle, yoksa oluştur */
  async upsert(data: Partial<Task>): Promise<void> {
    await this.taskModel
      .findOneAndUpdate(
        { title: data.title },
        data,
        { upsert: true, new: true },
      )
      .exec();
  }

  private makeLog(action: string, note: string): ActivityLogItem {
    return {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      date: new Date().toISOString(),
      author: 'System',
      action,
      note,
    };
  }

  private toTask(doc: Record<string, unknown>): Task {
    const { _id, __v, ...rest } = doc;
    const id = String((_id as { toString(): string })?.toString() ?? rest['id']);
    const task = { id, ...rest } as unknown as Task;
    // ISO string tarihleri Date nesnesine çevir
    if (typeof task.createdAt === 'string') task.createdAt = new Date(task.createdAt);
    if (typeof task.updatedAt === 'string') task.updatedAt = new Date(task.updatedAt);
    if (typeof task.dueDate === 'string') task.dueDate = new Date(task.dueDate);
    return task;
  }
}
