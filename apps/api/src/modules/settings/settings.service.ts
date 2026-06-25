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

  async getAll(): Promise<Record<string, unknown>> {
    const docs = await this.model.find().lean().exec();
    return Object.fromEntries(docs.map(d => [String(d['key']), d['value']]));
  }

  async get(key: string): Promise<unknown> {
    const doc = await this.model.findOne({ key }).lean().exec();
    return doc ? doc['value'] : null;
  }

  async set(key: string, value: unknown): Promise<void> {
    await this.model.findOneAndUpdate(
      { key },
      { key, value },
      { upsert: true, new: true },
    ).exec();
  }

  async setMany(entries: Record<string, unknown>): Promise<void> {
    const ops = Object.entries(entries).map(([key, value]) => ({
      updateOne: {
        filter: { key },
        update: { $set: { key, value } },
        upsert: true,
      },
    }));
    await this.model.bulkWrite(ops);
  }

  async remove(key: string): Promise<void> {
    await this.model.findOneAndDelete({ key }).exec();
  }
}
