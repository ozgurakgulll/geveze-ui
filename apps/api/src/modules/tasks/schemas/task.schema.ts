import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import type { TaskStatus, Priority, ActivityLogItem, TaskAttachment } from '@geveze/shared';

export type TaskDocument = HydratedDocument<TaskModel>;

@Schema({ timestamps: true, collection: 'tasks' })
export class TaskModel {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({
    required: true,
    enum: ['brief', 'in-progress', 'review', 'revision', 'done'],
    default: 'brief',
  })
  status: TaskStatus;

  @Prop({
    required: true,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
  })
  priority: Priority;

  @Prop({ type: String })
  assigneeId?: string;

  @Prop({ trim: true })
  assigneeName?: string;

  @Prop({ type: String })
  portfolioCompanyId?: string;

  @Prop({ trim: true })
  portfolioCompanyName?: string;

  @Prop({ type: Date })
  dueDate?: Date;

  @Prop({ type: Number, default: 0, min: 0, max: 100 })
  progress: number;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ type: Object, default: {} })
  customFields: Record<string, string>;

  @Prop({ type: Boolean, default: false })
  archived: boolean;

  @Prop({
    type: [
      {
        id: { type: String, required: true },
        date: { type: String, required: true },
        author: { type: String, required: true },
        action: { type: String, required: true },
        note: { type: String, default: '' },
      },
    ],
    default: [],
  })
  activityLog: ActivityLogItem[];

  @Prop({
    type: [
      {
        id: { type: String, required: true },
        name: { type: String, required: true },
        type: { type: String, required: true },
        size: { type: Number, default: 0 },
        data: { type: String, required: true },
        uploadedAt: { type: String, required: true },
      },
    ],
    default: [],
  })
  attachments: TaskAttachment[];

  createdAt: Date;
  updatedAt: Date;
}

export const TaskSchema = SchemaFactory.createForClass(TaskModel);

TaskSchema.index({ status: 1 });
TaskSchema.index({ assigneeId: 1 });
TaskSchema.index({ archived: 1 });
TaskSchema.index({ dueDate: 1 });
TaskSchema.index({ portfolioCompanyId: 1 });

TaskSchema.set('toJSON', {
  virtuals: true,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transform: (_doc: any, ret: any) => {
    ret['id'] = ret['_id'];
    delete ret['_id'];
    delete ret['__v'];
    return ret;
  },
});
