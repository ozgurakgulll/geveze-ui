import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PortfolioCompanyModel, PortfolioCompanyDocument } from './schemas/portfolio-company.schema';
import { CreatePortfolioCompanyDto, UpdatePortfolioCompanyDto } from './dto/create-portfolio-company.dto';
import type { PortfolioCompany, ActivityLogItem } from '@geveze/shared';

@Injectable()
export class PortfolioService {
  constructor(
    @InjectModel(PortfolioCompanyModel.name)
    private readonly model: Model<PortfolioCompanyDocument>,
  ) {}

  async findAll(): Promise<PortfolioCompany[]> {
    const docs = await this.model.find().sort({ name: 1 }).lean().exec();
    return docs.map(this.toCompany);
  }

  async findById(id: string): Promise<PortfolioCompany> {
    const doc = await this.model.findById(id).lean().exec();
    if (!doc) throw new NotFoundException(`Portfolio company ${id} bulunamadı`);
    return this.toCompany(doc);
  }

  async create(dto: CreatePortfolioCompanyDto): Promise<PortfolioCompany> {
    const doc = await this.model.create({
      ...dto,
      notes: dto.notes ?? [],
      assignedTeamMemberIds: dto.assignedTeamMemberIds ?? [],
      socialMediaAccounts: dto.socialMediaAccounts ?? [],
      contacts: dto.contacts ?? [],
      monthlyContentCalendar: dto.monthlyContentCalendar ?? [],
      brandIdentity: dto.brandIdentity ?? {
        logos: [],
        colorPalette: ['#111827', '#E5E7EB'],
        fonts: ['Inter'],
        brandTone: 'Corporate',
      },
      activityLog: [this.makeLog('Portfolio created', `${dto.name} portföy kaydı oluşturuldu.`)],
    });
    return this.toCompany(doc.toJSON() as Record<string, unknown>);
  }

  async update(id: string, dto: UpdatePortfolioCompanyDto): Promise<PortfolioCompany> {
    const existing = await this.model.findById(id).exec();
    if (!existing) throw new NotFoundException(`Portfolio company ${id} bulunamadı`);

    Object.assign(existing, dto);
    existing.activityLog = [
      ...(existing.activityLog ?? []),
      this.makeLog('Portfolio updated', `${dto.name ?? existing.name} portföy kaydı güncellendi.`),
    ] as ActivityLogItem[];

    const saved = await existing.save();
    return this.toCompany(saved.toJSON() as Record<string, unknown>);
  }

  async remove(id: string): Promise<void> {
    const result = await this.model.findByIdAndDelete(id).exec();
    if (!result) throw new NotFoundException(`Portfolio company ${id} bulunamadı`);
  }

  async upsert(data: Partial<PortfolioCompany>): Promise<void> {
    await this.model
      .findOneAndUpdate({ name: data.name }, data, { upsert: true, new: true })
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

  private toCompany(doc: Record<string, unknown>): PortfolioCompany {
    const { _id, __v, ...rest } = doc;
    const id = String((_id as { toString(): string })?.toString() ?? rest['id']);
    return { id, ...rest } as unknown as PortfolioCompany;
  }
}
