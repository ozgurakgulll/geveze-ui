import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { WorkspaceModel, WorkspaceDocument } from './schemas/workspace.schema';
import type {
  Workspace,
  WorkspaceMember,
  WorkspaceRole,
  UserPermissions,
  CreateWorkspaceDto,
  UpdateWorkspaceDto,
} from '@geveze/shared';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[çÇ]/g, 'c')
    .replace(/[şŞ]/g, 's')
    .replace(/[ğĞ]/g, 'g')
    .replace(/[üÜ]/g, 'u')
    .replace(/[öÖ]/g, 'o')
    .replace(/[ıİ]/g, 'i')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function toWorkspace(doc: Record<string, unknown>): Workspace {
  const id = String((doc['_id'] as object)?.toString?.() ?? doc['id']);
  return {
    id,
    name: String(doc['name']),
    slug: String(doc['slug']),
    description: doc['description'] ? String(doc['description']) : undefined,
    color: String(doc['color'] ?? '#6161FF'),
    icon: doc['icon'] ? String(doc['icon']) : undefined,
    createdBy: String(doc['createdBy']),
    createdAt: doc['createdAt'] instanceof Date
      ? doc['createdAt'].toISOString()
      : String(doc['createdAt']),
    updatedAt: doc['updatedAt'] instanceof Date
      ? doc['updatedAt'].toISOString()
      : String(doc['updatedAt']),
    members: Array.isArray(doc['members'])
      ? (doc['members'] as Record<string, unknown>[]).map(toMember)
      : [],
  };
}

function toMember(m: Record<string, unknown>): WorkspaceMember {
  return {
    userId: String(m['userId']),
    role: (m['role'] as WorkspaceRole) ?? 'workspace_member',
    permissions: (m['permissions'] as UserPermissions) ?? {},
    joinedAt: m['joinedAt'] instanceof Date
      ? m['joinedAt'].toISOString()
      : String(m['joinedAt'] ?? new Date().toISOString()),
    invitedBy: m['invitedBy'] ? String(m['invitedBy']) : undefined,
  };
}

@Injectable()
export class WorkspaceService {
  constructor(
    @InjectModel(WorkspaceModel.name)
    private readonly model: Model<WorkspaceDocument>,
  ) {}

  async create(dto: CreateWorkspaceDto, createdBy: string): Promise<Workspace> {
    const baseSlug = slugify(dto.name) || 'workspace';
    const slug = await this.uniqueSlug(baseSlug);

    const DEFAULT_PERMS = {
      canViewAnalytics: false,
      canViewArchive: true,
      canViewTrash: true,
      canManagePortfolio: false,
      canCreateTasks: true,
      canDeleteTasks: false,
      canEditOthersTasks: false,
    };

    const doc = await this.model.create({
      name: dto.name,
      slug,
      description: dto.description,
      color: dto.color ?? '#6161FF',
      icon: dto.icon,
      createdBy,
      members: [
        {
          userId: createdBy,
          role: 'workspace_admin',
          permissions: DEFAULT_PERMS,
          joinedAt: new Date(),
        },
      ],
    });

    return toWorkspace(doc.toObject() as unknown as Record<string, unknown>);
  }

  async findByUser(userId: string): Promise<Workspace[]> {
    const docs = await this.model
      .find({ 'members.userId': userId, deletedAt: null })
      .lean()
      .exec();
    return (docs as Record<string, unknown>[]).map(toWorkspace);
  }

  async findById(id: string): Promise<Workspace> {
    const doc = await this.model.findOne({ _id: id, deletedAt: null }).lean().exec();
    if (!doc) throw new NotFoundException('Workspace bulunamadı');
    return toWorkspace(doc as Record<string, unknown>);
  }

  async findBySlug(slug: string): Promise<Workspace> {
    const doc = await this.model.findOne({ slug, deletedAt: null }).lean().exec();
    if (!doc) throw new NotFoundException('Workspace bulunamadı');
    return toWorkspace(doc as Record<string, unknown>);
  }

  async update(id: string, dto: UpdateWorkspaceDto): Promise<Workspace> {
    const update: Record<string, unknown> = {};
    if (dto.name !== undefined) {
      update['name'] = dto.name;
      update['slug'] = await this.uniqueSlug(slugify(dto.name), id);
    }
    if (dto.description !== undefined) update['description'] = dto.description;
    if (dto.color !== undefined) update['color'] = dto.color;
    if (dto.icon !== undefined) update['icon'] = dto.icon;

    const doc = await this.model
      .findByIdAndUpdate(id, { $set: update }, { new: true })
      .lean()
      .exec();
    if (!doc) throw new NotFoundException('Workspace bulunamadı');
    return toWorkspace(doc as Record<string, unknown>);
  }

  async remove(id: string): Promise<void> {
    const doc = await this.model.findByIdAndUpdate(
      id,
      { deletedAt: new Date() },
      { new: true },
    ).exec();
    if (!doc) throw new NotFoundException('Workspace bulunamadı');
  }

  // ── Üye yönetimi ────────────────────────────────────────────────────────────

  async addMember(
    workspaceId: string,
    userId: string,
    role: WorkspaceRole = 'workspace_member',
    invitedBy?: string,
  ): Promise<WorkspaceMember> {
    const ws = await this.model.findOne({ _id: workspaceId, deletedAt: null }).exec();
    if (!ws) throw new NotFoundException('Workspace bulunamadı');

    const existing = (ws.members as unknown as { userId: string }[])
      .find(m => m.userId === userId);
    if (existing) throw new ConflictException('Kullanıcı zaten bu workspace üyesi');

    const newMember = { userId, role, joinedAt: new Date(), invitedBy };
    await this.model.findByIdAndUpdate(
      workspaceId,
      { $push: { members: newMember } },
    ).exec();

    return toMember(newMember as Record<string, unknown>);
  }

  async updateMemberRole(
    workspaceId: string,
    userId: string,
    role: WorkspaceRole,
  ): Promise<WorkspaceMember> {
    const result = await this.model.findOneAndUpdate(
      { _id: workspaceId, 'members.userId': userId, deletedAt: null },
      { $set: { 'members.$.role': role } },
      { new: true },
    ).lean().exec();
    if (!result) throw new NotFoundException('Üye bulunamadı');

    const raw = result as unknown as Record<string, unknown[]>;
    const member = raw['members'].find(
      (m) => (m as Record<string, unknown>)['userId'] === userId,
    );
    return toMember(member as Record<string, unknown>);
  }

  async updateMemberPermissions(
    workspaceId: string,
    userId: string,
    permissions: Partial<UserPermissions>,
    requesterRole: WorkspaceRole,
  ): Promise<WorkspaceMember> {
    if (requesterRole === 'workspace_viewer' || requesterRole === 'workspace_member') {
      throw new ForbiddenException('İzin güncellemek için yönetici yetkisi gerekli');
    }

    const result = await this.model.findOneAndUpdate(
      { _id: workspaceId, 'members.userId': userId, deletedAt: null },
      { $set: { 'members.$.permissions': permissions } },
      { new: true },
    ).lean().exec();
    if (!result) throw new NotFoundException('Üye bulunamadı');

    const raw2 = result as unknown as Record<string, unknown[]>;
    const member = raw2['members'].find(
      (m) => (m as Record<string, unknown>)['userId'] === userId,
    );
    return toMember(member as Record<string, unknown>);
  }

  async removeMember(workspaceId: string, userId: string): Promise<void> {
    const result = await this.model.findOneAndUpdate(
      { _id: workspaceId, deletedAt: null },
      { $pull: { members: { userId } } },
    ).exec();
    if (!result) throw new NotFoundException('Workspace bulunamadı');
  }

  async getMember(workspaceId: string, userId: string): Promise<WorkspaceMember | null> {
    const doc = await this.model
      .findOne({ _id: workspaceId, 'members.userId': userId, deletedAt: null })
      .lean()
      .exec();
    if (!doc) return null;
    const rawDoc = doc as unknown as Record<string, unknown[]>;
    const member = rawDoc['members'].find(
      (m) => (m as Record<string, unknown>)['userId'] === userId,
    );
    return member ? toMember(member as Record<string, unknown>) : null;
  }

  // ── Yardımcılar ─────────────────────────────────────────────────────────────

  private async uniqueSlug(base: string, excludeId?: string): Promise<string> {
    let candidate = base;
    let counter = 2;
    while (true) {
      const query: Record<string, unknown> = { slug: candidate };
      if (excludeId) query['_id'] = { $ne: excludeId };
      const exists = await this.model.exists(query);
      if (!exists) return candidate;
      candidate = `${base}-${counter++}`;
    }
  }
}
