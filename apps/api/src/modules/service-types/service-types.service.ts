import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ServiceTypeModel, ServiceTypeDocument } from './schemas/service-type.schema';

export interface ServiceTypeEntry {
  id: string;
  name: string;
}

@Injectable()
export class ServiceTypesService {
  constructor(
    @InjectModel(ServiceTypeModel.name)
    private readonly model: Model<ServiceTypeDocument>,
  ) {}

  async findAll(workspaceId?: string): Promise<ServiceTypeEntry[]> {
    const query = workspaceId ? { workspaceId } : {};
    const docs = await this.model.find(query).sort({ name: 1 }).lean().exec();
    return docs.map(this.toEntry);
  }

  async create(name: string, workspaceId?: string): Promise<ServiceTypeEntry> {
    const doc = await this.model.create({ name, workspaceId });
    return this.toEntry(doc.toJSON() as Record<string, unknown>);
  }

  async update(id: string, name: string): Promise<ServiceTypeEntry> {
    const doc = await this.model
      .findByIdAndUpdate(id, { name }, { new: true })
      .lean()
      .exec();
    if (!doc) throw new NotFoundException(`ServiceType ${id} bulunamadı`);
    return this.toEntry(doc);
  }

  async remove(id: string): Promise<void> {
    const result = await this.model.findByIdAndDelete(id).exec();
    if (!result) throw new NotFoundException(`ServiceType ${id} bulunamadı`);
  }

  async upsert(name: string): Promise<void> {
    await this.model.findOneAndUpdate({ name }, { name }, { upsert: true }).exec();
  }

  private toEntry(doc: Record<string, unknown>): ServiceTypeEntry {
    const { _id, name } = doc;
    return { id: String((_id as { toString(): string }).toString()), name: String(name) };
  }
}
