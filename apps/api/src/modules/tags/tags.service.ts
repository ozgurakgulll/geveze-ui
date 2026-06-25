import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TagModel, TagDocument } from './schemas/tag.schema';

export interface TagEntry {
  id: string;
  name: string;
}

@Injectable()
export class TagsService {
  constructor(
    @InjectModel(TagModel.name)
    private readonly tagModel: Model<TagDocument>,
  ) {}

  async findAll(): Promise<TagEntry[]> {
    const docs = await this.tagModel.find().sort({ name: 1 }).lean().exec();
    return docs.map(this.toEntry);
  }

  async create(name: string): Promise<TagEntry> {
    const doc = await this.tagModel.create({ name });
    return this.toEntry(doc.toJSON() as Record<string, unknown>);
  }

  async remove(id: string): Promise<void> {
    const result = await this.tagModel.findByIdAndDelete(id).exec();
    if (!result) throw new NotFoundException(`Tag ${id} bulunamadı`);
  }

  async upsert(name: string): Promise<void> {
    await this.tagModel.findOneAndUpdate({ name }, { name }, { upsert: true }).exec();
  }

  private toEntry(doc: Record<string, unknown>): TagEntry {
    const { _id, __v, name } = doc;
    return { id: String((_id as { toString(): string }).toString()), name: String(name) };
  }
}
