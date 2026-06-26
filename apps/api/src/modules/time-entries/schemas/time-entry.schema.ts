import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TimeEntryDocument = TimeEntryModel & Document;

@Schema({ timestamps: true, collection: 'time_entries' })
export class TimeEntryModel {
  @Prop({ required: true, index: true })
  taskId: string;

  @Prop()
  taskTitle?: string;

  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ index: true })
  workspaceId?: string;

  @Prop({ index: true })
  portfolioCompanyId?: string;

  @Prop({ required: true, type: Date })
  startedAt: Date;

  @Prop({ type: Date })
  stoppedAt?: Date;

  /** Dakika cinsinden süre — stoppedAt set edilince hesaplanır */
  @Prop({ type: Number })
  minutes?: number;

  @Prop({ trim: true })
  note?: string;

  createdAt: Date;
  updatedAt: Date;
}

export const TimeEntrySchema = SchemaFactory.createForClass(TimeEntryModel);

TimeEntrySchema.index({ userId: 1, startedAt: -1 });
TimeEntrySchema.index({ taskId: 1, startedAt: -1 });
TimeEntrySchema.index({ workspaceId: 1, startedAt: -1 });
TimeEntrySchema.index({ portfolioCompanyId: 1, startedAt: -1 });
// Kullanıcı başına sadece bir aktif (stoppedAt yok) timer olabilir
TimeEntrySchema.index({ userId: 1, stoppedAt: 1 }, { sparse: true });
