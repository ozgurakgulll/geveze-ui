import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TagModel, TagDocument } from './schemas/tag.schema';

export interface TagEntry {
  id: string;
  name: string;
  color: string;
}

@Injectable()
export class TagsService {
  constructor(
    @InjectModel(TagModel.name)
    private readonly tagModel: Model<TagDocument>,
  ) {}

  async findAll(workspaceId?: string): Promise<TagEntry[]> {
    const query = workspaceId ? { workspaceId } : {};
    const docs = await this.tagModel.find(query).sort({ name: 1 }).lean().exec();
    return docs.map(this.toEntry);
  }

  async create(name: string, color = '#6161FF', workspaceId?: string): Promise<TagEntry> {
    const doc = await this.tagModel.create({ name, color, workspaceId });
    return this.toEntry(doc.toJSON() as Record<string, unknown>);
  }

  async update(id: string, name?: string, color?: string): Promise<TagEntry> {
    const updates: Record<string, string> = {};
    if (name) updates['name'] = name;
    if (color) updates['color'] = color;
    const doc = await this.tagModel
      .findByIdAndUpdate(id, updates, { new: true })
      .lean()
      .exec();
    if (!doc) throw new NotFoundException(`Tag ${id} bulunamadı`);
    return this.toEntry(doc);
  }

  async remove(id: string): Promise<void> {
    const result = await this.tagModel.findByIdAndDelete(id).exec();
    if (!result) throw new NotFoundException(`Tag ${id} bulunamadı`);
  }

  async upsert(name: string, color = '#6161FF'): Promise<void> {
    await this.tagModel.findOneAndUpdate({ name }, { name, color }, { upsert: true }).exec();
  }

  private toEntry(doc: Record<string, unknown>): TagEntry {
    const { _id, __v, name, color } = doc;
    return {
      id: String((_id as { toString(): string }).toString()),
      name: String(name),
      color: String(color ?? '#6161FF'),
    };
  }
}
