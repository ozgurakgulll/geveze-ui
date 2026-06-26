import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SettingModel, SettingDocument } from './schemas/setting.schema';

@Injectable()
export class SettingsService {
  constructor(
    @InjectModel(SettingModel.name)
    private readonly model: Model<SettingDocument>,
  ) {}

  async getAll(workspaceId?: string): Promise<Record<string, unknown>> {
    const query = workspaceId ? { workspaceId } : { workspaceId: { $exists: false } };
    const docs = await this.model.find(query).lean().exec();
    return Object.fromEntries(docs.map(d => [String(d['key']), d['value']]));
  }

  async get(key: string, workspaceId?: string): Promise<unknown> {
    const query = workspaceId ? { key, workspaceId } : { key, workspaceId: { $exists: false } };
    const doc = await this.model.findOne(query).lean().exec();
    return doc ? doc['value'] : null;
  }

  async set(key: string, value: unknown, workspaceId?: string): Promise<void> {
    const filter = workspaceId ? { key, workspaceId } : { key, workspaceId: { $exists: false } };
    await this.model.findOneAndUpdate(
      filter,
      { key, value, ...(workspaceId && { workspaceId }) },
      { upsert: true, new: true },
    ).exec();
  }

  async setMany(entries: Record<string, unknown>, workspaceId?: string): Promise<void> {
    const ops = Object.entries(entries).map(([key, value]) => ({
      updateOne: {
        filter: workspaceId
          ? { key, workspaceId }
          : { key, workspaceId: { $exists: false } },
        update: { $set: { key, value, ...(workspaceId && { workspaceId }) } },
        upsert: true,
      },
    }));
    await this.model.bulkWrite(ops);
  }

  async remove(key: string, workspaceId?: string): Promise<void> {
    const query = workspaceId ? { key, workspaceId } : { key, workspaceId: { $exists: false } };
    await this.model.findOneAndDelete(query).exec();
  }
}
