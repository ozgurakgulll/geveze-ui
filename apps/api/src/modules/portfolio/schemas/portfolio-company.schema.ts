import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import type {
  PortfolioStatus,
  MonthlyContentQuota,
  SocialMediaAccount,
  BrandIdentity,
  CompanyContact,
  ContentCalendarItem,
  ActivityLogItem,
} from '@geveze/shared';

export type PortfolioCompanyDocument = HydratedDocument<PortfolioCompanyModel>;

@Schema({ timestamps: true, collection: 'portfolio_companies' })
export class PortfolioCompanyModel {
  @Prop({ type: String, index: true })
  workspaceId?: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({
    required: true,
    enum: ['active', 'on-hold', 'left'],
    default: 'active',
  })
  status: PortfolioStatus;

  @Prop({ required: true })
  startDate: string;

  @Prop()
  exitDate?: string;

  @Prop({ type: [String], default: [] })
  servicesTaken: string[];

  @Prop({ type: Object, required: true })
  monthlyQuotas: MonthlyContentQuota;

  @Prop({ type: [String], default: [] })
  notes: string[];

  @Prop({ type: [String], default: [] })
  assignedTeamMemberIds: string[];

  @Prop({ type: Object })
  brandIdentity: BrandIdentity;

  @Prop({ type: [Object], default: [] })
  socialMediaAccounts: SocialMediaAccount[];

  @Prop({ type: [Object], default: [] })
  contacts: CompanyContact[];

  @Prop({ type: [Object], default: [] })
  monthlyContentCalendar: ContentCalendarItem[];

  @Prop({ type: [Object], default: [] })
  activityLog: ActivityLogItem[];

  createdAt: Date;
  updatedAt: Date;
}

export const PortfolioCompanySchema = SchemaFactory.createForClass(PortfolioCompanyModel);

PortfolioCompanySchema.index({ workspaceId: 1, status: 1 });
PortfolioCompanySchema.index({ name: 'text' });

PortfolioCompanySchema.set('toJSON', {
  virtuals: true,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transform: (_doc: any, ret: any) => {
    ret['id'] = ret['_id'];
    delete ret['_id'];
    delete ret['__v'];
    return ret;
  },
});
