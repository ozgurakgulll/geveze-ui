import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type SettingDocument = HydratedDocument<SettingModel>;

/** key-value ayar deposu: tableColumnSchema, tagServiceMap, companyName vb. */
@Schema({ timestamps: true, collection: 'settings' })
export class SettingModel {
  @Prop({ type: String })
  workspaceId?: string;

  @Prop({ required: true })
  key: string;

  @Prop({ type: Object })
  value: unknown;
}

export const SettingSchema = SchemaFactory.createForClass(SettingModel);

SettingSchema.index({ workspaceId: 1, key: 1 }, { unique: true });

SettingSchema.set('toJSON', {
  virtuals: true,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transform: (_doc: any, ret: any) => {
    ret['id'] = ret['_id'];
    delete ret['_id'];
    delete ret['__v'];
    return ret;
  },
});
