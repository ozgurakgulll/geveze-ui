import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserModel, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import type { User } from '@geveze/shared';

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
    const doc = await this.userModel.create(dto);
    return this.toUser(doc.toJSON() as Record<string, unknown>);
  }

  async update(id: string, dto: Partial<CreateUserDto>): Promise<User> {
    const doc = await this.userModel
      .findByIdAndUpdate(id, dto, { new: true })
      .lean()
      .exec();
    if (!doc) throw new NotFoundException(`User ${id} bulunamadı`);
    return this.toUser(doc);
  }

  async remove(id: string): Promise<void> {
    const result = await this.userModel.findByIdAndDelete(id).exec();
    if (!result) throw new NotFoundException(`User ${id} bulunamadı`);
  }

  /** Seed için — varsa güncelle, yoksa oluştur */
  async upsert(dto: CreateUserDto & { _seedId?: string }): Promise<void> {
    await this.userModel
      .findOneAndUpdate({ email: dto.email }, dto, { upsert: true, new: true })
      .exec();
  }

  private toUser(doc: Record<string, unknown>): User {
    const { _id, __v, passwordHash, ...rest } = doc as Record<string, unknown>;
    return { id: String((_id as { toString(): string })?.toString() ?? rest['id']), ...rest } as unknown as User;
  }
}
