import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type WorkspaceDocument = WorkspaceModel & Document;

const DEFAULT_PERMISSIONS = {
  canViewAnalytics: false,
  canViewArchive: true,
  canViewTrash: true,
  canManagePortfolio: false,
  canCreateTasks: true,
  canDeleteTasks: false,
  canEditOthersTasks: false,
};

@Schema({ _id: false })
class WorkspaceMemberSchema {
  @Prop({ required: true })
  userId: string;

  @Prop({
    required: true,
    enum: ['workspace_admin', 'workspace_manager', 'workspace_member', 'workspace_viewer'],
    default: 'workspace_member',
  })
  role: string;

  @Prop({ type: Object, default: () => ({ ...DEFAULT_PERMISSIONS }) })
  permissions: Record<string, boolean>;

  @Prop({ type: Date, default: () => new Date() })
  joinedAt: Date;

  @Prop({ type: String })
  invitedBy?: string;
}

const WorkspaceMemberSchemaObj = SchemaFactory.createForClass(WorkspaceMemberSchema);

@Schema({ timestamps: true, collection: 'workspaces' })
export class WorkspaceModel {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  slug: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ required: true, default: '#6161FF' })
  color: string;

  @Prop({ type: String })
  icon?: string;

  @Prop({ required: true })
  createdBy: string;

  @Prop({ type: Date, default: null })
  deletedAt?: Date | null;

  @Prop({ type: [WorkspaceMemberSchemaObj], default: [] })
  members: WorkspaceMemberSchema[];

  createdAt: Date;
  updatedAt: Date;
}

export const WorkspaceSchema = SchemaFactory.createForClass(WorkspaceModel);

WorkspaceSchema.index({ slug: 1 }, { unique: true });
WorkspaceSchema.index({ 'members.userId': 1 });
WorkspaceSchema.index({ createdBy: 1 });
WorkspaceSchema.index({ deletedAt: 1 });
