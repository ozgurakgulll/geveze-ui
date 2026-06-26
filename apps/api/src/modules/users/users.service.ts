import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { UserModel, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import type { User, UserPermissions } from '@geveze/shared';
import { DEFAULT_MEMBER_PERMISSIONS } from '@geveze/shared';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(UserModel.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async findAll(): Promise<User[]> {
    const docs = await this.userModel.find().lean().exec();
    return docs.map(this.toUser);
  }

  async findById(id: string): Promise<User> {
    const doc = await this.userModel.findById(id).lean().exec();
    if (!doc) throw new NotFoundException(`User ${id} bulunamadı`);
    return this.toUser(doc);
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.toLowerCase() }).select('+passwordHash').exec();
  }

  async create(dto: CreateUserDto): Promise<User> {
    const { password, ...rest } = dto;
    const data: Record<string, unknown> = {
      ...rest,
      permissions: DEFAULT_MEMBER_PERMISSIONS,
    };
    if (password) {
      data['passwordHash'] = await bcrypt.hash(password, 10);
    }
    const doc = await this.userModel.create(data);
    return this.toUser(doc.toJSON() as Record<string, unknown>);
  }

  async update(id: string, dto: Partial<CreateUserDto>): Promise<User> {
    const { password: _pw, ...rest } = dto as CreateUserDto;
    const doc = await this.userModel
      .findByIdAndUpdate(id, rest, { new: true })
      .lean()
      .exec();
    if (!doc) throw new NotFoundException(`User ${id} bulunamadı`);
    return this.toUser(doc);
  }

  async remove(id: string): Promise<void> {
    const result = await this.userModel.findByIdAndDelete(id).exec();
    if (!result) throw new NotFoundException(`User ${id} bulunamadı`);
  }

  async updatePermissions(
    requester: User,
    targetId: string,
    permissions: UserPermissions,
  ): Promise<User> {
    const target = await this.findById(targetId);
    if (requester.role === 'manager' && target.role !== 'member') {
      throw new ForbiddenException('Yöneticiler sadece üyelerin izinlerini düzenleyebilir');
    }
    const doc = await this.userModel
      .findByIdAndUpdate(targetId, { permissions }, { new: true })
      .lean()
      .exec();
    if (!doc) throw new NotFoundException(`User ${targetId} bulunamadı`);
    return this.toUser(doc);
  }

  async resetPassword(id: string, newPassword: string): Promise<void> {
    const hash = await bcrypt.hash(newPassword, 10);
    const result = await this.userModel
      .findByIdAndUpdate(id, { passwordHash: hash })
      .exec();
    if (!result) throw new NotFoundException(`User ${id} bulunamadı`);
  }

  async updateRole(id: string, role: string): Promise<User> {
    const doc = await this.userModel
      .findByIdAndUpdate(id, { role }, { new: true })
      .lean()
      .exec();
    if (!doc) throw new NotFoundException(`User ${id} bulunamadı`);
    return this.toUser(doc);
  }

  /** Seed için — varsa güncelle, yoksa oluştur */
  async upsert(dto: CreateUserDto & { _seedId?: string }): Promise<void> {
    const { password, ...rest } = dto;
    const data: Record<string, unknown> = { ...rest };
    if (password) {
      data['passwordHash'] = await bcrypt.hash(password, 10);
    }
    await this.userModel
      .findOneAndUpdate({ email: dto.email }, data, { upsert: true, new: true })
      .exec();
  }

  private toUser(doc: Record<string, unknown>): User {
    const { _id, __v, passwordHash, ...rest } = doc as Record<string, unknown>;
    return { id: String((_id as { toString(): string })?.toString() ?? rest['id']), ...rest } as unknown as User;
  }
}
